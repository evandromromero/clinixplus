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

### Atualizações

#### Sistema de Gerenciamento de Dados (Março 2025)
1. **Backup e Restauração de Dados**:
   - Backup completo do banco de dados Firebase
   - Download de arquivos de backup em formato JSON
   - Upload e restauração de backups
   - Dois modos de restauração: Substituir (deleta dados existentes) ou Mesclar (adiciona aos dados existentes)
   - Seleção de entidades específicas para restauração

#### Sistema de Agendamentos (Abril 2025)
1. **Atualização Automática da Modal de Detalhes**:
   - Modal de detalhes agora atualiza automaticamente após ações como cancelamento, conclusão ou exclusão
   - Não é mais necessário fechar e reabrir a modal para ver as atualizações
   - Feedback visual imediato após cada ação

2. **Reagendamento Aprimorado**:
   - Reagendamento agora atualiza o agendamento existente em vez de criar um novo
   - Histórico de pacotes atualizado corretamente durante reagendamentos
   - Mensagens de feedback específicas para atualização vs. criação

3. **Funcionalidade de Arrastar e Soltar (Drag and Drop)**:
   - Arraste agendamentos diretamente na agenda para movê-los entre horários e profissionais
   - Validações automáticas para verificar disponibilidade e conflitos
   - Efeitos visuais durante o arrasto para melhor experiência do usuário
   - Atualização automática da modal de detalhes após movimentação

4. **Build para Produção**:
   - Build otimizado para hospedagem compartilhada
   - Arquivos gerados na pasta `dist`
   - Configurações para suporte a rotas SPA
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

#### Formulário de Contato e Gerenciamento de Mensagens
1. **Formulário de Contato na Página Inicial**:
   - Implementação completa do formulário com validação de campos
   - Feedback visual para o usuário durante o envio
   - Armazenamento das mensagens no Firebase
   - Eliminação da dependência de serviços externos como EmailJS

2. **Sistema de Gerenciamento de Mensagens**:
   - Nova aba "Emails" na página de configurações gerais
   - Tabela com todas as mensagens recebidas
   - Destaque visual para mensagens não lidas
   - Funcionalidades para marcar como lida e excluir mensagens
   - Modal de detalhes com todas as informações da mensagem
   - Formatação adequada de datas e textos longos

3. **Entidade ContactMessage no Firebase**:
   - Métodos para criar, listar, atualizar e excluir mensagens
   - Ordenação por data de criação
   - Marcação de status (lida/não lida)

#### Configurações de SEO
1. **Nova Aba de SEO nas Configurações Gerais**:
   - Campos para meta_title, meta_description, meta_keywords
   - Campos para meta_author, favicon_url e site_name
   - Interface intuitiva para edição das configurações

2. **Componente SEOHead**:
   - Aplicação automática das configurações de SEO na página pública
   - Carregamento dinâmico das configurações do Firebase
   - Fallback para valores padrão quando não configurados

#### Reparo do Cargo Administrador Geral
1. **Script de Reparo Automático**:
   - Implementação do script setupAdminRole.js
   - Verificação e criação automática do cargo Administrador Geral

2. **Página de Reparo Manual**:
   - Implementação da página AdminRepair.jsx
   - Interface para reparar manualmente o cargo quando necessário
   - Link direto no menu lateral para acesso rápido

### Instruções para Hospedagem

#### Preparação do Projeto
1. **Gerar Build de Produção**:
   ```bash
   npm run build
   ```
   Isso criará uma pasta `dist` com os arquivos otimizados para produção.

2. **Configurar o Firebase**:
   - Acessar o Console do Firebase
   - Adicionar o domínio ao Authentication > Sign-in method > Domínios autorizados
   - Verificar as regras de segurança do Firestore e Storage

#### Hospedagem na Hostinger
1. **Configurar o Domínio**:
   - Acessar o painel da Hostinger
   - Vincular o domínio à hospedagem
   - Configurar o SSL para o domínio

2. **Fazer Upload dos Arquivos**:
   - Acessar o Gerenciador de Arquivos
   - Navegar até a pasta `public_html`
   - Fazer upload de todo o conteúdo da pasta `dist`

3. **Configurar Redirecionamento para SPA**:
   - Criar arquivo `.htaccess` na pasta `public_html`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteCond %{REQUEST_FILENAME} !-l
     RewriteRule . /index.html [L]
   </IfModule>
   ```

4. **Testar o Site**:
   - Acessar o site no domínio configurado
   - Verificar se todas as páginas estão carregando
   - Testar o login e outras funcionalidades

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