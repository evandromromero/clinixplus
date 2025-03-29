import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, CircleDollarSign, Clock, Loader2, Phone, User, Mail, MapPin } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import MercadoPagoService from '@/services/mercadoPagoService';
import { CompanySettings, Client, ClientSubscription } from "@/firebase/entities";

export default function SubscriptionPlansSection({ plans = [] }) {
  const [cycleType, setCycleType] = useState("mensal");
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState({});
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [clientPhone, setClientPhone] = useState("");
  const [clientData, setClientData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const [clientExists, setClientExists] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    loadCompanySettings();
  }, []);
  
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
    }
  };
  
  const openWhatsApp = (planName, cycleType) => {
    const message = encodeURIComponent(`Olá! Gostaria de mais informações sobre o ${planName} no plano ${cycleType}.`);
    window.open(`https://wa.me/5511988889999?text=${message}`, '_blank');
  };

  const handleSubscription = (plan) => {
    setSelectedPlan(plan);
    setShowClientModal(true);
  };
  
  const handleSearchClient = async () => {
    if (!clientPhone || clientPhone.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, digite um número de telefone válido com DDD.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSearchingClient(true);
      
      // Normalizar o telefone (remover caracteres não numéricos)
      const normalizedPhone = clientPhone.replace(/\D/g, '');
      
      // Buscar cliente pelo telefone
      const clients = await Client.list();
      const foundClient = clients.find(client => 
        client.phone && client.phone.replace(/\D/g, '') === normalizedPhone
      );
      
      if (foundClient) {
        setClientData({
          id: foundClient.id,
          name: foundClient.name || "",
          email: foundClient.email || "",
          phone: foundClient.phone || "",
          address: foundClient.address || ""
        });
        setClientExists(true);
        toast({
          title: "Cliente encontrado",
          description: `Bem-vindo de volta, ${foundClient.name}!`,
          variant: "default"
        });
      } else {
        setClientData({
          name: "",
          email: "",
          phone: normalizedPhone,
          address: ""
        });
        setClientExists(false);
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      toast({
        title: "Erro ao buscar cliente",
        description: "Não foi possível verificar o cliente. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSearchingClient(false);
    }
  };
  
  const handleCreateClient = async () => {
    // Validar dados do cliente
    if (!clientData.name || !clientData.email || !clientData.phone) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCreatingClient(true);
      
      // Criar novo cliente
      const newClient = await Client.create({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address || "",
        created_at: new Date().toISOString(),
        status: "ativo"
      });
      
      setClientData({
        ...clientData,
        id: newClient.id
      });
      
      setClientExists(true);
      
      toast({
        title: "Cliente criado com sucesso",
        description: "Sua conta foi criada. Agora você pode prosseguir com a assinatura.",
        variant: "default"
      });
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      toast({
        title: "Erro ao criar cliente",
        description: "Não foi possível criar sua conta. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setCreatingClient(false);
    }
  };
  
  const handleProceedToPayment = async () => {
    if (!clientExists || !clientData.id) {
      toast({
        title: "Cliente não identificado",
        description: "Por favor, crie uma conta antes de prosseguir.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading({ [selectedPlan.id]: true });
      
      const cyclePrice = calculateCyclePrice(selectedPlan, cycleType);
      
      // Inicializar o serviço do Mercado Pago com as configurações atuais
      const mpInitialized = MercadoPagoService.initialize(companySettings.payment_settings);
      
      if (!mpInitialized) {
        throw new Error("Não foi possível inicializar o Mercado Pago");
      }
      
      // Calcular data de término com base no ciclo
      const startDate = new Date();
      const endDate = new Date(startDate);
      let cycles = 1;
      
      switch(cycleType) {
        case "trimestral":
          cycles = 3;
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case "semestral":
          cycles = 6;
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case "anual":
          cycles = 12;
          endDate.setMonth(endDate.getMonth() + 12);
          break;
        default: // mensal
          endDate.setMonth(endDate.getMonth() + 1);
          break;
      }
      
      // Calcular desconto com base no ciclo
      let discount = 0;
      switch(cycleType) {
        case "trimestral":
          discount = selectedPlan.quarterly_discount || 5;
          break;
        case "semestral":
          discount = selectedPlan.semiannual_discount || 10;
          break;
        case "anual":
          discount = selectedPlan.annual_discount || 15;
          break;
      }
      
      // Criar uma referência externa única para esta assinatura
      const externalReference = `plan_${selectedPlan.id}_client_${clientData.id}_${Date.now()}`;
      
      // Importar o que precisamos do Firebase
      const { db } = await import('@/firebase/config');
      const { collection, addDoc, doc, setDoc } = await import('firebase/firestore');
      
      // Criar assinatura com status pendente diretamente no Firebase
      const subscriptionData = {
        client_id: clientData.id,
        plan_id: selectedPlan.id,
        billing_cycle: cycleType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        next_billing_date: endDate.toISOString(),
        discount,
        status: "pendente",
        mercadopago_status: "pending",
        external_reference: externalReference,
        amount: cyclePrice,
        services_used: [],
        products_received: [],
        payment_history: [],
        created_at: new Date().toISOString(),
        // Campos obrigatórios que estavam faltando
        payment_method: "mercadopago",
        payment_day: new Date().getDate()
      };
      
      console.log("Salvando assinatura no Firebase:", subscriptionData);
      
      // Criar assinatura diretamente no Firebase
      let subscriptionId;
      let subscription;
      
      try {
        // Tentar usar addDoc primeiro (método recomendado)
        const subscriptionRef = await addDoc(collection(db, 'client_subscriptions'), subscriptionData);
        subscriptionId = subscriptionRef.id;
        subscription = {
          id: subscriptionId,
          ...subscriptionData
        };
        console.log('Assinatura pendente criada com addDoc:', subscription);
      } catch (firebaseError) {
        console.error('Erro ao criar assinatura com addDoc:', firebaseError);
        
        // Fallback: tentar usar setDoc com ID gerado
        try {
          subscriptionId = `subscription_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await setDoc(doc(db, 'client_subscriptions', subscriptionId), subscriptionData);
          subscription = {
            id: subscriptionId,
            ...subscriptionData
          };
          console.log('Assinatura pendente criada com setDoc:', subscription);
        } catch (fallbackError) {
          console.error('Erro ao criar assinatura com setDoc:', fallbackError);
          throw new Error('Não foi possível salvar a assinatura no Firebase');
        }
      }
      
      // Criar link de pagamento no Mercado Pago
      const paymentLink = await MercadoPagoService.createPaymentLink({
        plan_name: `${selectedPlan.name} - ${cycleType}`,
        billing_cycle: cycleType,
        amount: cyclePrice,
        payer_email: clientData.email,
        external_reference: externalReference,
        client_id: clientData.id,
        subscription_id: subscription.id, // Incluir ID da assinatura
        success_url: `${window.location.origin}/subscription-success?plan_id=${selectedPlan.id}&client_id=${clientData.id}&subscription_id=${subscription.id}&cycle=${cycleType}`,
        failure_url: `${window.location.origin}/subscription-failure?plan_id=${selectedPlan.id}&client_id=${clientData.id}&subscription_id=${subscription.id}&cycle=${cycleType}`,
        pending_url: `${window.location.origin}/subscription-pending?plan_id=${selectedPlan.id}&client_id=${clientData.id}&subscription_id=${subscription.id}&cycle=${cycleType}`
      });
      
      if (paymentLink && paymentLink.url) {
        try {
          // Atualizar assinatura com o ID do pagamento do Mercado Pago
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'client_subscriptions', subscription.id), {
            mercadopago_payment_id: paymentLink.payment_id || '',
            mercadopago_preference_id: paymentLink.preference_id || ''
          });
          
          console.log('Assinatura atualizada com dados do pagamento:', paymentLink.payment_id);
        } catch (updateError) {
          console.error('Erro ao atualizar assinatura com dados do pagamento:', updateError);
          // Continuar mesmo com erro na atualização
        }
        
        // Fechar o modal
        setShowClientModal(false);
        
        // Exibir mensagem de sucesso
        toast({
          title: "Assinatura iniciada",
          description: "Sua assinatura foi iniciada. Complete o pagamento para ativá-la.",
          variant: "default"
        });
        
        // Abrir o link de pagamento em uma nova aba
        window.open(paymentLink.url, '_blank');
      } else {
        throw new Error("Não foi possível gerar o link de pagamento");
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível processar o pagamento. Por favor, tente novamente ou entre em contato conosco.",
        variant: "destructive"
      });
      // Fallback para WhatsApp em caso de erro
      openWhatsApp(selectedPlan.name, cycleType);
    } finally {
      setLoading({ [selectedPlan.id]: false });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  // Calcular preço por ciclo
  const calculateCyclePrice = (plan, cycle) => {
    if (!plan) return 0;
    
    const monthlyPrice = plan.monthly_price;
    let totalPrice = monthlyPrice;
    let discount = 0;
    
    switch(cycle) {
      case "mensal":
        totalPrice = monthlyPrice;
        break;
      case "trimestral":
        totalPrice = monthlyPrice * 3;
        discount = plan.quarterly_discount || 5;
        break;
      case "semestral":
        totalPrice = monthlyPrice * 6;
        discount = plan.semiannual_discount || 10;
        break;
      case "anual":
        totalPrice = monthlyPrice * 12;
        discount = plan.annual_discount || 15;
        break;
    }
    
    // Aplicar desconto
    return totalPrice * (1 - (discount / 100));
  };

  // Obter número de meses por ciclo
  const getCycleMonths = (cycle) => {
    switch(cycle) {
      case "mensal": return 1;
      case "trimestral": return 3;
      case "semestral": return 6;
      case "anual": return 12;
      default: return 1;
    }
  };

  // Obter desconto do ciclo
  const getCycleDiscount = (plan, cycle) => {
    switch(cycle) {
      case "trimestral": return plan.quarterly_discount || 5;
      case "semestral": return plan.semiannual_discount || 10;
      case "anual": return plan.annual_discount || 15;
      default: return 0;
    }
  };

  // Calcular economia total
  const calculateSavings = (plan, cycle) => {
    if (cycle === "mensal") return 0;
    
    const monthlyPrice = plan.monthly_price;
    const months = getCycleMonths(cycle);
    const regularPrice = monthlyPrice * months;
    const discountedPrice = calculateCyclePrice(plan, cycle);
    
    return regularPrice - discountedPrice;
  };
  
  const displayPlans = plans.slice(0, 3);

  return (
    <section className="py-12 bg-gradient-to-b from-white to-gray-50" id="subscriptions">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Planos de Assinatura</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Escolha o plano ideal para você e aproveite nossos serviços com preços especiais e benefícios exclusivos.
          </p>
          
          <div className="mt-6 flex justify-center">
            <Tabs 
              defaultValue="mensal" 
              className="w-full max-w-md" 
              onValueChange={setCycleType}
            >
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
                <TabsTrigger value="trimestral">Trimestral</TabsTrigger>
                <TabsTrigger value="semestral">Semestral</TabsTrigger>
                <TabsTrigger value="anual">Anual</TabsTrigger>
              </TabsList>
              
              {/* Tabs content é invisível mas necessário para funcionamento */}
              <TabsContent value="mensal"></TabsContent>
              <TabsContent value="trimestral"></TabsContent>
              <TabsContent value="semestral"></TabsContent>
              <TabsContent value="anual"></TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan) => {
            const cyclePrice = calculateCyclePrice(plan, cycleType);
            const monthlyEquivalent = cyclePrice / getCycleMonths(cycleType);
            const discount = getCycleDiscount(plan, cycleType);
            const totalSavings = calculateSavings(plan, cycleType);
            
            return (
              <Card key={plan.id} className="relative overflow-hidden border-2 hover:border-primary hover:shadow-lg transition-all duration-300">
                {plan.name.toLowerCase().includes('premium') && (
                  <div className="absolute top-4 right-4">
                    <Star className="w-6 h-6 text-yellow-400 fill-current" />
                  </div>
                )}
                
                {discount > 0 && (
                  <div className="absolute top-0 left-0 bg-red-500 text-white px-3 py-1 text-sm font-bold transform rotate-0 -translate-y-0 -translate-x-0 rounded-tl-md rounded-br-md">
                    {discount}% OFF
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{formatCurrency(monthlyEquivalent)}</span>
                      <span className="text-gray-600">/mês</span>
                    </div>
                    
                    {cycleType !== "mensal" && (
                      <div className="text-sm text-gray-500 mt-1 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Pagamento {cycleType} de {formatCurrency(cyclePrice)}
                      </div>
                    )}
                    
                    {totalSavings > 0 && (
                      <div className="mt-2 text-sm font-medium text-green-600 flex items-center">
                        <CircleDollarSign className="w-4 h-4 mr-1" />
                        Economia de {formatCurrency(totalSavings)} no período
                      </div>
                    )}
                  </div>
                  
                  <div className="my-4 border-t border-gray-100 pt-4">
                    <h4 className="font-medium mb-2">O que está incluso:</h4>
                    <ul className="space-y-3">
                      {plan.services.map((service, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{service.quantity}x {service.name || 'Serviço'}</span>
                        </li>
                      ))}
                      {plan.benefits?.map((benefit, index) => (
                        <li key={`benefit-${index}`} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full"
                    onClick={() => handleSubscription(plan)}
                    disabled={loading[plan.id]}
                  >
                    {loading[plan.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Assinar Agora"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
      
      {/* Modal para capturar dados do cliente */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Identificação do Cliente</DialogTitle>
            <DialogDescription>
              {!clientExists 
                ? "Digite seu número de telefone para verificarmos se você já possui cadastro."
                : "Confirmação de dados para assinatura."}
            </DialogDescription>
          </DialogHeader>
          
          {!clientExists ? (
            <>
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="phone" className="w-24">
                    Telefone
                  </Label>
                  <div className="flex-1 flex gap-2">
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSearchClient}
                      disabled={searchingClient}
                    >
                      {searchingClient ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verificar"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {clientData.phone && !clientExists && (
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Cliente não encontrado</h3>
                  <p className="text-sm text-gray-500 mb-4">Preencha os dados abaixo para criar sua conta:</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Nome completo"
                        value={clientData.name}
                        onChange={(e) => setClientData({...clientData, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={clientData.email}
                        onChange={(e) => setClientData({...clientData, email: e.target.value})}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Endereço (opcional)"
                        value={clientData.address}
                        onChange={(e) => setClientData({...clientData, address: e.target.value})}
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleCreateClient}
                      disabled={creatingClient}
                    >
                      {creatingClient ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar Conta"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Dados do Cliente</h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{clientData.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{clientData.email}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{clientData.phone}</span>
                </div>
                
                {clientData.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{clientData.address}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-sm">Resumo da Assinatura</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Plano:</span>
                    <span className="font-medium">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ciclo:</span>
                    <span>{cycleType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor:</span>
                    <span className="font-medium">{formatCurrency(calculateCyclePrice(selectedPlan, cycleType))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClientModal(false)}
            >
              Cancelar
            </Button>
            
            {clientExists && (
              <Button
                type="button"
                onClick={handleProceedToPayment}
                disabled={loading[selectedPlan?.id]}
              >
                {loading[selectedPlan?.id] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Prosseguir para Pagamento"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}