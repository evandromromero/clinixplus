import React, { useState } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, Calendar, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function PackageCard({ packages = [], services = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(packages.length / ITEMS_PER_PAGE);

  if (!packages || packages.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center py-10">
        <p className="text-gray-500">Você não possui pacotes registrados.</p>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedPackages = packages.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'finalizado':
        return 'bg-blue-100 text-blue-800';
      case 'expirado':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
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
        <h3 className="font-medium text-lg">Seus Pacotes</h3>
      </div>
      
      <div className="divide-y">
        {displayedPackages.map((packageData) => (
          <div key={packageData.id} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-medium text-[#294380]">
                  {packageData.package_snapshot?.name || "Pacote de serviços"}
                </h4>
                <p className="text-sm text-gray-600">
                  {packageData.purchase_date ? 
                    format(new Date(packageData.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                    : "Data não disponível"}
                </p>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(packageData.status)}`}>
                {packageData.status ? packageData.status.charAt(0).toUpperCase() + packageData.status.slice(1) : "Status não disponível"}
              </span>
            </div>

            {packageData.sessions_used !== undefined && packageData.total_sessions !== undefined && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Sessões utilizadas: {packageData.sessions_used} de {packageData.total_sessions}</span>
                    <span>{Math.round((packageData.sessions_used / packageData.total_sessions) * 100)}%</span>
                  </div>
                  <Progress value={(packageData.sessions_used / packageData.total_sessions) * 100} className="h-2" />
                </div>

                {/* Histórico de sessões utilizadas */}
                {packageData.session_history && packageData.session_history.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-gray-700">Histórico de sessões:</p>
                    <div className="space-y-2">
                      {packageData.session_history
                        .filter(session => session.status === 'concluido')
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((session, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded border border-gray-100 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{session.service_name}</span>
                              <span className="text-green-600 text-xs px-2 py-0.5 bg-green-50 rounded-full">Concluído</span>
                            </div>
                            <div className="mt-1 text-gray-600 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {session.date ? 
                                format(new Date(session.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : "Data não disponível"}
                            </div>
                            <div className="text-gray-600">
                              Profissional: {session.employee_name || "Não informado"}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {packageData.package_snapshot?.services && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Serviços incluídos:</p>
                    {packageData.package_snapshot.services.map((service, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        {getServiceName(service.service_id || service)} 
                        {service.quantity && service.quantity > 1 ? ` (${service.quantity}x)` : ''}
                      </div>
                    ))}
                  </div>
                )}

                {packageData.expiration_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Validade: {format(new Date(packageData.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}
              </div>
            )}
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
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
              className={currentPage === page ? "bg-[#3475B8] text-white" : ""}
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}