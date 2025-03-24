import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Client, Appointment, Sale, ClientPackage, Package, Service, Contract, ContractTemplate } from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Package as PackageIcon,
  Clock,
  Camera,
  Pencil,
  Plus,
  FileText,
  Share,
  Printer,
  FileDown,
  MessageCircle,
  Mail,
  FileUp,
  X,
  Trash2,
  Loader2,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2pdf from 'html2pdf.js';
import DependentList from '@/components/clients/DependentList'; 
import DependentForm from '@/components/clients/DependentForm'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RateLimitHandler from '@/components/RateLimitHandler';
import toast from 'react-hot-toast';

export default function ClientDetails() {
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [sales, setSales] = useState([]);
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [showDependentForm, setShowDependentForm] = useState(false);
  const [editingDependent, setEditingDependent] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [packageFilter, setPackageFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [contractData, setContractData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [previewBefore, setPreviewBefore] = useState(null);
  const [previewAfter, setPreviewAfter] = useState(null);
  const [isCapturingBefore, setIsCapturingBefore] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  // Função para filtrar os pacotes
  const filteredPackages = useMemo(() => {
    return clientPackages.filter(pkg => {
      // Filtro por status
      if (packageFilter !== 'all') {
        const now = new Date();
        const expirationDate = new Date(pkg.valid_until);
        
        if (packageFilter === 'active' && (pkg.status === 'cancelado' || expirationDate < now)) {
          return false;
        }
        if (packageFilter === 'expired' && expirationDate >= now) {
          return false;
        }
        if (packageFilter === 'finished' && pkg.sessions_used < pkg.total_sessions) {
          return false;
        }
        if (packageFilter === 'canceled' && pkg.status !== 'cancelado') {
          return false;
        }
      }

      // Filtro por período
      if (periodFilter !== 'all') {
        const purchaseDate = new Date(pkg.purchase_date);
        const now = new Date();
        
        if (periodFilter === 'last30' && (now - purchaseDate) > 30 * 24 * 60 * 60 * 1000) {
          return false;
        }
        if (periodFilter === 'last90' && (now - purchaseDate) > 90 * 24 * 60 * 60 * 1000) {
          return false;
        }
        if (periodFilter === 'last180' && (now - purchaseDate) > 180 * 24 * 60 * 60 * 1000) {
          return false;
        }
        if (periodFilter === 'thisYear' && purchaseDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      }

      return true;
    });
  }, [clientPackages, packageFilter, periodFilter]);

  useEffect(() => {
    if (clientId) {
      loadData();
      loadTemplates();
      loadPhotos();
    }
  }, [clientId]);

  useEffect(() => {
    // Limpar stream da câmera quando o componente desmontar
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const loadData = async () => {
    try {
      const [clientData, appointmentsData, salesData, clientPackagesData, packagesData, servicesData] = await Promise.all([
        Client.list(),
        Appointment.list(),
        Sale.list(),
        ClientPackage.list(),
        Package.list(),
        Service.list()
      ]);

      const client = clientData.find(c => c.id === clientId);
      setClient(client);

      const clientAppointments = appointmentsData
        .filter(a => a.client_id === clientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setAppointments(clientAppointments);

      const clientSales = salesData
        .filter(s => s.client_id === clientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setSales(clientSales);

      // Filtra pacotes do cliente
      const activePackages = clientPackagesData
        .filter(cp => cp.client_id === clientId)
        .map(cp => {
          // Encontra o pacote base
          const basePackage = packagesData.find(p => p.id === cp.package_id);
          
          // Encontra os serviços do package_snapshot
          let services = [];
          if (cp.package_snapshot?.services) {
            services = Object.entries(cp.package_snapshot.services).map(([_, serviceData]) => {
              const service = servicesData.find(s => s.id === serviceData.service_id);
              return {
                service_id: serviceData.service_id,
                name: service?.name || 'Serviço não encontrado',
                quantity: serviceData.quantity || 0
              };
            });
          }
          
          // Log para debug
          console.log('Package:', cp.id);
          console.log('Package snapshot:', cp.package_snapshot);
          console.log('Services:', services);
          
          return {
            ...cp,
            packageData: basePackage,
            sessions_used: cp.sessions_used || 0,
            total_sessions: cp.total_sessions || 0,
            session_history: cp.session_history || [],
            services: services
          };
        })
        .filter(cp => cp.packageData)
        .sort((a, b) => {
          // Primeiro os ativos, depois por data de validade
          if (a.status === 'ativo' && b.status !== 'ativo') return -1;
          if (a.status !== 'ativo' && b.status === 'ativo') return 1;
          
          const dateA = new Date(a.purchase_date || a.created_date || 0);
          const dateB = new Date(b.purchase_date || b.created_date || 0);
          return dateB - dateA;
        });
      
      setClientPackages(activePackages);
      setPackages(packagesData);
      setServices(servicesData);
    } catch (error) {
      console.error(error);
      setLoadError(error.message);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await ContractTemplate.list();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadPhotos = async () => {
    try {
      const clientPhotos = await Client.getPhotos(clientId);
      setPhotos(clientPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Erro ao carregar fotos');
    }
  };

  const generateContract = async () => {
    try {
      const contract = await Contract.generate(clientId, selectedTemplate?.id);
      setContractData(contract);
    } catch (error) {
      console.error(error);
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('contract-content');
    const opt = {
      margin: 1,
      filename: `contrato_${client?.name?.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    try {
      const pdf = await html2pdf().set(opt).from(element).save();
      return opt.filename;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const sendContractByEmail = async () => {
    try {
      const pdfFileName = await generatePDF();
      await Contract.sendByEmail(contractData, client.email, pdfFileName);
    } catch (error) {
      console.error('Error sending contract by email:', error);
    }
  };

  const shareByWhatsApp = async () => {
    try {
      const pdfFileName = await generatePDF();
      const message = `Olá ${client?.name}, segue o contrato conforme combinado.`;
      const whatsappUrl = `https://wa.me/${client?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);

      // Limpar fotos anteriores
      setBeforePhoto(null);
      setAfterPhoto(null);
      setPreviewBefore(null);
      setPreviewAfter(null);
      setIsCapturingBefore(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Erro ao acessar câmera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;

    try {
      setIsLoading(true);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Converter para blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Failed to create photo blob');
      }

      if (isCapturingBefore) {
        setBeforePhoto(blob);
        setPreviewBefore(canvas.toDataURL('image/jpeg'));
        setIsCapturingBefore(false);
        toast.success('Foto "antes" capturada! Agora capture a foto "depois".');
      } else {
        setAfterPhoto(blob);
        setPreviewAfter(canvas.toDataURL('image/jpeg'));
        
        // Upload das fotos
        await Client.uploadPhoto(clientId, {
          before: beforePhoto,
          after: blob
        }, 'camera');
        
        // Recarregar fotos
        await loadPhotos();
        
        toast.success('Fotos salvas com sucesso!');
        stopCamera();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Erro ao salvar foto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (beforeFile, afterFile) => {
    if (!beforeFile || !afterFile) {
      toast.error('Selecione as fotos antes e depois');
      return;
    }

    try {
      setIsLoading(true);
      await Client.uploadPhoto(clientId, {
        before: beforeFile,
        after: afterFile
      }, 'upload');
      
      await loadPhotos();
      toast.success('Fotos enviadas com sucesso!');
      setShowUploadDialog(false);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erro ao enviar fotos');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      setIsLoading(true);
      await Client.deletePhoto(clientId, photoId);
      await loadPhotos();
      toast.success('Fotos excluídas com sucesso!');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erro ao excluir fotos');
    } finally {
      setIsLoading(false);
    }
  };

  if (!client && !loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <RateLimitHandler
          error={loadError}
          entityName="cliente"
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-[#175EA0]">Detalhes do Cliente</h2>
        <div className="flex gap-3">
          <Button variant="outline">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Link to={createPageUrl("Appointments")}>
            <Button className="bg-[#518CD0] hover:bg-[#3475B8]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#518CD0]" />
                <div>
                  <p className="text-sm text-[#3475B8]">Nome</p>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#518CD0]" />
                <div>
                  <p className="text-sm text-[#3475B8]">Telefone</p>
                  <p className="font-medium">{client.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#518CD0]" />
                <div>
                  <p className="text-sm text-[#3475B8]">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#518CD0]" />
                <div>
                  <p className="text-sm text-[#3475B8]">Endereço</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[#3475B8] mb-1">Tipo de Pele</p>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium bg-[#8BBAFF] text-[#175EA0]">
                  {client.skin_type}
                </span>
              </div>
              {client.allergies && (
                <div>
                  <p className="text-sm text-[#3475B8] mb-1">Alergias</p>
                  <p className="font-medium">{client.allergies}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Content */}
      <Tabs defaultValue="historico" className="space-y-6">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
          <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="observacoes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-6">
          {/* Histórico de Agendamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#518CD0]" />
                Histórico de Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-[#8BBAFF]/10 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#518CD0]" />
                      <div>
                        <p className="font-medium">
                          {format(new Date(appointment.date), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-sm text-[#3475B8]">
                          {appointment.service_id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                        appointment.status === 'concluído'
                          ? 'bg-[#518CD0] text-white border border-[#3475B8]'
                          : appointment.status === 'cancelado'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-center text-[#518CD0] py-4">
                    Nenhum agendamento encontrado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-[#518CD0]" />
                Histórico de Compras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sales.map((sale, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-[#8BBAFF]/10 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        R$ {sale.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-[#3475B8]">
                        {format(new Date(sale.date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                          sale.status === 'pago'
                            ? 'bg-[#518CD0] text-white border border-[#3475B8]'
                            : sale.status === 'cancelado'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}
                      >
                        {sale.status}
                      </span>
                      <p className="text-sm text-[#3475B8] mt-1">
                        {sale.payment_method}
                      </p>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && (
                  <p className="text-center text-[#518CD0] py-4">
                    Nenhuma compra encontrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pacotes" className="space-y-6">
          {/* Pacotes Ativos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5 text-[#518CD0]" />
                  Pacotes do Cliente
                </CardTitle>
                <Link to={createPageUrl("ClientPackages", { client_id: clientId })}>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Pacote
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={packageFilter}
                    onChange={(e) => setPackageFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3475B8] focus:border-transparent"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="finished">Finalizados</option>
                    <option value="expired">Expirados</option>
                    <option value="canceled">Cancelados</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3475B8] focus:border-transparent"
                  >
                    <option value="all">Todos os períodos</option>
                    <option value="last30">Últimos 30 dias</option>
                    <option value="last90">Últimos 90 dias</option>
                    <option value="last180">Últimos 180 dias</option>
                    <option value="thisYear">Este ano</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setPackageFilter('all');
                    setPeriodFilter('all');
                  }}
                  className="self-end px-4 py-2 text-sm text-[#3475B8] hover:text-[#2C64A0] transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>

              {filteredPackages.length > 0 ? (
                <div className="space-y-4">
                  {filteredPackages.map((pkg) => (
                    <div key={pkg.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-lg text-[#175EA0]">{pkg.packageData?.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-[#3475B8]" />
                              <span className="text-sm text-[#175EA0]">
                                {pkg.sessions_used} de {pkg.total_sessions} sessões utilizadas
                              </span>
                            </div>
                            <span className="text-[#6EA3E7]">•</span>
                            <span className="text-sm text-[#3475B8]">
                              Criado em {format(new Date(pkg.purchase_date || pkg.created_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            pkg.status === 'ativo' 
                              ? 'bg-[#518CD0] text-white border border-[#3475B8]'
                              : pkg.status === 'finalizado'
                              ? 'bg-gray-100 text-gray-800 border border-gray-200'
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {pkg.status === 'ativo' ? 'Ativo' : 
                             pkg.status === 'finalizado' ? 'Finalizado' : 'Pendente'}
                          </span>
                          {pkg.valid_until && (
                            <p className="text-sm text-[#3475B8] mt-1">
                              {pkg.status === 'ativo' ? 'Válido até ' : 'Expirou em '}
                              {format(new Date(pkg.valid_until), "dd/MM/yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2 text-[#175EA0]">Serviços Incluídos:</h5>
                        <div className="space-y-1">
                          {pkg.services && pkg.services.length > 0 ? (
                            pkg.services.map((service) => (
                              <div key={service.service_id} className="text-sm text-[#3475B8] flex items-center justify-between bg-[#8BBAFF]/5 p-2 rounded border border-[#6EA3E7] hover:bg-[#8BBAFF]/10">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2 text-[#518CD0]" />
                                  {service.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[#175EA0] bg-[#8BBAFF]/10 px-2 py-0.5 rounded">
                                    {service.quantity}x
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#518CD0] text-center py-2">Nenhum serviço incluído</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#6EA3E7]">
                        <h5 className="text-sm font-medium mb-2 text-[#175EA0]">Histórico de Uso:</h5>
                        <div className="space-y-2">
                          {pkg.session_history?.length > 0 ? (
                            pkg.session_history.map((session, index) => (
                              <div key={index} className="text-sm flex justify-between items-center bg-[#8BBAFF]/10 p-2 rounded border border-[#6EA3E7]">
                                <div className="flex-1">
                                  <div className="flex items-center text-[#175EA0]">
                                    <Calendar className="w-4 h-4 mr-2 text-[#518CD0]" />
                                    {format(new Date(session.date), "dd/MM/yyyy HH:mm")}
                                  </div>
                                  <div className="text-[#3475B8] mt-1 flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    {session.employee_name}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[#175EA0]">{session.service_name}</div>
                                  {session.notes && (
                                    <div className="text-xs text-[#518CD0] mt-1">{session.notes}</div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-[#518CD0]">Nenhum uso registrado</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#6EA3E7] flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium text-[#175EA0]">Valor Total:</span>
                          <span className="text-[#3475B8]"> R$ {pkg.total_price?.toFixed(2) || '0.00'}</span>
                        </div>
                        {pkg.status === 'ativo' && pkg.sessions_used < pkg.total_sessions && (
                          <Link to={createPageUrl("Appointments", { client_id: clientId, package_id: pkg.id })}>
                            <Button variant="outline" size="sm" className="bg-[#8BBAFF]/10 border-[#6EA3E7] text-[#175EA0] hover:bg-[#8BBAFF]/20 hover:text-[#175EA0]">
                              <Plus className="w-4 h-4 mr-2" />
                              Agendar Sessão
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm mb-4">Nenhum pacote encontrado para este cliente</p>
                  <Link to={createPageUrl("ClientPackages", { client_id: clientId })}>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Pacote
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependentes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Dependentes
                </CardTitle>
                <Button 
                  onClick={() => setShowDependentForm(true)}
                  className="bg-[#518CD0] hover:bg-[#3475B8]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Dependente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DependentList
                dependents={client.dependents}
                onEdit={(dependent, index) => {
                  setEditingDependent({ dependent, index });
                  setShowDependentForm(true);
                }}
                onDelete={async (index) => {
                  const newDependents = [...client.dependents];
                  newDependents.splice(index, 1);
                  await Client.update(client.id, {
                    ...client,
                    dependents: newDependents
                  });
                  loadData();
                }}
              />
            </CardContent>
          </Card>

          <Dialog open={showDependentForm} onOpenChange={setShowDependentForm}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingDependent ? "Editar" : "Adicionar"} Dependente
                </DialogTitle>
              </DialogHeader>
              <DependentForm
                dependent={editingDependent?.dependent}
                onSubmit={async (data) => {
                  const newDependents = [...(client.dependents || [])];
                  if (editingDependent) {
                    newDependents[editingDependent.index] = data;
                  } else {
                    newDependents.push(data);
                  }
                  await Client.update(client.id, {
                    ...client,
                    dependents: newDependents
                  });
                  setShowDependentForm(false);
                  setEditingDependent(null);
                  loadData();
                }}
                onCancel={() => {
                  setShowDependentForm(false);
                  setEditingDependent(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="contrato" className="space-y-6">
          {/* Aba de Contrato */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-gray-800">Contrato do Cliente</h3>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => setSelectedTemplate(templates.find(t => t.id === e.target.value))}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Modelo Padrão</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => generateContract()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Gerar Contrato
                </button>
                {contractData && (
                  <div className="flex gap-2">
                    <button
                      onClick={sendContractByEmail}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3475B8] border border-[#3475B8] rounded-md hover:bg-[#3475B8] hover:text-white transition-colors"
                    >
                      <Share className="w-4 h-4" />
                      Compartilhar
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3475B8] border border-[#3475B8] rounded-md hover:bg-[#3475B8] hover:text-white transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </button>
                    <button
                      onClick={() => generatePDF()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3475B8] border border-[#3475B8] rounded-md hover:bg-[#3475B8] hover:text-white transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                      Baixar PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            {contractData ? (
              <div id="contract-content" className="bg-white p-6 rounded-lg shadow-sm">
                <div className="prose max-w-none">
                  <h2 className="text-center text-xl font-bold mb-6">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
                  <p className="mb-4">
                    <strong>CONTRATANTE:</strong> {client?.name}
                  </p>
                  <p className="mb-4">
                    <strong>CPF:</strong> {client?.cpf}
                  </p>
                  <p className="mb-4">
                    <strong>Data de Emissão:</strong> {new Date(contractData.issue_date).toLocaleDateString()}
                  </p>
                  {contractData.content?.sections?.map((section, index) => (
                    <div key={index} className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                      <p>{section.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Clique em "Gerar Contrato" para criar um novo contrato
              </div>
            )}
          </div>

          {/* Dialog de compartilhamento */}
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Compartilhar Contrato</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <button
                  onClick={sendContractByEmail}
                  className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <Mail className="w-8 h-8 text-[#3475B8]" />
                  <span className="text-sm font-medium">Email</span>
                </button>
                <button
                  onClick={shareByWhatsApp}
                  className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <MessageCircle className="w-8 h-8 text-[#25D366]" />
                  <span className="text-sm font-medium">WhatsApp</span>
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="fotos">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-gray-800">Fotos do Cliente</h3>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files.length === 2) {
                      setBeforePhoto(e.target.files[0]);
                      setAfterPhoto(e.target.files[1]);
                    } else {
                      toast.error('Selecione exatamente 2 fotos (antes e depois)');
                    }
                  }}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3475B8] border border-[#3475B8] rounded-md hover:bg-[#3475B8] hover:text-white transition-colors cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  Enviar Fotos
                </label>
                <button
                  onClick={showCamera ? stopCamera : startCamera}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  {showCamera ? 'Parar Câmera' : 'Tirar Foto'}
                </button>
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  Enviar Fotos
                </button>
              </div>
            </div>

            {/* Controles da câmera */}
            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={showCamera ? stopCamera : startCamera}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                  showCamera 
                    ? 'text-red-600 border border-red-600 hover:bg-red-600 hover:text-white' 
                    : 'text-[#3475B8] border border-[#3475B8] hover:bg-[#3475B8] hover:text-white'
                } rounded-md transition-colors`}
              >
                {showCamera ? (
                  <>
                    <X className="w-4 h-4" />
                    Parar Câmera
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Tirar Foto
                  </>
                )}
              </button>

              <button
                onClick={() => setShowUploadDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3475B8] border border-[#3475B8] rounded-md hover:bg-[#3475B8] hover:text-white transition-colors"
              >
                <FileUp className="w-4 h-4" />
                Enviar Fotos
              </button>
            </div>

            {/* Preview da câmera */}
            {showCamera && (
              <div className="relative mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-h-[400px] object-cover rounded-lg"
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <button
                    onClick={takePhoto}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors"
                  >
                    {isLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        {isCapturingBefore ? 'Capturar Foto "Antes"' : 'Capturar Foto "Depois"'}
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Preview das fotos capturadas */}
            {(previewBefore || previewAfter) && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Antes</h3>
                  {previewBefore && (
                    <img
                      src={previewBefore}
                      alt="Preview antes"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Depois</h3>
                  {previewAfter && (
                    <img
                      src={previewAfter}
                      alt="Preview depois"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Grid de fotos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {photos.map((photo) => (
                <div key={photo.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Antes</h3>
                      <img
                        src={photo.before}
                        alt="Foto antes"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Depois</h3>
                      <img
                        src={photo.after}
                        alt="Foto depois"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(photo.uploadedAt).toLocaleDateString()} - {photo.type === 'camera' ? 'Câmera' : 'Upload'}
                    </span>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Diálogo de upload */}
            {showUploadDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium">Enviar Fotos</h2>
                    <button
                      onClick={() => setShowUploadDialog(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto Antes
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBeforePhoto(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#3475B8] file:text-white hover:file:bg-[#2C64A0]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto Depois
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAfterPhoto(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#3475B8] file:text-white hover:file:bg-[#2C64A0]"
                      />
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                      <button
                        onClick={() => setShowUploadDialog(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleFileUpload(beforePhoto, afterPhoto)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4" />
                            Enviar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="observacoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <p className="whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <p className="text-center text-[#518CD0] py-4">
                  Nenhuma observação encontrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
