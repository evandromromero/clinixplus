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
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src={company.logo_url || "/logo.png"} alt={company.name} className="h-10 mr-4 rounded-full shadow-sm" />
            <div>
              <h1 className="text-xl font-semibold text-[#294380]">Portal do Cliente</h1>
            </div>
          </div>
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <p className="text-sm font-medium text-[#294380]">{currentClient?.name}</p>
              <p className="text-xs text-gray-500">{currentClient?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center mb-6 text-[#294380] group">
            <User className="w-6 h-6 mr-3 text-purple-600 group-hover:scale-110 transition-transform" />
            Olá, {currentClient?.name.split(' ')[0]}!
          </h2>
          
          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-colors">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                    Próximo agendamento
                  </p>
                  <p className="font-medium text-[#294380]">
                    {appointments.find(app => new Date(app.date) > new Date())
                      ? format(
                          new Date(appointments.find(app => new Date(app.date) > new Date()).date),
                          "dd 'de' MMMM", 
                          { locale: ptBR }
                        )
                      : "Nenhum agendamento futuro"}
                  </p>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Package className="w-4 h-4 mr-2 text-blue-600" />
                    Pacotes ativos
                  </p>
                  <p className="font-medium text-[#294380]">
                    {clientPackages.filter(pkg => pkg.status === 'ativo').length}
                  </p>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-colors">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-green-600" />
                    Assinaturas
                  </p>
                  <p className="font-medium text-[#294380]">
                    {subscriptions.filter(sub => sub.status === 'ativa').length}
                  </p>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 transition-colors">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Gift className="w-4 h-4 mr-2 text-pink-600" />
                    Pontos de fidelidade
                  </p>
                  <p className="font-medium text-[#294380]">
                    {currentClient?.loyalty_points || 0} pontos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-lg">
            <TabsTrigger value="appointments" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <CalendarDays className="w-4 h-4 mr-2" />
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              <Package className="w-4 h-4 mr-2" />
              Pacotes
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
              <Clock className="w-4 h-4 mr-2" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="giftcards" className="data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
              <Gift className="w-4 h-4 mr-2" />
              Gift Cards
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700">
              <Receipt className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <AppointmentCard appointments={appointments} />
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <PackageCard packages={clientPackages} />
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <SubscriptionCard subscriptions={subscriptions} />
          </TabsContent>

          <TabsContent value="giftcards" className="space-y-4">
            <GiftCardCard giftCards={giftCards} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoryCard sales={salesHistory} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-white/80 backdrop-blur-sm mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p> {new Date().getFullYear()} {company.name} - Todos os direitos reservados</p>
          <p className="mt-1">Problemas ou dúvidas? Entre em contato conosco.</p>
        </div>
      </footer>
    </div>
  );
}
