import React, { useState, useEffect } from 'react';
import { Client, Appointment, Sale } from "@/firebase/entities";
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
  Package,
  Clock,
  Camera,
  Pencil,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DependentList from '@/components/clients/DependentList'; // Corrigido o caminho
import DependentForm from '@/components/clients/DependentForm'; // Corrigido o caminho
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function ClientDetails() {
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [sales, setSales] = useState([]);
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
      const [clientData, appointmentsData, salesData] = await Promise.all([
        Client.list(),
        Appointment.list(),
        Sale.list()
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
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="dependents">Dependentes</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Appointments History */}
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
                  <Package className="w-5 h-5" />
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
          </div>
        </TabsContent>

        <TabsContent value="dependents">
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

        <TabsContent value="photos">
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

        <TabsContent value="notes">
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
