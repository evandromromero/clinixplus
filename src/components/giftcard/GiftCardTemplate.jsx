import React, { useState, useEffect, forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Gift, Sparkles, Calendar } from "lucide-react";
import { CompanySettings } from "@/firebase/entities";

// Estado global para armazenar o nome da empresa
let globalCompanyName = "Esthétique";
let isLoading = false;
let loadPromise = null;

// Função para carregar as configurações da empresa
const loadCompanySettings = async () => {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise(async (resolve) => {
    if (!isLoading) {
      isLoading = true;
      try {
        const settingsList = await CompanySettings.list();
        if (settingsList && settingsList.length > 0) {
          const settings = settingsList[0];
          if (settings?.name) {
            globalCompanyName = settings.name;
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações da empresa:", error);
      } finally {
        isLoading = false;
      }
    }
    resolve(globalCompanyName);
  });

  return loadPromise;
};

export default forwardRef(({ giftCard, previewMode = false }, ref) => {
  const [companyName, setCompanyName] = useState(globalCompanyName);

  useEffect(() => {
    loadCompanySettings().then(name => {
      setCompanyName(name);
    });
  }, []);

  const templates = {
    padrao: {
      bgColor: "bg-gradient-to-r from-blue-500 to-purple-500",
      borderColor: "border-indigo-300",
      textColor: "text-white"
    },
    aniversario: {
      bgColor: "bg-gradient-to-r from-pink-500 to-orange-400",
      borderColor: "border-pink-300",
      textColor: "text-white"
    },
    natal: {
      bgColor: "bg-gradient-to-r from-red-600 to-green-600",
      borderColor: "border-red-300",
      textColor: "text-white"
    },
    especial: {
      bgColor: "bg-gradient-to-r from-amber-500 to-yellow-300",
      borderColor: "border-amber-300",
      textColor: "text-gray-800"
    }
  };

  const template = templates[giftCard.design_template || "padrao"];

  return (
    <Card ref={ref} className={`overflow-hidden border-2 ${template.borderColor} shadow-lg ${previewMode ? 'w-full max-w-sm' : 'w-full'}`}>
      <div className={`relative ${template.bgColor} p-6 ${template.textColor}`}>
        <div className="absolute top-3 right-3 opacity-50">
          <Sparkles className="h-24 w-24" />
        </div>
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm">
            <Gift className="h-8 w-8" />
          </div>
          
          <h3 className="text-xl font-bold">{giftCard.company_name || companyName} Gift Card</h3>
          
          <div className="text-3xl font-bold mt-2">
            {new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            }).format(giftCard.value)}
          </div>
          
          {giftCard.recipient_name && (
            <p className="text-sm opacity-90">
              Para: <span className="font-medium">{giftCard.recipient_name}</span>
            </p>
          )}
          
          {giftCard.message && (
            <p className="italic text-sm opacity-90 max-w-xs">
              "{giftCard.message}"
            </p>
          )}
          
          <div className="flex items-center justify-center space-x-1 text-xs opacity-75 mt-3">
            <Calendar className="h-3 w-3" />
            <span>
              Válido até: {format(
                new Date(giftCard.expiration_date || new Date()), 
                "dd 'de' MMMM 'de' yyyy", 
                { locale: ptBR }
              )}
            </span>
          </div>
          
          <div className="font-mono tracking-wider bg-white/20 backdrop-blur-sm px-3 py-1 rounded-md">
            {giftCard.code || "XXXX-XXXX-XXXX"}
          </div>
        </div>
      </div>
    </Card>
  );
});