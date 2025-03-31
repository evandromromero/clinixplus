import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Upload, Trash2, AlertTriangle, RefreshCw, Info, Clock, Filter, CheckCircle, Search } from 'lucide-react';
import RateLimitHandler from '../components/RateLimitHandler';

// Importar todas as entidades do Firebase ao invés do Base44
import {
  Client,
  Employee,
  Service,
  Product,
  Package,
  ClientPackage,
  ClientSubscription,
  SubscriptionPlan,
  GiftCard,
  Appointment,
  Sale,
  PaymentMethod,
  Role,
  FinancialTransaction,
  Supplier,
  Inventory,
  SlideShowImage,
  Testimonial,
  CompanySettings,
  ClientPackageSession,
  Receipt,
  UnfinishedSale,
  ClientAuth,
  PendingService,
  Contract,
  ContractTemplate,
  AnamneseTemplate
} from '@/firebase/entities';

export default function DataManager() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSelectiveDeleteDialog, setShowSelectiveDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, entity: '' });
  const [rateLimitError, setRateLimitError] = useState(null);
  const [delayBetweenRequests, setDelayBetweenRequests] = useState(500);
  const [entityData, setEntityData] = useState([]);
  const [currentEntity, setCurrentEntity] = useState('');
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [entityToDelete, setEntityToDelete] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [activeTab, setActiveTab] = useState('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Definir as entidades disponíveis para exclusão
  const entities = [
    { entity: Client, label: 'Clientes', name: 'clients', id: 'clients' },
    { entity: Employee, label: 'Funcionários', name: 'employees', id: 'employees' },
    { entity: Service, label: 'Serviços', name: 'services', id: 'services' },
    { entity: Product, label: 'Produtos', name: 'products', id: 'products' },
    { entity: Package, label: 'Pacotes', name: 'packages', id: 'packages' },
    { entity: ClientPackage, label: 'Pacotes de Clientes', name: 'client_packages', id: 'client_packages' },
    { entity: ClientSubscription, label: 'Assinaturas', name: 'client_subscriptions', id: 'client_subscriptions' },
    { entity: SubscriptionPlan, label: 'Planos de Assinatura', name: 'subscription_plans', id: 'subscription_plans' },
    { entity: GiftCard, label: 'Gift Cards', name: 'gift_cards', id: 'gift_cards' },
    { entity: Appointment, label: 'Agendamentos', name: 'appointments', id: 'appointments' },
    { entity: Sale, label: 'Vendas', name: 'sales', id: 'sales' },
    { entity: UnfinishedSale, label: 'Vendas não Finalizadas', name: 'unfinished_sales', id: 'unfinished_sales' },
    { entity: PaymentMethod, label: 'Métodos de Pagamento', name: 'payment_methods', id: 'payment_methods' },
    { entity: FinancialTransaction, label: 'Transações Financeiras', name: 'financial_transactions', id: 'financial_transactions' },
    { entity: PendingService, label: 'Serviços Pendentes', name: 'pending_services', id: 'pending_services' },
    { entity: Role, label: 'Funções', name: 'roles', id: 'roles' },
    { entity: Supplier, label: 'Fornecedores', name: 'suppliers', id: 'suppliers' },
    { entity: Testimonial, label: 'Depoimentos', name: 'testimonials', id: 'testimonials' },
    { entity: Contract, label: 'Contratos', name: 'contracts', id: 'contracts' },
    { entity: ContractTemplate, label: 'Modelos de Contratos', name: 'contract_templates', id: 'contract_templates' },
    { entity: AnamneseTemplate, label: 'Modelos de Anamnese', name: 'anamnese_templates', id: 'anamnese_templates' },
    { entity: CompanySettings, label: 'Configurações da Empresa', name: 'company_settings', id: 'company_settings' },
  ];

  // Definir as abas disponíveis
  const tabs = [
    { id: 'clients', label: 'Clientes', entity: Client },
    { id: 'employees', label: 'Funcionários', entity: Employee },
    { id: 'services', label: 'Serviços', entity: Service },
    { id: 'products', label: 'Produtos', entity: Product },
    { id: 'packages', label: 'Pacotes', entity: Package },
    { id: 'client_packages', label: 'Pacotes de Clientes', entity: ClientPackage },
    { id: 'client_subscriptions', label: 'Assinaturas', entity: ClientSubscription },
    { id: 'subscription_plans', label: 'Planos de Assinatura', entity: SubscriptionPlan },
    { id: 'gift_cards', label: 'Gift Cards', entity: GiftCard },
    { id: 'appointments', label: 'Agendamentos', entity: Appointment },
    { id: 'sales', label: 'Vendas', entity: Sale },
    { id: 'unfinished_sales', label: 'Vendas não Finalizadas', entity: UnfinishedSale },
    { id: 'payment_methods', label: 'Métodos de Pagamento', entity: PaymentMethod },
    { id: 'financial_transactions', label: 'Transações Financeiras', entity: FinancialTransaction },
    { id: 'pending_services', label: 'Serviços Pendentes', entity: PendingService },
    { id: 'roles', label: 'Funções', entity: Role },
    { id: 'suppliers', label: 'Fornecedores', entity: Supplier },
    { id: 'testimonials', label: 'Depoimentos', entity: Testimonial },
    { id: 'contracts', label: 'Contratos', entity: Contract },
    { id: 'contract_templates', label: 'Modelos de Contratos', entity: ContractTemplate },
    { id: 'anamnese_templates', label: 'Modelos de Anamnese', entity: AnamneseTemplate },
    { id: 'company_settings', label: 'Configurações da Empresa', entity: CompanySettings },
  ];

  // Função para criar um atraso
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Função para obter a entidade pelo nome
  const getEntityApiByName = (entityName) => {
    const entityObj = entities.find(e => e.name === entityName);
    return entityObj ? entityObj.entity : null;
  };

  // Função para obter o rótulo da entidade pelo nome
  const getEntityLabel = (entityName) => {
    const entityObj = entities.find(e => e.name === entityName);
    return entityObj ? entityObj.label : entityName;
  };

  // Função de tratamento de erros na API
  const handleApiError = (error, defaultMessage) => {
    console.error(error);
    
    const isRateLimit = 
      error.message?.includes('429') ||
      error.message?.includes('Rate limit') || 
      error.toString().includes('429');
    
    if (isRateLimit) {
      setRateLimitError(error);
      setDelayBetweenRequests(prev => prev * 2);
    }
    
    setMessage({
      type: 'error',
      text: isRateLimit ? 'Limite de requisições atingido. Por favor, aguarde um momento.' : (defaultMessage || 'Ocorreu um erro.')
    });
  };

  // Adicionar uma função robusta para exibir valores complexos
  const formatComplexValue = (value) => {
    if (value === undefined || value === null) {
      return '-';
    }
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        
        // Para arrays de objetos, mostrar apenas a contagem
        if (typeof value[0] === 'object') {
          return `Array[${value.length}]`;
        }
        
        // Para arrays simples, mostrar os primeiros valores
        return value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '');
      }
      
      // Objetos vazios
      if (Object.keys(value).length === 0) return '{}';
      
      // Para objetos, mostrar representação resumida
      return JSON.stringify(value).substring(0, 30) + (JSON.stringify(value).length > 30 ? '...' : '');
    }
    
    // Para valores simples
    return String(value);
  };

  // Função para retentativa com atraso exponencial
  const fetchWithRetry = async (fn, retries = 3, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Adicionar um atraso antes de tentar novamente (exceto na primeira tentativa)
        if (attempt > 0) {
          const delayTime = baseDelay * Math.pow(2, attempt);
          console.log(`Aguardando ${delayTime}ms antes da tentativa ${attempt + 1}`);
          await delay(delayTime);
        }
        
        return await fn();
      } catch (error) {
        lastError = error;
        const isRateLimit = 
          error.message?.includes('429') ||
          error.message?.includes('Rate limit') || 
          error.toString().includes('429');
          
        console.warn(`Tentativa ${attempt + 1} falhou:`, error);
        
        if (isRateLimit) {
          console.error("Erro de rate limit detectado. Aumentando o atraso entre requisições.");
          setRateLimitError(error);
          setDelayBetweenRequests(prev => prev * 2);
          await delay(5000);
        }
      }
    }
    
    throw lastError;
  };

  // Atualizar a função que exibe os dados de uma entidade
  const displayEntityData = async (entityApi, entityName) => {
    try {
      setLoading(true);
      setMessage({type: 'info', text: `Carregando dados de ${entityName}...`});
      
      const data = await fetchWithRetry(() => entityApi.list());
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        setMessage({type: 'info', text: `Não foram encontrados registros para ${entityName}.`});
        setEntityData([]);
        setSelectedItems({});
        return;
      }
      
      console.log(`Dados de ${entityName}:`, data);
      
      // Mapear os dados para exibição, tratando objetos e arrays
      const formattedData = data.map(item => {
        const formattedItem = {};
        
        for (const [key, value] of Object.entries(item)) {
          formattedItem[key] = formatComplexValue(value);
        }
        
        return formattedItem;
      });
      
      setEntityData(formattedData);
      setCurrentEntity(entityName);
      setRateLimitError(null);
      
      // Inicializar selectedItems com todos os itens desmarcados
      const initialSelectedItems = {};
      data.forEach(item => {
        initialSelectedItems[item.id] = false;
      });
      setSelectedItems(initialSelectedItems);
      setSelectAll(false);
      
    } catch (error) {
      console.error(`Erro ao carregar ${entityName}:`, error);
      handleApiError(error, `Erro ao carregar dados de ${entityName}`);
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar dados da entidade quando a aba mudar
  useEffect(() => {
    const entitiesInTab = entities.filter(e => e.id === activeTab);
    if (entitiesInTab.length > 0) {
      displayEntityData(entitiesInTab[0].entity, entitiesInTab[0].name);
    }
  }, [activeTab]);

  // Função para alternar a seleção de todos os itens
  const toggleSelectAll = (checked) => {
    setSelectAll(checked);
    const newSelectedItems = {};
    entityData.forEach(item => {
      newSelectedItems[item.id] = checked;
    });
    setSelectedItems(newSelectedItems);
  };

  // Função para alternar a seleção de um item específico
  const toggleSelectItem = (id, checked) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: checked
    }));
    
    // Verificar se todos os itens estão selecionados
    const allSelected = Object.values({
      ...selectedItems,
      [id]: checked
    }).every(value => value === true);
    
    setSelectAll(allSelected);
  };

  // Função para excluir os itens selecionados
  const handleDeleteSelectedItems = async () => {
    try {
      const selectedIds = Object.entries(selectedItems)
        .filter(([_, selected]) => selected)
        .map(([id]) => id);
      
      if (selectedIds.length === 0) {
        setMessage({type: 'info', text: 'Nenhum item selecionado para exclusão.'});
        return;
      }
      
      setLoading(true);
      setDeleteProgress({current: 0, total: selectedIds.length});
      setMessage({type: 'info', text: `Excluindo ${selectedIds.length} itens de ${getEntityLabel(currentEntity)}...`});
      
      const entityApi = getEntityApiByName(currentEntity);
      
      for (let i = 0; i < selectedIds.length; i++) {
        try {
          const id = selectedIds[i];
          await fetchWithRetry(() => entityApi.delete(id));
          
          // Atualizar progresso
          setDeleteProgress({current: i + 1, total: selectedIds.length});
          
          // Pausa entre requisições para evitar rate limit
          if (i < selectedIds.length - 1) {
            await delay(delayBetweenRequests);
          }
        } catch (error) {
          console.error(`Erro ao excluir item ${i+1}/${selectedIds.length} de ${currentEntity}:`, error);
          // Continuar com o próximo item mesmo após erro
        }
      }
      
      setMessage({type: 'success', text: `${selectedIds.length} itens de ${getEntityLabel(currentEntity)} foram excluídos com sucesso!`});
      setShowSelectiveDeleteDialog(false);
      
      // Recarregar os dados após a exclusão
      await displayEntityData(entityApi, currentEntity);
      
    } catch (error) {
      console.error(`Erro ao excluir itens de ${currentEntity}:`, error);
      setMessage({type: 'error', text: `Erro ao excluir itens de ${getEntityLabel(currentEntity)}: ${error.message}`});
    } finally {
      setLoading(false);
      setDeleteProgress({current: 0, total: 0});
    }
  };

  // Filtrar os dados com base no termo de pesquisa
  const filteredData = searchTerm
    ? entityData.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : entityData;

  // Adicionar de volta a função handleAddSampleData que foi removida
  const handleAddSampleData = async () => {
    try {
      setLoading(true);
      setMessage(null);
      setRateLimitError(null);

      const paymentMethods = await fetchWithRetry(async () => {
        await delay(delayBetweenRequests);
        return await PaymentMethod.bulkCreate([
          {
            name: "Dinheiro",
            type: "dinheiro",
            allowsInstallments: false,
            isActive: true
          },
          {
            name: "Cartão de Crédito",
            type: "cartao_credito",
            allowsInstallments: true,
            maxInstallments: 12,
            isActive: true
          },
          {
            name: "Cartão de Débito",
            type: "cartao_debito",
            allowsInstallments: false,
            isActive: true
          },
          {
            name: "PIX",
            type: "pix",
            allowsInstallments: false,
            isActive: true
          }
        ]);
      });
      
      await delay(delayBetweenRequests);

      const roles = await fetchWithRetry(async () => {
        await delay(delayBetweenRequests);
        return await Role.bulkCreate([
          {
            name: "Esteticista",
            permissions: ["manage_clients", "manage_appointments"],
            department: "Atendimento"
          },
          {
            name: "Recepcionista",
            permissions: ["manage_clients", "manage_appointments", "manage_sales"],
            department: "Recepção"
          },
          {
            name: "Gerente",
            permissions: ["admin", "manage_clients", "manage_employees", "manage_services", "manage_products", "manage_appointments", "manage_sales", "manage_finances", "view_reports"],
            department: "Administração"
          }
        ]);
      });
      
      await delay(delayBetweenRequests);

      const employees = await fetchWithRetry(async () => {
        await delay(delayBetweenRequests);
        return await Employee.bulkCreate([
          {
            name: "Maria Silva",
            role: "esteticista",
            email: "maria@clinica.com",
            phone: "(11) 98765-4321",
            commission_rate: 30,
            specialties: ["limpeza de pele", "massagem"],
            provides_services: true,
            appointment_interval: 30,
            color: "#FF5733"
          },
          {
            name: "João Santos",
            role: "esteticista",
            email: "joao@clinica.com",
            phone: "(11) 98765-4322",
            commission_rate: 30,
            specialties: ["massagem", "depilação"],
            provides_services: true,
            appointment_interval: 45,
            color: "#33FF57"
          },
          {
            name: "Ana Oliveira",
            role: "recepcionista",
            email: "ana@clinica.com",
            phone: "(11) 98765-4323",
            commission_rate: 0,
            provides_services: false,
            color: "#3357FF"
          }
        ]);
      });
      
      await delay(delayBetweenRequests);

      setMessage({ type: 'success', text: 'Dados de exemplo adicionados com sucesso!' });
    } catch (error) {
      console.error('Erro ao adicionar dados de exemplo:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao adicionar dados de exemplo: ' + (error.message || 'Erro desconhecido') 
      });
      
      if (error.message?.includes('429') || 
          error.message?.includes('Rate limit') || 
          error.toString().includes('429')) {
        setRateLimitError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Adicionar de volta a função handleDeleteAllData que foi removida
  const handleDeleteAllData = async () => {
    try {
      setLoading(true);
      setMessage(null);
      setRateLimitError(null);
      setProgress({ current: 0, total: entities.length, entity: '' });

      for (let i = 0; i < entities.length; i++) {
        const { entity, label, name } = entities[i];
        
        setProgress({ 
          current: i + 1, 
          total: entities.length, 
          entity: label 
        });
        
        try {
          const items = await fetchWithRetry(async () => {
            await delay(delayBetweenRequests);
            return await entity.list();
          });
          
          console.log(`Encontrados ${items.length} registros de ${label} para exclusão`);
          
          for (const item of items) {
            try {
              await fetchWithRetry(async () => {
                await delay(delayBetweenRequests);
                return await entity.delete(item.id);
              });
              
              await delay(delayBetweenRequests);
            } catch (itemError) {
              console.warn(`Erro ao deletar item de ${name}:`, itemError);
            }
          }
          
          console.log(`Todos os dados de ${label} foram deletados.`);
        } catch (entityError) {
          console.error(`Erro ao deletar dados de ${label}:`, entityError);
          
          if (entityError.message?.includes('429') || 
              entityError.message?.includes('Rate limit') || 
              entityError.toString().includes('429')) {
            
            setRateLimitError(entityError);
            await delay(10000);
            setDelayBetweenRequests(prev => prev * 2);
            i--;
          }
        }
      }

      setMessage({ type: 'success', text: 'Todos os dados foram deletados com sucesso!' });
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Erro ao deletar dados:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao deletar dados: ' + (error.message || 'Erro desconhecido') 
      });
      
      if (error.message?.includes('429') || 
          error.message?.includes('Rate limit') || 
          error.toString().includes('429')) {
        setRateLimitError(error);
      }
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, entity: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciador de Dados</h1>
      </div>

      {rateLimitError && (
        <RateLimitHandler 
          error={rateLimitError} 
          onRetry={() => {
            setRateLimitError(null);
            setDelayBetweenRequests(1000);
          }}
          className="mb-4"
        />
      )}

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 
          message.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Adicionar Dados de Exemplo
            </CardTitle>
            <CardDescription>
              Adiciona dados de exemplo ao sistema para testes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAddSampleData} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : "Adicionar Dados de Exemplo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Filter className="h-5 w-5" />
              Excluir Dados Seletivamente
            </CardTitle>
            <CardDescription>
              Selecione quais dados deseja excluir do Firebase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={() => setShowSelectiveDeleteDialog(true)}
              disabled={loading}
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Dados Seletivamente
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Database className="h-5 w-5" />
              Deletar Todos os Dados
            </CardTitle>
            <CardDescription>
              Remove todos os dados cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar Todos os Dados
            </Button>
          </CardContent>
        </Card>
      </div>

      {delayBetweenRequests > 500 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center">
              <Clock className="h-4 w-4 mr-2" /> 
              Modo de Prevenção de Rate Limit Ativado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-600">
            Para evitar erros de limite de requisições, as operações estão sendo executadas 
            com um intervalo de {delayBetweenRequests}ms entre elas. Isto pode fazer com que 
            as operações levem mais tempo para serem concluídas.
          </CardContent>
        </Card>
      )}

      {/* Diálogo para exclusão seletiva de dados */}
      <Dialog open={showSelectiveDeleteDialog} onOpenChange={setShowSelectiveDeleteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Filter className="h-5 w-5" />
              Exclusão Seletiva de Dados
            </DialogTitle>
            <DialogDescription>
              Selecione os dados que deseja excluir do Firebase. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Tabs defaultValue="clients" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 gap-2 mb-4 overflow-auto max-h-60">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
                ))}
              </TabsList>
              
              {tabs.map((tab, index) => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium">
                        {entities.find(e => e.id === tab.id)?.label || tab.label}
                      </h3>
                      {loading && <RefreshCw className="h-4 w-4 animate-spin ml-2" />}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Pesquisar..."
                          className="pl-8 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="select-all" 
                          checked={selectAll}
                          onCheckedChange={toggleSelectAll}
                        />
                        <Label htmlFor="select-all">Selecionar todos</Label>
                      </div>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[400px] rounded-md border">
                    {filteredData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Selecionar</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Nome/Descrição</TableHead>
                            <TableHead>Detalhes</TableHead>
                            <TableHead>Data de Criação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((item, index) => {
                            // Garantir que cada item tenha uma chave única
                            const uniqueKey = item.id || `item-${index}`;
                            return (
                              <TableRow key={uniqueKey}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedItems[item.id] || false}
                                    onCheckedChange={(checked) => toggleSelectItem(item.id, checked)}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                <TableCell>
                                  {item.name || item.description || item.title || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {currentEntity === 'Client' && item.email}
                                  {currentEntity === 'Employee' && item.role}
                                  {currentEntity === 'Service' && `${item.price || 'N/A'}`}
                                  {currentEntity === 'Product' && `${item.price || 'N/A'}`}
                                  {currentEntity === 'ClientSubscription' && `${item.status || 'N/A'}`}
                                  {currentEntity === 'GiftCard' && `${item.value || 'N/A'}`}
                                  {currentEntity === 'Appointment' && `${item.date || 'N/A'}`}
                                  {currentEntity === 'Sale' && `${item.total || 'N/A'}`}
                                  {currentEntity === 'SubscriptionPlan' && `${item.price || 'N/A'}`}
                                  {currentEntity === 'PaymentMethod' && `${item.type || 'N/A'}`}
                                  {currentEntity === 'FinancialTransaction' && `${item.amount || 'N/A'}`}
                                  {currentEntity === 'PendingService' && `${item.service_name || 'N/A'}`}
                                  {currentEntity === 'Role' && `${item.department || 'N/A'}`}
                                  {currentEntity === 'Supplier' && `${item.contact || 'N/A'}`}
                                  {currentEntity === 'Testimonial' && `${item.client_name || 'N/A'}`}
                                  {currentEntity === 'Contract' && `${item.status || 'N/A'}`}
                                  {currentEntity === 'ContractTemplate' && `${item.type || 'N/A'}`}
                                  {currentEntity === 'AnamneseTemplate' && `${item.type || 'N/A'}`}
                                  {currentEntity === 'CompanySettings' && `${item.key || 'N/A'}`}
                                </TableCell>
                                <TableCell>{item.created_date || item.created_at || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <Info className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-gray-500">
                          {loading 
                            ? 'Carregando dados...' 
                            : 'Nenhum dado encontrado para esta categoria.'}
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {Object.values(selectedItems).filter(Boolean).length} itens selecionados 
                      de {filteredData.length} exibidos (total: {entityData.length})
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        const entityObj = entities.find(e => e.id === tab.id);
                        if (entityObj) {
                          displayEntityData(entityObj.entity, entityObj.name);
                        }
                      }}
                      disabled={loading}
                      size="sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Atualizar Lista
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          {loading && deleteProgress.total > 0 && (
            <div className="my-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Excluindo itens selecionados...
                </span>
                <span className="text-sm text-gray-500">
                  {deleteProgress.current}/{deleteProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-amber-500 h-2.5 rounded-full" 
                  style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSelectiveDeleteDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleDeleteSelectedItems}
              disabled={loading || Object.values(selectedItems).filter(Boolean).length === 0}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Itens Selecionados
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para exclusão de todos os dados */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar TODOS os dados do sistema? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {loading && (
            <div className="my-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Excluindo {progress.entity}...
                </span>
                <span className="text-sm text-gray-500">
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-red-600 h-2.5 rounded-full" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              {delayBetweenRequests > 500 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> 
                  Modo lento ativado para evitar limite de requisições ({delayBetweenRequests}ms entre operações)
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAllData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Todos os Dados
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RateLimitHandler />
    </div>
  );
}