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
import { Database, Upload, Trash2, AlertTriangle, RefreshCw, Info, Clock } from 'lucide-react';
import RateLimitHandler from '../components/RateLimitHandler';

// Importar todas as entidades do Firebase ao invés do Base44
import { 
  Client,
  Employee,
  Service,
  Product,
  Package,
  Sale,
  Supplier,
  ClientPackage,
  SubscriptionPlan,
  ClientSubscription,
  Role,
  PaymentMethod,
  GiftCard,
  CompanySettings,
  Testimonial,
  SlideShowImage,
  Appointment,
  FinancialTransaction,
  Inventory,
  ClientPackageSession,
  Receipt,
  UnfinishedSale,
  ClientAuth
} from '@/firebase/entities';

export default function DataManager() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, entity: '' });
  const [rateLimitError, setRateLimitError] = useState(null);
  const [delayBetweenRequests, setDelayBetweenRequests] = useState(500);
  const [entityData, setEntityData] = useState([]);
  const [currentEntity, setCurrentEntity] = useState('');
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [entityToDelete, setEntityToDelete] = useState('');

  // Lista ordenada de entidades para garantir a exclusão segura (dependências primeiro)
  const entities = [
    { name: 'Receipt', entity: Receipt, label: 'Recibos' },
    { name: 'ClientPackageSession', entity: ClientPackageSession, label: 'Sessões de Pacotes' },
    { name: 'Appointment', entity: Appointment, label: 'Agendamentos' },
    { name: 'FinancialTransaction', entity: FinancialTransaction, label: 'Transações Financeiras' },
    { name: 'Inventory', entity: Inventory, label: 'Movimentações de Estoque' },
    { name: 'Sale', entity: Sale, label: 'Vendas' },
    { name: 'UnfinishedSale', entity: UnfinishedSale, label: 'Vendas não Finalizadas' },
    { name: 'ClientAuth', entity: ClientAuth, label: 'Autenticação de Clientes' },
    { name: 'ClientPackage', entity: ClientPackage, label: 'Pacotes de Clientes' },
    { name: 'ClientSubscription', entity: ClientSubscription, label: 'Assinaturas' },
    { name: 'GiftCard', entity: GiftCard, label: 'Gift Cards' },
    { name: 'Client', entity: Client, label: 'Clientes' },
    { name: 'Employee', entity: Employee, label: 'Funcionários' },
    { name: 'Service', entity: Service, label: 'Serviços' },
    { name: 'Product', entity: Product, label: 'Produtos' },
    { name: 'Package', entity: Package, label: 'Pacotes' },
    { name: 'Supplier', entity: Supplier, label: 'Fornecedores' },
    { name: 'SubscriptionPlan', entity: SubscriptionPlan, label: 'Planos de Assinatura' },
    { name: 'Role', entity: Role, label: 'Cargos' },
    { name: 'PaymentMethod', entity: PaymentMethod, label: 'Formas de Pagamento' },
    { name: 'SlideShowImage', entity: SlideShowImage, label: 'Slides do Site' },
    { name: 'Testimonial', entity: Testimonial, label: 'Depoimentos' },
    { name: 'CompanySettings', entity: CompanySettings, label: 'Configurações da Empresa' }
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
      
    } catch (error) {
      console.error(`Erro ao carregar ${entityName}:`, error);
      handleApiError(error, `Erro ao carregar dados de ${entityName}`);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar também a função que deleta dados para incluir tratamento de erros
  const handleDeleteEntityData = async (entityName) => {
    try {
      setDeleteProgress({current: 0, total: 0});
      setLoading(true);
      setMessage({type: 'info', text: `Iniciando exclusão de dados de ${getEntityLabel(entityName)}...`});
      
      const entityApi = getEntityApiByName(entityName);
      let allRecords = [];
      
      try {
        // Obter todos os registros com retry em caso de rate limit
        allRecords = await fetchWithRetry(() => entityApi.list());
      } catch (error) {
        console.error(`Erro ao obter registros de ${entityName}:`, error);
        throw new Error(`Falha ao listar registros de ${entityName}: ${error.message}`);
      }
      
      if (!allRecords || !Array.isArray(allRecords)) {
        throw new Error(`Não foi possível obter a lista de registros de ${entityName}`);
      }
      
      setDeleteProgress({current: 0, total: allRecords.length});
      
      // Excluir cada registro com intervalos e retries
      for (let i = 0; i < allRecords.length; i++) {
        try {
          const record = allRecords[i];
          await fetchWithRetry(() => entityApi.delete(record.id));
          
          // Atualizar progresso
          setDeleteProgress({current: i + 1, total: allRecords.length});
          
          // Pausa entre requisições para evitar rate limit
          if (i < allRecords.length - 1) {
            await delay(delayBetweenRequests);
          }
        } catch (error) {
          console.error(`Erro ao excluir registro ${i+1}/${allRecords.length} de ${entityName}:`, error);
          // Continuar com o próximo registro mesmo após erro
        }
      }
      
      setMessage({type: 'success', text: `Todos os dados de ${getEntityLabel(entityName)} foram excluídos com sucesso!`});
      setShowDeleteDialog(false);
      setEntityToDelete('');
      setDeleteProgress({current: 0, total: 0});
      
    } catch (error) {
      console.error(`Erro ao excluir dados de ${entityName}:`, error);
      setMessage({type: 'error', text: `Erro ao deletar dados de ${getEntityLabel(entityName)}: ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

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

      <div className="grid gap-6 md:grid-cols-2">
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
          
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex items-start gap-2">
            <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p>Esta operação irá excluir:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Todos os clientes e seus dados</li>
                <li>Todos os agendamentos</li>
                <li>Todas as transações financeiras e registros de caixa</li>
                <li>Todos os pacotes e assinaturas</li>
                <li>Todos os produtos, serviços e vendas</li>
                <li>Todas as configurações do sistema</li>
              </ul>
            </div>
          </div>
          
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
                  Deletando...
                </>
              ) : "Sim, Deletar Tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}