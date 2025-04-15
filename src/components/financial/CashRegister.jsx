import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, isSameDay, startOfDay, parseISO, addDays } from "date-fns";
import { normalizeDate } from "@/utils/dateUtils";
import { ptBR } from "date-fns/locale";
import { 
  Plus, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Printer,
  Download,
  CreditCard,
  Landmark,
  CircleDollarSign,
  Calendar as CalendarIcon,
  Check,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCcw,
  Trash2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FinancialTransaction, User, Client, Employee, Package, ClientPackage, Service, PaymentMethod, Sale } from "@/firebase/entities";
import { InvokeLLM } from "@/api/integrations";
import { toast } from "@/components/ui/toast";
import RateLimitHandler from '@/components/RateLimitHandler';
import html2pdf from 'html2pdf.js';

export default function CashRegister() {
  const [transactions, setTransactions] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [showHistoricCashDialog, setShowHistoricCashDialog] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportHtml, setReportHtml] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedHistoricDate, setSelectedHistoricDate] = useState(new Date());
  const reportRef = useRef(null);
  const [userData, setUserData] = useState(null);
  const [cashIsOpen, setCashIsOpen] = useState(false);
  const [hasPreviousDayOpenCash, setHasPreviousDayOpenCash] = useState(false);
  const [previousOpenDate, setPreviousOpenDate] = useState(null);
  const [initialAmount, setInitialAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [closingNotes, setClosingNotes] = useState("");
  const [user, setUser] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [openCashData, setOpenCashData] = useState({
    initial_amount: 0,
    notes: "",
    opened_by: ""
  });

  const [closeCashData, setCloseCashData] = useState({
    expected_cash: 0,
    actual_cash: 0,
    difference: 0,
    notes: "",
    closed_by: ""
  });

  const [newTransaction, setNewTransaction] = useState({
    type: "receita",
    category: "outros",
    description: "",
    amount: 0,
    payment_methods: [{ method_id: "", amount: 0, installments: 1 }],
    status: "pago",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    client_id: "",
    client_name: ""
  });
  
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [expectedCashAmount, setExpectedCashAmount] = useState(0);
  
  const [clients, setClients] = useState([]);
  const [authorizedEmployees, setAuthorizedEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyBalance, setDailyBalance] = useState(0);
  const [dailyReceipts, setDailyReceipts] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [paymentMethodsTotal, setPaymentMethodsTotal] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const [initialAmountValue, setInitialAmountValue] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Funções utilitárias para datas
  const formatDate = (date) => {
    if (!date) return '';
    try {
      // Se for string ISO ou data simples, converter para objeto Date
      if (typeof date === 'string') {
        // Se já estiver no formato YYYY-MM-DD, retornar direto
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
        // Remover a parte do tempo se existir
        const datePart = date.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart;
        }
        // Tentar criar um objeto Date
        date = new Date(date);
      }
      
      // Garantir que estamos usando a timezone correta
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('[CashRegister] Erro ao formatar data:', error);
      return '';
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    return formatDate(now);
  };

  // Efeito inicial para carregar dados
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        await loadCashRegisters();
        await loadTransactions();
        await loadPaymentMethods();
        await checkCashStatus();
      } catch (error) {
        console.error("[CashRegister] Erro ao carregar dados iniciais:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
    
    // Configurar atualização automática a cada 60 segundos
    const updateInterval = setInterval(async () => {
      try {
        await loadTransactions();
        await checkCashStatus();
      } catch (error) {
        console.error("[CashRegister] Erro na atualização automática:", error);
      }
    }, 60000);
    
    return () => {
      clearInterval(updateInterval);
    };
  }, []); // Sem dependências, roda apenas uma vez

  // Efeito para logging de mudanças
  useEffect(() => {
    console.log("[CashRegister] Status do caixa alterado:", cashIsOpen ? "Aberto" : "Fechado");
    console.log("[CashRegister] Valor inicial:", initialAmount);
    console.log("[CashRegister] Saldo do dia:", dailyBalance);
  }, [cashIsOpen, initialAmount, dailyBalance]); // Removido o loadTransactions daqui

  // Efeito para processar transações apenas quando necessário
  useEffect(() => {
    const shouldProcessTransactions = 
      transactions && 
      Array.isArray(transactions) && 
      transactions.length > 0 &&
      !isLoading; // Não processa durante o carregamento

    if (shouldProcessTransactions) {
      processTransactions(transactions);
    }
  }, [transactions, isLoading]); // Adicionado isLoading como dependência

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const loadCashRegistersWithRetry = async (retries = 3, initialDelay = 1000) => {
    try {
      console.log("[CashRegister] Carregando registros de caixa do Firebase...");
      
      const data = await FinancialTransaction.filter({
        category: ["abertura_caixa", "fechamento_caixa"]
      }, true); // Forçar atualização do cache
      
      if (data && Array.isArray(data)) {
        setCashRegisters(data);
        console.log(`[CashRegister] ${data.length} registros de caixa carregados do Firebase`);
        
        const today = format(new Date(), "yyyy-MM-dd");
        const todayOpen = data.find(
          r => r.category === "abertura_caixa" && r.payment_date && r.payment_date.split('T')[0] === today
        );
        const todayClose = data.find(
          r => r.category === "fechamento_caixa" && r.payment_date && r.payment_date.split('T')[0] === today
        );
        
        setCashIsOpen(!!todayOpen && !todayClose);
        
        return data;
      }
      
      throw new Error("Dados inválidos retornados pelo Firebase");
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar registros de caixa:", error);
      
      const simData = generateSimulatedData();
      setCashRegisters(simData.cashRegisters);
      setCashIsOpen(true);
      
      return [];
    }
  };
  
  // Alias para manter compatibilidade com o código existente
  const loadCashRegisters = loadCashRegistersWithRetry;

  const checkCashStatus = async () => {
    try {
      console.log("[CashRegister] Verificando status do caixa...");

      // Buscar todas as transações
      const allTransactions = await FinancialTransaction.list();
      
      // Obter a data atual usando normalizeDate para consistência
      const today = normalizeDate(new Date());
      console.log("[CashRegister] Filtrando transações para:", today);
      
      // Criar um cache de datas normalizadas para evitar recálculos
      const dateCache = new Map();
      
      // Função para obter a data normalizada de uma transação com cache
      const getTransactionDate = (transaction) => {
        if (!transaction) return null;
        
        // Se já calculamos esta data antes, retornar do cache
        if (dateCache.has(transaction.id)) {
          return dateCache.get(transaction.id);
        }
        
        // Prioridade de campos para data: payment_date > created_date > date
        let normalizedDate;
        let sourceField = '';
        
        if (transaction.payment_date) {
          normalizedDate = normalizeDate(transaction.payment_date);
          sourceField = 'payment_date';
        } else if (transaction.created_date) {
          normalizedDate = normalizeDate(transaction.created_date);
          sourceField = 'created_date';
        } else if (transaction.date) {
          normalizedDate = normalizeDate(transaction.date);
          sourceField = 'date';
        } else {
          // Se não tiver nenhuma data, retornar null
          return null;
        }
        
        // Armazenar no cache para uso futuro
        dateCache.set(transaction.id, normalizedDate);
        
        console.log("[CashRegister] Data normalizada para transação", transaction.id, {
          normalizedDate,
          sourceField,
          originalValue: transaction[sourceField]
        });
        
        return normalizedDate;
      };
      
      // Filtrar e ordenar todas as transações de abertura e fechamento
      const openingTransactions = allTransactions
        .filter(t => t.category === "abertura_caixa" && t.type === "receita")
        .sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at));
        
      const closingTransactions = allTransactions
        .filter(t => t.category === "fechamento_caixa")
        .sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at));
      
      console.log("[CashRegister] Total de transações:", allTransactions.length, "Ativas:", allTransactions.filter(t => !t.deleted).length);
      
      // Encontrar a última transação de abertura
      const lastOpeningTransaction = openingTransactions[0];
      console.log("[CashRegister] Última transação de abertura encontrada:", lastOpeningTransaction);
      
      // Verificar se existe uma transação de abertura para hoje
      const todayOpeningTransaction = openingTransactions.find(t => getTransactionDate(t) === today);
      console.log("[CashRegister] Caixa aberto encontrado para a data:", today, todayOpeningTransaction ? "Sim" : "Não");
      
      // Verificar se existe uma transação de fechamento para hoje
      const todayClosingTransaction = closingTransactions.find(t => getTransactionDate(t) === today);
      
      // Determinar o status do caixa com base nas transações encontradas
      let isCashOpen = false;
      let hasPreviousDayOpen = false;
      let previousDate = null;
      let initialValue = 0;
      
      if (todayOpeningTransaction) {
        // Se temos uma abertura para hoje
        if (todayClosingTransaction) {
          // Se também temos um fechamento para hoje, verificar qual é mais recente
          const openingTime = new Date(todayOpeningTransaction.created_date || todayOpeningTransaction.created_at).getTime();
          const closingTime = new Date(todayClosingTransaction.created_date || todayClosingTransaction.created_at).getTime();
          
          // Se a abertura é mais recente que o fechamento, o caixa está aberto
          isCashOpen = openingTime > closingTime;
          console.log("[CashRegister] Comparação de timestamps:", {
            openingTime,
            closingTime,
            isCashOpen
          });
        } else {
          // Se temos abertura mas não fechamento para hoje, o caixa está aberto
          isCashOpen = true;
        }
        
        // Definir o valor inicial
        initialValue = parseFloat(todayOpeningTransaction.initial_amount || todayOpeningTransaction.amount) || 0;
      } else if (lastOpeningTransaction) {
        // Se não temos abertura para hoje, mas temos uma abertura anterior
        const lastOpeningDate = getTransactionDate(lastOpeningTransaction);
        
        // Verificar se esta abertura já foi fechada
        const matchingClosing = closingTransactions.find(t => {
          // Verificar se há um fechamento com a mesma data ou posterior
          const closingDate = getTransactionDate(t);
          return closingDate >= lastOpeningDate;
        });
        
        if (!matchingClosing) {
          // Se não encontramos um fechamento correspondente, temos um caixa aberto de dia anterior
          hasPreviousDayOpen = true;
          previousDate = lastOpeningDate;
          console.log("[CashRegister] Caixa aberto em dia anterior:", previousDate);
        }
      }
      
      // Atualizar o estado com os valores calculados
      setCashIsOpen(isCashOpen);
      setHasPreviousDayOpenCash(hasPreviousDayOpen);
      setPreviousOpenDate(previousDate);
      setInitialAmount(initialValue);
      
      // Se o caixa não estiver aberto, zerar o saldo
      if (!isCashOpen) {
        setDailyBalance(0);
      }
      
      console.log("[CashRegister] Status do caixa alterado:", isCashOpen ? "Aberto" : "Fechado");
      console.log("[CashRegister] Valor inicial:", initialValue);
      console.log("[CashRegister] Saldo do dia:", isCashOpen ? dailyBalance : 0);

    } catch (error) {
      console.error("[CashRegister] Erro ao verificar status do caixa:", error);
      toast.error("Erro ao verificar status do caixa");
    }
  };

  const loadTransactionsSinceDate = async (date) => {
    console.log("[CashRegister] Buscando transações desde:", date);
    if (!date) return;

    try {
      // Buscar todas as transações a partir da data, exceto fechamentos
      const transactions = await FinancialTransaction.list({
        payment_date_after: date,
        category_not: ['fechamento_caixa']
      });

      console.log("[CashRegister] Transações retornadas:", transactions);
      console.log("[CashRegister] Número de transações:", transactions.length);

      // Filtrar transações ativas
      const activeTransactions = transactions.filter(t => !t.deleted);
      
      setTransactions(activeTransactions);
      processTransactions(activeTransactions);
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar transações:", error);
      toast({
        title: "Erro ao carregar transações",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  const loadTransactionsWithRetry = async (retries = 3, initialDelay = 1000) => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      const today = format(new Date(), "yyyy-MM-dd");
      console.log("[CashRegister] Data de hoje formatada:", today);
      
      // Forçar atualização do cache do Firebase antes de buscar
      console.log("[CashRegister] Forçando atualização do cache do Firebase...");
      
      // Buscar transações diretamente do Firebase
      console.log("[CashRegister] Buscando transações do Firebase...");
      const todayTransactions = await FinancialTransaction.filter({
        payment_date: today
      }, true); // Passando true para forçar atualização do cache
      
      console.log("[CashRegister] Transações retornadas do Firebase:", todayTransactions);
      console.log("[CashRegister] Número de transações retornadas:", todayTransactions ? todayTransactions.length : 0);
      
      // Verificar formato das datas
      if (todayTransactions && Array.isArray(todayTransactions) && todayTransactions.length > 0) {
        console.log("[CashRegister] Exemplo de payment_date:", todayTransactions[0].payment_date);
        console.log("[CashRegister] Formato da data de payment_date:", typeof todayTransactions[0].payment_date);
      }
      
      if (todayTransactions && Array.isArray(todayTransactions)) {
        // Atualizar o estado das transações antes de processá-las
        setTransactions(todayTransactions);
        return todayTransactions;
      }
      
      throw new Error("Dados inválidos retornados pelo Firebase");
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar transações:", error);
      setErrorMessage("Erro ao carregar transações. Usando dados temporários.");
      loadSimulatedData();
    } finally {
      setIsLoading(false);
    }
  };

  // Alias para manter compatibilidade com o código existente
  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      const today = format(new Date(), "yyyy-MM-dd");
      console.log("[CashRegister] Data de hoje formatada:", today);
      
      // Buscar transações, métodos de pagamento e clientes
      const [transactionsData, paymentMethodsData, clientsData] = await Promise.all([
        FinancialTransaction.list(),
        PaymentMethod.list(),
        Client.list()
      ]);
      
      console.log("[CashRegister] Dados carregados:", {
        transacoes: transactionsData.length,
        metodosPagamento: paymentMethodsData.length,
        clientes: clientsData.length
      });
      
      // Mapeamento de métodos de pagamento por ID
      const paymentMethodsMap = paymentMethodsData.reduce((acc, method) => {
        acc[method.id] = method;
        return acc;
      }, {});

      // Mapeamento de clientes por ID
      const clientsMap = clientsData.reduce((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {});
      
      // Processar transações
      const processedTransactions = transactionsData.map(t => {
        // Encontrar o cliente relacionado
        const client = clientsMap[t.client_id];
        
        // Processar métodos de pagamento no novo formato (array de payment_methods)
        let payment_method_name = 'Método não identificado';
        
        if (t.payment_methods && Array.isArray(t.payment_methods) && t.payment_methods.length > 0) {
          // Novo formato: array de payment_methods
          payment_method_name = t.payment_methods.map(pm => {
            const method = paymentMethodsMap[pm.method_id];
            return method ? method.name : 'Método não identificado';
          }).join(', ');
        } else if (t.payment_method) {
          // Formato antigo: payment_method string
          const paymentMethod = paymentMethodsMap[t.payment_method];
          payment_method_name = paymentMethod ? paymentMethod.name : 'Método não identificado';
        }
        
        return {
          ...t,
          payment_method_name,
          client_name: client ? client.name : 'Cliente não identificado'
        };
      });

      console.log("[CashRegister] Transações processadas:", processedTransactions);
      
      setTransactions(processedTransactions);
      setPaymentMethods(paymentMethodsData);
      setClients(clientsData);
      
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar transações:", error);
      setErrorMessage("Erro ao carregar transações. Usando dados temporários.");
      loadSimulatedData();
    } finally {
      setIsLoading(false);
    }
  };
  

  


  useEffect(() => {
    loadTransactions();
  }, []); // Sem dependências, só roda uma vez ao montar

  useEffect(() => {
    if (transactions.length > 0) {
      processTransactions(transactions);
    }
  }, [transactions]); // Só roda quando as transações mudam

  const generateSimulatedData = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    return {
      transactions: [
        {
          id: "sim-1",
          type: "receita",
          category: "abertura_caixa",
          description: "Abertura de Caixa (Simulado)",
          amount: 200,
          payment_method: "dinheiro",
          status: "pago",
          payment_date: today,
          initial_amount: 200,
          created_date: new Date().toISOString()
        },
        {
          id: "sim-2",
          type: "receita",
          category: "venda_servico",
          description: "Serviço de Estética (Simulado)",
          amount: 150,
          payment_method: "dinheiro",
          status: "pago",
          payment_date: today,
          client_name: "Cliente Simulado"
        },
        {
          id: "sim-3",
          type: "despesa",
          category: "compra_produto",
          description: "Compra de Produtos (Simulado)",
          amount: 50,
          payment_method: "dinheiro",
          status: "pago",
          payment_date: today
        }
      ],
      
      cashRegisters: [
        {
          id: "sim-open-1",
          type: "receita",
          category: "abertura_caixa",
          description: "Abertura de Caixa (Simulado)",
          amount: 200,
          payment_method: "dinheiro",
          payment_date: today,
          initial_amount: 200,
          created_date: new Date().toISOString()
        }
      ],
      
      employees: [
        { id: "sim-emp-1", name: "Funcionário Simulado 1", can_manage_cash: true, active: true },
        { id: "sim-emp-2", name: "Funcionário Simulado 2", can_manage_cash: true, active: true }
      ],
      
      clients: [
        { id: "sim-client-1", name: "Cliente Simulado 1", email: "cliente1@exemplo.com" },
        { id: "sim-client-2", name: "Cliente Simulado 2", email: "cliente2@exemplo.com" }
      ]
    };
  };

  const loadUserData = async () => {
    try {
      console.log("[CashRegister] Carregando dados do usuário...");
      
      // Usar dados do usuário padrão enquanto a migração para Firebase Auth não está completa
      const defaultUser = { 
        full_name: "Usuário do Sistema",
        id: "system_user",
        email: "sistema@clinixplus.com"
      };
      
      console.log("[CashRegister] Usando usuário padrão do sistema");
      setUserData(defaultUser);
      setOpenCashData(prev => ({
        ...prev,
        opened_by: defaultUser.full_name
      }));
      setCloseCashData(prev => ({
        ...prev,
        closed_by: defaultUser.full_name
      }));
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar dados do usuário:", error);
      
      if (!userData) {
        const fallbackUser = { full_name: "Usuário do Sistema" };
        setUserData(fallbackUser);
        setOpenCashData(prev => ({
          ...prev,
          opened_by: fallbackUser.full_name
        }));
        setCloseCashData(prev => ({
          ...prev,
          closed_by: fallbackUser.full_name
        }));
      }
    }
  };

  

  const loadAuthorizedEmployees = async () => {
    try {
      console.log("[CashRegister] Carregando funcionários autorizados...");
      const employees = await Employee.list();
      console.log("[CashRegister] Todos os funcionários:", employees);
      
      // Filtrar apenas funcionários ativos e que podem gerenciar caixa
      const authorized = employees.filter(emp => {
        console.log("[CashRegister] Verificando funcionário:", emp.name, {
          active: emp.active,
          can_manage_cash: emp.can_manage_cash
        });
        return emp.active === true && emp.can_manage_cash === true;
      });
      
      console.log("[CashRegister] Funcionários autorizados:", authorized);
      setAuthorizedEmployees(authorized);

      // Garantir que o estado foi atualizado
      console.log("[CashRegister] Estado authorizedEmployees:", authorized.length);
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar funcionários autorizados:", error);
      toast.error("Erro ao carregar funcionários");
    }
  };

  useEffect(() => {
    loadAuthorizedEmployees();
  }, []);

  useEffect(() => {
    if (showOpenCashDialog) {
      loadAuthorizedEmployees();
    }
  }, [showOpenCashDialog]);

  const getTodayTransactions = () => {
    const today = normalizeDate(new Date());
    console.log("[CashRegister] Filtrando transações para:", today);
    
    return transactions.filter(t => {
      // Tentar pegar a data de várias propriedades possíveis
      let transactionDate = null;
      let dateSource = '';
      
      if (t.payment_date) {
        transactionDate = normalizeDate(t.payment_date);
        dateSource = 'payment_date';
      } else if (t.created_date) {
        transactionDate = normalizeDate(t.created_date);
        dateSource = 'created_date';
      } else if (t.date) {
        transactionDate = normalizeDate(t.date);
        dateSource = 'date';
      }
      
      console.log("[CashRegister] Transação:", {
        id: t.id,
        payment_date: t.payment_date,
        created_date: t.created_date,
        date: t.date,
        normalized_date: transactionDate,
        dateSource,
        today: today,
        matches: transactionDate === today
      });

      return transactionDate === today && 
             t.category !== "abertura_caixa" && 
             t.category !== "fechamento_caixa";
    });
  };
  
  // Função para formatar os métodos de pagamento para exibição
  const formatPaymentMethods = (transaction) => {
    // Novo formato (array de métodos)
    if (transaction.payment_methods && Array.isArray(transaction.payment_methods) && transaction.payment_methods.length > 0) {
      return transaction.payment_methods.map(pm => {
        // Suporta tanto 'method_id' quanto 'method' para compatibilidade
        const methodId = pm.method_id || pm.method;
        const method = paymentMethods.find(m => m.id === methodId);
        return method ? method.name : "Método não identificado";
      }).join(", ");
    }
    // Formato antigo (string)
    if (transaction.payment_method) {
      const method = paymentMethods.find(m => m.id === transaction.payment_method);
      return method ? method.name : transaction.payment_method_name || "Método não identificado";
    }
    return "Método não identificado";
  };

  const getTransactionsByDate = (date) => {
    console.log("[CashRegister] Filtrando transações para data:", {
      input: date,
      inputType: typeof date,
      normalizedInput: normalizeDate(date),
      currentTime: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return transactions.filter(t => {
      // Normalizar as datas usando a função normalizeDate
      const targetDate = normalizeDate(date);
      
      // Priorizar payment_date, mas usar created_date como fallback
      let transactionDate;
      let dateSource = '';
      
      if (t.payment_date) {
        transactionDate = normalizeDate(t.payment_date);
        dateSource = 'payment_date';
      } else if (t.created_date) {
        transactionDate = normalizeDate(t.created_date);
        dateSource = 'created_date';
      } else {
        console.log("[CashRegister] Transação sem data:", t);
        return false;
      }
      
      // Extrair componentes das datas para debug
      const targetComponents = {
        raw: date,
        normalized: targetDate,
        date: new Date(date)
      };
      
      const transactionComponents = {
        payment: t.payment_date ? new Date(t.payment_date) : null,
        created: t.created_date ? new Date(t.created_date) : null,
        normalized: transactionDate,
        source: dateSource
      };
      
      console.log("[CashRegister] Comparando datas:", {
        id: t.id,
        targetComponents,
        transactionComponents,
        matches: transactionDate === targetDate
      });
      
      return transactionDate === targetDate &&
             t.category !== "abertura_caixa" &&
             t.category !== "fechamento_caixa";
    });
  };

  const getIncomeByDate = (date) => {
    const today = normalizeDate(new Date());
    if (date === today) {
      return dailyReceipts;
    }
    return getTransactionsByDate(date)
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  };

  const getExpensesByDate = (date) => {
    const today = normalizeDate(new Date());
    if (date === today) {
      return dailyExpenses;
    }
    return getTransactionsByDate(date)
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  };

  const getPaymentMethodTotal = (method, type, date = normalizeDate(new Date())) => {
    return getTransactionsByDate(date)
      .filter(t => t.payment_method === method && t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
  const getCategoryTotal = (category, type, date = normalizeDate(new Date())) => {
    return getTransactionsByDate(date)
      .filter(t => t.category === category && t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getCashBalance = () => {
    return expectedCashAmount;
  };

  const getClientName = (clientId) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : `ID: ${clientId}`;
  };

  const OpenCashDialog = ({ open, onClose, onConfirm }) => {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [initialAmount, setInitialAmount] = useState(0);
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(normalizeDate(new Date()));

    const handleSubmit = async () => {
      if (!selectedEmployee) {
        toast.error("Selecione um funcionário responsável");
        return;
      }

      try {
        await handleOpenCash(selectedEmployee, initialAmount, notes, date);
        setSelectedEmployee("");
        setInitialAmount(0);
        setNotes("");
        onClose();
      } catch (error) {
        console.error("[CashRegister] Erro ao abrir caixa:", error);
        toast.error("Erro ao abrir o caixa");
      }
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              Selecione um funcionário responsável, a data e informe o valor inicial em dinheiro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funcionário Responsável</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {authorizedEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5">R$</span>
                <Input
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(parseFloat(e.target.value))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a abertura do caixa..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-[#294380] hover:bg-[#0D0F36]">
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const handleOpenCash = async (employeeName, initialAmount, notes = "", cashDate = normalizeDate(new Date())) => {
    try {
      console.log("[CashRegister] Abrindo caixa para a data:", cashDate);
      
      // Verificar se já existe um caixa aberto para a data específica
      const cashRegistersForDate = await FinancialTransaction.filter({
        category: "abertura_caixa",
        payment_date: cashDate
      }, true);
      
      const closingRegistersForDate = await FinancialTransaction.filter({
        category: "fechamento_caixa",
        payment_date: cashDate
      }, true);
      
      const isOpenForDate = cashRegistersForDate.length > 0 && closingRegistersForDate.length === 0;
      
      if (isOpenForDate) {
        toast.error(`O caixa para ${format(parseISO(cashDate), "dd/MM/yyyy")} já está aberto!`);
        setShowOpenCashDialog(false);
        return;
      }
      
      const openingTransaction = {
        type: "receita",
        category: "abertura_caixa",
        description: "Abertura de Caixa",
        amount: initialAmount,
        payment_method: "dinheiro",
        payment_date: cashDate,
        status: "pago",
        notes: notes,
        opened_by: employeeName
      };
      
      setShowOpenCashDialog(false);
      
      await FinancialTransaction.create(openingTransaction);
      
      // Se a data for hoje, atualizar o estado do caixa
      const today = format(new Date(), "yyyy-MM-dd");
      if (cashDate === today) {
        setInitialAmount(initialAmount);
        setCashIsOpen(true);
      }
      
      await loadTransactions();
      await loadCashRegisters();
      await checkCashStatus();
      
      toast.success(`Caixa aberto com sucesso para ${format(parseISO(cashDate), "dd/MM/yyyy")}!`);
    } catch (error) {
      console.error("[CashRegister] Erro ao abrir o caixa:", error);
      toast.error("Erro ao abrir o caixa. Tente novamente.");
    }
  };
  
  const handleCloseCash = async (employeeName) => {
    try {
      console.log("[CashRegister] Fechando caixa para a data:", previousOpenDate);

      // Buscar a transação de abertura do caixa
      const openCashTransaction = await FinancialTransaction.filter({
        category: 'abertura_caixa',
        payment_date: previousOpenDate
      }, true);

      if (openCashTransaction && openCashTransaction.length > 0) {
        const cashToClose = openCashTransaction[0];

        // Criar transação de fechamento
        const closingTransaction = {
          type: 'despesa',
          category: 'fechamento_caixa',
          description: 'Fechamento de Caixa',
          amount: dailyBalance,
          payment_method: 'dinheiro',
          status: 'pago',
          payment_date: previousOpenDate,
          created_by: employeeName || 'anonymous',
          notes: closingNotes || '',
          initial_amount: initialAmount,
          final_amount: finalAmount,
          expected_amount: expectedCashAmount,
          difference: finalAmount - expectedCashAmount,
          closed_by: employeeName || 'anonymous',
          closed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        };

        // Criar a transação de fechamento
        await FinancialTransaction.create(closingTransaction);

        // Atualizar a transação de abertura com closed_at
        await FinancialTransaction.update(cashToClose.id, {
          closed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
          closed_by: employeeName || 'anonymous'
        });

        // Resetar estados
        setClosingNotes("");
        setFinalAmount(0);
        setExpectedCashAmount(0);
        setShowCloseCashDialog(false);

        // Recarregar dados
        await loadTransactions();
        await checkCashStatus();

        toast.success("Caixa fechado com sucesso!");
      } else {
        console.error("[CashRegister] Nenhuma transação de abertura encontrada para fechar");
        toast.error("Erro ao fechar o caixa: transação de abertura não encontrada");
      }
    } catch (error) {
      console.error("[CashRegister] Erro ao fechar caixa:", error);
      toast.error("Erro ao fechar o caixa");
    }
  };

  const getPaymentMethodTotals = (transactions) => {
    // Inicializar objeto de totais com base nos métodos de pagamento disponíveis
    const totals = {};

    // Adicionar métodos de pagamento do Firebase
    if (paymentMethods && paymentMethods.length > 0) {
      paymentMethods.forEach(method => {
        totals[method.id] = 0;
      });
    } else {
      // Fallback para métodos padrão caso não tenha carregado do Firebase
      totals.pix = 0;
      totals.dinheiro = 0;
      totals.cartao_debito = 0;
      totals.cartao_credito = 0;
      totals.link = 0;
    }

    // Processar transações
    transactions.forEach(t => {
      if (t.type === 'receita') {
        if (t.payment_methods && Array.isArray(t.payment_methods) && t.payment_methods.length > 0) {
          // Novo formato: array de payment_methods
          t.payment_methods.forEach(pm => {
            // Suporta tanto 'method_id' quanto 'method' para compatibilidade
            const methodId = pm.method_id || pm.method;
            if (methodId && totals[methodId] !== undefined) {
              totals[methodId] += Number(pm.amount || 0);
            }
          });
        } else if (t.payment_method && totals[t.payment_method] !== undefined) {
          // Formato antigo: payment_method string
          totals[t.payment_method] += Number(t.amount || 0);
        }
      }
    });

    return totals;
  };

  const formatPaymentMethodsForReport = (transaction) => {
    // Novo formato (array de métodos)
    if (transaction.payment_methods && Array.isArray(transaction.payment_methods) && transaction.payment_methods.length > 0) {
      return transaction.payment_methods.map(pm => {
        // Suporta tanto 'method_id' quanto 'method' para compatibilidade
        const methodId = pm.method_id || pm.method;
        const method = paymentMethods.find(m => m.id === methodId);
        const methodName = method ? method.name.toUpperCase() : pm.method_id;
        return `${methodName} (R$ ${Number(pm.amount).toFixed(2)})`;
      }).join(' + ');
    }
    // Formato antigo (string)
    if (transaction.payment_method) {
      const method = paymentMethods.find(m => m.id === transaction.payment_method);
      return method ? method.name.toUpperCase() : transaction.payment_method.toUpperCase();
    }
    return '-';
  };

  const generateReportHtml = (cashData, transactions) => {
    if (!cashData || !transactions) return '';
    
    const paymentTotals = getPaymentMethodTotals(transactions);
    const totalReceitas = transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0);
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const normalizedDate = normalizeDate(dateStr);
        return format(parseISO(normalizedDate), "dd/MM/yyyy");
      } catch (e) {
        console.error("Erro ao formatar data:", e, dateStr);
        return '-';
      }
    };

    const formatTime = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const normalizedDate = normalizeDate(dateStr);
        return format(parseISO(normalizedDate), "HH:mm");
      } catch (e) {
        console.error("Erro ao formatar hora:", e, dateStr);
        return '-';
      }
    };
    
    // Função para obter o nome formatado do método de pagamento
    const getPaymentMethodName = (methodId) => {
      if (!paymentMethods || paymentMethods.length === 0) {
        // Fallback para nomes padrão
        const defaultNames = {
          'pix': 'PIX',
          'dinheiro': 'DINHEIRO',
          'cartao_debito': 'DÉBITO',
          'cartao_credito': 'CRÉDITO',
          'link': 'LINK'
        };
        return defaultNames[methodId] || methodId;
      }
      
      // Procurar o método de pagamento pelo ID
      const method = paymentMethods.find(m => m.id === methodId);
      
      // Se encontrar, retornar o nome, senão retornar o ID
      return method ? method.name.toUpperCase() : methodId;
    };
    
    // Gerar cabeçalhos de métodos de pagamento dinamicamente
    const paymentMethodHeaders = Object.keys(paymentTotals).map(type => 
      `<th style="padding: 8px; border: 1px solid #ddd;">${getPaymentMethodName(type)}</th>`
    ).join('');
    
    // Gerar células de valores de métodos de pagamento dinamicamente
    const paymentMethodCells = Object.entries(paymentTotals).map(([type, total]) => 
      `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(total).toFixed(2)}</td>`
    ).join('');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <img src="/logo.png" alt="Logo" style="height: 50px;" />
          <div style="text-align: right;">
            <h2 style="margin: 0 0 10px 0;">DETALHAMENTO CAIXA</h2>
            <p style="margin: 0;">OPERADOR: ${cashData.opened_by || '-'}</p>
            <p style="margin: 0;">${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">R$ ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">R$ FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">QUEBRA</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(cashData.opened_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(cashData.closed_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(cashData.initial_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(cashData.final_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${Number(cashData.difference || 0) < 0 ? 'red' : 'green'};">
              R$ ${Number(cashData.difference || 0).toFixed(2)}
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 10px;">DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0).toFixed(2)}</h3>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr style="background-color: #f0f0f0;">
              ${paymentMethodHeaders}
            </tr>
            <tr>
              ${paymentMethodCells}
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">DESCRIÇÃO</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">REF.</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">VALOR</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">DATA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">HORA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">CLIENTE</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">FORMA PGTO</th>
          </tr>
          ${transactions.map(t => {
            const categoryMap = {
              'venda_produto': 'PRODUTO',
              'venda_servico': 'SERVIÇO',
              'venda_pacote': 'PACOTE',
              'venda_gift_card': 'GIFT CARD',
              'venda_assinatura': 'ASSINATURA',
              'abertura_caixa': 'ABERTURA',
              'venda': 'VENDA'
            };

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.description || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${categoryMap[t.category] || t.category || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${Number(t.amount || 0).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(t.payment_date)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatTime(t.created_at)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.client_name || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatPaymentMethodsForReport(t)}</td>
              </tr>
            `;
          }).join('')}
        </table>

        <div style="margin-top: 50px; text-align: center;">
          <div style="border-top: 1px solid #000; display: inline-block; padding-top: 10px; min-width: 200px;">
            (Assinaturaa)
          </div>
        </div>

        <div style="margin-top: 30px; font-size: 12px; text-align: center;">
          <p style="margin: 5px 0;">MAGNIFIC</p>
          <p style="margin: 5px 0;">Rua Eduardo Santos Pereira, 2221 - Campo Grande MS 79020-170</p>
        </div>
      </div>
    `;
    return html;
  };

  const generatePDFReport = async (cashData, transactions) => {
    // Função para obter o nome formatado do método de pagamento
    const getPaymentMethodName = (methodId) => {
      if (!paymentMethods || paymentMethods.length === 0) {
        // Fallback para nomes padrão
        const defaultNames = {
          'pix': 'PIX',
          'dinheiro': 'DINHEIRO',
          'cartao_debito': 'DÉBITO',
          'cartao_credito': 'CRÉDITO',
          'link': 'LINK'
        };
        return defaultNames[methodId] || methodId;
      }
      
      // Procurar o método de pagamento pelo ID
      const method = paymentMethods.find(m => m.id === methodId);
      
      // Se encontrar, retornar o nome, senão retornar o ID
      return method ? method.name.toUpperCase() : methodId;
    };
    
    const paymentTotals = getPaymentMethodTotals(transactions);
    
    // Gerar cabeçalhos de métodos de pagamento dinamicamente
    const paymentMethodHeaders = Object.keys(paymentTotals).map(type => 
      `<th style="padding: 8px; border: 1px solid #ddd;">${getPaymentMethodName(type)}</th>`
    ).join('');
    
    // Gerar células de valores de métodos de pagamento dinamicamente
    const paymentMethodCells = Object.entries(paymentTotals).map(([type, total]) => 
      `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(total).toFixed(2)}</td>`
    ).join('');
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const normalizedDate = normalizeDate(dateStr);
        return format(parseISO(normalizedDate), "dd/MM/yyyy");
      } catch (e) {
        console.error("Erro ao formatar data:", e, dateStr);
        return '-';
      }
    };

    const formatTime = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const normalizedDate = normalizeDate(dateStr);
        return format(parseISO(normalizedDate), "HH:mm");
      } catch (e) {
        console.error("Erro ao formatar hora:", e, dateStr);
        return '-';
      }
    };
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <img src="/logo.png" alt="Logo" style="height: 50px;" />
          <div style="text-align: right;">
            <h2 style="margin: 0 0 10px 0;">DETALHAMENTO CAIXA</h2>
            <p style="margin: 0;">OPERADOR: ${cashData.opened_by || '-'}</p>
            <p style="margin: 0;">${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</p>
          </div>
        </div>

        <!-- Abertura/Fechamento -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">R$ ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">R$ FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">QUEBRA</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(cashData.opened_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(cashData.closed_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(cashData.initial_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(cashData.final_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${Number(cashData.difference || 0) < 0 ? 'red' : 'green'};">
              R$ ${Number(cashData.difference || 0).toFixed(2)}
            </td>
          </tr>
        </table>

        <!-- Totais por Forma de Pagamento -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 10px;">DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0).toFixed(2)}</h3>
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr style="background-color: #f0f0f0;">
              ${paymentMethodHeaders}
            </tr>
            <tr>
              ${paymentMethodCells}
            </tr>
          </table>
        </div>

        <!-- Transações -->
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd; width: 25%;">DESCRIÇÃO</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">REF.</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">VALOR</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">DATA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">HORA</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">CLIENTE</th>
            <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">FORMA PGTO</th>
          </tr>
          ${transactions.map(t => {
            const categoryMap = {
              'venda_produto': 'PRODUTO',
              'venda_servico': 'SERVIÇO',
              'venda_pacote': 'PACOTE',
              'venda_gift_card': 'GIFT CARD',
              'venda_assinatura': 'ASSINATURA',
              'abertura_caixa': 'ABERTURA',
              'venda': 'VENDA'
            };

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.description || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${categoryMap[t.category] || t.category || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${Number(t.amount || 0).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(t.payment_date)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatTime(t.created_at)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.client_name || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatPaymentMethodsForReport(t)}</td>
              </tr>
            `;
          }).join('')}
        </table>

        <!-- Assinatura -->
        <div style="margin-top: 50px; text-align: center;">
          <div style="border-top: 1px solid #000; display: inline-block; padding-top: 10px; min-width: 200px;">
            (Assinatura)
          </div>
        </div>

        <!-- Rodapé -->
        <div style="margin-top: 30px; font-size: 12px; text-align: center;">
          <p style="margin: 5px 0;">MAGNIFIC Telefone:</p>
          <p style="margin: 5px 0;">Endereço: Rua Eduardo Santos Pereira, 2221 - Campo Grande MS 79020-170</p>
        </div>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    const options = {
      margin: 10,
      filename: `caixa_${format(parseISO(normalizeDate(new Date())), 'dd-MM-yyyy')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdf = await html2pdf().from(element).set(options).save();
      document.body.removeChild(element);
      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso!",
        type: "success"
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório PDF",
        type: "error"
      });
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
  
  const handleDownloadReport = async () => {
    try {
      setIsGeneratingReport(true);
      await generatePDFReport(cashRegisters[0], transactions);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório",
        type: "error"
      });
    } finally {
      setIsGeneratingReport(false);
      setShowReportDialog(false);
    }
  };

  // Função para gerar o HTML do relatório de caixa
  // Função para buscar clientes
  const searchClients = (term) => {
    if (!term) return [];
    term = term.toLowerCase();
    return clients.filter(client => 
      client.name?.toLowerCase().includes(term) || 
      client.cpf?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  };

  // Função para adicionar um método de pagamento
  const addPaymentMethod = () => {
    // Verifica se ainda existem métodos disponíveis para adicionar
    if (newTransaction.payment_methods.length >= paymentMethods.length) {
      return;
    }
    
    // Encontra um método de pagamento ainda não utilizado
    const usedMethodIds = newTransaction.payment_methods.map(pm => pm.method_id);
    const availableMethod = paymentMethods.find(m => !usedMethodIds.includes(m.id));
    
    if (availableMethod) {
      // Se for distribuir valores, calcula o valor restante
      const totalAmount = parseFloat(newTransaction.amount) || 0;
      const totalPaid = newTransaction.payment_methods.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0);
      const remaining = Math.max(0, totalAmount - totalPaid);
      
      setNewTransaction({
        ...newTransaction,
        payment_methods: [...newTransaction.payment_methods, {
          method_id: availableMethod.id,
          amount: remaining,
          installments: 1
        }]
      });
    }
  };

  // Função para remover um método de pagamento
  const removePaymentMethod = (index) => {
    if (newTransaction.payment_methods.length <= 1) return;
    
    const removedAmount = parseFloat(newTransaction.payment_methods[index].amount) || 0;
    const updatedPaymentMethods = [...newTransaction.payment_methods];
    updatedPaymentMethods.splice(index, 1);
    
    // Redistribui o valor removido para o primeiro método
    if (removedAmount > 0 && updatedPaymentMethods.length > 0) {
      updatedPaymentMethods[0].amount = (parseFloat(updatedPaymentMethods[0].amount) || 0) + removedAmount;
    }
    
    setNewTransaction({
      ...newTransaction,
      payment_methods: updatedPaymentMethods
    });
  };

  // Função para atualizar um método de pagamento
  const updatePaymentMethod = (index, field, value) => {
    const updatedPaymentMethods = [...newTransaction.payment_methods];
    updatedPaymentMethods[index] = {
      ...updatedPaymentMethods[index],
      [field]: value
    };
    
    setNewTransaction({
      ...newTransaction,
      payment_methods: updatedPaymentMethods
    });
  };

  // Função para criar uma nova transação no caixa
  const handleCreateTransaction = async (transaction) => {
    try {
      setIsLoading(true);
      
      // Validar dados da transação
      if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
        toast.error("Preencha todos os campos obrigatórios corretamente.");
        return;
      }
      
      // Verificar se a data é válida
      if (!transaction.payment_date) {
        toast.error("Selecione uma data válida para a transação.");
        return;
      }
      
      // Verificar se o caixa está aberto para transações do dia atual
      const today = format(new Date(), "yyyy-MM-dd");
      const transactionDate = format(new Date(transaction.payment_date), "yyyy-MM-dd");
      
      if (transactionDate === today && !cashIsOpen) {
        toast.error("O caixa precisa estar aberto para registrar transações do dia atual.");
        return;
      }

      // Verificar se os métodos de pagamento somam o valor total
      const totalAmount = parseFloat(transaction.amount) || 0;
      const totalPayments = transaction.payment_methods.reduce((sum, pm) => sum + (parseFloat(pm.amount) || 0), 0);
      
      if (Math.abs(totalAmount - totalPayments) > 0.01) { // Pequena margem para erros de arredondamento
        toast.error("O valor total dos métodos de pagamento deve ser igual ao valor da transação.");
        return;
      }
      
      // Preparar dados da transação
      const now = new Date();
      const transactionData = {
        ...transaction,
        created_date: format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
        // Usar normalizeDate para formatar a data corretamente
        payment_date: normalizeDate(transaction.payment_date),
        status: "pago",
        user_id: userData?.id || "sistema",
        created_by: userData?.full_name || "sistema"
      };
      
      console.log("[CashRegister] Criando nova transação:", transactionData);
      
      // Salvar transação no Firebase
      const savedTransaction = await FinancialTransaction.create(transactionData);
      
      if (savedTransaction) {
        console.log("[CashRegister] Transação criada com sucesso:", savedTransaction);
        toast.success("Transação registrada com sucesso!");
        
        // Atualizar lista de transações
        await loadTransactionsWithRetry();
        
        // Resetar formulário
        setNewTransaction({
          type: "receita",
          category: "outros",
          description: "",
          amount: 0,
          payment_methods: [{ method_id: "", amount: 0, installments: 1 }],
          status: "pago",
          payment_date: format(new Date(), "yyyy-MM-dd"),
          due_date: format(new Date(), "yyyy-MM-dd"),
          client_id: "",
          client_name: ""
        });
        
        // Resetar cliente selecionado
        setSelectedClient(null);
        setClientSearchTerm("");
        setClientSearchResults([]);
        
        // Fechar diálogo
        setShowNewTransactionDialog(false);
      } else {
        throw new Error("Falha ao criar transação");
      }
    } catch (error) {
      console.error("[CashRegister] Erro ao criar transação:", error);
      toast.error("Ocorreu um erro ao registrar a transação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateCashReport = async (cashData, transactions) => {
    try {
      // Formatar datas para exibição
      const openedAtFormatted = cashData.opened_at ? 
        format(parseISO(normalizeDate(cashData.opened_at)), "dd/MM/yyyy HH:mm") : "N/A";
      const closedAtFormatted = cashData.closed_at ? 
        format(parseISO(normalizeDate(cashData.closed_at)), "dd/MM/yyyy HH:mm") : "N/A";
      
      // Calcular totais por método de pagamento
      const paymentMethodTotals = {};
      let totalReceipts = 0;
      let totalExpenses = 0;
      
      transactions.forEach(transaction => {
        const methodName = transaction.payment_method_name || 'Não especificado';
        const amount = parseFloat(transaction.amount) || 0;
        
        if (!paymentMethodTotals[methodName]) {
          paymentMethodTotals[methodName] = { receipts: 0, expenses: 0 };
        }
        
        if (transaction.type === 'receita') {
          paymentMethodTotals[methodName].receipts += amount;
          totalReceipts += amount;
        } else {
          paymentMethodTotals[methodName].expenses += amount;
          totalExpenses += amount;
        }
      });
      
      // Gerar linhas da tabela de transações
      const transactionRows = transactions.map(t => {
        const amount = parseFloat(t.amount) || 0;
        const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const transactionDate = t.payment_date ? 
          format(parseISO(normalizeDate(t.payment_date)), "dd/MM/yyyy HH:mm") : "N/A";
        
        return `
          <tr>
            <td>${t.description}</td>
            <td>${t.type === 'receita' ? 'Receita' : 'Despesa'}</td>
            <td>${t.payment_method_name || 'Não especificado'}</td>
            <td>${t.client_name || 'Não especificado'}</td>
            <td>${transactionDate}</td>
            <td class="${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}">
              ${formattedAmount}
            </td>
          </tr>
        `;
      }).join('');
      
      // Gerar linhas da tabela de totais por método de pagamento
      const paymentMethodRows = Object.entries(paymentMethodTotals).map(([method, totals]) => {
        const receiptsFormatted = totals.receipts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const expensesFormatted = totals.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const balanceFormatted = (totals.receipts - totals.expenses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        return `
          <tr>
            <td>${method}</td>
            <td class="text-green-600">${receiptsFormatted}</td>
            <td class="text-red-600">${expensesFormatted}</td>
            <td class="${totals.receipts - totals.expenses >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${balanceFormatted}
            </td>
          </tr>
        `;
      }).join('');
      
      // Formatar valores monetários
      const initialAmountFormatted = cashData.initial_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const finalAmountFormatted = cashData.final_amount ? 
        cashData.final_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "N/A";
      const differenceFormatted = cashData.difference ? 
        cashData.difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "N/A";
      const totalReceiptsFormatted = totalReceipts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const totalExpensesFormatted = totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const balanceFormatted = (totalReceipts - totalExpenses).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      
      // Gerar HTML completo do relatório
      return `
        <div class="p-4">
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold">Relatório de Caixa</h1>
            <p class="text-gray-600">Data: ${format(new Date(cashData.opened_at || new Date()), "dd/MM/yyyy")}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="border rounded p-4">
              <h2 class="text-lg font-semibold mb-2">Informações de Abertura</h2>
              <p><strong>Aberto por:</strong> ${cashData.opened_by}</p>
              <p><strong>Data/Hora:</strong> ${openedAtFormatted}</p>
              <p><strong>Valor Inicial:</strong> ${initialAmountFormatted}</p>
            </div>
            
            <div class="border rounded p-4">
              <h2 class="text-lg font-semibold mb-2">Informações de Fechamento</h2>
              <p><strong>Data/Hora:</strong> ${closedAtFormatted}</p>
              <p><strong>Valor Final:</strong> ${finalAmountFormatted}</p>
              <p><strong>Diferença:</strong> <span class="${cashData.difference >= 0 ? 'text-green-600' : 'text-red-600'}">${differenceFormatted}</span></p>
            </div>
          </div>
          
          <div class="mb-6">
            <h2 class="text-lg font-semibold mb-2">Resumo do Dia</h2>
            <div class="border rounded p-4">
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <p class="text-gray-600">Total de Receitas</p>
                  <p class="text-xl text-green-600 font-semibold">${totalReceiptsFormatted}</p>
                </div>
                <div>
                  <p class="text-gray-600">Total de Despesas</p>
                  <p class="text-xl text-red-600 font-semibold">${totalExpensesFormatted}</p>
                </div>
                <div>
                  <p class="text-gray-600">Balanço</p>
                  <p class="text-xl font-semibold ${totalReceipts - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}">${balanceFormatted}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-2">Totais por Método de Pagamento</h3>
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border p-2 text-left">Método</th>
                  <th class="border p-2 text-left">Receitas</th>
                  <th class="border p-2 text-left">Despesas</th>
                  <th class="border p-2 text-left">Balanço</th>
                </tr>
              </thead>
              <tbody>
                ${paymentMethodRows || '<tr><td colspan="4" class="border p-2 text-center">Nenhum dado disponível</td></tr>'}
              </tbody>
            </table>
          </div>
          
          <div>
            <h2 class="text-lg font-semibold mb-2">Transações do Dia</h2>
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border p-2 text-left">Descrição</th>
                  <th class="border p-2 text-left">Tipo</th>
                  <th class="border p-2 text-left">Método</th>
                  <th class="border p-2 text-left">Cliente</th>
                  <th class="border p-2 text-left">Data/Hora</th>
                  <th class="border p-2 text-left">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${transactionRows || '<tr><td colspan="6" class="border p-2 text-center">Nenhuma transação encontrada</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("[CashRegister] Erro ao gerar relatório:", error);
      return `<div class="p-4 text-center text-red-600">Erro ao gerar relatório: ${error.message}</div>`;
    }
  };

  const viewHistoricCash = async (date) => {
    if (!date) return;
    
    try {
      // Formatar a data para exibição e consulta
      const queryDate = normalizeDate(date);
      const displayDate = format(parseISO(queryDate), "dd/MM/yyyy");
      console.log("[CashRegister] Visualizando caixa da data:", displayDate);
      
      // Buscar todas as transações
      const allTransactions = await FinancialTransaction.list();
      console.log(`[CashRegister] Total de ${allTransactions.length} transações carregadas`);
      
      // Filtrar transações para a data selecionada
      const transactionsForDate = allTransactions.filter(transaction => {
        // Ignorar transações de fechamento de caixa
        if (transaction.category === 'fechamento_caixa') {
          return false;
        }
        
        if (!transaction.payment_date) return false;
        
        // Normalizar a data da transação para comparação
        const transactionDate = normalizeDate(transaction.payment_date);
        
        return transactionDate === queryDate;
      });
      
      console.log(`[CashRegister] ${transactionsForDate.length} transações encontradas para a data ${queryDate}`);
      
      // Processar transações com métodos de pagamento e clientes
      const processedTransactions = transactionsForDate.map(t => {
        const paymentMethod = paymentMethods.find(pm => pm.id === t.payment_method);
        const client = clients.find(c => c.id === t.client_id);
        
        return {
          ...t,
          payment_method_name: paymentMethod ? paymentMethod.name : 'Método não identificado',
          client_name: client ? client.name : 'Cliente não identificado'
        };
      });
      
      // Filtrar registros de abertura para a data selecionada
      const openingTransactions = allTransactions.filter(transaction => {
        if (transaction.category !== 'abertura_caixa') return false;
        
        if (transaction.payment_date) {
          // Normalizar a data da transação
          const transactionDate = normalizeDate(transaction.payment_date);
          
          const match = transactionDate === queryDate;
          if (match) {
            console.log("[CashRegister] Registro de abertura encontrado para a data", queryDate, ":", transaction.id);
          }
          return match;
        }
        return false;
      });
      
      // Filtrar registros de fechamento para a data selecionada
      const closingTransactions = allTransactions.filter(transaction => {
        if (transaction.category !== 'fechamento_caixa') return false;
        
        if (transaction.payment_date) {
          // Normalizar a data da transação
          const transactionDate = normalizeDate(transaction.payment_date);
          
          const match = transactionDate === queryDate;
          if (match) {
            console.log("[CashRegister] Registro de fechamento encontrado para a data", queryDate, ":", transaction.id);
          }
          return match;
        }
        return false;
      });
      
      console.log(`[CashRegister] Encontrados ${openingTransactions.length} registros de abertura e ${closingTransactions.length} registros de fechamento`);
      
      const opening = openingTransactions.length > 0 ? openingTransactions[0] : null;
      const closing = closingTransactions.length > 0 ? closingTransactions[0] : null;
      
      // Verificar se há registros de abertura ou fechamento
      if (!opening && !closing && processedTransactions.length === 0) {
        toast.error(`Nenhum registro de caixa encontrado para a data ${displayDate}.`);
        return;
      }
      
      // Preparar dados do caixa
      const cashData = {
        opened_by: opening ? opening.opened_by : "N/A",
        opened_at: opening ? opening.payment_date : null,
        closed_at: closing ? closing.payment_date : null,
        initial_amount: opening ? opening.amount : 0,
        final_amount: closing ? closing.amount : null,
        difference: (closing && opening) ? (closing.amount - opening.amount) : 0
      };
      
      // Gerar HTML do relatório
      const html = await generateCashReport(cashData, processedTransactions);
      setReportHtml(html);
      setShowReportDialog(true);
      setShowHistoricCashDialog(false);
      
    } catch (error) {
      console.error("[CashRegister] Erro ao visualizar caixa histórico:", error);
      toast.error("Ocorreu um erro ao gerar o relatório de caixa para a data selecionada.");
    }
  };

  const getCashRegisterByDate = (date) => {
    const normalizedDate = normalizeDate(date);
    const opening = cashRegisters.find(r => 
      r.category === "abertura_caixa" && 
      normalizeDate(r.payment_date) === normalizedDate
    );
    const closing = cashRegisters.find(r => 
      r.category === "fechamento_caixa" && 
      normalizeDate(r.payment_date) === normalizedDate
    );
    return { opening, closing };
  };

  const processTransactions = (transactions) => {
    try {
      if (!transactions || !Array.isArray(transactions)) {
        console.log("Nenhuma transação para processar");
        return;
      }
      
      // Definir a data de hoje
      const today = normalizeDate(new Date());
      
      // Filtrar transações excluídas
      const activeTransactions = transactions.filter(transaction => 
        transaction.status !== "excluido" && transaction.deleted !== true
      );
      
      console.log(`Total de transações: ${transactions.length}, Ativas: ${activeTransactions.length}`);
      
      // Encontrar todas as transações de abertura (ordenadas por data, mais recente primeiro)
      const openingTransactions = activeTransactions
        .filter(t => t.category === "abertura_caixa")
        .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      
      // Verificar se há caixas abertos (sem fechamento correspondente)
      let foundOpenCash = false;
      let previousOpenDate = null;
      
      if (openingTransactions.length > 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        
        // Usar a transação de abertura mais recente para cálculos
        const lastOpeningTransaction = openingTransactions[0];
        console.log("Última transação de abertura encontrada:", lastOpeningTransaction);
        
        // Valor inicial do caixa
        const initialAmountValue = parseFloat(lastOpeningTransaction.amount) || 0;
        console.log(`Valor inicial do caixa: R$ ${initialAmountValue.toFixed(2)}`);
        
        // Data de abertura do caixa
        const openingDate = lastOpeningTransaction.payment_date ? normalizeDate(lastOpeningTransaction.payment_date) : normalizeDate(new Date());
        
        // Filtrar transações após a abertura do caixa
        const transactionsAfterOpening = activeTransactions.filter(t => {
          const transactionDate = t.payment_date ? normalizeDate(t.payment_date) : null;
          return transactionDate >= openingDate;
        });
        
        // Filtrar transações de receita e despesa (excluindo abertura e fechamento)
        const receiptTransactions = transactionsAfterOpening.filter(t => 
          t.type === "receita" && 
          t.category !== "abertura_caixa" && 
          t.category !== "fechamento_caixa"
        );
        
        const expenseTransactions = transactionsAfterOpening.filter(t => 
          t.type === "despesa" && 
          t.category !== "abertura_caixa" && 
          t.category !== "fechamento_caixa"
        );
        
        // Calcular totais
        const totalReceipts = receiptTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        // Atualizar os estados (apenas se diferentes)
        if (dailyReceipts !== totalReceipts) {
          setDailyReceipts(totalReceipts);
        }
        if (dailyExpenses !== totalExpenses) {
          setDailyExpenses(totalExpenses);
        }
        
        // Calcular saldo
        const balance = initialAmountValue + totalReceipts - totalExpenses;
        console.log(`Cálculo do saldo: ${initialAmountValue} (inicial) + ${totalReceipts} (receitas) - ${totalExpenses} (despesas) = ${balance}`);
        if (dailyBalance !== balance) {
          setDailyBalance(balance);
        }
        
        // Calcular saldo em dinheiro
        const cashReceiptTransactions = receiptTransactions.filter(t => t.payment_method === "dinheiro");
        const cashExpenseTransactions = expenseTransactions.filter(t => t.payment_method === "dinheiro");
        
        const cashReceipts = cashReceiptTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const cashExpenses = cashExpenseTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        const expectedCash = initialAmountValue + cashReceipts - cashExpenses;
        console.log(`Saldo em dinheiro: ${initialAmountValue} (inicial) + ${cashReceipts} (receitas em dinheiro) - ${cashExpenses} (despesas em dinheiro) = ${expectedCash}`);
        if (expectedCashAmount !== expectedCash) {
          setExpectedCashAmount(expectedCash);
        }
        
        // Verificar todos os caixas abertos (sem fechamento)
        let hasOpenCashForToday = false;
        
        for (const openingTx of openingTransactions) {
          const txDate = openingTx.payment_date ? openingTx.payment_date.split('T')[0] : null;
          if (!txDate) continue;
          
          // Verificar se há fechamento para esta abertura
          const hasClosure = activeTransactions.some(t => 
            t.category === "fechamento_caixa" && 
            t.payment_date && 
            t.payment_date.split('T')[0] === txDate
          );
          
          if (!hasClosure) {
            console.log(`Caixa aberto encontrado para a data: ${txDate}`);
            
            // Se for para hoje
            if (txDate === today) {
              hasOpenCashForToday = true;
            } 
            // Se for para um dia anterior e ainda não encontramos outro caixa aberto
            else if (!foundOpenCash) {
              foundOpenCash = true;
              previousOpenDate = txDate;
            }
          }
        }
        
        // Atualizar estados com base nas verificações
        setCashIsOpen(hasOpenCashForToday);
        
        if (foundOpenCash && !hasOpenCashForToday) {
          setHasPreviousDayOpenCash(true);
          setPreviousOpenDate(previousOpenDate);
        } else {
          setHasPreviousDayOpenCash(false);
          setPreviousOpenDate(null);
        }
        
      } else {
        console.log("Nenhuma transação de abertura encontrada");
        setCashIsOpen(false);
        setHasPreviousDayOpenCash(false);
        setPreviousOpenDate(null);
        setInitialAmount(0);
      }

    } catch (error) {
      console.error("Erro ao processar transações:", error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      console.log("[CashRegister] Carregando métodos de pagamento...");
      
      // Importar dinamicamente a entidade PaymentMethod
      const { PaymentMethod } = await import("@/firebase/entities");
      
      // Buscar métodos de pagamento ativos
      const methods = await PaymentMethod.list();
      const activeMethods = methods.filter(method => !method.isInactive);
      
      console.log(`[CashRegister] ${activeMethods.length} métodos de pagamento carregados`);
      setPaymentMethods(activeMethods);
      
      return activeMethods;
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar métodos de pagamento:", error);
      return [];
    }
  };

  const handleOpenReport = () => {
    if (!cashRegisters || cashRegisters.length === 0) {
      console.log("Não há dados de caixa disponíveis");
    }

    // Usar a data selecionada ou a data atual
    const dateToUse = selectedDate || format(new Date(), "yyyy-MM-dd");
    
    // Buscar transações para a data selecionada
    const transactionsForDate = transactions.filter(t => {
      const transactionDate = t.payment_date ? t.payment_date.split('T')[0] : null;
      return transactionDate === dateToUse;
    });
    
    // Buscar registros de abertura/fechamento para a data selecionada
    const { opening, closing } = getCashRegisterByDate(dateToUse);
    
    if (!opening) {
      console.log(`Não há registro de abertura de caixa para ${format(parseISO(dateToUse), "dd/MM/yyyy")}`);
      return;
    }
    
    // Criar um objeto com os dados do caixa para a data selecionada
    const cashData = {
      opened_by: opening ? opening.opened_by : "N/A",
      opened_at: opening ? opening.payment_date : null,
      closed_at: closing ? closing.payment_date : null,
      initial_amount: opening ? opening.amount : 0,
      final_amount: closing ? closing.amount : null,
      difference: (closing && opening) ? (closing.amount - opening.amount) : 0
    };
    
    const html = generateReportHtml(cashData, transactionsForDate);
    setReportHtml(html);
    setShowReportDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-[#0D0F36]">
          Caixa
          <span className="text-base font-normal text-gray-500 ml-2 hidden sm:inline">Controle de entradas e saídas do caixa</span>
        </h2>
        
        {/* Botões principais - visíveis em dispositivos móveis */}
        <div className="grid grid-cols-2 sm:hidden gap-2 mb-2">
          <Button 
            onClick={() => setShowNewTransactionDialog(true)}
            className="bg-[#294380] hover:bg-[#0D0F36] w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
          {cashIsOpen ? (
            <Button 
              onClick={() => setShowCloseCashDialog(true)}
              variant="outline" 
              className="text-[#294380] border-[#294380] w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Fechar Caixa
            </Button>
          ) : (
            <Button 
              onClick={() => setShowOpenCashDialog(true)}
              variant="outline" 
              className="text-[#294380] border-[#294380] w-full"
              disabled={cashIsOpen}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Caixa
            </Button>
          )}
        </div>
        
        {/* Menu de opções adicionais para mobile */}
        <div className="sm:hidden">
          <Select
            onValueChange={(value) => {
              if (value === "report") handleOpenReport();
              if (value === "historic") setShowHistoricCashDialog(true);
              if (value === "refresh") {
                loadTransactionsWithRetry();
                loadClients();
                loadAuthorizedEmployees();
              }
              if (value === "clear") {
                console.log("[CashRegister] Limpando cache local...");
                loadTransactionsWithRetry();
                loadClients();
                loadAuthorizedEmployees();
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mais opções..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="report">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  <span>Relatório</span>
                </div>
              </SelectItem>
              <SelectItem value="historic">
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>Caixas Anteriores</span>
                </div>
              </SelectItem>
              <SelectItem value="refresh">
                <div className="flex items-center">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  <span>Atualizar</span>
                </div>
              </SelectItem>
              <SelectItem value="clear">
                <div className="flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Limpar Cache</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Botões para desktop - escondidos em mobile */}
        <div className="hidden sm:flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              loadTransactionsWithRetry();
              loadClients();
              loadAuthorizedEmployees();
            }}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              // Limpar o cache local
              console.log("[CashRegister] Limpando cache local...");
              
              // Forçar atualização completa
              loadTransactionsWithRetry();
              loadClients();
              loadAuthorizedEmployees();
            }}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Cache
          </Button>
          <Button 
            onClick={() => setShowNewTransactionDialog(true)}
            className="bg-[#294380] hover:bg-[#0D0F36]"
          >
            <Plus className="w-4 h-4 mr-2" />
              Nova Transação
          </Button>
          <Button 
            onClick={() => setShowOpenCashDialog(true)}
            variant="outline" 
            className="text-[#294380] border-[#294380]"
            disabled={cashIsOpen}
          >
            Abrir Caixa
          </Button>
          <Button 
            onClick={() => setShowCloseCashDialog(true)}
            variant="outline" 
            className="text-[#294380] border-[#294380]"
            disabled={!cashIsOpen}
          >
            Fechar Caixa
          </Button>
          <Button 
            onClick={handleOpenReport}
            variant="outline"
            className="text-[#294380] border-[#294380]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Relatório
          </Button>
          <Button 
            onClick={() => setShowHistoricCashDialog(true)}
            variant="outline"
            className="text-[#294380] border-[#294380]"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Caixas Anteriores
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <p className="text-amber-700">{errorMessage}</p>
          </div>
          <Button 
            onClick={() => {
              setErrorMessage("");
              loadTransactionsWithRetry();
            }}
            className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
            size="sm"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
              Tentar novamente
          </Button>
        </div>
      )}

      {!cashIsOpen && !hasPreviousDayOpenCash && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              <p>O caixa ainda não foi aberto hoje. Abra o caixa para começar a registrar transações.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasPreviousDayOpenCash && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-5 h-5" />
              <p>O caixa do dia {previousOpenDate} ainda está aberto. Feche o caixa anterior antes de abrir um novo.</p>
            </div>
            <div className="mt-2 flex justify-end">
              <Button 
                variant="outline" 
                className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                onClick={() => setShowCloseCashDialog(true)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Fechar Caixa Anterior
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Cards de resumo - layout responsivo */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#F1F6CE] to-white">
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-[#0D0F36]">Saldo em Dinheiro</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${expectedCashAmount >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-lg sm:text-2xl font-bold">
                {formatCurrency(expectedCashAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#B9F1D6] to-white">
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-[#0D0F36]">Receitas de Hoje</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <span className="text-lg sm:text-2xl font-bold text-green-600">
                {formatCurrency(dailyReceipts)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#69D2CD]/30 to-white">
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-[#0D0F36]">Despesas de Hoje</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              <span className="text-lg sm:text-2xl font-bold text-red-600">
                {formatCurrency(dailyExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#0D0F36] to-[#294380]">
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm text-white">Saldo do Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <CircleDollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#F1F6CE]" />
              <span className="text-lg sm:text-2xl font-bold text-[#F1F6CE]">
                {formatCurrency(dailyBalance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabela para desktop */}
          <div className="rounded-md border hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTodayTransactions().length > 0 ? (
                  getTodayTransactions().map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(parseISO(normalizeDate(transaction.payment_date || transaction.created_date)), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{transaction.client_name}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatPaymentMethods(transaction)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.status === "pago" ? "success" : "warning"}
                        >
                          {transaction.status === "pago" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      Nenhuma transação registrada hoje
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Cards para mobile */}
          <div className="sm:hidden space-y-4">
            {getTodayTransactions().length > 0 ? (
              getTodayTransactions().map((transaction, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{transaction.description}</span>
                      <span className="text-xs text-gray-500">
                        {format(parseISO(normalizeDate(transaction.payment_date || transaction.created_date)), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block">Cliente</span>
                      <span className="font-medium">{transaction.client_name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Método</span>
                      <span className="font-medium">{formatPaymentMethods(transaction)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Status</span>
                      <Badge 
                        variant={transaction.status === "pago" ? "success" : "warning"}
                        className="mt-1"
                      >
                        {transaction.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Tipo</span>
                      <span className="font-medium">
                        {transaction.type === 'receita' ? 'Entrada' : 'Saída'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma transação registrada hoje
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
        <OpenCashDialog 
          open={showOpenCashDialog} 
          onClose={() => setShowOpenCashDialog(false)} 
          onConfirm={handleOpenCash} 
        />
      </Dialog>

      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseCashDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleCloseCash(userData?.full_name)}>Fechar Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Relatório de Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <div 
                ref={reportRef}
                dangerouslySetInnerHTML={{ __html: reportHtml }} 
              />
            </div>
            
            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={printReport}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoricCashDialog} onOpenChange={setShowHistoricCashDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Caixas Anteriores</DialogTitle>
            <DialogDescription>
              Selecione uma data para visualizar o relatório de caixa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Calendar
                mode="single"
                selected={selectedHistoricDate}
                onSelect={(date) => {
                  if (date && date > new Date()) {
                    toast.error("Não é possível selecionar datas futuras");
                    return;
                  }
                  setSelectedHistoricDate(date || new Date());
                }}
                disabled={(date) => date > new Date()}
                className="rounded-md border w-full"
                locale={ptBR}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowHistoricCashDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => viewHistoricCash(selectedHistoricDate)}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              Visualizar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Caixa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value) => setNewTransaction({...newTransaction, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Entrada</SelectItem>
                  <SelectItem value="despesa">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Removido campo de descrição manual, será preenchido automaticamente com base na categoria */}

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={newTransaction.amount}
                onChange={(e) => {
                  const newAmount = parseFloat(e.target.value);
                  // Atualizar o valor do primeiro método de pagamento também
                  const updatedMethods = newTransaction.payment_methods.map(method => ({
                    ...method,
                    amount: newAmount
                  }));
                  setNewTransaction({
                    ...newTransaction, 
                    amount: newAmount,
                    payment_methods: updatedMethods
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Data da Transação</Label>
              <Input
                type="date"
                value={newTransaction.payment_date}
                onChange={(e) => setNewTransaction({...newTransaction, payment_date: e.target.value})}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(value) => {
                  // Preencher a descrição automaticamente com base na categoria
                  let description = "";
                  if (value === "venda_produto") description = "Venda de Produto";
                  else if (value === "venda_servico") description = "Venda de Serviço";
                  else if (value === "venda_pacote") description = "Venda de Pacote";
                  else if (value === "compra_produto") description = "Compra de Produto";
                  else if (value === "salario") description = "Pagamento de Salário/Comissão";
                  else if (value === "aluguel") description = "Pagamento de Aluguel";
                  else if (value === "utilities") description = "Pagamento de Água/Luz/Internet";
                  else if (value === "marketing") description = "Despesa com Marketing";
                  else description = "Outros";
                  
                  setNewTransaction({...newTransaction, category: value, description: description});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {newTransaction.type === "receita" ? (
                    <>
                      <SelectItem value="venda_produto">Venda de Produto</SelectItem>
                      <SelectItem value="venda_servico">Venda de Serviço</SelectItem>
                      <SelectItem value="venda_pacote">Venda de Pacote</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="compra_produto">Compra de Produto</SelectItem>
                      <SelectItem value="salario">Salário/Comissão</SelectItem>
                      <SelectItem value="aluguel">Aluguel</SelectItem>
                      <SelectItem value="utilities">Água/Luz/Internet</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {(newTransaction.type === "receita" && 
             (newTransaction.category === "venda_servico" || 
              newTransaction.category === "venda_produto" || 
              newTransaction.category === "venda_pacote")) && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="relative">
                  <Input
                    value={selectedClient ? selectedClient.name : clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientSearch(true);
                      if (!selectedClient) {
                        const results = searchClients(e.target.value);
                        setClientSearchResults(results);
                      }
                    }}
                    onClick={() => {
                      if (selectedClient) {
                        setSelectedClient(null);
                        setClientSearchTerm("");
                      } else {
                        setShowClientSearch(true);
                      }
                    }}
                    placeholder="Buscar cliente por nome ou CPF"
                  />
                  {selectedClient && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setSelectedClient(null);
                        setClientSearchTerm("");
                        setNewTransaction({
                          ...newTransaction,
                          client_id: "",
                          client_name: ""
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {showClientSearch && clientSearchTerm && !selectedClient && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                    {clientSearchResults.length > 0 ? (
                      clientSearchResults.map(client => (
                        <div
                          key={client.id}
                          className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearchTerm(client.name);
                            setShowClientSearch(false);
                            setClientSearchResults([]);
                            setNewTransaction({
                              ...newTransaction,
                              client_id: client.id,
                              client_name: client.name
                            });
                          }}
                        >
                          <div className="font-medium">{client.name}</div>
                          {client.cpf && (
                            <div className="text-sm text-gray-500">CPF: {client.cpf}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Formas de Pagamento</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Distribuir o valor total entre os métodos de pagamento existentes
                    const totalAmount = parseFloat(newTransaction.amount) || 0;
                    const methodCount = newTransaction.payment_methods.length;
                    if (methodCount > 0 && totalAmount > 0) {
                      const valuePerMethod = totalAmount / methodCount;
                      const updatedMethods = newTransaction.payment_methods.map(method => ({
                        ...method,
                        amount: valuePerMethod
                      }));
                      setNewTransaction({
                        ...newTransaction,
                        payment_methods: updatedMethods
                      });
                    }
                  }}
                  disabled={!newTransaction.amount || newTransaction.amount <= 0}
                >
                  Distribuir Valores
                </Button>
              </div>
              
              {newTransaction.payment_methods.map((payment, index) => (
                <div key={index} className="space-y-3 p-3 border rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <Select
                      value={payment.method_id}
                      onValueChange={(value) => updatePaymentMethod(index, 'method_id', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {newTransaction.payment_methods.length > 1 && (
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
                        onChange={(e) => updatePaymentMethod(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="flex-1"
                        placeholder="0,00"
                      />
                    </div>
                    
                    {payment.method_id && paymentMethods.find(m => m.id === payment.method_id)?.allowsInstallments && (
                      <div className="flex items-center gap-2">
                        <Label className="w-20">Parcelas:</Label>
                        <Select
                          value={String(payment.installments)}
                          onValueChange={(value) => updatePaymentMethod(index, 'installments', parseInt(value))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                              <SelectItem key={num} value={String(num)}>
                                {num}x
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
                disabled={newTransaction.payment_methods.length >= paymentMethods.length}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Forma de Pagamento
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewTransactionDialog(false);
              setSelectedClient(null);
              setClientSearchTerm("");
              setClientSearchResults([]);
            }}>
              Cancelar
            </Button>
            <Button onClick={() => handleCreateTransaction(newTransaction)} className="bg-[#294380] hover:bg-[#0D0F36]">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}
