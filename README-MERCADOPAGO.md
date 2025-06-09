# Integração Mercado Pago - ClinixPlus

## Problema Identificado

O sistema estava enfrentando um erro na integração com o Mercado Pago: "Cannot read properties of undefined (reading 'substring')". Este erro ocorria porque:

1. As configurações do Mercado Pago estavam dentro de um objeto `payment_settings` no documento do Firestore, mas o código tentava acessá-las como campos de primeiro nível.
2. Havia problemas de segurança no código ao tentar acessar propriedades de objetos potencialmente indefinidos.
3. Existe um erro na SDK do Mercado Pago v2 que está causando o erro "Cannot read properties of undefined (reading 'substring')" no método `getTrackingId` da classe `AppConfig`.

## Soluções Implementadas

### 1. Correção do Acesso às Configurações
- Modificamos o `ServiceShopCard.jsx` para acessar corretamente as configurações dentro do objeto `payment_settings`.
- Adicionamos verificações para garantir que o objeto `payment_settings` existe e contém os campos necessários.

### 2. Tratamento de Erros
- Adicionamos verificações de segurança em todas as chamadas ao método `substring` para evitar erros quando o token não está definido.
- Implementamos mensagens de erro amigáveis usando o componente `toast` para informar o usuário quando há problemas de configuração.
- Melhoramos o tratamento de erros durante a inicialização do Mercado Pago e criação da preferência de pagamento.

### 3. Fallback para Modo de Simulação
- Mantivemos o fallback para o modo de simulação quando há erros na API, permitindo que o fluxo continue mesmo com problemas.

## O Que Ainda Precisamos Resolver

Com base nos logs, ainda temos um problema:

1. **Erro na SDK do Mercado Pago**:
   - Mesmo com nossas correções, ainda ocorre um erro na SDK do Mercado Pago: `Cannot read properties of undefined (reading 'substring')` na linha 65:51 do arquivo mercadopago.js.
   - Este erro está ocorrendo dentro da própria biblioteca do Mercado Pago, especificamente no método `getTrackingId` da classe `AppConfig`.
   - O sistema está caindo no fallback de simulação, o que funciona para testes, mas não é adequado para produção.

## Próximos Passos

1. Investigar a causa raiz do erro na SDK do Mercado Pago - pode ser um problema com a versão da SDK ou com a forma como estamos inicializando o cliente.
2. Verificar se há alguma configuração adicional necessária para a SDK v2 do Mercado Pago que não estamos fornecendo.
3. Considerar a possibilidade de fazer downgrade para uma versão anterior da SDK se o problema persistir.
4. Implementar um mecanismo mais robusto para lidar com erros da SDK em produção.

## Configurações do Mercado Pago

As configurações do Mercado Pago estão armazenadas no Firestore dentro do documento `company_settings` no campo `payment_settings`:

```javascript
payment_settings: {
  mercadopago_access_token: "APP_USR-6386053843003758-041116-01b17bd4f74166b823bc8c08da7969d2-238982809",
  mercadopago_client_id: "6386053843003758",
  mercadopago_client_secret: "rUvrZHOLBTTSrpRqHi71Yl8hPa45EeP4",
  mercadopago_enabled: true,
  mercadopago_public_key: "APP_USR-06695960-5681-4369-bb65-5fad5ddb99b3",
  mercadopago_sandbox: false
}
```

## Arquivos Modificados

1. `src/components/client-portal/ServiceShopCard.jsx`
   - Corrigido o acesso às configurações do Mercado Pago
   - Adicionadas verificações de segurança
   - Melhorado o tratamento de erros

2. `src/services/mercadoPagoService.js`
   - Adicionadas verificações de segurança para evitar erros de acesso a propriedades indefinidas
   - Melhorado o tratamento de erros durante a criação da preferência de pagamento
   - Implementado fallback para modo de simulação quando há erros na API

## Logs de Erro

```
Erro na API do Mercado Pago: TypeError: Cannot read properties of undefined (reading 'substring')
    at AppConfig.getTrackingId (mercadopago.js?v=0aa44186:65:51)
    at _RestClient.fetch (mercadopago.js?v=0aa44186:856:383)
    at create (mercadopago.js?v=0aa44186:2134:38)
    at Preference.create (mercadopago.js?v=0aa44186:2204:37)
    at MercadoPagoService.createPaymentLink (mercadoPagoService.js:217:43)
    at handleCheckout (ServiceShopCard.jsx:405:58)
```
