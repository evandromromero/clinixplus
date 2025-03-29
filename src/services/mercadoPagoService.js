// Importar corretamente o SDK do Mercado Pago
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

/**
 * Serviço para integração com o Mercado Pago
 */
class MercadoPagoService {
  constructor() {
    this.isInitialized = false;
    this.client = null;
    this.config = null;
  }

  /**
   * Inicializa o serviço com as credenciais do Mercado Pago
   * @param {Object} config - Configurações do Mercado Pago
   */
  initialize(config) {
    if (!config) {
      console.error('Configurações do Mercado Pago não fornecidas');
      return false;
    }

    try {
      // Criar uma nova instância do MercadoPagoConfig com o access token
      this.client = new MercadoPagoConfig({ 
        accessToken: config.mercadopago_access_token 
      });
      
      this.isInitialized = true;
      this.config = config;
      console.log('Mercado Pago inicializado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao inicializar Mercado Pago:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Verifica se o serviço está inicializado
   * @returns {boolean}
   */
  checkInitialized() {
    if (!this.isInitialized) {
      console.error('Mercado Pago não inicializado. Chame initialize() primeiro.');
      return false;
    }
    return true;
  }

  /**
   * Cria um plano de assinatura no Mercado Pago
   * @param {Object} planData - Dados do plano
   * @returns {Promise<Object>} - Plano criado
   */
  async createPlan(planData) {
    if (!this.checkInitialized()) return null;

    try {
      const plan = {
        reason: planData.name,
        auto_recurring: {
          frequency: this.getFrequency(planData.billing_cycle),
          frequency_type: "months",
          transaction_amount: planData.price,
          currency_id: "BRL"
        },
        back_url: planData.back_url || window.location.origin,
        status: "active"
      };

      const response = await this.client.preferences.create(plan);
      console.log('Plano criado no Mercado Pago:', response.body);
      return response.body;
    } catch (error) {
      console.error('Erro ao criar plano no Mercado Pago:', error);
      return null;
    }
  }

  /**
   * Cria uma assinatura para um cliente
   * @param {Object} subscriptionData - Dados da assinatura
   * @returns {Promise<Object>} - Assinatura criada
   */
  async createSubscription(subscriptionData) {
    if (!this.checkInitialized()) return null;

    try {
      const subscription = {
        preapproval_plan_id: subscriptionData.plan_id,
        reason: subscriptionData.reason,
        external_reference: subscriptionData.external_reference,
        payer_email: subscriptionData.payer_email,
        card_token_id: subscriptionData.card_token_id,
        status: "authorized",
        auto_recurring: {
          frequency: this.getFrequency(subscriptionData.billing_cycle),
          frequency_type: "months",
          transaction_amount: subscriptionData.amount,
          currency_id: "BRL",
          start_date: subscriptionData.start_date,
          end_date: subscriptionData.end_date
        }
      };

      const response = await this.client.preferences.create(subscription);
      console.log('Assinatura criada no Mercado Pago:', response.body);
      return response.body;
    } catch (error) {
      console.error('Erro ao criar assinatura no Mercado Pago:', error);
      return null;
    }
  }

  /**
   * Cancela uma assinatura
   * @param {string} subscriptionId - ID da assinatura no Mercado Pago
   * @returns {Promise<Object>} - Resultado da operação
   */
  async cancelSubscription(subscriptionId) {
    if (!this.checkInitialized()) return null;

    try {
      const response = await this.client.preferences.update({
        id: subscriptionId,
        status: "cancelled"
      });
      console.log('Assinatura cancelada no Mercado Pago:', response.body);
      return response.body;
    } catch (error) {
      console.error('Erro ao cancelar assinatura no Mercado Pago:', error);
      return null;
    }
  }

  /**
   * Pausa uma assinatura
   * @param {string} subscriptionId - ID da assinatura no Mercado Pago
   * @returns {Promise<Object>} - Resultado da operação
   */
  async pauseSubscription(subscriptionId) {
    if (!this.checkInitialized()) return null;

    try {
      const response = await this.client.preferences.update({
        id: subscriptionId,
        status: "paused"
      });
      console.log('Assinatura pausada no Mercado Pago:', response.body);
      return response.body;
    } catch (error) {
      console.error('Erro ao pausar assinatura no Mercado Pago:', error);
      return null;
    }
  }

  /**
   * Reativa uma assinatura
   * @param {string} subscriptionId - ID da assinatura no Mercado Pago
   * @returns {Promise<Object>} - Resultado da operação
   */
  async reactivateSubscription(subscriptionId) {
    if (!this.checkInitialized()) return null;

    try {
      const response = await this.client.preferences.update({
        id: subscriptionId,
        status: "authorized"
      });
      console.log('Assinatura reativada no Mercado Pago:', response.body);
      return response.body;
    } catch (error) {
      console.error('Erro ao reativar assinatura no Mercado Pago:', error);
      return null;
    }
  }

  /**
   * Obtém detalhes de uma assinatura
   * @param {string} subscriptionId - ID da assinatura no Mercado Pago
   * @returns {Promise<Object>} - Detalhes da assinatura
   */
  async getSubscription(subscriptionId) {
    if (!this.checkInitialized()) return null;

    try {
      const response = await this.client.preferences.findById(subscriptionId);
      return response.body;
    } catch (error) {
      console.error('Erro ao obter assinatura do Mercado Pago:', error);
      return null;
    }
  }

  /**
   * Cria um link de pagamento para uma assinatura
   * @param {Object} data - Dados para o link de pagamento
   * @returns {Promise<Object>} - URL do link de pagamento
   */
  async createPaymentLink(data) {
    if (!this.checkInitialized()) return null;

    try {
      // Criar um identificador único para a transação
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Construir objeto de dados para a preferência
      const preferenceData = {
        items: [
          {
            id: data.external_reference || transactionId,
            title: data.plan_name || 'Assinatura',
            description: `Assinatura ${data.billing_cycle || 'mensal'}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: parseFloat(data.amount)
          }
        ],
        payer: {
          email: data.payer_email || 'test_user_123@testuser.com',
          name: 'Test',
          surname: 'User',
          identification: {
            type: 'CPF',
            number: '19119119100'
          }
        },
        payment_methods: {
          excluded_payment_types: [],
          installments: 1
        },
        external_reference: data.external_reference || transactionId,
        statement_descriptor: 'CLINIXPLUS',
        expires: false
      };
      
      // Adicionar URLs de retorno se fornecidas
      if (data.success_url || data.failure_url || data.pending_url) {
        preferenceData.back_urls = {
          success: data.success_url || window.location.origin,
          failure: data.failure_url || window.location.origin,
          pending: data.pending_url || window.location.origin
        };
        preferenceData.auto_return = 'approved';
      }
      
      // Adicionar URL de notificação para webhook
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        preferenceData.notification_url = `${window.location.origin}/api/mercadopago/webhook`;
      }
      
      console.log('Criando preferência com os dados:', preferenceData);
      
      // Fazer uma requisição direta para a API do Mercado Pago
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.mercadopago_access_token}`
        },
        body: JSON.stringify(preferenceData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta do Mercado Pago:', errorData);
        throw new Error(`Erro na API do Mercado Pago: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const responseData = await response.json();
      console.log('Preferência criada no Mercado Pago:', responseData);
      
      // Usar a URL de inicialização retornada pela API
      const checkoutUrl = this.config.mercadopago_sandbox 
        ? responseData.sandbox_init_point 
        : responseData.init_point;
      
      // Retornar um objeto com a URL e os IDs necessários
      return {
        url: checkoutUrl,
        preference_id: responseData.id,
        payment_id: responseData.collector_id || '', // O payment_id real só será gerado após o pagamento
        external_reference: responseData.external_reference || data.external_reference || transactionId
      };
    } catch (error) {
      console.error('Erro ao criar link de pagamento:', error);
      return null;
    }
  }

  /**
   * Obtém informações de um pagamento específico
   * @param {string} paymentId - ID do pagamento
   * @returns {Promise<Object>} - Informações do pagamento
   */
  async getPaymentInfo(paymentId) {
    if (!this.checkInitialized()) return null;

    try {
      // Verificar se o ID de pagamento é válido
      if (!paymentId) {
        console.error('ID de pagamento inválido ou não fornecido');
        return {
          id: 'unknown',
          status: "error",
          status_detail: "invalid_payment_id",
          error_message: "ID de pagamento inválido ou não fornecido",
          date_created: new Date().toISOString()
        };
      }
      
      // Normalizar o ID do pagamento (remover prefixos, sufixos, etc.)
      let normalizedPaymentId = String(paymentId); // Converter para string
      
      // Se o ID contiver hífen, pegar apenas a primeira parte (geralmente é o ID numérico)
      if (normalizedPaymentId.includes && normalizedPaymentId.includes('-')) {
        normalizedPaymentId = normalizedPaymentId.split('-')[0];
      }
      
      // Verificar se estamos em ambiente de desenvolvimento
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        console.log(`Ambiente de desenvolvimento detectado. Simulando resposta para pagamento ${normalizedPaymentId}`);
        
        // Retornar dados simulados em ambiente de desenvolvimento
        return {
          id: normalizedPaymentId,
          status: "approved", // Simular aprovação para testes
          status_detail: "accredited",
          external_reference: `test_${normalizedPaymentId}`,
          date_created: new Date().toISOString(),
          date_approved: new Date().toISOString(),
          payment_method_id: "visa",
          payment_type_id: "credit_card",
          transaction_amount: 100,
          installments: 1,
          processing_mode: "aggregator",
          description: "Pagamento simulado para ambiente de desenvolvimento"
        };
      }
      
      // Em produção, fazer a requisição real para a API do Mercado Pago
      console.log(`Buscando informações do pagamento ${normalizedPaymentId} na API do Mercado Pago`);
      
      // Fazer uma requisição direta para a API do Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${normalizedPaymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.mercadopago_access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta do Mercado Pago:', errorData);
        
        // Se o pagamento não for encontrado, retornar um objeto com status "pending"
        if (response.status === 404) {
          console.log(`Pagamento ${normalizedPaymentId} não encontrado. Assumindo status pendente.`);
          return {
            id: normalizedPaymentId,
            status: "pending",
            status_detail: "pending_payment",
            external_reference: `unknown_${normalizedPaymentId}`,
            date_created: new Date().toISOString(),
            payment_method_id: "unknown",
            payment_type_id: "unknown",
            transaction_amount: 0,
            description: "Pagamento pendente ou não encontrado"
          };
        }
        
        throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
      }
      
      const paymentData = await response.json();
      console.log('Informações do pagamento obtidas:', paymentData);
      
      return paymentData;
    } catch (error) {
      console.error('Erro ao obter informações do pagamento:', error);
      
      // Retornar um objeto com status de erro para evitar falhas no processamento
      return {
        id: paymentId,
        status: "error",
        status_detail: "processing_error",
        error_message: error.message,
        date_created: new Date().toISOString()
      };
    }
  }

  /**
   * Converte o ciclo de cobrança para a frequência do Mercado Pago
   * @param {string} billingCycle - Ciclo de cobrança (mensal, trimestral, etc)
   * @returns {number} - Frequência em meses
   */
  getFrequency(billingCycle) {
    switch(billingCycle) {
      case 'mensal':
        return 1;
      case 'trimestral':
        return 3;
      case 'semestral':
        return 6;
      case 'anual':
        return 12;
      default:
        return 1;
    }
  }
}

// Exporta uma instância única do serviço
export default new MercadoPagoService();
