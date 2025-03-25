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
import { FinancialTransaction, User, Client, Employee, Package, ClientPackage } from "@/firebase/entities";
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

  const [initialAmountValue, setInitialAmountValue] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await loadCashRegisters();
        await loadTransactions();
        await checkCashStatus();
      } catch (error) {
        console.error("[CashRegister] Erro ao carregar dados iniciais:", error);
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
  }, []);

  useEffect(() => {
    console.log("[CashRegister] Status do caixa alterado:", cashIsOpen ? "Aberto" : "Fechado");
    console.log("[CashRegister] Valor inicial:", initialAmount);
    console.log("[CashRegister] Saldo do dia:", dailyBalance);
    
    // Forçar atualização dos dados quando o status mudar
    if (cashIsOpen) {
      loadTransactions();
    }
  }, [cashIsOpen, initialAmount, dailyBalance]);

  useEffect(() => {
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      processTransactions(transactions);
    }
  }, [transactions]);

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
        // Atualizar o estado das transações antes de processá-las
        setTransactions(todayTransactions);
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

  const processTransactions = (transactions) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      console.log("Data de hoje em processTransactions:", today);
      
      if (!transactions || !Array.isArray(transactions)) {
        console.log("Nenhuma transação para processar");
        return;
      }
      
      // Filtrar transações excluídas
      const activeTransactions = transactions.filter(transaction => 
        transaction.status !== "excluido" && transaction.deleted !== true
      );
      
      console.log(`Total de transações: ${transactions.length}, Ativas: ${activeTransactions.length}`);
      
      // Filtrar transações de hoje
      const todayTransactions = activeTransactions.filter(transaction => {
        const transactionDate = transaction.payment_date ? transaction.payment_date.split('T')[0] : null;
        const isToday = transactionDate === today;
        console.log(`Comparando datas: transação [${transactionDate}] vs hoje [${today}] ${isToday}`);
        return isToday;
      });
      
      console.log("Transações filtradas para hoje:", todayTransactions);
      console.log("Número de transações de hoje:", todayTransactions.length);
      
      // Verificar se há transação de abertura
      const openingTransaction = todayTransactions.find(t => t.category === "abertura_caixa");
      
      if (openingTransaction) {
        console.log("Transação de abertura encontrada:", openingTransaction);
        
        // Valor inicial do caixa
        const initialAmountValue = parseFloat(openingTransaction.amount) || 0;
        console.log(`Valor inicial do caixa: R$ ${initialAmountValue.toFixed(2)}`);
        
        // Atualizar o valor inicial
        setInitialAmount(initialAmountValue);
        
        // Filtrar transações de receita e despesa (excluindo abertura e fechamento)
        const receiptTransactions = todayTransactions.filter(t => 
          t.type === "receita" && 
          t.category !== "abertura_caixa" && 
          t.category !== "fechamento_caixa"
        );
        
        const expenseTransactions = todayTransactions.filter(t => 
          t.type === "despesa" && 
          t.category !== "abertura_caixa" && 
          t.category !== "fechamento_caixa"
        );
        
        // Calcular totais
        const totalReceipts = receiptTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        // Atualizar os estados
        setDailyReceipts(totalReceipts);
        setDailyExpenses(totalExpenses);
        
        // Calcular saldo
        const balance = initialAmountValue + totalReceipts - totalExpenses;
        console.log(`Cálculo do saldo: ${initialAmountValue} (inicial) + ${totalReceipts} (receitas) - ${totalExpenses} (despesas) = ${balance}`);
        setDailyBalance(balance);
        
        // Calcular saldo em dinheiro
        const cashReceiptTransactions = receiptTransactions.filter(t => t.payment_method === "dinheiro");
        const cashExpenseTransactions = expenseTransactions.filter(t => t.payment_method === "dinheiro");
        
        const cashReceipts = cashReceiptTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const cashExpenses = cashExpenseTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        const expectedCash = initialAmountValue + cashReceipts - cashExpenses;
        console.log(`Saldo em dinheiro: ${initialAmountValue} (inicial) + ${cashReceipts} (receitas em dinheiro) - ${cashExpenses} (despesas em dinheiro) = ${expectedCash}`);
        setExpectedCashAmount(expectedCash);
        
        // Verificar se há transação de fechamento
        const closingTransaction = todayTransactions.find(t => t.category === "fechamento_caixa");
        
        // Atualizar o status do caixa
        const isOpen = !!openingTransaction && !closingTransaction;
        console.log(`Status do caixa após processamento: ${isOpen ? 'Aberto' : 'Fechado'}`);
        setCashIsOpen(isOpen);
      } else {
        console.log("Nenhuma transação de abertura encontrada para hoje");
        setCashIsOpen(false);
        setInitialAmount(0);
        setDailyReceipts(0);
        setDailyExpenses(0);
        setDailyBalance(0);
        setExpectedCashAmount(0);
      }
    } catch (error) {
      console.error("Erro ao processar transações:", error);
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
    return transactions.filter(t => {
      const transactionDate = t.payment_date ? t.payment_date.split('T')[0] : null;
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
    
    // Resetar o estado do diálogo quando ele for fechado
    useEffect(() => {
      if (!open) {
        setEmployeeId("");
        setEmployeeName("");
        setInitialAmount("0");
        setNotes("");
        setLoading(false);
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
        
        // Chamar a função de confirmação
        await onConfirm(employeeName, numericValue, notes);
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

  const handleOpenCash = async (employeeName, initialAmount, notes = "") => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      console.log("[CashRegister] Abrindo caixa para a data:", today);
      
      if (cashIsOpen) {
        toast.error("O caixa já está aberto!");
        setShowOpenCashDialog(false);
        return;
      }
      
      const openingTransaction = {
        type: "receita",
        category: "abertura_caixa",
        description: "Abertura de Caixa",
        amount: initialAmount,
        payment_method: "dinheiro",
        payment_date: today,
        status: "pago",
        notes: notes,
        opened_by: employeeName
      };
      
      setShowOpenCashDialog(false);
      
      await FinancialTransaction.create(openingTransaction);
      
      setInitialAmount(initialAmount);
      setCashIsOpen(true);
      
      await loadTransactions();
      await loadCashRegisters();
      await checkCashStatus();
      
      toast.success("Caixa aberto com sucesso!");
    } catch (error) {
      console.error("[CashRegister] Erro ao abrir o caixa:", error);
      toast.error("Erro ao abrir o caixa. Tente novamente.");
    }
  };

  const getPaymentMethodTotals = (transactions) => {
    const totals = {
      pix: 0,
      dinheiro: 0,
      cartao_debito: 0,
      cartao_credito: 0,
      link: 0
    };

    transactions.forEach(t => {
      if (t.type === 'receita') {
        switch (t.payment_method) {
          case 'pix':
            totals.pix += Number(t.amount);
            break;
          case 'dinheiro':
            totals.dinheiro += Number(t.amount);
            break;
          case 'cartao_debito':
            totals.cartao_debito += Number(t.amount);
            break;
          case 'cartao_credito':
            totals.cartao_credito += Number(t.amount);
            break;
          case 'link':
            totals.link += Number(t.amount);
            break;
        }
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
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <img src="/logo.png" alt="Logo" style="height: 50px;" />
          <div style="text-align: right;">
            <h2>DETALHAMENTO CAIXA</h2>
            <p>OPERADOR: ${cashData.opened_by || '-'}</p>
            <p>${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd;">ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd;">R$ ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">R$ FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd;">QUEBRA</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(cashData.opened_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(cashData.closed_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(cashData.initial_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(cashData.final_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${Number(cashData.difference || 0) < 0 ? 'red' : 'green'};">
              R$ ${Number(cashData.difference || 0).toFixed(2)}
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 10px;">DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${totalReceitas.toFixed(2)}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f0f0f0;">
              <th style="padding: 8px; border: 1px solid #ddd;">PIX</th>
              <th style="padding: 8px; border: 1px solid #ddd;">DINHEIRO</th>
              <th style="padding: 8px; border: 1px solid #ddd;">CARTÃO DE DÉBITO</th>
              <th style="padding: 8px; border: 1px solid #ddd;">CARTÃO DE CRÉDITO</th>
              <th style="padding: 8px; border: 1px solid #ddd;">LINK</th>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">R$ ${paymentTotals.pix.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">R$ ${paymentTotals.dinheiro.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">R$ ${paymentTotals.cartao_debito.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">R$ ${paymentTotals.cartao_credito.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">R$ ${paymentTotals.link.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd;">DESCRIÇÃO</th>
            <th style="padding: 8px; border: 1px solid #ddd;">REFERÊNCIA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">VALOR</th>
            <th style="padding: 8px; border: 1px solid #ddd;">DATA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">HORA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">CLIENTE</th>
            <th style="padding: 8px; border: 1px solid #ddd;">FORMA PGTO</th>
          </tr>
          ${transactions.map(t => {
            const paymentMethodMap = {
              'pix': 'PIX',
              'dinheiro': 'DINHEIRO',
              'cartao_debito': 'CARTÃO DE DÉBITO',
              'cartao_credito': 'CARTÃO DE CRÉDITO',
              'link': 'LINK'
            };

            const categoryMap = {
              'venda_produto': 'PRODUTO',
              'venda_servico': 'SERVIÇO',
              'venda_pacote': 'PACOTE',
              'venda_gift_card': 'GIFT CARD',
              'venda_assinatura': 'ASSINATURA'
            };

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.description || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${categoryMap[t.category] || t.category || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(t.amount || 0).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(t.payment_date)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatTime(t.created_at)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.client_name || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${paymentMethodMap[t.payment_method] || t.payment_method || '-'}</td>
              </tr>
            `;
          }).join('')}
        </table>

        <div style="margin-top: 50px; text-align: center;">
          <div style="border-top: 1px solid #000; display: inline-block; padding-top: 10px; min-width: 200px;">
            (Assinatura)
          </div>
        </div>

        <div style="margin-top: 30px; font-size: 12px;">
          <p>MAGNIFIC Telefone:</p>
          <p>Endereço: Rua Eduardo Santos Pereira, 2221 - Campo Grande MS 79020-170</p>
        </div>
      </div>
    `;
    return html;
  };

  const handleOpenReport = () => {
    if (!cashRegisters || cashRegisters.length === 0) {
      toast({
        title: "Erro",
        description: "Não há dados de caixa disponíveis",
        type: "error"
      });
      return;
    }

    const html = generateReportHtml(cashRegisters[0], transactions);
    setReportHtml(html);
    setShowReportDialog(true);
  };

  const generatePDFReport = async (cashData, transactions) => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <img src="/logo.png" alt="Logo" style="height: 50px;" />
          <div style="text-align: right;">
            <h2>DETALHAMENTO CAIXA</h2>
            <p>OPERADOR: ${cashData.opened_by || '-'}</p>
            <p>${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</p>
          </div>
        </div>

        <!-- Abertura/Fechamento -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd;">ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd;">R$ ABERTURA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">R$ FECHAMENTO</th>
            <th style="padding: 8px; border: 1px solid #ddd;">QUEBRA</th>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(cashData.opened_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(cashData.closed_at)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(cashData.initial_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(cashData.final_amount || 0).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: ${Number(cashData.difference || 0) < 0 ? 'red' : 'green'};">
              R$ ${Number(cashData.difference || 0).toFixed(2)}
            </td>
          </tr>
        </table>

        <!-- Totais por Forma de Pagamento -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 10px;">DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0).toFixed(2)}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <th style="padding: 8px; border: 1px solid #ddd;">PIX</th>
              <th style="padding: 8px; border: 1px solid #ddd;">DINHEIRO</th>
              <th style="padding: 8px; border: 1px solid #ddd;">CARTÃO DE DÉBITO</th>
              <th style="padding: 8px; border: 1px solid #ddd;">CARTÃO DE CRÉDITO</th>
              <th style="padding: 8px; border: 1px solid #ddd;">LINK</th>
            </tr>
            <tr>
              ${Object.entries(getPaymentMethodTotals(transactions)).map(([method, total]) => `
                <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(total).toFixed(2)}</td>
              `).join('')}
            </tr>
          </table>
        </div>

        <!-- Transações -->
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd;">DESCRIÇÃO</th>
            <th style="padding: 8px; border: 1px solid #ddd;">REFERÊNCIA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">VALOR</th>
            <th style="padding: 8px; border: 1px solid #ddd;">DATA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">HORA</th>
            <th style="padding: 8px; border: 1px solid #ddd;">CLIENTE</th>
            <th style="padding: 8px; border: 1px solid #ddd;">FORMA PGTO</th>
          </tr>
          ${transactions.map(t => {
            const paymentMethodMap = {
              'pix': 'PIX',
              'dinheiro': 'DINHEIRO',
              'cartao_debito': 'CARTÃO DE DÉBITO',
              'cartao_credito': 'CARTÃO DE CRÉDITO',
              'link': 'LINK'
            };

            const categoryMap = {
              'venda_produto': 'PRODUTO',
              'venda_servico': 'SERVIÇO',
              'venda_pacote': 'PACOTE',
              'venda_gift_card': 'GIFT CARD',
              'venda_assinatura': 'ASSINATURA'
            };

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.description || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${categoryMap[t.category] || t.category || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">R$ ${Number(t.amount || 0).toFixed(2)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(t.payment_date)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${formatTime(t.created_at)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${t.client_name || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${paymentMethodMap[t.payment_method] || t.payment_method || '-'}</td>
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
        <div style="margin-top: 30px; font-size: 12px;">
          <p>MAGNIFIC Telefone:</p>
          <p>Endereço: Rua Eduardo Santos Pereira, 2221 - Campo Grande MS 79020-170</p>
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

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#F1F6CE] to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0D0F36]">Saldo em Dinheiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-5 w-5 ${expectedCashAmount >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-2xl font-bold">
                R$ {expectedCashAmount.toFixed(2)}
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
                R$ {dailyReceipts.toFixed(2)}
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
                R$ {dailyExpenses.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#0D0F36] to-[#294380]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Saldo do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-[#F1F6CE]" />
              <span className="text-2xl font-bold text-[#F1F6CE]">
                R$ {dailyBalance.toFixed(2)}
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
                        R$ {transaction.amount.toFixed(2)}
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
