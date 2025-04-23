import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Check, User, Clock, CalendarCheck2 } from 'lucide-react';
import { Appointment } from '@/firebase/entities';
import AnamneseActionCard from './AnamneseActionCard';

// Paleta de cores pastel
const CARD_COLORS = [
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-yellow-50 border-yellow-200',
  'bg-pink-50 border-pink-200',
  'bg-purple-50 border-purple-200',
  'bg-orange-50 border-orange-200',
  'bg-cyan-50 border-cyan-200',
  'bg-lime-50 border-lime-200',
];

function getServiceColor(serviceName, serviceColorMap, colorList) {
  if (!serviceName) return colorList[0];
  if (!serviceColorMap[serviceName]) {
    const idx = Object.keys(serviceColorMap).length % colorList.length;
    serviceColorMap[serviceName] = colorList[idx];
  }
  return serviceColorMap[serviceName];
}

export default function EmployeeAppointmentCard({ appointments, onAction }) {
  const [loadingId, setLoadingId] = useState(null);
  const [anamneseModal, setAnamneseModal] = useState({ open: false, clientId: null, clientName: null });
  const serviceColorMap = useMemo(() => ({}), []);

  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow text-center text-gray-400 border border-blue-100">
        Nenhum agendamento para hoje.
      </div>
    );
  }

  const handleConclude = async (appointmentId) => {
    if (!window.confirm('Deseja marcar este agendamento como concluído?')) return;
    setLoadingId(appointmentId);
    try {
      await Appointment.update(appointmentId, { status: 'concluido' });
      if (onAction) onAction();
    } catch (error) {
      alert('Erro ao concluir o agendamento.');
    }
    setLoadingId(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {appointments.map(app => {
          const cardColor = getServiceColor(app.service_name, serviceColorMap, CARD_COLORS);
          return (
            <div
              key={app.id}
              className={`flex flex-col justify-between rounded-2xl shadow-lg px-5 py-4 border hover:shadow-xl transition-shadow duration-200 min-h-[150px] ${cardColor}`}
            >
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <span className="flex items-center gap-1 font-semibold text-blue-900 truncate">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="truncate">{app.client_name || 'Cliente não encontrado'}</span>
                </span>
                <span className="flex items-center gap-1 text-sm text-blue-700 font-medium truncate">
                  <CalendarCheck2 className="w-4 h-4 text-blue-300" />
                  <span className="truncate">{app.service_name || 'Serviço não encontrado'}</span>
                </span>
                <div className="flex items-center gap-1 text-sm text-blue-700 font-bold mt-2">
                  <Clock className="w-4 h-4 text-blue-300" />
                  {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className={`text-xs px-3 py-1 rounded-full font-semibold ${app.status === 'concluido' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {app.status || 'pendente'}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2 border-blue-400 text-blue-700"
                  onClick={() => setAnamneseModal({ open: true, clientId: app.client_id, clientName: app.client_name })}
                >
                  Anamnese
                </Button>
                {app.status !== 'concluido' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md px-4 py-1"
                    onClick={() => handleConclude(app.id)}
                    disabled={loadingId === app.id}
                  >
                    {loadingId === app.id ? 'Salvando...' : <><Check className="w-4 h-4 mr-1 inline" /> Concluir</>}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {anamneseModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xl w-full relative max-h-[90vh] overflow-y-auto">
            <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => setAnamneseModal({ open: false, clientId: null, clientName: null })}>Fechar</Button>
            <AnamneseActionCard
              clientId={anamneseModal.clientId}
              clientName={anamneseModal.clientName}
              mode="modal"
              onClose={() => setAnamneseModal({ open: false, clientId: null, clientName: null })}
            />
          </div>
        </div>
      )}
    </>
  );
}
