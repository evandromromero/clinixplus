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
  Trash2
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
    payment_method: "dinheiro",
    status: "pago",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    client_id: "",
    client_name: ""
  });

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
      console.log("[CashRegister] Todas as transações:", allTransactions);

      // Filtrar transações de abertura não fechadas
      const openCashTransactions = allTransactions.filter(t => 
        t.category === 'abertura_caixa' && 
        !t.closed_at &&
        t.type === 'receita'
      );

      console.log("[CashRegister] Transações de abertura encontradas:", openCashTransactions);

      if (openCashTransactions && openCashTransactions.length > 0) {
        // Ordenar por data de criação (mais recente primeiro)
        const sortedTransactions = openCashTransactions.sort((a, b) => {
          const dateA = new Date(a.created_at || a.created_date);
          const dateB = new Date(b.created_at || b.created_date);
          return dateB - dateA;
        });

        const lastOpenTransaction = sortedTransactions[0];
        console.log("[CashRegister] Última transação de caixa aberta:", lastOpenTransaction);

        // Normalizar as datas para comparação
        const transactionDate = formatDate(lastOpenTransaction.payment_date);
        const today = getCurrentDate();
        
        console.log("[CashRegister] Comparando datas:", {
          transactionDate,
          today,
          isBeforeToday: transactionDate < today,
          rawTransactionDate: lastOpenTransaction.payment_date,
          closed_at: lastOpenTransaction.closed_at
        });

        if (lastOpenTransaction.closed_at) {
          // Se o caixa foi fechado, não mostrar como aberto
          console.log("[CashRegister] Caixa já foi fechado em:", lastOpenTransaction.closed_at);
          setHasPreviousDayOpenCash(false);
          setPreviousOpenDate(null);
          setCashIsOpen(false);
          setDailyBalance(0);
          console.log("[CashRegister] Saldo do dia zerado por caixa fechado");
        } else if (transactionDate < today) {
          // Se a transação for de um dia anterior, mostrar alerta
          console.log("[CashRegister] Caixa aberto em dia anterior");
          setHasPreviousDayOpenCash(true);
          setPreviousOpenDate(transactionDate);
          setCashIsOpen(false);
          setDailyBalance(0);
          console.log("[CashRegister] Saldo do dia zerado por caixa anterior");
        } else {
          // Se for do dia atual, marcar como caixa aberto
          console.log("[CashRegister] Caixa aberto hoje");
          setHasPreviousDayOpenCash(false);
          setPreviousOpenDate(null);
          setCashIsOpen(true);
        }
        
        // Atualizar valor inicial
        const initialValue = parseFloat(lastOpenTransaction.initial_amount || lastOpenTransaction.amount) || 0;
        console.log("[CashRegister] Definindo valor inicial:", initialValue);
        setInitialAmount(initialValue);
        
      } else {
        console.log("[CashRegister] Nenhum caixa aberto encontrado");
        setCashIsOpen(false);
        setHasPreviousDayOpenCash(false);
        setPreviousOpenDate(null);
        setInitialAmount(0);
        setDailyBalance(0);
        console.log("[CashRegister] Saldo do dia zerado por não ter caixa aberto");
      }

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
        // Encontrar o método de pagamento e cliente relacionados
        const paymentMethod = paymentMethodsMap[t.payment_method];
        const client = clientsMap[t.client_id];
        
        return {
          ...t,
          payment_method_name: paymentMethod ? paymentMethod.name : 'Método não identificado',
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

  const loadClients = async () => {
    try {
      console.log("[CashRegister] Carregando clientes do Firebase...");
      const clientsData = await Client.list();
      console.log(`[CashRegister] ${clientsData.length} clientes carregados do Firebase`);
      setClients(clientsData);
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar clientes:", error);
      
      if (clients.length === 0) {
        console.log("[CashRegister] Usando dados simulados de clientes");
        const simData = generateSimulatedData();
        setClients(simData.clients);
      }
    }
  };

  const loadAuthorizedEmployees = async () => {
    try {
      console.log("[CashRegister] Carregando funcionários do Firebase...");
      const employees = await Employee.list();
      const authorized = employees.filter(emp => emp.can_manage_cash === true && emp.active === true);
      
      console.log(`[CashRegister] ${authorized.length} funcionários autorizados carregados do Firebase`);
      setAuthorizedEmployees(authorized);
    } catch (error) {
      console.error("[CashRegister] Erro ao carregar funcionários:", error);
      
      if (authorizedEmployees.length === 0) {
        console.log("[CashRegister] Usando dados simulados de funcionários");
        const simData = generateSimulatedData();
        setAuthorizedEmployees(simData.employees);
      }
    }
  };

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const cachedEmployees = localStorage.getItem('authorizedEmployees');
        if (cachedEmployees) {
          try {
            const employeesData = JSON.parse(cachedEmployees);
            if (Array.isArray(employeesData) && employeesData.length > 0) {
              setAuthorizedEmployees(employeesData);
              return;
            }
          } catch (e) {
            console.warn("Erro ao usar dados de funcionários em cache:", e);
          }
        }
        
        const employees = await Employee.list();
        const authorized = employees.filter(emp => emp.can_manage_cash === true && emp.active === true);
        setAuthorizedEmployees(authorized);
        localStorage.setItem('authorizedEmployees', JSON.stringify(authorized));
      } catch (error) {
        console.error("Erro ao carregar funcionários autorizados:", error);
      }
    };
    
    loadEmployees();
  }, []);

  const getTodayTransactions = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    console.log("[CashRegister] Filtrando transações para:", today);
    
    return transactions.filter(t => {
      // Tentar pegar a data de várias propriedades possíveis
      let transactionDate = null;
      
      if (t.payment_date) {
        transactionDate = format(new Date(t.payment_date), "yyyy-MM-dd");
      } else if (t.created_date) {
        transactionDate = format(new Date(t.created_date), "yyyy-MM-dd");
      } else if (t.date) {
        transactionDate = format(new Date(t.date), "yyyy-MM-dd");
      }
      
      console.log("[CashRegister] Transação:", {
        id: t.id,
        payment_date: t.payment_date,
        created_date: t.created_date,
        date: t.date,
        normalized_date: transactionDate,
        today: today,
        matches: transactionDate === today
      });

      return transactionDate === today && 
             t.category !== "abertura_caixa" && 
             t.category !== "fechamento_caixa";
    });
  };

  const getTransactionsByDate = (date) => {
    return transactions.filter(t => 
      t.payment_date === date &&
      t.category !== "abertura_caixa" &&
      t.category !== "fechamento_caixa"
    );
  };

  const getIncomeByDate = (date) => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (date === today) {
      return dailyReceipts;
    }
    return getTransactionsByDate(date)
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  };

  const getExpensesByDate = (date) => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (date === today) {
      return dailyExpenses;
    }
    return getTransactionsByDate(date)
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  };

  const getPaymentMethodTotal = (method, type, date = format(new Date(), "yyyy-MM-dd")) => {
    return getTransactionsByDate(date)
      .filter(t => t.payment_method === method && t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
  const getCategoryTotal = (category, type, date = format(new Date(), "yyyy-MM-dd")) => {
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
    const [employeeId, setEmployeeId] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [initialAmount, setInitialAmount] = useState("0");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    
    // Resetar o estado do diálogo quando ele for fechado
    useEffect(() => {
      if (!open) {
        setEmployeeId("");
        setEmployeeName("");
        setInitialAmount("0");
        setNotes("");
        setLoading(false);
        setSelectedDate(new Date());
        setShowCalendar(false);
      }
    }, [open]);
    
    const handleSubmit = async () => {
      try {
        setLoading(true);
        const numericValue = parseFloat(initialAmount.replace(',', '.'));
        
        if (isNaN(numericValue)) {
          toast.error("Por favor, insira um valor válido.");
          setLoading(false);
          return;
        }

        if (!employeeId) {
          toast.error("Por favor, selecione um funcionário.");
          setLoading(false);
          return;
        }
        
        // Fechar o diálogo antes de prosseguir
        onClose();
        
        // Chamar a função de confirmação com a data selecionada
        await onConfirm(employeeName, numericValue, notes, format(selectedDate, "yyyy-MM-dd"));
      } catch (error) {
        console.error("[OpenCashDialog] Erro ao abrir caixa:", error);
        toast.error("Erro ao abrir o caixa");
        setLoading(false);
      }
    };
    
    if (!open) return null;
    
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              Selecione um funcionário responsável, a data e informe o valor inicial em dinheiro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Funcionário Responsável</Label>
              <Select 
                value={employeeId} 
                onValueChange={(value) => {
                  setEmployeeId(value);
                  const emp = authorizedEmployees.find(e => e.id === value);
                  setEmployeeName(emp ? emp.name : '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {authorizedEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cashDate">Data do Caixa</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
                {showCalendar && (
                  <div className="absolute top-full left-0 z-50 mt-2 bg-white rounded-md shadow-md p-2 border">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date || new Date());
                        setShowCalendar(false);
                      }}
                      className="rounded-md border"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initialAmount">Valor Inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">R$</span>
                <Input
                  id="initialAmount"
                  className="pl-10"
                  value={initialAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '');
                    setInitialAmount(value);
                  }}
                  placeholder="0,00"
                  type="text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a abertura do caixa..."
              />
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!employeeId || loading}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              {loading ? "Processando..." : "Abrir Caixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const handleOpenCash = async (employeeName, initialAmount, notes = "", cashDate = format(new Date(), "yyyy-MM-dd")) => {
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
      if (t.type === 'receita' && t.payment_method && totals[t.payment_method] !== undefined) {
        totals[t.payment_method] += Number(t.amount);
      }
    });

    return totals;
  };

  const generateReportHtml = (cashData, transactions) => {
    if (!cashData || !transactions) return '';
    
    const paymentTotals = getPaymentMethodTotals(transactions);
    const totalReceitas = transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0);
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return format(parseISO(dateStr), "dd/MM/yyyy");
      } catch (e) {
        return '-';
      }
    };

    const formatTime = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return format(parseISO(dateStr), "HH:mm");
      } catch (e) {
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
          <h3 style="margin-bottom: 10px;">DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${totalReceitas.toFixed(2)}</h3>
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${getPaymentMethodName(t.payment_method)}</td>
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
        return format(parseISO(dateStr), "dd/MM/yyyy");
      } catch (e) {
        return '-';
      }
    };

    const formatTime = (dateStr) => {
      if (!dateStr) return '-';
      try {
        return format(parseISO(dateStr), "HH:mm");
      } catch (e) {
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${getPaymentMethodName(t.payment_method)}</td>
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
      filename: `caixa_${format(new Date(), 'dd-MM-yyyy')}.pdf`,
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

  const viewHistoricCash = (date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setShowHistoricCashDialog(false);
    handleOpenReport();
  };

  const getCashRegisterByDate = (date) => {
    const opening = cashRegisters.find(r => 
      r.category === "abertura_caixa" && 
      r.payment_date === date
    );
    const closing = cashRegisters.find(r => 
      r.category === "fechamento_caixa" && 
      r.payment_date === date
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
      const today = format(new Date(), "yyyy-MM-dd");
      
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
        const openingDate = lastOpeningTransaction.payment_date ? lastOpeningTransaction.payment_date.split('T')[0] : format(new Date(), "yyyy-MM-dd");
        
        // Filtrar transações após a abertura do caixa
        const transactionsAfterOpening = activeTransactions.filter(t => {
          const transactionDate = t.payment_date ? t.payment_date.split('T')[0] : null;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-[#0D0F36]">
          Caixa
          <span className="text-base font-normal text-gray-500 ml-2">Controle de entradas e saídas do caixa</span>
        </h2>
        <div className="flex gap-2">
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
      
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#F1F6CE] to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0D0F36]">Saldo em Dinheiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-5 w-5 ${expectedCashAmount >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-2xl font-bold">
                {formatCurrency(expectedCashAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#B9F1D6] to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0D0F36]">Receitas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(dailyReceipts)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#69D2CD]/30 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0D0F36]">Despesas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(dailyExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#0D0F36] to-[#294380]">
          <CardHeader>
            <CardTitle className="text-sm text-white">Saldo do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-[#F1F6CE]" />
              <span className="text-2xl font-bold text-[#F1F6CE]">
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Data/Hora</TableCell>
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
                        {format(new Date(transaction.payment_date || transaction.created_date), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{transaction.client_name}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.payment_method_name}</TableCell>
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
                onSelect={(date) => setSelectedHistoricDate(date || new Date())}
                className="rounded-md border w-full"
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Caixa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                placeholder="Descreva a movimentação"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={newTransaction.payment_method}
                onValueChange={(value) => setNewTransaction({...newTransaction, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(value) => setNewTransaction({...newTransaction, category: value})}
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
                <Input
                  value={newTransaction.client_name || ""}
                  onChange={(e) => setNewTransaction({
                    ...newTransaction, 
                    client_name: e.target.value
                  })}
                  placeholder="Nome do cliente"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTransactionDialog(false)}>
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
