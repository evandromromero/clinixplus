import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeDate, createISODateWithoutTimezone } from "@/utils/dateUtils";
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, limit, startAfter } from 'firebase/firestore';
import { 
  Client, Sale, FinancialTransaction, Product, Service, 
  Employee, PaymentMethod, Package, ClientPackage, 
  GiftCard, SubscriptionPlan, ClientSubscription, 
  UnfinishedSale, Inventory, PendingService 
} from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  ShoppingBag,
  Package as PackageIcon,
  Scissors,
  X,
  Plus,
  Check,
  Gift,
  Clock,
  RefreshCw,
  Printer,
  CalendarIcon,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";
import { AlertTriangle } from "lucide-react";
import RateLimitHandler from '@/components/RateLimitHandler';
import html2pdf from 'html2pdf.js';

export default function SalesRegister() {
  // Layout específico para mobile
  const MobileLayout = ({
    selectedClient,
    setSelectedClient,
    setShowClientSearch,
    saleType,
    setSaleType,
    searchTerm,
    handleSearch,
    searchResults,
    handleAddToCart,
    cartItems,
    handleQuantityChange,
    handleDiscountChange,
    handleRemoveFromCart,
    getSubtotal,
    formatCurrency,
    calculateCartTotal,
    handleFinishSale
  }) => (
    <div className="space-y-4 p-4">
      {/* Seletor de Cliente Mobile */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        {selectedClient ? (
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{selectedClient.name}</p>
              <p className="text-sm text-gray-500">{selectedClient.cpf || 'CPF não informado'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            className="w-full justify-between"
            variant="outline"
            onClick={() => setShowClientSearch(true)}
          >
            <span>Selecionar Cliente</span>
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs de Tipo de Venda Mobile */}
      <Tabs value={saleType} className="w-full" onValueChange={setSaleType}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="produto" className="text-xs py-2">
            <ShoppingBag className="h-4 w-4 mr-1" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="serviço" className="text-xs py-2">
            <Scissors className="h-4 w-4 mr-1" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="pacote" className="text-xs py-2">
            <PackageIcon className="h-4 w-4 mr-1" />
            Pacotes
          </TabsTrigger>
        </TabsList>

        {/* Barra de Pesquisa Mobile */}
        <div className="mt-4 relative">
          <Input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => handleAddToCart(item)}
                >
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">{formatCurrency(item.price || item.total_price || item.value || 0)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Tabs>

      {/* Carrinho Mobile */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-medium">Carrinho ({cartItems.length} itens)</h3>
        </div>
        <div className="divide-y">
          {cartItems.map((item, index) => (
            <div key={index} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFromCart(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Desconto %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) => handleDiscountChange(index, parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métodos de Pagamento Mobile */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Formas de Pagamento</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={addPaymentMethod}
            disabled={paymentMethods.length >= availablePaymentMethods.length}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">
          {paymentMethods.map((payment, index) => (
            <div key={index} className="space-y-2">
              <Select
                value={payment.methodId}
                onValueChange={(value) => handlePaymentMethodChange(index, 'methodId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availablePaymentMethods
                    .filter(m => !paymentMethods.some((pm, i) => i !== index && pm.methodId === m.id))
                    .map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => handlePaymentMethodChange(index, 'amount', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={payment.installments}
                    onChange={(e) => handlePaymentMethodChange(index, 'installments', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo e Finalização Mobile */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <span>Subtotal:</span>
          <span className="font-medium">{formatCurrency(calculateCartTotal())}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Desconto Final:</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-24"
              value={finalDiscount}
              onChange={(e) => setFinalDiscount(parseFloat(e.target.value) || 0)}
            />
            <Select value={finalDiscountType} onValueChange={setFinalDiscountType}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">R$</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-between items-center font-medium text-lg">
          <span>Total:</span>
          <span>{formatCurrency(calculateFinalTotal())}</span>
        </div>
        <Button
          className="w-full"
          disabled={!selectedClient || cartItems.length === 0 || !salesEmployee}
          onClick={() => setShowConfirmDialog(true)}
        >
          Finalizar Venda
        </Button>
      </div>
    </div>
  );

  const { toast } = useToast();
  const navigate = useNavigate();
  const [cashIsOpen, setCashIsOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([
    { methodId: "", amount: 0, installments: 1 }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [saleType, setSaleType] = useState("produto");
  const [selectedClient, setSelectedClient] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [salesEmployee, setSalesEmployee] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [saleReceipt, setSaleReceipt] = useState(null);
  const [unfinishedSaleId, setUnfinishedSaleId] = useState(null);
  
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [finalDiscountType, setFinalDiscountType] = useState("percentage");
  const [finalPrice, setFinalPrice] = useState(0);
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  const [pendingSales, setPendingSales] = useState([]);
  const [isLoadingPendingSales, setIsLoadingPendingSales] = useState(false);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const fetchWithRetry = async (fn, maxRetries = 3, initialDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        console.error(`[SalesRegister] Erro na tentativa ${i + 1}/${maxRetries}:`, error);
        if (i < maxRetries - 1) {
          const delayMs = initialDelay * Math.pow(2, i);
          console.log(`[SalesRegister] Tentando novamente em ${delayMs}ms...`);
          await delay(delayMs);
        } else {
          throw error;
        }
      }
    }
  };
  
  // Estado para controle de busca de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [hasMoreClients, setHasMoreClients] = useState(false);
  const [lastClientDoc, setLastClientDoc] = useState(null);
  const [allClientsCache, setAllClientsCache] = useState(null);

  // Efeito para debounce na busca de clientes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clientSearchTerm) {
        setDebouncedClientSearch(clientSearchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  // Função otimizada de busca de clientes
  const handleClientSearch = async (term) => {
    console.log("[DEBUG] Iniciando busca com termo:", term);
    if (!term || term.length < 3) {
      console.log("[SalesRegister] Termo muito curto, ignorando busca");
      setClientSearchResults([]);
      return;
    }

    setIsSearchingClients(true);
    try {
      // Usar cache de clientes se disponível para evitar carregar todos os clientes repetidamente
      let allClients;
      
      if (allClientsCache) {
        console.log("[DEBUG] Cache encontrado com", allClientsCache.length, "clientes");
        allClients = allClientsCache;
      } else {
        // Busca direta por nome, CPF, email ou telefone
        // Vamos usar a API do Client.list() que busca todos os clientes
        console.log("[SalesRegister] Buscando todos os clientes com Client.list()");
        
        // Usar Client.list() para buscar TODOS os clientes sem limite
        allClients = await Client.list();
        
        // Armazenar no cache para futuras buscas
        setAllClientsCache(allClients);
      }
      
      // Normaliza o termo de busca (remove acentos e converte para lowercase)
      const normalizedTerm = term.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remove acentos

      console.log("[DEBUG] Termo normalizado:", normalizedTerm);
      console.log("[DEBUG] Total de clientes carregados:", allClients.length);
      
      // Amostra de alguns clientes para verificar
      console.log("[DEBUG] Amostra de 5 clientes:", allClients.slice(0, 5).map(c => ({
        original: c.name,
        normalizado: (c.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      })));
      
      // Filtra os clientes no lado do cliente para maior flexibilidade
      const resultsMap = new Map();
      
      // Adiciona resultados filtrados manualmente
      allClients.forEach(client => {
        // Normaliza os campos do cliente para comparação
        const normalizedName = (client.name || '').toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
          
        const normalizedCpf = (client.cpf || '');
        const normalizedEmail = (client.email || '').toLowerCase();
        const normalizedPhone = (client.phone || '');
        
        // Debug: mostrar alguns clientes para verificar normalização
        if (client.name && client.name.toLowerCase().includes('raquel')) {
          console.log("[SalesRegister] Cliente com 'raquel' no nome:", {
            original: client.name,
            normalizado: normalizedName,
            termo: normalizedTerm,
            match: normalizedName.includes(normalizedTerm)
          });
        }
        
        // Verifica se algum campo contém o termo de busca
        if (
          normalizedName.includes(normalizedTerm) ||
          normalizedCpf.includes(term) ||
          normalizedEmail.includes(term.toLowerCase()) ||
          normalizedPhone.includes(term)
        ) {
          resultsMap.set(client.id, client);
        }
      });
      
      // Converte o Map para array e ordena por nome
      const results = Array.from(resultsMap.values())
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      console.log("[DEBUG] Resultados encontrados:", results.length);
      if (results.length > 0) {
        console.log("[DEBUG] Primeiros 5 resultados:", results.slice(0, 5).map(c => c.name));
      }
      
      // Limita a 20 resultados para não sobrecarregar a interface
      const limitedResults = results.slice(0, 20);
      
      setClientSearchResults(limitedResults);
      setLastClientDoc(limitedResults[limitedResults.length - 1]);
      setHasMoreClients(results.length > limitedResults.length);
      
      console.log("[DEBUG] clientSearchResults atualizado com", limitedResults.length, "itens");
    } catch (error) {
      console.error('Erro na busca de clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar clientes. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingClients(false);
    }
  };

  // Função para carregar mais resultados de clientes
  const loadMoreClients = async () => {
    if (!lastClientDoc || !hasMoreClients || isSearchingClients) return;

    setIsSearchingClients(true);
    try {
      // Busca por nome
      const nameQuery = query(
        collection(db, 'clients'),
        where('name', '>=', debouncedClientSearch.toLowerCase()),
        where('name', '<=', debouncedClientSearch.toLowerCase() + '\uf8ff'),
        startAfter(lastClientDoc),
        limit(10)
      );

      // Busca por CPF
      const cpfQuery = query(
        collection(db, 'clients'),
        where('cpf', '>=', debouncedClientSearch),
        where('cpf', '<=', debouncedClientSearch + '\uf8ff'),
        startAfter(lastClientDoc),
        limit(10)
      );

      // Busca por email
      const emailQuery = query(
        collection(db, 'clients'),
        where('email', '>=', debouncedClientSearch.toLowerCase()),
        where('email', '<=', debouncedClientSearch.toLowerCase() + '\uf8ff'),
        startAfter(lastClientDoc),
        limit(10)
      );

      // Executa todas as buscas em paralelo
      const [nameSnapshot, cpfSnapshot, emailSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(cpfQuery),
        getDocs(emailQuery)
      ]);

      // Combina os resultados removendo duplicatas por ID
      const resultsMap = new Map();
      
      // Adiciona resultados da busca por nome
      nameSnapshot.docs.forEach(doc => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      // Adiciona resultados da busca por CPF
      cpfSnapshot.docs.forEach(doc => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      // Adiciona resultados da busca por email
      emailSnapshot.docs.forEach(doc => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Converte o Map para array
      const results = Array.from(resultsMap.values());
      
      setClientSearchResults(prev => [...prev, ...results]);
      setLastClientDoc(results[results.length - 1]);
      setHasMoreClients(results.length === 10);
    } catch (error) {
      console.error('Erro ao carregar mais clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mais clientes. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingClients(false);
    }
  };

  const loadDataWithRetry = async (maxRetries = 3) => {
    try {
      setIsLoading(true);
      
      // Usa Promise.allSettled para permitir que as chamadas sejam feitas em paralelo
      // e não falhar completamente se apenas algumas APIs falharem
      const results = await Promise.allSettled([
        fetchWithRetry(() => Product.list(), maxRetries),
        fetchWithRetry(() => Service.list(), maxRetries),
        fetchWithRetry(() => Package.list(), maxRetries),
        fetchWithRetry(() => GiftCard.list(), maxRetries),
        fetchWithRetry(() => SubscriptionPlan.list(), maxRetries),
        fetchWithRetry(() => Employee.list(), maxRetries),
        fetchWithRetry(() => PaymentMethod.list(), maxRetries)
      ]);
      
      // Processa os resultados
      const [
        productsResult,
        servicesResult,
        packagesResult,
        giftCardsResult,
        subscriptionPlansResult,
        employeesResult,
        paymentMethodsResult
      ] = results;
      
      // Atualiza os estados com os dados obtidos, usando arrays vazios para falhas
      setProducts(productsResult.status === 'fulfilled' ? productsResult.value : []);
      setServices(servicesResult.status === 'fulfilled' ? servicesResult.value : []);
      setPackages(packagesResult.status === 'fulfilled' ? packagesResult.value : []);
      setGiftCards(giftCardsResult.status === 'fulfilled' ? giftCardsResult.value : []);
      setSubscriptionPlans(subscriptionPlansResult.status === 'fulfilled' ? subscriptionPlansResult.value : []);
      setEmployees(employeesResult.status === 'fulfilled' ? employeesResult.value : []);
      setAvailablePaymentMethods(paymentMethodsResult.status === 'fulfilled' ? paymentMethodsResult.value : []);
      
      // Verifica se alguma chamada falhou
      const failedCalls = results.filter(r => r.status === 'rejected');
      if (failedCalls.length > 0) {
        console.warn(`[SalesRegister] ${failedCalls.length} chamadas falharam ao carregar dados`);
        toast({
          title: "Aviso",
          description: "Alguns dados podem estar desatualizados. Tente recarregar a página.",
          variant: "warning"
        });
      } else {
        console.log("[SalesRegister] Todos os dados foram carregados com sucesso");
      }
      
      return true;
    } catch (error) {
      console.error("[SalesRegister] Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente recarregar a página.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Usamos a função normalizeDate importada de utils/dateUtils.js

  // Efeito para executar a busca quando o termo debounced mudar
  useEffect(() => {
    if (debouncedClientSearch) {
      handleClientSearch(debouncedClientSearch);
    }
  }, [debouncedClientSearch]);

  // Função para buscar clientes
  const searchClients = (term) => {
    console.log("[SalesRegister] Buscando cliente:", term);
    setClientSearchTerm(term);
    if (!term) {
      setClientSearchResults([]);
      return;
    }
    
    // Forçar busca imediata se tiver 3 ou mais caracteres
    if (term.length >= 3) {
      handleClientSearch(term);
    }
  };

  // Função para pesquisar itens baseado no tipo de venda
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term) {
      setSearchResults([]);
      return;
    }

    const termLower = term.toLowerCase();
    
    let results = [];
    if (saleType === "produto") {
      results = products.filter(item => 
        item.name?.toLowerCase().includes(termLower) ||
        item.category?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "serviço") {
      results = services.filter(item => 
        item.name?.toLowerCase().includes(termLower) ||
        item.category?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "pacote") {
      results = packages.filter(item => 
        item.name?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "giftcard") {
      results = giftCards.filter(item => 
        item.code?.toLowerCase().includes(termLower) ||
        item.recipient_name?.toLowerCase().includes(termLower)
      );
    } else if (saleType === "assinatura") {
      results = subscriptionPlans.filter(item => 
        item.name?.toLowerCase().includes(termLower)
      );
    }
    
    setSearchResults(results);
  };

  // Função para adicionar item ao carrinho
  const handleAddToCart = (item) => {
    console.log("[SalesRegister] Adicionando item ao carrinho:", item);
    
    // Determinar o preço correto com base no tipo de item
    let itemPrice = 0;
    if (saleType === "pacote") {
      itemPrice = parseFloat(item.total_price || 0);
      console.log("[SalesRegister] Usando total_price para pacote:", itemPrice);
    } else if (saleType === "giftcard") {
      itemPrice = parseFloat(item.value || 0);
    } else if (saleType === "assinatura") {
      itemPrice = parseFloat(item.monthly_price || 0);
    } else if (saleType === "serviço") {
      // Para serviços, verificar se tem preço base ou preço total
      itemPrice = parseFloat(item.base_price || item.total_price || item.price || 0);
      console.log("[SalesRegister] Preço do serviço:", itemPrice);
    } else {
      itemPrice = parseFloat(item.price || 0);
    }
    
    const cartItem = {
      id: item.id,
      name: item.name,
      type: saleType, // O tipo vem do estado global que indica qual aba está selecionada
      price: itemPrice,
      quantity: 1,
      discount: 0,
      unit_price: itemPrice
    };
    
    console.log("[SalesRegister] Item formatado para o carrinho:", cartItem);
    setCartItems([...cartItems, cartItem]);
    setSearchTerm("");
    setSearchResults([]);
  };

  // Função para remover item do carrinho
  const handleRemoveFromCart = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Função para atualizar quantidade
  const handleQuantityChange = (index, value) => {
    const newCartItems = [...cartItems];
    newCartItems[index] = {
      ...newCartItems[index],
      quantity: value
    };
    setCartItems(newCartItems);
  };

  // Função para atualizar desconto
  const handleDiscountChange = (index, value) => {
    const newCartItems = [...cartItems];
    newCartItems[index] = {
      ...newCartItems[index],
      discount: value
    };
    setCartItems(newCartItems);
  };

  // Função para calcular o subtotal de um item
  const getSubtotal = (item) => {
    const itemTotal = item.price * item.quantity;
    const discountAmount = itemTotal * (item.discount / 100);
    return itemTotal - discountAmount;
  };

  // Função para adicionar um método de pagamento
  const addPaymentMethod = () => {
    // Verifica se ainda existem métodos disponíveis para adicionar
    if (paymentMethods.length >= availablePaymentMethods.length) {
      return;
    }
    
    // Encontra um método de pagamento ainda não utilizado
    const usedMethodIds = paymentMethods.map(pm => pm.methodId);
    const availableMethod = availablePaymentMethods.find(m => !usedMethodIds.includes(m.id));
    
    if (availableMethod) {
      // Se for distribuir valores, calcula o valor restante
      const totalCart = calculateCartTotal();
      const totalPaid = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
      const remaining = Math.max(0, totalCart - totalPaid);
      
      setPaymentMethods([...paymentMethods, {
        methodId: availableMethod.id,
        amount: remaining,
        installments: 1
      }]);
    }
  };

  // Função para remover um método de pagamento
  const removePaymentMethod = (index) => {
    if (paymentMethods.length <= 1) return;
    
    const removedAmount = paymentMethods[index].amount;
    const updatedPaymentMethods = [...paymentMethods];
    updatedPaymentMethods.splice(index, 1);
    
    // Redistribui o valor removido para o primeiro método
    if (removedAmount > 0 && updatedPaymentMethods.length > 0) {
      updatedPaymentMethods[0].amount += removedAmount;
    }
    
    setPaymentMethods(updatedPaymentMethods);
  };

  // Função para calcular o total do carrinho
  const calculateCartTotal = () => {
    const subtotal = cartItems.reduce((total, item) => {
      return total + getSubtotal(item);
    }, 0);
    
    // Se o tipo de desconto for preço final, retorna o valor definido
    if (finalDiscountType === "final_price" && finalPrice > 0) {
      return Math.min(subtotal, finalPrice); // Não permite que o preço final seja maior que o subtotal
    }
    
    let finalDiscountValue = 0;
    if (finalDiscount > 0) {
      if (finalDiscountType === "percentage") {
        finalDiscountValue = subtotal * (finalDiscount / 100);
      } else if (finalDiscountType === "fixed") {
        finalDiscountValue = finalDiscount;
      }
    }
    
    return Math.max(0, subtotal - finalDiscountValue);
  };
  
  // Função para calcular o valor do desconto geral
  const calculateGeneralDiscount = () => {
    const subtotal = cartItems.reduce((total, item) => {
      return total + getSubtotal(item);
    }, 0);
    
    if (finalDiscountType === "final_price" && finalPrice > 0) {
      return Math.max(0, subtotal - finalPrice);
    }
    
    if (finalDiscount > 0) {
      if (finalDiscountType === "percentage") {
        return subtotal * (finalDiscount / 100);
      } else if (finalDiscountType === "fixed") {
        return finalDiscount;
      }
    }
    
    return 0;
  };

  // Função para obter o número máximo de parcelas
  const getMaxInstallments = (methodId) => {
    const method = availablePaymentMethods.find(m => m.id === methodId);
    return method?.allowsInstallments ? (method.maxInstallments || 12) : 1;
  };

  // Função para obter a taxa de juros por parcela
  const getInterestRate = (methodId, installments) => {
    const method = availablePaymentMethods.find(m => m.id === methodId);
    if (!method?.allowsInstallments || installments <= 1) return 0;
    
    // Busca a taxa de juros nas configurações do método de pagamento
    if (method.fees && Array.isArray(method.fees)) {
      const fee = method.fees.find(f => 
        installments >= f.installmentRange?.min && 
        installments <= f.installmentRange?.max
      );
      
      return fee?.feePercentage || method.interestRate || 0;
    }
    
    return method.interestRate || 0;
  };

  // Função para renderizar a seção de métodos de pagamento
  const renderPaymentMethodsSection = () => {
    // Esta função está vazia porque o conteúdo já está no JSX principal
    return null;
  };

  // Função para cancelar a venda
  const handleCancel = () => {
    if (cartItems.length === 0) {
      navigate(createPageUrl('Dashboard'));
      return;
    }
    
    if (confirm("Tem certeza que deseja cancelar esta venda? Todos os itens serão perdidos.")) {
      setCartItems([]);
      setSelectedClient(null);
      setSalesEmployee("");
      setSearchTerm("");
      setSearchResults([]);
      setPaymentMethods([{ methodId: "", amount: 0, installments: 1 }]);
      setFinalDiscount(0);
      setFinalDiscountType("percentage");
      
      navigate(createPageUrl('Dashboard'));
    }
  };

  // Função para finalizar a venda
  const handleFinishSale = () => {
    // Validações
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para continuar",
        variant: "destructive"
      });
      return;
    }
    
    if (cartItems.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao carrinho",
        variant: "destructive"
      });
      return;
    }
    
    if (!salesEmployee) {
      toast({
        title: "Erro",
        description: "Selecione um vendedor para continuar",
        variant: "destructive"
      });
      return;
    }
    
    const totalCart = calculateCartTotal();
    const totalPaid = paymentMethods.reduce((sum, method) => sum + method.amount, 0);
    
    if (Math.abs(totalPaid - totalCart) > 0.01) {
      toast({
        title: "Erro",
        description: `O valor total pago (${formatCurrency(totalPaid)}) não corresponde ao valor total da venda (${formatCurrency(totalCart)})`,
        variant: "destructive"
      });
      return;
    }
    
    if (paymentMethods.some(method => !method.methodId)) {
      toast({
        title: "Erro",
        description: "Selecione um método de pagamento válido para cada forma de pagamento",
        variant: "destructive"
      });
      return;
    }
    
    // Abre o diálogo de confirmação
    setShowConfirmDialog(true);
  };

  // Função para confirmar a venda
  const confirmSale = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se o caixa ainda está aberto
      const isCashOpen = await checkCashRegister();
      if (!isCashOpen) {
        return; // checkCashRegister já mostra o toast e redireciona
      }
      
      // Validações
      if (!selectedClient?.id) {
        toast({
          title: "Erro",
          description: "Selecione um cliente para a venda",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!salesEmployee) {
        toast({
          title: "Erro",
          description: "Selecione um vendedor para a venda",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (!cartItems.length) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item ao carrinho",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Validar itens do carrinho
      const validCartItems = cartItems.map(item => ({
        id: item.id || "",
        name: item.name || "",
        type: item.type || saleType,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || parseFloat(item.price) || 0
      }));
      
      // Criar objeto de venda
      const saleData = {
        client_id: selectedClient.id,
        employee_id: salesEmployee,
        type: saleType || "produto",
        items: validCartItems,
        total_amount: calculateCartTotal(),
        final_discount: calculateGeneralDiscount(),
        final_discount_type: finalDiscountType || "percentage",
        final_price: finalDiscountType === "final_price" ? finalPrice : null,
        payment_methods: paymentMethods.map(pm => ({
          method_id: pm.methodId || "",
          amount: parseFloat(pm.amount) || 0,
          installments: parseInt(pm.installments) || 1
        })),
        installments: paymentMethods.reduce((total, pm) => total + (pm.installments > 1 ? parseInt(pm.installments) : 0), 0),
        status: "pago",
        date: normalizeDate(saleDate), // Usa a data formatada sem conversão de fuso horário
        notes: ""
      };
      
      // Salvar a venda no banco de dados
      const createdSale = await Sale.create(saleData);

      // Se veio de uma venda não finalizada, atualizar o status
      if (unfinishedSaleId) {
        console.log('Atualizando venda não finalizada:', unfinishedSaleId);
        await UnfinishedSale.update(unfinishedSaleId, {
          status: 'concluida',
          sale_id: createdSale.id,
          date_completed: new Date().toISOString()
        });
      }
      
      // Criar transações financeiras para cada método de pagamento
      for (const payment of paymentMethods) {
        if (!payment.methodId || !payment.amount) continue;
        
        const paymentMethod = availablePaymentMethods.find(m => m.id === payment.methodId);
        const isPaid = !paymentMethod?.name?.toLowerCase().includes("crédito");
        
        // Usar a data selecionada pelo usuário, garantindo que não haja problemas de fuso horário
        const paymentDate = createISODateWithoutTimezone(saleDate);
        console.log("[SalesRegister] Usando data ISO sem fuso horário para transação:", paymentDate);
        
        // Criar transação financeira
        await FinancialTransaction.create({
          type: "receita",
          category: "venda",
          description: `Venda #${createdSale.id} - ${saleType}`,
          amount: parseFloat(payment.amount) || 0,
          payment_method: payment.methodId,
          status: isPaid ? "pago" : "pendente",
          due_date: paymentDate,
          payment_date: isPaid ? paymentDate : null,
          sale_id: createdSale.id,
          client_id: selectedClient.id,
          employee_id: salesEmployee,
          is_installment: payment.installments > 1,
          installments: payment.installments > 1 ? payment.installments : null,
          notes: ""
        });
      }
      
      // Criar serviços pendentes para cada serviço vendido
      const servicesToCreate = cartItems.filter(item => item.type === "serviço");
      console.log("[SalesRegister] Total de serviços para criar:", servicesToCreate.length);
      
      for (const item of servicesToCreate) {
        console.log("[SalesRegister] ==========================================");
        console.log("[SalesRegister] Iniciando processamento de serviço:", {
          item_id: item.id,
          item_name: item.name,
          sale_id: createdSale.id,
          quantity: item.quantity
        });
        
        const serviceId = item.id;
        if (!serviceId) {
          console.error("[SalesRegister] Serviço sem ID:", item);
          continue;
        }

        try {
          // Verificar se já existe um serviço pendente para esta venda e serviço
          const existingPendingServices = await PendingService.filter({
            sale_id: createdSale.id,
            service_id: serviceId,
            client_id: selectedClient.id
          });

          console.log("[SalesRegister] Serviços pendentes existentes:", {
            count: existingPendingServices.length,
            services: existingPendingServices
          });

          if (existingPendingServices.length === 0) {
            // Criar um único serviço pendente com a quantidade especificada
            const pendingServiceData = {
              client_id: selectedClient.id,
              service_id: serviceId,
              sale_id: createdSale.id,
              quantity: parseInt(item.quantity) || 1,
              status: "pendente",
              created_date: new Date().toISOString(),
              expiration_date: null,
              notes: `Serviço vendido em ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`
            };

            console.log("[SalesRegister] Criando serviço pendente com dados:", pendingServiceData);
            
            const pendingService = await PendingService.create(pendingServiceData);
            console.log("[SalesRegister] Serviço pendente criado com sucesso:", pendingService);
          } else {
            console.log("[SalesRegister] Serviço pendente já existe, não será criado novamente");
          }
          console.log("[SalesRegister] ==========================================");
        } catch (error) {
          console.error("[SalesRegister] Erro ao criar serviço pendente:", error);
          throw error;
        }
      }
      
      // Limpar o estado
      setCartItems([]);
      setSelectedClient(null);
      setSalesEmployee("");
      setPaymentMethods([{ methodId: "", amount: 0, installments: 1 }]);
      setFinalDiscount(0);
      setFinalDiscountType("percentage");
      setSearchTerm("");
      setSearchResults([]);
      setShowConfirmDialog(false);
      
      // Preparar dados do recibo
      const receiptData = {
        sale_id: createdSale.id,
        sale_date: saleDate, // Usar a data selecionada pelo usuário diretamente
        client_name: selectedClient.name,
        client_cpf: selectedClient.cpf,
        items: validCartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          subtotal: item.quantity * item.unit_price
        })),
        sale_total: calculateCartTotal(),
        payment_methods: paymentMethods.map(pm => {
          const method = availablePaymentMethods.find(m => m.id === pm.methodId);
          return {
            method_name: method?.name || "Método não encontrado",
            amount: parseFloat(pm.amount) || 0,
            installments: parseInt(pm.installments) || 1
          };
        })
      };
      
      setSaleReceipt(receiptData);
      setShowReceiptDialog(true);
      
      toast({
        title: "Sucesso",
        description: "Venda finalizada com sucesso!",
        variant: "success"
      });
      
    } catch (error) {
      console.error("[SalesRegister] Erro ao finalizar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar venda. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Estado para controlar o diálogo de seleção de data de caixa
  const [showCashDateDialog, setShowCashDateDialog] = useState(false);
  // Estado para armazenar caixas abertos disponíveis
  const [openCashRegisters, setOpenCashRegisters] = useState([]);
  // Estado para armazenar a data do caixa selecionado
  const [selectedCashDate, setSelectedCashDate] = useState("");

  // Função para verificar se o caixa está aberto
  const checkCashRegister = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const transactions = await FinancialTransaction.list();
      
      // Buscar todos os caixas abertos (que têm abertura mas não têm fechamento)
      const openingTransactions = transactions.filter(t => t.category === "abertura_caixa");
      
      // Para cada transação de abertura, verificar se existe uma de fechamento correspondente
      const openCashRegisters = [];
      
      for (const opening of openingTransactions) {
        const openingDate = opening.payment_date.split('T')[0];
        const hasClosing = transactions.some(t => 
          t.category === "fechamento_caixa" && 
          t.payment_date.split('T')[0] === openingDate
        );
        
        if (!hasClosing) {
          // Este caixa está aberto
          openCashRegisters.push({
            date: openingDate,
            formattedDate: format(new Date(openingDate), "dd/MM/yyyy"),
            id: opening.id,
            isToday: openingDate === today
          });
        }
      }
      
      console.log("[SalesRegister] Caixas abertos encontrados:", openCashRegisters);
      
      // Verificar se há pelo menos um caixa aberto
      if (openCashRegisters.length === 0) {
        toast({
          title: "Aviso",
          description: "O caixa precisa ser aberto antes de realizar vendas",
          variant: "warning"
        });
        navigate(createPageUrl('CashRegister'));
        return false;
      }
      
      // Verificar se há um caixa aberto para hoje
      const todayCash = openCashRegisters.find(cash => cash.isToday);
      
      if (todayCash) {
        // Se há um caixa aberto para hoje, usá-lo diretamente
        console.log("[SalesRegister] Usando caixa de hoje:", todayCash);
        setSelectedCashDate(todayCash.date);
        setCashIsOpen(true);
        return true;
      } else if (openCashRegisters.length === 1) {
        // Se há apenas um caixa aberto (de um dia anterior), usá-lo diretamente
        console.log("[SalesRegister] Usando único caixa disponível:", openCashRegisters[0]);
        setSelectedCashDate(openCashRegisters[0].date);
        setCashIsOpen(true);
        return true;
      } else {
        // Se há múltiplos caixas abertos, mostrar diálogo para escolher
        setOpenCashRegisters(openCashRegisters);
        setShowCashDateDialog(true);
        return false; // Retornar false para aguardar a seleção do usuário
      }
    } catch (error) {
      console.error('[SalesRegister] Erro ao verificar caixa:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar status do caixa",
        variant: "destructive"
      });
      return false;
    }
  };

  // Função para carregar dados da URL
  useEffect(() => {
    const loadUrlData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const clientId = params.get('client_id');
        const type = params.get('type');
        const amount = params.get('amount');
        const clientPackageId = params.get('client_package_id');
        const unfinishedSaleId = params.get('unfinished_sale_id');
        const giftCardId = params.get('gift_card');

        if (type) {
          setSaleType(type);
        }

        if (clientId) {
          const client = await Client.get(clientId);
          if (client) {
            setSelectedClient(client);
            setShowClientSearch(false);
          }
        }

        if (amount && clientPackageId) {
          const packageData = await ClientPackage.get(clientPackageId);
          if (packageData) {
            // Busca o pacote original para ter os detalhes completos
            const originalPackage = await Package.get(packageData.package_id);
            
            const cartItem = {
              item_id: packageData.id,
              type: 'pacote',
              name: originalPackage?.name || packageData.package_snapshot?.name || 'Pacote',
              quantity: 1,
              price: parseFloat(amount),
              discount: 0
            };
            setCartItems([cartItem]);

            // Atualiza o método de pagamento com o valor do pacote
            setPaymentMethods([{
              methodId: "",
              amount: parseFloat(amount),
              installments: 1
            }]);
          }
        }

        if (giftCardId) {
          console.log("[SalesRegister] Gift Card ID detectado na URL:", giftCardId);
          
          // Carregar o gift card
          try {
            const giftCardData = await GiftCard.get(giftCardId);
            if (giftCardData) {
              console.log("[SalesRegister] Gift Card carregado:", giftCardData);
              
              // Selecionar o cliente associado ao gift card
              if (giftCardData.client_id) {
                // Verificar se os clientes já foram carregados
                if (clients && clients.length > 0) {
                  const clientData = clients.find(c => c.id === giftCardData.client_id);
                  if (clientData) {
                    console.log("[SalesRegister] Cliente encontrado e selecionado:", clientData.name);
                    setSelectedClient(clientData);
                  } else {
                    // Se o cliente não for encontrado na lista atual, carregá-lo diretamente
                    try {
                      console.log("[SalesRegister] Cliente não encontrado na lista, carregando diretamente");
                      const clientData = await Client.get(giftCardData.client_id);
                      if (clientData) {
                        console.log("[SalesRegister] Cliente carregado diretamente:", clientData.name);
                        setSelectedClient(clientData);
                      }
                    } catch (error) {
                      console.error("[SalesRegister] Erro ao carregar cliente:", error);
                    }
                  }
                } else {
                  // Se a lista de clientes ainda não foi carregada, carregar o cliente diretamente
                  try {
                    console.log("[SalesRegister] Lista de clientes vazia, carregando cliente diretamente");
                    const clientData = await Client.get(giftCardData.client_id);
                    if (clientData) {
                      console.log("[SalesRegister] Cliente carregado diretamente:", clientData.name);
                      setSelectedClient(clientData);
                    }
                  } catch (error) {
                    console.error("[SalesRegister] Erro ao carregar cliente:", error);
                  }
                }
              }
              
              // Definir o tipo de venda para gift card
              setSaleType("giftcard");
              
              // Adicionar o gift card ao carrinho
              const cartItem = {
                id: giftCardData.id,
                item_id: giftCardData.id,
                name: `Gift Card ${giftCardData.code}`,
                type: "giftcard",
                price: parseFloat(giftCardData.value),
                quantity: 1,
                discount: 0,
                unit_price: parseFloat(giftCardData.value)
              };
              
              setCartItems([cartItem]);
              
              // Limpar o parâmetro da URL (opcional)
              window.history.replaceState({}, document.title, window.location.pathname);
              
              toast({
                title: "Gift Card adicionado",
                description: `Gift Card no valor de ${formatCurrency(giftCardData.value)} adicionado ao carrinho`,
                variant: "success"
              });
            }
          } catch (error) {
            console.error("[SalesRegister] Erro ao carregar gift card:", error);
            toast({
              title: "Erro",
              description: "Não foi possível carregar o gift card solicitado",
              variant: "destructive"
            });
          }
        }

        if (unfinishedSaleId) {
          setUnfinishedSaleId(unfinishedSaleId);
        }
      } catch (error) {
        console.error('Erro ao carregar dados da URL:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da venda",
          variant: "destructive"
        });
      }
    };

    loadUrlData();
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Primeiro verifica se o caixa está aberto
        const isCashOpen = await checkCashRegister();
        if (!isCashOpen) {
          return; // Se o caixa não estiver aberto, não carrega os dados
        }
        
        // Se o caixa estiver aberto, carrega os dados
        await loadDataWithRetry();
      } catch (error) {
        console.error("[SalesRegister] Erro na inicialização:", error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar o registro de vendas",
          variant: "destructive"
        });
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    const loadPendingSales = async () => {
      setIsLoadingPendingSales(true);
      try {
        const result = await UnfinishedSale.filter({ status: 'pendente' });
        setPendingSales(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('[SalesRegister] Erro ao carregar vendas pendentes:', error);
        setPendingSales([]);
      } finally {
        setIsLoadingPendingSales(false);
      }
    };

    loadPendingSales();
  }, []);

  const handleFinalizePendingSale = (sale) => {
    navigate(createPageUrl('SalesRegister', { unfinished_sale_id: sale.id, client_id: sale.client_id, type: sale.type }));
  };

  const handleCancelPendingSale = async (saleId) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta venda pendente?')) return;
    try {
      await UnfinishedSale.update(saleId, { status: 'cancelado' });
      toast({ title: 'Venda cancelada', description: 'A venda pendente foi cancelada com sucesso.', variant: 'success' });
      loadPendingSales();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao cancelar venda pendente.', variant: 'destructive' });
    }
  };

  const PendingSalesSection = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
      <h3 className="font-bold text-lg mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-amber-500" /> Vendas Pendentes
      </h3>
      {isLoadingPendingSales ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin w-5 h-5" /> Carregando...</div>
      ) : pendingSales.length === 0 ? (
        <div className="text-gray-500">Nenhuma venda pendente encontrada.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.client_name || '-'}</TableCell>
                  <TableCell>{sale.updated_date ? format(new Date(sale.updated_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</TableCell>
                  <TableCell>{formatCurrency(sale.total_amount || 0)}</TableCell>
                  <TableCell>
                    <Button size="sm" className="mr-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleFinalizePendingSale(sale)}>
                      <Check className="w-4 h-4 mr-1" /> Finalizar Pagamento
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleCancelPendingSale(sale.id)}>
                      <X className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  // Renderização condicional para caixa fechado
  if (!cashIsOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertTriangle className="w-12 h-12 text-orange-500" />
              <h2 className="text-xl font-semibold text-orange-700">
                O caixa precisa ser aberto
              </h2>
              <p className="text-orange-600">
                Para realizar vendas, é necessário que o caixa do dia esteja aberto.
              </p>
              <Button 
                onClick={() => navigate(createPageUrl('CashRegister'))}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Ir para o Caixa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Registrar Venda</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Label className="mb-2 block">Cliente</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar cliente por nome, CPF ou email"
                      value={selectedClient ? selectedClient.name : clientSearchTerm}
                      onChange={(e) => {
                        if (!selectedClient) {
                          searchClients(e.target.value);
                        }
                      }}
                      onClick={() => {
                        if (selectedClient) {
                          setSelectedClient(null);
                          setClientSearchTerm("");
                        }
                      }}
                    />
                    {isSearchingClients && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    
                    {/* Resultados da busca de clientes */}
                    {!selectedClient && (
                      <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border">
                        {isSearchingClients && clientSearchResults.length === 0 && (
                          <div className="p-3 text-center text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            Buscando clientes...
                          </div>
                        )}
                        
                        {!isSearchingClients && clientSearchTerm.length >= 3 && clientSearchResults.length === 0 && (
                          <div className="p-3 text-center text-gray-500">
                            Nenhum cliente encontrado
                          </div>
                        )}
                        
                        {clientSearchResults.length > 0 && (
                          <div className="max-h-60 overflow-y-auto">
                            {clientSearchResults.map((client) => (
                              <div
                                key={client.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setClientSearchTerm("");
                                  setClientSearchResults([]);
                                }}
                              >
                                <div>
                                  <div className="font-medium">{client.name}</div>
                                  <div className="text-sm text-gray-500 flex flex-col">
                                    {client.cpf && <span>CPF: {client.cpf}</span>}
                                    {client.phone && <span>Tel: {client.phone}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedClient && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearchTerm("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {!selectedClient && clientSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                      {clientSearchResults.map(client => (
                        <div
                          key={client.id}
                          className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearchTerm(client.name);
                            setClientSearchResults([]);
                          }}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500 flex gap-2">
                            {client.cpf && <span>CPF: {client.cpf}</span>}
                            {client.email && <span>• {client.email}</span>}
                          </div>
                        </div>
                      ))}
                      {hasMoreClients && (
                        <button
                          className="w-full p-2 text-sm text-blue-600 hover:bg-blue-50 border-t"
                          onClick={loadMoreClients}
                          disabled={isSearchingClients}
                        >
                          {isSearchingClients ? "Carregando..." : "Carregar mais resultados"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="mb-2 block">Vendedor</Label>
                  <Select
                    value={salesEmployee}
                    onValueChange={setSalesEmployee}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Tabs defaultValue={saleType} onValueChange={setSaleType}>
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="produto">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Produtos
                    </TabsTrigger>
                    <TabsTrigger value="serviço">
                      <Scissors className="w-4 h-4 mr-2" />
                      Serviços
                    </TabsTrigger>
                    <TabsTrigger value="pacote">
                      <PackageIcon className="w-4 h-4 mr-2" />
                      Pacotes
                    </TabsTrigger>
                    <TabsTrigger value="giftcard">
                      <Gift className="w-4 h-4 mr-2" />
                      Gift Cards
                    </TabsTrigger>
                    <TabsTrigger value="assinatura">
                      <Clock className="w-4 h-4 mr-2" />
                      Assinaturas
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="pt-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder={`Buscar ${saleType}...`}
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-2 border rounded-md shadow-sm">
                        <div className="max-h-60 overflow-y-auto">
                          {searchResults.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center"
                              onClick={() => handleAddToCart(item)}
                            >
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-gray-500">
                                  {saleType === "pacote" 
                                    ? formatCurrency(item.total_price) 
                                    : saleType === "giftcard" || saleType === "assinatura"
                                    ? formatCurrency(item.value || item.monthly_price)
                                    : formatCurrency(item.price)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleRemoveFromCart(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Tabs>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Itens no Carrinho</h3>
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border">
                      <ShoppingBag className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-gray-500">
                        Nenhum item adicionado
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Desconto</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                item.type === "produto" 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : item.type === "serviço"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : item.type === "pacote"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : item.type === "giftcard"
                                  ? "bg-pink-50 text-pink-700 border-pink-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }>
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                                className="w-16 text-right"
                                min={1}
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end">
                                <Input
                                  type="number"
                                  value={item.discount}
                                  onChange={(e) => handleDiscountChange(index, parseFloat(e.target.value))}
                                  className="w-16 text-right"
                                  min={0}
                                  max={100}
                                />
                                <span className="ml-1">%</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(getSubtotal(item))}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleRemoveFromCart(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <PendingSalesSection />

              </div>
            </CardContent>
            {renderPaymentMethodsSection()}
          </Card>
        </div>

        <div className="md:col-span-4">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Resumo da Venda</h3>
                
                <div className="mb-4">
                  <Label htmlFor="sale-date" className="mb-2 block">Data da Venda</Label>
                  <Input
                    id="sale-date"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>
                      {formatCurrency(
                        cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descontos nos itens:</span>
                    <span className="text-red-500">
                      -{formatCurrency(
                        cartItems.reduce((total, item) => {
                          const itemTotal = item.price * item.quantity;
                          return total + (itemTotal * (item.discount / 100));
                        }, 0)
                      )}
                    </span>
                  </div>
                  
                  <div className="border-t pt-3 pb-1">
                    <div className="mb-2">
                      <Label className="font-medium">Desconto Geral</Label>
                      <div className="flex space-x-3 mt-2">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="discount-percentage"
                            name="discount-type"
                            checked={finalDiscountType === "percentage"}
                            onChange={() => setFinalDiscountType("percentage")}
                            className="mr-1"
                          />
                          <label htmlFor="discount-percentage">Percentual (%)</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="discount-fixed"
                            name="discount-type"
                            checked={finalDiscountType === "fixed"}
                            onChange={() => setFinalDiscountType("fixed")}
                            className="mr-1"
                          />
                          <label htmlFor="discount-fixed">Valor Fixo (R$)</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="discount-final-price"
                            name="discount-type"
                            checked={finalDiscountType === "final_price"}
                            onChange={() => setFinalDiscountType("final_price")}
                            className="mr-1"
                          />
                          <label htmlFor="discount-final-price">Preço Final</label>
                        </div>
                      </div>
                    </div>
                    
                    {finalDiscountType === "percentage" && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={finalDiscount}
                          onChange={(e) => setFinalDiscount(parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                        <span>%</span>
                      </div>
                    )}
                    
                    {finalDiscountType === "fixed" && (
                      <div className="flex items-center space-x-2">
                        <span>R$</span>
                        <Input
                          type="number"
                          min="0"
                          value={finalDiscount}
                          onChange={(e) => setFinalDiscount(parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </div>
                    )}
                    
                    {finalDiscountType === "final_price" && (
                      <div className="flex items-center space-x-2">
                        <span>R$</span>
                        <Input
                          type="number"
                          min="0"
                          value={finalPrice}
                          onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-between mt-2 text-red-500">
                      <span>Desconto geral:</span>
                      <span>-{formatCurrency(calculateGeneralDiscount())}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateCartTotal())}</span>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <p className="font-medium">Formas de pagamento:</p>
                    <ul className="space-y-1">
                      {paymentMethods.map((payment, index) => (
                        <li key={index} className="flex justify-between text-sm">
                          <span>
                            {payment.methodId ? availablePaymentMethods.find(m => m.id === payment.methodId)?.name : 'Método não selecionado'}
                            {payment.installments > 1 ? ` (${payment.installments}x)` : ''}
                          </span>
                          <span>{formatCurrency(payment.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Formas de Pagamento</h3>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={addPaymentMethod}
                    disabled={cartItems.length === 0}
                  >
                    Distribuir Valores
                  </Button>
                </div>
                
                {paymentMethods.map((payment, index) => (
                  <div key={index} className="space-y-3 p-3 border rounded-md bg-gray-50">
                    <div className="flex justify-between items-center">
                      <Select
                        value={payment.methodId}
                        onValueChange={(value) => {
                          const newMethods = [...paymentMethods];
                          newMethods[index].methodId = value;
                          setPaymentMethods(newMethods);
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePaymentMethods.map(method => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {paymentMethods.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => removePaymentMethod(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Valor:</Label>
                        <Input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            const newMethods = [...paymentMethods];
                            newMethods[index].amount = newValue;
                            setPaymentMethods(newMethods);
                          }}
                          className="flex-1"
                          placeholder="0,00"
                        />
                      </div>
                      
                      {payment.methodId && availablePaymentMethods.find(m => m.id === payment.methodId)?.allowsInstallments && (
                        <div className="flex items-center gap-2">
                          <Label className="w-20">Parcelas:</Label>
                          <Select
                            value={String(payment.installments)}
                            onValueChange={(value) => {
                              const newMethods = [...paymentMethods];
                              newMethods[index].installments = parseInt(value);
                              setPaymentMethods(newMethods);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: getMaxInstallments(payment.methodId) }, (_, i) => i + 1).map(num => (
                                <SelectItem key={num} value={String(num)}>
                                  {num}x {num > 1 && getInterestRate(payment.methodId, num) > 0 ? 
                                  `(+${getInterestRate(payment.methodId, num)}%)` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={addPaymentMethod}
                  disabled={paymentMethods.length >= availablePaymentMethods.length}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Forma de Pagamento
                </Button>
                
                <div className="flex justify-between">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Cancelar Venda
                  </Button>
                  
                  <Button
                    onClick={handleFinishSale}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      paymentMethods.length === 0 || 
                      paymentMethods.some(pm => pm.amount <= 0) || 
                      !salesEmployee
                    }
                  >
                    Finalizar Venda
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo para seleção de data do caixa */}
      <Dialog open={showCashDateDialog} onOpenChange={setShowCashDateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Data do Caixa</DialogTitle>
            <DialogDescription>
              Existem múltiplos caixas abertos. Selecione para qual data deseja lançar a venda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {openCashRegisters.map((cash) => (
              <Button 
                key={cash.id} 
                onClick={() => {
                  console.log("[SalesRegister] Data de caixa selecionada:", cash.date);
                  setSelectedCashDate(cash.date);
                  setShowCashDateDialog(false);
                  setCashIsOpen(true);
                }}
                variant={cash.isToday ? "default" : "outline"}
                className="w-full justify-start"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {cash.formattedDate}
                {cash.isToday && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Hoje</span>}
              </Button>
            ))}
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => navigate(createPageUrl('Dashboard'))}>
                Cancelar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de venda */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            
            <div className="space-y-2">
              <p className="font-medium">Cliente:</p>
              <p>{selectedClient?.name}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Itens:</p>
              <ul className="space-y-1">
                {cartItems.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(getSubtotal(item))}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-3 border-t flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(calculateCartTotal())}</span>
            </div>
            
            <div className="pt-2 space-y-2">
              <p className="font-medium">Formas de pagamento:</p>
              <ul className="space-y-1">
                {paymentMethods.map((payment, index) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span>
                      {payment.methodId ? availablePaymentMethods.find(m => m.id === payment.methodId)?.name : 'Método não selecionado'}
                      {payment.installments > 1 ? ` (${payment.installments}x)` : ''}
                    </span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmSale}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comprovante de Venda</DialogTitle>
          </DialogHeader>
          
          <div id="receipt" className="space-y-4 py-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">MAGNIFIC</h2>
              <p className="text-sm">Rua Eduardo Santos Pereira, 2221</p>
              <p className="text-sm">Campo Grande MS 79020-170</p>
              <p className="text-sm mt-2">COMPROVANTE DE VENDA</p>
              <p className="text-sm">
                {saleReceipt?.sale_date 
                  ? `${format(new Date(saleReceipt.sale_date.split('T')[0].split('-').map((v, i) => i === 1 ? parseInt(v) - 1 : parseInt(v))), "dd/MM/yyyy")} ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}` 
                  : format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Cliente:</p>
              <p>{saleReceipt?.client_name}</p>
              <p>CPF: {saleReceipt?.client_cpf}</p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Itens:</p>
              <ul className="space-y-1">
                {saleReceipt?.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-3 border-t flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(saleReceipt?.sale_total)}</span>
            </div>
            
            <div className="pt-2 space-y-2">
              <p className="font-medium">Formas de pagamento:</p>
              <ul className="space-y-1">
                {saleReceipt?.payment_methods.map((payment, index) => (
                  <li key={index} className="flex justify-between text-sm">
                    <span>
                      {payment.method_name}
                      {payment.installments > 1 ? ` (${payment.installments}x)` : ''}
                    </span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                // Gerar PDF do comprovante
                const element = document.getElementById('receipt');
                const opt = {
                  margin: 10,
                  filename: `Comprovante-Venda-${saleReceipt.sale_id}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                
                html2pdf().from(element).set(opt).save().then(() => {
                  toast({
                    title: "Sucesso",
                    description: "Comprovante gerado com sucesso!",
                    variant: "success"
                  });
                }).catch(error => {
                  console.error("Erro ao gerar comprovante:", error);
                  toast({
                    title: "Erro",
                    description: "Erro ao gerar comprovante. Tente novamente.",
                    variant: "destructive"
                  });
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}