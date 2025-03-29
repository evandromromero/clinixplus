import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, UserPlus, Edit, Trash2, Check, X, Clock, AlertTriangle, CreditCard, RefreshCw } from "lucide-react";
import { format, addMonths, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SubscriptionPlan, ClientSubscription, Client, Service, Product, FinancialTransaction, CompanySettings } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';
import MercadoPagoService from '@/services/mercadoPagoService';
import SubscriptionStatusChecker from '@/services/subscriptionStatusChecker';
import { useToast } from "@/components/ui/use-toast";

export default function Subscriptions() {
  const [activeTab, setActiveTab] = useState("planos");
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para diálogos
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  
  // Estado para o item sendo editado/criado/excluído
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Estados para o formulário de plano
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    monthly_price: 0,
    quarterly_discount: 5,
    semiannual_discount: 10,
    annual_discount: 15,
    services: [],
    products: [],
    benefits: [],
    is_active: true
  });
  
  // Estados para o formulário de assinatura
  const [subscriptionForm, setSubscriptionForm] = useState({
    client_id: "",
    plan_id: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    billing_cycle: "mensal",
    payment_method: "cartao_credito",
    payment_day: 5,
    custom_discount: 0,
    installments: 1,
    notes: ""
  });
  
  // Estado temporário para serviços/produtos selecionados
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceQty, setSelectedServiceQty] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductQty, setSelectedProductQty] = useState(1);
  const [newBenefit, setNewBenefit] = useState("");
  
  const [companySettings, setCompanySettings] = useState(null);
  
  const [loading, setLoading] = useState({});
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadData();
    loadCompanySettings();
    
    // Iniciar verificação periódica de status das assinaturas
    SubscriptionStatusChecker.startPeriodicCheck();
    
    // Limpar ao desmontar o componente
    return () => {
      SubscriptionStatusChecker.stopPeriodicCheck();
    };
  }, []);
  
  const loadData = async () => {
    try {
      const [plansData, subscriptionsData, servicesData, productsData, clientsData] = await Promise.all([
        SubscriptionPlan.list(),
        ClientSubscription.list(),
        Service.list(),
        Product.list(),
        Client.list()
      ]);
      
      setPlans(plansData);
      setSubscriptions(subscriptionsData);
      setServices(servicesData);
      setProducts(productsData);
      setClients(clientsData);
      
      // Verificar assinaturas para renovação ou vencimento
      checkSubscriptionsStatus(subscriptionsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };
  
  const loadCompanySettings = async () => {
    try {
      const settingsList = await CompanySettings.list();
      if (settingsList && settingsList.length > 0) {
        const settings = settingsList[0];
        
        // Garantir que payment_settings exista
        const loadedSettings = {
          ...settings,
          payment_settings: settings.payment_settings || {
            mercadopago_enabled: false,
            mercadopago_public_key: "",
            mercadopago_access_token: "",
            mercadopago_client_id: "",
            mercadopago_client_secret: "",
            mercadopago_sandbox: true
          }
        };
        
        setCompanySettings(loadedSettings);
        
        // Inicializar o serviço do Mercado Pago se estiver habilitado
        if (loadedSettings.payment_settings.mercadopago_enabled) {
          MercadoPagoService.initialize(loadedSettings.payment_settings);
          console.log('Mercado Pago service initialized');
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações da empresa:", error);
      toast({
        title: "Erro ao carregar configurações da empresa",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  // Verifica status das assinaturas para renovação e controle
  const checkSubscriptionsStatus = (subscriptionsData) => {
    const today = new Date();
    const needsRenewal = [];
    
    subscriptionsData.forEach(sub => {
      if (sub.status === 'ativa') {
        const endDate = new Date(sub.end_date);
        if (isBefore(endDate, today)) {
          // Assinatura vencida
          console.log("Assinatura vencida:", sub.id);
          // Aqui poderia executar ações de renovação/cobrança automaticamente
        }
      }
    });
  };
  
  // Funções para manipulação de planos
  const handleAddService = () => {
    if (!selectedServiceId) return;
    
    const existingService = planForm.services.find(s => s.service_id === selectedServiceId);
    if (existingService) {
      setPlanForm({
        ...planForm,
        services: planForm.services.map(s => 
          s.service_id === selectedServiceId 
            ? { ...s, quantity: s.quantity + selectedServiceQty }
            : s
        )
      });
    } else {
      const serviceToAdd = {
        service_id: selectedServiceId,
        quantity: selectedServiceQty
      };
      
      setPlanForm({
        ...planForm,
        services: [...planForm.services, serviceToAdd]
      });
    }
    
    setSelectedServiceId("");
    setSelectedServiceQty(1);
  };
  
  const handleRemoveService = (serviceId) => {
    setPlanForm({
      ...planForm,
      services: planForm.services.filter(s => s.service_id !== serviceId)
    });
  };
  
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    
    const existingProduct = planForm.products.find(p => p.product_id === selectedProductId);
    if (existingProduct) {
      setPlanForm({
        ...planForm,
        products: planForm.products.map(p => 
          p.product_id === selectedProductId 
            ? { ...p, quantity: p.quantity + selectedProductQty }
            : p
        )
      });
    } else {
      const productToAdd = {
        product_id: selectedProductId,
        quantity: selectedProductQty
      };
      
      setPlanForm({
        ...planForm,
        products: [...planForm.products, productToAdd]
      });
    }
    
    setSelectedProductId("");
    setSelectedProductQty(1);
  };
  
  const handleRemoveProduct = (productId) => {
    setPlanForm({
      ...planForm,
      products: planForm.products.filter(p => p.product_id !== productId)
    });
  };
  
  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    setPlanForm({
      ...planForm,
      benefits: [...planForm.benefits, newBenefit]
    });
    setNewBenefit("");
  };
  
  const handleRemoveBenefit = (index) => {
    const updatedBenefits = [...planForm.benefits];
    updatedBenefits.splice(index, 1);
    setPlanForm({
      ...planForm,
      benefits: updatedBenefits
    });
  };
  
  const handleSavePlan = async () => {
    try {
      if (currentPlan) {
        await SubscriptionPlan.update(currentPlan.id, planForm);
      } else {
        await SubscriptionPlan.create(planForm);
      }
      setShowPlanDialog(false);
      resetPlanForm();
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
    }
  };
  
  const handleEditPlan = (plan) => {
    setCurrentPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      monthly_price: plan.monthly_price,
      quarterly_discount: plan.quarterly_discount || 5,
      semiannual_discount: plan.semiannual_discount || 10,
      annual_discount: plan.annual_discount || 15,
      services: plan.services || [],
      products: plan.products || [],
      benefits: plan.benefits || [],
      is_active: plan.is_active !== false
    });
    setShowPlanDialog(true);
  };
  
  const resetPlanForm = () => {
    setCurrentPlan(null);
    setPlanForm({
      name: "",
      description: "",
      monthly_price: 0,
      quarterly_discount: 5,
      semiannual_discount: 10,
      annual_discount: 15,
      services: [],
      products: [],
      benefits: [],
      is_active: true
    });
    setSelectedServiceId("");
    setSelectedServiceQty(1);
    setSelectedProductId("");
    setSelectedProductQty(1);
    setNewBenefit("");
  };
  
  // Funções para manipulação de assinaturas
  const handleCreateSubscription = () => {
    setCurrentSubscription(null);
    setSubscriptionForm({
      client_id: "",
      plan_id: "",
      start_date: format(new Date(), 'yyyy-MM-dd'),
      billing_cycle: "mensal",
      payment_method: "cartao_credito",
      payment_day: 5,
      custom_discount: 0,
      installments: 1,
      notes: ""
    });
    setShowSubscriptionDialog(true);
  };
  
  const handleEditSubscription = (subscription) => {
    setCurrentSubscription(subscription);
    setSubscriptionForm({
      client_id: subscription.client_id,
      plan_id: subscription.plan_id,
      start_date: subscription.start_date,
      billing_cycle: subscription.billing_cycle,
      payment_method: subscription.payment_method,
      payment_day: subscription.payment_day,
      custom_discount: subscription.custom_discount || 0,
      installments: subscription.installments || 1,
      notes: subscription.notes || ""
    });
    setShowSubscriptionDialog(true);
  };
  
  const calculateEndDate = (startDate, billingCycle) => {
    const start = new Date(startDate);
    let end;
    
    switch(billingCycle) {
      case "mensal":
        end = addMonths(start, 1);
        break;
      case "trimestral":
        end = addMonths(start, 3);
        break;
      case "semestral":
        end = addMonths(start, 6);
        break;
      case "anual":
        end = addMonths(start, 12);
        break;
      default:
        end = addMonths(start, 1);
    }
    
    // Subtrair 1 dia para o término ser no último dia do período
    end = addDays(end, -1);
    return format(end, 'yyyy-MM-dd');
  };
  
  const handleSaveSubscription = async () => {
    try {
      const plan = plans.find(p => p.id === subscriptionForm.plan_id);
      if (!plan) throw new Error("Plano não encontrado");
      
      const endDate = calculateEndDate(subscriptionForm.start_date, subscriptionForm.billing_cycle);
      const nextBillingDate = subscriptionForm.start_date; // Primeira cobrança na data de início
      
      // Calcular o desconto baseado no ciclo de cobrança
      let discount = 0;
      switch(subscriptionForm.billing_cycle) {
        case "trimestral":
          discount = plan.quarterly_discount || 5;
          break;
        case "semestral":
          discount = plan.semiannual_discount || 10;
          break;
        case "anual":
          discount = plan.annual_discount || 15;
          break;
      }
      
      // Adicionar desconto personalizado
      discount += parseFloat(subscriptionForm.custom_discount) || 0;
      
      const subscriptionData = {
        ...subscriptionForm,
        end_date: endDate,
        next_billing_date: nextBillingDate,
        discount,
        status: "ativa",
        services_used: [],
        products_received: [],
        payment_history: []
      };
      
      let subscription;
      
      if (currentSubscription) {
        await ClientSubscription.update(currentSubscription.id, subscriptionData);
        subscription = { ...currentSubscription, ...subscriptionData };
      } else {
        // Criar assinatura
        subscription = await ClientSubscription.create(subscriptionData);
        
        // Calcular valor total
        const monthlyPrice = plan.monthly_price;
        let totalPrice = monthlyPrice;
        let cycles = 1;
        
        switch(subscriptionForm.billing_cycle) {
          case "trimestral":
            cycles = 3;
            break;
          case "semestral":
            cycles = 6;
            break;
          case "anual":
            cycles = 12;
            break;
        }
        
        totalPrice = monthlyPrice * cycles;
        // Aplicar desconto
        totalPrice = totalPrice * (1 - (discount / 100));
        
        // Verificar se o Mercado Pago está habilitado
        if (companySettings?.payment_settings?.mercadopago_enabled) {
          try {
            // Obter dados do cliente
            const client = clients.find(c => c.id === subscriptionForm.client_id);
            if (!client) throw new Error("Cliente não encontrado");
            
            // Criar link de pagamento no Mercado Pago
            const paymentLink = await MercadoPagoService.createPaymentLink({
              plan_name: `${plan.name} - ${subscriptionForm.billing_cycle}`,
              billing_cycle: subscriptionForm.billing_cycle,
              amount: totalPrice,
              payer_email: client.email || "cliente@exemplo.com",
              external_reference: subscription.id,
              client_id: client.id,
              success_url: `${window.location.origin}/subscriptions?status=success&subscription_id=${subscription.id}`,
              failure_url: `${window.location.origin}/subscriptions?status=failure&subscription_id=${subscription.id}`,
              pending_url: `${window.location.origin}/subscriptions?status=pending&subscription_id=${subscription.id}`
            });
            
            if (paymentLink) {
              // Atualizar a assinatura com os dados do Mercado Pago
              await ClientSubscription.update(subscription.id, {
                payment_link: paymentLink,
                mercadopago_status: "pending"
              });
              
              // Abrir o link de pagamento em uma nova aba
              window.open(paymentLink, '_blank');
            } else {
              throw new Error("Não foi possível gerar o link de pagamento");
            }
          } catch (mpError) {
            console.error("Erro ao processar pagamento no Mercado Pago:", mpError);
            toast({
              title: "Erro ao processar pagamento no Mercado Pago",
              description: mpError.message,
              variant: "destructive"
            });
            
            // Criar transação financeira mesmo com erro no Mercado Pago
            await createFinancialTransaction(subscription, plan, totalPrice);
          }
        } else {
          // Criar transação financeira sem Mercado Pago
          await createFinancialTransaction(subscription, plan, totalPrice);
        }
      }
      
      setShowSubscriptionDialog(false);
      await loadData();
      toast({
        title: "Assinatura salva com sucesso!",
        description: "",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao salvar assinatura:", error);
      toast({
        title: "Erro ao salvar assinatura",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  // Função auxiliar para criar transação financeira
  const createFinancialTransaction = async (subscription, plan, totalPrice) => {
    return await FinancialTransaction.create({
      type: "receita",
      category: "assinatura",
      description: `Assinatura ${plan.name} - ${subscription.billing_cycle}`,
      amount: totalPrice,
      payment_method: subscription.payment_method,
      status: "pendente",
      due_date: subscription.start_date,
      client_id: subscription.client_id,
      reference_id: subscription.id,
      installment_info: {
        total_installments: subscription.installments,
        installment_number: 1
      }
    });
  };
  
  const handleDeleteItem = async () => {
    try {
      if (!itemToDelete) return;
      
      if (itemToDelete.type === 'plan') {
        await SubscriptionPlan.delete(itemToDelete.id);
      } else if (itemToDelete.type === 'subscription') {
        await ClientSubscription.update(itemToDelete.id, {status: "cancelada"});
      }
      
      setShowDeleteConfirmDialog(false);
      setItemToDelete(null);
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
    }
  };
  
  // Função para processar pagamento de uma assinatura existente
  const handleProcessPayment = async (subscription) => {
    try {
      if (!companySettings?.payment_settings?.mercadopago_enabled) {
        toast({
          title: "O Mercado Pago não está configurado",
          description: "Verifique as configurações do sistema",
          variant: "destructive"
        });
        return;
      }
      
      const plan = plans.find(p => p.id === subscription.plan_id);
      if (!plan) {
        toast({
          title: "Plano não encontrado",
          description: "",
          variant: "destructive"
        });
        return;
      }
      
      const client = clients.find(c => c.id === subscription.client_id);
      if (!client) {
        toast({
          title: "Cliente não encontrado",
          description: "",
          variant: "destructive"
        });
        return;
      }
      
      // Calcular valor total
      const monthlyPrice = plan.monthly_price;
      let totalPrice = monthlyPrice;
      let cycles = 1;
      
      switch(subscription.billing_cycle) {
        case "trimestral":
          cycles = 3;
          break;
        case "semestral":
          cycles = 6;
          break;
        case "anual":
          cycles = 12;
          break;
      }
      
      totalPrice = monthlyPrice * cycles;
      // Aplicar desconto
      totalPrice = totalPrice * (1 - (subscription.discount / 100));
      
      // Criar link de pagamento no Mercado Pago
      const paymentData = await MercadoPagoService.createPaymentLink({
        plan_name: `${plan.name} - ${subscription.billing_cycle}`,
        billing_cycle: subscription.billing_cycle,
        amount: totalPrice,
        payer_email: client.email || "cliente@exemplo.com",
        external_reference: subscription.id,
        client_id: client.id,
        success_url: `${window.location.origin}/subscriptions?status=success&subscription_id=${subscription.id}`,
        failure_url: `${window.location.origin}/subscriptions?status=failure&subscription_id=${subscription.id}`,
        pending_url: `${window.location.origin}/subscriptions?status=pending&subscription_id=${subscription.id}`
      });
      
      if (paymentData && paymentData.url) {
        try {
          // Atualizar a assinatura com os dados do Mercado Pago diretamente no Firestore
          const { db } = await import('@/firebase/config');
          const { doc, updateDoc } = await import('firebase/firestore');
          
          // Tentar atualizar diretamente no Firestore primeiro
          try {
            const subscriptionRef = doc(db, 'client_subscriptions', subscription.id);
            await updateDoc(subscriptionRef, {
              payment_link: paymentData.url,
              mercadopago_status: "pending",
              mercadopago_payment_id: paymentData.payment_id || '',
              mercadopago_preference_id: paymentData.preference_id || '',
              updated_at: new Date().toISOString()
            });
            console.log('Assinatura atualizada com dados do pagamento no Firestore');
          } catch (firestoreError) {
            console.error('Erro ao atualizar assinatura no Firestore:', firestoreError);
            
            // Fallback: tentar usar ClientSubscription.update
            await ClientSubscription.update(subscription.id, {
              payment_link: paymentData.url,
              mercadopago_status: "pending",
              mercadopago_payment_id: paymentData.payment_id || '',
              mercadopago_preference_id: paymentData.preference_id || ''
            });
          }
          
          // Exibir mensagem de sucesso
          toast({
            title: "Link de pagamento gerado",
            description: "O link de pagamento foi gerado com sucesso e abrirá em uma nova aba",
            variant: "success"
          });
          
          // Abrir o link de pagamento em uma nova aba
          window.open(paymentData.url, '_blank');
          
          // Recarregar dados
          await loadData();
        } catch (updateError) {
          console.error("Erro ao atualizar assinatura:", updateError);
          
          // Mesmo com erro na atualização, abrir o link de pagamento
          window.open(paymentData.url, '_blank');
          
          toast({
            title: "Aviso",
            description: "O link de pagamento foi gerado, mas não foi possível atualizar a assinatura. O status deverá ser atualizado manualmente.",
            variant: "warning"
          });
        }
      } else {
        throw new Error("Não foi possível gerar o link de pagamento");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  // Função para verificar manualmente o status de uma assinatura
  const handleCheckSubscriptionStatus = async (subscription) => {
    try {
      setLoading({ [subscription.id]: true });
      
      const success = await SubscriptionStatusChecker.checkSubscriptionById(subscription.id);
      
      if (success) {
        toast({
          title: "Status verificado",
          description: "O status da assinatura foi verificado com sucesso",
          variant: "success"
        });
        
        // Recarregar dados
        await loadData();
      } else {
        toast({
          title: "Erro ao verificar status",
          description: "Não foi possível verificar o status da assinatura",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao verificar status da assinatura:", error);
      toast({
        title: "Erro ao verificar status",
        description: "Ocorreu um erro ao verificar o status da assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading({ [subscription.id]: false });
    }
  };
  
  // Filtrar planos e assinaturas com base na busca
  const filteredPlans = plans.filter(plan => 
    plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredSubscriptions = subscriptions.filter(sub => {
    const client = clients.find(c => c.id === sub.client_id);
    const plan = plans.find(p => p.id === sub.plan_id);
    
    return (
      (client && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (plan && plan.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
  // Funções auxiliares
  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Serviço desconhecido";
  };
  
  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : "Produto desconhecido";
  };
  
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Cliente desconhecido";
  };
  
  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : "Plano desconhecido";
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case "ativa":
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case "cancelada":
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      case "suspensa":
        return <Badge className="bg-yellow-100 text-yellow-800">Suspensa</Badge>;
      case "pendente":
        return <Badge className="bg-blue-100 text-blue-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Calcular preço por ciclo
  const calculateCyclePrice = (planId, cycle, customDiscount = 0) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return 0;
    
    const monthlyPrice = plan.monthly_price;
    let totalPrice = monthlyPrice;
    let discount = customDiscount || 0;
    
    switch(cycle) {
      case "mensal":
        totalPrice = monthlyPrice;
        break;
      case "trimestral":
        totalPrice = monthlyPrice * 3;
        discount += plan.quarterly_discount || 5;
        break;
      case "semestral":
        totalPrice = monthlyPrice * 6;
        discount += plan.semiannual_discount || 10;
        break;
      case "anual":
        totalPrice = monthlyPrice * 12;
        discount += plan.annual_discount || 15;
        break;
    }
    
    // Aplicar desconto
    return totalPrice * (1 - (discount / 100));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Assinaturas</h1>
        <div className="flex gap-2">
          {activeTab === "planos" ? (
            <Button 
              onClick={() => {
                resetPlanForm();
                setShowPlanDialog(true);
              }}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          ) : (
            <Button 
              onClick={handleCreateSubscription}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nova Assinatura
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder={activeTab === "planos" ? "Buscar planos..." : "Buscar assinaturas..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      <Tabs defaultValue="planos" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="planos">Planos de Assinatura</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas Ativas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="planos" className="space-y-4 mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Serviços e Produtos</TableHead>
                  <TableHead>Preço Mensal</TableHead>
                  <TableHead>Descontos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length > 0 ? (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {plan.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(plan.services || []).length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Serviços:</span>{" "}
                              {plan.services.slice(0, 2).map((service, idx) => (
                                <span key={idx} className="inline-block mr-1">
                                  {getServiceName(service.service_id)} ({service.quantity}x)
                                  {idx < Math.min(plan.services.length - 1, 1) ? ", " : ""}
                                </span>
                              ))}
                              {plan.services.length > 2 && " e mais..."}
                            </div>
                          )}
                          {(plan.products || []).length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Produtos:</span>{" "}
                              {plan.products.slice(0, 2).map((product, idx) => (
                                <span key={idx} className="inline-block mr-1">
                                  {getProductName(product.product_id)} ({product.quantity}x)
                                  {idx < Math.min(plan.products.length - 1, 1) ? ", " : ""}
                                </span>
                              ))}
                              {plan.products.length > 2 && " e mais..."}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(plan.monthly_price)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Trimestral: {plan.quarterly_discount || 5}%</div>
                          <div>Semestral: {plan.semiannual_discount || 10}%</div>
                          <div>Anual: {plan.annual_discount || 15}%</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => {
                            setItemToDelete({
                              id: plan.id,
                              name: plan.name,
                              type: 'plan'
                            });
                            setShowDeleteConfirmDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                      Nenhum plano encontrado. Crie um novo plano para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="assinaturas" className="space-y-4 mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Próximo Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="font-medium">{getClientName(subscription.client_id)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getPlanName(subscription.plan_id)}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(
                            calculateCyclePrice(
                              subscription.plan_id, 
                              subscription.billing_cycle,
                              subscription.custom_discount
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            Início: {format(new Date(subscription.start_date), 'dd/MM/yyyy')}
                          </div>
                          <div>
                            Término: {format(new Date(subscription.end_date), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-700">
                          {subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subscription.next_billing_date ? (
                          <div className="text-sm">
                            {format(new Date(subscription.next_billing_date), 'dd/MM/yyyy')}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Não definido</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-500"
                          onClick={() => {
                            setCurrentSubscription(subscription);
                            setSubscriptionForm({
                              ...subscription,
                              client_id: subscription.client_id,
                              plan_id: subscription.plan_id,
                              start_date: subscription.start_date,
                              billing_cycle: subscription.billing_cycle,
                              payment_method: subscription.payment_method,
                              installments: subscription.installments || 1,
                              custom_discount: subscription.custom_discount || 0
                            });
                            setShowSubscriptionDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {subscription.status !== "cancelada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              setCurrentSubscription(subscription);
                              setItemToDelete({
                                id: subscription.id,
                                name: `Assinatura de ${getClientName(subscription.client_id)}`,
                                type: 'subscription'
                              });
                              setShowDeleteConfirmDialog(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {companySettings?.payment_settings?.mercadopago_enabled && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-500"
                              onClick={() => handleProcessPayment(subscription)}
                              disabled={loading[subscription.id]}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() => handleCheckSubscriptionStatus(subscription)}
                              disabled={loading[subscription.id]}
                            >
                              {loading[subscription.id] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      Nenhuma assinatura encontrada. Crie uma nova assinatura para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Diálogo de Plano */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {currentPlan ? `Editar Plano: ${currentPlan.name}` : "Novo Plano de Assinatura"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthly_price">Preço Mensal (R$)</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  value={planForm.monthly_price}
                  onChange={(e) => setPlanForm({...planForm, monthly_price: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={planForm.description}
                onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quarterly_discount">Desconto Trimestral (%)</Label>
                <Input
                  id="quarterly_discount"
                  type="number"
                  value={planForm.quarterly_discount}
                  onChange={(e) => setPlanForm({...planForm, quarterly_discount: parseFloat(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="semiannual_discount">Desconto Semestral (%)</Label>
                <Input
                  id="semiannual_discount"
                  type="number"
                  value={planForm.semiannual_discount}
                  onChange={(e) => setPlanForm({...planForm, semiannual_discount: parseFloat(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="annual_discount">Desconto Anual (%)</Label>
                <Input
                  id="annual_discount"
                  type="number"
                  value={planForm.annual_discount}
                  onChange={(e) => setPlanForm({...planForm, annual_discount: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            
            <div>
              <Label>Serviços Incluídos</Label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                <Select 
                  value={selectedServiceId} 
                  onValueChange={setSelectedServiceId}
                  className="md:col-span-2"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {formatCurrency(service.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 md:col-span-2">
                  <Label htmlFor="service_qty" className="whitespace-nowrap">Quantidade:</Label>
                  <Input
                    id="service_qty"
                    type="number"
                    min="1"
                    value={selectedServiceQty}
                    onChange={(e) => setSelectedServiceQty(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <Button 
                  type="button" 
                  onClick={handleAddService}
                  disabled={!selectedServiceId}
                  className="md:col-span-1"
                >
                  Adicionar
                </Button>
              </div>
              
              {planForm.services.length > 0 ? (
                <div className="mt-4 border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planForm.services.map((service, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{getServiceName(service.service_id)}</TableCell>
                          <TableCell>{service.quantity}x por mês</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleRemoveService(service.service_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">
                  Nenhum serviço adicionado ao plano.
                </div>
              )}
            </div>
            
            <div>
              <Label>Produtos Incluídos</Label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                <Select 
                  value={selectedProductId} 
                  onValueChange={setSelectedProductId}
                  className="md:col-span-2"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 md:col-span-2">
                  <Label htmlFor="product_qty" className="whitespace-nowrap">Quantidade:</Label>
                  <Input
                    id="product_qty"
                    type="number"
                    min="1"
                    value={selectedProductQty}
                    onChange={(e) => setSelectedProductQty(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <Button 
                  type="button" 
                  onClick={handleAddProduct}
                  disabled={!selectedProductId}
                  className="md:col-span-1"
                >
                  Adicionar
                </Button>
              </div>
              
              {planForm.products.length > 0 ? (
                <div className="mt-4 border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planForm.products.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{getProductName(product.product_id)}</TableCell>
                          <TableCell>{product.quantity}x por mês</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => handleRemoveProduct(product.product_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">
                  Nenhum produto adicionado ao plano.
                </div>
              )}
            </div>
            
            <div>
              <Label>Benefícios Adicionais</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Ex: Desconto em serviços adicionais"
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddBenefit}>Adicionar</Button>
              </div>
              
              {planForm.benefits.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {planForm.benefits.map((benefit, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                    >
                      <span className="text-sm">{benefit}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 h-8 w-8"
                        onClick={() => handleRemoveBenefit(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-500">
                  Nenhum benefício adicional.
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={planForm.is_active}
                onChange={(e) => setPlanForm({...planForm, is_active: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">Plano ativo</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} className="bg-[#294380] hover:bg-[#0D0F36]">
              {currentPlan ? "Atualizar Plano" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Assinatura */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentSubscription ? "Editar Assinatura" : "Nova Assinatura"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select 
                value={subscriptionForm.client_id} 
                onValueChange={(value) => setSubscriptionForm({...subscriptionForm, client_id: value})}
                disabled={currentSubscription}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select 
                value={subscriptionForm.plan_id} 
                onValueChange={(value) => setSubscriptionForm({...subscriptionForm, plan_id: value})}
                disabled={currentSubscription}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active !== false).map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.monthly_price)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={subscriptionForm.start_date}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, start_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dia do Pagamento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={subscriptionForm.payment_day}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, payment_day: parseInt(e.target.value) || 5})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Ciclo de Cobrança</Label>
              <Select 
                value={subscriptionForm.billing_cycle} 
                onValueChange={(value) => setSubscriptionForm({...subscriptionForm, billing_cycle: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral (3 meses)</SelectItem>
                  <SelectItem value="semestral">Semestral (6 meses)</SelectItem>
                  <SelectItem value="anual">Anual (12 meses)</SelectItem>
                </SelectContent>
              </Select>
              
              {subscriptionForm.plan_id && subscriptionForm.billing_cycle && (
                <div className="mt-2 text-sm">
                  <div className="font-medium">Preço total: {formatCurrency(
                    calculateCyclePrice(
                      subscriptionForm.plan_id, 
                      subscriptionForm.billing_cycle,
                      subscriptionForm.custom_discount
                    )
                  )}</div>
                  <div className="text-gray-500">
                    {subscriptionForm.billing_cycle !== "mensal" && (
                      <span>Inclui desconto de ciclo</span>
                    )}
                    {subscriptionForm.custom_discount > 0 && (
                      <span> + desconto adicional de {subscriptionForm.custom_discount}%</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select 
                value={subscriptionForm.payment_method} 
                onValueChange={(value) => setSubscriptionForm({...subscriptionForm, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto Bancário</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {subscriptionForm.payment_method === "cartao_credito" && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select 
                  value={String(subscriptionForm.installments)} 
                  onValueChange={(value) => setSubscriptionForm({...subscriptionForm, installments: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}x {subscriptionForm.plan_id ? 
                          `de ${formatCurrency(
                            calculateCyclePrice(
                              subscriptionForm.plan_id, 
                              subscriptionForm.billing_cycle,
                              subscriptionForm.custom_discount
                            ) / (i + 1)
                          )}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Desconto Adicional (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={subscriptionForm.custom_discount}
                onChange={(e) => setSubscriptionForm({
                  ...subscriptionForm, 
                  custom_discount: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={subscriptionForm.notes}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, notes: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubscriptionDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveSubscription}
              disabled={!subscriptionForm.client_id || !subscriptionForm.plan_id}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              {currentSubscription ? "Atualizar Assinatura" : "Criar Assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar {itemToDelete?.type === 'plan' ? 'Exclusão' : 'Cancelamento'}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {itemToDelete?.type === 'plan' ? (
              <p>
                Tem certeza que deseja excluir o plano <strong>{itemToDelete?.name}</strong>?
                Esta ação não pode ser desfeita.
              </p>
            ) : (
              <p>
                Tem certeza que deseja cancelar a assinatura <strong>{itemToDelete?.name}</strong>?
                O cliente não terá mais acesso aos benefícios do plano após o cancelamento.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteItem}
              variant="destructive"
            >
              {itemToDelete?.type === 'plan' ? 'Excluir Plano' : 'Cancelar Assinatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <RateLimitHandler />
    </div>
  );
}