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
   - Efeitos de hover e transições suaves

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

## Atualizações Recentes

### 25/03/2025
- **Correção do Módulo de Caixa**
  - Corrigido o diálogo de abertura de caixa mantendo a seleção de funcionários autorizados
  - Restauradas funções importantes de manipulação de transações
  - Restauradas funções de geração e download de relatórios
  - Melhorado o feedback ao usuário usando toast ao invés de alerts
  - Mantida a compatibilidade com a integração Firebase

Para mais informações e suporte, please contact Base44 support at app@base44.com.