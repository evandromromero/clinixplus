import { ClientSubscription, FinancialTransaction, CompanySettings } from '@/firebase/entities';
import MercadoPagoService from './mercadoPagoService';

/**
 * Serviço para verificar e atualizar o status das assinaturas
 * Funciona tanto localmente quanto em produção
 */
class SubscriptionStatusChecker {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5 minutos em milissegundos
    this.intervalId = null;
  }

  /**
   * Inicia a verificação periódica de status das assinaturas
   * Útil para ambiente local onde webhooks não funcionam
   */
  startPeriodicCheck() {
    if (this.isRunning) return;
    
    console.log('Iniciando verificação periódica de status das assinaturas');
    this.isRunning = true;
    
    // Executar imediatamente a primeira vez
    this.checkPendingSubscriptions();
    
    // Configurar intervalo para verificações periódicas
    this.intervalId = setInterval(() => {
      this.checkPendingSubscriptions();
    }, this.checkInterval);
  }

  /**
   * Para a verificação periódica
   */
  stopPeriodicCheck() {
    if (!this.isRunning) return;
    
    console.log('Parando verificação periódica de status das assinaturas');
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Verifica todas as assinaturas pendentes
   */
  async checkPendingSubscriptions() {
    try {
      console.log('Verificando assinaturas pendentes...');
      
      // Inicializar o serviço do Mercado Pago
      const settings = await this.initializeMercadoPago();
      if (!settings) {
        console.error('Não foi possível inicializar o Mercado Pago');
        return;
      }
      
      // Buscar todas as assinaturas
      const allSubscriptions = await ClientSubscription.list();
      
      // Filtrar manualmente as assinaturas pendentes
      const pendingSubscriptions = allSubscriptions.filter(subscription => 
        (subscription.status === 'pendente' || subscription.status === 'processando') && 
        subscription.mercadopago_payment_id
      );
      
      console.log(`Encontradas ${pendingSubscriptions?.length || 0} assinaturas pendentes`);
      
      // Verificar cada assinatura
      if (pendingSubscriptions && pendingSubscriptions.length > 0) {
        for (const subscription of pendingSubscriptions) {
          await this.checkSubscriptionStatus(subscription);
        }
      }
      
      console.log('Verificação de assinaturas pendentes concluída');
    } catch (error) {
      console.error('Erro ao verificar assinaturas pendentes:', error);
    }
  }

  /**
   * Verifica o status de uma assinatura específica
   * @param {Object} subscription - Assinatura a ser verificada
   */
  async checkSubscriptionStatus(subscription) {
    try {
      console.log(`Verificando status da assinatura: ${subscription.id}`);
      
      // Se não tiver ID de pagamento, não há o que verificar
      if (!subscription.mercadopago_payment_id) {
        console.log(`Assinatura ${subscription.id} não tem ID de pagamento`);
        return;
      }
      
      // Obter informações do pagamento
      const paymentInfo = await MercadoPagoService.getPaymentInfo(subscription.mercadopago_payment_id);
      if (!paymentInfo) {
        console.error(`Não foi possível obter informações do pagamento: ${subscription.mercadopago_payment_id}`);
        return;
      }
      
      console.log(`Status do pagamento: ${paymentInfo.status}`);
      
      // Atualizar status da assinatura
      await this.updateSubscriptionStatus(subscription.id, paymentInfo);
    } catch (error) {
      console.error(`Erro ao verificar status da assinatura ${subscription.id}:`, error);
    }
  }

  /**
   * Inicializa o serviço do Mercado Pago com as configurações da empresa
   * @returns {Object|null} Configurações da empresa ou null em caso de erro
   */
  async initializeMercadoPago() {
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
        console.log('Mercado Pago service initialized for status check');
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
  async updateSubscriptionStatus(subscriptionId, paymentInfo) {
    try {
      // Obter a assinatura
      const subscription = await ClientSubscription.get(subscriptionId);
      if (!subscription) {
        console.error('Assinatura não encontrada:', subscriptionId);
        return;
      }
      
      // Se o status já foi atualizado, não fazer nada
      if (subscription.mercadopago_status === paymentInfo.status) {
        console.log(`Status da assinatura ${subscriptionId} já está atualizado: ${paymentInfo.status}`);
        return;
      }
      
      console.log(`Atualizando status da assinatura ${subscriptionId} de ${subscription.mercadopago_status} para ${paymentInfo.status}`);
      
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
      await this.updateFinancialTransaction(subscription, paymentInfo, transactionStatus);
      
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
  async updateFinancialTransaction(subscription, paymentInfo, transactionStatus) {
    try {
      // Buscar todas as transações
      const allTransactions = await FinancialTransaction.list();
      
      // Filtrar transações relacionadas a esta assinatura
      const transactions = allTransactions.filter(transaction => 
        transaction.reference_id === subscription.id && 
        transaction.type === 'receita' && 
        transaction.category === 'assinatura'
      );
      
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

  /**
   * Verifica uma assinatura específica pelo ID
   * @param {string} subscriptionId - ID da assinatura
   */
  async checkSubscriptionById(subscriptionId) {
    try {
      // Inicializar o serviço do Mercado Pago
      const settings = await this.initializeMercadoPago();
      if (!settings) {
        console.error('Não foi possível inicializar o Mercado Pago');
        return false;
      }
      
      // Buscar a assinatura
      const subscription = await ClientSubscription.get(subscriptionId);
      if (!subscription) {
        console.error('Assinatura não encontrada:', subscriptionId);
        return false;
      }
      
      // Verificar o status
      await this.checkSubscriptionStatus(subscription);
      return true;
    } catch (error) {
      console.error(`Erro ao verificar assinatura ${subscriptionId}:`, error);
      return false;
    }
  }
}

// Exporta uma instância única do serviço
export default new SubscriptionStatusChecker();
