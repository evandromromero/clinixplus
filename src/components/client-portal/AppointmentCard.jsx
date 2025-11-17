import React, { useState, useRef } from 'react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Clock, User, ChevronLeft, ChevronRight, FileText, AlertTriangle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignatureCanvas from 'react-signature-canvas';
import { Appointment, ClientPackage } from '@/firebase/entities';
import { toast } from "@/components/ui/use-toast";
import { useSignatureModal } from '@/components/SignatureModal';

export default function AppointmentCard({ appointments = [], onRefresh }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(appointments.length / ITEMS_PER_PAGE);
  
  // Estados para assinatura
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const signatureCanvasRef = useRef(null);
  const { openModal } = useSignatureModal();

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

  // Função para abrir modal de assinatura
  const handleOpenSignature = (appointment) => {
    setSelectedAppointment(appointment);
    setSignature(null);
    setShowSignatureModal(true);
  };

  // Função para atualizar histórico do pacote com assinatura
  const updatePackageSessionSignature = async (appointmentId, clientId, signature) => {
    try {
      console.log('[ClientPortal] Atualizando histórico do pacote com assinatura...');
      
      // Buscar pacotes do cliente
      const clientPackagesData = await ClientPackage.list();
      const clientPkgs = clientPackagesData.filter(cp => cp.client_id === clientId);
      
      console.log('[ClientPortal] Pacotes encontrados:', clientPkgs.length);
      
      // Procurar o pacote que tem este agendamento no histórico
      for (const pkg of clientPkgs) {
        if (pkg.session_history && Array.isArray(pkg.session_history)) {
          const sessionIndex = pkg.session_history.findIndex(
            s => s.appointment_id === appointmentId
          );
          
          if (sessionIndex >= 0) {
            console.log('[ClientPortal] Sessão encontrada no pacote:', pkg.id);
            
            // Atualizar assinatura na sessão
            const updatedHistory = [...pkg.session_history];
            updatedHistory[sessionIndex] = {
              ...updatedHistory[sessionIndex],
              signature: signature
            };
            
            // Salvar no Firebase
            await ClientPackage.update(pkg.id, {
              session_history: updatedHistory
            });
            
            console.log('[ClientPortal] Histórico do pacote atualizado com sucesso!');
            break;
          }
        }
      }
    } catch (error) {
      console.error('[ClientPortal] Erro ao atualizar histórico do pacote:', error);
      throw error;
    }
  };

  // Função para salvar assinatura
  const handleSaveSignature = async () => {
    if (!signature) {
      toast({
        title: "Atenção",
        description: "Por favor, assine no espaço indicado.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      console.log('[ClientPortal] Salvando assinatura do cliente...');
      
      // 1. ATUALIZAR AGENDAMENTO
      await Appointment.update(selectedAppointment.id, {
        signature: signature
      });
      console.log('[ClientPortal] Agendamento atualizado com assinatura');
      
      // 2. ATUALIZAR HISTÓRICO DO PACOTE
      await updatePackageSessionSignature(
        selectedAppointment.id, 
        selectedAppointment.client_id, 
        signature
      );
      
      // 3. RECARREGAR DADOS
      if (onRefresh) {
        await onRefresh();
      }
      
      // 4. FECHAR MODAL
      setShowSignatureModal(false);
      setSignature(null);
      setSelectedAppointment(null);
      
      // 5. FEEDBACK
      toast({
        title: "Sucesso!",
        description: "Sua assinatura foi registrada com sucesso.",
      });
    } catch (error) {
      console.error('[ClientPortal] Erro ao salvar assinatura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua assinatura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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
            
            {/* Indicador de Assinatura para Procedimentos Concluídos */}
            {appointment.status === 'concluido' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {appointment.signature ? (
                  // TEM ASSINATURA
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Procedimento assinado
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={() => openModal(appointment.signature)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver Assinatura
                    </Button>
                  </div>
                ) : (
                  // SEM ASSINATURA - PODE ASSINAR
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Aguardando sua assinatura
                      </span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-[#3475B8] hover:bg-[#2a5d94] text-white"
                      onClick={() => handleOpenSignature(appointment)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Assinar Agora
                    </Button>
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
      
      {/* Modal de Assinatura */}
      {showSignatureModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            {/* Cabeçalho */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Sua Assinatura
                </h3>
                <button
                  onClick={() => {
                    setShowSignatureModal(false);
                    setSignature(null);
                    setSelectedAppointment(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  disabled={isSaving}
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Serviço:</strong> {selectedAppointment.service_name}</p>
                <p><strong>Data:</strong> {format(new Date(selectedAppointment.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p><strong>Profissional:</strong> {selectedAppointment.employee_name}</p>
              </div>
            </div>
            
            {/* Canvas de Assinatura */}
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-3 font-medium">
                Assine no espaço abaixo:
              </p>
              <div className="border-2 border-gray-300 rounded-lg bg-gray-50 p-3">
                <SignatureCanvas
                  ref={signatureCanvasRef}
                  penColor="#175EA0"
                  canvasProps={{ 
                    width: 450, 
                    height: 150, 
                    className: 'rounded bg-white border border-gray-200 w-full' 
                  }}
                  onEnd={() => {
                    if (signatureCanvasRef.current) {
                      const sig = signatureCanvasRef.current.getCanvas().toDataURL('image/png');
                      setSignature(sig);
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  if (signatureCanvasRef.current) {
                    signatureCanvasRef.current.clear();
                    setSignature(null);
                  }
                }}
                disabled={isSaving}
              >
                Limpar Assinatura
              </Button>
            </div>
            
            {/* Botões */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSignatureModal(false);
                  setSignature(null);
                  setSelectedAppointment(null);
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-[#3475B8] hover:bg-[#2a5d94] text-white"
                onClick={handleSaveSignature}
                disabled={!signature || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="mr-2">Salvando...</span>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  </>
                ) : (
                  'Confirmar Assinatura'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}