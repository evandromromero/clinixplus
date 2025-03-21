import { format } from 'date-fns';
import { Receipt } from '@/api/entities';
import { ClientPackage } from '@/api/entities';
import { ClientPackageSession } from '@/api/entities';

/**
 * Gera um número de recibo único no formato YYYYMMDD-XXXX
 */
export const generateReceiptNumber = () => {
  const today = new Date();
  const dateStr = format(today, 'yyyyMMdd');
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  
  return `${dateStr}-${randomStr}`;
};

/**
 * Gera um recibo para a compra de um pacote
 */
export const generatePackagePurchaseReceipt = async (clientPackage, saleData) => {
  if (!clientPackage || !saleData) {
    console.error("Dados insuficientes para gerar recibo de compra de pacote");
    return null;
  }
  
  try {
    // Obter informações detalhadas do pacote
    const packageSnapshot = clientPackage.package_snapshot || {};
    
    // Preparar dados do recibo
    const receiptData = {
      receipt_number: generateReceiptNumber(),
      type: "venda_pacote",
      client_id: clientPackage.client_id,
      employee_id: saleData.employee_id,
      client_package_id: clientPackage.id,
      sale_id: saleData.id,
      issue_date: new Date().toISOString(),
      details: {
        package_name: packageSnapshot.name || "Pacote",
        total_sessions: clientPackage.total_sessions,
        sessions_used: 0,
        sessions_remaining: clientPackage.total_sessions,
        expiration_date: clientPackage.expiration_date,
        services: packageSnapshot.services?.map(s => ({
          name: s.name || "Serviço",
          quantity: s.quantity || 1,
          price: s.price || 0
        })) || []
      },
      amount: saleData.total_amount,
      payment_methods: saleData.payment_methods?.map(pm => ({
        method: pm.method_name || "Não especificado", 
        amount: pm.amount || 0,
        installments: pm.installments || 1
      })) || [],
      is_sent: false,
      is_printed: false
    };
    
    // Salvar o recibo no banco de dados
    const receipt = await Receipt.create(receiptData);
    return receipt;
  } catch (error) {
    console.error("Erro ao gerar recibo de compra de pacote:", error);
    return null;
  }
};

/**
 * Gera um recibo para uma sessão de pacote (agendamento, realização, cancelamento ou remarcação)
 */
export const generatePackageSessionReceipt = async (clientPackageSession) => {
  if (!clientPackageSession) {
    console.error("Dados insuficientes para gerar recibo de sessão de pacote");
    return null;
  }
  
  try {
    // Obter informações do pacote do cliente
    const clientPackageData = await ClientPackage.filter({ id: clientPackageSession.client_package_id });
    if (!clientPackageData || clientPackageData.length === 0) {
      console.error("Pacote do cliente não encontrado");
      return null;
    }
    
    const clientPackage = clientPackageData[0];
    
    // Preparar dados do recibo
    const receiptData = {
      receipt_number: generateReceiptNumber(),
      type: "sessao_pacote",
      client_id: clientPackageSession.client_id,
      employee_id: clientPackageSession.employee_id,
      client_package_id: clientPackageSession.client_package_id,
      client_package_session_id: clientPackageSession.id,
      appointment_id: clientPackageSession.appointment_id,
      issue_date: new Date().toISOString(),
      details: {
        package_name: clientPackage.package_snapshot?.name || "Pacote",
        service_name: clientPackageSession.service_name || "Serviço",
        total_sessions: clientPackage.total_sessions,
        sessions_used: clientPackage.sessions_used,
        sessions_remaining: clientPackage.total_sessions - clientPackage.sessions_used,
        expiration_date: clientPackage.expiration_date,
        session_status: clientPackageSession.status,
        original_date: clientPackageSession.scheduled_date,
        next_session_date: clientPackageSession.rescheduled_to || clientPackageSession.date
      },
      amount: 0, // Sessão do pacote não tem valor individual
      is_sent: false,
      is_printed: false
    };
    
    // Salvar o recibo no banco de dados
    const receipt = await Receipt.create(receiptData);
    return receipt;
  } catch (error) {
    console.error("Erro ao gerar recibo de sessão de pacote:", error);
    return null;
  }
};