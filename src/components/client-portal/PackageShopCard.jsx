import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, ShoppingCart, Clock, Info, Loader2, Package as PackageIcon, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import MercadoPagoService from "@/services/mercadoPagoService";
import { PendingService } from "@/api/entities";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

export default function PackageShopCard({ clientId }) {
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPromotionsOnly, setShowPromotionsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [cart, setCart] = useState([]);
  
  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(filteredPackages.length / ITEMS_PER_PAGE);
  const cartTotal = cart.reduce((total, item) => total + item.total_price, 0);
  
  // Verificar parâmetros de URL para processamento de retorno de pagamento
  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const reference = urlParams.get('ref');
        
        if (status && reference) {
          setPaymentStatus(status);
          
          const pendingServicesRef = collection(db, 'pending_services');
          const pendingQuery = query(pendingServicesRef, where("external_reference", "==", reference));
          const pendingSnapshot = await getDocs(pendingQuery);
          
          if (!pendingSnapshot.empty) {
            const pendingServiceDoc = pendingSnapshot.docs[0];
            
            await PendingService.update(pendingServiceDoc.id, {
              payment_status: status,
              updated_at: new Date()
            });
            
            if (status === 'success') {
              setPaymentMessage('Pagamento aprovado! Seu pacote foi adquirido com sucesso.');
            } else if (status === 'pending') {
              setPaymentMessage('Pagamento pendente. Assim que for confirmado, seu pacote será ativado.');
            } else if (status === 'failure') {
              setPaymentMessage('Houve um problema com o pagamento. Por favor, tente novamente.');
            }
            
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
  
  // Carregar pacotes disponíveis para compra
  useEffect(() => {
    const loadPackages = async () => {
      try {
        setLoading(true);
        
        // Inicializar o Mercado Pago
        const companySettingsRef = doc(db, 'company_settings', 'nYF20n1wgCetPDsO8gEB');
        const companySettingsDoc = await getDoc(companySettingsRef);
        
        if (companySettingsDoc.exists()) {
          const companySettings = companySettingsDoc.data();
          if (companySettings.payment_settings) {
            MercadoPagoService.initialize(companySettings.payment_settings);
          }
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
        
        // Carregar pacotes disponíveis na loja
        const packagesRef = collection(db, 'packages');
        const packagesQuery = query(packagesRef, where("available_in_shop", "==", true));
        const snapshot = await getDocs(packagesQuery);
        
        const allPackages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Separar promoções e pacotes normais
        const promotions = allPackages.filter(p => p.is_promotion === true);
        const regular = allPackages.filter(p => p.is_promotion !== true);
        
        // Ordenar alfabeticamente cada grupo
        const sortAlphabetically = (a, b) => 
          (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
        
        promotions.sort(sortAlphabetically);
        regular.sort(sortAlphabetically);
        
        // Juntar: promoções primeiro, depois normais
        const packagesData = [...promotions, ...regular];
        
        setPackages(packagesData);
        setFilteredPackages(packagesData);
      } catch (error) {
        console.error("Erro ao carregar pacotes:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPackages();
  }, [clientId]);
  
  // Filtrar pacotes quando busca ou promoção mudarem
  useEffect(() => {
    let filtered = [...packages];
    
    // Filtro de busca
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(pkg => 
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro de promoção
    if (showPromotionsOnly) {
      filtered = filtered.filter(pkg => pkg.is_promotion === true);
    }
    
    setFilteredPackages(filtered);
    setCurrentPage(1);
  }, [searchTerm, showPromotionsOnly, packages]);
  
  // Paginação
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedPackages = filteredPackages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
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
  
  // Calcular total de sessões do pacote
  const calculateTotalSessions = (services) => {
    if (!services || !Array.isArray(services)) return 0;
    return services.reduce((total, service) => total + (service.quantity || 0), 0);
  };
  
  // Abrir modal de detalhes do pacote
  const handlePackageClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowPackageDialog(true);
  };

  // Adicionar ao carrinho
  const handleAddToCart = (pkg) => {
    const existingItem = cart.find(item => item.id === pkg.id);
    
    if (existingItem) {
      toast({
        title: "Pacote já está no carrinho",
        description: `${pkg.name} já foi adicionado ao carrinho.`,
        variant: "default"
      });
      return;
    }
    
    setCart([...cart, pkg]);
    
    toast({
      title: "Pacote adicionado ao carrinho",
      description: `${pkg.name} adicionado ao carrinho.`,
      duration: 3000
    });
  };

  // Remover do carrinho
  const handleRemoveFromCart = (packageId) => {
    setCart(cart.filter(item => item.id !== packageId));
  };

  // Processar checkout
  const handleCheckout = async () => {
    try {
      if (cart.length === 0) {
        toast({
          title: "Carrinho vazio",
          description: "Adicione pacotes ao carrinho antes de finalizar a compra.",
          variant: "destructive"
        });
        return;
      }

      console.log('Iniciando processo de pagamento para carrinho com', cart.length, 'pacotes');
      
      // Buscar configurações de pagamento
      const companySettingsRef = doc(db, 'company_settings', 'nYF20n1wgCetPDsO8gEB');
      const companySettingsDoc = await getDoc(companySettingsRef);
      
      if (!companySettingsDoc.exists()) {
        throw new Error('Configurações de pagamento não encontradas');
      }

      const companySettings = companySettingsDoc.data();
      const paymentSettings = companySettings.payment_settings;

      if (!paymentSettings || !paymentSettings.mercadopago_enabled) {
        throw new Error('Mercado Pago não está habilitado');
      }

      // Inicializar serviço Mercado Pago
      MercadoPagoService.initialize(paymentSettings);
      
      // Preparar dados para serviços pendentes
      const transactionId = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Criar registros de serviços pendentes
      const pendingServiceIds = [];
      for (const pkg of cart) {
        const pendingService = await PendingService.create({
          client_id: clientId,
          type: 'pacote',
          package_id: pkg.id,
          package_name: pkg.name,
          amount: pkg.total_price,
          status: 'pendente',
          external_reference: transactionId,
          created_at: new Date().toISOString()
        });
        pendingServiceIds.push(pendingService.id);
      }
      
      // Preparar dados para criação do link de pagamento
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      
      const paymentData = {
        items: cart.map(pkg => ({
          id: pkg.id,
          title: pkg.name,
          description: pkg.description || `Pacote com ${calculateTotalSessions(pkg.services)} sessões`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: pkg.total_price
        })),
        plan_name: `Compra de Pacotes (${cart.length} ${cart.length === 1 ? 'pacote' : 'pacotes'})`,
        amount: cartTotal,
        payer_email: clientData?.email || 'cliente@email.com',
        external_reference: transactionId,
        success_url: `${baseUrl}?status=success&ref=${transactionId}`,
        failure_url: `${baseUrl}?status=failure&ref=${transactionId}`,
        pending_url: `${baseUrl}?status=pending&ref=${transactionId}`
      };
      
      // Criar link de pagamento
      const paymentResponse = await MercadoPagoService.createPaymentLink(paymentData);
      
      if (paymentResponse && paymentResponse.url) {
        // Atualizar serviços pendentes com ID da preferência
        if (paymentResponse.preference_id) {
          for (const id of pendingServiceIds) {
            const docRef = doc(db, 'pending_services', id);
            await updateDoc(docRef, {
              preference_id: paymentResponse.preference_id
            });
          }
        }
        
        // Fechar modal do carrinho
        setShowCartDialog(false);
        
        // Redirecionar para página de pagamento do Mercado Pago
        window.location.href = paymentResponse.url;
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Renderizar cards de pacotes
  const renderPackageCards = () => {
    if (loading) {
      return (
        <div className="col-span-3 flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      );
    }

    if (displayedPackages.length === 0) {
      return (
        <div className="col-span-3 text-center py-20">
          <PackageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || showPromotionsOnly ? 'Nenhum pacote encontrado' : 'Nenhum pacote disponível'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || showPromotionsOnly 
              ? 'Tente ajustar os filtros de busca' 
              : 'Não há pacotes disponíveis para compra no momento'}
          </p>
        </div>
      );
    }
    
    return displayedPackages.map((pkg) => (
        <div 
          key={pkg.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
          {pkg.image_url ? (
            <div className="h-40 overflow-hidden">
              <img 
                src={pkg.image_url} 
                alt={pkg.name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <PackageIcon className="h-16 w-16 text-white opacity-50" />
            </div>
          )}
          
          <div className="p-4">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-medium text-lg">{pkg.name}</h3>
              {pkg.is_promotion && (
                <Badge className="bg-red-500 text-white text-xs">
                  🔥 PROMOÇÃO
                </Badge>
              )}
            </div>
            
            {pkg.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
            )}
            
            <div className="flex justify-between items-center mb-2">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                {calculateTotalSessions(pkg.services)} sessões
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {pkg.validity_days} dias
              </div>
            </div>
            
            <p className="font-bold text-xl mb-2 text-purple-600">{formatPrice(pkg.total_price)}</p>
            
            <div className="flex justify-between items-center mt-4 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePackageClick(pkg)}
                className="flex-1"
              >
                Detalhes
              </Button>
              
              <Button 
                onClick={() => handleAddToCart(pkg)}
                className="bg-[#3475B8] hover:bg-[#2C64A0] flex-1"
                size="sm"
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
        <h2 className="text-2xl font-semibold text-[#294380]">Pacotes Disponíveis</h2>
        
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
        {/* Campo de Busca */}
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar pacotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        {/* Filtros */}
        <div className="mb-6 space-y-3">
          {/* Filtro de Promoção */}
          <div className="flex items-center gap-2">
            <Button
              variant={showPromotionsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPromotionsOnly(!showPromotionsOnly)}
              className={showPromotionsOnly ? "bg-red-500 hover:bg-red-600 text-white" : ""}
            >
              🔥 {showPromotionsOnly ? "Mostrando Promoções" : "Ver Promoções"}
            </Button>
            
            {showPromotionsOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromotionsOnly(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
          
          {/* Contador de Resultados */}
          <div className="text-sm text-gray-600">
            {filteredPackages.length} {filteredPackages.length === 1 ? 'pacote encontrado' : 'pacotes encontrados'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderPackageCards()}
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
      
      {/* Modal de detalhes do pacote */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-md">
          {selectedPackage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPackage.name}</DialogTitle>
              </DialogHeader>
              
              {selectedPackage.image_url && (
                <div className="h-48 overflow-hidden rounded-md">
                  <img 
                    src={selectedPackage.image_url} 
                    alt={selectedPackage.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                    {calculateTotalSessions(selectedPackage.services)} sessões
                  </span>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    Validade: {selectedPackage.validity_days} dias
                  </div>
                </div>
                
                {selectedPackage.description && (
                  <p className="text-sm text-gray-600">{selectedPackage.description}</p>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Serviços incluídos:</h4>
                  <ul className="space-y-1">
                    {selectedPackage.services && selectedPackage.services.map((service, index) => (
                      <li key={index} className="text-sm flex justify-between">
                        <span>{service.name || `Serviço ${index + 1}`}</span>
                        <span className="font-medium">{service.quantity}x</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Valor total:</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {formatPrice(selectedPackage.total_price)}
                    </span>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    handleAddToCart(selectedPackage);
                    setShowPackageDialog(false);
                  }}
                  className="bg-[#3475B8] hover:bg-[#2C64A0]"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Adicionar ao Carrinho
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal do Carrinho */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carrinho de Compras</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Seu carrinho está vazio</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{pkg.name}</h4>
                        <p className="text-sm text-gray-600">
                          {calculateTotalSessions(pkg.services)} sessões • {pkg.validity_days} dias
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-purple-600">
                          {formatPrice(pkg.total_price)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromCart(pkg.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-purple-600">{formatPrice(cartTotal)}</span>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCartDialog(false)}>
              Continuar Comprando
            </Button>
            <Button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="bg-[#3475B8] hover:bg-[#2C64A0]"
            >
              Finalizar Compra ({formatPrice(cartTotal)})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
