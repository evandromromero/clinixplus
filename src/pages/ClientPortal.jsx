import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Package as PackageIcon, Gift, Clock, LogOut, User, Calendar, ShoppingBag, Receipt, ShoppingCart } from "lucide-react";
import ClientLoginForm from "../components/client-portal/ClientLoginForm";
import AppointmentCard from "../components/client-portal/AppointmentCard";
import PackageCard from "../components/client-portal/PackageCard";
import SubscriptionCard from "../components/client-portal/SubscriptionCard";
import GiftCardCard from "../components/client-portal/GiftCardCard";
import HistoryCard from "../components/client-portal/HistoryCard";
import ServiceShopCard from "../components/client-portal/ServiceShopCard";
import PackageShopCard from "../components/client-portal/PackageShopCard";
import { Client } from "@/firebase/entities";
import { Appointment } from "@/firebase/entities";
import { ClientPackage } from "@/firebase/entities";
import { Package } from "@/firebase/entities";
import { ClientSubscription } from "@/firebase/entities";
import { GiftCard } from "@/firebase/entities";
import { Sale } from "@/firebase/entities";
import { Service } from "@/firebase/entities";
import { Employee } from "@/firebase/entities";
import { CompanySettings } from "@/api/entities"; // Corrigido: importando do caminho correto
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SEOHead from '../components/SEOHead';

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
  const [loading, setLoading] = useState(true);
  
  // Verificar se há dados de login salvos ao carregar a página
  useEffect(() => {
    const savedLoginData = localStorage.getItem('clientPortalLogin');
    if (savedLoginData) {
      try {
        const loginData = JSON.parse(savedLoginData);
        setIsLoggedIn(true);
        loadClientData(loginData);
      } catch (error) {
        console.error('Erro ao recuperar dados de login:', error);
        localStorage.removeItem('clientPortalLogin');
      }
    }
    setLoading(false);
  }, []);

  // Listener para exclusão de pacotes
  useEffect(() => {
    const handlePackageDeleted = (event) => {
      const { packageId, clientId: deletedClientId } = event.detail;
      const currentClientId = currentClient?.id;
      
      if (deletedClientId === currentClientId) {
        console.log('[ClientPortal] Pacote excluído detectado:', packageId);
        setClientPackages(prev => {
          const updated = prev.filter(pkg => pkg.id !== packageId);
          console.log('[ClientPortal] Pacotes atualizados:', updated.length);
          return updated;
        });
      }
    };

    window.addEventListener('clientPackageDeleted', handlePackageDeleted);
    return () => window.removeEventListener('clientPackageDeleted', handlePackageDeleted);
  }, [currentClient?.id]);

  const loadClientData = async (clientData) => {
    const clientId = clientData.client.id;
    setCurrentClient(clientData.client);
    
    // Salvar dados de login no localStorage
    localStorage.setItem('clientPortalLogin', JSON.stringify(clientData));
    
    try {
      const [appointmentsData, packagesData, clientPackagesData, subscriptionsData, giftCardsData, salesData, companyData, servicesData, employeesData] = await Promise.all([
        Appointment.list(),
        Package.list(),
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
      
      // Filtrar e processar pacotes do cliente
      const activePackages = clientPackagesData
        .filter(cp => cp.client_id === clientId)
        .map(cp => {
          // Verifica se é um pacote personalizado
          const isCustomPackage = cp.package_id?.startsWith('custom_');
          
          // Encontra o pacote base (apenas para pacotes regulares)
          const basePackage = isCustomPackage ? null : packagesData.find(p => p.id === cp.package_id);
          
          // Encontra os serviços do package_snapshot
          let services = [];
          if (cp.package_snapshot?.services) {
            // Verifica se services é um array ou um objeto
            if (Array.isArray(cp.package_snapshot.services)) {
              // Se for um array, processa cada ID de serviço
              services = cp.package_snapshot.services.map(serviceId => {
                // serviceId pode ser uma string (ID) ou um objeto com service_id
                const serviceIdValue = typeof serviceId === 'object' ? serviceId.service_id || serviceId.id : serviceId;
                const service = servicesData.find(s => s.id === serviceIdValue);
                return {
                  service_id: serviceIdValue,
                  name: service?.name || 'Serviço não encontrado',
                  quantity: 1 // Valor padrão para quantidade
                };
              });
            } else {
              // Se for um objeto, usa o código original
              services = Object.entries(cp.package_snapshot.services).map(([_, serviceData]) => {
                const service = servicesData.find(s => s.id === serviceData.service_id);
                return {
                  service_id: serviceData.service_id,
                  name: service?.name || 'Serviço não encontrado',
                  quantity: serviceData.quantity || 0
                };
              });
            }
          }
          
          return {
            ...cp,
            packageData: basePackage, // Pode ser null para pacotes personalizados
            isCustomPackage, // Adicionando flag para pacotes personalizados
            sessions_used: cp.sessions_used || 0,
            total_sessions: cp.total_sessions || 0,
            session_history: cp.session_history || [],
            services: services,
            status: cp.status || 'ativo',
            purchase_date: cp.purchase_date || new Date().toISOString(),
            expiration_date: cp.expiration_date || new Date().toISOString(),
            package_snapshot: cp.package_snapshot || {
              name: isCustomPackage ? (cp.package_snapshot?.name || "Pacote personalizado") : (basePackage?.name || "Pacote de serviços"),
              services: services
            }
          };
        })
        // Remover o filtro que exclui pacotes personalizados
        // .filter(cp => cp.packageData) // Filtra apenas pacotes que têm dados base
        .sort((a, b) => {
          // Primeiro os ativos, depois por data de validade
          if (a.status === 'ativo' && b.status !== 'ativo') return -1;
          if (a.status !== 'ativo' && b.status === 'ativo') return 1;
          
          const dateA = new Date(a.purchase_date || 0);
          const dateB = new Date(b.purchase_date || 0);
          return dateB - dateA;
        });
      
      setClientPackages(activePackages);
      
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
  
  // Função para recarregar dados do cliente
  const refreshClientData = async () => {
    if (currentClient) {
      try {
        console.log('[ClientPortal] Recarregando dados do cliente...');
        await loadClientData({ client: currentClient });
        console.log('[ClientPortal] Dados recarregados com sucesso!');
      } catch (error) {
        console.error('[ClientPortal] Erro ao recarregar dados:', error);
      }
    }
  };
  
  const handleLogout = () => {
    // Limpar dados de login do localStorage
    localStorage.removeItem('clientPortalLogin');
    
    // Limpar estados
    setIsLoggedIn(false);
    setCurrentClient(null);
    setAppointments([]);
    setClientPackages([]);
    setSubscriptions([]);
    setGiftCards([]);
    setSalesHistory([]);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
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
    <div className="min-h-screen bg-gray-50">
      <SEOHead 
        title={company.seo_settings?.meta_title || "Portal do Cliente - ClinixPlus"} 
        description={company.seo_settings?.meta_description || "Acesse seus agendamentos, pacotes e histórico no Portal do Cliente ClinixPlus"} 
        keywords={company.seo_settings?.meta_keywords || "portal cliente, agendamentos, pacotes, histórico"} 
        author={company.seo_settings?.meta_author || "ClinixPlus"} 
        faviconUrl={company.seo_settings?.favicon_url || "/favicon.ico"} 
        siteName={company.seo_settings?.site_name || "ClinixPlus"} 
      />
      <header className="bg-white border-b border-gray-200">
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
                    <PackageIcon className="w-4 h-4 mr-2 text-blue-600" />
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
              <PackageIcon className="w-4 h-4 mr-2" />
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
            <TabsTrigger value="buyservices" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar Serviços
            </TabsTrigger>
            <TabsTrigger value="buypackages" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Comprar Pacotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            <AppointmentCard 
              appointments={appointments} 
              onRefresh={refreshClientData}
            />
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <PackageCard packages={clientPackages} services={services} />
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

          <TabsContent value="buyservices" className="space-y-4">
            <ServiceShopCard clientId={currentClient?.id} />
          </TabsContent>

          <TabsContent value="buypackages" className="space-y-4">
            <PackageShopCard clientId={currentClient?.id} />
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
