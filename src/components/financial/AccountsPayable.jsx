import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, AlertCircle, FileText, TrendingDown, CalendarIcon, CheckCircle, XCircle, InfoIcon } from "lucide-react";
import { FinancialTransaction, Supplier } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';
import toast, { Toaster } from 'react-hot-toast';

export default function AccountsPayable() {
  // Função para ajustar datas para o fuso horário correto
  const adjustDateForTimezone = (dateString) => {
    // Se a data já estiver no formato yyyy-MM-dd, retorná-la diretamente
    if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    // Criar uma data a partir da string e extrair os componentes
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Retornar a data no formato yyyy-MM-dd
    return `${year}-${month}-${day}`;
  };

  // Função para formatar a data para exibição, preservando o dia correto
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "Sem data";
    
    // Extrair os componentes da data diretamente da string (formato yyyy-MM-dd)
    const [year, month, day] = dateString.split('-');
    
    // Retornar a data formatada sem criar um objeto Date
    return `${day}/${month}/${year}`;
  };

  // Função para formatar o mês para exibição
  const formatMonthForDisplay = (monthString) => {
    if (monthString === "sem-data") return "Sem data de vencimento";
    
    // Extrair o ano e o mês da string (formato yyyy-MM)
    const [year, month] = monthString.split('-');
    
    // Mapear o número do mês para o nome em português
    const monthNames = {
      '01': 'janeiro',
      '02': 'fevereiro',
      '03': 'março',
      '04': 'abril',
      '05': 'maio',
      '06': 'junho',
      '07': 'julho',
      '08': 'agosto',
      '09': 'setembro',
      '10': 'outubro',
      '11': 'novembro',
      '12': 'dezembro'
    };
    
    // Retornar o mês formatado
    return `${monthNames[month]} de ${year}`;
  };

  const [transactions, setTransactions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_date: adjustDateForTimezone(format(new Date(), "yyyy-MM-dd")),
    payment_method: "dinheiro",
    interest: "0",
    observations: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month, custom
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [newTransaction, setNewTransaction] = useState({
    type: "despesa",
    category: "compra_produto",
    description: "",
    amount: "",
    payment_method: "transferencia",
    status: "pendente",
    due_date: adjustDateForTimezone(format(new Date(), "yyyy-MM-dd")),
    payment_date: "",
    supplier_id: "",
    is_recurring: false,
    recurrence_type: "none",
    recurrence_count: "0",
    recurrence_end_date: "",
    is_auto_recurring: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const transactionsData = await FinancialTransaction.list();
      // Filtrar apenas despesas e excluir transações de abertura/fechamento de caixa
      const expensesData = transactionsData.filter(t => 
        t.type === "despesa" && 
        t.category !== "fechamento_caixa" && 
        t.category !== "abertura_caixa"
      );
      setTransactions(expensesData);

      const suppliersData = await Supplier.list();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const createNextRecurrence = async (transaction) => {
    const currentDate = new Date(adjustDateForTimezone(transaction.due_date));
    const dayOfMonth = currentDate.getDate();
    console.log("Criando próxima recorrência a partir da data:", transaction.due_date);
    console.log("Data ajustada para cálculo:", format(currentDate, "yyyy-MM-dd"));

    switch (transaction.recurrence_type) {
      case "monthly": {
        currentDate.setMonth(currentDate.getMonth() + 1);
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        currentDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        break;
      }
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "yearly": {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        if (dayOfMonth === 29 && currentDate.getMonth() === 1) {
          const isLeapYear = new Date(currentDate.getFullYear(), 1, 29).getDate() === 29;
          if (!isLeapYear) {
            currentDate.setDate(28);
          }
        }
        break;
      }
    }

    if (transaction.recurrence_end_date && currentDate > new Date(adjustDateForTimezone(transaction.recurrence_end_date))) {
      console.log("Data da próxima recorrência excede a data final. Recorrência não será criada.");
      return;
    }

    const nextDueDate = adjustDateForTimezone(format(currentDate, "yyyy-MM-dd"));
    console.log("Data da próxima recorrência:", nextDueDate);
    
    const nextTransaction = {
      ...transaction,
      due_date: nextDueDate,
      status: "pendente",
      payment_date: null,
      parent_transaction_id: transaction.id
    };

    delete nextTransaction.id;
    await FinancialTransaction.create(nextTransaction);
  };

  const checkAndCreateRecurrences = async () => {
    try {
      const allTransactions = await FinancialTransaction.list();
      const autoRecurringTransactions = allTransactions.filter(t => 
        t.is_auto_recurring && 
        t.status !== "cancelado" &&
        !t.parent_transaction_id // Apenas transações principais
      );

      for (const transaction of autoRecurringTransactions) {
        const lastRecurrence = allTransactions
          .filter(t => t.parent_transaction_id === transaction.id)
          .sort((a, b) => new Date(adjustDateForTimezone(b.due_date)) - new Date(adjustDateForTimezone(a.due_date)))[0];

        const lastDueDate = lastRecurrence ? new Date(adjustDateForTimezone(lastRecurrence.due_date)) : new Date(adjustDateForTimezone(transaction.due_date));
        const today = new Date();
        const monthsAhead = 2;

        if (lastDueDate < new Date(today.getFullYear(), today.getMonth() + monthsAhead, today.getDate())) {
          await createNextRecurrence(lastRecurrence || transaction);
        }
      }
    } catch (error) {
      console.error("Erro ao criar recorrências automáticas:", error);
    }
  };

  useEffect(() => {
    checkAndCreateRecurrences();
  }, []);

  const handleCreateTransaction = async () => {
    try {
      // Ajustar as datas para evitar problemas de fuso horário
      const adjustedDueDate = adjustDateForTimezone(newTransaction.due_date);
      const adjustedPaymentDate = newTransaction.payment_date ? adjustDateForTimezone(newTransaction.payment_date) : null;
      const adjustedRecurrenceEndDate = newTransaction.recurrence_end_date ? adjustDateForTimezone(newTransaction.recurrence_end_date) : null;
      
      const mainTransaction = { 
        ...newTransaction,
        due_date: adjustedDueDate,
        payment_date: adjustedPaymentDate,
        recurrence_end_date: adjustedRecurrenceEndDate,
        amount: parseFloat(newTransaction.amount) || 0,
        recurrence_count: parseInt(newTransaction.recurrence_count),
        is_auto_recurring: newTransaction.is_recurring && 
                         newTransaction.recurrence_type !== "none" && 
                         (!newTransaction.recurrence_count || newTransaction.recurrence_count === "0")
      };
      
      delete mainTransaction.recurrence_count;
      delete mainTransaction.recurrence_end_date;
      
      console.log("Criando transação com data de vencimento:", adjustedDueDate);
      const createdTransaction = await FinancialTransaction.create(mainTransaction);

      if (newTransaction.is_recurring && 
          newTransaction.recurrence_type !== "none" && 
          newTransaction.recurrence_count && 
          newTransaction.recurrence_count !== "0") {
        const transactions = [];
        const firstDueDate = new Date(adjustedDueDate);
        const dayOfMonth = firstDueDate.getDate();
        let currentDate = new Date(firstDueDate);
        let count = parseInt(newTransaction.recurrence_count);
        
        while (count > 1) {
          switch (newTransaction.recurrence_type) {
            case "monthly": {
              currentDate.setMonth(currentDate.getMonth() + 1);
              const lastDayOfMonth = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
              ).getDate();
              currentDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
              break;
            }
            case "weekly":
              currentDate.setDate(currentDate.getDate() + 7);
              break;
            case "yearly": {
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              if (dayOfMonth === 29 && currentDate.getMonth() === 1) {
                const isLeapYear = new Date(currentDate.getFullYear(), 1, 29).getDate() === 29;
                if (!isLeapYear) {
                  currentDate.setDate(28);
                }
              }
              break;
            }
          }

          if (adjustedRecurrenceEndDate && 
              currentDate > new Date(adjustedRecurrenceEndDate)) {
            break;
          }

          const nextDueDate = adjustDateForTimezone(format(currentDate, "yyyy-MM-dd"));
          console.log("Criando parcela com data de vencimento:", nextDueDate);
          
          transactions.push({
            ...mainTransaction,
            due_date: nextDueDate,
            parent_transaction_id: createdTransaction.id
          });

          count--;
        }

        await Promise.all(transactions.map(t => FinancialTransaction.create(t)));
      } else if (mainTransaction.is_auto_recurring) {
        await createNextRecurrence(createdTransaction);
        const nextTransaction = await FinancialTransaction.list()
          .then(transactions => transactions.find(t => t.parent_transaction_id === createdTransaction.id));
        if (nextTransaction) {
          await createNextRecurrence(nextTransaction);
        }
      }

      setShowNewTransactionDialog(false);
      await loadData();
      toast.success(mainTransaction.is_auto_recurring 
        ? "Despesa recorrente criada! Novas parcelas serão geradas automaticamente." 
        : "Despesa(s) criada(s) com sucesso!");

      setNewTransaction({
        type: "despesa",
        category: "compra_produto",
        description: "",
        amount: "",
        payment_method: "transferencia",
        status: "pendente",
        due_date: format(new Date(), "yyyy-MM-dd"),
        payment_date: "",
        supplier_id: "",
        is_recurring: false,
        recurrence_type: "none",
        recurrence_count: "0",
        recurrence_end_date: "",
        is_auto_recurring: false
      });
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      toast.error("Erro ao criar despesa. Verifique os dados e tente novamente.");
    }
  };

  const handleStatusChange = async (transaction, newStatus) => {
    try {
      const updatedTransaction = {
        ...transaction,
        status: newStatus,
        payment_date: newStatus === 'pago' ? adjustDateForTimezone(format(new Date(), "yyyy-MM-dd")) : null
      };
      
      await FinancialTransaction.update(transaction.id, updatedTransaction);
      
      // Se for uma transação recorrente automática e foi marcada como paga, criar a próxima
      if (newStatus === 'pago' && transaction.is_auto_recurring) {
        await createNextRecurrence(transaction);
      }
      
      await loadData();
      toast.success(`Status alterado para ${newStatus}`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsDialog(true);
  };

  const handlePaymentClick = (transaction) => {
    setSelectedTransaction(transaction);
    setPaymentDetails({
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: transaction.payment_method || "dinheiro",
      interest: "0",
      observations: ""
    });
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = async () => {
    try {
      const interest = parseFloat(paymentDetails.interest) || 0;
      const totalAmount = selectedTransaction.amount + interest;

      // Atualiza a transação com os detalhes do pagamento
      await FinancialTransaction.update(selectedTransaction.id, {
        ...selectedTransaction,
        status: "pago",
        payment_date: adjustDateForTimezone(paymentDetails.payment_date),
        payment_method: paymentDetails.payment_method,
        paid_amount: totalAmount,
        interest_amount: interest,
        payment_observations: paymentDetails.observations
      });

      // Se for recorrente automática, cria a próxima parcela
      if (selectedTransaction.is_auto_recurring) {
        await checkAndCreateRecurrences();
      }

      setShowPaymentDialog(false);
      await loadData();
      
      // Mostra confirmação de sucesso
      toast.custom((t) => (
        <div className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Pagamento registrado com sucesso!
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Valor total: R$ {totalAmount.toFixed(2)}
                  {interest > 0 && ` (inclui juros de R$ ${interest.toFixed(2)})`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[#294380] hover:text-[#1e3163] focus:outline-none"
            >
              Fechar
            </button>
          </div>
        </div>
      ), { duration: 5000 });

    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast.error("Erro ao registrar pagamento");
    }
  };

  const filterByDate = (transaction) => {
    // Se dateFilter for "all", retornar true imediatamente
    if (dateFilter === "all") return true;
    
    // Verificar se due_date existe
    if (!transaction.due_date) {
      console.warn("Transação sem data de vencimento em filterByDate:", transaction);
      return false; // Transações sem data não passam pelo filtro de data
    }
    
    const transactionDate = new Date(adjustDateForTimezone(transaction.due_date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case "today":
        return transactionDate.getTime() === today.getTime();
      
      case "week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(today);
        weekEnd.setDate(weekStart.getDate() + 6);
        return transactionDate >= weekStart && transactionDate <= weekEnd;
      }
      
      case "month": {
        return transactionDate.getMonth() === today.getMonth() && 
               transactionDate.getFullYear() === today.getFullYear();
      }

      case "custom": {
        if (!customDateRange.startDate || !customDateRange.endDate) return true;
        const start = new Date(adjustDateForTimezone(customDateRange.startDate));
        const end = new Date(adjustDateForTimezone(customDateRange.endDate));
        return transactionDate >= start && transactionDate <= end;
      }

      default:
        return true;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (suppliers.find(s => s.id === transaction.supplier_id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;
    
    const matchesDate = filterByDate(transaction);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getTotalPending = () => {
    return filteredTransactions
      .filter(t => t.status === "pendente")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const getDueThisWeek = () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    return filteredTransactions
      .filter(t => {
        // Verificar se a transação tem data de vencimento
        if (!t.due_date) return false;
        
        const dueDate = new Date(adjustDateForTimezone(t.due_date));
        return t.status === "pendente" && dueDate >= today && dueDate <= nextWeek;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const groupedTransactions = filteredTransactions.reduce((acc, transaction) => {
    // Verificar se due_date existe antes de usar substring
    if (!transaction.due_date) {
      console.warn("Transação sem data de vencimento:", transaction);
      // Agrupar em "Sem data"
      const month = "sem-data";
      if (!acc[month]) acc[month] = [];
      acc[month].push(transaction);
      return acc;
    }
    
    const month = adjustDateForTimezone(transaction.due_date).substring(0, 7); 
    if (!acc[month]) acc[month] = [];
    acc[month].push(transaction);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedTransactions).sort((a, b) => {
    // Caso especial para "sem-data"
    if (a === "sem-data") return 1; // "sem-data" fica no final
    if (b === "sem-data") return -1; // "sem-data" fica no final
    
    // Criar datas válidas adicionando o dia (01)
    try {
      // Verificar se a e b são strings de data válidas (formato YYYY-MM)
      if (a.match(/^\d{4}-\d{2}$/) && b.match(/^\d{4}-\d{2}$/)) {
        return new Date(a + "-01") - new Date(b + "-01");
      }
      // Caso não sejam strings de data válidas, ordenar alfabeticamente
      return a.localeCompare(b);
    } catch (error) {
      console.warn("Erro ao ordenar meses:", error, a, b);
      return 0; // Manter a ordem original em caso de erro
    }
  });

  const handleResetTransaction = () => {
    setNewTransaction({
      type: "despesa",
      category: "compra_produto",
      description: "",
      amount: "",
      payment_method: "transferencia",
      status: "pendente",
      due_date: adjustDateForTimezone(format(new Date(), "yyyy-MM-dd")),
      payment_date: "",
      supplier_id: "",
      is_recurring: false,
      recurrence_type: "none",
      recurrence_count: "0",
      recurrence_end_date: "",
      is_auto_recurring: false
    });
  };

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D0F36]">Contas a Pagar</h3>
          <p className="text-[#294380] text-sm">Gerencie suas despesas e pagamentos</p>
        </div>
        <Button 
          onClick={() => setShowNewTransactionDialog(true)}
          className="bg-[#294380] hover:bg-[#0D0F36]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-r from-[#F1F6CE]/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Total a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">
              R$ {getTotalPending().toFixed(2)}
            </div>
            <div className="text-xs text-[#294380] flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3" />
              {filteredTransactions.filter(t => t.status === "pendente").length} contas pendentes
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-[#F1F6CE]/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Vence esta semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">
              R$ {getDueThisWeek().toFixed(2)}
            </div>
            <div className="text-xs text-[#294380] flex items-center gap-1 mt-1">
              <CalendarIcon className="w-3 h-3" />
              Próximos 7 dias
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-[#F1F6CE]/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Filtro de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-[#F1F6CE]/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Filtro de Período</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === "custom" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">De</Label>
                  <Input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por descrição ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMonths.map(month => (
              <React.Fragment key={month}>
                <TableRow className="bg-[#B9F1D6]/20">
                  <TableCell colSpan={6} className="font-medium py-2">
                    {formatMonthForDisplay(month)}
                  </TableCell>
                </TableRow>
                {groupedTransactions[month].map(transaction => {
                  const supplier = suppliers.find(s => s.id === transaction.supplier_id);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-500">{transaction.category.replace(/_/g, ' ')}</div>
                      </TableCell>
                      <TableCell>{supplier?.name || '-'}</TableCell>
                      <TableCell>
                        {transaction.due_date 
                          ? formatDateForDisplay(transaction.due_date) 
                          : "Sem data"}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {transaction.amount !== undefined && transaction.amount !== null
                          ? Number(transaction.amount).toFixed(2)
                          : "0.00"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            transaction.status === 'pago'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'cancelado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {transaction.status === 'pendente' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePaymentClick(transaction)}
                                title="Registrar pagamento"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStatusChange(transaction, 'cancelado')}
                                title="Cancelar"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(transaction)}
                            title="Ver detalhes"
                          >
                            <FileText className="h-4 w-4 text-[#294380]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="flex flex-col items-center">
                    <AlertCircle className="h-6 w-6 text-gray-400 mb-2" />
                    <p className="text-gray-500">Nenhuma transação encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNewTransactionDialog} onOpenChange={setShowNewTransactionDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="compra_produto">Compra de Produtos</SelectItem>
                    <SelectItem value="salario">Salário</SelectItem>
                    <SelectItem value="comissao">Comissão</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="utilities">Utilidades</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={newTransaction.due_date}
                  onChange={(e) => {
                    const adjustedDate = adjustDateForTimezone(e.target.value);
                    console.log("Data selecionada:", e.target.value);
                    console.log("Data ajustada:", adjustedDate);
                    setNewTransaction({...newTransaction, due_date: adjustedDate});
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={newTransaction.supplier_id}
                onValueChange={(value) => setNewTransaction({...newTransaction, supplier_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select
                value={newTransaction.is_recurring}
                onValueChange={(value) => setNewTransaction({...newTransaction, is_recurring: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={false}>Não</SelectItem>
                  <SelectItem value={true}>Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newTransaction.is_recurring && (
              <div>
                <div className="space-y-2">
                  <Label>Tipo de Recorrência</Label>
                  <Select
                    value={newTransaction.recurrence_type}
                    onValueChange={(value) => setNewTransaction({...newTransaction, recurrence_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade de Recorrências (0 para indefinido)</Label>
                  <div className="text-xs text-gray-500 mb-1">
                    Digite 0 para criar recorrências indefinidamente até a data final, ou especifique um número fixo de parcelas
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={newTransaction.recurrence_count}
                    onChange={(e) => setNewTransaction({...newTransaction, recurrence_count: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Final de Recorrência (opcional)</Label>
                  <div className="text-xs text-gray-500 mb-1">
                    Se não especificar uma data final e a quantidade for 0, serão criadas 60 recorrências (5 anos)
                  </div>
                  <Input
                    type="date"
                    value={newTransaction.recurrence_end_date}
                    onChange={(e) => {
                      const adjustedDate = e.target.value ? adjustDateForTimezone(e.target.value) : "";
                      setNewTransaction({...newTransaction, recurrence_end_date: adjustedDate});
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recorrência Automática</Label>
                  <Select
                    value={newTransaction.is_auto_recurring}
                    onValueChange={(value) => setNewTransaction({...newTransaction, is_auto_recurring: value === "true"})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Se ativado, novas parcelas serão geradas automaticamente quando a parcela atual for paga.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTransactionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTransaction} className="bg-[#294380] hover:bg-[#0D0F36]">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Despesa</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Descrição</Label>
                  <div className="font-medium">{selectedTransaction.description}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Categoria</Label>
                  <div className="font-medium">
                    {selectedTransaction.category.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Valor</Label>
                  <div className="font-medium">
                    R$ {selectedTransaction.amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        selectedTransaction.status === 'pago'
                          ? 'bg-green-100 text-green-800'
                          : selectedTransaction.status === 'cancelado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedTransaction.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Data de Vencimento</Label>
                  <div className="font-medium">
                    {selectedTransaction.due_date 
                      ? formatDateForDisplay(selectedTransaction.due_date)
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Data de Pagamento</Label>
                  <div className="font-medium">
                    {selectedTransaction.payment_date 
                      ? formatDateForDisplay(selectedTransaction.payment_date)
                      : '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Forma de Pagamento</Label>
                  <div className="font-medium">
                    {selectedTransaction.payment_method.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Fornecedor</Label>
                  <div className="font-medium">
                    {suppliers.find(s => s.id === selectedTransaction.supplier_id)?.name || '-'}
                  </div>
                </div>
              </div>

              {selectedTransaction.is_auto_recurring && (
                <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Despesa Recorrente Automática</h4>
                      <p className="text-sm text-blue-600 mt-0.5">
                        Esta é uma despesa recorrente que gera novas parcelas automaticamente.
                        {selectedTransaction.recurrence_end_date && (
                          <> Recorrências serão geradas até {formatDateForDisplay(selectedTransaction.recurrence_end_date)}.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.parent_transaction_id && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-800">Parcela Recorrente</h4>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Esta é uma parcela de uma despesa recorrente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do pagamento abaixo
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Descrição da Despesa</Label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                  {selectedTransaction.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Original</Label>
                  <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                    R$ {selectedTransaction.amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label htmlFor="interest">Juros</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                    <Input
                      id="interest"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-8"
                      value={paymentDetails.interest}
                      onChange={(e) => setPaymentDetails({
                        ...paymentDetails,
                        interest: e.target.value
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_date">Data do Pagamento</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentDetails.payment_date}
                    onChange={(e) => {
                      const adjustedDate = adjustDateForTimezone(e.target.value);
                      console.log("Data de pagamento selecionada:", e.target.value);
                      console.log("Data de pagamento ajustada:", adjustedDate);
                      setPaymentDetails({...paymentDetails, payment_date: adjustedDate});
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Método de Pagamento</Label>
                  <Select
                    value={paymentDetails.payment_method}
                    onValueChange={(value) => setPaymentDetails({
                      ...paymentDetails,
                      payment_method: value
                    })}
                  >
                    <SelectTrigger id="payment_method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={paymentDetails.observations}
                  onChange={(e) => setPaymentDetails({
                    ...paymentDetails,
                    observations: e.target.value
                  })}
                  placeholder="Observações sobre o pagamento..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <InfoIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      Valor Total a Pagar
                    </h4>
                    <p className="text-sm text-blue-600 mt-0.5">
                      R$ {(selectedTransaction.amount + parseFloat(paymentDetails.interest || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment}>
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}
