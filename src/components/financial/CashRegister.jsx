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
  RefreshCw,
  X,
  Plus,
  FileText,
  CalendarIcon,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  AlertTriangle,
  Trash2,
  Lock,
  Unlock,
  Download,
  CreditCard,
  Landmark,
  Check,
  XCircle
} from "lucide-react";
import { FinancialTransaction, User, Client, Employee, Package, ClientPackage } from "@/firebase/entities";
import { InvokeLLM } from "@/api/integrations";
import { toast } from "@/components/ui/toast";
import RateLimitHandler from '@/components/RateLimitHandler';

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

  const [initialAmount, setInitialAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [closingNotes, setClosingNotes] = useState("");
  const [user, setUser] = useState(null);

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

  useEffect(() => {
    const loadInitialData = async () => {
      console.log("[CashRegister] Iniciando carregamento de dados...");
      
      try {
        await loadUserData();
        await loadClients();
        await loadAuthorizedEmployees();
        
        // Primeiro carregar os registros de caixa
        await loadCashRegistersWithRetry();
        
        // Depois carregar as transações e verificar o status
        await loadTransactionsWithRetry();
        await checkCashStatus();
        
        console.log("[CashRegister] Carregamento inicial concluído");
      } catch (error) {
        console.error("[CashRegister] Erro no carregamento inicial:", error);
      }
    };
    
    loadInitialData();
    
    // Atualizar a cada 30 segundos
    const updateInterval = setInterval(async () => {
      try {
        await loadTransactionsWithRetry();
        await checkCashStatus();
      } catch (error) {
        console.error("[CashRegister] Erro na atualização automática:", error);
      }
    }, 30000);
    
    return () => clearInterval(updateInterval);
  }, []);

  // Monitorar mudanças no status do caixa e nos valores
  useEffect(() => {
    if (cashIsOpen) {
      console.log("[CashRegister] Status do caixa alterado:", "Aberto");
      console.log("[CashRegister] Valor inicial:", initialAmount);
      console.log("[CashRegister] Saldo do dia:", dailyBalance);
      
      // Forçar atualização dos dados quando o status mudar
      loadTransactionsWithRetry();
    }
  }, [cashIsOpen]);

  // Monitorar mudanças nos valores
  useEffect(() => {
    console.log("[CashRegister] Valores atualizados:");
    console.log("- Valor inicial:", initialAmount);
    console.log("- Receitas:", dailyReceipts);
    console.log("- Despesas:", dailyExpenses);
    console.log("- Saldo:", dailyBalance);
    console.log("- Saldo em dinheiro:", expectedCashAmount);
  }, [initialAmount, dailyReceipts, dailyExpenses, dailyBalance, expectedCashAmount]);

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
          r => r.category === "abertura_caixa" && r.payment_date.split('T')[0] === today
        );
        const todayClose = data.find(
          r => r.category === "fechamento_caixa" && r.payment_date.split('T')[0] === today
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
      
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Buscar todas as transações do dia primeiro
      const todayTransactions = await FinancialTransaction.filter({
        payment_date: today
      }, true);
      
      if (todayTransactions && Array.isArray(todayTransactions)) {
        console.log(`[CashRegister] ${todayTransactions.length} transações encontradas para hoje`);
        
        // Filtrar manualmente as transações de abertura e fechamento
        const openingTransaction = todayTransactions.find(
          t => t.category === "abertura_caixa" && t.payment_date.split('T')[0] === today
        );
        
        const closingTransaction = todayTransactions.find(
          t => t.category === "fechamento_caixa" && t.payment_date.split('T')[0] === today
        );
        
        console.log("[CashRegister] Transação de abertura:", openingTransaction);
        console.log("[CashRegister] Transação de fechamento:", closingTransaction);
        
        const isOpen = !!openingTransaction && !closingTransaction;
        console.log(`[CashRegister] Status do caixa: ${isOpen ? 'Aberto' : 'Fechado'}`);
        
        if (openingTransaction) {
          const initialAmount = parseFloat(openingTransaction.amount) || 0;
          console.log(`[CashRegister] Valor inicial do caixa: R$ ${initialAmount.toFixed(2)}`);
          
          setInitialAmount(initialAmount);
          setDailyBalance(initialAmount);
          setExpectedCashAmount(initialAmount);
          
          // Atualizar estado para refletir que o caixa está aberto
          setCashIsOpen(true);
        } else {
          console.log(`[CashRegister] Nenhuma transação de abertura encontrada para hoje`);
          setCashIsOpen(false);
          setInitialAmount(0);
          setDailyBalance(0);
          setExpectedCashAmount(0);
        }
      }
    } catch (error) {
      console.error("[CashRegister] Erro ao verificar status do caixa:", error);
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
        processTransactions(todayTransactions);
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
  const loadTransactions = loadTransactionsWithRetry;

  const processTransactions = async (transactions) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      console.log("[CashRegister] Processando transações para:", today);

      // Filtrar transações ativas
      const activeTransactions = transactions.filter(t => !t.is_deleted);
      console.log("[CashRegister] Total de transações:", transactions.length, "Ativas:", activeTransactions.length);

      // Filtrar transações de hoje
      const todayTransactions = activeTransactions.filter(transaction => {
        const transactionDate = transaction.payment_date.split('T')[0];
        return transactionDate === today;
      });

      console.log("[CashRegister] Transações de hoje:", todayTransactions.length);

      // Encontrar transação de abertura
      const openingTransaction = todayTransactions.find(t => t.category === "abertura_caixa");
      console.log("[CashRegister] Transação de abertura:", openingTransaction);

      if (openingTransaction) {
        // Valor inicial do caixa
        const initialAmount = parseFloat(openingTransaction.amount) || 0;
        console.log("[CashRegister] Valor inicial do caixa: R$", initialAmount.toFixed(2));

        // Calcular receitas e despesas
        let totalReceipts = 0;
        let totalExpenses = 0;
        let cashReceipts = 0;
        let cashExpenses = 0;

        todayTransactions.forEach(transaction => {
          if (transaction.category !== "abertura_caixa" && transaction.category !== "fechamento_caixa") {
            const amount = parseFloat(transaction.amount) || 0;
            console.log(`[CashRegister] Processando transação: ${transaction.id} - ${transaction.type} - R$ ${amount.toFixed(2)}`);
            
            if (transaction.type === "receita") {
              totalReceipts += amount;
              if (transaction.payment_method === "dinheiro") {
                cashReceipts += amount;
              }
            } else if (transaction.type === "despesa") {
              totalExpenses += amount;
              if (transaction.payment_method === "dinheiro") {
                cashExpenses += amount;
              }
            }
          }
        });

        // Calcular saldos
        const dailyBalance = initialAmount + totalReceipts - totalExpenses;
        const cashBalance = initialAmount + cashReceipts - cashExpenses;

        console.log("[CashRegister] === Resumo Financeiro ===");
        console.log("- Valor inicial:", initialAmount.toFixed(2));
        console.log("- Receitas totais:", totalReceipts.toFixed(2));
        console.log("- Despesas totais:", totalExpenses.toFixed(2));
        console.log("- Saldo do dia:", dailyBalance.toFixed(2));
        console.log("- Receitas em dinheiro:", cashReceipts.toFixed(2));
        console.log("- Despesas em dinheiro:", cashExpenses.toFixed(2));
        console.log("- Saldo em dinheiro:", cashBalance.toFixed(2));

        // Verificar status do caixa
        const closingTransaction = todayTransactions.find(t => t.category === "fechamento_caixa");
        const isOpen = !closingTransaction;

        // Atualizar estados em lote para evitar re-renders
        setInitialAmount(initialAmount);
        setDailyReceipts(totalReceipts);
        setDailyExpenses(totalExpenses);
        setDailyBalance(dailyBalance);
        setExpectedCashAmount(cashBalance);
        setCashIsOpen(isOpen);

        console.log("[CashRegister] Estados atualizados com sucesso");
      } else {
        console.log("[CashRegister] Nenhuma transação de abertura encontrada para hoje");
        setCashIsOpen(false);
      }
    } catch (error) {
      console.error("[CashRegister] Erro ao processar transações:", error);
      setErrorMessage("Erro ao processar transações. Por favor, tente novamente.");
    }
  };

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
          status: "pago",
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

  const handleOpenCash = async (employeeName, initialAmountValue) => {
    try {
      setIsLoading(true);
      
      const initialAmountNumber = parseFloat(initialAmountValue);
      
      if (isNaN(initialAmountNumber)) {
        alert("Valor inicial inválido. Por favor, tente novamente.");
        setIsLoading(false);
        return;
      }
      
      console.log("[CashRegister] Abrindo caixa com valor:", initialAmountNumber);
      
      const today = format(new Date(), "yyyy-MM-dd");
      const existingOpening = await FinancialTransaction.filter({
        category: "abertura_caixa",
        payment_date: today
      }, true);
      
      if (existingOpening && existingOpening.length > 0) {
        console.log("[CashRegister] Caixa já aberto hoje:", existingOpening[0]);
        alert("O caixa já foi aberto hoje. Não é possível abrir novamente.");
        setShowOpenCashDialog(false);
        setCashIsOpen(true);
        setIsLoading(false);
        return;
      }

      // Fechar o diálogo antes de prosseguir
      setShowOpenCashDialog(false);

      const openingTransaction = {
        type: "receita",
        category: "abertura_caixa",
        description: "Abertura de Caixa",
        amount: initialAmountNumber,
        payment_method: "dinheiro",
        status: "pago",
        payment_date: today,
        due_date: today,
        initial_amount: initialAmountNumber,
        opened_by: employeeName,
        notes: `Abertura de caixa - Responsável: ${employeeName} - Valor inicial: R$ ${initialAmountNumber.toFixed(2)}`
      };

      console.log("[CashRegister] Criando transação de abertura:", openingTransaction);
      const result = await FinancialTransaction.create(openingTransaction);
      console.log("[CashRegister] Transação de abertura criada:", result);
      
      // Atualizar o estado do componente
      setInitialAmount(initialAmountNumber);
      setCashIsOpen(true);
      setDailyReceipts(0);
      setDailyExpenses(0);
      setDailyBalance(initialAmountNumber);
      setExpectedCashAmount(initialAmountNumber);
      
      // Mostrar mensagem de sucesso
      alert("Caixa aberto com sucesso!");
      
      // Forçar atualização imediata dos dados
      await Promise.all([
        loadTransactionsWithRetry(),
        checkCashStatus()
      ]);
      
    } catch (error) {
      console.error("[CashRegister] Erro ao abrir o caixa:", error);
      alert("Erro ao abrir o caixa. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseCash = async (employeeName) => {
    try {
      if (!cashIsOpen) {
        alert("O caixa não está aberto. Não é possível fechá-lo.");
        setShowCloseCashDialog(false);
        return;
      }
      
      const today = format(new Date(), "yyyy-MM-dd");
      const existingClosing = cashRegisters.find(r => 
        r.category === "fechamento_caixa" && 
        r.payment_date === today
      );
      
      if (existingClosing) {
        alert("O caixa já foi fechado hoje. Não é possível fechar novamente.");
        setShowCloseCashDialog(false);
        setCashIsOpen(false);
        return;
      }
      
      const closingTransaction = {
        type: "despesa",
        category: "fechamento_caixa",
        description: "Fechamento de Caixa",
        amount: finalAmount,
        payment_method: "dinheiro",
        status: "pago",
        payment_date: today,
        due_date: today,
        notes: closingNotes,
        actual_cash: finalAmount,
        expected_cash: closeCashData.expected_cash,
        difference: finalAmount - closeCashData.expected_cash,
        closed_by: employeeName
      };

      await FinancialTransaction.create(closingTransaction);
      
      await loadTransactions();
      await loadCashRegisters();
      await checkCashStatus();
      
      setShowCloseCashDialog(false);
      setFinalAmount(0);
      setClosingNotes("");
      setCashIsOpen(false);
      
      alert("Caixa fechado com sucesso!");
    } catch (error) {
      console.error("Error closing cash:", error);
      alert("Erro ao fechar o caixa. Tente novamente.");
    }
  };

  const handleCreateTransaction = async (transactionData) => {
    try {
      if (!cashIsOpen) {
        setErrorMessage("O caixa precisa estar aberto para registrar transações.");
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");
      
      const transaction = {
        type: transactionData.type,
        category: transactionData.category,
        description: transactionData.description,
        amount: parseFloat(transactionData.amount),
        payment_method: transactionData.payment_method,
        status: "pago",
        payment_date: today,
        due_date: today,
        notes: transactionData.notes || "",
        client_id: transactionData.client_id || null,
        client_name: clients.find(c => c.id === transactionData.client_id)?.name || ""
      };

      await FinancialTransaction.create(transaction);
      
      loadTransactions();
      
      setShowNewTransactionDialog(false);
      setNewTransaction({
        type: "receita",
        category: "outros",
        description: "",
        amount: "",
        payment_method: "dinheiro",
        notes: "",
        client_id: ""
      });
      
      toast.success("Transação registrada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      setErrorMessage("Erro ao registrar a transação. Tente novamente.");
    }
  };

  const getTodayTransactions = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return transactions.filter(t => {
      const transactionDate = t.payment_date ? format(new Date(t.payment_date), "yyyy-MM-dd") : null;
      return transactionDate === today && 
             t.category !== "abertura_caixa" && 
             t.category !== "fechamento_caixa";
    });
  };

  const getClientName = (clientId) => {
    if (!clientId) return "-";
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : `ID: ${clientId}`;
  };

  const getCashBalance = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayOpening = transactions.find(t => 
      t.category === "abertura_caixa" && 
      t.payment_date === today
    ) || cashRegisters.find(r => 
      r.category === "abertura_caixa" && 
      r.payment_date === today
    );
    
    const initialAmount = todayOpening ? 
      (parseFloat(todayOpening.initial_amount) || parseFloat(todayOpening.amount) || 0) : 0;
    
    const cashTransactions = transactions.filter(t => 
      t.payment_date === today && 
      t.payment_method === "dinheiro" &&
      t.category !== "abertura_caixa" &&
      t.category !== "fechamento_caixa"
    );
    
    const cashMovement = cashTransactions.reduce((total, t) => {
      return total + (t.type === "receita" ? t.amount : -t.amount);
    }, 0);
    
    console.log("Saldo em dinheiro:", initialAmount, "+", cashMovement, "=", initialAmount + cashMovement);
    
    return initialAmount + cashMovement;
  };

  const getTransactionsByDate = (date) => {
    return transactions.filter(t => 
      t.payment_date === date &&
      t.category !== "abertura_caixa" &&
      t.category !== "fechamento_caixa"
    );
  };

  const getIncomeByDate = (date) => {
    return getTransactionsByDate(date)
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getExpensesByDate = (date) => {
    return getTransactionsByDate(date)
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + t.amount, 0);
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

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const reportDate = format(new Date(selectedDate), "dd/MM/yyyy");
      const dateTransactions = getTransactionsByDate(selectedDate);
      const { opening, closing } = getCashRegisterByDate(selectedDate);
      
      const cashIncome = getPaymentMethodTotal("dinheiro", "receita", selectedDate);
      const debitCardIncome = getPaymentMethodTotal("cartao_debito", "receita", selectedDate);
      const creditCardIncome = getPaymentMethodTotal("cartao_credito", "receita", selectedDate);
      const pixIncome = getPaymentMethodTotal("pix", "receita", selectedDate);
      
      const productSales = getCategoryTotal("venda_produto", "receita", selectedDate);
      const serviceSales = getCategoryTotal("venda_servico", "receita", selectedDate);
      const packageSales = getCategoryTotal("venda_pacote", "receita", selectedDate);
      
      const suppliesExpenses = getCategoryTotal("compra_produto", "despesa", selectedDate);
      const salaryExpenses = getCategoryTotal("salario", "despesa", selectedDate);
      const commissionExpenses = getCategoryTotal("comissao", "despesa", selectedDate);
      const otherExpenses = getExpensesByDate(selectedDate) - suppliesExpenses - salaryExpenses - commissionExpenses;
      
      const transactionsDetails = dateTransactions.map(t => ({
        description: t.description,
        category: t.category.replace(/_/g, ' '),
        type: t.type,
        amount: t.amount,
        payment_method: t.payment_method === "dinheiro" ? "Dinheiro" :
                        t.payment_method === "cartao_debito" ? "Cartão de Débito" :
                        t.payment_method === "cartao_credito" ? "Cartão de Crédito" :
                        t.payment_method === "pix" ? "PIX" : 
                        t.payment_method === "transferencia" ? "Transferência" : t.payment_method,
        client_name: t.client_name || getClientName(t.client_id) || "N/A",
        time: t.created_date ? format(new Date(t.created_date), "HH:mm") : "N/A"
      }));
      
      const reportPrompt = `
      Crie um relatório detalhado de caixa em formato HTML para uma clínica de estética usando os dados abaixo.
      Siga o layout da imagem de exemplo, com cabeçalho mostrando nome da clínica, 
      detalhamento de abertura/fechamento, totais por método de pagamento 
      e uma lista detalhada de todas as transações com cliente e método de pagamento.
      
      O formato deve ser tabular, com cores de fundo para os cabeçalhos e com boas práticas de design.
      
      DADOS DO RELATÓRIO:
      
      Data: ${reportDate}
      Operador: ${user?.full_name || "Não identificado"}
      
      ${opening ? `
      ABERTURA DE CAIXA:
      - Data/Hora: ${format(new Date(opening.created_date), "dd/MM/yyyy HH:mm")}
      - Responsável: ${opening.opened_by || "Não informado"}
      - Valor inicial: R$ ${opening.initial_amount?.toFixed(2) || "0.00"}
      - Observações: ${opening.notes || "Nenhuma"}
      ` : "O caixa desta data não foi aberto."}
      
      ${closing ? `
      FECHAMENTO DE CAIXA:
      - Data/Hora: ${format(new Date(closing.created_date), "dd/MM/yyyy HH:mm")}
      - Responsável: ${closing.closed_by || "Não informado"}
      - Dinheiro Esperado: R$ ${closing.expected_cash?.toFixed(2) || "0.00"}
      - Dinheiro Real: R$ ${closing.actual_cash?.toFixed(2) || "0.00"}
      - Diferença: R$ ${closing.difference?.toFixed(2) || "0.00"}
      - Observações: ${closing.notes || "Nenhuma"}
      ` : "O caixa desta data não foi fechado."}
      
      DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${getIncomeByDate(selectedDate).toFixed(2)}
      
      TOTAIS POR MÉTODO DE PAGAMENTO:
      - PIX: R$ ${pixIncome.toFixed(2)}
      - Dinheiro: R$ ${cashIncome.toFixed(2)}
      - Cartão de Débito: R$ ${debitCardIncome.toFixed(2)}
      - Cartão de Crédito: R$ ${creditCardIncome.toFixed(2)}
      
      TOTAIS POR CATEGORIA:
      - Vendas de Produtos: R$ ${productSales.toFixed(2)}
      - Vendas de Serviços: R$ ${serviceSales.toFixed(2)}
      - Vendas de Pacotes: R$ ${packageSales.toFixed(2)}
      
      DETALHAMENTO DE ENTRADAS:
      ${JSON.stringify(transactionsDetails.filter(t => t.type === "receita"))}
      
      DETALHAMENTO DE SAÍDAS / TOTAL: R$ ${getExpensesByDate(selectedDate).toFixed(2)}
      
      TOTAIS DE DESPESAS:
      - Compra de Produtos: R$ ${suppliesExpenses.toFixed(2)}
      - Salários: R$ ${salaryExpenses.toFixed(2)}
      - Comissões: R$ ${commissionExpenses.toFixed(2)}
      - Outras Despesas: R$ ${otherExpenses.toFixed(2)}
      
      DETALHAMENTO DE SAÍDAS:
      ${JSON.stringify(transactionsDetails.filter(t => t.type === "despesa"))}
      
      Apresente os detalhamentos de entradas e saídas em tabelas diferentes e bem formatadas.
      A tabela de entradas deve ter as colunas: Descrição, Referência (categoria), Valor, Data, Hora, Cliente, Forma de Pagamento.
      A tabela de saídas deve ter as colunas: Descrição, Referência (categoria), Valor, Data, Hora, Pessoa, Forma Pgto.
      
      O relatório deve ter cores suaves, tons de verde para receitas e tons de vermelho para despesas.
      No cabeçalho, inclua o nome "Estética CRM", logo depois o título "DETALHAMENTO CAIXA", 
      com data do relatório, operador responsável.
      
      No final do relatório, adicione um espaço para assinatura e os dados da clínica (telefone e endereço).
      Use CSS para fazer tabelas com bordas, cabeçalhos em cinza, alternância de cores nas linhas para facilitar a leitura.
      Formate os valores monetários sempre com R$ e duas casas decimais.
      `;
      
      const reportResponse = await InvokeLLM({
        prompt: reportPrompt,
        response_json_schema: null
      });
      
      setReportHtml(reportResponse);
      setShowReportDialog(true);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  const downloadReport = () => {
    const element = document.createElement('a');
    const file = new Blob([reportHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `relatorio_caixa_${selectedDate}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const viewHistoricCash = (date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setShowHistoricCashDialog(false);
    generateReport();
  };

  const calculateTotalSessions = (services) => {
    if (!services || !Array.isArray(services)) {
      return 0;
    }
    
    return services.reduce((total, service) => {
      return total + (service.quantity || 0);
    }, 0);
  };

  const handlePackageSale = async (data) => {
    try {
      const packageInfo = await Package.filter({ id: data.package_id });
      
      if (!packageInfo || packageInfo.length === 0) {
        alert("Pacote não encontrado");
        return;
      }
      
      const packageSnapshot = {
        original_id: packageInfo[0].id,
        name: packageInfo[0].name,
        services: packageInfo[0].services,
        total_price: packageInfo[0].total_price,
        discount: packageInfo[0].discount,
        validity_days: packageInfo[0].validity_days,
        description: packageInfo[0].description,
        snapshot_date: new Date().toISOString()
      };
      
      const purchaseDate = new Date(data.date);
      const expirationDate = addDays(purchaseDate, packageInfo[0].validity_days);
      
      const clientPackageData = {
        client_id: data.client_id,
        package_id: data.package_id,
        purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
        expiration_date: format(expirationDate, 'yyyy-MM-dd'),
        total_sessions: calculateTotalSessions(packageInfo[0].services),
        sessions_used: 0,
        status: 'ativo',
        session_history: [],
        package_snapshot: packageSnapshot
      };
      
      const createdClientPackage = await ClientPackage.create(clientPackageData);
      
    } catch (error) {
      console.error("Erro ao processar venda de pacote:", error);
      alert("Erro ao processar venda. Tente novamente.");
    }
  };

  const OpenCashDialog = ({ open, onClose, onConfirm }) => {
    const [employeeId, setEmployeeId] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [initialAmount, setInitialAmount] = useState("0");
    const [loading, setLoading] = useState(false);
    const [dialogAuthorizedEmployees, setDialogAuthorizedEmployees] = useState([]);
    
    // Resetar o estado do diálogo quando ele for fechado
    useEffect(() => {
      if (!open) {
        setEmployeeId("");
        setEmployeeName("");
        setInitialAmount("0");
        setLoading(false);
      }
    }, [open]);
    
    useEffect(() => {
      const loadEmployees = async () => {
        try {
          if (authorizedEmployees && authorizedEmployees.length > 0) {
            setDialogAuthorizedEmployees(authorizedEmployees);
            return;
          }
          
          const cachedEmployees = localStorage.getItem('authorizedEmployees');
          if (cachedEmployees) {
            try {
              const employeesData = JSON.parse(cachedEmployees);
              if (Array.isArray(employeesData) && employeesData.length > 0) {
                setDialogAuthorizedEmployees(employeesData);
                return;
              }
            } catch (e) {
              console.warn("Erro ao usar dados de funcionários em cache:", e);
            }
          }
          
          const employees = await Employee.list();
          const authorized = employees.filter(emp => emp.can_manage_cash === true && emp.active === true);
          setDialogAuthorizedEmployees(authorized);
          localStorage.setItem('authorizedEmployees', JSON.stringify(authorized));
        } catch (error) {
          console.error("Erro ao carregar funcionários autorizados:", error);
        }
      };
      
      if (open) {
        loadEmployees();
      }
    }, [open]);
    
    const handleSubmit = async () => {
      try {
        setLoading(true);
        const numericValue = parseFloat(initialAmount.replace(',', '.'));
        
        if (isNaN(numericValue)) {
          alert("Por favor, insira um valor válido.");
          setLoading(false);
          return;
        }
        
        // Fechar o diálogo antes de prosseguir para evitar piscadas
        onClose();
        
        // Chamar a função de confirmação
        await onConfirm(employeeName, numericValue);
      } catch (error) {
        console.error("[OpenCashDialog] Erro ao abrir caixa:", error);
        setLoading(false);
      }
    };
    
    // Se o diálogo não estiver aberto, não renderizar nada
    if (!open) return null;
    
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>
              Selecione um funcionário responsável e informe o valor inicial em dinheiro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Funcionário Responsável</Label>
              <Select 
                value={employeeId} 
                onValueChange={(value) => {
                  setEmployeeId(value);
                  const emp = dialogAuthorizedEmployees.find(e => e.id === value);
                  setEmployeeName(emp ? emp.name : '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {dialogAuthorizedEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  
  const formatCurrency = (value) => {
    if (typeof value !== 'number') {
      value = parseFloat(value) || 0;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleRetry = async () => {
    setErrorMessage(null);
    await loadTransactionsWithRetry();
  };

  const clearCache = () => {
    console.log("[CashRegister] Limpando cache local...");
    localStorage.removeItem('cashRegisterData');
    localStorage.removeItem('lastUpdate');
    loadTransactionsWithRetry();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0D0F36]">Caixa</h2>
          <h3 className="text-sm text-gray-500">Controle de entradas e saídas do caixa</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowNewTransactionDialog(true)}
            disabled={!cashIsOpen || isLoading}
            className="bg-[#294380] hover:bg-[#0D0F36]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>

          {!cashIsOpen && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowOpenCashDialog(true)}
              disabled={isLoading}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Caixa
            </Button>
          )}

          {cashIsOpen && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCloseCashDialog(true)}
              disabled={isLoading}
            >
              <Lock className="h-4 w-4 mr-2" />
              Fechar Caixa
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar dados</span>
          </div>
          <p className="text-red-600 mb-2">{errorMessage}</p>
          <Button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Saldo em Dinheiro</div>
            <div className="text-2xl font-bold text-green-600">
              <DollarSign className="h-5 w-5 inline-block mr-1" />
              {formatCurrency(expectedCashAmount)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Receitas de Hoje</div>
            <div className="text-2xl font-bold text-green-600">
              <ArrowUpRight className="h-5 w-5 inline-block mr-1" />
              {formatCurrency(dailyReceipts)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">Despesas de Hoje</div>
            <div className="text-2xl font-bold text-red-600">
              <ArrowDownRight className="h-5 w-5 inline-block mr-1" />
              {formatCurrency(dailyExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-100">Saldo do Dia</div>
            <div className="text-2xl font-bold text-white">
              <CircleDollarSign className="h-5 w-5 inline-block mr-1" />
              {formatCurrency(dailyBalance)}
            </div>
          </CardContent>
        </Card>
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
            <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
          </Button>
        </div>
      )}

      {!cashIsOpen && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              <p>O caixa ainda não foi aberto hoje. Abra o caixa para começar a registrar transações.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transações de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTodayTransactions().length > 0 ? (
                  getTodayTransactions().map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>
                        {transaction.category.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        {transaction.payment_method === "dinheiro" && "Dinheiro"}
                        {transaction.payment_method === "cartao_debito" && "Cartão de Débito"}
                        {transaction.payment_method === "cartao_credito" && "Cartão de Crédito"}
                        {transaction.payment_method === "pix" && "PIX"}
                        {transaction.payment_method === "transferencia" && "Transferência"}
                      </TableCell>
                      <TableCell>
                        {getClientName(transaction.client_id) || "-"}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${transaction.type === "receita" ? "text-green-500" : "text-red-500"}`}>
                        {transaction.type === "receita" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                      Nenhuma transação registrada hoje
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OpenCashDialog open={showOpenCashDialog} onClose={() => setShowOpenCashDialog(false)} onConfirm={handleOpenCash} />

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
                <Button variant="outline" onClick={downloadReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => {
                  console.log("[CashRegister] Fechando diálogo de relatório");
                  setShowReportDialog(false);
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </DialogFooter>
          </div>
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
