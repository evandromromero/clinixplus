import { handleMercadoPagoWebhook } from './mercadoPagoWebhook';

/**
 * Define as rotas da API
 * @param {Object} app - Instância do Express
 */
export function setupRoutes(app) {
  // Webhook do Mercado Pago
  app.post('/api/mercadopago/webhook', async (req, res) => {
    await handleMercadoPagoWebhook(req, res);
  });
  
  // Adicione outras rotas conforme necessário
}
