import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Download, Share2 } from "lucide-react";
import { ClientPackage } from '@/api/entities';
import { ClientPackageSession } from '@/api/entities';
import { Client } from '@/api/entities';
import { Service } from '@/api/entities';
import { Employee } from '@/api/entities';
import { Receipt } from '@/api/entities';

export default function PackageSessionReceipt({ receiptData, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [clientName, setClientName] = React.useState("");
  const [sessionInfo, setSessionInfo] = React.useState(null);
  const [packageInfo, setPackageInfo] = React.useState(null);
  const [serviceName, setServiceName] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState("");
  
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (receiptData.client_id) {
          const clientData = await Client.filter({ id: receiptData.client_id });
          if (clientData && clientData.length > 0) {
            setClientName(clientData[0].name);
          }
        }
        
        if (receiptData.client_package_id) {
          const packageData = await ClientPackage.filter({ id: receiptData.client_package_id });
          if (packageData && packageData.length > 0) {
            setPackageInfo(packageData[0]);
          }
        }
        
        if (receiptData.client_package_session_id) {
          const sessionData = await ClientPackageSession.filter({ id: receiptData.client_package_session_id });
          if (sessionData && sessionData.length > 0) {
            setSessionInfo(sessionData[0]);
            
            // Carregar nome do serviço
            if (sessionData[0].service_id) {
              const serviceData = await Service.filter({ id: sessionData[0].service_id });
              if (serviceData && serviceData.length > 0) {
                setServiceName(serviceData[0].name);
              }
            }
            
            // Carregar nome do profissional
            if (sessionData[0].employee_id) {
              const employeeData = await Employee.filter({ id: sessionData[0].employee_id });
              if (employeeData && employeeData.length > 0) {
                setEmployeeName(employeeData[0].name);
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do recibo:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [receiptData]);
  
  const handlePrint = () => {
    window.print();
    
    // Marcar recibo como impresso
    if (receiptData.id) {
      Receipt.update(receiptData.id, { is_printed: true });
    }
  };
  
  const handleDownload = () => {
    // Implementação básica, em produção usaria uma biblioteca como jsPDF
    const content = document.getElementById('session-receipt-content');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Recibo de Sessão</title>');
    printWindow.document.write('<style>body { font-family: Arial; padding: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content.innerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    
    // Marcar recibo como baixado
    if (receiptData.id) {
      Receipt.update(receiptData.id, { is_printed: true });
    }
  };
  
  const handleShare = async () => {
    // Em uma implementação real, isso poderia enviar por email ou WhatsApp
    alert("Funcionalidade de compartilhamento ainda não implementada");
    
    // Marcar recibo como enviado
    if (receiptData.id) {
      Receipt.update(receiptData.id, { is_sent: true });
    }
  };
  
  if (loading) {
    return (
      <Card className="max-w-3xl mx-auto p-8">
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Carregando informações do recibo...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const getStatusText = (status) => {
    const statusMap = {
      'agendada': 'Agendada',
      'realizada': 'Realizada',
      'cancelada': 'Cancelada',
      'remarcada': 'Remarcada'
    };
    return statusMap[status] || status;
  };
  
  return (
    <Card className="max-w-3xl mx-auto mb-8">
      <CardContent className="p-8" id="session-receipt-content">
        <div className="flex flex-col items-center border-b pb-6 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">RECIBO - SESSÃO DE PACOTE</h1>
          <p className="text-gray-500">Nº {receiptData.receipt_number}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Cliente</h2>
            <p>{clientName}</p>
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Data</h2>
            <p>{format(new Date(receiptData.issue_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">Detalhes da Sessão</h2>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Pacote:</strong> {packageInfo?.package_snapshot?.name || "Pacote"}</p>
                <p><strong>Serviço:</strong> {serviceName}</p>
                <p><strong>Profissional:</strong> {employeeName}</p>
              </div>
              
              <div>
                <p><strong>Status:</strong> <span className={
                  sessionInfo?.status === 'realizada' ? 'text-green-600' : 
                  sessionInfo?.status === 'cancelada' ? 'text-red-600' : 
                  'text-blue-600'
                }>{getStatusText(sessionInfo?.status)}</span></p>
                
                <p><strong>Data da Sessão:</strong> {sessionInfo ? format(new Date(sessionInfo.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "--"}</p>
                
                {sessionInfo?.status === 'remarcada' && sessionInfo.rescheduled_to && (
                  <p><strong>Remarcada para:</strong> {format(new Date(sessionInfo.rescheduled_to), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                )}
                
                {sessionInfo?.cancellation_reason && (
                  <p><strong>Motivo:</strong> {sessionInfo.cancellation_reason}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">Progresso do Pacote</h2>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between mb-2">
              <span>Sessões Utilizadas:</span>
              <span className="font-medium">{receiptData.details?.sessions_used || 0} de {receiptData.details?.total_sessions || 0}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ 
                  width: `${receiptData.details?.sessions_used && receiptData.details?.total_sessions 
                    ? (receiptData.details.sessions_used / receiptData.details.total_sessions) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
            
            <div className="mt-4">
              <p><strong>Sessões Restantes:</strong> {receiptData.details?.sessions_remaining || 0}</p>
              <p><strong>Validade do Pacote:</strong> até {packageInfo ? format(new Date(packageInfo.expiration_date), "dd/MM/yyyy", { locale: ptBR }) : "--"}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-6 mt-6">
          <p className="text-center text-sm text-gray-500">
            Este recibo comprova a {sessionInfo?.status === 'realizada' ? 'realização' : 'agendamento'} de uma sessão do pacote adquirido.
            {sessionInfo?.status === 'cancelada' && " Esta sessão foi cancelada e não foi contabilizada como utilizada no pacote."}
            {sessionInfo?.status === 'remarcada' && " Esta sessão foi remarcada para nova data."}
          </p>
        </div>
      </CardContent>
      
      <div className="p-4 bg-gray-50 border-t rounded-b-lg flex justify-end space-x-2">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Salvar PDF
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </Card>
  );
}