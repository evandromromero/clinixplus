import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Client, Sale, FinancialTransaction, Product, Service, 
  Employee, PaymentMethod, Package, ClientPackage, 
  GiftCard, SubscriptionPlan, ClientSubscription, 
  UnfinishedSale, Inventory, PendingService 
} from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  ShoppingBag,
  Package as PackageIcon,
  Scissors,
  X,
  Plus,
  Check,
  Gift,
  Clock,
  RefreshCw,
  Printer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { AlertTriangle } from "lucide-react";
import RateLimitHandler from '@/components/RateLimitHandler';
import html2pdf from 'html2pdf.js';

export default function SalesRegister() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cashIsOpen, setCashIsOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([
    { methodId: "", amount: 0, installments: 1 }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [saleType, setSaleType] = useState("produto");
  const [selectedClient, setSelectedClient] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [salesEmployee, setSalesEmployee] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [saleReceipt, setSaleReceipt] = useState(null);
  const [unfinishedSaleId, setUnfinishedSaleId] = useState(null);
  
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [finalDiscountType, setFinalDiscountType] = useState("percentage");
  
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const fetchWithRetry = async (fn, maxRetries = 3, initialDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        console.error(`[SalesRegister] Erro na tentativa ${i + 1}/${maxRetries}:`, error);
        if (i < maxRetries - 1) {
          const delayMs = initialDelay * Math.pow(2, i);
          console.log(`[SalesRegister] Tentando novamente em ${delayMs}ms...`);
          await delay(delayMs);
        } else {
          throw error;
        }
      }
    }
  };
  
  const loadDataWithRetry = async (maxRetries = 3) => {
    try {
      setIsLoading(true);
      
      // Usa Promise.allSettled para permitir que as chamadas sejam feitas em paralelo
      // e não falhar completamente se apenas algumas APIs falharem
      const results = await Promise.allSettled([
        fetchWithRetry(() => Client.list(), maxRetries),
        fetchWithRetry(() => Product.list(), maxRetries),
        fetchWithRetry(() => Service.list(), maxRetries),
        fetchWithRetry(() => Package.list(), maxRetries),
        fetchWithRetry(() => GiftCard.list(), maxRetries),
        fetchWithRetry(() => SubscriptionPlan.list(), maxRetries),
        fetchWithRetry(() => Employee.list(), maxRetries),
        fetchWithRetry(() => PaymentMethod.list(), maxRetries)
      ]);
      
      // Processa os resultados
      const [
        clientsResult,
        productsResult,
        servicesResult,
        packagesResult,
        giftCardsResult,
        subscriptionPlansResult,
        employeesResult,
        paymentMethodsResult
      ] = results;
      
      // Atualiza os estados com os dados obtidos, usando arrays vazios para falhas
      setClients(clientsResult.status === 'fulfilled' ? clientsResult.value : []);
      setProducts(productsResult.status === 'fulfilled' ? productsResult.value : []);
      setServices(servicesResult.status === 'fulfilled' ? servicesResult.value : []);
      setPackages(packagesResult.status === 'fulfilled' ? packagesResult.value : []);
      setGiftCards(giftCardsResult.status === 'fulfilled' ? giftCardsResult.value : []);
      setSubscriptionPlans(subscriptionPlansResult.status === 'fulfilled' ? subscriptionPlansResult.value : []);
      setEmployees(employeesResult.status === 'fulfilled' ? employeesResult.value : []);
      setAvailablePaymentMethods(paymentMethodsResult.status === 'fulfilled' ? paymentMethodsResult.value : []);
      
      // Verifica se alguma chamada falhou
      const failedCalls = results.filter(r => r.status === 'rejected');
      if (failedCalls.length > 0) {
        console.warn(`[SalesRegister] ${failedCalls.length} chamadas falharam ao carregar dados`);
        toast({
          title: "Aviso",
          description: "Alguns dados podem estar desatualizados. Tente recarregar a página.",
          variant: "warning"
        });
      } else {
        console.log("[SalesRegister] Todos os dados foram carregados com sucesso");
      }
      
      return true;
    } catch (error) {
      console.error("[SalesRegister] Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente recarregar a página.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para buscar clientes
  const searchClients = (term) => {
    if (!term) return [];
    term = term.toLowerCase();
    return clients.filter(client => 
      client.name?.toLowerCase().includes(term) || 
      client.cpf?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  };

  // Função para pesquisar itens baseado no tipo de venda
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term) {
      setSearchResults([]);
      return;
    }

    const termLower = term.toLowerCase();
    
    let results = [];
    if (saleType === "produto") {
      results = products.filter(item => 
        item.name?.toLowerCase().includes(termLower) ||
        item.category?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "serviço") {
      results = services.filter(item => 
        item.name?.toLowerCase().includes(termLower) ||
        item.category?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "pacote") {
      results = packages.filter(item => 
        item.name?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "giftcard") {
      results = giftCards.filter(item => 
        item.code?.toLowerCase().includes(termLower) ||
        item.recipient_name?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "assinatura") {
      results = subscriptionPlans.filter(item => 
        item.name?.toLowerCase().includes(termLower)
      );
    }
    
    setSearchResults(results);
  };

  // Função para adicionar item ao carrinho
  const handleAddToCart = (item) => {
    console.log("[SalesRegister] Adicionando item ao carrinho:", item);
    const cartItem = {
      id: item.id,
      item_id: item.id,
      name: item.name,
      type: saleType,
      price: parseFloat(item.price),
      quantity: 1,
      discount: 0,
      unit_price: parseFloat(item.price)
    };
    
    console.log("[SalesRegister] Item formatado para o carrinho:", cartItem);
    setCartItems([...cartItems, cartItem]);
    setSearchTerm("");
    setSearchResults([]);
  };

  // Função para remover item do carrinho
  const handleRemoveFromCart = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Função para atualizar quantidade
  const handleQuantityChange = (index, value) => {
    const newCartItems = [...cartItems];
    newCartItems[index] = {
      ...newCartItems[index],
      quantity: value
    };
    setCartItems(newCartItems);
  };

  // Função para atualizar desconto
  const handleDiscountChange = (index, value) => {
    const newCartItems = [...cartItems];
    newCartItems[index] = {
      ...newCartItems[index],
      discount: value
    };
    setCartItems(newCartItems);
  };

  // Função para calcular o subtotal de um item
  const getSubtotal = (item) => {
    const itemTotal = item.price * item.quantity;
    const discountAmount = itemTotal * (item.discount / 100);
    return itemTotal - discountAmount;
  };

  // Função para adicionar um método de pagamento
  const addPaymentMethod = () => {
    // Verifica se ainda existem métodos disponíveis para adicionar
    if (paymentMethods.length >= availablePaymentMethods.length) {
      return;
    }
    
    // Encontra um método de pagamento ainda não utilizado
    const usedMethodIds = paymentMethods.map(pm => pm.methodId);
    const availableMethod = availablePaymentMethods.find(m => !usedMethodIds.includes(m.id));
    
    if (availableMethod) {
      // Se for distribuir valores, calcula o valor restante
      const totalCart = calculateCartTotal();
      const totalPaid = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
      const remaining = Math.max(0, totalCart - totalPaid);
      
      setPaymentMethods([...paymentMethods, {
        methodId: availableMethod.id,
        amount: remaining,
        installments: 1
      }]);
    }
  };

  // Função para remover um método de pagamento
  const removePaymentMethod = (index) => {
    if (paymentMethods.length <= 1) return;
    
    const removedAmount = paymentMethods[index].amount;
    const updatedPaymentMethods = [...paymentMethods];
    updatedPaymentMethods.splice(index, 1);
    
    // Redistribui o valor removido para o primeiro método
    if (removedAmount > 0 && updatedPaymentMethods.length > 0) {
      updatedPaymentMethods[0].amount += removedAmount;
    }
    
    setPaymentMethods(updatedPaymentMethods);
  };

  // Função para calcular o total do carrinho
  const calculateCartTotal = () => {
    const subtotal = cartItems.reduce((total, item) => {
      return total + getSubtotal(item);
    }, 0);
    
    let finalDiscountValue = 0;
    if (finalDiscount > 0) {
      if (finalDiscountType === "percentage") {
        finalDiscountValue = subtotal * (finalDiscount / 100);
      } else {
        finalDiscountValue = finalDiscount;
      }
    }
    
    return Math.max(0, subtotal - finalDiscountValue);
  };

  // Função para obter o número máximo de parcelas
  const getMaxInstallments = (methodId) => {
    const method = availablePaymentMethods.find(m => m.id === methodId);
    return method?.allowsInstallments ? (method.maxInstallments || 12) : 1;
  };

  // Função para obter a taxa de juros por parcela
  const getInterestRate = (methodId, installments) => {
    const method = availablePaymentMethods.find(m => m.id === methodId);
    if (!method?.allowsInstallments || installments <= 1) return 0;
    
    // Busca a taxa de juros nas configurações do método de pagamento
    if (method.fees && Array.isArray(method.fees)) {
      const fee = method.fees.find(f => 
        installments >= f.installmentRange?.min && 
        installments <= f.installmentRange?.max
      );
      
      return fee?.feePercentage || method.interestRate || 0;
    }
    
    return method.interestRate || 0;
  };

  // Função para renderizar a seção de métodos de pagamento
  const renderPaymentMethodsSection = () => {
    // Esta função está vazia porque o conteúdo já está no JSX principal
    return null;
  };

  // Função para cancelar a venda
  const handleCancel = () => {
    if (cartItems.length === 0) {
      navigate(createPageUrl('Dashboard'));
      return;
    }
    
    if (confirm("Tem certeza que deseja cancelar esta venda? Todos os itens serão perdidos.")) {
      setCartItems([]);
      setSelectedClient(null);
      setSalesEmployee("");
      setSearchTerm("");
      setSearchResults([]);
      setPaymentMethods([{ methodId: "", amount: 0, installments: 1 }]);
      setFinalDiscount(0);
      setFinalDiscountType("percentage");
      
      navigate(createPageUrl('Dashboard'));
    }
  };

  // Função para finalizar a venda
  const handleFinishSale = () => {
    // Validações
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para continuar",
        variant: "destructive"
      });
      return;
    }
    
    if (cartItems.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao carrinho",
        variant: "destructive"
      });
      return;
    }
    
    if (!salesEmployee) {
      toast({
        title: "Erro",
        description: "Selecione um vendedor para continuar",
        variant: "destructive"
      });
      return;
    }
    
    const totalCart = calculateCartTotal();
    const totalPaid = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
    
    if (Math.abs(totalPaid - totalCart) > 0.01) {
      toast({
        title: "Erro",
        description: `O valor total pago (${formatCurrency(totalPaid)}) não corresponde ao valor total da venda (${formatCurrency(totalCart)})`,
        variant: "destructive"
      });
      return;
    }
    
    if (paymentMethods.some(method => !method.methodId)) {
      toast({
        title: "Erro",
        description: "Selecione um método de pagamento válido para cada forma de pagamento",
        variant: "destructive"
      });
      return;
    }
    
    // Abre o diálogo de confirmação
    setShowConfirmDialog(true);
  };

  // Função para confirmar a venda
  const confirmSale = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se o caixa ainda está aberto
      const isCashOpen = await checkCashRegister();
      if (!isCashOpen) {
        return; // checkCashRegister já mostra o toast e redireciona
      }
      
      // Validações
      if (!selectedClient?.id) {
        toast({
          title: "Erro",
          description: "Selecione um cliente para a venda",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!salesEmployee) {
        toast({
          title: "Erro",
          description: "Selecione um vendedor para a venda",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!cartItems.length) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item ao carrinho",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Validar itens do carrinho
      const validCartItems = cartItems.map(item => ({
        id: item.id || "",
        name: item.name || "",
        type: item.type || saleType,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || parseFloat(item.price) || 0
      }));
      
      // Criar objeto de venda
      const saleData = {
        client_id: selectedClient.id,
        employee_id: salesEmployee,
        type: saleType || "produto",
        items: validCartItems,
        total_amount: calculateCartTotal(),
        final_discount: parseFloat(finalDiscount) || 0,
        final_discount_type: finalDiscountType || "percentage",
        payment_methods: paymentMethods.map(pm => ({
          method_id: pm.methodId || "",
          amount: parseFloat(pm.amount) || 0,
          installments: parseInt(pm.installments) || 1
        })),
        installments: paymentMethods.reduce((total, pm) => total + (pm.installments > 1 ? parseInt(pm.installments) : 0), 0),
        status: "pago",
        date: new Date().toISOString(),
        notes: ""
      };
      
      // Salvar a venda no banco de dados
      const createdSale = await Sale.create(saleData);

      // Se veio de uma venda não finalizada, atualizar o status
      if (unfinishedSaleId) {
        console.log('Atualizando venda não finalizada:', unfinishedSaleId);
        await UnfinishedSale.update(unfinishedSaleId, {
          status: 'concluida',
          sale_id: createdSale.id,
          date_completed: new Date().toISOString()
        });
      }
      
      // Criar transações financeiras para cada método de pagamento
      for (const payment of paymentMethods) {
        if (!payment.methodId || !payment.amount) continue;
        
        const paymentMethod = availablePaymentMethods.find(m => m.id === payment.methodId);
        const isPaid = !paymentMethod?.name?.toLowerCase().includes("crédito");
        
        // Criar transação financeira
        await FinancialTransaction.create({
          type: "receita",
          category: "venda",
          description: `Venda #${createdSale.id} - ${saleType}`,
          amount: parseFloat(payment.amount) || 0,
          payment_method: payment.methodId,
          status: isPaid ? "pago" : "pendente",
          due_date: new Date().toISOString(),
          payment_date: isPaid ? new Date().toISOString() : null,
          sale_id: createdSale.id,
          client_id: selectedClient.id,
          employee_id: salesEmployee,
          notes: ""
        });
      }
      
      // Criar serviços pendentes para cada serviço vendido
      for (const item of cartItems) {
        if (item.type === "serviço") {
          console.log("[SalesRegister] Processando serviço para criar pendente:", item);
          
          const serviceId = item.id || item.item_id;
          if (!serviceId) {
            console.error("[SalesRegister] Serviço sem ID:", item);
            continue;
          }

          try {
            const pendingService = await PendingService.create({
              client_id: selectedClient.id,
              service_id: serviceId,
              sale_id: createdSale.id,
              quantity: parseInt(item.quantity) || 1,
              status: "pendente",
              created_date: new Date().toISOString(),
              expiration_date: null,
              notes: `Serviço vendido em ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`
            });
            console.log("[SalesRegister] Serviço pendente criado:", pendingService);
          } catch (error) {
            console.error("[SalesRegister] Erro ao criar serviço pendente:", error);
            throw error;
          }
        }
      }
      
      // Limpar o estado e manter na página de vendas
      setCartItems([]);
      setSelectedClient(null);
      setSalesEmployee("");
      setPaymentMethods([{ methodId: "", amount: 0, installments: 1 }]);
      setFinalDiscount(0);
      setFinalDiscountType("percentage");
      setShowConfirmDialog(false);
      
      // Gerar comprovante de venda
      const saleReceiptData = {
        sale_id: createdSale.id,
        client_name: selectedClient.name,
        client_cpf: selectedClient.cpf,
        sale_date: new Date().toISOString(),
        sale_total: calculateCartTotal(),
        payment_methods: paymentMethods.map(pm => ({
          method_name: availablePaymentMethods.find(m => m.id === pm.methodId)?.name || 'Método não selecionado',
          amount: pm.amount,
          installments: pm.installments
        })),
        items: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: getSubtotal(item)
        }))
      };
      setSaleReceipt(saleReceiptData);
      setShowReceiptDialog(true);
      
      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!",
        variant: "success"
      });
      
      // Recarregar os dados
      await loadDataWithRetry();
    } catch (error) {
      console.error("[SalesRegister] Erro ao confirmar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar a venda. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar se o caixa está aberto
  const checkCashRegister = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const transactions = await FinancialTransaction.list();
      const cashOpening = transactions.find(t => 
        t.category === "abertura_caixa" && 
        t.payment_date.split('T')[0] === today
      );

      if (!cashOpening) {
        toast({
          title: "Aviso",
          description: "O caixa precisa ser aberto antes de realizar vendas",
          variant: "warning"
        });
        navigate(createPageUrl('CashRegister'));
        return false;
      }

      setCashIsOpen(true);
      return true;
    } catch (error) {
      console.error('Erro ao verificar caixa:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar status do caixa",
        variant: "destructive"
      });
      return false;
    }
  };

  // Função para carregar dados da URL
  useEffect(() => {
    const loadUrlData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const clientId = params.get('client_id');
        const type = params.get('type');
        const amount = params.get('amount');
        const clientPackageId = params.get('client_package_id');
        const unfinishedSaleId = params.get('unfinished_sale_id');

        if (type) {
          setSaleType(type);
        }

        if (clientId) {
          const client = await Client.get(clientId);
          if (client) {
            setSelectedClient(client);
            setShowClientSearch(false);
          }
        }

        if (amount && clientPackageId) {
          const packageData = await ClientPackage.get(clientPackageId);
          if (packageData) {
            // Busca o pacote original para ter os detalhes completos
            const originalPackage = await Package.get(packageData.package_id);
            
            const cartItem = {
              item_id: packageData.id,
              type: 'pacote',
              name: originalPackage?.name || packageData.package_snapshot?.name || 'Pacote',
              quantity: 1,
              price: parseFloat(amount),
              discount: 0
            };
            setCartItems([cartItem]);

            // Atualiza o método de pagamento com o valor do pacote
            setPaymentMethods([{
              methodId: "",
              amount: parseFloat(amount),
              installments: 1
            }]);
          }
        }

        if (unfinishedSaleId) {
          setUnfinishedSaleId(unfinishedSaleId);
        }
      } catch (error) {
        console.error('Erro ao carregar dados da URL:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da venda",
          variant: "destructive"
        });
      }
    };

    loadUrlData();
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Primeiro verifica se o caixa está aberto
        const isCashOpen = await checkCashRegister();
        if (!isCashOpen) {
          return; // Se o caixa não estiver aberto, não carrega os dados
        }
        
        // Se o caixa estiver aberto, carrega os dados
        await loadDataWithRetry();
      } catch (error) {
        console.error("[SalesRegister] Erro na inicialização:", error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar o registro de vendas",
          variant: "destructive"
        });
      }
    };

    initializeData();
  }, []);

  // Renderização condicional para caixa fechado
  if (!cashIsOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertTriangle className="w-12 h-12 text-orange-500" />
              <h2 className="text-xl font-semibold text-orange-700">
                O caixa precisa ser aberto
              </h2>
              <p className="text-orange-600">
                Para realizar vendas, é necessário que o caixa do dia esteja aberto.
              </p>
              <Button 
                onClick={() => navigate(createPageUrl('CashRegister'))}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Ir para o Caixa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Registrar Venda</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Label className="mb-2 block">Cliente</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar cliente por nome ou CPF"
                      value={selectedClient ? selectedClient.name : searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowClientSearch(true);
                        if (!selectedClient) {
                          const results = searchClients(e.target.value);
                          setSearchResults(results);
                        }
                      }}
                      onClick={() => {
                        if (selectedClient) {
                          setSelectedClient(null);
                          setSearchTerm("");
                        } else {
                          setShowClientSearch(true);
                        }
                      }}
                    />
                    {selectedClient && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          setSelectedClient(null);
                          setSearchTerm("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {showClientSearch && searchTerm && !selectedClient && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                      {searchResults.length > 0 ? (
                        searchResults.map(client => (
                          <div
                            key={client.id}
                            className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedClient(client);
                              setSearchTerm(client.name);
                              setShowClientSearch(false);
                              setSearchResults([]);
                            }}
                          >
                            <div className="font-medium">{client.name}</div>
                            {client.cpf && (
                              <div className="text-sm text-gray-500">CPF: {client.cpf}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500">
                          Nenhum cliente encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">Vendedor</Label>
                  <Select
                    value={salesEmployee}
                    onValueChange={setSalesEmployee}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Tabs defaultValue={saleType} onValueChange={setSaleType}>
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="produto">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Produtos
                    </TabsTrigger>
                    <TabsTrigger value="serviço">
                      <Scissors className="w-4 h-4 mr-2" />
                      Serviços
                    </TabsTrigger>
                    <TabsTrigger value="pacote">
                      <PackageIcon className="w-4 h-4 mr-2" />
                      Pacotes
                    </TabsTrigger>
                    <TabsTrigger value="giftcard">
                      <Gift className="w-4 h-4 mr-2" />
                      Gift Cards
                    </TabsTrigger>
                    <TabsTrigger value="assinatura">
                      <Clock className="w-4 h-4 mr-2" />
                      Assinaturas
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="pt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder={`Buscar ${saleType}...`}
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-2 border rounded-md shadow-sm">
                        <div className="max-h-60 overflow-y-auto">
                          {searchResults.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center"
                              onClick={() => handleAddToCart(item)}
                            >
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">
                                  {saleType === "pacote" 
                                    ? formatCurrency(item.total_price) 
                                    : saleType === "giftcard" || saleType === "assinatura"
                                    ? formatCurrency(item.value || item.monthly_price)
                                    : formatCurrency(item.price)}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Tabs>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Itens no Carrinho</h3>
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border">
                      <ShoppingBag className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-gray-500">
                        Nenhum item adicionado
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Desconto</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                item.type === "produto" 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : item.type === "serviço"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : item.type === "pacote"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : item.type === "giftcard"
                                  ? "bg-pink-50 text-pink-700 border-pink-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }>
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                                className="w-16 text-right"
                                min={1}
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end">
                                <Input
                                  type="number"
                                  value={item.discount}
                                  onChange={(e) => handleDiscountChange(index, parseFloat(e.target.value))}
                                  className="w-16 text-right"
                                  min={0}
                                  max={100}
                                />
                                <span className="ml-1">%</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(getSubtotal(item))}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleRemoveFromCart(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </CardContent>
            {renderPaymentMethodsSection()}
          </Card>
        </div>

        <div className="md:col-span-4">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Resumo da Venda</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>
                      {formatCurrency(
                        cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descontos nos itens:</span>
                    <span className="text-red-500">
                      -{formatCurrency(
                        cartItems.reduce((total, item) => {
                          const itemTotal = item.price * item.quantity;
                          return total + (itemTotal * (item.discount / 100));
                        }, 0)
                      )}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateCartTotal())}</span>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <p className="font-medium">Formas de pagamento:</p>
                    <ul className="space-y-1">
                      {paymentMethods.map((payment, index) => {
                        const method = availablePaymentMethods.find(m => m.id === payment.methodId);
                        return (
                          <li key={index} className="flex justify-between text-sm">
                            <span>
                              {method ? method.name : 'Método não selecionado'}
                              {payment.installments > 1 ? ` (${payment.installments}x)` : ''}
                            </span>
                            <span>{formatCurrency(payment.amount)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Formas de Pagamento</h3>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={addPaymentMethod}
                    disabled={cartItems.length === 0}
                  >
                    Distribuir Valores
                  </Button>
                </div>
                
                {paymentMethods.map((payment, index) => (
                  <div key={index} className="space-y-3 p-3 border rounded-md bg-gray-50">
                    <div className="flex justify-between items-center">
                      <Select
                        value={payment.methodId}
                        onValueChange={(value) => {
                          const newMethods = [...paymentMethods];
                          newMethods[index].methodId = value;
                          setPaymentMethods(newMethods);
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePaymentMethods.map(method => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {paymentMethods.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => removePaymentMethod(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Valor:</Label>
                        <Input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            const newMethods = [...paymentMethods];
                            newMethods[index].amount = newValue;
                            setPaymentMethods(newMethods);
                          }}
                          className="flex-1"
                          placeholder="0,00"
                        />
                      </div>
                      
                      {payment.methodId && availablePaymentMethods.find(m => m.id === payment.methodId)?.allowsInstallments && (
                        <div className="flex items-center gap-2">
                          <Label className="w-20">Parcelas:</Label>
                          <Select
                            value={String(payment.installments)}
                            onValueChange={(value) => {
                              const newMethods = [...paymentMethods];
                              newMethods[index].installments = parseInt(value);
                              setPaymentMethods(newMethods);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: getMaxInstallments(payment.methodId) }, (_, i) => i + 1).map(num => (
                                <SelectItem key={num} value={String(num)}>
                                  {num}x {num > 1 && getInterestRate(payment.methodId, num) > 0 ? 
                                  `(+${getInterestRate(payment.methodId, num)}%)` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={addPaymentMethod}
                  disabled={paymentMethods.length >= availablePaymentMethods.length}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Forma de Pagamento
                </Button>
                
                <div className="flex justify-between">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Cancelar Venda
                  </Button>
                  
                  <Button
                    onClick={handleFinishSale}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      paymentMethods.length === 0 || 
                      paymentMethods.some(pm => pm.amount <= 0) || 
                      !salesEmployee
                    }
                  >
                    Finalizar Venda
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            
            <div className="space-y-2">
              <p className="font-medium">Cliente:</p>
              <p>{selectedClient?.name}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Itens:</p>
              <ul className="space-y-1">
                {cartItems.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(getSubtotal(item))}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-3 border-t flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(calculateCartTotal())}</span>
            </div>
            
            <div className="pt-2 space-y-2">
              <p className="font-medium">Formas de pagamento:</p>
              <ul className="space-y-1">
                {paymentMethods.map((payment, index) => {
                  const method = availablePaymentMethods.find(m => m.id === payment.methodId);
                  return (
                    <li key={index} className="flex justify-between text-sm">
                      <span>
                        {method ? method.name : 'Método não selecionado'}
                        {payment.installments > 1 ? ` (${payment.installments}x)` : ''}
                      </span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmSale}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comprovante de Venda</DialogTitle>
          </DialogHeader>
          
          <div id="receipt" className="space-y-4 py-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">MAGNIFIC</h2>
              <p className="text-sm">Rua Eduardo Santos Pereira, 2221</p>
              <p className="text-sm">Campo Grande MS 79020-170</p>
              <p className="text-sm mt-2">COMPROVANTE DE VENDA</p>
              <p className="text-sm">{format(new Date(saleReceipt?.sale_date || new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Cliente:</p>
              <p>{saleReceipt?.client_name}</p>
              <p>CPF: {saleReceipt?.client_cpf}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Itens:</p>
              <ul className="space-y-1">
                {saleReceipt?.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-3 border-t flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(saleReceipt?.sale_total)}</span>
            </div>
            
            <div className="pt-2 space-y-2">
              <p className="font-medium">Formas de pagamento:</p>
              <ul className="space-y-1">
                {saleReceipt?.payment_methods.map((payment, index) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span>
                      {payment.method_name}
                      {payment.installments > 1 ? ` (${payment.installments}x)` : ''}
                    </span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                // Gerar PDF do comprovante
                const element = document.getElementById('receipt');
                const opt = {
                  margin: 10,
                  filename: `Comprovante-Venda-${saleReceipt.sale_id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                
                html2pdf().from(element).set(opt).save().then(() => {
                  toast({
                    title: "Sucesso",
                    description: "Comprovante gerado com sucesso!",
                    variant: "success"
                  });
                }).catch(error => {
                  console.error("Erro ao gerar comprovante:", error);
                  toast({
                    title: "Erro",
                    description: "Erro ao gerar comprovante. Tente novamente.",
                    variant: "destructive"
                  });
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}