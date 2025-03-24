import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Client, Sale, FinancialTransaction, Product, Service, 
  Employee, PaymentMethod, Package, ClientPackage, 
  GiftCard, SubscriptionPlan, ClientSubscription, 
  UnfinishedSale, Inventory 
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
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { AlertTriangle } from "lucide-react";
import RateLimitHandler from '@/components/RateLimitHandler';

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
  const [unfinishedSaleId, setUnfinishedSaleId] = useState(null);
  
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [finalDiscountType, setFinalDiscountType] = useState("percentage");
  
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
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

  // Função para adicionar um item ao carrinho
  const addItemToCart = (item, itemType) => {
    // Verifica se o item já está no carrinho
    const existingItemIndex = cartItems.findIndex(cartItem => 
      cartItem.item_id === item.id && cartItem.type === itemType
    );

    if (existingItemIndex !== -1) {
      // Se já existe, aumenta a quantidade
      const updatedCartItems = [...cartItems];
      updatedCartItems[existingItemIndex].quantity += 1;
      setCartItems(updatedCartItems);
    } else {
      // Se não existe, adiciona novo item
      const newCartItem = {
        item_id: item.id,
        type: itemType,
        name: item.name,
        quantity: 1,
        price: itemType === "pacote" ? item.total_price : 
               (itemType === "giftcard" ? item.value : 
               (itemType === "assinatura" ? item.monthly_price : item.price)),
        discount: 0,
        employee_id: itemType === "serviço" ? "" : undefined
      };

      setCartItems([...cartItems, newCartItem]);
    }

    // Atualiza o valor total no método de pagamento
    if (paymentMethods.length === 1 && paymentMethods[0].amount === 0) {
      const itemPrice = itemType === "pacote" ? item.total_price : 
                        (itemType === "giftcard" ? item.value : 
                        (itemType === "assinatura" ? item.monthly_price : item.price));
      const updatedPaymentMethods = [...paymentMethods];
      updatedPaymentMethods[0].amount = itemPrice;
      setPaymentMethods(updatedPaymentMethods);
    }

    // Limpa os resultados de pesquisa
    setSearchTerm("");
    setSearchResults([]);
  };

  // Função para calcular o subtotal de um item
  const getSubtotal = (item) => {
    const itemTotal = item.price * item.quantity;
    const discountAmount = itemTotal * (item.discount / 100);
    return itemTotal - discountAmount;
  };

  // Função para atualizar a quantidade de um item no carrinho
  const updateCartItemQuantity = (index, quantity) => {
    if (quantity < 1) return;
    
    const updatedCartItems = [...cartItems];
    updatedCartItems[index].quantity = quantity;
    setCartItems(updatedCartItems);
  };

  // Função para atualizar o desconto de um item no carrinho
  const updateCartItemDiscount = (index, discount) => {
    if (discount < 0 || discount > 100) return;
    
    const updatedCartItems = [...cartItems];
    updatedCartItems[index].discount = discount;
    setCartItems(updatedCartItems);
  };

  // Função para atualizar o funcionário associado a um serviço
  const updateCartItemEmployee = (index, employeeId) => {
    const updatedCartItems = [...cartItems];
    updatedCartItems[index].employee_id = employeeId;
    setCartItems(updatedCartItems);
  };

  // Função para remover um item do carrinho
  const removeFromCart = (index) => {
    const updatedCartItems = [...cartItems];
    updatedCartItems.splice(index, 1);
    setCartItems(updatedCartItems);
    
    // Se o carrinho ficar vazio, zera o valor no método de pagamento
    if (updatedCartItems.length === 0 && paymentMethods.length === 1) {
      const updatedPaymentMethods = [...paymentMethods];
      updatedPaymentMethods[0].amount = 0;
      setPaymentMethods(updatedPaymentMethods);
    }
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
    
    if (cartItems.some(item => item.type === "serviço" && !item.employee_id)) {
      toast({
        title: "Erro",
        description: "Selecione um profissional para cada serviço",
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
        status: "finalizada",
        date: new Date().toISOString(),
        notes: ""
      };
      
      // Salvar a venda no banco de dados
      const createdSale = await Sale.create(saleData);
      
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
      
      // Limpar o carrinho e fechar o diálogo
      setCartItems([]);
      setSelectedClient(null);
      setSalesEmployee("");
      setPaymentMethods([{ methodId: "", amount: 0, installments: 1 }]);
      setFinalDiscount(0);
      setFinalDiscountType("percentage");
      setShowConfirmDialog(false);
      
      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!",
        variant: "success"
      });
      
      // Redirecionar para a página de detalhes da venda
      navigate(createPageUrl("sales", createdSale.id));
    } catch (error) {
      console.error("Erro ao confirmar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar a venda. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para criar um atraso com tempo variável
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Função para carregar dados com retry e backoff exponencial
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
      
      // Processa os resultados usando dados padrão se alguma chamada falhar
      const clientsData = results[0].status === 'fulfilled' ? results[0].value : [];
      const productsData = results[1].status === 'fulfilled' ? results[1].value : [];
      const servicesData = results[2].status === 'fulfilled' ? results[2].value : [];
      const packagesData = results[3].status === 'fulfilled' ? results[3].value : [];
      const giftCardsData = results[4].status === 'fulfilled' ? results[4].value : [];
      const subscriptionPlansData = results[5].status === 'fulfilled' ? results[5].value : [];
      const employeesData = results[6].status === 'fulfilled' ? results[6].value : [];
      const paymentMethodsData = results[7].status === 'fulfilled' ? results[7].value : [];
      
      // Atualiza estados apenas com dados válidos
      if (clientsData.length > 0) setClients(clientsData);
      if (productsData.length > 0) setProducts(productsData);
      if (servicesData.length > 0) setServices(servicesData);
      if (packagesData.length > 0) setPackages(packagesData);
      if (giftCardsData.length > 0) setGiftCards(giftCardsData.filter(gc => gc.status === "ativo"));
      if (subscriptionPlansData.length > 0) setSubscriptionPlans(subscriptionPlansData.filter(sp => sp.is_active));
      if (employeesData.length > 0) setEmployees(employeesData);
      
      // Para métodos de pagamento, adiciona fallbacks para garantir que algum método esteja disponível
      let availableMethods = [];
      if (paymentMethodsData.length > 0) {
        availableMethods = paymentMethodsData.filter(pm => pm.isActive);
      } else {
        // Dados fallback caso a API falhe
        availableMethods = [
          { id: "dinheiro", name: "Dinheiro", isActive: true, type: "dinheiro", allowsInstallments: false },
          { id: "cartao_credito", name: "Cartão de Crédito", isActive: true, type: "cartao_credito", allowsInstallments: true, maxInstallments: 12 },
          { id: "cartao_debito", name: "Cartão de Débito", isActive: true, type: "cartao_debito", allowsInstallments: false },
          { id: "pix", name: "PIX", isActive: true, type: "pix", allowsInstallments: false }
        ];
      }
      
      setAvailablePaymentMethods(availableMethods);
      
      // Atualiza métodos de pagamento iniciais
      if (availableMethods.length > 0) {
        const firstActive = availableMethods[0];
        setPaymentMethods([{ 
          methodId: firstActive.id, 
          amount: 0, 
          installments: 1 
        }]);
      }
      
      // Verifica se há erros graves que precisam ser notificados ao usuário
      const failedRequests = results.filter(r => r.status === 'rejected').length;
      if (failedRequests > 0) {
        toast({
          title: "Erro",
          description: "Alguns dados não puderam ser carregados",
          variant: "destructive"
        });
      }
      
      // Inicialize dados simulados para casos extremos onde muitas chamadas falharam
      if (failedRequests > 5) {
        loadSimulatedData();
      }
      
    } catch (error) {
      console.error("Erro final ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Houve um problema ao carregar os dados",
        variant: "destructive"
      });
      loadSimulatedData();
    } finally {
      setIsLoading(false);
    }
  };

  // Função para carregar dados simulados se as APIs falharem
  const loadSimulatedData = () => {
    console.log("Carregando dados simulados...");
    
    // Clientes simulados
    if (clients.length === 0) {
      setClients([
        { id: "sim_client1", name: "Maria Silva", email: "maria@example.com", phone: "(11) 98765-4321" },
        { id: "sim_client2", name: "João Santos", email: "joao@example.com", phone: "(11) 91234-5678" }
      ]);
    }
    
    // Produtos simulados
    if (products.length === 0) {
      setProducts([
        { id: "sim_prod1", name: "Creme Facial", price: 89.90, stock: 10, category: "cosmético" },
        { id: "sim_prod2", name: "Sérum Anti-idade", price: 129.90, stock: 5, category: "cosmético" }
      ]);
    }
    
    // Serviços simulados
    if (services.length === 0) {
      setServices([
        { id: "sim_serv1", name: "Limpeza de Pele", price: 120, duration: 60, category: "facial" },
        { id: "sim_serv2", name: "Massagem Relaxante", price: 150, duration: 60, category: "massagem" }
      ]);
    }
    
    // Pacotes simulados
    if (packages.length === 0) {
      setPackages([
        { 
          id: "sim_pkg1", 
          name: "Pacote Facial Completo", 
          total_price: 450, 
          services: [{ service_id: "sim_serv1", quantity: 3 }],
          validity_days: 90
        }
      ]);
    }
    
    // Funcionários simulados
    if (employees.length === 0) {
      setEmployees([
        { id: "sim_emp1", name: "Ana Terapeuta", role: "esteticista" },
        { id: "sim_emp2", name: "Carlos Massagista", role: "massoterapeuta" }
      ]);
    }
    
    // Métodos de pagamento simulados
    if (availablePaymentMethods.length === 0) {
      const simulatedMethods = [
        { id: "dinheiro", name: "Dinheiro", isActive: true, type: "dinheiro", allowsInstallments: false },
        { id: "cartao_credito", name: "Cartão de Crédito", isActive: true, type: "cartao_credito", allowsInstallments: true, maxInstallments: 12 },
        { id: "cartao_debito", name: "Cartão de Débito", isActive: true, type: "cartao_debito", allowsInstallments: false },
        { id: "pix", name: "PIX", isActive: true, type: "pix", allowsInstallments: false }
      ];
      
      setAvailablePaymentMethods(simulatedMethods);
      setPaymentMethods([{ methodId: "dinheiro", amount: 0, installments: 1 }]);
    }
  };

  // Função para fazer chamadas de API com retry
  const fetchWithRetry = async (fetchFn, maxRetries, initialDelay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Adiciona um atraso progressivo entre as tentativas (exceto a primeira)
        if (attempt > 0) {
          const delayMs = initialDelay * Math.pow(2, attempt);
          console.log(`Tentativa ${attempt + 1}: aguardando ${delayMs}ms antes de tentar novamente...`);
          await delay(delayMs);
        }
        
        const result = await fetchFn();
        return result;
      } catch (error) {
        console.error(`Tentativa ${attempt + 1} falhou:`, error);
        lastError = error;
        
        // Verifique se é um erro de rate limit
        const isRateLimit = 
          error.message?.includes('429') || 
          error.message?.includes('Rate limit') || 
          error.toString().includes('429');
          
        if (isRateLimit) {
          // Para rate limit, adiciona um atraso extra
          await delay(2000 + (attempt * 1000));
        }
        
        // Se não for a última tentativa, continua tentando
        if (attempt < maxRetries - 1) continue;
        
        // Na última tentativa, propaga o erro
        throw error;
      }
    }
  };

  const checkCashStatus = async () => {
    try {
      // Primeiro tenta obter do localStorage
      const storedCashStatus = localStorage.getItem('cashIsOpen');
      if (storedCashStatus !== null) {
        setCashIsOpen(storedCashStatus === 'true');
      }
      
      // Depois tenta atualizar do servidor
      const data = await FinancialTransaction.filter({
        category: "abertura_caixa",
        payment_date: format(new Date(), "yyyy-MM-dd")
      });
      
      const isOpen = data && data.length > 0;
      setCashIsOpen(isOpen);
      localStorage.setItem('cashIsOpen', isOpen ? 'true' : 'false');
      
    } catch (error) {
      console.error("Error checking cash status:", error);
      // Se falhar, mantém o valor do localStorage
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

  // Função para carregar dados iniciais
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [
        clientsData,
        productsData,
        servicesData,
        packagesData,
        giftCardsData,
        subscriptionPlansData,
        employeesData,
        paymentMethodsData
      ] = await Promise.all([
        Client.list(),
        Product.list(),
        Service.list(),
        Package.list(),
        GiftCard.list(),
        SubscriptionPlan.list(),
        Employee.list(),
        PaymentMethod.list()
      ]);

      setClients(clientsData);
      setProducts(productsData);
      setServices(servicesData);
      setPackages(packagesData);
      setGiftCards(giftCardsData);
      setSubscriptionPlans(subscriptionPlansData);
      setEmployees(employeesData);
      setAvailablePaymentMethods(paymentMethodsData);

      await checkCashRegister();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados necessários",
        variant: "destructive"
      });

      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(loadData, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
                              onClick={() => addItemToCart(item, saleType)}
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
                      <p className="mt-2 text-gray-500">Nenhum item adicionado</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[220px]">Item</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preço</TableHead>
                          <TableHead className="text-right">Desconto</TableHead>
                          {cartItems.some(item => item.type === "serviço") && (
                            <TableHead>Profissional</TableHead>
                          )}
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
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
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateCartItemQuantity(index, parseInt(e.target.value))}
                                className="w-16 text-right"
                                min={1}
                              />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end">
                                <Input
                                  type="number"
                                  value={item.discount}
                                  onChange={(e) => updateCartItemDiscount(index, parseFloat(e.target.value))}
                                  className="w-16 text-right"
                                  min={0}
                                  max={100}
                                />
                                <span className="ml-1">%</span>
                              </div>
                            </TableCell>
                            {cartItems.some(item => item.type === "serviço") && (
                              <TableCell>
                                {item.type === "serviço" ? (
                                  <Select
                                    value={item.employee_id || ""}
                                    onValueChange={(value) => updateCartItemEmployee(index, value)}
                                  >
                                    <SelectTrigger>
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
                                ) : null}
                              </TableCell>
                            )}
                            <TableCell className="text-right font-medium">
                              {formatCurrency(getSubtotal(item))}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => removeFromCart(index)}
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
                    disabled={paymentMethods.length === 0 || paymentMethods.some(pm => pm.amount <= 0)}
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
      <RateLimitHandler />
    </div>
  );
}