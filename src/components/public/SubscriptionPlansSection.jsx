import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, CircleDollarSign, Clock } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function SubscriptionPlansSection({ plans = [] }) {
  const [cycleType, setCycleType] = React.useState("mensal");
  
  const openWhatsApp = (planName, cycleType) => {
    const message = encodeURIComponent(`Olá! Gostaria de mais informações sobre o ${planName} no plano ${cycleType}.`);
    window.open(`https://wa.me/5511988889999?text=${message}`, '_blank');
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
                    onClick={() => openWhatsApp(plan.name, cycleType)}
                  >
                    Assinar Agora
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