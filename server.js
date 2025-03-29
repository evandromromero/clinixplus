const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos da build do React
app.use(express.static(path.join(__dirname, 'dist')));

// Importar e configurar rotas da API
// Nota: Como estamos usando ESM no frontend e CJS no backend,
// precisamos importar as rotas de forma diferente
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    console.log('Webhook do Mercado Pago recebido:', req.body);
    
    // Verificar se é uma notificação válida
    if (!req.body || !req.body.data || !req.body.type) {
      console.error('Payload de webhook inválido');
      return res.status(400).json({ error: 'Payload inválido' });
    }
    
    // Responder imediatamente para evitar timeout
    res.status(200).json({ message: 'Webhook recebido' });
    
    // Processar a notificação de forma assíncrona
    // Aqui você precisará importar e chamar a função handleMercadoPagoWebhook
    // de forma compatível com o ambiente Node.js
    
    console.log('Notificação do Mercado Pago será processada assincronamente');
    
    // Exemplo de como você pode processar a notificação:
    // const { handleMercadoPagoWebhook } = require('./dist/server/api/mercadoPagoWebhook');
    // await handleMercadoPagoWebhook(req.body);
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    // Já enviamos resposta, então não precisamos responder novamente
  }
});

// Rota padrão para servir o app React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
