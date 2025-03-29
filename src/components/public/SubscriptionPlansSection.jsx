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
import { Check, Star, CircleDollarSign, Clock, Loader2 } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import MercadoPagoService from '@/services/mercadoPagoService';
import { CompanySettings } from "@/firebase/entities";

export default function SubscriptionPlansSection({ plans = [] }) {
  const [cycleType, setCycleType] = useState("mensal");
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState({});
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

  const handleSubscription = async (plan, cycleType) => {
    // Se o Mercado Pago não estiver configurado, usar WhatsApp como fallback
    if (!companySettings?.payment_settings?.mercadopago_enabled) {
      openWhatsApp(plan.name, cycleType);
      return;
    }
    
    try {
      setLoading({ [plan.id]: true });
      
      const cyclePrice = calculateCyclePrice(plan, cycleType);
      
      // Inicializar o serviço do Mercado Pago com as configurações atuais
      const mpInitialized = MercadoPagoService.initialize(companySettings.payment_settings);
      
      if (!mpInitialized) {
        throw new Error("Não foi possível inicializar o Mercado Pago");
      }
      
      // Criar link de pagamento no Mercado Pago
      const paymentLink = await MercadoPagoService.createPaymentLink({
        plan_name: `${plan.name} - ${cycleType}`,
        billing_cycle: cycleType,
        amount: cyclePrice,
        payer_email: "", // Será preenchido no checkout do Mercado Pago
        external_reference: plan.id,
        success_url: `${window.location.origin}/subscription-success?plan_id=${plan.id}&cycle=${cycleType}`,
        failure_url: `${window.location.origin}/subscription-failure?plan_id=${plan.id}&cycle=${cycleType}`,
        pending_url: `${window.location.origin}/subscription-pending?plan_id=${plan.id}&cycle=${cycleType}`
      });
      
      if (paymentLink) {
        // Abrir o link de pagamento em uma nova aba
        window.open(paymentLink, '_blank');
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
      openWhatsApp(plan.name, cycleType);
    } finally {
      setLoading({ [plan.id]: false });
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
                    onClick={() => handleSubscription(plan, cycleType)}
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
    </section>
  );
}