# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Notas de Desenvolvimento

### Diretrizes Importantes
- Não criar nada sem antes verificar se já está escrito ou implementado em outra página
- Não alterar nada sem antes perguntar e mostrar a solução proposta
- Não mexer no layout das páginas
- Sempre manter a lógica e o estilo de escrita do projeto original

### Integração com Firebase (Planejamento)
Para resolver problemas de limite de taxa (429: Rate limit exceeded) do Base44, estamos considerando uma solução híbrida com Firebase. A implementação mais viável seria:

1. **Camada de Abstração Mínima**:
   - Criar um wrapper para as entidades do Base44
   - Salvar dados no Firebase em paralelo
   - Priorizar leitura do Firebase para reduzir chamadas à API

2. **Implementação**:
   - Criar arquivo de configuração do Firebase
   - Modificar `entities.js` para usar as versões aprimoradas
   - Manter compatibilidade total com o código existente

3. **Entidades Prioritárias**:
   - Clients
   - Appointments
   - Dashboard (componente com mais requisições)

Esta solução não alterará o layout ou a lógica de negócios existente, apenas otimizará o acesso aos dados.

Para mais informações e suporte, please contact Base44 support at app@base44.com.