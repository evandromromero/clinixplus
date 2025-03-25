import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, AlertCircle, FileText, TrendingDown, CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { FinancialTransaction, Supplier } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';
import toast, { Toaster } from 'react-hot-toast';

export default function AccountsPayable() {
  const [transactions, setTransactions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
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
    due_date: format(new Date(), "yyyy-MM-dd"),
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
      const expensesData = transactionsData.filter(t => t.type === "despesa");
      setTransactions(expensesData);

      const suppliersData = await Supplier.list();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const createNextRecurrence = async (transaction) => {
    const currentDate = new Date(transaction.due_date);
    const dayOfMonth = currentDate.getDate();

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

    if (transaction.recurrence_end_date && currentDate > new Date(transaction.recurrence_end_date)) {
      return;
    }

    const nextTransaction = {
      ...transaction,
      due_date: format(currentDate, "yyyy-MM-dd"),
      status: "pendente",
      payment_date: null,
      parent_transaction_id: transaction.id
    };

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
          .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))[0];

        const lastDueDate = lastRecurrence ? new Date(lastRecurrence.due_date) : new Date(transaction.due_date);
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
      const mainTransaction = { 
        ...newTransaction,
        amount: parseFloat(newTransaction.amount) || 0,
        recurrence_count: parseInt(newTransaction.recurrence_count),
        payment_date: newTransaction.payment_date || null,
        recurrence_end_date: newTransaction.recurrence_end_date || null,
        is_auto_recurring: newTransaction.is_recurring && 
                         newTransaction.recurrence_type !== "none" && 
                         (!newTransaction.recurrence_count || newTransaction.recurrence_count === "0")
      };
      
      delete mainTransaction.recurrence_count;
      delete mainTransaction.recurrence_end_date;
      
      const createdTransaction = await FinancialTransaction.create(mainTransaction);

      if (newTransaction.is_recurring && 
          newTransaction.recurrence_type !== "none" && 
          newTransaction.recurrence_count && 
          newTransaction.recurrence_count !== "0") {
        const transactions = [];
        const firstDueDate = new Date(newTransaction.due_date);
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

          if (newTransaction.recurrence_end_date && 
              currentDate > new Date(newTransaction.recurrence_end_date)) {
            break;
          }

          transactions.push({
            ...mainTransaction,
            due_date: format(currentDate, "yyyy-MM-dd"),
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
      console.error("Error creating transaction:", error);
      toast.error("Erro ao criar despesa");
    }
  };

  const handleStatusChange = async (transaction, newStatus) => {
    try {
      await FinancialTransaction.update(transaction.id, { 
        ...transaction, 
        status: newStatus,
        payment_date: newStatus === 'pago' ? format(new Date(), "yyyy-MM-dd") : null
      });
      loadData();
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  const filterByDate = (transaction) => {
    const transactionDate = new Date(transaction.due_date);
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
        const start = new Date(customDateRange.startDate);
        const end = new Date(customDateRange.endDate);
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

  const groupedTransactions = filteredTransactions.reduce((acc, transaction) => {
    const month = transaction.due_date.substring(0, 7); 
    if (!acc[month]) acc[month] = [];
    acc[month].push(transaction);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedTransactions).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  const getTotalPending = () => {
    return filteredTransactions
      .filter(t => t.status === "pendente")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getDueThisWeek = () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    return filteredTransactions
      .filter(t => {
        const dueDate = new Date(t.due_date);
        return t.status === "pendente" && dueDate >= today && dueDate <= nextWeek;
      })
      .reduce((sum, t) => sum + t.amount, 0);
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
                    {format(new Date(month), "MMMM 'de' yyyy", { locale: ptBR })}
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
                        {format(new Date(transaction.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {transaction.amount.toFixed(2)}
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
                                onClick={() => handleStatusChange(transaction, 'pago')}
                                title="Marcar como pago"
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
        <DialogContent className="sm:max-w-[500px]">
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
                  onChange={(e) => setNewTransaction({...newTransaction, due_date: e.target.value})}
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
                    onChange={(e) => setNewTransaction({...newTransaction, recurrence_end_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recorrência Automática</Label>
                  <Select
                    value={newTransaction.is_auto_recurring}
                    onValueChange={(value) => setNewTransaction({...newTransaction, is_auto_recurring: value})}
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
      <RateLimitHandler />
    </div>
  );
}
