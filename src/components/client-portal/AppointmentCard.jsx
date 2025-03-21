import React from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Clock, User } from "lucide-react";

export default function AppointmentCard({ appointments = [] }) {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-center py-10">
        <p className="text-gray-500">Você não possui agendamentos registrados.</p>
      </div>
    );
  }

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

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-medium text-lg">Seus Agendamentos</h3>
      </div>
      
      <div className="divide-y">
        {appointments.map((appointment) => (
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
      
      {appointments.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500">Você não possui agendamentos.</p>
        </div>
      )}
    </div>
  );
}