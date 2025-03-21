import React from 'react';
import { Button } from "@/components/ui/button";
import { Gift, Check } from "lucide-react";

export default function GiftCardSection() {
  const openWhatsApp = () => {
    const message = encodeURIComponent("Olá! Gostaria de comprar um Gift Card.");
    window.open(`https://wa.me/5511988889999?text=${message}`, '_blank');
  };

  return (
    <section className="py-12 bg-white" id="gift-cards">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-block p-2 bg-purple-100 rounded-lg">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900">
                Presenteie com momentos especiais
              </h2>
              
              <p className="text-gray-600">
                Nossos Gift Cards são a escolha perfeita para presentear alguém especial com momentos de beleza e bem-estar.
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Flexibilidade</h3>
                    <p className="text-sm text-gray-600">Escolha o valor que desejar</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Personalização</h3>
                    <p className="text-sm text-gray-600">Adicione uma mensagem especial</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Validade Estendida</h3>
                    <p className="text-sm text-gray-600">6 meses para utilizar</p>
                  </div>
                </li>
              </ul>

              <Button 
                size="lg"
                onClick={openWhatsApp}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Gift className="w-5 h-5 mr-2" />
                Comprar Gift Card
              </Button>
            </div>

            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1562664377-709f2c337eb2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80"
                alt="Gift Card"
                className="rounded-lg shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}