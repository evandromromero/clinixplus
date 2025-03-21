
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Package, Gift, Clock, LogOut, User, Calendar, ShoppingBag, Receipt } from "lucide-react";
import ClientLoginForm from "../components/client-portal/ClientLoginForm";
import AppointmentCard from "../components/client-portal/AppointmentCard";
import PackageCard from "../components/client-portal/PackageCard";
import SubscriptionCard from "../components/client-portal/SubscriptionCard";
import GiftCardCard from "../components/client-portal/GiftCardCard";
import HistoryCard from "../components/client-portal/HistoryCard";
import { Client } from "@/api/entities";
import { Appointment } from "@/api/entities";
import { ClientPackage } from "@/api/entities";
import { ClientSubscription } from "@/api/entities";
import { GiftCard } from "@/api/entities";
import { Sale } from "@/api/entities";
import { CompanySettings } from "@/api/entities";
import { Service } from "@/api/entities";
import { Employee } from "@/api/entities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [clientPackages, setClientPackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [company, setCompany] = useState({});
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);

  const loadClientData = async (clientData) => {
    const clientId = clientData.client.id;
    setCurrentClient(clientData.client);
    
    try {
      const [appointmentsData, packagesData, subscriptionsData, giftCardsData, salesData, companyData, servicesData, employeesData] = await Promise.all([
        Appointment.list(),
        ClientPackage.list(),
        ClientSubscription.list(),
        GiftCard.list(),
        Sale.list(),
        CompanySettings.list(),
        Service.list(),
        Employee.list()
      ]);

      setServices(servicesData);
      setEmployees(employeesData);
      
      const clientAppointments = appointmentsData
        .filter(app => app.client_id === clientId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(app => {
          const service = servicesData.find(s => s.id === app.service_id);
          const employee = employeesData.find(e => e.id === app.employee_id);
          
          return {
            ...app,
            service_name: service ? service.name : "Serviço não encontrado",
            employee_name: employee ? employee.name : "Profissional não encontrado"
          };
        });
        
      setAppointments(clientAppointments);
      
      const formattedPackages = packagesData
        .filter(pkg => pkg.client_id === clientId)
        .sort((a, b) => new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0))
        .map(pkg => {
          return {
            ...pkg,
            sessions_used: pkg.sessions_used || 0,
            total_sessions: pkg.total_sessions || 0,
            status: pkg.status || 'ativo',
            purchase_date: pkg.purchase_date || new Date().toISOString(),
            expiration_date: pkg.expiration_date || new Date().toISOString(),
            package_snapshot: pkg.package_snapshot || {
              name: "Pacote de serviços",
              services: []
            }
          };
        });
      
      setClientPackages(formattedPackages);
      
      const formattedSubscriptions = subscriptionsData
        .filter(sub => sub.client_id === clientId)
        .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))
        .map(sub => {
          return {
            ...sub,
            status: sub.status || 'ativa',
            start_date: sub.start_date || new Date().toISOString(),
            billing_cycle: sub.billing_cycle || 'mensal',
            next_billing_date: sub.next_billing_date || new Date().toISOString(),
            services_used: sub.services_used || []
          };
        });
      
      setSubscriptions(formattedSubscriptions);
      
      const formattedGiftCards = giftCardsData
        .filter(card => card.client_id === clientId || card.redeemed_by === clientId)
        .sort((a, b) => new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0))
        .map(card => {
          return {
            ...card,
            code: card.code || "GC-0000",
            value: card.value || 0,
            status: card.status || 'ativo',
            purchase_date: card.purchase_date || new Date().toISOString(),
            expiration_date: card.expiration_date || new Date().toISOString()
          };
        });
      
      setGiftCards(formattedGiftCards);
      
      setSalesHistory(
        salesData
          .filter(sale => sale.client_id === clientId)
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      );
      
      if (companyData.length > 0) {
        setCompany(companyData[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
    }
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentClient(null);
    setAppointments([]);
    setClientPackages([]);
    setSubscriptions([]);
    setGiftCards([]);
    setSalesHistory([]);
  };
  
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ClientLoginForm onSuccess={(data) => {
            setIsLoggedIn(true);
            loadClientData(data);
          }} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src={company.logo_url} alt={company.name} className="h-10 mr-4" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Portal do Cliente</h1>
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <p className="text-sm font-medium text-gray-900">{currentClient?.name}</p>
              <p className="text-xs text-gray-500">{currentClient?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center mb-4">
            <User className="w-5 h-5 mr-2 text-purple-600" />
            Olá, {currentClient?.name.split(' ')[0]}!
          </h2>
          
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Próximo agendamento</p>
                  <p className="font-medium">
                    {appointments.find(app => new Date(app.date) > new Date())
                      ? format(
                          new Date(appointments.find(app => new Date(app.date) > new Date()).date),
                          "dd 'de' MMMM", 
                          { locale: ptBR }
                        )
                      : "Nenhum agendamento futuro"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Pacotes ativos</p>
                  <p className="font-medium">
                    {clientPackages.filter(pkg => pkg.status === 'ativo').length}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Assinaturas</p>
                  <p className="font-medium">
                    {subscriptions.filter(sub => sub.status === 'ativa').length}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Pontos de fidelidade</p>
                  <p className="font-medium">
                    {currentClient?.loyalty_points || 0} pontos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <TabsTrigger value="appointments" className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Agendamentos</span>
              <span className="sm:hidden">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="packages" className="flex items-center">
              <Package className="w-4 h-4 mr-2" />
              <span>Pacotes</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Assinaturas</span>
              <span className="sm:hidden">Assin.</span>
            </TabsTrigger>
            <TabsTrigger value="giftcards" className="flex items-center">
              <Gift className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Gift Cards</span>
              <span className="sm:hidden">Gifts</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center">
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="appointments">
            <AppointmentCard appointments={appointments} />
          </TabsContent>
          
          <TabsContent value="packages">
            <PackageCard packages={clientPackages} services={services} />
          </TabsContent>
          
          <TabsContent value="subscriptions">
            <SubscriptionCard subscriptions={subscriptions} services={services} />
          </TabsContent>
          
          <TabsContent value="giftcards">
            <GiftCardCard giftCards={giftCards} />
          </TabsContent>
          
          <TabsContent value="history">
            <HistoryCard sales={salesHistory} />
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">{company.name} &copy; {new Date().getFullYear()}</p>
            <div className="flex items-center mt-4 md:mt-0">
              <p className="text-sm text-gray-500">
                Problemas ou dúvidas? Entre em contato: {company.phone}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
