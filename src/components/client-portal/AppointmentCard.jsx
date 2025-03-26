import React, { useState } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppointmentCard({ appointments = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(appointments.length / ITEMS_PER_PAGE);

  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center py-10">
        <p className="text-gray-500">Você não possui agendamentos registrados.</p>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedAppointments = appointments.slice(startIndex, endIndex);

  const getStatusColor = (status) => {
    switch (status) {
      case 'agendado':
        return 'bg-blue-100 text-blue-800';
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'concluído':
        return 'bg-purple-100 text-purple-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-medium text-lg">Seus Agendamentos</h3>
      </div>
      
      <div className="divide-y">
        {displayedAppointments.map((appointment) => (
          <div key={appointment.id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="font-medium text-[#294380] mb-2">
                  {appointment.service_name || "Serviço"}
                </h3>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    {format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {format(new Date(appointment.date), "HH:mm", { locale: ptBR })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    {appointment.employee_name || "Profissional"}
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                  {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : "Pendente"}
                </span>
              </div>
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