import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Client, Appointment, Sale, ClientPackage, Package, Service, Contract, ContractTemplate, AnamneseTemplate, PendingService, GiftCard, ClientSubscription, SubscriptionPlan } from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Activity,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Package as PackageIcon,
  Pencil,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Upload,
  User,
  Wallet,
  X,
  CreditCard,
  CalendarPlus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Send,
  FileUp,
  FileDown,
  Printer,
  Share
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2pdf from 'html2pdf.js';
import DependentList from '@/components/clients/DependentList'; 
import DependentForm from '@/components/clients/DependentForm'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import RateLimitHandler from '@/components/RateLimitHandler';
import toast from 'react-hot-toast';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import SignatureCanvas from 'react-signature-canvas';
import AnamneseListCard from '../components/employee-portal/AnamneseListCard';

export default function ClientDetails() {
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [sales, setSales] = useState([]);
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [services, setServices] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [clientSubscriptions, setClientSubscriptions] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [observations, setObservations] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    skinType: ''
  });
  const [anamneseTemplates, setAnamneseTemplates] = useState([]);
  const [selectedAnamneseTemplate, setSelectedAnamneseTemplate] = useState(null);
  const [anamneseData, setAnamneseData] = useState({});
  const [selectedGiftCard, setSelectedGiftCard] = useState(null);
  const [showGiftCardImageDialog, setShowGiftCardImageDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showPaymentHistoryDialog, setShowPaymentHistoryDialog] = useState(false);
  const [expandedPackages, setExpandedPackages] = useState({});
  const [signature, setSignature] = useState(null);
  const sigCanvasRef = useRef();
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
      loadClient();
      loadTemplates();
      loadAnamneseTemplates();
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

  useEffect(() => {
    if (client) {
      setEditForm({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        skinType: client.skinType || ''
      });
    }
  }, [client]);

  const loadClient = async () => {
    try {
      const clientData = await Client.get(clientId);
      if (!clientData) {
        setLoadError('Cliente não encontrado');
        return;
      }
      
      setClient(clientData);
      setEditForm({
        name: clientData.name || '',
        phone: clientData.phone || '',
        email: clientData.email || '',
        address: clientData.address || '',
        skinType: clientData.skinType || ''
      });
      
      // Carregar dados relacionados
      const [appointmentsData, salesData, clientPackagesData, packagesData, servicesData, pendingServicesData] = await Promise.all([
        Appointment.filter({ client_id: clientId }),
        Sale.filter({ client_id: clientId }),
        ClientPackage.filter({ client_id: clientId }),
        Package.list(),
        Service.list(),
        PendingService.filter({ client_id: clientId, status: 'pendente' })
      ]);

      console.log('Serviços:', servicesData);
      console.log('Serviços Pendentes:', pendingServicesData);

      // Ordenar pacotes por data de criação
      const sortedPackages = clientPackagesData.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      setAppointments(appointmentsData);
      setSales(salesData);
      setClientPackages(sortedPackages);
      setPackages(packagesData);
      setServices(servicesData);
      setPendingServices(pendingServicesData);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
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

  const loadAnamneseTemplates = async () => {
    try {
      const templates = await AnamneseTemplate.list();
      setAnamneseTemplates(templates);
    } catch (error) {
      console.error('Error loading anamnese templates:', error);
    }
  };

  const loadAnamnese = async () => {
    try {
      const clientAnamnese = await Client.getAnamnese(clientId);
      if (clientAnamnese) {
        setAnamneseData(clientAnamnese.data || {});
        // Se tiver um template associado, selecionar ele
        if (clientAnamnese.template_id) {
          const template = anamneseTemplates.find(t => t.id === clientAnamnese.template_id);
          if (template) {
            setSelectedAnamneseTemplate(template);
          }
        }
        // Restaurar assinatura salva, se existir
        if (clientAnamnese.signature) {
          setSignature(clientAnamnese.signature);
          toast.success('Assinatura carregada: ' + clientAnamnese.signature.substring(0, 30) + '...');
          console.log('Assinatura restaurada:', clientAnamnese.signature);
        } else {
          setSignature(null);
          toast('Nenhuma assinatura encontrada na anamnese.');
          console.log('Nenhuma assinatura encontrada na anamnese.');
        }
      }
    } catch (error) {
      console.error('Error loading anamnese:', error);
      toast.error('Erro ao carregar anamnese: ' + error.message);
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

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const addObservation = async () => {
    if (!observationText.trim()) {
      toast.error('Por favor, digite uma observação');
      return;
    }

    try {
      setIsLoading(true);
      await Client.addObservation(clientId, {
        text: observationText,
        createdAt: new Date().toISOString(),
      });

      // Recarregar observações
      const updatedObservations = await Client.getObservations(clientId);
      setObservations(updatedObservations);
      
      setObservationText('');
      setShowObservationDialog(false);
      toast.success('Observação adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      toast.error('Erro ao adicionar observação');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteObservation = async (observationId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta observação?')) {
      return;
    }

    try {
      setIsLoading(true);
      await Client.deleteObservation(clientId, observationId);
      
      // Recarregar observações
      const updatedObservations = await Client.getObservations(clientId);
      setObservations(updatedObservations);
      
      toast.success('Observação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir observação:', error);
      toast.error('Erro ao excluir observação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    try {
      setIsLoading(true);
      await Client.update(clientId, editForm);
      
      // Recarregar dados do cliente
      const updatedClient = await Client.get(clientId);
      setClient(updatedClient);
      
      setIsEditing(false);
      toast.success('Cliente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnamneseTemplateChange = (templateId) => {
    const template = anamneseTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedAnamneseTemplate(template);
      // Manter dados existentes se houver, senão inicializar vazios
      const currentData = { ...anamneseData };
      template.fields.forEach(field => {
        if (!currentData[field.id]) {
          currentData[field.id] = '';
        }
      });
      setAnamneseData(currentData);
    }
  };

  const handleSaveAnamnese = async () => {
    if (!selectedAnamneseTemplate) {
      toast.error('Selecione um modelo de anamnese');
      return;
    }

    try {
      await Client.saveAnamnese(clientId, {
        template_id: selectedAnamneseTemplate.id,
        template_name: selectedAnamneseTemplate.name,
        data: anamneseData,
        signature: signature || null,
        created_at: new Date().toISOString()
      });

      toast.success('Anamnese salva com sucesso');
      loadAnamnese(); // Recarregar dados
    } catch (error) {
      console.error('Error saving anamnese:', error);
      toast.error('Erro ao salvar anamnese');
    }
  };

  // Efeito para carregar anamnese quando o componente montar
  useEffect(() => {
    if (clientId && anamneseTemplates.length > 0) {
      loadAnamnese();
    }
  }, [clientId, anamneseTemplates]);

  // Função para visualizar a imagem do gift card
  const viewGiftCardImage = async (card) => {
    if (!card) return;
    
    try {
      // Se o card já tem a imagem base64, usamos ela diretamente
      if (card.image_base64) {
        // Verificar se a string base64 tem o prefixo correto
        let imageUrl = card.image_base64;
        if (imageUrl && !imageUrl.startsWith('data:')) {
          // Adicionar o prefixo correto para imagens base64
          card.image_base64 = `data:image/png;base64,${imageUrl}`;
        }
        
        setSelectedGiftCard(card);
        setShowGiftCardImageDialog(true);
      } else {
        // Se não, tentamos buscar do Firebase
        const giftCardData = await GiftCard.get(card.id);
        if (giftCardData && giftCardData.image_base64) {
          // Verificar se a string base64 tem o prefixo correto
          let imageUrl = giftCardData.image_base64;
          if (imageUrl && !imageUrl.startsWith('data:')) {
            // Adicionar o prefixo correto para imagens base64
            giftCardData.image_base64 = `data:image/png;base64,${imageUrl}`;
          }
          
          setSelectedGiftCard(giftCardData);
          setShowGiftCardImageDialog(true);
        } else {
          toast.error("Imagem do Gift Card não encontrada");
        }
      }
    } catch (error) {
      console.error("Erro ao visualizar imagem:", error);
      toast.error("Erro ao carregar imagem do Gift Card");
    }
  };

  // Função para fazer download da imagem do gift card
  const downloadGiftCardImage = (card) => {
    if (!card || !card.image_base64) return;
    
    try {
      // Criar um link temporário para download
      const link = document.createElement('a');
      link.href = card.image_base64;
      link.download = `GiftCard-${card.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download iniciado");
    } catch (error) {
      console.error("Erro ao fazer download da imagem:", error);
      toast.error("Erro ao fazer download da imagem");
    }
  };

  // Função para enviar link de pagamento para o cliente
  const sendPaymentLink = async (subscription) => {
    try {
      if (!subscription || !client) return;
      
      // Verificar se existe um link de pagamento
      if (!subscription.payment_link) {
        toast({
          title: "Link de pagamento não disponível",
          description: "Esta assinatura não possui um link de pagamento configurado.",
          variant: "destructive"
        });
        return;
      }
      
      // Construir a mensagem
      const planName = getPlanName(subscription.plan_id);
      const message = `Olá ${client.name}, segue o link para pagamento da sua assinatura "${planName}": ${subscription.payment_link}`;
      
      // Verificar se o cliente tem telefone
      if (!client.phone) {
        // Se não tiver telefone, copiar o link para a área de transferência
        navigator.clipboard.writeText(message);
        toast({
          title: "Mensagem copiada",
          description: "O cliente não possui telefone cadastrado. A mensagem foi copiada para a área de transferência.",
          variant: "default"
        });
        return;
      }
      
      // Remover caracteres não numéricos do telefone
      const phone = client.phone.replace(/\D/g, '');
      
      // Abrir WhatsApp Web com a mensagem
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "WhatsApp aberto",
        description: "O link de pagamento foi enviado para o WhatsApp do cliente.",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao enviar link de pagamento:", error);
      toast({
        title: "Erro ao enviar link",
        description: "Não foi possível enviar o link de pagamento.",
        variant: "destructive"
      });
    }
  };
  
  // Função para abrir o modal de histórico de pagamentos
  const openPaymentHistory = (subscription) => {
    setSelectedSubscription(subscription);
    setShowPaymentHistoryDialog(true);
  };
  
  // Função para formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  // Função para obter o nome do serviço
  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Serviço não encontrado';
  };

  // Função para obter o nome do cliente
  const getClientName = (clientId) => {
    return client?.name || 'Cliente não encontrado';
  };

  // Função para formatar o status da assinatura
  const formatSubscriptionStatus = (status) => {
    switch (status) {
      case 'ativa':
        return 'Ativa';
      case 'pendente':
        return 'Pendente';
      case 'cancelada':
        return 'Cancelada';
      case 'suspensa':
        return 'Suspensa';
      case 'expirada':
        return 'Expirada';
      default:
        return status;
    }
  };

  // Função para obter a cor do badge de status
  const getStatusColor = (status) => {
    switch (status) {
      case 'ativa':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'suspensa':
        return 'bg-orange-100 text-orange-800';
      case 'expirada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para alternar a expansão de um pacote
  const togglePackageExpansion = (packageId) => {
    setExpandedPackages(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }));
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
          onRetry={loadClient}
        />
      </div>
    );
  }

  // Função para obter o nome do plano de assinatura
  const getPlanName = (planId) => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    return plan ? plan.name : 'Plano não encontrado';
  };
  
  // Função para formatar o ciclo de cobrança
  const formatBillingCycle = (cycle) => {
    const cycles = {
      mensal: 'Mensal',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual'
    };
    return cycles[cycle] || cycle;
  };
  
  // Função para formatar o método de pagamento
  const formatPaymentMethod = (method) => {
    const methods = {
      cartao_credito: 'Cartão de Crédito',
      boleto: 'Boleto',
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      transferencia: 'Transferência'
    };
    return methods[method] || method;
  };

  const renderSignaturePad = () => (
    <div className="mt-4">
      <label className="font-medium text-gray-700 block mb-1">
        Assinatura do Cliente <span className="text-gray-500 text-xs">(opcional)</span>
      </label>
      <div className="border rounded bg-gray-50 flex flex-col items-center p-2">
        <SignatureCanvas
          ref={sigCanvasRef}
          penColor="#175EA0"
          canvasProps={{ width: 320, height: 100, className: 'rounded bg-white border' }}
          onEnd={() => {
            setSignature(sigCanvasRef.current.getCanvas().toDataURL('image/png'));
          }}
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => {
            sigCanvasRef.current.clear();
            setSignature(null);
          }}>
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#3475B8]">Detalhes do Cliente</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3475B8] border border-[#3475B8] rounded-md hover:bg-[#3475B8] hover:text-white transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => router.push('/agendamento/novo?clientId=' + clientId)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Cabeçalho com informações do cliente */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {!isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Nome</p>
                  <p className="text-gray-900">{client?.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Telefone</p>
                  <p className="text-gray-900">{client?.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{client?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Endereço</p>
                  <p className="text-gray-900">{client?.address || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo de Pele</p>
                  <p className="text-gray-900">{client?.skinType || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateClient}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-[#3475B8] focus:border-[#3475B8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-[#3475B8] focus:border-[#3475B8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-[#3475B8] focus:border-[#3475B8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-[#3475B8] focus:border-[#3475B8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Pele
                </label>
                <select
                  value={editForm.skinType}
                  onChange={(e) => setEditForm({ ...editForm, skinType: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3475B8] focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="normal">Normal</option>
                  <option value="seca">Seca</option>
                  <option value="oleosa">Oleosa</option>
                  <option value="mista">Mista</option>
                  <option value="sensível">Sensível</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList className="w-full border-b flex items-center justify-start gap-2 overflow-x-auto">
          <TabsTrigger value="historico" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <CalendarDays className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="pacotes" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <PackageIcon className="w-4 h-4 mr-2" />
            Pacotes
          </TabsTrigger>
          <TabsTrigger value="giftcards" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <Wallet className="w-4 h-4 mr-2" />
            Gift Cards
          </TabsTrigger>
          <TabsTrigger value="assinaturas" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="fotos" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <Camera className="w-4 h-4 mr-2" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="anamnese" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <FileText className="w-4 h-4 mr-2" />
            Anamnese
          </TabsTrigger>
          <TabsTrigger value="contrato" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <FileText className="w-4 h-4 mr-2" />
            Contrato
          </TabsTrigger>
          <TabsTrigger value="dependentes" className="data-[state=active]:bg-[#8BBAFF]/10 data-[state=active]:text-[#175EA0]">
            <User className="w-4 h-4 mr-2" />
            Dependentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {format(new Date(appointment.date), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                          <p className="text-sm text-gray-500">{appointment.id}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          appointment.status === "concluído"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Compras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#518CD0]" />
                  Histórico de Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(sales || []).map((sale, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <ShoppingCart className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              R$ {(sale?.total_amount || 0).toFixed(2)}
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {format(new Date(sale?.date || new Date()), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sale?.status === "finalizada"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {sale?.status || 'pendente'}
                      </span>
                    </div>
                  ))}
                  {(!sales || sales.length === 0) && (
                    <p className="text-center text-gray-500 py-4">
                      Nenhuma compra encontrada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Serviços Pendentes</h2>
          </div>

          {pendingServices.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <Clock className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-500">Nenhum serviço pendente</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingServices.map((service) => (
                <Card key={service.id} className="relative overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {getServiceName(service.service_id)}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Criado em: {format(new Date(service.created_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        service.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        service.status === 'agendado' ? 'bg-green-100 text-green-800' :
                        service.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status === 'pendente' ? 'Pendente' :
                         service.status === 'agendado' ? 'Agendado' :
                         service.status === 'cancelado' ? 'Cancelado' :
                         service.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {service.notes && (
                      <p className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">Observações:</span> {service.notes}
                      </p>
                    )}
                    {service.expiration_date && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Expira em:</span>{' '}
                        {format(new Date(service.expiration_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                    
                    {service.status === 'pendente' && (
                      <div className="mt-4 flex justify-end">
                        <Link to={createPageUrl("Appointments", { client_id: clientId, pending_service_id: service.id })}>
                          <Button variant="outline" size="sm" className="bg-[#8BBAFF]/10 border-[#6EA3E7] text-[#175EA0] hover:bg-[#8BBAFF]/20">
                            <CalendarPlus className="w-4 h-4" />
                            Agendar
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pacotes" className="space-y-6">
          {/* Pacotes Ativos */}
          <Card>
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
                          <h4 className="font-medium text-lg text-[#175EA0]">{pkg.package_snapshot?.name || "Pacote não encontrado"}</h4>
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
                      
                      {/* Barra de progresso */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1 text-[#3475B8]">
                          <span>Progresso:</span>
                          <span>{pkg.sessions_used} de {pkg.total_sessions} sessões</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#518CD0] h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (pkg.sessions_used / pkg.total_sessions) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Botão para expandir/minimizar detalhes */}
                      <button 
                        onClick={() => togglePackageExpansion(pkg.id)}
                        className="w-full flex items-center justify-center py-2 mt-3 text-sm text-[#3475B8] hover:bg-[#8BBAFF]/10 rounded transition-colors"
                      >
                        {expandedPackages[pkg.id] ? (
                          <>
                            <span>Menos detalhes</span>
                            <ChevronUp className="h-4 w-4 ml-1" />
                          </>
                        ) : (
                          <>
                            <span>Mais detalhes</span>
                            <ChevronDown className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </button>

                      {/* Conteúdo expandido */}
                      {expandedPackages[pkg.id] && (
                        <div className="mt-3 pt-3 border-t border-[#6EA3E7]">
                          {/* Serviços Incluídos */}
                          <div className="mt-2">
                            <h5 className="text-sm font-medium mb-2 text-[#175EA0]">Serviços Incluídos:</h5>
                            <div className="space-y-1">
                              {(pkg.package_snapshot?.services || []).map((service, index) => {
                                const serviceName = getServiceName(service.service_id);
                                const usedSessions = pkg.session_history?.filter(
                                  s => s.service_id === service.service_id && s.status === 'concluido'
                                ).length || 0;
                                
                                return (
                                  <div 
                                    key={index}
                                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{serviceName}</span>
                                      <span className="text-sm text-gray-600">{usedSessions}/{service.quantity} sessões</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Histórico de Uso */}
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
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-[#6EA3E7] flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium text-[#175EA0]">Valor Total:</span>
                          <span className="text-[#3475B8]"> R$ {pkg.total_price?.toFixed(2) || '0.00'}</span>
                        </div>
                        {pkg.status === 'ativo' && pkg.sessions_used < pkg.total_sessions && (
                          <Link to={createPageUrl("Appointments", { client_id: clientId, package_id: pkg.id })}>
                            <Button variant="outline" size="sm" className="bg-[#8BBAFF]/10 border-[#6EA3E7] text-[#175EA0] hover:bg-[#8BBAFF]/20">
                              <Plus className="w-4 h-4" />
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
                      <Plus className="w-4 h-4" />
                      Adicionar Pacote
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="giftcards" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Gift Cards do Cliente</h3>
            <Link to={`/gift-cards?client_id=${clientId}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Gift Card
              </Button>
            </Link>
          </div>
          
          {giftCards.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Este cliente não possui Gift Cards</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Gift Cards Ativos */}
              <div>
                <h4 className="text-md font-medium mb-2">Gift Cards Ativos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {giftCards
                    .filter(card => card.status === 'active' || card.status === 'ativo')
                    .map(card => (
                      <Card key={card.id} className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">Gift Card: {card.code}</CardTitle>
                            <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                              Ativo
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Valor:</span>
                              <span className="font-medium">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.value)}
                              </span>
                            </div>
                            {card.recipient_name && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Destinatário:</span>
                                <span>{card.recipient_name}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Validade:</span>
                              <span>
                                {card.expiration_date ? format(new Date(card.expiration_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Data de criação:</span>
                              <span>
                                {card.created_at ? format(new Date(card.created_at), 'dd/MM/yyyy') : 
                                 card.created_date ? format(new Date(card.created_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end gap-2">
                            {card.image_base64 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => viewGiftCardImage(card)}
                              >
                                <ImageIcon className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {giftCards.filter(card => card.status === 'active' || card.status === 'ativo').length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhum Gift Card ativo</p>
                )}
              </div>
              
              {/* Gift Cards Resgatados */}
              <div>
                <h4 className="text-md font-medium mb-2">Gift Cards Resgatados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {giftCards
                    .filter(card => card.status === 'used' || card.status === 'usado')
                    .map(card => (
                      <Card key={card.id} className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">Gift Card: {card.code}</CardTitle>
                            <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                              Resgatado
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Valor:</span>
                              <span className="font-medium">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.value)}
                              </span>
                            </div>
                            {card.recipient_name && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Destinatário:</span>
                                <span>{card.recipient_name}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Data de resgate:</span>
                              <span>
                                {card.redemption_date ? format(new Date(card.redemption_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Data de criação:</span>
                              <span>
                                {card.created_at ? format(new Date(card.created_at), 'dd/MM/yyyy') : 
                                 card.created_date ? format(new Date(card.created_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end gap-2">
                            {card.image_base64 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => viewGiftCardImage(card)}
                              >
                                <ImageIcon className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {giftCards.filter(card => card.status === 'used' || card.status === 'usado').length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhum Gift Card resgatado</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assinaturas" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Assinaturas do Cliente</h3>
            <Link to={`/subscriptions?client_id=${clientId}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Assinatura
              </Button>
            </Link>
          </div>
          
          {clientSubscriptions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <RefreshCw className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Este cliente não possui assinaturas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Assinaturas Ativas */}
              <div>
                <h4 className="text-md font-medium mb-2">Assinaturas Ativas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientSubscriptions
                    .filter(subscription => subscription.status === 'ativa')
                    .map(subscription => (
                      <Card key={subscription.id} className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{getPlanName(subscription.plan_id)}</CardTitle>
                            <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                              {formatBillingCycle(subscription.billing_cycle)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Status:</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                getStatusColor(subscription.status)
                              }`}>
                                {formatSubscriptionStatus(subscription.status)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Início:</span>
                              <span>
                                {subscription.start_date ? format(new Date(subscription.start_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Próxima cobrança:</span>
                              <span>
                                {subscription.next_billing_date ? format(new Date(subscription.next_billing_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Método de pagamento:</span>
                              <span>{formatPaymentMethod(subscription.payment_method)}</span>
                            </div>
                            {subscription.discount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Desconto:</span>
                                <span className="text-green-600">{subscription.discount}%</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Faturas pagas:</span>
                              <span className="font-medium">
                                {subscription.payment_history?.length || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openPaymentHistory(subscription)}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Histórico
                            </Button>
                            
                            {subscription.payment_link && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => sendPaymentLink(subscription)}
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Enviar Link
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(`/subscriptions?edit=${subscription.id}`, '_blank')}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {clientSubscriptions.filter(subscription => subscription.status === 'ativa').length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhuma assinatura ativa</p>
                )}
              </div>
              
              {/* Assinaturas Inativas */}
              <div>
                <h4 className="text-md font-medium mb-2">Assinaturas Inativas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientSubscriptions
                    .filter(subscription => subscription.status !== 'ativa')
                    .map(subscription => (
                      <Card key={subscription.id} className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-4">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{getPlanName(subscription.plan_id)}</CardTitle>
                            <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                              {formatBillingCycle(subscription.billing_cycle)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Status:</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                getStatusColor(subscription.status)
                              }`}>
                                {formatSubscriptionStatus(subscription.status)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Início:</span>
                              <span>
                                {subscription.start_date ? format(new Date(subscription.start_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Término:</span>
                              <span>
                                {subscription.end_date ? format(new Date(subscription.end_date), 'dd/MM/yyyy') : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Método de pagamento:</span>
                              <span>{formatPaymentMethod(subscription.payment_method)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Faturas pagas:</span>
                              <span className="font-medium">
                                {subscription.payment_history?.length || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openPaymentHistory(subscription)}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Histórico
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => window.open(`/subscriptions?view=${subscription.id}`, '_blank')}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {clientSubscriptions.filter(subscription => subscription.status !== 'ativa').length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhuma assinatura inativa</p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fotos" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-gray-800">Fotos do Cliente</h3>
              <div className="flex gap-2">
                <button
                  onClick={showCamera ? stopCamera : startCamera}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Tirar Foto
                </button>
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#22C55E] rounded-md hover:bg-[#16A34A] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Enviar Fotos
                </button>
              </div>
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
                        className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal(photo.before)}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Depois</h3>
                      <img
                        src={photo.after}
                        alt="Foto depois"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal(photo.after)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(photo.uploadedAt).toLocaleDateString()} - {photo.type === 'camera' ? 'Câmera' : 'Upload'}
                    </span>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal de visualização da imagem */}
            {selectedImage && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={closeImageModal}
              >
                <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
                  <button
                    onClick={closeImageModal}
                    className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <img
                    src={selectedImage}
                    alt="Imagem ampliada"
                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

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

        <TabsContent value="anamnese" className="space-y-6">
          {/* Aba de Anamnese */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#3475B8]">Anamnese</h2>
              <Button
                onClick={handleSaveAnamnese}
                className="bg-[#3475B8] hover:bg-[#2C64A0]"
              >
                <Check className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Modelo</Label>
                <Select
                  value={selectedAnamneseTemplate?.id || ''}
                  onValueChange={handleAnamneseTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um modelo de anamnese" />
                  </SelectTrigger>
                  <SelectContent>
                    {anamneseTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAnamneseTemplate ? (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    {selectedAnamneseTemplate.fields?.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.label}</Label>
                        {field.type === 'boolean' ? (
                          <div className="flex items-center gap-4">
                            <Select
                              value={anamneseData[field.id] && anamneseData[field.id].value !== undefined ? anamneseData[field.id].value : ''}
                              onValueChange={value => {
                                setAnamneseData(prev => ({
                                  ...prev,
                                  [field.id]: { value, optional: value === 'Sim' ? (anamneseData[field.id]?.optional || '') : '' }
                                }));
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sim">Sim</SelectItem>
                                <SelectItem value="Não">Não</SelectItem>
                              </SelectContent>
                            </Select>
                            {field.optionalText && (anamneseData[field.id]?.value === 'Sim') && (
                              <Input
                                className="flex-1"
                                type="text"
                                placeholder={field.optionalText}
                                value={anamneseData[field.id]?.optional || ''}
                                onChange={e => {
                                  setAnamneseData(prev => ({
                                    ...prev,
                                    [field.id]: {
                                      ...prev[field.id],
                                      optional: e.target.value
                                    }
                                  }));
                                }}
                              />
                            )}
                          </div>
                        ) : field.type === 'select' ? (
                          <Select
                            value={anamneseData[field.id] || ''}
                            onValueChange={value => setAnamneseData(prev => ({ ...prev, [field.id]: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option, idx) => (
                                <SelectItem key={idx} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type="text"
                            value={anamneseData[field.id] || ''}
                            onChange={e => setAnamneseData(prev => ({ ...prev, [field.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    {renderSignaturePad()}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-gray-500">
                      Selecione um modelo de anamnese para começar
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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

        <TabsContent value="dependentes" className="space-y-6">
          {/* Aba de Dependentes */}
          <Card>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-[#175EA0]">Dependentes</h3>
                <Button
                  onClick={() => {
                    setEditingDependent(null);
                    setShowDependentForm(true);
                  }}
                  className="flex items-center gap-2 text-white bg-[#3475B8] hover:bg-[#2C64A0] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Dependente
                </Button>
              </div>
              
              <DependentList
                dependents={client?.dependents || []}
                onEdit={(dependent, index) => {
                  setEditingDependent({ dependent, index });
                  setShowDependentForm(true);
                }}
                onDelete={async (index) => {
                  if (!window.confirm('Tem certeza que deseja remover este dependente?')) {
                    return;
                  }
                  const newDependents = [...(client.dependents || [])];
                  newDependents.splice(index, 1);
                  await Client.update(clientId, {
                    ...client,
                    dependents: newDependents
                  });
                  loadClient();
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
                  const newDependents = [...(client?.dependents || [])];
                  if (editingDependent) {
                    newDependents[editingDependent.index] = data;
                  } else {
                    newDependents.push(data);
                  }
                  await Client.update(clientId, {
                    ...client,
                    dependents: newDependents
                  });
                  setShowDependentForm(false);
                  setEditingDependent(null);
                  loadClient();
                }}
                onCancel={() => {
                  setShowDependentForm(false);
                  setEditingDependent(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="observacoes">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Observações do Cliente</h2>
              <button
                onClick={() => setShowObservationDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Observação
              </button>
            </div>

            {observations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma observação encontrada</p>
            ) : (
              <div className="space-y-4">
                {observations.map((obs) => (
                  <div key={obs.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-gray-700 whitespace-pre-wrap">{obs.text}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(obs.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteObservation(obs.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal para adicionar observação */}
            {showObservationDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium">Adicionar Observação</h2>
                    <button
                      onClick={() => setShowObservationDialog(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observação
                      </label>
                      <textarea
                        value={observationText}
                        onChange={(e) => setObservationText(e.target.value)}
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-[#3475B8] focus:border-[#3475B8] resize-none"
                        placeholder="Digite sua observação aqui..."
                      />
                    </div>
                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => setShowObservationDialog(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={addObservation}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3475B8] rounded-md hover:bg-[#2C64A0] transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Adicionar
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
        <TabsContent value="anamnese" className="space-y-6">
          <AnamneseListCard clientId={client.id} clientName={client.name} />
        </TabsContent>
      </Tabs>
      
      {/* Diálogo para visualizar a imagem do Gift Card */}
      <Dialog open={showGiftCardImageDialog} onOpenChange={setShowGiftCardImageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visualização do Gift Card</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 flex flex-col items-center">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Gift Card: {selectedGiftCard?.code}</h3>
              <p>Valor: {selectedGiftCard?.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGiftCard.value) : "N/A"}</p>
              <p>Destinatário: {selectedGiftCard?.recipient_name || "Não especificado"}</p>
            </div>
            
            {selectedGiftCard?.image_base64 ? (
              <div className="border rounded-lg overflow-hidden shadow-lg max-w-md">
                <img 
                  src={selectedGiftCard.image_base64} 
                  alt="Gift Card" 
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-100 rounded-lg">
                <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Imagem não disponível</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowGiftCardImageDialog(false)}>
              Fechar
            </Button>
            
            {selectedGiftCard?.image_base64 && (
              <Button 
                onClick={() => downloadGiftCardImage(selectedGiftCard)} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            
            {selectedGiftCard?.recipient_phone && (
              <Button 
                onClick={() => {
                  setShowGiftCardImageDialog(false);
                  const message = `Olá${selectedGiftCard.recipient_name ? ' ' + selectedGiftCard.recipient_name : ''}! Você recebeu um Gift Card no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedGiftCard.value)}. Código: ${selectedGiftCard.code}${selectedGiftCard.message ? '\n\nMensagem: ' + selectedGiftCard.message : ''}`;
                  
                  // Remover caracteres não numéricos
                  const phone = selectedGiftCard.recipient_phone.replace(/\D/g, '');
                  
                  // Abrir WhatsApp Web com a mensagem
                  const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                }} 
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para visualizar o histórico de pagamentos */}
      <Dialog open={showPaymentHistoryDialog} onOpenChange={setShowPaymentHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {selectedSubscription && (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium">Plano: {getPlanName(selectedSubscription.plan_id)}</h3>
                  <p className="text-sm text-gray-500">
                    Ciclo: {formatBillingCycle(selectedSubscription.billing_cycle)} | 
                    Início: {selectedSubscription.start_date ? format(new Date(selectedSubscription.start_date), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                
                {(!selectedSubscription.payment_history || selectedSubscription.payment_history.length === 0) ? (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Nenhum pagamento registrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referência</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSubscription.payment_history.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {payment.amount ? formatCurrency(payment.amount) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {payment.status === 'approved' ? 'Aprovado' :
                                 payment.status === 'pending' ? 'Pendente' :
                                 payment.status === 'rejected' ? 'Rejeitado' :
                                 payment.status || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {payment.payment_method || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs">
                                {payment.reference_id || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {payment.receipt_url && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.open(payment.receipt_url, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
