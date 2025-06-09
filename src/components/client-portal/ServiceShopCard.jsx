import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, ShoppingCart, Clock, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where, addDoc, doc, getDoc } from "firebase/firestore";
import MercadoPagoService from "@/services/mercadoPagoService";
import { PendingService } from "@/api/entities";

export default function ServiceShopCard({ clientId }) {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);
  
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  
  // Verificar parâmetros de URL para processamento de retorno de pagamento
  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        // Verificar se há parâmetros de status e referência na URL
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const reference = urlParams.get('ref');
        
        if (status && reference) {
          setPaymentStatus(status);
          
          // Buscar o serviço pendente pelo external_reference
          const pendingServicesRef = collection(db, 'pending_services');
          const pendingQuery = query(pendingServicesRef, where("external_reference", "==", reference));
          const pendingSnapshot = await getDocs(pendingQuery);
          
          if (!pendingSnapshot.empty) {
            const pendingServiceDoc = pendingSnapshot.docs[0];
            const pendingServiceData = pendingServiceDoc.data();
            
            // Atualizar status do serviço pendente
            await PendingService.update(pendingServiceDoc.id, {
              payment_status: status,
              updated_at: new Date()
            });
            
            // Definir mensagem com base no status
            if (status === 'success') {
              setPaymentMessage('Pagamento aprovado! Seu serviço foi adquirido com sucesso.');
            } else if (status === 'pending') {
              setPaymentMessage('Pagamento pendente. Assim que for confirmado, seu serviço será ativado.');
            } else if (status === 'failure') {
              setPaymentMessage('Houve um problema com o pagamento. Por favor, tente novamente.');
            }
            
            // Limpar parâmetros da URL para evitar processamento duplicado
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        }
      } catch (error) {
        console.error('Erro ao processar retorno do pagamento:', error);
      }
    };
    
    processPaymentReturn();
  }, []);
  
  // Carregar serviços disponíveis para compra (apenas os que estão marcados para exibir no site)
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        
        // Inicializar o Mercado Pago - buscar do documento company_settings
        const companySettingsRef = doc(db, 'company_settings', 'nYF20n1wgCetPDsO8gEB');
        const companySettingsDoc = await getDoc(companySettingsRef);
        
        if (companySettingsDoc.exists()) {
          const companySettings = companySettingsDoc.data();
          if (companySettings.payment_settings) {
            console.log('Inicializando Mercado Pago com configurações:', companySettings.payment_settings);
            MercadoPagoService.initialize(companySettings.payment_settings);
          } else {
            console.error('Configurações de pagamento não encontradas no documento company_settings');
          }
        } else {
          console.error('Documento company_settings não encontrado');
        }
        
        // Carregar dados do cliente
        if (clientId) {
          const clientRef = collection(db, 'clients');
          const clientQuery = query(clientRef, where("id", "==", clientId));
          const clientSnapshot = await getDocs(clientQuery);
          
          if (!clientSnapshot.empty) {
            setClientData(clientSnapshot.docs[0].data());
          }
        }
        
        // Carregar serviços
        const servicesRef = collection(db, 'services');
        const servicesQuery = query(servicesRef, where("show_on_website", "==", true));
        const snapshot = await getDocs(servicesQuery);
        
        const servicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => (a.website_order || 999) - (b.website_order || 999));
        
        setServices(servicesData);
        setFilteredServices(servicesData);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadServices();
  }, [clientId]);
  
  // Filtrar serviços quando o termo de busca mudar
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(service => 
        service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, services]);
  
  // Paginação
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedServices = filteredServices.slice(startIndex, endIndex);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // Formatar preço em reais
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  
  // Abrir modal de detalhes do serviço
  const handleServiceClick = (service) => {
    setSelectedService(service);
    setShowServiceDialog(true);
  };
  
  // Iniciar processo de compra
  const handleBuyService = async () => {
    if (!selectedService || !clientData) {
      console.error('Serviço ou dados do cliente não disponíveis');
      return;
    }
    
    try {
      console.log('Iniciando processo de compra para serviço:', selectedService.name);
      console.log('Dados do cliente:', clientData);
      setLoading(true);
      
      // Verificar se o Mercado Pago está inicializado e inicializar se necessário
      console.log('Buscando configurações de pagamento do Firestore...');
      // Buscar configurações do documento company_settings
      const companySettingsRef = doc(db, 'company_settings', 'nYF20n1wgCetPDsO8gEB');
      const companySettingsDoc = await getDoc(companySettingsRef);
      
      if (companySettingsDoc.exists()) {
        const companySettings = companySettingsDoc.data();
        console.log('Documento company_settings encontrado');
        
        if (companySettings.payment_settings) {
          console.log('Configurações de pagamento encontradas:', {
            sandbox: companySettings.payment_settings.mercadopago_sandbox,
            hasAccessToken: !!companySettings.payment_settings.mercadopago_access_token
          });
          
          console.log('Inicializando serviço Mercado Pago...');
          MercadoPagoService.initialize(companySettings.payment_settings);
          console.log('Serviço Mercado Pago inicializado');
        } else {
          console.error('Configurações de pagamento não encontradas no documento company_settings');
          throw new Error("Configurações de pagamento não encontradas no documento company_settings");
        }
      } else {
        console.error('Documento company_settings não encontrado');
        throw new Error("Documento company_settings não encontrado");
      }
      
      // Gerar referência externa única para o pagamento
      const externalReference = `service_${selectedService.id}_client_${clientId}_${Date.now()}`;
      
      // Criar serviço pendente no Firestore
      console.log('Preparando dados para serviço pendente...');
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log('ID de transação gerado:', transactionId);
      
      const pendingServiceData = {
        client_id: clientId,
        service_id: selectedService.id,
        service_name: selectedService.name,
        amount: selectedService.price,
        status: 'pending',
        created_at: new Date(),
        external_reference: transactionId
      };
      
      console.log('Criando registro de serviço pendente no Firestore:', pendingServiceData);
      const pendingService = await PendingService.create(pendingServiceData);
      console.log('Serviço pendente criado com ID:', pendingService.id);
      
      // Criar link de pagamento
      console.log('Preparando dados para criação do link de pagamento...');
      const baseUrl = window.location.origin + window.location.pathname;
      console.log('URL base para redirecionamento:', baseUrl);
      
      const paymentData = {
        plan_name: selectedService.name,
        amount: selectedService.price,
        payer_email: clientData.email,
        external_reference: transactionId,
        success_url: `${baseUrl}?status=success&ref=${transactionId}`,
        failure_url: `${baseUrl}?status=failure&ref=${transactionId}`,
        pending_url: `${baseUrl}?status=pending&ref=${transactionId}`
      };
      
      console.log('Dados de pagamento preparados:', JSON.stringify(paymentData, null, 2));
      console.log('Chamando MercadoPagoService.createPaymentLink...');
      
      try {
        console.log('Tentando criar link de pagamento com Mercado Pago...');
        const paymentResult = await MercadoPagoService.createPaymentLink(paymentData);
        console.log('Resultado da criação do link de pagamento:', paymentResult);
        
        if (paymentResult && paymentResult.url) {
          console.log('Link de pagamento gerado com sucesso:', paymentResult.url);
          
          // Atualizar o serviço pendente com as informações do pagamento
          console.log('Atualizando serviço pendente com informações do pagamento...');
          await PendingService.update(pendingService.id, {
            payment_id: paymentResult.payment_id || '',
            preference_id: paymentResult.preference_id || '',
            payment_url: paymentResult.url
          });
          
          setPaymentUrl(paymentResult.url);
          console.log('Redirecionando para a página de pagamento...');
          window.location.href = paymentResult.url;
        } else {
          console.error('Resultado inválido ao criar link de pagamento:', paymentResult);
          throw new Error("Não foi possível gerar o link de pagamento");
        }
      } catch (error) {
        console.error('Erro ao criar link de pagamento:', error);
        console.error('Mensagem de erro:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
      }
    } catch (error) {
      console.error("=== ERRO AO PROCESSAR PAGAMENTO ===");
      console.error("Mensagem de erro:", error.message);
      console.error("Stack trace:", error.stack);
      console.error("Objeto de erro completo:", error);
      
      // Verificar se é um erro de resposta da API
      if (error.response) {
        console.error("Detalhes da resposta de erro:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      // Verificar se é um erro de requisição
      if (error.request) {
        console.error("Detalhes da requisição com erro:", error.request);
      }
      
      alert("Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar cards de serviços
  const renderServiceCards = () => {
    if (loading && services.length === 0) {
      return (
        <div className="col-span-full flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#3475B8]" />
        </div>
      );
    }
    
    if (displayedServices.length === 0) {
      return (
        <div className="col-span-full text-center py-10">
          <p className="text-gray-500">Nenhum serviço encontrado.</p>
        </div>
      );
    }
    
    return displayedServices.map((service) => (
      <div 
        key={service.id} 
        className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleServiceClick(service)}
      >
        {service.image_url ? (
          <div className="h-40 overflow-hidden">
            <img 
              src={service.image_url} 
              alt={service.name} 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`h-2 ${
            service.category === 'facial' ? 'bg-pink-500' :
            service.category === 'corporal' ? 'bg-blue-500' :
            service.category === 'depilação' ? 'bg-purple-500' :
            service.category === 'massagem' ? 'bg-green-500' :
            'bg-gray-500'
          }`} />
        )}
        
        <div className="p-4">
          <h3 className="font-medium text-lg text-[#294380]">{service.name}</h3>
          
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <Clock className="h-4 w-4 mr-2" />
            {service.duration} minutos
          </div>
          
          {service.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{service.description}</p>
          )}
          
          <div className="flex justify-between items-center mt-4">
            {service.show_price_on_website ? (
              <p className="font-bold text-lg">{formatPrice(service.price)}</p>
            ) : (
              <p className="text-sm text-gray-500">Consulte o preço</p>
            )}
            
            <Button 
              size="sm"
              className="bg-[#3475B8] hover:bg-[#2C64A0]"
              onClick={(e) => {
                e.stopPropagation();
                handleServiceClick(service);
              }}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Comprar
            </Button>
          </div>
        </div>
      </div>
    ));
  };
  
  return (
    <div className="space-y-6">
      {/* Mensagem de status do pagamento */}
      {paymentMessage && (
        <div className={`p-4 rounded-lg mb-4 ${paymentStatus === 'success' ? 'bg-green-100 text-green-800' : paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          <p className="font-medium">{paymentMessage}</p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-[#294380]">Serviços Disponíveis</h2>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderServiceCards()}
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-[#3475B8] hover:text-[#2C64A0] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={currentPage === page ? "bg-[#3475B8] text-white" : "text-[#3475B8] hover:text-[#2C64A0] transition-colors"}
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="text-[#3475B8] hover:text-[#2C64A0] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Modal de detalhes do serviço */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-md">
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedService.name}</DialogTitle>
              </DialogHeader>
              
              {selectedService.image_url && (
                <div className="h-48 overflow-hidden rounded-md">
                  <img 
                    src={selectedService.image_url} 
                    alt={selectedService.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                    {selectedService.category}
                  </span>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {selectedService.duration} minutos
                  </div>
                </div>
                
                {selectedService.description && (
                  <p className="text-sm text-gray-600">{selectedService.description}</p>
                )}
                
                {selectedService.show_price_on_website && (
                  <p className="font-bold text-xl">{formatPrice(selectedService.price)}</p>
                )}
                
                {paymentUrl ? (
                  <div className="space-y-4">
                    <p className="text-sm text-green-600">Link de pagamento gerado com sucesso!</p>
                    <div className="flex flex-col space-y-2">
                      <Button 
                        onClick={() => window.open(paymentUrl, '_blank')}
                        className="bg-[#3475B8] hover:bg-[#2C64A0]"
                      >
                        Pagar com Mercado Pago
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setPaymentUrl(null);
                          setShowServiceDialog(false);
                        }}
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowServiceDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleBuyService}
                      className="bg-[#3475B8] hover:bg-[#2C64A0]"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Comprar Agora
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
