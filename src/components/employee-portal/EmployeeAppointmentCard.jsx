import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, User, Clock, CalendarCheck2, CheckCircle, FileText, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, ClientPackage, PendingService, Service } from '@/firebase/entities';
import AnamneseActionCard from './AnamneseActionCard';
import { Client } from '@/firebase/entities';
import SignatureCanvas from 'react-signature-canvas';

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

export default function EmployeeAppointmentCard({ appointments, onAction, currentEmployee }) {
  const [loadingId, setLoadingId] = useState(null);
  const [anamneseModal, setAnamneseModal] = useState({ open: false, clientId: null, clientName: null });
  const [lastAnamnese, setLastAnamnese] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState(null);
  const [concludeId, setConcludeId] = useState(null);
  const [serviceColorMap, setServiceColorMap] = useState({});
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  
  // Estados para visualização de assinatura
  const [selectedSignature, setSelectedSignature] = useState(null);
  const [showSignatureViewModal, setShowSignatureViewModal] = useState(false);
  
  // Carregar serviços para referência
  useEffect(() => {
    const loadServices = async () => {
      try {
        const servicesData = await Service.list();
        setServices(servicesData);
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
      }
    };
    loadServices();
  }, []);

  // Função para atualizar sessões de pacotes quando um agendamento é concluído
  const updatePackageSession = async (appointment, newStatus) => {
    try {
      console.log("[EmployeePortal][updatePackageSession] Iniciando atualização de pacote para agendamento:", appointment.id);
      console.log("[EmployeePortal][updatePackageSession] Dados do agendamento:", {
        id: appointment.id,
        status: appointment.status,
        client_id: appointment.client_id,
        service_id: appointment.service_id,
        hasSignature: !!appointment.signature,
        signatureLength: appointment.signature ? appointment.signature.length : 0
      });
      
      // Buscar pacotes ativos do cliente
      const clientPackages = await ClientPackage.filter({ 
        client_id: appointment.client_id,
        status: 'ativo'
      });
      
      if (!clientPackages || clientPackages.length === 0) {
        console.log("[EmployeePortal][updatePackageSession] Nenhum pacote ativo encontrado para o cliente");
        return;
      }
      
      // Encontrar o pacote relevante que contém o serviço do agendamento
      const relevantPackage = clientPackages.find(pkg => {
        // Verificar pacotes personalizados (sem package_id)
        if (!pkg.package_id) {
          // Verificar em diferentes formatos de dados
          if (pkg.services && pkg.services.some(s => 
            (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
            return true;
          }
          if (pkg.package_snapshot && pkg.package_snapshot.services && 
              pkg.package_snapshot.services.some(s => 
                (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
            return true;
          }
          if (pkg.services_included && pkg.services_included.some(s => 
            (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
            return true;
          }
          return false;
        }
        return false;
      });
      
      if (!relevantPackage) {
        console.log("[EmployeePortal][updatePackageSession] Nenhum pacote relevante encontrado");
        return;
      }
      
      console.log("[EmployeePortal][updatePackageSession] Pacote relevante encontrado:", relevantPackage.id);
      
      // ADICIONAR validação se o pacote ainda existe antes de atualizar
      try {
        const packageExists = await ClientPackage.get(relevantPackage.id);
        if (!packageExists) {
          console.error("[EmployeePortal][updatePackageSession] Pacote não existe mais:", relevantPackage.id);
          return;
        }
      } catch (error) {
        console.error("[EmployeePortal][updatePackageSession] Erro ao validar existência do pacote:", error);
        return;
      }
      
      // Obter nome do profissional
      const employeeName = currentEmployee?.name || "Profissional não encontrado";
      
      // Obter nome do serviço
      const serviceData = services.find(s => s.id === appointment.service_id);
      const serviceName = serviceData?.name || "Serviço não encontrado";
      
      // Preparar histórico de sessões
      const currentSessionHistory = Array.isArray(relevantPackage.session_history) 
        ? relevantPackage.session_history 
        : [];
      
      // Verificar se já existe uma entrada para este agendamento
      const sessionIndex = currentSessionHistory.findIndex(
        s => s.appointment_id === appointment.id
      );
      
      // Verificar se houve mudança no status de conclusão
      const wasCompleted = sessionIndex >= 0 && currentSessionHistory[sessionIndex].status === 'concluido';
      const willBeCompleted = newStatus === 'concluido';
      let sessionsUsedDelta = 0;
      
      if (!wasCompleted && willBeCompleted) {
        sessionsUsedDelta = 1;
      } else if (wasCompleted && !willBeCompleted) {
        sessionsUsedDelta = -1;
      }
      
      let updatedSessionHistory;
      
      if (sessionIndex >= 0) {
        // Atualizar sessão existente
        console.log("[EmployeePortal][updatePackageSession] Atualizando sessão existente:", {
          sessionIndex,
          currentStatus: currentSessionHistory[sessionIndex].status,
          newStatus,
          hasExistingSignature: !!currentSessionHistory[sessionIndex].signature,
          hasNewSignature: !!appointment.signature,
          appointmentId: appointment.id
        });
        
        updatedSessionHistory = currentSessionHistory
          .filter((session, index) => session.appointment_id !== appointment.id || index === sessionIndex)
          .map((session, index) => {
            if (index === sessionIndex) {
              const updatedSession = { 
                ...session, 
                status: newStatus,
                employee_id: appointment.employee_id,
                employee_name: employeeName,
                date: appointment.date,
                signature: appointment.signature || session.signature || null // Manter assinatura existente ou adicionar nova
              };
              
              console.log("[EmployeePortal][updatePackageSession] Sessão atualizada:", {
                appointment_id: updatedSession.appointment_id,
                status: updatedSession.status,
                hasSignature: !!updatedSession.signature,
                signatureSource: appointment.signature ? 'nova assinatura' : (session.signature ? 'assinatura existente' : 'sem assinatura')
              });
              
              return updatedSession;
            }
            return session;
          });
      } else {
        // Adicionar nova sessão
        updatedSessionHistory = [...currentSessionHistory].filter(session => 
          session.appointment_id !== appointment.id
        );
        
        const sessionHistoryEntry = {
          service_id: appointment.service_id,
          service_name: serviceName,
          employee_id: appointment.employee_id,
          employee_name: employeeName,
          date: appointment.date,
          appointment_id: appointment.id,
          status: newStatus,
          notes: appointment.notes || "",
          signature: appointment.signature || null // Incluir a assinatura do cliente
        };
        
        console.log("[EmployeePortal][updatePackageSession] Criando nova entrada de histórico:", {
          appointment_id: sessionHistoryEntry.appointment_id,
          status: sessionHistoryEntry.status,
          hasSignature: !!sessionHistoryEntry.signature,
          signatureLength: sessionHistoryEntry.signature ? sessionHistoryEntry.signature.length : 0
        });
        
        updatedSessionHistory.push(sessionHistoryEntry);
      }
      
      // Atualizar o pacote com validação adicional
      try {
        await ClientPackage.update(relevantPackage.id, {
          session_history: updatedSessionHistory,
          sessions_used: Math.max(0, (relevantPackage.sessions_used || 0) + sessionsUsedDelta)
        });
        console.log("[EmployeePortal][updatePackageSession] Pacote atualizado com sucesso");
      } catch (updateError) {
        console.error("[EmployeePortal][updatePackageSession] Erro ao atualizar pacote:", updateError);
        throw updateError;
      }
    } catch (error) {
      console.error("[EmployeePortal][updatePackageSession] Erro geral:", error);
      // Não quebrar o fluxo principal do agendamento
    }
  };
  
  useEffect(() => {
    const fetchLastAnamnese = async () => {
      if (anamneseModal.open && anamneseModal.clientId) {
        try {
          const anamneses = await Client.listAnamneses(anamneseModal.clientId);
          if (anamneses && anamneses.length > 0) {
            // Ordena por data de criação (created_at) decrescente e pega a última
            const sorted = anamneses.filter(a => a.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setLastAnamnese(sorted[0]);
          } else {
            setLastAnamnese(null);
          }
        } catch (e) {
          console.error('Erro ao buscar anamneses:', e);
          setLastAnamnese(null);
        }
      } else {
        setLastAnamnese(null);
      }
    };
    fetchLastAnamnese();
  }, [anamneseModal]);
  
  useEffect(() => {
    if (anamneseModal.open && lastAnamnese) {
      setShowEdit(false);
    }
  }, [anamneseModal.open, lastAnamnese]);

  const handleConclude = async (appointmentId) => {
    setConcludeId(appointmentId);
    setShowSignatureModal(true);
  };

  const handleConfirmSignature = async () => {
    if (!signature) {
      alert('Por favor, obtenha a assinatura do cliente.');
      return;
    }
    setLoadingId(concludeId);
    try {
      // Buscar o agendamento completo antes de atualizar
      const appointmentToUpdate = appointments.find(a => a.id === concludeId);
      if (!appointmentToUpdate) {
        throw new Error('Agendamento não encontrado');
      }
      
      // Atualizar o status do agendamento com a assinatura
      await Appointment.update(concludeId, { status: 'concluido', signature });
      
      // Adicionar a assinatura ao objeto appointmentToUpdate antes de passar para updatePackageSession
      const updatedAppointment = {
        ...appointmentToUpdate,
        status: 'concluido',
        signature: signature
      };
      
      console.log('[DEBUG] Assinatura capturada:', signature ? 'Sim (comprimento: ' + signature.length + ')' : 'Não');
      console.log('[DEBUG] Objeto atualizado com assinatura:', updatedAppointment.id, updatedAppointment.status, updatedAppointment.signature ? 'Tem assinatura' : 'Sem assinatura');
      
      // Atualizar pacotes associados
      await updatePackageSession(updatedAppointment, 'concluido');
      
      // Atualizar serviços pendentes associados
      if (appointmentToUpdate.pending_service_id) {
        await PendingService.update(appointmentToUpdate.pending_service_id, {
          status: 'concluido'
        });
      }
      
      if (onAction) onAction();
      setShowSignatureModal(false);
      setSignature(null);
      setConcludeId(null);
    } catch (error) {
      console.error('Erro ao concluir o agendamento:', error);
      alert('Erro ao concluir o agendamento.');
    }
    setLoadingId(null);
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow text-center text-gray-400 border border-blue-100">
        Nenhum agendamento para hoje.
      </div>
    );
  }

  // Separar agendamentos pendentes e concluídos
  const pendingAppointments = appointments.filter(app => app.status !== 'concluido');
  const completedAppointments = appointments.filter(app => app.status === 'concluido');

  return (
    <>
      {/* Agendamentos Pendentes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-blue-900">Agendamentos Pendentes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pendingAppointments.map(app => {
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 border-blue-400 text-blue-700"
                    onClick={() => setAnamneseModal({ open: true, clientId: app.client_id, clientName: app.client_name })}
                  >
                    Anamnese
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md px-4 py-1"
                    onClick={() => handleConclude(app.id)}
                    disabled={loadingId === app.id}
                  >
                    {loadingId === app.id ? 'Salvando...' : <><Check className="w-4 h-4 mr-1 inline" /> Concluir</>}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Procedimentos Concluídos */}
      {completedAppointments.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Procedimentos Concluídos Hoje
          </h3>
          
          <div className="space-y-3">
            {completedAppointments.map(app => (
              <div 
                key={app.id} 
                className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {format(new Date(app.date), "HH:mm")}
                      </span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        Concluído
                      </span>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {app.client_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {app.service_name}
                    </p>
                    
                    {/* Indicador de Assinatura */}
                    <div className="mt-3 flex items-center gap-2">
                      {app.signature ? (
                        <>
                          <div className="flex items-center gap-1 text-purple-600">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Assinado pelo cliente
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => {
                              setSelectedSignature(app.signature);
                              setShowSignatureViewModal(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver Assinatura
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">
                            Procedimento concluído sem assinatura
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {anamneseModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xl w-full relative max-h-[90vh] overflow-y-auto">
            <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => { setAnamneseModal({ open: false, clientId: null, clientName: null }); setShowEdit(false); }}>Fechar</Button>
            {/* Modal de opções para anamnese existente ou não */}
            <div>
              <h2 className="text-xl font-bold text-blue-900 mb-4">Gerenciar Anamnese</h2>
              {lastAnamnese ? (
                <>
                  <div className="flex gap-2 justify-end mb-4">
                    <Button size="sm" variant="outline" onClick={() => setShowEdit(false)} disabled={!showEdit}>Visualizar</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} disabled={showEdit}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEdit(false)}>Nova Anamnese</Button>
                  </div>
                  {/* Visualização ou edição da última anamnese */}
                  {!showEdit ? (
                    <AnamneseActionCard
                      clientId={anamneseModal.clientId}
                      clientName={anamneseModal.clientName}
                      mode="view"
                      anamneseMode="employee"
                      anamnese={lastAnamnese}
                      onClose={() => { setAnamneseModal({ open: false, clientId: null, clientName: null }); setShowEdit(false); }}
                    />
                  ) : (
                    <AnamneseActionCard
                      clientId={anamneseModal.clientId}
                      clientName={anamneseModal.clientName}
                      mode="edit"
                      anamneseMode="employee"
                      anamnese={lastAnamnese}
                      employeeName={currentEmployee?.name || ''}
                      onClose={() => { setShowEdit(false); setAnamneseModal({ open: false, clientId: null, clientName: null }); }}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="flex gap-2 justify-end mb-4">
                    <Button size="sm" variant="outline" onClick={() => setShowEdit(false)} disabled>Visualizar</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowEdit(false)}>Nova Anamnese</Button>
                  </div>
                  <AnamneseActionCard
                    clientId={anamneseModal.clientId}
                    clientName={anamneseModal.clientName}
                    mode="create"
                    anamneseMode="employee"
                    anamnese={null}
                    employeeName={currentEmployee?.name || ''}
                    onClose={() => setAnamneseModal({ open: false, clientId: null, clientName: null })}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
            <button onClick={() => { setShowSignatureModal(false); setSignature(null); setConcludeId(null); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">X</button>
            <h2 className="text-xl font-bold text-blue-900 mb-4">Assinatura do Cliente</h2>
            <div className="border rounded bg-gray-50 flex flex-col items-center p-2 mb-4">
              <SignatureCanvas
                penColor="#175EA0"
                canvasProps={{ width: 320, height: 100, className: 'rounded bg-white border' }}
                ref={ref => window.signaturePad = ref}
                onEnd={() => setSignature(window.signaturePad.getCanvas().toDataURL('image/png'))}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => { window.signaturePad.clear(); setSignature(null); }}>Limpar</Button>
              </div>
            </div>
            <Button size="md" variant="primary" className="w-full" onClick={handleConfirmSignature} disabled={!signature}>Confirmar</Button>
          </div>
        </div>
      )}
      
      {/* Modal para Visualizar Assinatura */}
      {showSignatureViewModal && selectedSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Assinatura do Cliente
              </h3>
              <button
                onClick={() => {
                  setShowSignatureViewModal(false);
                  setSelectedSignature(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <img 
                src={selectedSignature} 
                alt="Assinatura do cliente" 
                className="w-full max-h-40 object-contain"
              />
            </div>
            
            <div className="mt-4">
              <Button
                onClick={() => {
                  setShowSignatureViewModal(false);
                  setSelectedSignature(null);
                }}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
