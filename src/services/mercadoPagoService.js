/**
 * Serviço SIMPLIFICADO para integração com o Mercado Pago
 * Usa apenas API REST - sem dependência da SDK problemática
 */
class MercadoPagoService {
  constructor() {
    this.isInitialized = false;
    this.config = null;
  }

  /**
   * Verifica se o serviço está inicializado
   * @returns {boolean} - Status de inicialização
   */
  checkInitialized() {
    if (!this.isInitialized || !this.config) {
      console.error('Mercado Pago não inicializado. Chame initialize() primeiro.');
      return false;
    }
    return true;
  }

  /**
   * Inicializa o serviço com as credenciais do Mercado Pago
   * @param {Object} config - Configurações do Mercado Pago
   */
  initialize(config = {}) {
    console.log('✅ Inicializando Mercado Pago (API REST)');
    
    // Verificar se o token de acesso está disponível
    if (!config.mercadopago_access_token) {
      console.error('❌ Access token do Mercado Pago não fornecido');
      return false;
    }
    
    // Verificar se o Mercado Pago está habilitado
    if (config.mercadopago_enabled === false) {
      console.warn('⚠️ Mercado Pago está desabilitado nas configurações');
    }

    this.config = config;
    this.isInitialized = true;
    
    console.log('✅ Mercado Pago inicializado:', {
      token: `${config.mercadopago_access_token.substring(0, 15)}...`,
      sandbox: config.mercadopago_sandbox ? 'Ativado' : 'Desativado'
    });
    
    return true;
  }

  /**
   * Cria um link de pagamento para um serviço
   * @param {Object} data - Dados do pagamento
   * @returns {Promise<Object>} - URL do link de pagamento
   */
  async createPaymentLink(data) {
    console.log('🚀 Criando link de pagamento via API REST');
    
    if (!this.checkInitialized()) {
      console.error('❌ Mercado Pago não inicializado!');
      return null;
    }

    try {
      // Construir objeto de dados para a preferência
      const preferenceData = {
        items: data.items || [
          {
            id: data.external_reference,
            title: data.plan_name || 'Serviço',
            description: data.plan_name || 'Serviço',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: parseFloat(data.amount)
          }
        ],
        payer: {
          email: data.payer_email || 'cliente@email.com'
        },
        external_reference: data.external_reference,
        statement_descriptor: 'CLINIXPLUS'
      };
      
      // Adicionar back_urls (sem auto_return para evitar erro 400)
      if (data.success_url && data.failure_url && data.pending_url) {
        preferenceData.back_urls = {
          success: data.success_url,
          failure: data.failure_url,
          pending: data.pending_url
        };
        // NÃO adicionar auto_return - causa erro 400 no Mercado Pago
      }
      
      console.log('📦 Dados da preferência:', JSON.stringify(preferenceData, null, 2));
      
      // Usar API REST diretamente
      const response = await this.createPreferenceViaREST(preferenceData);
      
      if (response && response.id) {
        console.log('✅ Link de pagamento criado com sucesso!');
        
        const useSandbox = this.config.mercadopago_sandbox === true;
        const paymentUrl = useSandbox
          ? response.sandbox_init_point 
          : response.init_point;
        
        return {
          url: paymentUrl,
          payment_id: response.id,
          preference_id: response.id,
          external_reference: response.external_reference,
          method: 'REST_API'
        };
      }
      
      throw new Error('Resposta inválida da API');
      
    } catch (error) {
      console.error('❌ Erro ao criar link de pagamento:', error);
      throw error;
    }
  }

  /**
   * Cria preferência via API REST direta (fallback para SDK)
   * @param {Object} preferenceData - Dados da preferência
   * @returns {Promise<Object>} - Resposta da API
   */
  async createPreferenceViaREST(preferenceData) {
    console.log('[REST API] Criando preferência via fetch direto...');
    
    if (!this.config || !this.config.mercadopago_access_token) {
      throw new Error('Token de acesso não disponível');
    }
    
    const apiUrl = this.config.mercadopago_sandbox 
      ? 'https://api.mercadopago.com/checkout/preferences'
      : 'https://api.mercadopago.com/checkout/preferences';
    
    console.log('[REST API] URL da API:', apiUrl);
    console.log('[REST API] Dados da preferência:', JSON.stringify(preferenceData, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.mercadopago_access_token}`
      },
      body: JSON.stringify(preferenceData)
    });
    
    console.log('[REST API] Status da resposta:', response.status);
    console.log('[REST API] Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[REST API] Erro na resposta:', errorText);
      throw new Error(`API REST falhou: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[REST API] Dados recebidos:', data);
    
    return data;
  }

  /**
   * Obtém informações de um pagamento específico
   * @param {string} paymentId - ID do pagamento
   * @returns {Promise<Object>} - Informações do pagamento
   */
  async getPaymentInfo(paymentId) {
    if (!this.checkInitialized()) return null;

    try {
      // Implementar quando necessário
      console.log('Método getPaymentInfo não implementado completamente');
      return { id: paymentId, status: 'unknown' };
    } catch (error) {
      console.error('Erro ao obter informações do pagamento:', error);
      return null;
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

// Exportar uma instância única do serviço
export default new MercadoPagoService();
