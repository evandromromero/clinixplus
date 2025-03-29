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
      
      // Tentar buscar assinaturas pendentes via ClientSubscription
      let pendingSubscriptions = [];
      
      try {
        // Buscar todas as assinaturas
        const allSubscriptions = await ClientSubscription.list();
        console.log('Total de assinaturas encontradas:', allSubscriptions.length);
        
        // Filtrar assinaturas pendentes com um filtro menos restritivo
        pendingSubscriptions = allSubscriptions.filter(sub => {
          // Verificar se a assinatura tem um ID válido
          const hasValidId = sub && sub.id;
          
          // Verificar se a assinatura está pendente
          const isPending = 
            (sub.status === 'pendente' || 
             sub.mercadopago_status === 'pending' || 
             !sub.mercadopago_status);
          
          return hasValidId && isPending;
        });
        
        console.log(`${pendingSubscriptions.length} assinaturas pendentes encontradas via ClientSubscription`);
      } catch (listError) {
        console.error('Erro ao listar assinaturas via ClientSubscription:', listError);
        
        // Fallback: buscar diretamente no Firestore
        try {
          const { db } = await import('@/firebase/config');
          const { collection, getDocs } = await import('firebase/firestore');
          
          // Buscar todas as assinaturas (sem filtro para garantir que encontramos todas)
          const subscriptionsRef = collection(db, 'client_subscriptions');
          const querySnapshot = await getDocs(subscriptionsRef);
          
          pendingSubscriptions = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Usar o mesmo critério de filtragem que acima
            if (doc.id && (data.status === 'pendente' || data.mercadopago_status === 'pending' || !data.mercadopago_status)) {
              pendingSubscriptions.push({
                id: doc.id,
                ...data
              });
            }
          });
          
          console.log(`${pendingSubscriptions.length} assinaturas pendentes encontradas via Firestore`);
        } catch (firestoreError) {
          console.error('Erro ao buscar assinaturas pendentes no Firestore:', firestoreError);
          return;
        }
      }
      
      // Verificar cada assinatura
      if (pendingSubscriptions && pendingSubscriptions.length > 0) {
        // Registrar as assinaturas para debug
        console.log('Assinaturas pendentes a serem verificadas:', 
          pendingSubscriptions.map(sub => ({
            id: sub.id,
            status: sub.status,
            mercadopago_status: sub.mercadopago_status,
            mercadopago_payment_id: sub.mercadopago_payment_id
          }))
        );
        
        for (const subscription of pendingSubscriptions) {
          // Verificação básica apenas para garantir que a assinatura tem um ID
          if (subscription && subscription.id) {
            await this.checkSubscriptionStatus(subscription);
          } else {
            console.error('Assinatura inválida encontrada na lista de pendentes:', subscription);
          }
        }
      } else {
        console.log('Nenhuma assinatura pendente encontrada');
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
      // Verificar se a assinatura é válida
      if (!subscription || !subscription.id) {
        console.error('Assinatura inválida ou sem ID');
        return;
      }
      
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
      console.error(`Erro ao verificar status da assinatura ${subscription?.id || 'desconhecida'}:`, error);
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
   * Atualiza o status de uma assinatura com base nas informações do pagamento
   * @param {string} subscriptionId - ID da assinatura
   * @param {Object} paymentInfo - Informações do pagamento
   * @returns {boolean} - Sucesso da operação
   */
  async updateSubscriptionStatus(subscriptionId, paymentInfo) {
    try {
      // Verificar se o ID da assinatura é válido
      if (!subscriptionId) {
        console.error('ID de assinatura inválido ou não fornecido');
        return false;
      }
      
      console.log(`Atualizando status da assinatura ${subscriptionId} com base no pagamento ${paymentInfo.id}`);
      
      // Buscar a assinatura
      let subscription;
      
      try {
        subscription = await ClientSubscription.get(subscriptionId);
        if (!subscription) {
          console.error(`Assinatura não encontrada: ${subscriptionId}`);
          return false;
        }
      } catch (getError) {
        console.error(`Erro ao buscar assinatura via ClientSubscription: ${getError.message}`);
        
        // Tentar buscar diretamente no Firestore
        try {
          const { db } = await import('@/firebase/config');
          const { doc, getDoc } = await import('firebase/firestore');
          
          // Verificar se o caminho do documento é válido
          if (typeof subscriptionId !== 'string' || subscriptionId.trim() === '') {
            console.error('ID de assinatura inválido para Firestore:', subscriptionId);
            return false;
          }
          
          const subscriptionRef = doc(db, 'client_subscriptions', subscriptionId);
          const subscriptionSnap = await getDoc(subscriptionRef);
          
          if (!subscriptionSnap.exists()) {
            console.error(`Assinatura não encontrada no Firestore: ${subscriptionId}`);
            return false;
          }
          
          subscription = {
            id: subscriptionId,
            ...subscriptionSnap.data()
          };
        } catch (firestoreError) {
          console.error(`Erro ao buscar assinatura no Firestore: ${firestoreError.message}`);
          return false;
        }
      }
      
      // Mapear o status do pagamento para o status da assinatura
      let subscriptionStatus = subscription.status;
      let transactionStatus = 'pendente';
      
      switch(paymentInfo.status) {
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
          subscriptionStatus = 'rejeitada';
          transactionStatus = 'rejeitado';
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
        case 'error':
          // Não alterar o status da assinatura em caso de erro na verificação
          console.log(`Erro na verificação do pagamento: ${paymentInfo.error_message}`);
          return false;
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
            amount: paymentInfo.transaction_amount || 0,
            details: paymentInfo.status_detail || ''
          }
        ]
      };
      
      // Tentar atualizar via ClientSubscription primeiro
      try {
        await ClientSubscription.update(subscriptionId, updateData);
        console.log('Assinatura atualizada com sucesso via ClientSubscription:', subscriptionId);
      } catch (updateError) {
        console.error(`Erro ao atualizar assinatura via ClientSubscription: ${updateError.message}`);
        
        // Fallback: atualizar diretamente no Firestore
        try {
          const { db } = await import('@/firebase/config');
          const { doc, updateDoc } = await import('firebase/firestore');
          
          const subscriptionRef = doc(db, 'client_subscriptions', subscriptionId);
          await updateDoc(subscriptionRef, updateData);
          console.log('Assinatura atualizada com sucesso via Firestore:', subscriptionId);
        } catch (firestoreError) {
          console.error(`Erro ao atualizar assinatura no Firestore: ${firestoreError.message}`);
          return false;
        }
      }
      
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
   * @returns {boolean} - Sucesso da operação
   */
  async updateFinancialTransaction(subscription, paymentInfo, transactionStatus) {
    try {
      // Verificar se a assinatura é válida
      if (!subscription || !subscription.id) {
        console.error('Assinatura inválida para atualizar transação financeira');
        return false;
      }
      
      // Verificar se o pagamento é válido
      if (!paymentInfo || !paymentInfo.id) {
        console.error('Informações de pagamento inválidas para atualizar transação financeira');
        return false;
      }
      
      // Buscar transações existentes para esta assinatura
      const existingTransactions = await FinancialTransaction.list({
        reference_id: subscription.id,
        external_reference: paymentInfo.id
      });
      
      // Se já existe uma transação, atualizar o status
      if (existingTransactions && existingTransactions.length > 0) {
        const transaction = existingTransactions[0];
        
        // Atualizar apenas se o status for diferente
        if (transaction.status !== transactionStatus) {
          await FinancialTransaction.update(transaction.id, {
            status: transactionStatus,
            payment_date: transactionStatus === 'pago' ? new Date().toISOString() : null
          });
          console.log('Transação financeira atualizada para assinatura:', subscription.id);
        }
      } else {
        // Criar nova transação
        // Garantir que todos os valores necessários estejam presentes
        const amount = paymentInfo.transaction_amount || 0;
        const billingCycle = subscription.billing_cycle || 'mensal';
        const planName = subscription.plan_name || 'Plano';
        const clientId = subscription.client_id || '';
        const nextBillingDate = subscription.next_billing_date || new Date().toISOString();
        
        await FinancialTransaction.create({
          type: 'receita',
          category: 'assinatura',
          description: `Assinatura ${planName} - ${billingCycle}`,
          amount: amount,
          payment_method: 'mercado_pago',
          status: transactionStatus,
          due_date: nextBillingDate,
          payment_date: transactionStatus === 'pago' ? new Date().toISOString() : null,
          client_id: clientId,
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
      // Verificar se o ID é válido
      if (!subscriptionId) {
        console.error('ID de assinatura inválido ou não fornecido');
        return false;
      }
      
      console.log(`Verificando assinatura específica com ID: ${subscriptionId}`);
      
      // Inicializar o serviço do Mercado Pago
      const settings = await this.initializeMercadoPago();
      if (!settings) {
        console.error('Não foi possível inicializar o Mercado Pago');
        return false;
      }
      
      // Buscar a assinatura
      let subscription = null;
      
      // Tentar buscar via ClientSubscription primeiro
      try {
        subscription = await ClientSubscription.get(subscriptionId);
        if (subscription) {
          console.log('Assinatura encontrada via ClientSubscription:', subscription.id);
        }
      } catch (getError) {
        console.error(`Erro ao buscar assinatura via ClientSubscription: ${getError.message}`);
      }
      
      // Se não encontrou, tentar buscar diretamente no Firestore
      if (!subscription) {
        try {
          const { db } = await import('@/firebase/config');
          const { doc, getDoc } = await import('firebase/firestore');
          
          const subscriptionRef = doc(db, 'client_subscriptions', subscriptionId);
          const subscriptionSnap = await getDoc(subscriptionRef);
          
          if (subscriptionSnap.exists()) {
            subscription = {
              id: subscriptionId,
              ...subscriptionSnap.data()
            };
            console.log('Assinatura encontrada via Firestore:', subscription.id);
          } else {
            console.error(`Assinatura não encontrada no Firestore: ${subscriptionId}`);
            return false;
          }
        } catch (firestoreError) {
          console.error(`Erro ao buscar assinatura no Firestore: ${firestoreError.message}`);
          return false;
        }
      }
      
      if (!subscription) {
        console.error(`Não foi possível encontrar a assinatura: ${subscriptionId}`);
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
