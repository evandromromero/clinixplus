import React from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Clock, User, ShoppingBag, DollarSign } from "lucide-react";

export default function HistoryCard({ sales = [] }) {
  if (!sales || sales.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center py-10">
        <p className="text-gray-500">Você não possui histórico de compras registrado.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'produto': return 'Produto';
      case 'pacote': return 'Pacote';
      case 'serviço': return 'Serviço';
      case 'giftcard': return 'Gift Card';
      case 'assinatura': return 'Assinatura';
      default: return 'Venda';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-medium text-lg">Seu Histórico de Compras</h3>
      </div>
      
      <div className="divide-y">
        {sales.map((sale) => (
          <div key={sale.id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="font-medium text-[#294380] mb-2">
                  {getTypeLabel(sale.type)}
                </h3>
                <div className="space-y-1">
                  {sale.date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarCheck className="h-4 w-4 mr-2" />
                      {format(new Date(sale.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  )}
                  
                  {sale.total_amount !== undefined && (
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      R$ {sale.total_amount.toFixed(2).replace('.', ',')}
                    </div>
                  )}
                  
                  {sale.items && sale.items.length > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                  {sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : "Pendente"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {sales.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">Você não possui histórico de compras.</p>
        </div>
      )}
    </div>
  );
}