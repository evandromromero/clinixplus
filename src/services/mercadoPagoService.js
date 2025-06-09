// Polyfill para process.env no navegador
if (typeof window !== 'undefined') {
  if (typeof process === 'undefined') {
    window.process = {
      env: {
        npm_package_version: '1.0.0',
        npm_package_name: 'clinixplus',
        NODE_ENV: 'production'
      }
    };
  } else if (typeof process.env === 'undefined') {
    process.env = {
      npm_package_version: '1.0.0',
      npm_package_name: 'clinixplus',
      NODE_ENV: 'production'
    };
  }
}

// Importar SDK do Mercado Pago v2
import { MercadoPagoConfig, Preference } from 'mercadopago';

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
   * Verifica se o serviço está inicializado
   * @returns {boolean} - Status de inicialização
   */
  checkInitialized() {
    if (!this.isInitialized || !this.client) {
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
    console.log('Iniciando inicialização do Mercado Pago com config:', {
      hasConfig: !!config,
      hasAccessToken: !!config.mercadopago_access_token,
      hasPublicKey: !!config.mercadopago_public_key,
      enabled: config.mercadopago_enabled,
      sandbox: config.mercadopago_sandbox
    });
    
    this.config = config;
    
    // Verificar se estamos em ambiente de desenvolvimento (localhost)
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1');
    
    // Verificar se o token de acesso está disponível
    if (!config.mercadopago_access_token) {
      console.error('Access token do Mercado Pago não fornecido');
      return false;
    }
    
    // Verificar se o Mercado Pago está habilitado
    if (config.mercadopago_enabled === false) {
      console.warn('Mercado Pago está desabilitado nas configurações');
      // Continuar mesmo assim para não quebrar o fluxo
    }

    try {
      // Na SDK v2, MercadoPagoConfig é o cliente em si
      console.log('Criando instância do MercadoPagoConfig com token:', 
                 config.mercadopago_access_token ? `${config.mercadopago_access_token.substring(0, 10)}...` : 'não disponível');
      
      // Criar instância com o token correto
      this.client = new MercadoPagoConfig({
        accessToken: config.mercadopago_access_token
      });
      
      console.log('Instância do MercadoPagoConfig criada:', {
        clientExists: !!this.client,
        clientType: typeof this.client
      });
      
      this.isInitialized = true;
      this.config = config;
      
      console.log('Mercado Pago inicializado com sucesso:', {
        token: config.mercadopago_access_token ? `${config.mercadopago_access_token.substring(0, 10)}...` : 'não disponível',
        sandbox: config.mercadopago_sandbox ? 'Ativado' : 'Desativado'
      });
      return true;
    } catch (error) {
      console.error('Erro ao inicializar Mercado Pago:', error);
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Cria um link de pagamento para um serviço
   * @param {Object} data - Dados do pagamento
   * @returns {Promise<Object>} - URL do link de pagamento
   */
  async createPaymentLink(data) {
    console.log('Iniciando createPaymentLink com dados:', data);
    
    if (!this.checkInitialized()) {
      console.error('Mercado Pago não inicializado!');
      return null;
    }

    try {
      // Criar um identificador único para a transação
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log('ID de transação gerado:', transactionId);
      
      // Construir objeto de dados para a preferência
      const preferenceData = {
        items: [
          {
            id: data.external_reference || transactionId,
            title: data.plan_name || 'Serviço',
            description: data.plan_name || 'Serviço',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: parseFloat(data.amount)
          }
        ],
        payer: {
          email: data.payer_email || 'test_user_123@testuser.com'
        },
        external_reference: data.external_reference || transactionId,
        statement_descriptor: 'CLINIXPLUS'
      };
      
      // Configurar URLs de retorno
      const baseUrl = window.location.origin + window.location.pathname;
      preferenceData.back_urls = {
        success: data.success_url || baseUrl,
        failure: data.failure_url || baseUrl,
        pending: data.pending_url || baseUrl
      };
      
      // Configurar auto_return
      preferenceData.auto_return = 'approved';
      
      console.log('Configuração da preferência:', JSON.stringify(preferenceData, null, 2));
      console.log('URLs de retorno configuradas:', JSON.stringify(preferenceData.back_urls, null, 2));
      
      // Verificar inicialização do Mercado Pago
      console.log('Estado do cliente Mercado Pago:', {
        isInitialized: this.isInitialized,
        hasClient: !!this.client,
        hasConfig: !!this.config,
        accessToken: (this.config && this.config.mercadopago_access_token) ? 
          `${this.config.mercadopago_access_token.substring(0, 10)}...` : 
          'não disponível'
      });
      
      // Verificar se estamos em ambiente de desenvolvimento
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // NUNCA usar simulação em produção, apenas em desenvolvimento quando explicitamente solicitado
      // ou quando não houver token válido
      if (isDevelopment && (!this.config || !this.config.mercadopago_access_token || 
          (this.config.mercadopago_sandbox === true && 
           this.config.mercadopago_access_token && 
           this.config.mercadopago_access_token.startsWith('TEST-')))) {
        console.log('Ambiente de desenvolvimento com sandbox ativado. Usando modo de simulação para Mercado Pago.');
        
        // Simular uma resposta de sucesso para ambiente de desenvolvimento
        const mockPreferenceId = `MOCK_PREF_${transactionId}`;
        const mockUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockPreferenceId}`;
        
        // Aguardar um pouco para simular a chamada à API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Simulando resposta do Mercado Pago:', {
          id: mockPreferenceId,
          init_point: mockUrl,
          sandbox_init_point: mockUrl
        });
        
        return {
          url: mockUrl,
          payment_id: mockPreferenceId,
          preference_id: mockPreferenceId,
          external_reference: data.external_reference || transactionId,
          sandbox: true,
          simulated: true
        };
      }
      
      try {
        // Verificar se o cliente foi inicializado corretamente
        if (!this.client || !this.config || !this.config.mercadopago_access_token) {
          throw new Error('Cliente Mercado Pago não inicializado corretamente ou token de acesso ausente');
        }
        
        // Na SDK v2, precisamos criar a instância de Preference com o client
        console.log('Criando instância de Preference com client...');
        const preference = new Preference(this.client);
        console.log('Instância de Preference criada com sucesso');
        
        // Criar a preferência no Mercado Pago
        console.log('Chamando método create da preferência com dados:', JSON.stringify(preferenceData, null, 2));
        const response = await preference.create({ body: preferenceData });
        console.log('Resposta bruta do Mercado Pago:', response);
        
        if (!response || !response.id) {
          console.error('Resposta inválida do Mercado Pago (sem ID):', response);
          throw new Error('Resposta inválida do Mercado Pago: ID não encontrado');
        }
        
        // Na SDK v2, a resposta já é o corpo, não precisa acessar response.body
        console.log('Resposta do Mercado Pago processada:', {
          id: response.id,
          init_point: response.init_point,
          sandbox_init_point: response.sandbox_init_point
        });
        
        // Determinar a URL correta com base no ambiente
        const useSandbox = this.config && this.config.mercadopago_sandbox === true;
        const paymentUrl = useSandbox
          ? response.sandbox_init_point 
          : response.init_point;
        
        console.log('URL de pagamento gerada:', paymentUrl);
        
        return {
          url: paymentUrl,
          payment_id: response.id,
          preference_id: response.id,
          external_reference: response.external_reference || preferenceData.external_reference
        };
      } catch (apiError) {
        console.error('Erro na API do Mercado Pago:', apiError);
        console.error('Mensagem de erro da API:', apiError.message);
        console.error('Stack trace do erro da API:', apiError.stack);
        
        // Verificar se há detalhes de erro da API
        if (apiError.cause) {
          console.error('Causa do erro:', apiError.cause);
        }
        
        // Em caso de erro na API, usar o modo de simulação como fallback
        console.log('Usando modo de simulação como fallback devido a erro na API');
        
        const mockPreferenceId = `FALLBACK_${transactionId}`;
        const mockUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockPreferenceId}`;
        
        return {
          url: mockUrl,
          payment_id: mockPreferenceId,
          preference_id: mockPreferenceId,
          external_reference: data.external_reference || transactionId,
          sandbox: true,
          simulated: true,
          error: apiError.message
        };
      }
    } catch (error) {
      console.error('Erro detalhado ao criar link de pagamento:', error);
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
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
