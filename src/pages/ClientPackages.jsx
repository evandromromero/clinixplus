import React, { useState, useEffect } from 'react';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Client, 
  Package, 
  ClientPackage, 
  Service, 
  Sale, 
  UnfinishedSale,
  Employee,
  Anamnesis
} from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import RateLimitHandler from '@/components/RateLimitHandler';
import { 
  Calendar, 
  Plus, 
  ShoppingBag, 
  Trash2, 
  PlusCircle, 
  Search, 
  PackageCheck, 
  ChevronUp, 
  ChevronDown 
} from "lucide-react";
import { collection, query, where, limit, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

export default function ClientPackages() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [anamnesis, setAnamnesis] = useState(null);
  const [isEditingAnamnesis, setIsEditingAnamnesis] = useState(false);
  const [showAnamnesisDialog, setShowAnamnesisDialog] = useState(false);
  const [anamnesisTemplates, setAnamnesisTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dateFilter, setDateFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [anamnesisForm, setAnamnesisForm] = useState({
    skin_type: "",
    allergies: "",
    health_conditions: "",
    medications: "",
    observations: "",
    last_update: ""
  });
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellForm, setSellForm] = useState({
    client_id: "",
    package_id: "",
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    total_sessions: 0,
    expiration_date: ""
  });
  
  // Estado para controlar o modo de venda (pacote existente, novo ou personalizado)
  const [sellMode, setSellMode] = useState("existing"); // "existing", "new", "custom"
  
  // Estado para o pacote personalizado
  const [customPackageForm, setCustomPackageForm] = useState({
    name: "",
    description: "",
    validity_days: 90,
    services: [],
    total_price: 0,
    discount: 0,
    discount_type: "percentage",
    desired_price: ""
  });
  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    validity_days: 90,
    total_price: 0,
    discount: 0,
    services: []
  });
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [lastClientDoc, setLastClientDoc] = useState(null);
  const [hasMoreClients, setHasMoreClients] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceQuantity, setSelectedServiceQuantity] = useState(1);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [serviceSearchResults, setServiceSearchResults] = useState([]);
  const [showServiceSearch, setShowServiceSearch] = useState(false);
  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [debouncedPackageSearch, setDebouncedPackageSearch] = useState("");
  const [packageSearchResults, setPackageSearchResults] = useState([]);
  const [showPackageSearch, setShowPackageSearch] = useState(false);
  const [isSearchingPackages, setIsSearchingPackages] = useState(false);
  const [lastPackageDoc, setLastPackageDoc] = useState(null);
  const [hasMorePackages, setHasMorePackages] = useState(true);
  const [hasUnfinishedSales, setHasUnfinishedSales] = useState(false);
  const [unfinishedSales, setUnfinishedSales] = useState([]);
  const [newPackage, setNewPackage] = useState({
    client_id: '',
    package_id: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    expiration_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    sell_now: false
  });
  const [showAddDependentDialog, setShowAddDependentDialog] = useState(false);
  const [dependentForm, setDependentForm] = useState({
    name: "",
    birth_date: format(new Date(), 'yyyy-MM-dd'),
    relationship: ""
  });

  // Cache de resultados e debounce timeout
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchResultsCache, setSearchResultsCache] = useState(new Map());
  const [isSearching, setIsSearching] = useState(false);

  const [expandedPackages, setExpandedPackages] = useState({});

  // Estado para abrir/fechar o modal de importação de pacote antigo
  const [showImportPackageDialog, setShowImportPackageDialog] = useState(false);

  // Estado do formulário de importação de pacote antigo
  const [importPackageForm, setImportPackageForm] = useState({
    client_id: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'), // valor padrão: hoje
    validity_days: 90, // valor padrão sugerido
    services: [], // { service_id: '', total: 1, used: 0, sessions: [{ date: '', obs: '' }] }
    notes: '',
  });

  // Estado para busca de cliente/serviço
  const [clientSearchTermImport, setClientSearchTermImport] = useState("");
  const [clientSearchResultsImport, setClientSearchResultsImport] = useState([]);
  const [allClientsCacheImport, setAllClientsCacheImport] = useState(null);
  const [lastClientDocImport, setLastClientDocImport] = useState(null);
  const [hasMoreClientsImport, setHasMoreClientsImport] = useState(true);
  const [isSearchingClientsImport, setIsSearchingClientsImport] = useState(false);

  // Estado para os termos de busca dos serviços no import
  const [serviceSearchTermsImport, setServiceSearchTermsImport] = useState([]);

  // Estado para rastrear qual input de busca de serviço está ativo
  const [activeServiceSearchIndex, setActiveServiceSearchIndex] = useState(null);

  // Funções auxiliares para manipular serviços do pacote importado
  const handleAddServiceToImport = () => {
    setImportPackageForm(prev => ({
      ...prev,
      services: [
        ...prev.services,
        { service_id: '', total: 1, used: 0, sessions: [] },
      ],
    }));
  };
  const handleRemoveServiceFromImport = (idx) => {
    setImportPackageForm(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== idx),
    }));
  };
  const handleImportServiceChange = (idx, field, value) => {
    setImportPackageForm(prev => {
      const services = [...prev.services];
      services[idx][field] = value;
      return { ...prev, services };
    });
  };

  const handleAddSessionToService = (idx) => {
    setImportPackageForm(prev => {
      const services = [...prev.services];
      if (!services[idx].sessions) services[idx].sessions = [];
      services[idx].sessions.push({ date: '', obs: '' });
      services[idx].used = (services[idx].used || 0) + 1;
      return { ...prev, services };
    });
  };

  const handleSessionChange = (serviceIdx, sessionIdx, field, value) => {
    setImportPackageForm(prev => {
      const services = [...prev.services];
      services[serviceIdx].sessions[sessionIdx][field] = value;
      return { ...prev, services };
    });
  };

  const resetNewPackageForm = () => {
    setNewPackage({
      client_id: '',
      package_id: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      expiration_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
      sell_now: false
    });
  };

  const handleCreateNewPackage = async () => {
    try {
      if (!newPackage.client_id || !newPackage.package_id) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um cliente e um pacote",
          variant: "destructive"
        });
        return;
      }

      const purchaseDate = new Date(newPackage.purchase_date);
      const expirationDate = new Date(newPackage.expiration_date);
      
      const packageToCreate = {
        ...newPackage,
        purchase_date: purchaseDate.toISOString().split('T')[0],
        expiration_date: expirationDate.toISOString().split('T')[0]
      };
      
      const packageDetails = await Package.get(newPackage.package_id);
      
      let totalSessions = 0;
      if (packageDetails && packageDetails.services) {
        totalSessions = packageDetails.services.reduce((sum, service) => sum + (service.quantity || 0), 0);
      }
      
      packageToCreate.total_sessions = totalSessions;
      packageToCreate.sessions_used = 0;

      if (packageDetails) {
        packageToCreate.package_snapshot = {
          original_id: packageDetails.id,
          name: packageDetails.name,
          services: packageDetails.services,
          total_price: packageDetails.total_price,
          discount: packageDetails.discount,
          validity_days: packageDetails.validity_days,
          description: packageDetails.description,
          snapshot_date: new Date().toISOString()
        };
      }
      
      const createdPackage = await ClientPackage.create(packageToCreate);
      
      if (newPackage.sell_now) {
        // Redireciona para a página de vendas com os parâmetros necessários
        const params = new URLSearchParams({
          type: 'pacote',
          client_id: newPackage.client_id,
          client_package_id: createdPackage.id,
          amount: packageDetails.total_price
        });
        
        navigate(createPageUrl('SalesRegister', params.toString()));
        return;
      }
      
      toast({
        title: "Sucesso",
        description: "Pacote adicionado com sucesso!",
        variant: "success"
      });
      setShowNewPackageDialog(false);
      resetNewPackageForm();
      loadData();
    } catch (error) {
      console.error("Erro ao criar pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleSellPackage = async () => {
    try {
      if (!sellForm.client_id || !sellForm.package_id) {
        toast({
          title: "Erro",
          description: "Selecione o cliente e o pacote",
          variant: "destructive"
        });
        return;
      }

      const selectedPackage = packages.find(p => p.id === sellForm.package_id);

      const newClientPackage = {
        client_id: sellForm.client_id,
        package_id: sellForm.package_id,
        purchase_date: sellForm.purchase_date,
        expiration_date: sellForm.expiration_date,
        total_sessions: sellForm.total_sessions,
        sessions_used: 0,
        status: 'ativo',
        session_history: [],
        package_snapshot: {
          id: selectedPackage.id,
          name: selectedPackage.name,
          description: selectedPackage.description,
          services: selectedPackage.services,
          total_price: selectedPackage.total_price,
          validity_days: selectedPackage.validity_days
        }
      };

      const createdPackage = await ClientPackage.create(newClientPackage);

      await UnfinishedSale.create({
        client_id: sellForm.client_id,
        type: 'pacote',
        items: [
          {
            item_id: sellForm.package_id,
            name: selectedPackage.name,
            quantity: 1,
            price: selectedPackage.total_price,
            discount: 0
          }
        ],
        total_amount: selectedPackage.total_price,
        client_package_id: createdPackage.id,
        date_created: new Date().toISOString(),
        status: 'pendente'
      });

      const saleParams = new URLSearchParams({
        type: 'pacote',
        client_id: sellForm.client_id,
        package_id: sellForm.package_id,
        client_package_id: createdPackage.id,
        amount: selectedPackage.total_price
      }).toString();

      navigate(createPageUrl('SalesRegister', saleParams));

      setShowSellDialog(false);
      setSellForm({
        client_id: "",
        package_id: "",
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        total_sessions: 0,
        expiration_date: ""
      });

      toast({
        title: "Sucesso",
        description: "Pacote criado com sucesso! Redirecionando para lançar a venda...",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao vender pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Função para vender pacote personalizado
  const handleSellCustomPackage = async () => {
    try {
      if (!sellForm.client_id || !customPackageForm.name || customPackageForm.services.length === 0) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      const packageSnapshot = {
        name: customPackageForm.name,
        description: customPackageForm.description,
        validity_days: customPackageForm.validity_days,
        services: customPackageForm.services.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity
        })),
        total_price: calculateCustomPackageTotal(),
        discount: customPackageForm.discount,
        discount_type: customPackageForm.discount_type,
        snapshot_date: new Date().toISOString()
      };

      const purchaseDate = new Date(sellForm.purchase_date);
      const expirationDate = addDays(purchaseDate, customPackageForm.validity_days);

      const totalSessions = customPackageForm.services.reduce((sum, service) => sum + service.quantity, 0);

      // Cria o objeto do pacote que será salvo no Firestore para o cliente
      const newClientPackage = {
        client_id: sellForm.client_id,
        package_id: packageSnapshot.id, // Use the snapshot ID
        purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
        expiration_date: format(expirationDate, 'yyyy-MM-dd'),
        total_sessions: totalSessions,
        sessions_used: 0,
        status: 'ativo', // Initial status
        session_history: [], // Initialize empty history
        package_snapshot: packageSnapshot, // Store the detailed snapshot
        is_custom_package: true // Flag for custom package
      };

      // --- Firestore Operations ---
      // Use a batch write for atomicity (create client package + unfinished sale)
      const batch = writeBatch(db);

      // 1. Create Client Package document reference
      const clientPackageRef = doc(collection(db, 'client_packages')); // Auto-generate ID
      batch.set(clientPackageRef, newClientPackage);

      // 2. Create Unfinished Sale document reference
      const unfinishedSaleRef = doc(collection(db, 'unfinished_sales')); // Auto-generate ID
      const unfinishedSaleData = {
        client_id: sellForm.client_id,
        type: 'pacote',
        items: [
          {
            item_id: packageSnapshot.id, // Link to the package
            name: packageSnapshot.name,
            quantity: 1,
            price: calculateCustomPackageTotal(), // Final price of the package
            discount: customPackageForm.discount // Store the calculated discount
          }
        ],
        total_amount: calculateCustomPackageTotal(),
        client_package_id: clientPackageRef.id, // Link to the created client package ID
        date_created: serverTimestamp(), // Use server timestamp
        status: 'pendente' // Initial status
      };
      batch.set(unfinishedSaleRef, unfinishedSaleData);

      // Commit the batch
      await batch.commit();
      console.log('Pacote personalizado e venda pendente criados com sucesso. ClientPackage ID:', clientPackageRef.id);

      // Redireciona para a página de vendas com os parâmetros necessários
      const params = new URLSearchParams({
        type: 'pacote',
        client_id: sellForm.client_id,
        client_package_id: clientPackageRef.id,
        amount: calculateCustomPackageTotal()
      }).toString();

      navigate(createPageUrl('SalesRegister', params));

      setShowSellDialog(false);
      setSellForm({
        client_id: "",
        package_id: "",
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        total_sessions: 0,
        expiration_date: ""
      });

      setCustomPackageForm({
        name: "",
        description: "",
        validity_days: 90,
        services: [],
        total_price: 0,
        discount: 0,
        discount_type: "percentage",
        desired_price: ""
      });

      toast({
        title: "Sucesso",
        description: "Pacote personalizado criado com sucesso! Redirecionando para lançar a venda...",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao vender pacote personalizado:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Função para adicionar serviço ao pacote personalizado
  const handleAddServiceToCustomPackage = async () => {
    try {
      if (!selectedServiceId) {
        toast({
          title: "Erro",
          description: "Selecione um serviço para adicionar",
          variant: "destructive"
        });
        return;
      }

      const service = services.find(s => s.id === selectedServiceId);
      if (!service) {
        toast({
          title: "Erro",
          description: "Serviço não encontrado",
          variant: "destructive"
        });
        return;
      }

      // Verifica se o serviço já existe no pacote personalizado
      const existingServiceIndex = customPackageForm.services.findIndex(
        s => s.service_id === selectedServiceId
      );

      if (existingServiceIndex >= 0) {
        // Atualiza a quantidade se o serviço já existe
        const updatedServices = [...customPackageForm.services];
        updatedServices[existingServiceIndex].quantity += selectedServiceQuantity;
        
        setCustomPackageForm({
          ...customPackageForm,
          services: updatedServices
        });
      } else {
        // Adiciona o serviço se não existir
        setCustomPackageForm({
          ...customPackageForm,
          services: [
            ...customPackageForm.services,
            {
              service_id: selectedServiceId,
              name: service.name,
              quantity: selectedServiceQuantity,
              price: parseFloat(service.price)
            }
          ]
        });
      }

      // Limpa os campos
      setSelectedServiceId("");
      setSelectedServiceQuantity(1);
      setServiceSearchTerm("");
    } catch (error) {
      console.error("Erro ao adicionar serviço ao pacote personalizado:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o serviço",
        variant: "destructive"
      });
    }
  };
  
  // Função para remover serviço do pacote personalizado
  // Hooks de debounce para buscas
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedClientSearch) {
        handleSearchClients(debouncedClientSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedClientSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedPackageSearch) {
        handlePackageSearch(debouncedPackageSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedPackageSearch]);

  // Cache de resultados de busca
  const clientSearchCache = React.useMemo(() => {
    if (!clientSearchTerm) return [];
    return clients
      .filter(client => 
        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.phone?.includes(clientSearchTerm)
      )
      .slice(0, 10);
  }, [clients, clientSearchTerm]);

  const packageSearchCache = React.useMemo(() => {
    if (!packageSearchTerm) return [];
    return packages
      .filter(pkg => 
        pkg.name.toLowerCase().includes(packageSearchTerm.toLowerCase())
      )
      .slice(0, 10);
  }, [packages, packageSearchTerm]);

  // Busca local de clientes, igual à tela de vendas
  const handleClientSearch = async (term) => {
    console.log(`[handleClientSearch] Original term: '${term}'`);
    if (!term || term.length < 2) {
      setClientSearchResults([]);
      return;
    }
    setIsSearchingClients(true);
    try {
      // ****** USA Client.search (que usa busca por prefixo no Firestore) ******
      const results = await Client.search(term, 20);
      console.log(`[handleClientSearch] Search results received:`, results);
      setClientSearchResults(results);
    } catch (error) {
      // Client.search já loga o erro específico do Firestore.
      console.error("Erro ao buscar clientes para venda (chamada em ClientPackages):", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar clientes no banco de dados.",
        variant: "destructive"
      });
      setClientSearchResults([]); // Garante limpeza em caso de erro
    } finally {
      setIsSearchingClients(false);
    }
  };

  // Função otimizada de busca de pacotes
  const handlePackageSearch = async (term) => {
    if (!term || term.length < 3) {
      setPackageSearchResults([]);
      return;
    }

    setIsSearchingPackages(true);
    try {
      // Primeiro tenta usar o cache
      const cachedResults = packageSearchCache;
      if (cachedResults.length > 0) {
        setPackageSearchResults(cachedResults);
        return;
      }

      // Se não encontrou no cache, busca no Firebase
      const query = Package.query()
        .where('name', '>=', term.toLowerCase())
        .where('name', '<=', term.toLowerCase() + '\uf8ff')
        .limit(10);

      const results = await Package.list(query);
      setPackageSearchResults(results);
      setLastPackageDoc(results[results.length - 1]);
      setHasMorePackages(results.length === 10);
    } catch (error) {
      console.error('Erro na busca de pacotes:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar pacotes. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingPackages(false);
    }
  };

  // Função para carregar mais resultados de clientes
  const loadMoreClients = async () => {
    if (!lastClientDoc || !hasMoreClients || isSearchingClients) return;

    setIsSearchingClients(true);
    try {
      const query = Client.query()
        .where('name', '>=', debouncedClientSearch.toLowerCase())
        .where('name', '<=', debouncedClientSearch.toLowerCase() + '\uf8ff')
        .startAfter(lastClientDoc)
        .limit(10);

      const results = await Client.list(query);
      setClientSearchResults(prev => [...prev, ...results]);
      setLastClientDoc(results[results.length - 1]);
      setHasMoreClients(results.length === 10);
    } catch (error) {
      console.error('Erro ao carregar mais clientes:', error);
    } finally {
      setIsSearchingClients(false);
    }
  };

  // Função para carregar mais resultados de pacotes
  const loadMorePackages = async () => {
    if (!lastPackageDoc || !hasMorePackages || isSearchingPackages) return;

    setIsSearchingPackages(true);
    try {
      const query = Package.query()
        .where('name', '>=', debouncedPackageSearch.toLowerCase())
        .where('name', '<=', debouncedPackageSearch.toLowerCase() + '\uf8ff')
        .startAfter(lastPackageDoc)
        .limit(10);

      const results = await Package.list(query);
      setPackageSearchResults(prev => [...prev, ...results]);
      setLastPackageDoc(results[results.length - 1]);
      setHasMorePackages(results.length === 10);
    } catch (error) {
      console.error('Erro ao carregar mais pacotes:', error);
    } finally {
      setIsSearchingPackages(false);
    }
  };

  const handleRemoveSession = async (sessionIndex) => {
    if (!window.confirm('Tem certeza que deseja excluir esta sessão do histórico? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Verificação de administrador removida para permitir que todos os usuários possam excluir sessões
      
      // Chamar a função para remover a sessão
      await ClientPackage.removeSessionFromHistory(selectedPackage.id, sessionIndex);
      
      // Atualizar o pacote selecionado
      const updatedPackage = await ClientPackage.get(selectedPackage.id);
      setSelectedPackage(updatedPackage);
      
      // Atualizar a lista de pacotes
      await loadData();
      
      toast({
        title: "Sucesso",
        description: "Sessão removida com sucesso!",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao remover sessão:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover sessão. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // ----- Funções de Cálculo para Pacote Personalizado ----- 

  // Função para calcular o subtotal do pacote personalizado
  const calculateCustomPackageSubtotal = () => {
    return customPackageForm.services.reduce((total, service) => {
      // Ensure price and quantity are numbers
      const price = parseFloat(service.price || 0);
      const quantity = parseInt(service.quantity || 0);
      return total + (price * quantity);
    }, 0);
  };
  
  // Função para calcular o desconto do pacote personalizado
  const calculateCustomPackageDiscount = () => {
    const subtotal = calculateCustomPackageSubtotal();
    let discount = 0;
    const discountValue = parseFloat(customPackageForm.discount || 0);
    const desiredPriceValue = parseFloat(customPackageForm.desired_price || 0);

    if (customPackageForm.discount_type === "percentage") {
      discount = (subtotal * discountValue) / 100;
    } else if (customPackageForm.discount_type === "fixed") {
      discount = discountValue;
    } else if (customPackageForm.discount_type === "desired_price") {
      if (customPackageForm.desired_price === "") {
        discount = 0;
      } else {
        if (desiredPriceValue < subtotal) {
          discount = subtotal - desiredPriceValue;
        } else {
          discount = 0; // Desired price cannot be higher than subtotal
        }
      }
    }

    // Ensure discount is not negative or greater than subtotal
    discount = Math.max(0, discount);
    discount = Math.min(subtotal, discount);

    return discount;
  };
  
  // Função para calcular o total do pacote personalizado
  const calculateCustomPackageTotal = () => {
    const subtotal = calculateCustomPackageSubtotal();
    const discount = calculateCustomPackageDiscount();

    if (customPackageForm.discount_type === "desired_price" && customPackageForm.desired_price !== "") {
       const desiredPriceValue = parseFloat(customPackageForm.desired_price || 0);
       // Ensure desired price is not higher than subtotal
       return Math.min(subtotal, desiredPriceValue);
    }

    return Math.max(0, subtotal - discount); // Ensure total is not negative
  };
  // ----- Fim Funções de Cálculo -----
  
  // ----- Funções Handler do Formulário de Pacote Personalizado ----- 
  const handleRemoveServiceFromCustomPackage = (index) => {
    try {
      const updatedServices = [...customPackageForm.services];
      updatedServices.splice(index, 1);
      
      setCustomPackageForm({
        ...customPackageForm,
        services: updatedServices
      });
    } catch (error) {
      console.error("Erro ao remover serviço do pacote personalizado:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o serviço",
        variant: "destructive"
      });
    }
  };

  // Função para alterar o tipo de desconto do pacote personalizado
  const handleCustomDiscountTypeChange = (type) => {
    setCustomPackageForm({
      ...customPackageForm,
      discount_type: type,
      discount: 0,
      desired_price: "" // Reset desired price when type changes
    });
  };
  
  // Função para alterar o desconto do pacote personalizado
  const handleCustomDiscountChange = (value, type) => {
    setCustomPackageForm({
      ...customPackageForm,
      discount: value, // Store the raw value
      discount_type: type,
      desired_price: type !== 'desired_price' ? "" : customPackageForm.desired_price // Clear desired price if changing to fixed/percentage
    });
  };
  
  // Função para alterar o preço desejado do pacote personalizado
  const handleCustomDesiredPriceChange = (value) => {
    setCustomPackageForm({
      ...customPackageForm,
      desired_price: value, // Store the raw value
      discount_type: "desired_price",
      discount: 0 // Clear fixed/percentage discount when setting desired price
    });
  };
  // ----- Fim Funções Handler do Formulário -----
  
  // ----- Função de Validação do Pacote Personalizado ----- 
  const validateCustomPackage = () => {
    if (!sellForm.client_id) {
      toast({
        title: "Erro de Validação",
        description: "É necessário selecionar um cliente.",
        variant: "destructive"
      });
      return false;
    }

    if (!customPackageForm.name || customPackageForm.name.trim() === "") {
      toast({
        title: "Erro de Validação",
        description: "É necessário informar um nome para o pacote.",
        variant: "destructive"
      });
      return false;
    }

    if (customPackageForm.services.length === 0) {
      toast({
        title: "Erro de Validação",
        description: "Adicione pelo menos um serviço ao pacote.",
        variant: "destructive"
      });
      return false;
    }

    // Validate individual services
    for (const service of customPackageForm.services) {
        if (!service.quantity || parseInt(service.quantity) <= 0) {
            toast({
                title: "Erro de Validação",
                description: `Quantidade inválida para o serviço: ${service.name}`,
                variant: "destructive"
            });
            return false;
        }
         if (service.price === undefined || service.price === null || parseFloat(service.price) < 0) {
             toast({
                 title: "Erro de Validação",
                 description: `Preço inválido para o serviço: ${service.name}`,
                 variant: "destructive"
             });
             return false;
         }
    }

    // Validate discount/price fields
    const discountValue = parseFloat(customPackageForm.discount || 0);
    const desiredPriceValue = parseFloat(customPackageForm.desired_price || 0);

    if (customPackageForm.discount_type === 'percentage' && (discountValue < 0 || discountValue > 100)) {
         toast({ title: "Erro de Validação", description: "Desconto percentual deve ser entre 0 e 100.", variant: "destructive" });
         return false;
    }
    if (customPackageForm.discount_type === 'fixed' && discountValue < 0) {
         toast({ title: "Erro de Validação", description: "Desconto fixo não pode ser negativo.", variant: "destructive" });
         return false;
    }
     if (customPackageForm.discount_type === 'desired_price') {
        if (customPackageForm.desired_price === "" || desiredPriceValue < 0) {
             toast({ title: "Erro de Validação", description: "Preço desejado inválido.", variant: "destructive" });
             return false;
        }
     }
     if (!customPackageForm.validity_days || parseInt(customPackageForm.validity_days) <= 0) {
         toast({ title: "Erro de Validação", description: "Validade em dias deve ser maior que zero.", variant: "destructive" });
         return false;
     }


    return true;
  };
  // ----- Fim Função de Validação -----
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [clientPackagesData, packagesData, servicesData, employeesData] = await Promise.all([
        ClientPackage.list(),
        Package.list(),
        Service.list(),
        Employee.list()
      ]);

      // Carregar apenas os clientes que têm pacotes
      const uniqueClientIds = new Set(clientPackagesData.map(pkg => pkg.client_id));
      const clientsData = [];
      
      // Buscar clientes em lotes de 10 para evitar limites do Firestore
      const clientIdBatches = Array.from(uniqueClientIds).reduce((acc, curr, i) => {
        const batchIndex = Math.floor(i / 10);
        if (!acc[batchIndex]) acc[batchIndex] = [];
        acc[batchIndex].push(curr);
        return acc;
      }, []);

      // Buscar cada lote de clientes
      for (const batch of clientIdBatches) {
        const batchClients = await Promise.all(
          batch.map(id => Client.get(id))
        );
        clientsData.push(...batchClients.filter(Boolean));
      }

      setClientPackages(clientPackagesData);
      setPackages(packagesData);
      setClients(clientsData);
      setServices(servicesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUnfinishedSales = async () => {
    try {
      // Pega todas as vendas não finalizadas
      const unfinishedSalesList = await UnfinishedSale.list();
      
      // Pega todas as vendas do caixa
      const allSales = await Sale.list();
      
      // Filtra apenas as vendas pendentes que NÃO têm uma venda paga correspondente
      const pendingSales = unfinishedSalesList.filter(unfinishedSale => {
        // Verifica se existe uma venda paga correspondente
        const hasPaidSale = allSales.some(sale => {
          // Se o status é pago e o sale_id corresponde
          return sale.status === 'pago' && sale.sale_id === unfinishedSale.sale_id;
        });
        
        // Só mantém na lista se:
        // 1. É uma venda pendente
        // 2. NÃO existe uma venda paga correspondente
        return unfinishedSale.status === 'pendente' && !hasPaidSale;
      });
      
      console.log('Vendas pendentes:', pendingSales);
      setUnfinishedSales(pendingSales);
      setHasUnfinishedSales(pendingSales.length > 0);
    } catch (error) {
      console.error("Erro ao verificar vendas não finalizadas:", error);
    }
  };

  const checkUnfinishedSaleStatus = async () => {
    try {
      // Pega todas as vendas do caixa
      const sales = await Sale.list();
      const unfinishedSalesList = await UnfinishedSale.list();
      
      let updatedAny = false;
      
      for (const unfinishedSale of unfinishedSalesList) {
        // Procura uma venda paga correspondente pelo sale_id
        const paidSale = sales.find(sale => 
          sale.status === 'pago' && sale.sale_id === unfinishedSale.sale_id
        );
        
        if (paidSale && unfinishedSale.status !== 'concluida') {
          console.log('Encontrada venda paga:', paidSale.sale_id);
          // Atualiza o status da venda não finalizada
          await UnfinishedSale.update(unfinishedSale.id, {
            status: 'concluida',
            date_completed: new Date().toISOString()
          });
          updatedAny = true;
        }
      }
      
      // Só recarrega a lista se alguma venda foi atualizada
      if (updatedAny) {
        await checkUnfinishedSales();
      }
    } catch (error) {
      console.error("Erro ao verificar status de vendas não finalizadas:", error);
    }
  };

  const loadAnamnesis = async (clientId) => {
    try {
      const clientAnamnesis = await Anamnesis.query({ client_id: clientId });
      if (clientAnamnesis && clientAnamnesis.length > 0) {
        setAnamnesis(clientAnamnesis[0]);
        setAnamnesisForm({
          skin_type: clientAnamnesis[0].skin_type || "",
          allergies: clientAnamnesis[0].allergies || "",
          health_conditions: clientAnamnesis[0].health_conditions || "",
          medications: clientAnamnesis[0].medications || "",
          observations: clientAnamnesis[0].observations || "",
          last_update: clientAnamnesis[0].last_update || ""
        });
      } else {
        setAnamnesis(null);
        setAnamnesisForm({
          skin_type: "",
          allergies: "",
          health_conditions: "",
          medications: "",
          observations: "",
          last_update: ""
        });
      }
    } catch (error) {
      console.error("Erro ao carregar anamnese:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a anamnese do cliente.",
        variant: "destructive"
      });
    }
  };

  const handleSaveAnamnesis = async () => {
    try {
      const data = {
        ...anamnesisForm,
        client_id: selectedPackage.client_id,
        last_update: new Date().toISOString()
      };

      if (anamnesis) {
        await Anamnesis.update(anamnesis.id, data);
      } else {
        await Anamnesis.create(data);
      }

      await loadAnamnesis(selectedPackage.client_id);
      setIsEditingAnamnesis(false);
      
      toast({
        title: "Sucesso",
        description: "Anamnese salva com sucesso!",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao salvar anamnese:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a anamnese.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (selectedPackage && selectedPackage.client_id) {
      loadAnamnesis(selectedPackage.client_id);
    }
  }, [selectedPackage]);

  const checkAndUpdatePackageStatus = async () => {
    const today = new Date();
    const updates = [];

    clientPackages.forEach(pkg => {
      if (pkg.status === 'ativo') {
        if (isBefore(new Date(pkg.expiration_date), today)) {
          updates.push(ClientPackage.update(pkg.id, { status: 'expirado' }));
        } else if (pkg.sessions_used >= pkg.total_sessions) {
          updates.push(ClientPackage.update(pkg.id, { status: 'finalizado' }));
        }
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
      loadData();
    }
  };

  useEffect(() => {
    if (clientPackages.length > 0) {
      checkAndUpdatePackageStatus();
    }
  }, [clientPackages]);

  // Cache para nomes de clientes para evitar buscas repetidas
  const clientNamesCache = React.useMemo(() => {
    const cache = {};
    clients.forEach(client => {
      cache[client.id] = client.name;
    });
    return cache;
  }, [clients]);

  const getClientName = (clientId) => {
    return clientNamesCache[clientId] || "Cliente não encontrado";
  };

  // Cache para nomes de serviços para evitar buscas repetidas
  const serviceNamesCache = React.useMemo(() => {
    const cache = {};
    services.forEach(service => {
      cache[service.id] = service.name;
    });
    return cache;
  }, [services]);

  const getServiceName = (serviceId) => {
    return serviceNamesCache[serviceId] || "Serviço não encontrado";
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : "Profissional não encontrado";
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'ativo':
        return "bg-green-100 text-green-800 border-green-200";
      case 'finalizado':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'expirado':
        return "bg-amber-100 text-amber-800 border-amber-200";
      case 'cancelado':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProgressBarWidth = (used, total) => {
    return Math.min(100, Math.round((used / total) * 100)) + "%";
  };

  const getFilteredPackages = () => {
    let filtered = [...clientPackages];

    // Filtrar por status
    if (statusFilter !== "todos") {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }

    // Filtrar por data
    if (dateFilter !== "todos") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());

      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      filtered = filtered.filter(pkg => {
        const purchaseDate = new Date(pkg.purchase_date);
        purchaseDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "hoje":
            return purchaseDate.getTime() === today.getTime();
          case "semana":
            return purchaseDate >= thisWeekStart;
          case "mes":
            return purchaseDate >= thisMonthStart;
          default:
            return true;
        }
      });
    }

    // Ordenar por data de compra (mais recentes primeiro)
    filtered.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

    return filtered;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedPackages = getFilteredPackages().slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(getFilteredPackages().length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getPackageInfo = (packageId) => {
    const clientPkg = clientPackages.find(cp => cp.id === packageId);
    if (!clientPkg) return null;

    // Se tiver package_snapshot, use ele
    if (clientPkg.package_snapshot) {
      return {
        name: clientPkg.package_snapshot.name,
        services: clientPkg.package_snapshot.services || []
      };
    }

    // Se não tiver snapshot, busca o pacote original
    const pkg = packages.find(p => p.id === clientPkg.package_id);
    return pkg ? {
      name: pkg.name,
      services: pkg.services || []
    } : null;
  };

  // Cache para serviços de pacotes para evitar recálculos repetidos
  const packageServicesCache = React.useMemo(() => {
    const cache = {};
    clientPackages.forEach(clientPkg => {
      // Primeiro tenta pegar do snapshot
      if (clientPkg.package_snapshot?.services) {
        cache[clientPkg.id] = clientPkg.package_snapshot.services;
      } else {
        // Se não tem no snapshot, busca do pacote original
        const pkg = packages.find(p => p.id === clientPkg.package_id);
        cache[clientPkg.id] = pkg?.services || [];
      }
    });
    return cache;
  }, [clientPackages, packages]);

  const getPackageServices = (clientPkgId) => {
    return packageServicesCache[clientPkgId] || [];
  };

  // Cache para nomes de pacotes para evitar recálculos repetidos
  const packageNamesCache = React.useMemo(() => {
    const cache = {};
    clientPackages.forEach(clientPkg => {
      // Primeiro tenta pegar do snapshot
      if (clientPkg.package_snapshot?.name) {
        cache[clientPkg.id] = clientPkg.package_snapshot.name;
      } else {
        // Se não tem no snapshot, busca do pacote original
        const pkg = packages.find(p => p.id === clientPkg.package_id);
        cache[clientPkg.id] = pkg?.name || "Pacote não encontrado";
      }
    });
    return cache;
  }, [clientPackages, packages]);

  const getPackageName = (clientPkgId) => {
    return packageNamesCache[clientPkgId] || "Pacote não encontrado";
  };

  const confirmDeletePackage = (packageId) => {
    if (!packageId) {
      toast({
        title: "Erro",
        description: "Pacote não encontrado",
        variant: "destructive"
      });
      return;
    }

    setPackageToDelete(packageId);
    setShowDeleteDialog(true);
  };

  const handleDeletePackage = async (packageId) => {
    console.log('[DELETE PACKAGE] Início da função. packageId:', packageId);
    try {
      if (!packageId) {
        console.error('[DELETE PACKAGE] ID do pacote não fornecido');
        toast({
          title: "Erro",
          description: "ID do pacote não fornecido",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        return;
      }

      const clientPkgs = await ClientPackage.list();
      console.log('[DELETE PACKAGE] Pacotes do cliente carregados:', clientPkgs);
      const pkgToDelete = clientPkgs.find(p => p.id === packageId);
      console.log('[DELETE PACKAGE] Pacote a excluir:', pkgToDelete);

      if (!pkgToDelete) {
        console.error('[DELETE PACKAGE] Pacote não encontrado');
        toast({
          title: "Erro",
          description: "Pacote não encontrado",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        return;
      }

      try {
        const sales = await Sale.list();
        console.log('[DELETE PACKAGE] Vendas carregadas:', sales);
        const relatedSale = sales.find(s => 
          s.items?.some(item => 
            item.client_package_id === packageId
          )
        );
        console.log('[DELETE PACKAGE] Venda relacionada:', relatedSale);

        if (relatedSale && relatedSale.status === "pago") {
          console.warn('[DELETE PACKAGE] Pacote já foi pago. relatedSale:', relatedSale);
          toast({
            title: "Erro",
            description: "Não é possível excluir um pacote que já foi pago",
            variant: "destructive"
          });
          setShowDeleteDialog(false);
          return;
        }

        const unfinishedSales = await UnfinishedSale.list();
        console.log('[DELETE PACKAGE] Vendas não finalizadas carregadas:', unfinishedSales);
        const unfinishedSale = unfinishedSales.find(s => s.client_package_id === packageId);
        console.log('[DELETE PACKAGE] Venda não finalizada relacionada:', unfinishedSale);

        if (unfinishedSale) {
          await UnfinishedSale.delete(unfinishedSale.id);
          console.log('[DELETE PACKAGE] Venda não finalizada excluída. ID:', unfinishedSale.id);
        }

        if (relatedSale && relatedSale.status === "pendente") {
          await Sale.delete(relatedSale.id);
          console.log('[DELETE PACKAGE] Venda pendente excluída. ID:', relatedSale.id);
        }
      } catch (error) {
        console.error("[DELETE PACKAGE] Erro ao verificar/excluir vendas relacionadas:", error);
      }

      await ClientPackage.delete(packageId);
      console.log('[DELETE PACKAGE] Pacote do cliente removido com sucesso. packageId:', packageId);

      toast({
        title: "Sucesso",
        description: "Pacote do cliente removido com sucesso",
        variant: "success"
      });
      setShowDeleteDialog(false);
      loadData();
    } catch (error) {
      console.error("[DELETE PACKAGE] Erro ao excluir pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir o pacote. Tente novamente.",
        variant: "destructive"
      });
      setShowDeleteDialog(false);
    }
  };

  const handleSearchPackages = (searchTerm) => {
    if (!searchTerm.trim()) {
      setPackageSearchResults([]);
      return;
    }

    const filteredPackages = packages.filter(pkg => 
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setPackageSearchResults(filteredPackages);
  };

  const handleSearchServices = (searchTerm) => {
    if (!searchTerm.trim()) {
      setServiceSearchResults([]);
      return;
    }

    const filteredServices = services.filter(service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setServiceSearchResults(filteredServices);
  };

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return 'Data não definida';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Data inválida';
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return 'Data inválida';
    }
  };

  const handlePackageChange = (packageId) => {
    setSellForm(prev => {
      const selectedPkg = packages.find(p => p.id === packageId);
      if (!selectedPkg) return prev;

      const purchaseDate = new Date();
      const expirationDate = addDays(purchaseDate, selectedPkg.validity_days);

      const totalSessions = selectedPkg.services.reduce((sum, service) => sum + service.quantity, 0);

      return {
        ...prev,
        package_id: packageId,
        total_sessions: totalSessions,
        purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
        expiration_date: format(expirationDate, 'yyyy-MM-dd')
      };
    });
  };

  const handlePurchaseDateChange = (newDate) => {
    setSellForm(prev => {
      const selectedPkg = packages.find(p => p.id === prev.package_id);

      const dateString = `${newDate}T00:00:00`;
      const purchaseDate = new Date(dateString);

      const expirationDate = selectedPkg 
        ? addDays(purchaseDate, selectedPkg.validity_days)
        : purchaseDate;

      return {
        ...prev,
        purchase_date: newDate,
        expiration_date: format(expirationDate, 'yyyy-MM-dd')
      };
    });
  };

  const handleAddService = () => {
    if (!selectedServiceId || selectedServiceQuantity <= 0) return;

    const serviceToAdd = services.find(s => s.id === selectedServiceId);
    if (!serviceToAdd) return;

    const existingServiceIndex = packageForm.services.findIndex(s => s.service_id === selectedServiceId);

    if (existingServiceIndex >= 0) {
      const updatedServices = [...packageForm.services];
      updatedServices[existingServiceIndex].quantity += selectedServiceQuantity;

      setPackageForm(prev => ({
        ...prev,
        services: updatedServices,
        total_price: calculateTotalPrice(updatedServices, prev.discount)
      }));
    } else {
      const newService = {
        service_id: selectedServiceId,
        name: serviceToAdd.name,
        quantity: selectedServiceQuantity,
        price: parseFloat(serviceToAdd.price)
      };

      const updatedServices = [...packageForm.services, newService];

      setPackageForm(prev => ({
        ...prev,
        services: updatedServices,
        total_price: calculateTotalPrice(updatedServices, prev.discount)
      }));
    }

    setSelectedServiceId("");
    setSelectedServiceQuantity(1);
    setServiceSearchTerm("");
    setShowServiceSearch(false);
  };

  const handleRemoveService = (serviceId) => {
    const updatedServices = packageForm.services.filter(s => s.service_id !== serviceId);

    setPackageForm(prev => ({
      ...prev,
      services: updatedServices,
      total_price: calculateTotalPrice(updatedServices, prev.discount)
    }));
  };

  const calculateTotalPrice = (services, discountPercent) => {
    const subtotal = services.reduce((sum, service) => sum + (service.price * service.quantity), 0);
    const discount = (subtotal * discountPercent) / 100;
    return subtotal - discount;
  };

  const handleCreatePackage = async () => {
    try {
      if (packageForm.name === "" || packageForm.services.length === 0) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      const newPackage = {
        name: packageForm.name,
        description: packageForm.description,
        validity_days: packageForm.validity_days,
        services: packageForm.services.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity
        })),
        total_price: packageForm.total_price,
        discount: packageForm.discount
      };

      await Package.create(newPackage);

      setShowNewPackageDialog(false);
      setPackageForm({
        name: "",
        description: "",
        validity_days: 90,
        total_price: 0,
        discount: 0,
        services: []
      });

      toast({
        title: "Sucesso",
        description: "Pacote criado com sucesso!",
        variant: "success"
      });

      await loadData();
    } catch (error) {
      console.error("Erro ao criar pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleEditPackage = async (packageToEdit) => {
    try {
      // Busca os serviços atualizados
      const servicesData = await Service.list();
      
      console.log('Package to edit:', packageToEdit);
      console.log('Services data:', servicesData);

      // Pega os serviços do pacote
      const packageServices = [];
      const packageServicesList = packageToEdit.services || [];
      
      for (const svc of packageServicesList) {
        // Busca os detalhes do serviço
        const serviceDetails = servicesData.find(s => s.id === svc.service_id);
        console.log('Service details for', svc.service_id, ':', serviceDetails);
        
        // Adiciona o serviço com todos os dados necessários
        packageServices.push({
          service_id: svc.service_id,
          name: serviceDetails?.name || "Serviço não encontrado",
          quantity: parseInt(svc.quantity || 0),
          price: parseFloat(serviceDetails?.price) || 0
        });
      }

      console.log('Mapped package services:', packageServices);

      // Calcula os valores finais
      const subtotal = packageServices.reduce((total, service) => 
        total + (service.price * service.quantity), 0);
      const discount = parseFloat(packageToEdit.discount) || 0;
      const total = subtotal - (subtotal * discount / 100);

      // Atualiza o formulário com os dados do pacote
      setPackageForm({
        name: packageToEdit.name || "",
        description: packageToEdit.description || "",
        validity_days: parseInt(packageToEdit.validity_days) || 90,
        services: packageServices,
        discount: discount,
        total_price: total
      });

      console.log('Form data to set:', packageForm);
      setCurrentPackage(packageToEdit);
      setShowNewPackageDialog(true);
    } catch (error) {
      console.error("Erro ao carregar dados para edição:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar dados do pacote para edição",
        variant: "destructive"
      });
    }
  };

  const handleContinueSale = async (sale) => {
    try {
      const params = new URLSearchParams({
        type: 'pacote',
        client_id: sale.client_id,
        client_package_id: sale.client_package_id,
        amount: sale.total_amount,
        unfinished_sale_id: sale.id
      });
      
      navigate(createPageUrl('SalesRegister', params.toString()));
    } catch (error) {
      console.error("Erro ao continuar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao continuar a venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancelUnfinishedSale = async (saleId) => {
    try {
      await UnfinishedSale.update(saleId, { status: 'cancelada' });
      toast({
        title: "Sucesso",
        description: "Venda não finalizada cancelada com sucesso",
        variant: "success"
      });
      checkUnfinishedSales();
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAddDependent = async () => {
    try {
      if (!dependentForm.name || !dependentForm.birth_date) {
        toast({
          title: "Erro",
          description: "Nome e data de nascimento são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      const updatedPackage = {
        ...selectedPackage,
        dependents: [
          ...(selectedPackage.dependents || []),
          {
            ...dependentForm,
            added_at: new Date().toISOString()
          }
        ]
      };

      await ClientPackage.update(selectedPackage.id, updatedPackage);
      setSelectedPackage(updatedPackage);
      setShowAddDependentDialog(false);
      setDependentForm({
        name: "",
        birth_date: format(new Date(), 'yyyy-MM-dd'),
        relationship: ""
      });

      toast({
        title: "Sucesso",
        description: "Dependente adicionado com sucesso!",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao adicionar dependente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o dependente.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveDependent = async (index) => {
    try {
      const updatedDependents = [...(selectedPackage.dependents || [])];
      updatedDependents.splice(index, 1);

      const updatedPackage = {
        ...selectedPackage,
        dependents: updatedDependents
      };

      await ClientPackage.update(selectedPackage.id, updatedPackage);
      setSelectedPackage(updatedPackage);

      toast({
        title: "Sucesso",
        description: "Dependente removido com sucesso!",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao remover dependente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o dependente.",
        variant: "destructive"
      });
    }
  };

  const togglePackageExpansion = (packageId, event) => {
    event.stopPropagation(); // Evita que o clique selecione o pacote
    setExpandedPackages(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }));
  };

  // Função para salvar o pacote importado
  async function handleSaveImportPackage() {
    console.log('[IMPORT] Clique no botão Salvar Pacote Importado');
    console.log('[IMPORT] importPackageForm:', importPackageForm);
  
    if (!importPackageForm.client_id || importPackageForm.services.length === 0) {
      toast({ title: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    if (importPackageForm.services.some(s => !s.service_id || !s.total || s.total < 1)) {
      toast({ title: 'Preencha todos os serviços corretamente.' });
      return;
    }
  
    const purchaseDate = new Date(importPackageForm.purchase_date);
    const validityDays = parseInt(importPackageForm.validity_days);
    const expirationDate = isNaN(validityDays)
      ? null
      : format(addDays(purchaseDate, validityDays), 'yyyy-MM-dd');

    const totalSessions = importPackageForm.services.reduce((sum, s) => sum + (parseInt(s.total || 0)), 0);
    const sessionsUsed = importPackageForm.services.reduce((sum, s) => sum + (parseInt(s.used || 0)), 0);
  
    // Montar o array de histórico de sessões concluídas
    const session_history = [];
    importPackageForm.services.forEach(svc => {
      (svc.sessions || []).forEach(sess => {
        session_history.push({
          date: sess.date,
          service_id: svc.service_id,
          employee_name: sess.employee_name || sess.obs || svc.employee_name || '', // Corrigido para buscar do campo correto
          notes: sess.notes || '', // Somente observações reais
          status: 'concluido', // Marca como concluído para exibir corretamente no portal
        });
      });
    });

    const newImportedPackage = {
      client_id: importPackageForm.client_id,
      package_id: null,
      purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
      expiration_date: expirationDate,
      total_sessions: totalSessions,
      sessions_used: sessionsUsed,
      status: 'ativo',
      session_history, // <-- agora preenchido corretamente
      is_imported_package: true,
      import_notes: importPackageForm.notes || "",
      created_at: new Date().toISOString(),
      package_snapshot: {
        name: "Pacote Antigo",
        description: importPackageForm.notes || "",
        validity_days: validityDays,
        services: importPackageForm.services.map(s => ({
          service_id: s.service_id,
          quantity: parseInt(s.total || 0)
        })),
        total_price: null,
        discount: null,
        snapshot_date: new Date().toISOString(),
        is_imported: true
      }
    };
  
    try {
      setLoading(true);
      console.log('[IMPORT] Objeto montado para salvar:', newImportedPackage);
      await ClientPackage.create(newImportedPackage);
      console.log('[IMPORT] Pacote importado salvo com sucesso!');
      toast({ title: 'Pacote importado adicionado com sucesso!', variant: 'success' });
      setShowImportPackageDialog(false);
      // Limpar formulário e estados relacionados após salvar
      setImportPackageForm({
        client_id: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        validity_days: 90,
        services: [],
        notes: '',
      });
      setServiceSearchTermsImport([]);
      setActiveServiceSearchIndex(null);
      setClientSearchTermImport("");
      setClientSearchResultsImport([]);
      await loadData();
    } catch (error) {
      console.error('[IMPORT] Erro ao salvar pacote importado:', error);
      toast({ title: 'Erro ao importar pacote', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }


  // Estado para busca de cliente/serviço
  


  // Funções auxiliares para manipular serviços do pacote importado
  


  const handleServiceSelectImport = (idx, serviceId, serviceName) => {
    setImportPackageForm(prev => {
      const newServices = [...prev.services];
      newServices[idx] = {
        ...newServices[idx],
        service_id: serviceId,
        name: serviceName
      };
      return { ...prev, services: newServices };
    });
    setServiceSearchTermsImport(prev => {
      const arr = [...prev];
      arr[idx] = serviceName;
      return arr;
    });
    setActiveServiceSearchIndex(null); // Fecha o dropdown
    const input = document.getElementById(`import-service-search-${idx}`);
    if (input) input.blur(); // Remove o foco
  };

  const handleServiceSearchChangeImport = (idx, value) => {
    setServiceSearchTermsImport(prev => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
  };

  const getFilteredServicesImport = (idx) => {
    const term = (serviceSearchTermsImport[idx] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!term) return services;
    return services.filter(s => (s.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
  };

  
    // Função para buscar clientes especificamente na modal de importação
    const handleClientSearchImport = async (term) => {
      setClientSearchTermImport(term);
      console.log(`[handleClientSearchImport] Original term: '${term}'`);
      // Normaliza o termo da mesma forma que deve estar no array searchableFields
      const normalizedTerm = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      console.log(`[handleClientSearchImport] Normalized term for search: '${normalizedTerm}'`);

      // Reduzi para 2 caracteres para permitir busca mais cedo, ajuste se necessário
      if (!term || term.length < 2) {
        setClientSearchResultsImport([]);
        return;
      }
      setIsSearchingClientsImport(true);
      try {
        // ****** USA Client.search (que usa 'array-contains' no Firestore) ******
        // Passa o termo normalizado e o limite
        const results = await Client.search(normalizedTerm, 20);
        console.log(`[handleClientSearchImport] Search results received:`, results);

        setClientSearchResultsImport(results);

      } catch (error) {
        // O erro já é logado dentro de Client.search, aqui apenas tratamos a UI
        console.error("Erro ao buscar clientes (chamada em ClientPackages):", error); // Log adicional opcional
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar clientes. Tente novamente ou verifique o console.",
          variant: "destructive",
        });
        setClientSearchResultsImport([]); // Limpa resultados em caso de erro
      } finally {
        setIsSearchingClientsImport(false);
      }
    };

  // ----- useEffect Hook for Initial Data Loading ----- 
  useEffect(() => {
    // Carregar o usuário atual do localStorage
    const userData = localStorage.getItem('user');
    console.log('Dados do usuário do localStorage:', userData);

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Usuário carregado:', parsedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    } else {
      console.log('Nenhum usuário encontrado no localStorage');
    }

    loadData(); // Assuming this loads packages, services, etc.
    checkUnfinishedSales(); // Check for pending sales on load

    // Setup interval for checking unfinished sales status (optional, depends on workflow)
    // Consider if this polling is necessary or if Firestore listeners are better
    const interval = setInterval(() => {
      checkUnfinishedSaleStatus(); // Assuming this function exists and checks status
    }, 30000); // Poll every 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []); // Run only on mount
  // ----- Fim useEffect Hook -----
 
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Pacotes de Clientes</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowNewPackageDialog(true)} 
            className="bg-[#294380] hover:bg-[#1b2d5d] text-white"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Novo Pacote
          </Button>
          <Button 
            onClick={() => setShowSellDialog(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Vender Pacote
          </Button>
          <Button
            variant="outline"
            className="ml-2"
            onClick={() => setShowImportPackageDialog(true)}
          >
            Importar Pacote
          </Button>
        </div>
      </div>

      {hasUnfinishedSales && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative mb-4">
          <h3 className="font-medium mb-2">Vendas de pacotes não finalizadas</h3>
          <div className="space-y-2">
            {unfinishedSales.map(sale => {
              const clientPackage = clientPackages.find(pkg => pkg.id === sale.client_package_id);
              const client = clients.find(c => c.id === sale.client_id);
              return (
                <div key={sale.id} className="flex justify-between items-center">
                  <div>
                    <p>Cliente: {client ? client.name : <span className="text-red-600">Cliente não encontrado</span>}</p>
                    <p className="text-sm text-yellow-700">
                      Pacote: {clientPackage && clientPackage.package_snapshot && clientPackage.package_snapshot.name ? clientPackage.package_snapshot.name : <span className="text-red-600">Pacote não encontrado</span>} - 
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total_amount)}
                    </p>
                    <p className="text-sm text-yellow-600">
                      Iniciado em: {formatDateSafe(sale.date_created)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => handleContinueSale(sale)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      Continuar venda
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Deseja cancelar esta venda não finalizada?")) {
                          handleCancelUnfinishedSale(sale.id);
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Card>
        <CardContent className="p-6">
          {/* Versão Mobile */}
          <div className="md:hidden space-y-4 mb-6">
            {/* Barra de Pesquisa e Botão Novo */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    handleClientSearch(e.target.value);
                    setShowClientSearch(true);
                  }}
                  onFocus={() => setShowClientSearch(true)}
                  className="pl-9"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              </div>
              <Button
                variant="outline"
                className="ml-2"
                onClick={() => setShowImportPackageDialog(true)}
              >
                Importar Pacote
              </Button>
            </div>

            {/* Filtros em Linha */}
            <div className="flex gap-2">
              {/* Status */}
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="finalizado">Finalizados</SelectItem>
                    <SelectItem value="expirado">Expirados</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Período */}
              <div className="flex-1">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Semana</SelectItem>
                    <SelectItem value="mes">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 h-9"
                onClick={() => {
                  setSelectedClient('');
                  setStatusFilter('todos');
                  setDateFilter('todos');
                  setSearchTerm('');
                }}
              >
                Limpar Filtros
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-9"
                onClick={() => setShowNewPackageDialog(true)}
              >
                Novo Pacote
              </Button>
            </div>

            {/* Lista de Clientes Filtrados (se houver busca) */}
            {showClientSearch && clientSearchResults?.length > 0 && (
              <div className="bg-white border rounded-md shadow-sm max-h-48 overflow-y-auto">
                {clientSearchResults.map(client => (
                  <button
                    key={client.id}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => {
                      setSelectedClient(client.id);
                      setClientSearchTerm('');
                      setShowClientSearch(false);
                      setClients(prev => [...prev, client]);
                    }}
                  >
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-gray-500">{client.phone || 'Sem telefone'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Versão Desktop */}
          <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="expirado">Expirados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os períodos</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSelectedClient("");
                  setStatusFilter("todos");
                  setDateFilter("todos");
                  setCurrentPage(1);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-center py-10 text-gray-500">Carregando pacotes...</p>
          ) : paginatedPackages.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhum pacote encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  Mostrando {Math.min(itemsPerPage, paginatedPackages.length)} de {getFilteredPackages().length} resultados
                </p>
              </div>

              <div className="space-y-4">
                {paginatedPackages.map(clientPkg => (
                  <div 
                    key={clientPkg.id} 
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      selectedPackage?.id === clientPkg.id 
                        ? 'border-blue-500 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPackage(clientPkg)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {getPackageName(clientPkg.id)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Cliente: {getClientName(clientPkg.client_id)}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <Badge 
                          variant="outline" 
                          className={getStatusBadgeStyle(clientPkg.status)}
                        >
                          {clientPkg.status.charAt(0).toUpperCase() + clientPkg.status.slice(1)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Válido até {formatDateSafe(clientPkg.expiration_date)}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeletePackage(clientPkg.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progresso:</span>
                        <span>{clientPkg.sessions_used} de {clientPkg.total_sessions} sessões</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: getProgressBarWidth(clientPkg.sessions_used, clientPkg.total_sessions) }}
                        ></div>
                      </div>

                      {/* Botão para expandir/minimizar detalhes */}
                      <button 
                        onClick={(e) => togglePackageExpansion(clientPkg.id, e)}
                        className="w-full flex items-center justify-center py-2 mt-3 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      >
                        {expandedPackages[clientPkg.id] ? (
                          <>
                            <span>Menos detalhes</span>
                            <ChevronUp className="h-4 w-4 ml-1" />
                          </>
                        ) : (
                          <>
                            <span>Mais detalhes</span>
                            <ChevronDown className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </button>

                      {/* Conteúdo expandido */}
                      {expandedPackages[clientPkg.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {/* Lista de Serviços */}
                          <div className="mt-2">
                            <h4 className="text-sm font-medium mb-2">Serviços Incluídos:</h4>
                            <div className="space-y-2">
                              {getPackageServices(clientPkg.id).map((service, index) => (
                                <div 
                                  key={`${clientPkg.id}-${service.service_id}-${index}`}
                                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{getServiceName(service.service_id)}</span>
                                    <span className="text-sm text-gray-600">{service.quantity}x</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Histórico de sessões */}
                          {clientPkg.session_history && clientPkg.session_history.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">Histórico de Sessões:</h4>
                              <div className="space-y-2">
                                {clientPkg.session_history
                                  .filter(session => session.status === 'concluido')
                                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                                  .map((session, index) => (
                                    <div 
                                      key={`${clientPkg.id}-session-${index}`}
                                      className="flex justify-between items-center"
                                    >
                                      <div>
                                        <p className="font-medium">{getServiceName(session.service_id)}</p>
                                        <p className="text-sm text-gray-500">
                                          {formatDateSafe(session.date)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                          Profissional: {
                                            session.employee_id && getEmployeeName(session.employee_id)
                                              ? getEmployeeName(session.employee_id)
                                              : session.employee_name
                                                ? session.employee_name
                                                : 'Profissional não encontrado'
                                          }
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge 
                                          variant="outline" 
                                          className={
                                            session.status === 'concluido' ? 'bg-green-50 text-green-700' :
                                            session.status === 'agendado' ? 'bg-blue-50 text-blue-700' :
                                            session.status === 'cancelado' ? 'bg-red-50 text-red-700' :
                                            'bg-gray-50 text-gray-700'
                                          }
                                        >
                                          {session.status === 'concluido' ? 'Concluído' :
                                           session.status === 'agendado' ? 'Agendado' :
                                           session.status === 'cancelado' ? 'Cancelado' :
                                           session.status}
                                        </Badge>
                                        {(
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveSession(index)}
                                            title="Excluir sessão"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>

                  <div className="text-sm">
                    Página {currentPage} de {totalPages}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedPackage && (
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Detalhes do Pacote</TabsTrigger>
            <TabsTrigger value="history">Histórico de Sessões</TabsTrigger>
            <TabsTrigger value="dependents">Dependentes</TabsTrigger>
            <TabsTrigger value="anamnesis">Anamnese</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Pacote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Pacote</h3>
                      <p className="text-lg font-medium">
                        {getPackageName(selectedPackage.id)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
                      <p className="text-lg font-medium">{getClientName(selectedPackage.client_id)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Data de Compra</h3>
                      <p className="text-base">
                        {formatDateSafe(selectedPackage.purchase_date)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Data de Validade</h3>
                      <p className="text-base">
                        {formatDateSafe(selectedPackage.expiration_date)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <Badge 
                        variant="outline" 
                        className={getStatusBadgeStyle(selectedPackage.status)}
                      >
                        {selectedPackage.status.charAt(0).toUpperCase() + selectedPackage.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Progresso do Pacote</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Sessões Utilizadas:</span>
                        <span>{selectedPackage.sessions_used} de {selectedPackage.total_sessions}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full" 
                          style={{ width: getProgressBarWidth(selectedPackage.sessions_used, selectedPackage.total_sessions) }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Serviços Incluídos</h3>
                    <div className="space-y-2">
                      {getPackageServices(selectedPackage.id).map((service, index) => (
                        <div 
                          key={index}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{getServiceName(service.service_id)}</span>
                            <span className="text-sm text-gray-600">{service.quantity}x</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Histórico de Sessões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPackage.session_history && selectedPackage.session_history.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPackage.session_history.map((session, index) => {
                      console.log('[HISTÓRICO] Session exibida:', session);
                      return (
                        <div 
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{getServiceName(session.service_id)}</p>
                            <p className="text-sm text-gray-500">
                              {formatDateSafe(session.date)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Profissional: {
                                session.employee_id && getEmployeeName(session.employee_id)
                                  ? getEmployeeName(session.employee_id)
                                  : session.employee_name
                                    ? session.employee_name
                                    : 'Profissional não encontrado'
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={
                                session.status === 'concluido' ? 'bg-green-50 text-green-700' :
                                session.status === 'agendado' ? 'bg-blue-50 text-blue-700' :
                                session.status === 'cancelado' ? 'bg-red-50 text-red-700' :
                                'bg-gray-50 text-gray-700'
                              }
                            >
                              {session.status === 'concluido' ? 'Concluído' :
                               session.status === 'agendado' ? 'Agendado' :
                               session.status === 'cancelado' ? 'Cancelado' :
                               session.status}
                            </Badge>
                            {(
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRemoveSession(index)}
                                title="Excluir sessão"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-500">
                    Nenhuma sessão utilizada ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="dependents" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dependentes</CardTitle>
                <Button onClick={() => setShowAddDependentDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Dependente
                </Button>
              </CardHeader>
              <CardContent>
                {selectedPackage.dependents && selectedPackage.dependents.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPackage.dependents.map((dependent, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-start"
                      >
                        <div>
                          <p className="font-medium">{dependent.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatDateSafe(dependent.birth_date)}
                          </p>
                          {dependent.relationship && (
                            <p className="text-sm text-gray-500">
                              Parentesco: {dependent.relationship}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveDependent(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Nenhum dependente cadastrado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="anamnesis" className="pt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Anamnese do Cliente</CardTitle>
                {!isEditingAnamnesis ? (
                  <Button variant="outline" onClick={() => setIsEditingAnamnesis(true)}>
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditingAnamnesis(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveAnamnesis}>
                      Salvar
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de Pele</Label>
                    {isEditingAnamnesis ? (
                      <Select 
                        value={anamnesisForm.skin_type} 
                        onValueChange={(value) => setAnamnesisForm(prev => ({ ...prev, skin_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de pele" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="seca">Seca</SelectItem>
                          <SelectItem value="oleosa">Oleosa</SelectItem>
                          <SelectItem value="mista">Mista</SelectItem>
                          <SelectItem value="sensivel">Sensível</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-600">{anamnesis?.skin_type || "Não informado"}</p>
                    )}
                  </div>

                  <div>
                    <Label>Alergias</Label>
                    {isEditingAnamnesis ? (
                      <Textarea 
                        value={anamnesisForm.allergies}
                        onChange={(e) => setAnamnesisForm(prev => ({ ...prev, allergies: e.target.value }))}
                        placeholder="Liste as alergias do cliente"
                      />
                    ) : (
                      <p className="text-gray-600">{anamnesis?.allergies || "Nenhuma alergia registrada"}</p>
                    )}
                  </div>

                  <div>
                    <Label>Condições de Saúde</Label>
                    {isEditingAnamnesis ? (
                      <Textarea 
                        value={anamnesisForm.health_conditions}
                        onChange={(e) => setAnamnesisForm(prev => ({ ...prev, health_conditions: e.target.value }))}
                        placeholder="Liste as condições de saúde relevantes"
                      />
                    ) : (
                      <p className="text-gray-600">{anamnesis?.health_conditions || "Nenhuma condição registrada"}</p>
                    )}
                  </div>

                  <div>
                    <Label>Medicamentos em Uso</Label>
                    {isEditingAnamnesis ? (
                      <Textarea 
                        value={anamnesisForm.medications}
                        onChange={(e) => setAnamnesisForm(prev => ({ ...prev, medications: e.target.value }))}
                        placeholder="Liste os medicamentos em uso"
                      />
                    ) : (
                      <p className="text-gray-600">{anamnesis?.medications || "Nenhum medicamento registrado"}</p>
                    )}
                  </div>

                  <div>
                    <Label>Observações Adicionais</Label>
                    {isEditingAnamnesis ? (
                      <Textarea 
                        value={anamnesisForm.observations}
                        onChange={(e) => setAnamnesisForm(prev => ({ ...prev, observations: e.target.value }))}
                        placeholder="Adicione observações relevantes"
                      />
                    ) : (
                      <p className="text-gray-600">{anamnesis?.observations || "Nenhuma observação registrada"}</p>
                    )}
                  </div>

                  {anamnesis?.last_update && !isEditingAnamnesis && (
                    <p className="text-sm text-gray-500">
                      Última atualização: {formatDateSafe(anamnesis.last_update)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Vender Pacote</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Opções de modo de venda */}
            <div className="flex justify-center space-x-4 mb-2">
              <Button 
                variant={sellMode === "existing" ? "default" : "outline"}
                className={sellMode === "existing" ? "bg-purple-600 hover:bg-purple-700 px-6" : "px-6"}
                onClick={() => setSellMode("existing")}
              >
                Pacote Existente
              </Button>
              <Button 
                variant={sellMode === "custom" ? "default" : "outline"}
                className={sellMode === "custom" ? "bg-purple-600 hover:bg-purple-700 px-6" : "px-6"}
                onClick={() => setSellMode("custom")}
              >
                Pacote Personalizado
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client" className="flex items-center">
                  Cliente <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Buscar cliente por nome, email ou CPF..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value);
                          handleClientSearch(e.target.value);
                          setShowClientSearch(true);
                        }}
                        onFocus={() => setShowClientSearch(true)}
                        className="pr-8"
                      />
                      <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    {sellForm.client_id && (
                      <Badge className="whitespace-nowrap">
                        {getClientName(sellForm.client_id)}
                      </Badge>
                    )}
                  </div>

                  {(isSearchingClients || clientSearchResults.length > 0) && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-y-auto">
                      {isSearchingClients ? (
                        <div className="p-2 text-gray-400">Buscando...</div>
                      ) : clientSearchResults.map((client) => (
                        <button
                          key={client.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            console.log('Selecionado cliente da busca:', client.name); // Log para debug
                            setSellForm({ ...sellForm, client_id: client.id });
                            setClientSearchTerm(client.name); // Atualiza o input com o nome
                            setClientSearchResults([]);       // Limpa os resultados da busca
                            setShowClientSearch(false);       // Esconde o dropdown de resultados
                            const searchInput = document.getElementById('client-search-sell');
                            if (searchInput) searchInput.blur(); // Remover foco do input
                          }}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500 flex gap-2">
                            <span>{client.cpf}</span>
                            {client.email && <span>• {client.email}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {sellMode === "existing" && (
                <div className="space-y-2">
                  <Label htmlFor="package">Pacote</Label>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Input
                        placeholder="Buscar pacote por nome ou descrição..."
                        value={packageSearchTerm}
                        onChange={(e) => {
                          setPackageSearchTerm(e.target.value);
                          handleSearchPackages(e.target.value);
                          setShowPackageSearch(true);
                        }}
                        onFocus={() => setShowPackageSearch(true)}
                        className="pr-8"
                      />
                      <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                      {showPackageSearch && packageSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-y-auto">
                          {packageSearchResults.map((pkg) => (
                            <button
                              key={pkg.id}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => {
                                handlePackageChange(pkg.id);
                                setPackageSearchTerm(pkg.name);
                                setShowPackageSearch(false);
                              }}
                            >
                              <div className="font-medium">{pkg.name}</div>
                              <div className="text-sm text-gray-500">
                                R$ {pkg.total_price.toFixed(2)} • {pkg.validity_days} dias
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowSellDialog(false);
                        setShowNewPackageDialog(true);
                      }}
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Criar Novo
                    </Button>
                  </div>
                </div>
              )}
              
              {sellMode === "custom" && (
                <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom_package_name" className="flex items-center">
                      Nome do Pacote Personalizado <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="custom_package_name"
                      placeholder="Ex: Pacote Facial Personalizado"
                      value={customPackageForm.name}
                      onChange={(e) => setCustomPackageForm({...customPackageForm, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custom_validity_days">Validade (dias)</Label>
                    <Input
                      id="custom_validity_days"
                      type="number"
                      value={customPackageForm.validity_days}
                      onChange={(e) => setCustomPackageForm({...customPackageForm, validity_days: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Adicionar Serviços <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="relative">
                        <Input
                          placeholder="Cadastrar serviço..."
                          value={serviceSearchTerm}
                          onChange={(e) => {
                            setServiceSearchTerm(e.target.value);
                            handleSearchServices(e.target.value);
                            setShowServiceSearch(true);
                          }}
                          onFocus={() => setShowServiceSearch(true)}
                          className="pr-8"
                        />
                        <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                        {showServiceSearch && serviceSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-y-auto">
                            {serviceSearchResults.map((service) => (
                              <button
                                key={service.id}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                                onClick={() => {
                                  setSelectedServiceId(service.id);
                                  setServiceSearchTerm(service.name);
                                  setShowServiceSearch(false);
                                }}
                              >
                                <div className="font-medium">{service.name}</div>
                                <div className="text-sm text-gray-500">
                                  R$ {service.price.toFixed(2)} • {service.duration} min
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <div className="w-full">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Quantidade"
                            value={selectedServiceQuantity}
                            onChange={(e) => setSelectedServiceQuantity(parseInt(e.target.value))}
                          />
                        </div>
                      </div>

                      <Button 
                        type="button"
                        onClick={handleAddServiceToCustomPackage}
                        disabled={!selectedServiceId}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Serviço
                      </Button>
                    </div>
                  </div>
                  
                  {customPackageForm.services.length > 0 && (
                    <div className="space-y-2">
                      <Label>Serviços Adicionados</Label>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serviço</TableHead>
                              <TableHead className="text-right">Quantidade</TableHead>
                              <TableHead className="text-right">Preço</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                              <TableHead className="text-right"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customPackageForm.services.map((service, index) => (
                              <TableRow key={index}>
                                <TableCell>{service.name}</TableCell>
                                <TableCell className="text-right">{service.quantity}</TableCell>
                                <TableCell className="text-right">R$ {service.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">R$ {(service.price * service.quantity).toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemoveServiceFromCustomPackage(index)}
                                    title="Excluir serviço"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 mt-4">
                    <Label>Preço e Desconto</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <input 
                            type="radio" 
                            id="percentage_discount" 
                            checked={customPackageForm.discount_type === "percentage"}
                            onChange={() => handleCustomDiscountTypeChange("percentage")}
                          />
                          <label htmlFor="percentage_discount">Desconto %</label>
                          
                          <input 
                            type="radio" 
                            id="fixed_discount" 
                            checked={customPackageForm.discount_type === "fixed"}
                            onChange={() => handleCustomDiscountTypeChange("fixed")}
                          />
                          <label htmlFor="fixed_discount">Desconto R$</label>
                          
                          <input 
                            type="radio" 
                            id="desired_price" 
                            checked={customPackageForm.discount_type === "desired_price"}
                            onChange={() => handleCustomDiscountTypeChange("desired_price")}
                          />
                          <label htmlFor="desired_price">Preço Final</label>
                        </div>
                        
                        {customPackageForm.discount_type === "percentage" && (
                          <div className="flex items-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={customPackageForm.discount}
                              onChange={(e) => handleCustomDiscountChange(e.target.value, "percentage")}
                              className="w-full"
                            />
                            <span className="ml-2">%</span>
                          </div>
                        )}
                        
                        {customPackageForm.discount_type === "fixed" && (
                          <div className="flex items-center">
                            <span className="mr-2">R$</span>
                            <Input
                              type="number"
                              min="0"
                              value={customPackageForm.discount}
                              onChange={(e) => handleCustomDiscountChange(e.target.value, "fixed")}
                              className="w-full"
                            />
                          </div>
                        )}
                        
                        {customPackageForm.discount_type === "desired_price" && (
                          <div className="flex items-center">
                            <span className="mr-2">R$</span>
                            <Input
                              type="number"
                              min="0"
                              value={customPackageForm.desired_price}
                              onChange={(e) => handleCustomDesiredPriceChange(e.target.value)}
                              className="w-full"
                              placeholder="Preço final desejado"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>R$ {calculateCustomPackageSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Desconto:</span>
                          <span>R$ {calculateCustomPackageDiscount().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>R$ {calculateCustomPackageTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {sellMode === "existing" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_date">Data da Compra</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={sellForm.purchase_date}
                      onChange={(e) => handlePurchaseDateChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiration_date">Data de Validade</Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={sellForm.expiration_date}
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sessions">Total de Sessões</Label>
                    <Input
                      id="sessions"
                      type="number"
                      value={sellForm.total_sessions}
                      onChange={(e) => setSellForm({...sellForm, total_sessions: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSellDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              onClick={() => {
                if (sellMode === "custom") {
                  // Validar campos antes de finalizar a venda de pacote personalizado
                  if (validateCustomPackage()) {
                    handleSellCustomPackage();
                  }
                } else {
                  // Para pacotes existentes, usar a função original
                  handleSellPackage();
                }
              }}
              disabled={sellMode === "custom" && (
                !sellForm.client_id || 
                !customPackageForm.name || 
                customPackageForm.services.length === 0
              )}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Finalizar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewPackageDialog} onOpenChange={setShowNewPackageDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Pacote</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="package_name">Nome do Pacote</Label>
                <Input
                  id="package_name"
                  placeholder="Ex: Pacote Facial Completo"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity_days">Validade (dias)</Label>
                <Input
                  id="validity_days"
                  type="number"
                  value={packageForm.validity_days}
                  onChange={(e) => setPackageForm({...packageForm, validity_days: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o pacote..."
                value={packageForm.description}
                onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Adicionar Serviços ao Pacote</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Input
                    placeholder="Cadastrar serviço..."
                    value={serviceSearchTerm}
                    onChange={(e) => {
                      setServiceSearchTerm(e.target.value);
                      handleSearchServices(e.target.value);
                      setShowServiceSearch(true);
                    }}
                    onFocus={() => setShowServiceSearch(true)}
                    className="pr-8"
                  />
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                  {showServiceSearch && serviceSearchResults.length > 0 && (
                    <div className="absolute z-10 bg-white border rounded w-full max-h-60 overflow-y-auto shadow">
                      {serviceSearchResults.map((service) => (
                        <button
                          key={service.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            setServiceSearchTerm(service.name);
                            setShowServiceSearch(false);
                          }}
                        >
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-500">
                            R$ {service.price.toFixed(2)} • {service.duration} min
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <div className="w-full">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Quantidade"
                      value={selectedServiceQuantity}
                      onChange={(e) => setSelectedServiceQuantity(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={handleAddService}
                  disabled={!selectedServiceId}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Serviço
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Serviços Incluídos</Label>
              {packageForm.services.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhum serviço adicionado ao pacote.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packageForm.services.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell>{service.name}</TableCell>
                        <TableCell className="text-right">{service.quantity}</TableCell>
                        <TableCell className="text-right">R$ {service.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(service.price * service.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveService(service.service_id)}
                            title="Excluir serviço"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={packageForm.discount}
                  onChange={(e) => setPackageForm({...packageForm, discount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço Final</Label>
                <div className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">R$ {packageForm.total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPackageDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#294380] hover:bg-[#1b2d5d]" 
              onClick={handleCreatePackage}
              disabled={packageForm.name === "" || packageForm.services.length === 0}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Criar Pacote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDependentDialog} onOpenChange={setShowAddDependentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Dependente</DialogTitle>
            <DialogDescription>
              Preencha os dados do dependente abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Dependente</Label>
              <Input
                value={dependentForm.name}
                onChange={(e) => setDependentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={dependentForm.birth_date}
                onChange={(e) => setDependentForm(prev => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Parentesco</Label>
              <Select
                value={dependentForm.relationship}
                onValueChange={(value) => setDependentForm(prev => ({ ...prev, relationship: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o parentesco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filho">Filho(a)</SelectItem>
                  <SelectItem value="conjuge">Cônjuge</SelectItem>
                  <SelectItem value="pai">Pai</SelectItem>
                  <SelectItem value="mae">Mãe</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDependentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddDependent}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Pacote</DialogTitle>
          </DialogHeader>
          <p className="mb-4">Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleDeletePackage(packageToDelete)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de importação de pacote antigo */}
      <Dialog open={showImportPackageDialog} onOpenChange={setShowImportPackageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Pacote Antigo</DialogTitle>
            <DialogDescription>Adicione pacotes já pagos em outro sistema para um cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Campo de busca/autocomplete do CLIENTE na modal de importação */}
            <div className="mb-4">
              <Label>Cliente</Label>
              <div className="relative">
                <Input
                  value={clientSearchTermImport}
                  onChange={e => {
                    setClientSearchTermImport(e.target.value);
                    handleClientSearchImport(e.target.value);
                  }}
                  placeholder="Digite o nome, CPF ou e-mail do cliente"
                  autoComplete="off"
                />
                {(isSearchingClientsImport || clientSearchResultsImport.length > 0) && (
                  <div className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-y-auto shadow">
                    {isSearchingClientsImport ? (
                      <div className="p-2 text-gray-400">Buscando...</div>
                    ) : clientSearchResultsImport.length > 0 ? (
                      clientSearchResultsImport.map(client => (
                        <div
                          key={client.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setImportPackageForm(prev => ({
                              ...prev,
                              client_id: client.id
                            }));
                            setClientSearchTermImport(client.name || "");
                            setClientSearchResultsImport([]);
                          }}
                        >
                          {client.name}
                          {client.cpf ? ` - ${client.cpf}` : ""}
                          {client.email ? ` - ${client.email}` : ""}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-gray-400">Nenhum cliente encontrado</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Serviços */}
            <div>
              <Label>Serviços e Quantidades</Label>
              {importPackageForm.services.length === 0 && (
                <div className="text-sm text-gray-500">Adicione ao menos um serviço</div>
              )}
              {importPackageForm.services.map((svc, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <Input
                      id={`import-service-search-${idx}`}
                      placeholder="Cadastrar serviço..."
                      value={serviceSearchTermsImport[idx] || ""}
                      onChange={(e) => handleServiceSearchChangeImport(idx, e.target.value)}
                      onFocus={() => setActiveServiceSearchIndex(idx)}
                      className="mb-1 min-w-[140px]"
                      autoComplete="off"
                    />
                    {activeServiceSearchIndex === idx && getFilteredServicesImport(idx).length > 0 && (
                      <div className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-y-auto shadow">
                        {getFilteredServicesImport(idx).map(s => (
                          <div
                            key={s.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleServiceSelectImport(idx, s.id, s.name)}
                          >
                            {s.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={svc.total}
                    onChange={e => handleImportServiceChange(idx, 'total', Number(e.target.value))}
                    className="w-20"
                    placeholder="Qtd."
                  />
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveServiceFromImport(idx)}><Trash2 /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={handleAddServiceToImport} className="mt-2"><PlusCircle className="w-4 h-4 mr-1" />Adicionar Serviço</Button>
            </div>
            {/* Sessões concluídas */}
            <div>
              <Label>Sessões Concluídas</Label>
              {importPackageForm.services.map((svc, idx) => (
                <div
                  key={idx}
                  className="mb-2"
                >
                  <div className="font-medium mb-1">{services.find(s => s.id === svc.service_id)?.name || 'Serviço'}</div>
                  {(svc.sessions || []).map((sess, sidx) => (
                    <div
                      key={sidx}
                      className="flex gap-2 mb-1"
                    >
                      <Input
                        type="date"
                        value={sess.date}
                        onChange={e => handleSessionChange(idx, sidx, 'date', e.target.value)}
                        className="w-36"
                      />
                      <Input
                        value={sess.obs}
                        onChange={e => handleSessionChange(idx, sidx, 'obs', e.target.value)}
                        placeholder="Observações"
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <Button size="xs" variant="outline" onClick={() => handleAddSessionToService(idx)} className="mt-1"><Plus className="w-3 h-3 mr-1" />Adicionar Sessão Concluída</Button>
                  <div className="text-xs text-gray-500 mt-1">Total: {svc.total || 0}, Usadas: {svc.used || 0}, Restantes: {(svc.total || 0) - (svc.used || 0)}</div>
                </div>
              ))}
            </div>
            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={importPackageForm.notes}
                onChange={e => setImportPackageForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações gerais sobre o pacote importado"
              />
            </div>
            {/* Data de Criação */}
            <div>
              <Label>Data de Criação</Label>
              <Input
                type="date"
                value={importPackageForm.purchase_date}
                onChange={e => setImportPackageForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                required
              />
            </div>
            {/* Validade */}
            <div>
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                min={1}
                value={importPackageForm.validity_days}
                onChange={e => setImportPackageForm(prev => ({ ...prev, validity_days: parseInt(e.target.value) }))}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportPackageDialog(false)}>Cancelar</Button>
            <Button className="bg-[#294380] hover:bg-[#1b2d5d]" onClick={handleSaveImportPackage}>Salvar Pacote Importado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RateLimitHandler />
    </div>
  );
}
