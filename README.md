# ClinixPlus

Sistema de gerenciamento para clínicas estéticas desenvolvido com React e Firebase.

## Funcionalidades

### Gestão de Clientes
- Cadastro e edição de informações dos clientes
- Visualização detalhada do perfil do cliente
- Histórico de agendamentos e compras
- Upload de fotos antes/depois
- Sistema de observações e acompanhamento
- Integração híbrida Firebase/Base44 para melhor performance

### Padrões de Desenvolvimento

#### Cores
- Azul Principal: `#3475B8`
- Azul Secundário: `#518CD0`
- Status Positivo: `bg-green-100 text-green-700`
- Status Pendente: `bg-yellow-100 text-yellow-700`

#### Componentes
- Cards com `shadow-sm` e `rounded-lg`
- Grids responsivos usando Tailwind CSS
- Tabs para organização de conteúdo
- Modais para ações específicas

#### Nomenclatura
- Funções de evento: `handle[Ação]` (ex: handleUpdateClient)
- Estados booleanos: `is[Estado]` (ex: isEditing)
- Classes CSS: Prefixos Tailwind consistentes

#### Firebase Integration
- Armazenamento de dados do cliente
- Upload e gerenciamento de imagens
- Sistema de observações
- Solução híbrida com Base44 para limites de taxa

## Estrutura do Projeto

```
src/
  ├── components/
  │   └── ...
  ├── firebase/
  │   ├── config.js
  │   ├── entities.js
  │   └── enhancedEntities.js
  ├── pages/
  │   ├── ClientDetails.jsx
  │   └── ...
  └── ...
```

## Desenvolvimento

### Páginas Implementadas

#### Detalhes do Cliente (ClientDetails.jsx)
- Visualização e edição de dados do cliente
- Histórico de agendamentos e compras
- Sistema de fotos antes/depois
- Observações e acompanhamento
- Layout responsivo com cards e tabs
- Feedback visual para todas as ações
- Mensagens de fallback para dados vazios

### Integração Firebase/Base44
- Solução híbrida para melhor performance
- Métodos principais em entities.js:
  - update: Atualização de dados do cliente
  - get: Busca de informações
  - addObservation: Sistema de observações
- Sincronização automática entre plataformas

## UI/UX Guidelines
- Cards com sombras suaves para hierarquia visual
- Botões com estados hover para feedback
- Loading states para ações assíncronas
- Mensagens claras para dados vazios
- Cores consistentes para status
- Layout responsivo em todas as telas

## Notas de Desenvolvimento

### Diretrizes Importantes
- Não criar nada sem antes verificar se já está escrito ou implementado em outra página
- Não alterar nada sem antes perguntar e mostrar a solução proposta
- Não mexer no layout das páginas
- Sempre manter a lógica e o estilo de escrita do projeto original

### Atualizações (Março 2025)

#### Sistema de Gerenciamento de Dados
1. **Backup e Restauração de Dados**:
   - Backup completo do banco de dados Firebase
   - Download de arquivos de backup em formato JSON
   - Upload e restauração de backups
   - Dois modos de restauração: Substituir (deleta dados existentes) ou Mesclar (adiciona aos dados existentes)
   - Seleção de entidades específicas para restauração
   - Tratamento de rate limits do Firebase com delays e retentativas
   - Indicadores de progresso durante operações

2. **Interface Aprimorada**:
   - Cards coloridos e intuitivos substituindo botões simples:
     * Card Azul: Backup de Dados
     * Card Âmbar: Exclusão Seletiva
     * Card Vermelho: Exclusão Total
     * Card Verde: Dados de Exemplo
   - Ícones representativos para cada funcionalidade
   - Títulos e descrições explicativas
   - Efeitos de hover para melhor experiência do usuário
   - Organização em abas para as 23 entidades do sistema

3. **Dados de Exemplo**:
   - Criação de dados para todas as 23 entidades do sistema:
     * Clientes, Funcionários, Serviços, Produtos, Pacotes
     * Pacotes de Clientes, Assinaturas, Planos de Assinatura
     * Gift Cards, Agendamentos, Vendas, Vendas não Finalizadas
     * Métodos de Pagamento, Transações Financeiras
     * Serviços Pendentes, Funções, Fornecedores
     * Depoimentos, Contratos, Modelos de Contratos
     * Modelos de Anamnese, Configurações da Empresa
   - Relações entre os dados para garantir integridade referencial
   - Dados realistas para demonstração e testes

4. **Correções e Melhorias**:
   - Resolução de problemas com chaves (keys) em listas React
   - Correção de erros de importação de entidades
   - Tratamento adequado para erros de rate limit do Firebase
   - Mensagens de feedback claras para o usuário
   - Diálogos de confirmação para operações críticas

#### Melhorias no Módulo Financeiro
1. **Componente CashRegister**:
   - Aprimorada precisão nos cálculos usando `Number().toFixed(2)`
   - Implementada validação robusta de transações deletadas
   - Adicionados totalizadores por método de pagamento
   - Melhorado tratamento de datas e campos de texto
   - Implementada limpeza adequada de estados após operações
   - Adicionados logs detalhados para depuração

2. **Funcionalidades Aprimoradas**:
   - Abertura/Fechamento de Caixa: validações mais rigorosas
   - Transações: melhor validação de valores e métodos de pagamento
   - Cálculos: precisão numérica e tratamento de nulos
   - Feedback: mensagens de erro mais claras e específicas

3. **Manutenção**:
   - Mantida a lógica original do código
   - Preservado o layout existente
   - Respeitado o estilo de escrita do projeto
   - Conservada a estrutura de dados atual

#### Melhorias na Interface de Relatórios
1. **Aba de Eficiência**:
   - Adicionados gradientes, sombras e cores vibrantes aos cards principais (Horário de Pico, Dia mais Movimentado, Taxa de Conclusão)
   - Melhorados os gráficos com gradientes, células coloridas para destacar valores de pico e tooltips estilizados
   - Aprimorada a tabela de desempenho dos profissionais com indicadores visuais coloridos, badges para taxa de conclusão e mini gráficos de barras para estatísticas semanais
   - Implementados estados vazios informativos para quando não há dados disponíveis

2. **Nova Aba de Despesas**:
   - Criada uma nova aba completa para visualização de despesas
   - Implementados cards principais: Total de Despesas, Despesas por Categoria, Despesas por Mês
   - Adicionada uma tabela de maiores despesas com design consistente e badges coloridos para categorias
   - Criados gráficos adicionais: Evolução de Despesas (gráfico de área) e Distribuição de Despesas (gráfico de pizza com anel)
   - Implementada a função processExpensesData para tratar os dados de despesas, calculando totais e agrupando por categoria e mês

3. **Elementos Visuais Consistentes**:
   - Gradientes de fundo nos cards e cabeçalhos
   - Ícones representativos para cada tipo de informação
   - Tooltips estilizados nos gráficos
   - Cores temáticas consistentes
   - Layout responsivo em todas as telas

#### Sistema de Pacotes
1. **Sistema de Desconto Flexível**:
   - Suporte para dois tipos de desconto:
     * Porcentagem (%)
     * Valor fixo (R$)
   - Seleção do tipo de desconto no modal
   - Cálculo automático do preço final

2. **Identificação Visual por Cores**:
   - Campo 'color' adicionado aos pacotes
   - Paleta de cores predefinidas:
     * Azul principal (#294380)
     * Vermelho (#FF6B6B)
     * Verde (#4CAF50)
     * Salmão (#FFA07A)
     * Roxo (#9370DB)
     * Verde água (#20B2AA)
     * Dourado (#FFD700)
   - Interface com botões coloridos
   - Barra lateral colorida nos cards

3. **Layout dos Pacotes**:
   - Cards informativos com:
     * Nome do pacote
     * Preço total com desconto
     * Descrição
     * Lista de serviços incluídos
     * Validade em dias
   - Identificação visual por cores
   - Ações de editar e excluir

4. **Integração Firebase**:
   - Persistência completa dos dados
   - Novos campos:
     * discount_type: "percentage" | "fixed"
     * color: string (hexadecimal)

#### Histórico de Sessões em Pacotes
1. **Estrutura do Histórico**:
   ```javascript
   {
     date: "Data do agendamento",
     employee_id: "ID do profissional",
     employee_name: "Nome do profissional",
     appointment_id: "ID do agendamento",
     service_id: "ID do serviço",
     service_name: "Nome do serviço",
     status: "concluido|agendado|cancelado",
     notes: "Observações"
   }
   ```

2. **Padronização de Status**:
   - Banco de dados: 'concluido', 'agendado', 'cancelado' (sem acentos)
   - Interface: 'Concluído', 'Agendado', 'Cancelado' (com acentos)
   - Cores: Verde (concluído), Azul (agendado), Vermelho (cancelado)

3. **Fluxo de Atualização**:
   - Ao concluir agendamento: status atualizado para 'concluido'
   - Sessão adicionada ao histórico do pacote
   - Contador de sessões incrementado
   - Status do pacote atualizado se atingir total de sessões

4. **Arquivos Modificados**:
   - `Appointments.jsx`: Atualização de status e histórico
   - `ClientPackages.jsx`: Exibição do histórico
   - Integração com Firebase para persistência

5. **Melhorias de UX**:
   - Formatação de data/hora no padrão brasileiro
   - Exibição do nome do profissional
   - Badges coloridos para status
   - Informações detalhadas por sessão

#### Melhorias no Layout e UX
1. **Página de Produtos**:
   - Atualizado layout usando componentes shadcn/ui
   - Implementada tabela com ordenação e filtragem
   - Reorganizado modal de adicionar/editar produto
   - Adicionadas validações e feedback visual
   - Melhorada UX com grids e espaçamento adequado

2. **Modelos de Anamnese**:
   - Implementado sistema de campos dinâmicos
   - Suporte para campos tipo texto, seleção e sim/não
   - Preview em tempo real dos campos adicionados
   - Modal com altura máxima e barra de rolagem
   - Validações e feedback visual aprimorados

3. **Página de Serviços**:
   - Reorganizado formulário em seções lógicas
   - Melhorada UX das configurações do site
   - Implementadas validações mais robustas
   - Modal com altura controlada e rolagem
   - Feedback visual para todas as ações

4. **Melhorias Gerais**:
   - Modais com altura máxima (80vh) e barra de rolagem
   - Padronização de cores e estilos dos botões
   - Loading states e toasts para feedback
   - Campos organizados em grids responsivos
   - Validações claras e mensagens de erro

#### Desafios e Soluções
1. **Modais Grandes**
   - Problema: Modais ocupando toda a tela em formulários longos
   - Solução: Implementado `max-h-[80vh]` e `overflow-y-auto`
   - Resultado: Melhor experiência em telas menores

2. **Inconsistência Visual**
   - Problema: Diferentes estilos entre páginas
   - Solução: Padronização com shadcn/ui e Tailwind
   - Resultado: Interface mais coesa e profissional

3. **UX em Formulários**
   - Problema: Formulários longos e confusos
   - Solução: Reorganização em seções lógicas
   - Resultado: Melhor fluxo de preenchimento

#### Padrões Técnicos
- **Componentes**: shadcn/ui para base consistente
- **Estilos**: Tailwind CSS para customização
- **Estado**: React Hooks e Context quando necessário
- **Feedback**: Sistema de toast notifications
- **Validação**: Implementada em tempo real
- **Responsividade**: Layout adaptável em todas as telas

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

#### Gift Cards com Nome da Empresa Dinâmico
1. **Integração com Configurações da Empresa**:
   - Nome da empresa buscado automaticamente do Firebase
   - Implementação de cache para otimizar requisições
   - Suporte a múltiplas instâncias do componente
   - Estado global para compartilhar dados

2. **Componentes Modificados**:
   - `GiftCardTemplate.jsx`: 
     * Cache do nome da empresa
     * Busca automática das configurações
     * Fallback para nome padrão
   - `GiftCards.jsx`:
     * Integração com configurações da empresa
     * Preview dinâmico no modal de criação
     * Reset de formulário mantendo dados da empresa

3. **Melhorias Técnicas**:
   - Busca dinâmica do primeiro documento de configurações
   - Eliminação de IDs hardcoded
   - Otimização de requisições ao Firebase
   - Melhor gerenciamento de estado

4. **Benefícios**:
   - Configuração simplificada para novas empresas
   - Manutenção centralizada do nome da empresa
   - Melhor performance com sistema de cache
   - UX consistente em todo o sistema

## Migração do Sistema de Assinaturas para Firestore

### Visão Geral
Realizamos uma migração completa do sistema de assinaturas do Base44 para o Firestore, eliminando todas as dependências do Base44 no componente de assinaturas. Esta migração resolve problemas de erro 404 ao excluir ou atualizar assinaturas e melhora a confiabilidade do sistema.

### Modificações Realizadas

#### 1. Carregamento de Dados
- Modificamos o método `loadData` em `Subscriptions.jsx` para carregar assinaturas diretamente do Firestore
- Implementamos um sistema de logs detalhados para facilitar o diagnóstico de problemas
- Adicionamos tratamento de erros robusto com feedback visual para o usuário

```javascript
// Carregar assinaturas diretamente do Firestore
const { db } = await import('@/firebase/config');
const { collection, getDocs } = await import('firebase/firestore');

const subscriptionsRef = collection(db, 'client_subscriptions');
const querySnapshot = await getDocs(subscriptionsRef);

subscriptionsData = [];
querySnapshot.forEach((doc) => {
  subscriptionsData.push({
    id: doc.id,
    ...doc.data()
  });
});
```

#### 2. Criação e Atualização de Assinaturas
- Reescrevemos o método `handleSaveSubscription` para usar diretamente o Firestore
- Implementamos um sistema de fallback que tenta métodos alternativos quando a primeira tentativa falha
- Adicionamos timestamps automáticos para rastrear quando as assinaturas são criadas e atualizadas

```javascript
// Criar nova assinatura no Firestore
const subscriptionsRef = collection(db, 'client_subscriptions');
const docRef = await addDoc(subscriptionsRef, subscriptionData);

// Fallback se addDoc falhar
try {
  const newId = Date.now().toString();
  const subscriptionRef = doc(db, 'client_subscriptions', newId);
  await setDoc(subscriptionRef, subscriptionData);
}
```

#### 3. Cancelamento de Assinaturas
- Modificamos o método `handleDeleteItem` para cancelar assinaturas diretamente no Firestore
- Adicionamos feedback visual para o usuário sobre o resultado da operação

```javascript
// Atualizar o status da assinatura para "cancelada"
const subscriptionRef = doc(db, 'client_subscriptions', itemToDelete.id);
await updateDoc(subscriptionRef, {
  status: "cancelada",
  updated_at: new Date().toISOString()
});
```

#### 4. Verificação de Status de Pagamento
- Criamos um novo método `handleCheckSubscriptionStatus` que verifica o status diretamente no Mercado Pago
- Implementamos a atualização da assinatura no Firestore com base no status retornado

```javascript
// Obter informações do pagamento do Mercado Pago
const paymentInfo = await MercadoPagoService.getPaymentInfo(subscriptionData.mercadopago_payment_id);

// Atualizar o status da assinatura no Firestore
await updateDoc(subscriptionRef, {
  status: newStatus,
  mercadopago_status: mercadopago_status,
  payment_status_detail: paymentInfo.status_detail || "",
  updated_at: new Date().toISOString()
});
```

#### 5. Verificação Periódica de Assinaturas
- Implementamos um sistema de verificação periódica que usa diretamente o Firestore
- Melhoramos o filtro de assinaturas pendentes para usar comparações case-insensitive
- Adicionamos logs detalhados para facilitar o diagnóstico de problemas

```javascript
// Verificar periodicamente assinaturas pendentes
const checkInterval = setInterval(() => {
  checkPendingSubscriptionsStatus();
}, 300000); // Verificar a cada 5 minutos
```

#### 6. Verificação de Assinaturas Vencidas
- Atualizamos o método `checkSubscriptionsStatus` para verificar assinaturas vencidas
- Implementamos a atualização automática do status para "vencida" diretamente no Firestore

```javascript
// Atualizar o status da assinatura para "vencida" no Firestore
const subscriptionRef = doc(db, 'client_subscriptions', sub.id);
await updateDoc(subscriptionRef, {
  status: "vencida",
  updated_at: new Date().toISOString()
});
```

### Benefícios da Migração
1. **Independência do Base44**: O sistema de assinaturas agora funciona de forma independente do Base44
2. **Maior Confiabilidade**: Eliminação de erros 404 ao excluir ou atualizar assinaturas
3. **Melhor Desempenho**: Acesso direto ao Firestore sem camadas intermediárias
4. **Tratamento de Erros Robusto**: Sistema de fallback para garantir que as operações sejam concluídas
5. **Logs Detalhados**: Facilita o diagnóstico e resolução de problemas
6. **Feedback Visual**: Notificações toast para informar o usuário sobre o resultado das operações

### Próximos Passos
1. **Monitoramento**: Acompanhar o desempenho do sistema após a migração
2. **Otimização**: Identificar e otimizar áreas que possam apresentar gargalos
3. **Expansão**: Aplicar a mesma abordagem a outros componentes que ainda dependem do Base44

## Atualizações Recentes

### 25/03/2025
- **Correção do Módulo de Caixa**
  - Corrigido o diálogo de abertura de caixa mantendo a seleção de funcionários autorizados
  - Restauradas funções importantes de manipulação de transações
  - Restauradas funções de geração e download de relatórios
  - Melhorado o feedback ao usuário usando toast ao invés de alerts
  - Mantida a compatibilidade com a integração Firebase

## Sistema de Controle de Acesso e Permissões

### Controle de Acesso Baseado em Permissões
- Sistema completo de filtragem de menu baseado nas permissões do usuário
- Verificação dinâmica de permissões para cada item de menu e submenu
- Suporte para permissões simples e múltiplas
- Carregamento automático das permissões do usuário ao iniciar o sistema

### Restrição de Acesso ao Cargo Administrador Geral
- Visibilidade restrita: o cargo "Administrador Geral" só aparece para usuários com o mesmo cargo
- Proteção contra modificações: apenas administradores podem criar/editar cargos de Administrador Geral
- Proteção contra exclusão: verificações para impedir a exclusão não autorizada de cargos administrativos

### Restrição de Edição para Usuários Administrador Geral
- Apenas usuários com cargo de Administrador Geral podem editar outros usuários administradores
- Proteção contra edição e exclusão não autorizada
- Verificações em múltiplos pontos para garantir a segurança

### Gerenciamento de Permissões Visíveis no Sistema
- Controle sobre quais permissões estarão disponíveis no sistema
- Interface de gerenciamento exclusiva para administradores
- Permissões desabilitadas não aparecem para usuários não administradores
- Botões para selecionar/desmarcar todas as permissões de uma vez

### Controle de Visibilidade de Funcionalidades no Site Público
- Ocultação automática de seções do site público baseada nas permissões habilitadas
- Seção de planos de assinatura só aparece se a permissão "manage_subscriptions" estiver habilitada
- Seção de gift cards só aparece se a permissão "manage_gift_cards" estiver habilitada
- Links de navegação também são ocultados quando as permissões estão desabilitadas

Para mais informações e suporte, please contact Base44 support at app@base44.com.