import { ClientSubscription, FinancialTransaction, CompanySettings } from '@/firebase/entities';
import MercadoPagoService from '@/services/mercadoPagoService';

/**
 * Processa webhooks do Mercado Pago
 * Este endpoint recebe notificações do Mercado Pago sobre mudanças no status de pagamentos
 * e atualiza as assinaturas correspondentes no sistema
 * 
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 */
export async function handleMercadoPagoWebhook(req, res) {
  try {
    console.log('Webhook do Mercado Pago recebido:', req.body);
    
    // Verificar se é uma notificação válida
    if (!req.body || !req.body.data || !req.body.type) {
      console.error('Payload de webhook inválido');
      return res.status(400).json({ error: 'Payload inválido' });
    }
    
    // Verificar o tipo de notificação
    if (req.body.type !== 'payment' && req.body.type !== 'merchant_order') {
      console.log(`Ignorando notificação do tipo: ${req.body.type}`);
      return res.status(200).json({ message: 'Notificação recebida, mas não processada' });
    }
    
    // Obter o ID do recurso (pagamento ou pedido)
    const resourceId = req.body.data.id;
    
    // Inicializar o serviço do Mercado Pago
    const settings = await initializeMercadoPago();
    if (!settings) {
      return res.status(500).json({ error: 'Falha ao inicializar Mercado Pago' });
    }
    
    // Obter detalhes do pagamento
    const paymentInfo = await MercadoPagoService.getPaymentInfo(resourceId);
    if (!paymentInfo) {
      console.error('Não foi possível obter informações do pagamento:', resourceId);
      return res.status(404).json({ error: 'Informações do pagamento não encontradas' });
    }
    
    console.log('Informações do pagamento:', paymentInfo);
    
    // Obter a referência externa (ID da assinatura)
    const subscriptionId = paymentInfo.external_reference;
    if (!subscriptionId) {
      console.error('ID da assinatura não encontrado na referência externa');
      return res.status(400).json({ error: 'Referência externa não encontrada' });
    }
    
    // Atualizar a assinatura com base no status do pagamento
    await updateSubscriptionStatus(subscriptionId, paymentInfo);
    
    return res.status(200).json({ message: 'Webhook processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * Inicializa o serviço do Mercado Pago com as configurações da empresa
 * @returns {Object|null} Configurações da empresa ou null em caso de erro
 */
async function initializeMercadoPago() {
  try {
    const settingsList = await CompanySettings.list();
    if (!settingsList || settingsList.length === 0) {
      console.error('Configurações da empresa não encontradas');
      return null;
    }
    
    const settings = settingsList[0];
    
    // Garantir que payment_settings exista
    const loadedSettings = {
      ...settings,
      payment_settings: settings.payment_settings || {
        mercadopago_enabled: false,
        mercadopago_public_key: "",
        mercadopago_access_token: "",
        mercadopago_client_id: "",
        mercadopago_client_secret: "",
        mercadopago_sandbox: true
      }
    };
    
    // Inicializar o serviço do Mercado Pago
    if (loadedSettings.payment_settings.mercadopago_enabled) {
      MercadoPagoService.initialize(loadedSettings.payment_settings);
      console.log('Mercado Pago service initialized for webhook');
      return loadedSettings;
    } else {
      console.error('Mercado Pago não está habilitado nas configurações');
      return null;
    }
  } catch (error) {
    console.error('Erro ao carregar configurações da empresa:', error);
    return null;
  }
}

/**
 * Atualiza o status da assinatura com base nas informações do pagamento
 * @param {string} subscriptionId - ID da assinatura
 * @param {Object} paymentInfo - Informações do pagamento
 */
async function updateSubscriptionStatus(subscriptionId, paymentInfo) {
  try {
    // Obter a assinatura
    const subscription = await ClientSubscription.get(subscriptionId);
    if (!subscription) {
      console.error('Assinatura não encontrada:', subscriptionId);
      return;
    }
    
    console.log('Assinatura encontrada:', subscription);
    
    // Mapear status do Mercado Pago para status da assinatura
    let subscriptionStatus = subscription.status;
    let transactionStatus = 'pendente';
    
    switch (paymentInfo.status) {
      case 'approved':
        subscriptionStatus = 'ativa';
        transactionStatus = 'pago';
        break;
      case 'pending':
        subscriptionStatus = 'pendente';
        transactionStatus = 'pendente';
        break;
      case 'in_process':
        subscriptionStatus = 'pendente';
        transactionStatus = 'processando';
        break;
      case 'rejected':
        subscriptionStatus = 'cancelada';
        transactionStatus = 'cancelado';
        break;
      case 'refunded':
        subscriptionStatus = 'cancelada';
        transactionStatus = 'reembolsado';
        break;
      case 'cancelled':
        subscriptionStatus = 'cancelada';
        transactionStatus = 'cancelado';
        break;
      case 'in_mediation':
        subscriptionStatus = 'pendente';
        transactionStatus = 'em_mediacao';
        break;
      case 'charged_back':
        subscriptionStatus = 'cancelada';
        transactionStatus = 'estornado';
        break;
      default:
        console.log(`Status de pagamento não mapeado: ${paymentInfo.status}`);
        break;
    }
    
    // Atualizar a assinatura
    const updateData = {
      status: subscriptionStatus,
      mercadopago_status: paymentInfo.status,
      mercadopago_payment_id: paymentInfo.id,
      last_payment_date: new Date().toISOString(),
      payment_history: [
        ...(subscription.payment_history || []),
        {
          date: new Date().toISOString(),
          status: paymentInfo.status,
          payment_id: paymentInfo.id,
          amount: paymentInfo.transaction_amount
        }
      ]
    };
    
    await ClientSubscription.update(subscriptionId, updateData);
    console.log('Assinatura atualizada com sucesso:', subscriptionId);
    
    // Atualizar ou criar transação financeira
    await updateFinancialTransaction(subscription, paymentInfo, transactionStatus);
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status da assinatura:', error);
    return false;
  }
}

/**
 * Atualiza ou cria uma transação financeira com base nas informações do pagamento
 * @param {Object} subscription - Assinatura
 * @param {Object} paymentInfo - Informações do pagamento
 * @param {string} transactionStatus - Status da transação
 */
async function updateFinancialTransaction(subscription, paymentInfo, transactionStatus) {
  try {
    // Buscar transação existente
    const transactions = await FinancialTransaction.query({
      where: [
        ['reference_id', '==', subscription.id],
        ['type', '==', 'receita'],
        ['category', '==', 'assinatura']
      ]
    });
    
    if (transactions && transactions.length > 0) {
      // Atualizar transação existente
      const transaction = transactions[0];
      await FinancialTransaction.update(transaction.id, {
        status: transactionStatus,
        payment_date: transactionStatus === 'pago' ? new Date().toISOString() : null,
        payment_method: 'mercado_pago',
        external_reference: paymentInfo.id
      });
      console.log('Transação financeira atualizada:', transaction.id);
    } else {
      // Criar nova transação
      await FinancialTransaction.create({
        type: 'receita',
        category: 'assinatura',
        description: `Assinatura ${subscription.plan_name || 'Plano'} - ${subscription.billing_cycle}`,
        amount: paymentInfo.transaction_amount,
        payment_method: 'mercado_pago',
        status: transactionStatus,
        due_date: subscription.next_billing_date,
        payment_date: transactionStatus === 'pago' ? new Date().toISOString() : null,
        client_id: subscription.client_id,
        reference_id: subscription.id,
        external_reference: paymentInfo.id
      });
      console.log('Nova transação financeira criada para assinatura:', subscription.id);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar transação financeira:', error);
    return false;
  }
}
