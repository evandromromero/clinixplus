import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Trash2, Download, Save, Database, FileDown, Filter, AlertTriangle, Clock, Info, CheckCircle, Search, Upload, FileUp } from "lucide-react";
import { format } from 'date-fns';
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSelectiveDeleteDialog, setShowSelectiveDeleteDialog] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, entity: '' });
  const [rateLimitError, setRateLimitError] = useState(null);
  const [delayBetweenRequests, setDelayBetweenRequests] = useState(500);
  const [activeTab, setActiveTab] = useState('clients');
  const [entityData, setEntityData] = useState([]);
  const [currentEntity, setCurrentEntity] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [backups, setBackups] = useState([]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupProgress, setBackupProgress] = useState({ current: 0, total: 0, entity: '' });
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState({ current: 0, total: 0, entity: '' });
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreData, setRestoreData] = useState(null);
  const [selectedEntitiesToRestore, setSelectedEntitiesToRestore] = useState({});
  const [restoreMode, setRestoreMode] = useState('replace'); // 'replace' ou 'merge'
  const fileInputRef = useRef(null);

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
          await delay(5000);
          setDelayBetweenRequests(prev => prev * 2);
          attempt--;
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
      setProgress({current: 0, total: selectedIds.length});
      setMessage({type: 'info', text: `Excluindo ${selectedIds.length} itens de ${getEntityLabel(currentEntity)}...`});
      
      const entityApi = getEntityApiByName(currentEntity);
      
      for (let i = 0; i < selectedIds.length; i++) {
        try {
          const id = selectedIds[i];
          await fetchWithRetry(() => entityApi.delete(id));
          
          // Atualizar progresso
          setProgress({current: i + 1, total: selectedIds.length});
          
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
      setProgress({current: 0, total: 0});
    }
  };

  // Função para fazer backup de todas as entidades
  const handleBackupAllData = async () => {
    try {
      setBackupInProgress(true);
      setMessage(null);
      setRateLimitError(null);
      setBackupProgress({ current: 0, total: entities.length, entity: '' });

      const backupData = {};
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const backupFileName = `clinixplus_backup_${timestamp}.json`;

      for (let i = 0; i < entities.length; i++) {
        const { entity, label, name } = entities[i];
        
        setBackupProgress({ 
          current: i + 1, 
          total: entities.length, 
          entity: label 
        });
        
        try {
          const items = await fetchWithRetry(async () => {
            await delay(delayBetweenRequests);
            return await entity.list();
          });
          
          console.log(`Backup: Encontrados ${items.length} registros de ${label}`);
          backupData[name] = items;
          
          await delay(delayBetweenRequests);
        } catch (entityError) {
          console.error(`Erro ao fazer backup de ${label}:`, entityError);
          
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

      // Criar o objeto de backup com metadados
      const fullBackup = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          totalEntities: entities.length,
          totalRecords: Object.values(backupData).reduce((acc, items) => acc + items.length, 0)
        },
        data: backupData
      };

      // Criar um blob com os dados
      const backupBlob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      
      // Criar URL para download
      const backupUrl = URL.createObjectURL(backupBlob);
      
      // Adicionar à lista de backups
      const newBackup = {
        id: Date.now().toString(),
        fileName: backupFileName,
        timestamp: new Date().toISOString(),
        url: backupUrl,
        size: backupBlob.size
      };
      
      setBackups(prev => [newBackup, ...prev]);
      
      setMessage({ type: 'success', text: 'Backup concluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao fazer backup:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao fazer backup: ' + (error.message || 'Erro desconhecido') 
      });
      
      if (error.message?.includes('429') || 
          error.message?.includes('Rate limit') || 
          error.toString().includes('429')) {
        setRateLimitError(error);
      }
    } finally {
      setBackupInProgress(false);
      setBackupProgress({ current: 0, total: 0, entity: '' });
    }
  };

  // Função para fazer upload de um arquivo de backup
  const handleUploadBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        
        // Validar o formato do backup
        if (!backupData.metadata || !backupData.data) {
          toast({
            title: "Erro no arquivo de backup",
            description: "O arquivo não está no formato correto de backup",
            variant: "destructive"
          });
          return;
        }
        
        // Criar um objeto de backup para a lista
        const newBackup = {
          id: Date.now().toString(),
          fileName: file.name,
          timestamp: backupData.metadata.timestamp || new Date().toISOString(),
          url: URL.createObjectURL(file),
          size: file.size,
          data: backupData
        };
        
        setBackups(prev => [newBackup, ...prev]);
        
        toast({
          title: "Backup carregado com sucesso",
          description: `${file.name} (${formatFileSize(file.size)})`,
          variant: "default"
        });
        
        // Limpar o input de arquivo
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Erro ao processar arquivo de backup:', error);
        toast({
          title: "Erro ao processar backup",
          description: "O arquivo não contém dados JSON válidos",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
  };

  // Função para preparar a restauração de um backup
  const handlePrepareRestore = (backup) => {
    setSelectedBackup(backup);
    
    // Extrair dados do backup
    let backupData;
    if (backup.data) {
      backupData = backup.data;
    } else {
      try {
        // Se o backup não tiver dados pré-carregados, tentar ler do URL
        const xhr = new XMLHttpRequest();
        xhr.open('GET', backup.url, false); // síncrono para simplificar
        xhr.send(null);
        backupData = JSON.parse(xhr.responseText);
      } catch (error) {
        console.error('Erro ao ler dados do backup:', error);
        toast({
          title: "Erro ao ler backup",
          description: "Não foi possível ler os dados do backup",
          variant: "destructive"
        });
        return;
      }
    }
    
    setRestoreData(backupData);
    
    // Inicializar as entidades selecionadas para restauração
    const initialSelectedEntities = {};
    Object.keys(backupData.data).forEach(entityName => {
      initialSelectedEntities[entityName] = true;
    });
    
    setSelectedEntitiesToRestore(initialSelectedEntities);
    setShowRestoreDialog(true);
  };

  // Função para restaurar dados de um backup
  const handleRestoreBackup = async () => {
    if (!restoreData || !selectedBackup) {
      toast({
        title: "Erro na restauração",
        description: "Dados de backup não encontrados",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setRestoreInProgress(true);
      setMessage(null);
      setRateLimitError(null);
      
      // Filtrar apenas as entidades selecionadas para restauração
      const entitiesToRestore = Object.keys(restoreData.data)
        .filter(entityName => selectedEntitiesToRestore[entityName])
        .map(entityName => ({
          name: entityName,
          data: restoreData.data[entityName],
          entity: getEntityApiByName(entityName)
        }))
        .filter(item => item.entity); // Filtrar apenas entidades válidas
      
      setRestoreProgress({ 
        current: 0, 
        total: entitiesToRestore.length, 
        entity: '' 
      });
      
      let totalRestoredItems = 0;
      
      for (let i = 0; i < entitiesToRestore.length; i++) {
        const { name, data, entity } = entitiesToRestore[i];
        
        setRestoreProgress({ 
          current: i + 1, 
          total: entitiesToRestore.length, 
          entity: getEntityLabel(name) 
        });
        
        if (restoreMode === 'replace') {
          // Modo substituição: excluir dados existentes primeiro
          try {
            const existingItems = await fetchWithRetry(async () => {
              await delay(delayBetweenRequests);
              return await entity.list();
            });
            
            for (const item of existingItems) {
              await fetchWithRetry(async () => {
                await delay(delayBetweenRequests);
                return await entity.delete(item.id);
              });
            }
          } catch (error) {
            console.error(`Erro ao limpar dados existentes de ${name}:`, error);
          }
        }
        
        // Restaurar os dados do backup
        for (const item of data) {
          try {
            if (restoreMode === 'merge' && item.id) {
              // No modo mesclagem, verificar se o item já existe
              try {
                const existingItem = await entity.get(item.id);
                if (existingItem) {
                  // Atualizar item existente
                  await fetchWithRetry(async () => {
                    await delay(delayBetweenRequests);
                    return await entity.update(item.id, item);
                  });
                  totalRestoredItems++;
                  continue;
                }
              } catch (error) {
                // Item não existe, continuar para criação
              }
            }
            
            // Criar novo item
            await fetchWithRetry(async () => {
              await delay(delayBetweenRequests);
              // Se tiver ID, usar o mesmo ID
              if (item.id) {
                return await entity.create(item);
              } else {
                // Se não tiver ID, deixar o Firebase gerar um novo
                const newItem = await entity.create(item);
                return newItem;
              }
            });
            
            totalRestoredItems++;
          } catch (error) {
            console.error(`Erro ao restaurar item de ${name}:`, error);
            
            if (error.message?.includes('429') || 
                error.message?.includes('Rate limit') || 
                error.toString().includes('429')) {
              
              setRateLimitError(error);
              await delay(10000);
              setDelayBetweenRequests(prev => prev * 2);
            }
          }
          
          await delay(delayBetweenRequests);
        }
      }
      
      setMessage({ 
        type: 'success', 
        text: `Restauração concluída com sucesso! ${totalRestoredItems} itens restaurados.` 
      });
      
      // Fechar o diálogo de restauração
      setShowRestoreDialog(false);
      
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao restaurar backup: ' + (error.message || 'Erro desconhecido') 
      });
      
      if (error.message?.includes('429') || 
          error.message?.includes('Rate limit') || 
          error.toString().includes('429')) {
        setRateLimitError(error);
      }
    } finally {
      setRestoreInProgress(false);
      setRestoreProgress({ current: 0, total: 0, entity: '' });
    }
  };

  // Função para alternar a seleção de uma entidade para restauração
  const toggleEntitySelection = (entityName) => {
    setSelectedEntitiesToRestore(prev => ({
      ...prev,
      [entityName]: !prev[entityName]
    }));
  };

  // Função para selecionar/desselecionar todas as entidades para restauração
  const toggleAllEntitiesSelection = (checked) => {
    if (!restoreData) return;
    
    const newSelection = {};
    Object.keys(restoreData.data).forEach(entityName => {
      newSelection[entityName] = checked;
    });
    
    setSelectedEntitiesToRestore(newSelection);
  };

  // Função para fazer download de um backup
  const handleDownloadBackup = (backup) => {
    const a = document.createElement('a');
    a.href = backup.url;
    a.download = backup.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Função para formatar o tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Dados</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {rateLimitError && (
        <RateLimitHandler error={rateLimitError} />
      )}

      {(loading || backupInProgress) && progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processando {progress.entity || backupProgress.entity}...</span>
            <span>{progress.current || backupProgress.current} de {progress.total || backupProgress.total}</span>
          </div>
          <Progress value={((progress.current || backupProgress.current) / (progress.total || backupProgress.total)) * 100} />
        </div>
      )}

      {/* Cards coloridos para as principais ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-blue-50 border-blue-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup de Dados
            </CardTitle>
            <CardDescription className="text-blue-600">
              Crie cópias de segurança dos seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-blue-600 mb-4">
              Faça backup completo do banco de dados para restauração futura.
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowBackupDialog(true)}
              disabled={loading || backupInProgress}
            >
              <Database className="mr-2 h-4 w-4" />
              Fazer Backup
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-amber-50 border-amber-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Exclusão Seletiva
            </CardTitle>
            <CardDescription className="text-amber-600">
              Selecione dados específicos para excluir
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-amber-600 mb-4">
              Escolha exatamente quais dados deseja remover do Firebase.
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              className="w-full bg-amber-600 hover:bg-amber-700"
              onClick={() => setShowSelectiveDeleteDialog(true)}
              disabled={loading || backupInProgress}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Dados Seletivamente
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-red-50 border-red-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Exclusão Total
            </CardTitle>
            <CardDescription className="text-red-600">
              Remove todos os dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-red-600 mb-4">
              Exclui permanentemente todos os dados cadastrados no Firebase.
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading || backupInProgress}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Todos os Dados
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-green-50 border-green-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Save className="h-5 w-5" />
              Dados de Exemplo
            </CardTitle>
            <CardDescription className="text-green-600">
              Adiciona dados para teste do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-green-600 mb-4">
              Preenche o sistema com dados de exemplo para testes e demonstrações.
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleAddSampleData}
              disabled={loading || backupInProgress}
            >
              <Save className="mr-2 h-4 w-4" />
              Adicionar Dados de Exemplo
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog para backup */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Backup e Restauração de Dados</DialogTitle>
            <DialogDescription>
              Faça backup completo do banco de dados, restaure a partir de backups ou carregue um arquivo de backup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Gerenciar Backups</h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={backupInProgress || restoreInProgress}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Carregar Backup
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadBackup}
                  accept=".json"
                  className="hidden"
                />
                <Button 
                  onClick={handleBackupAllData} 
                  disabled={backupInProgress || restoreInProgress}
                >
                  {backupInProgress ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Fazer Backup Completo
                    </>
                  )}
                </Button>
              </div>
            </div>

            {backupInProgress && backupProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fazendo backup de {backupProgress.entity}...</span>
                  <span>{backupProgress.current} de {backupProgress.total}</span>
                </div>
                <Progress value={(backupProgress.current / backupProgress.total) * 100} />
              </div>
            )}

            {restoreInProgress && restoreProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Restaurando {restoreProgress.entity}...</span>
                  <span>{restoreProgress.current} de {restoreProgress.total}</span>
                </div>
                <Progress value={(restoreProgress.current / restoreProgress.total) * 100} />
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Backups Disponíveis</h3>
              
              {backups.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <FileDown className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500">Nenhum backup disponível. Clique em "Fazer Backup Completo" para criar um novo ou "Carregar Backup" para importar um arquivo.</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-4">
                    {backups.map((backup, index) => {
                      // Definir cores alternadas para os cards
                      const colors = [
                        { bg: "bg-blue-50", border: "border-blue-200", accent: "text-blue-600" },
                        { bg: "bg-purple-50", border: "border-purple-200", accent: "text-purple-600" },
                        { bg: "bg-green-50", border: "border-green-200", accent: "text-green-600" },
                        { bg: "bg-amber-50", border: "border-amber-200", accent: "text-amber-600" },
                        { bg: "bg-rose-50", border: "border-rose-200", accent: "text-rose-600" }
                      ];
                      const colorSet = colors[index % colors.length];
                      
                      return (
                        <Card 
                          key={backup.id} 
                          className={`${colorSet.bg} border ${colorSet.border} shadow-sm transition-all hover:shadow-md`}
                        >
                          <CardHeader className="py-5">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                              <div>
                                <CardTitle className={`text-lg ${colorSet.accent} flex items-center gap-2`}>
                                  <Database className="h-5 w-5" />
                                  {backup.fileName}
                                </CardTitle>
                                <CardDescription className="mt-1 text-sm">
                                  Criado em: {format(new Date(backup.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                </CardDescription>
                              </div>
                              <div className="flex space-x-3">
                                <Button 
                                  className={`${colorSet.accent} bg-white hover:bg-gray-50`}
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handlePrepareRestore(backup)}
                                  disabled={backupInProgress || restoreInProgress}
                                >
                                  <FileUp className="h-4 w-4 mr-2" />
                                  Restaurar
                                </Button>
                                <Button 
                                  className={`${colorSet.accent} bg-white hover:bg-gray-50`}
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDownloadBackup(backup)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download ({formatFileSize(backup.size)})
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para restauração de backup */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription>
              Selecione quais dados deseja restaurar a partir do backup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedBackup && (
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-md border border-blue-200">
                <div>
                  <h4 className="font-medium text-blue-700 flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {selectedBackup.fileName}
                  </h4>
                  <p className="text-sm text-blue-600">
                    Criado em: {format(new Date(selectedBackup.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </p>
                </div>
                <Badge variant="outline" className="bg-white text-blue-600 border-blue-200">
                  {formatFileSize(selectedBackup.size)}
                </Badge>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Dados a Restaurar</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-entities"
                    checked={
                      restoreData && 
                      Object.keys(selectedEntitiesToRestore).length > 0 && 
                      Object.keys(restoreData.data).every(
                        name => selectedEntitiesToRestore[name]
                      )
                    }
                    onCheckedChange={toggleAllEntitiesSelection}
                  />
                  <label
                    htmlFor="select-all-entities"
                    className="text-sm font-medium leading-none"
                  >
                    Selecionar Todos
                  </label>
                </div>
              </div>

              {restoreData ? (
                <ScrollArea className="h-[250px] border rounded-md p-4 bg-gray-50">
                  <div className="space-y-3">
                    {Object.keys(restoreData.data).map((entityName, index) => {
                      // Definir cores alternadas para os itens
                      const colors = [
                        { bg: "bg-blue-50", text: "text-blue-700", badge: "border-blue-200 text-blue-600" },
                        { bg: "bg-purple-50", text: "text-purple-700", badge: "border-purple-200 text-purple-600" },
                        { bg: "bg-green-50", text: "text-green-700", badge: "border-green-200 text-green-600" },
                        { bg: "bg-amber-50", text: "text-amber-700", badge: "border-amber-200 text-amber-600" },
                        { bg: "bg-rose-50", text: "text-rose-700", badge: "border-rose-200 text-rose-600" }
                      ];
                      const colorSet = colors[index % colors.length];
                      
                      return (
                        <div 
                          key={entityName} 
                          className={`flex items-center justify-between p-3 rounded-md ${colorSet.bg} border border-gray-200`}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`entity-${entityName}`}
                              checked={selectedEntitiesToRestore[entityName] || false}
                              onCheckedChange={() => toggleEntitySelection(entityName)}
                            />
                            <label
                              htmlFor={`entity-${entityName}`}
                              className={`text-sm font-medium ${colorSet.text}`}
                            >
                              {getEntityLabel(entityName)}
                            </label>
                          </div>
                          <Badge variant="outline" className={`bg-white ${colorSet.badge}`}>
                            {restoreData.data[entityName].length} itens
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">Nenhum dado disponível para restauração</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Modo de Restauração</h3>
              <div className="flex space-x-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="mode-replace"
                    name="restore-mode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <label htmlFor="mode-replace" className="text-sm font-medium">
                    <span className="text-blue-700">Substituir Dados Existentes</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="mode-merge"
                    name="restore-mode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="h-4 w-4 text-green-600"
                  />
                  <label htmlFor="mode-merge" className="text-sm font-medium">
                    <span className="text-green-700">Mesclar com Dados Existentes</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 pl-2 border-l-2 border-gray-300">
                {restoreMode === 'replace' 
                  ? 'Os dados existentes serão excluídos antes da restauração.'
                  : 'Os dados do backup serão mesclados com os dados existentes.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-md border border-amber-200 mt-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                <span className="font-medium">Atenção:</span> A restauração de dados pode substituir ou modificar dados existentes no sistema.
                Recomendamos fazer um backup antes de prosseguir.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRestoreDialog(false)}
              disabled={restoreInProgress}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRestoreBackup}
              disabled={
                restoreInProgress || 
                !restoreData || 
                Object.keys(selectedEntitiesToRestore).every(key => !selectedEntitiesToRestore[key])
              }
            >
              {restoreInProgress ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Iniciar Restauração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para exclusão seletiva */}
      <Dialog open={showSelectiveDeleteDialog} onOpenChange={setShowSelectiveDeleteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Search className="h-5 w-5" />
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
                        <Input
                          placeholder="Buscar..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-8 w-[250px]"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={toggleSelectAll}
                          id="select-all"
                        />
                        <label
                          htmlFor="select-all"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Selecionar Todos
                        </label>
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
          
          {loading && progress.total > 0 && (
            <div className="my-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Excluindo itens selecionados...
                </span>
                <span className="text-sm text-gray-500">
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-amber-500 h-2.5 rounded-full" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
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

      {/* Dialog para exclusão de todos os dados */}
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
          
          {loading && progress.total > 0 && (
            <div className="space-y-2 my-4">
              <div className="flex justify-between text-sm">
                <span>Deletando {progress.entity}...</span>
                <span>{progress.current} de {progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-500">
                Aviso: Esta operação irá excluir todos os dados do Firebase.
              </p>
            </div>
            
            <p className="text-sm text-gray-500">
              Todos os dados serão removidos permanentemente do banco de dados, incluindo:
            </p>
            
            <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
              {entities.map(({ label }) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
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