import React from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock3, Calendar, CheckCircle, Package } from "lucide-react";

export default function SubscriptionCard({ subscriptions = [], services = [] }) {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center py-10">
        <p className="text-gray-500">Você não possui assinaturas registradas.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativa':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'suspensa':
        return 'bg-yellow-100 text-yellow-800';
      case 'pendente':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Serviço não encontrado";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-medium text-lg">Suas Assinaturas</h3>
      </div>
      
      <div className="divide-y">
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium text-[#294380]">{subscription.plan_id || "Plano de Assinatura"}</h3>
                <p className="text-sm text-gray-600">
                  {subscription.start_date ? 
                    format(new Date(subscription.start_date), "dd/MM/yyyy", { locale: ptBR }) 
                    : "Data não disponível"}
                </p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                {subscription.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : "Status não disponível"}
              </span>
            </div>

            <div className="space-y-4">
              {subscription.services_used && subscription.services_used.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Serviços incluídos:</p>
                  {subscription.services_used.map((service, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      {service.service_id ? getServiceName(service.service_id) : "Serviço não especificado"}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {subscription.billing_cycle && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock3 className="h-4 w-4 mr-2" />
                    Ciclo de cobrança: {subscription.billing_cycle}
                  </div>
                )}
                
                {subscription.next_billing_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Próxima cobrança: {format(new Date(subscription.next_billing_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {subscriptions.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">Você não possui assinaturas.</p>
        </div>
      )}
    </div>
  );
}