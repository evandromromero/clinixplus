import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Download, Share2 } from "lucide-react";
import { ClientPackage } from '@/api/entities';
import { Client } from '@/api/entities';
import { Receipt } from '@/api/entities';

export default function PackagePurchaseReceipt({ receiptData, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [clientName, setClientName] = React.useState("");
  const [packageInfo, setPackageInfo] = React.useState(null);
  const [clientInfo, setClientInfo] = React.useState(null);
  
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (receiptData.client_id) {
          const clientData = await Client.filter({ id: receiptData.client_id });
          if (clientData && clientData.length > 0) {
            setClientInfo(clientData[0]);
            setClientName(clientData[0].name);
          }
        }
        
        if (receiptData.client_package_id) {
          const packageData = await ClientPackage.filter({ id: receiptData.client_package_id });
          if (packageData && packageData.length > 0) {
            setPackageInfo(packageData[0]);
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
    const content = document.getElementById('receipt-content');
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Recibo de Pacote</title>');
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
  
  return (
    <Card className="max-w-3xl mx-auto mb-8">
      <CardContent className="p-8" id="receipt-content">
        <div className="flex flex-col items-center border-b pb-6 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">RECIBO - COMPRA DE PACOTE</h1>
          <p className="text-gray-500">Nº {receiptData.receipt_number}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Dados do Cliente</h2>
            <p><strong>Nome:</strong> {clientName}</p>
            {clientInfo && clientInfo.cpf && <p><strong>CPF:</strong> {clientInfo.cpf}</p>}
            {clientInfo && clientInfo.email && <p><strong>Email:</strong> {clientInfo.email}</p>}
          </div>
          
          <div>
            <h2 className="font-semibold text-gray-700 mb-2">Informações da Compra</h2>
            <p><strong>Data:</strong> {format(new Date(receiptData.issue_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p><strong>Tipo:</strong> Compra de Pacote</p>
            <p><strong>Valor Total:</strong> R$ {(receiptData.amount || 0).toFixed(2)}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-2">Detalhes do Pacote</h2>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="font-medium text-lg">{receiptData.details?.package_name || "Pacote"}</p>
            
            {packageInfo && (
              <>
                <p className="text-sm text-gray-600 mt-2">{packageInfo.package_snapshot?.description || ""}</p>
                
                <div className="mt-4">
                  <p><strong>Total de Sessões:</strong> {receiptData.details?.total_sessions || packageInfo.total_sessions}</p>
                  <p><strong>Validade:</strong> até {format(new Date(packageInfo.expiration_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              </>
            )}
            
            {receiptData.details?.services && receiptData.details.services.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Serviços Incluídos:</h3>
                <ul className="list-disc list-inside">
                  {receiptData.details.services.map((service, index) => (
                    <li key={index} className="text-sm">
                      {service.name} ({service.quantity}x)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {receiptData.payment_methods && receiptData.payment_methods.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-2">Forma de Pagamento</h2>
            <ul className="list-disc list-inside">
              {receiptData.payment_methods.map((payment, index) => (
                <li key={index}>
                  {payment.method}: R$ {payment.amount.toFixed(2)}
                  {payment.installments > 1 ? ` (${payment.installments}x)` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="border-t pt-6 mt-6">
          <p className="text-center text-sm text-gray-500">
            Este recibo é um comprovante da aquisição do pacote. As sessões devem ser agendadas previamente.
            O pacote tem validade de acordo com os termos contratuais e não é reembolsável após o início das sessões.
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