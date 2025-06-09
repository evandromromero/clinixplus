import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, ShoppingCart, Clock, Info, Loader2, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where, addDoc, doc, getDoc } from "firebase/firestore";
import MercadoPagoService from "@/services/mercadoPagoService";
import { PendingService } from "@/api/entities";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

export default function ServiceShopCard({ clientId }) {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [cart, setCart] = useState([]);
  
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  
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
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, services]);
  
  // Paginação
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedServices = filteredServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
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

  // Abrir modal de seleção de quantidade
  const handleBuyService = () => {
    setQuantity(1); // Reset quantidade para 1
    setShowServiceDialog(false);
    setShowQuantityDialog(true);
  };
  
  // Adicionar serviço ao carrinho
  const addToCart = () => {
    // Verificar se o serviço já está no carrinho
    const existingItemIndex = cart.findIndex(item => item.id === selectedService.id);
    
    if (existingItemIndex !== -1) {
      // Atualizar quantidade se o serviço já estiver no carrinho
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += quantity;
      setCart(updatedCart);
    } else {
      // Adicionar novo item ao carrinho
      setCart([...cart, {
        ...selectedService,
        quantity: quantity
      }]);
    }
    
    // Fechar modal de quantidade e mostrar toast de confirmação
    setShowQuantityDialog(false);
    toast({
      title: "Serviço adicionado ao carrinho",
      description: `${quantity}x ${selectedService.name} adicionado ao carrinho.`,
      duration: 3000,
    });
  };
  
  // Remover item do carrinho
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };
  
  // Atualizar quantidade de um item no carrinho
  const updateCartItemQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    
    setCart(updatedCart);
  };
  
  // Iniciar processo de pagamento para todos os itens no carrinho
  const handleCheckout = async () => {
    try {
      setLoading(true);
      console.log('Iniciando processo de pagamento para carrinho com', cart.length, 'itens');
      
      // Verificar se temos os dados do cliente
      if (!clientData) {
        // Buscar dados do cliente
        const clientRef = doc(db, 'clients', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          console.error('Cliente não encontrado!');
          return;
        }
        
        const clientDataFromDb = clientDoc.data();
        setClientData(clientDataFromDb);
        console.log('Dados do cliente:', clientDataFromDb);
      }
      
      // Buscar configurações do Mercado Pago
      console.log('Buscando configurações de pagamento do Firestore...');
      const settingsRef = doc(db, 'company_settings', 'nYF20n1wgCetPDsO8gEB');
      const settingsDoc = await getDoc(settingsRef);
      
      if (!settingsDoc.exists()) {
        console.error('Configurações não encontradas!');
        return;
      }
      
      console.log('Documento company_settings encontrado');
      const settings = settingsDoc.data();
      
      console.log('Configurações de pagamento encontradas:', {
        sandbox: settings.mercadopago_sandbox,
        hasAccessToken: !!settings.mercadopago_access_token
      });
      
      // Inicializar o Mercado Pago
      console.log('Inicializando serviço Mercado Pago...');
      const mpInitialized = MercadoPagoService.initialize({
        mercadopago_access_token: settings.mercadopago_access_token,
        mercadopago_sandbox: settings.mercadopago_sandbox || false
      });
      
      if (!mpInitialized) {
        console.error('Falha ao inicializar Mercado Pago!');
        return;
      }
      
      console.log('Serviço Mercado Pago inicializado');
      
      // Gerar ID único para a transação
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log('Preparando dados para serviços pendentes...');
      console.log('ID de transação gerado:', transactionId);
      
      // Criar serviços pendentes no Firestore para cada item do carrinho
      const pendingServiceIds = [];
      
      for (const item of cart) {
        const pendingServiceData = {
          client_id: clientId,
          service_id: item.id,
          service_name: item.name,
          amount: item.price,
          quantity: item.quantity,
          total_amount: item.price * item.quantity,
          status: 'pending',
          created_at: new Date(),
          external_reference: transactionId
        };
        
        console.log(`Criando registro de serviço pendente para ${item.quantity}x ${item.name}`);
        const pendingServiceId = await PendingService.create(pendingServiceData);
        pendingServiceIds.push(pendingServiceId);
      }
      
      console.log('Serviços pendentes criados com IDs:', pendingServiceIds);
      
      // Preparar dados para criação do link de pagamento
      console.log('Preparando dados para criação do link de pagamento...');
      const baseUrl = window.location.origin + window.location.pathname;
      console.log('URL base para redirecionamento:', baseUrl);
      
      // Criar itens para o Mercado Pago
      const items = cart.map(item => ({
        id: item.id,
        title: item.name,
        description: item.description || item.name,
        quantity: item.quantity,
        currency_id: 'BRL',
        unit_price: item.price
      }));
      
      const paymentData = {
        items: items,
        plan_name: `Compra de Serviços (${cart.length} itens)`,
        amount: cartTotal,
        payer_email: clientData.email || 'evandromromero@gmail.com',
        external_reference: transactionId,
        success_url: `${baseUrl}?status=success&ref=${transactionId}`,
        failure_url: `${baseUrl}?status=failure&ref=${transactionId}`,
        pending_url: `${baseUrl}?status=pending&ref=${transactionId}`
      };
      
      console.log('Dados de pagamento preparados:', JSON.stringify(paymentData, null, 2));
      console.log('Chamando MercadoPagoService.createPaymentLink...');
      
      // Criar link de pagamento
      console.log('Tentando criar link de pagamento com Mercado Pago...');
      try {
        const paymentResponse = await MercadoPagoService.createPaymentLink(paymentData);
        
        if (paymentResponse && paymentResponse.url) {
          console.log('Link de pagamento criado com sucesso:', paymentResponse.url);
          setPaymentUrl(paymentResponse.url);
          
          // Atualizar serviços pendentes com ID da preferência
          if (paymentResponse.preference_id) {
            for (const id of pendingServiceIds) {
              await PendingService.update(id, {
                preference_id: paymentResponse.preference_id
              });
            }
            console.log('Serviços pendentes atualizados com preference_id:', paymentResponse.preference_id);
          }
          
          // Fechar modal do carrinho
          setShowCartDialog(false);
        } else {
          console.error('Resposta do Mercado Pago não contém URL:', paymentResponse);
        }
      } catch (paymentError) {
        console.error('Erro ao criar link de pagamento:', paymentError);
        console.error('Mensagem de erro:', paymentError.message);
        console.error('Stack trace:', paymentError.stack);
        console.error('Objeto de erro completo:', paymentError);
        
        console.error('=== ERRO AO PROCESSAR PAGAMENTO ===');
        console.error('Mensagem de erro:', paymentError.message);
        console.error('Stack trace:', paymentError.stack);
        console.error('Objeto de erro completo:', paymentError);
      }
    } catch (error) {
      console.error('Erro ao processar compra:', error);
      
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
    if (filteredServices.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-40 text-center">
          <Info className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-500">Nenhum serviço encontrado.</p>
        </div>
      );
    }
    
    // Usar as variáveis de paginação já definidas anteriormente
    const currentServices = filteredServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    return currentServices.map((service) => (
        <div 
          key={service.id} 
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
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
            <div className="h-40 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-lg">Sem imagem</span>
            </div>
          )}
          
          <div className="p-4">
            <h3 className="font-medium text-lg mb-1">{service.name}</h3>
            
            <div className="flex justify-between items-center mb-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                {service.category}
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {service.duration} minutos
              </div>
            </div>
            
            <p className="font-bold text-xl mb-2">{formatPrice(service.price)}</p>
            
            <div className="flex justify-between items-center mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleServiceClick(service)}
              >
                Detalhes
              </Button>
              
              <Button 
                onClick={() => {
                  setSelectedService(service);
                  handleBuyService();
                }}
                className="bg-[#3475B8] hover:bg-[#2C64A0]"
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
        
        {/* Botão do carrinho */}
        {cart.length > 0 && (
          <Button 
            onClick={() => setShowCartDialog(true)}
            className="bg-[#3475B8] hover:bg-[#2C64A0] flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Carrinho
            <Badge className="ml-1 bg-white text-[#3475B8]">{cart.length}</Badge>
          </Button>
        )}
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
                
                <p className="font-bold text-xl">{formatPrice(selectedService.price)}</p>
                
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
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Comprar Agora
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de seleção de quantidade */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="max-w-md">
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle>Selecione a quantidade</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selectedService.name}</h3>
                    <p className="text-sm text-gray-600">{formatPrice(selectedService.price)} cada</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-xl">{formatPrice(selectedService.price * quantity)}</span>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowQuantityDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={addToCart}
                    className="bg-[#3475B8] hover:bg-[#2C64A0]"
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal do carrinho */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seu Carrinho</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <ShoppingBag className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">Seu carrinho está vazio</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <div className="flex items-center text-sm text-gray-600">
                          <span>{formatPrice(item.price)} × {item.quantity}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-xl">{formatPrice(cartTotal)}</span>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCartDialog(false)}
                    >
                      Continuar Comprando
                    </Button>
                    <Button 
                      onClick={handleCheckout}
                      className="bg-[#3475B8] hover:bg-[#2C64A0]"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        <>Pagar Agora</>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
