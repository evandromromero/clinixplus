import React from 'react';

export default function EmployeeAppointmentCard({ appointments }) {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-4 bg-white rounded shadow text-center text-gray-500">
        Nenhum agendamento para hoje.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map(app => (
        <div key={app.id} className="p-4 bg-white rounded shadow flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-blue-800">{app.client_name || 'Cliente não encontrado'}</div>
            <div className="text-sm text-gray-700">{app.service_name || 'Serviço não encontrado'}</div>
          </div>
          <div className="text-sm text-gray-600 mt-2 sm:mt-0">
            {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 ml-0 sm:ml-4 mt-2 sm:mt-0">
            {app.status || 'pendente'}
          </div>
        </div>
      ))}
    </div>
  );
}
