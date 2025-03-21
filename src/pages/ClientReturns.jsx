import React, { useState, useEffect } from 'react';
import { 
  addDays, 
  format, 
  parseISO, 
  isAfter, 
  differenceInDays, 
  isBefore 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Client } from "@/api/entities";
import { Appointment } from "@/api/entities";
import { Service } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Send,
  Phone,
  ArrowRight,
  Bell,
  CheckCircle,
  AlertCircle,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientReturns() {
  const [loading, setLoading] = useState(true);
  const [clientReturns, setClientReturns] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [tab, setTab] = useState('pendente');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, servicesData, clientsData] = await Promise.all([
        Appointment.list(),
        Service.list(),
        Client.list()
      ]);
      
      // Filtramos apenas os serviços que requerem retorno
      const returnServices = servicesData.filter(service => 
        service.requires_return && service.return_days > 0
      );
      
      // Obtemos as últimas consultas concluídas de cada cliente para cada serviço
      const returns = [];
      
      const completedAppointments = appointmentsData.filter(app => 
        app.status === 'concluído'
      );
      
      // Agrupar por cliente e serviço
      const appointmentsByClientAndService = {};
      
      completedAppointments.forEach(app => {
        const key = `${app.client_id}-${app.service_id}`;
        if (!appointmentsByClientAndService[key]) {
          appointmentsByClientAndService[key] = [];
        }
        appointmentsByClientAndService[key].push(app);
      });
      
      // Para cada cliente-serviço, encontrar a última consulta
      Object.keys(appointmentsByClientAndService).forEach(key => {
        const appointments = appointmentsByClientAndService[key].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        
        const lastAppointment = appointments[0];
        const [clientId, serviceId] = key.split('-');
        const service = returnServices.find(s => s.id === serviceId);
        
        if (service) {
          const client = clientsData.find(c => c.id === clientId);
          
          // Calcular data de retorno
          const lastAppointmentDate = parseISO(lastAppointment.date);
          const returnDate = addDays(lastAppointmentDate, service.return_days);
          const today = new Date();
          
          // Status do retorno
          let status = 'pendente';
          if (isAfter(today, returnDate)) {
            status = 'atrasado';
          }
          
          // Verificar se já houve um novo agendamento após o último atendimento
          const hasNewAppointment = appointmentsData.some(app => 
            app.client_id === clientId && 
            app.service_id === serviceId &&
            isAfter(parseISO(app.date), lastAppointmentDate) &&
            (app.status === 'agendado' || app.status === 'confirmado')
          );
          
          if (hasNewAppointment) {
            status = 'agendado';
          }
          
          returns.push({
            id: key,
            client,
            service,
            lastAppointment,
            returnDate,
            daysSinceLastAppointment: differenceInDays(today, lastAppointmentDate),
            daysOverdue: isAfter(today, returnDate) ? differenceInDays(today, returnDate) : 0,
            status
          });
        }
      });
      
      setClientReturns(returns);
      setServices(servicesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar retornos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const sendWhatsAppMessage = (client, service) => {
    try {
      if (!client.phone) {
        alert('Este cliente não possui telefone cadastrado.');
        return;
      }
      
      // Formatar número de telefone (remover caracteres não numéricos)
      const phoneNumber = client.phone.replace(/\D/g, '');
      
      // Mensagem de retorno
      const message = encodeURIComponent(
        `Olá ${client.name}! Notamos que já está na hora do seu retorno para o serviço de ${service.name}. ` +
        `Para melhores resultados, recomendamos realizar a manutenção a cada ${service.return_days} dias. ` +
        `Gostaria de agendar seu retorno? Entre em contato conosco para mais informações.`
      );
      
      // Criar link do WhatsApp
      const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
      
      // Abrir em nova janela
      window.open(whatsappLink, '_blank');
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      alert("Erro ao abrir WhatsApp. Verifique se o número de telefone está correto.");
    }
  };
  
  const filteredReturns = clientReturns.filter(item => {
    if (tab === 'todos') return true;
    return item.status === tab;
  });
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'atrasado': return 'text-red-500';
      case 'pendente': return 'text-amber-500';
      case 'agendado': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'atrasado': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pendente': return <Bell className="w-5 h-5 text-amber-500" />;
      case 'agendado': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const sortedReturns = [...filteredReturns].sort((a, b) => {
    // Primeiro por status (atrasado > pendente > agendado)
    const statusOrder = { atrasado: 0, pendente: 1, agendado: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    
    // Depois por data de retorno (mais antigos primeiro)
    return a.returnDate - b.returnDate;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Retornos de Clientes</h2>
      </div>
      
      <Tabs defaultValue="pendente" value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="atrasado">Atrasados</TabsTrigger>
          <TabsTrigger value="agendado">Agendados</TabsTrigger>
        </TabsList>
        
        <TabsContent value={tab} className="mt-6">
          {loading ? (
            <div className="text-center py-10">
              <p>Carregando retornos...</p>
            </div>
          ) : sortedReturns.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhum retorno {tab !== 'todos' ? tab : ''} encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedReturns.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className={`h-2 ${
                    item.status === 'atrasado' ? 'bg-red-500' :
                    item.status === 'pendente' ? 'bg-amber-500' :
                    item.status === 'agendado' ? 'bg-green-500' :
                    'bg-gray-300'
                  }`} />
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{item.client?.name}</h3>
                        <p className="text-sm text-gray-600">{item.client?.phone}</p>
                      </div>
                      <div className={`flex items-center ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 text-sm font-medium capitalize">
                          {item.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Serviço:</span> {item.service?.name}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Último atendimento:</span> {format(parseISO(item.lastAppointment.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Retorno indicado:</span> {format(item.returnDate, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      
                      {item.status === 'atrasado' && (
                        <p className="text-sm text-red-600 font-medium mt-1">
                          Atrasado em {item.daysOverdue} {item.daysOverdue === 1 ? 'dia' : 'dias'}
                        </p>
                      )}
                      
                      {item.status === 'pendente' && isBefore(new Date(), item.returnDate) && (
                        <p className="text-sm text-amber-600 font-medium mt-1">
                          Faltam {differenceInDays(item.returnDate, new Date())} {differenceInDays(item.returnDate, new Date()) === 1 ? 'dia' : 'dias'}
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-5 flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        className="border-green-600 text-green-600 hover:bg-green-50"
                        onClick={() => sendWhatsAppMessage(item.client, item.service)}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="w-4 h-4 mr-2" 
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Lembrar por WhatsApp
                      </Button>
                      
                      {item.status !== 'agendado' && (
                        <Link to={createPageUrl("Appointments")}>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700">
                            <Calendar className="w-4 h-4 mr-2" />
                            Agendar Retorno
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}