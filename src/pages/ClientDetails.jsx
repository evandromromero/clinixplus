import React, { useState, useEffect } from 'react';
import { Client, Appointment, Sale, ClientPackage, Package } from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package as PackageIcon,
  Clock,
  Camera,
  Pencil,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DependentList from '@/components/clients/DependentList'; 
import DependentForm from '@/components/clients/DependentForm'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function ClientDetails() {
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [sales, setSales] = useState([]);
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showDependentForm, setShowDependentForm] = useState(false);
  const [editingDependent, setEditingDependent] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const [clientData, appointmentsData, salesData, clientPackagesData, packagesData] = await Promise.all([
        Client.list(),
        Appointment.list(),
        Sale.list(),
        ClientPackage.list(),
        Package.list()
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
          
          return {
            ...cp,
            packageData: basePackage,
            sessions_used: cp.sessions_used || 0,
            total_sessions: cp.total_sessions || 0,
            session_history: cp.session_history || []
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
    } catch (error) {
      console.error(error);
      setLoadError(error.message);
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
          onRetry={loadClientData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Detalhes do Cliente</h2>
        <div className="flex gap-3">
          <Button variant="outline">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Link to={createPageUrl("Appointments")}>
            <Button className="bg-purple-600 hover:bg-purple-700">
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
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{client.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Endereço</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Tipo de Pele</p>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium bg-purple-100 text-purple-700">
                  {client.skin_type}
                </span>
              </div>
              {client.allergies && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Alergias</p>
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
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="observacoes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="space-y-6">
          {/* Histórico de Agendamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Histórico de Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="font-medium">
                          {format(new Date(appointment.date), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.service_id}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                        appointment.status === 'concluído'
                          ? 'bg-green-100 text-green-700'
                          : appointment.status === 'cancelado'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
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
                <PackageIcon className="w-5 h-5" />
                Histórico de Compras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sales.map((sale, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        R$ {sale.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(sale.date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                          sale.status === 'pago'
                            ? 'bg-green-100 text-green-700'
                            : sale.status === 'cancelado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {sale.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {sale.payment_method}
                      </p>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
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
                  <PackageIcon className="w-5 h-5" />
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
              {clientPackages.length > 0 ? (
                <div className="space-y-4">
                  {clientPackages.map((pkg) => (
                    <div key={pkg.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-lg">{pkg.packageData?.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {pkg.sessions_used} de {pkg.total_sessions} sessões utilizadas
                              </span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-600">
                              Criado em {format(new Date(pkg.purchase_date || pkg.created_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            pkg.status === 'ativo' 
                              ? 'bg-green-100 text-green-800'
                              : pkg.status === 'finalizado'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pkg.status === 'ativo' ? 'Ativo' : 
                             pkg.status === 'finalizado' ? 'Finalizado' : 'Pendente'}
                          </span>
                          {pkg.valid_until && (
                            <p className="text-sm text-gray-500 mt-1">
                              {pkg.status === 'ativo' ? 'Válido até ' : 'Expirou em '}
                              {format(new Date(pkg.valid_until), "dd/MM/yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Serviços Incluídos:</h5>
                        <div className="space-y-1">
                          {pkg.packageData?.services?.map((service, index) => (
                            <div key={index} className="text-sm text-gray-600 flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                {service.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{service.sessions}x</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium mb-2">Histórico de Uso:</h5>
                        <div className="space-y-2">
                          {pkg.session_history?.length > 0 ? (
                            pkg.session_history.map((session, index) => (
                              <div key={index} className="text-sm text-gray-600 flex justify-between items-center bg-gray-50 p-2 rounded">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {format(new Date(session.date), "dd/MM/yyyy HH:mm")}
                                  </div>
                                  <div className="text-gray-500 mt-1 flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    {session.employee_name}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div>{session.service_name}</div>
                                  {session.notes && (
                                    <div className="text-xs text-gray-500 mt-1">{session.notes}</div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">Nenhum uso registrado</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Valor Total:</span> R$ {pkg.total_price?.toFixed(2) || '0.00'}
                        </div>
                        {pkg.status === 'ativo' && pkg.sessions_used < pkg.total_sessions && (
                          <Link to={createPageUrl("Appointments", { client_id: clientId, package_id: pkg.id })}>
                            <Button variant="outline" size="sm">
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
                  className="bg-[#294380] hover:bg-[#0D0F36]"
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
                  loadClientData();
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
                  loadClientData();
                }}
                onCancel={() => {
                  setShowDependentForm(false);
                  setEditingDependent(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="fotos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Fotos Antes/Depois
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Adicionar Fotos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {client.before_after_photos?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {client.before_after_photos.map((photo, i) => (
                    <div key={i} className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <img
                          src={photo.before_url}
                          alt="Antes"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <img
                          src={photo.after_url}
                          alt="Depois"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        <p>{photo.treatment}</p>
                        <p>{format(new Date(photo.date), 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Nenhuma foto encontrada
                </p>
              )}
            </CardContent>
          </Card>
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
                <p className="text-center text-gray-500 py-4">
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
