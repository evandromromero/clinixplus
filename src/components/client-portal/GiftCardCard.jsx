import React, { useState } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Gift, ChevronLeft, ChevronRight, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GiftCardCard({ giftCards = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(giftCards.length / ITEMS_PER_PAGE);

  if (!giftCards || giftCards.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center py-10">
        <p className="text-gray-500">Você não possui gift cards registrados.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'usado':
        return 'bg-blue-100 text-blue-800';
      case 'expirado':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedGiftCards = giftCards.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-medium text-lg">Seus Gift Cards</h3>
      </div>
      
      <div className="divide-y">
        {displayedGiftCards.map((giftCard) => (
          <div key={giftCard.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium text-[#294380]">Gift Card #{giftCard.code || "0000"}</h3>
                <p className="text-sm text-gray-600">
                  {giftCard.purchase_date ? 
                    format(new Date(giftCard.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                    : "Data não disponível"}
                </p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(giftCard.status)}`}>
                {giftCard.status ? giftCard.status.charAt(0).toUpperCase() + giftCard.status.slice(1) : "Status não disponível"}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="h-4 w-4 mr-2" />
                Valor: R$ {(giftCard.value || 0).toFixed(2)}
              </div>

              {giftCard.expiration_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Validade: {format(new Date(giftCard.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              )}

              {giftCard.recipient_name && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Presenteado:</p>
                  <p>{giftCard.recipient_name}</p>
                  {giftCard.message && (
                    <p className="mt-2 italic">"{giftCard.message}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="text-[#3475B8] hover:text-[#2C64A0] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
              className={currentPage === page ? "bg-[#3475B8] text-white" : "text-[#3475B8] hover:text-[#2C64A0] transition-colors"}
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="text-[#3475B8] hover:text-[#2C64A0] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}