
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
import { FinancialTransaction } from "@/api/entities";
import { Supplier } from "@/api/entities";

export default function AccountsPayable() {
  const [transactions, setTransactions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newTransaction, setNewTransaction] = useState({
    type: "despesa",
    category: "compra_produto",
    description: "",
    amount: 0,
    payment_method: "transferencia",
    status: "pendente",
    due_date: format(new Date(), "yyyy-MM-dd"),
    payment_date: null
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

  const handleCreateTransaction = async () => {
    try {
      await FinancialTransaction.create({
        ...newTransaction,
        payment_date: newTransaction.status === 'pago' ? format(new Date(), "yyyy-MM-dd") : null
      });
      setShowNewTransactionDialog(false);
      setNewTransaction({
        type: "despesa",
        category: "compra_produto",
        description: "",
        amount: 0,
        payment_method: "transferencia",
        status: "pendente",
        due_date: format(new Date(), "yyyy-MM-dd"),
        payment_date: null
      });
      loadData();
    } catch (error) {
      console.error("Error creating transaction:", error);
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (suppliers.find(s => s.id === transaction.supplier_id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;
    
    return matchesSearch && matchesStatus;
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

      <div className="grid gap-4 md:grid-cols-3">
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
                  onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value)})}
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
    </div>
  );
}
