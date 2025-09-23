
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizeDate } from "@/utils/dateUtils";
import { Plus, Search, AlertCircle, FileText, TrendingUp, CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { FinancialTransaction } from "@/api/entities";
import { Client } from "@/api/entities";
import { Sale } from "@/firebase/entities";
import { toast } from "@/components/ui/use-toast";

export default function AccountsReceivable() {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [showCancelSaleDialog, setShowCancelSaleDialog] = useState(false);
  const [transactionToCancel, setTransactionToCancel] = useState(null);
  const [cancelForm, setCancelForm] = useState({
    motivo: '',
    observacoes: ''
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newTransaction, setNewTransaction] = useState({
    type: "receita",
    category: "venda_servico",
    description: "",
    amount: 0,
    payment_method: "dinheiro",
    status: "pendente",
    due_date: format(new Date(), "yyyy-MM-dd"),
    payment_date: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [transactionsData, clientsData] = await Promise.all([
        FinancialTransaction.list(),
        Client.list()
      ]);
      
      const receivables = transactionsData.filter(t => 
        t.type === "receita" && 
        t.category !== "abertura_caixa" && 
        t.category !== "fechamento_caixa"
      );
      
      const enrichedTransactions = receivables.map(transaction => {
        const client = clientsData.find(c => c.id === transaction.client_id);
        return {
          ...transaction,
          client_name: client ? client.name : "Cliente não encontrado"
        };
      });
      
      setTransactions(enrichedTransactions);
      setFilteredTransactions(enrichedTransactions);
      setClients(clientsData);
      
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      await FinancialTransaction.create({
        ...newTransaction,
        due_date: normalizeDate(newTransaction.due_date),
        payment_date: newTransaction.status === 'pago' ? normalizeDate(new Date()) : null
      });
      setShowNewTransactionDialog(false);
      setNewTransaction({
        type: "receita",
        category: "venda_servico",
        description: "",
        amount: 0,
        payment_method: "dinheiro",
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
        payment_date: newStatus === 'pago' ? normalizeDate(new Date()) : null
      });
      loadData();
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  const handleCancelClick = (transaction) => {
    if (transaction.sale_id) {
      // Se tem venda relacionada, abrir modal de cancelamento completo
      setTransactionToCancel(transaction);
      setShowCancelSaleDialog(true);
    } else {
      // Se é transação avulsa, cancelar apenas a transação
      handleStatusChange(transaction, 'cancelado');
    }
  };

  const handleCancelSale = async () => {
    if (!transactionToCancel || !cancelForm.motivo) {
      toast({
        title: "Erro",
        description: "Selecione um motivo para o cancelamento",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      if (transactionToCancel.sale_id) {
        // Cancelar venda completa (cancela pacotes e transações automaticamente)
        await Sale.cancelSale(transactionToCancel.sale_id, {
          motivo: cancelForm.motivo,
          observacoes: cancelForm.observacoes,
          usuario_id: 'admin', // TODO: pegar do contexto de usuário
          usuario_nome: 'Administrador' // TODO: pegar do contexto de usuário
        });
        
        toast({
          title: "Venda Cancelada",
          description: "A venda e todos os itens relacionados foram cancelados com sucesso"
        });
      } else {
        // Cancelar apenas transação
        await handleStatusChange(transactionToCancel, 'cancelado');
        
        toast({
          title: "Transação Cancelada",
          description: "A transação foi cancelada com sucesso"
        });
      }
      
      // Fechar modal e limpar form
      setShowCancelSaleDialog(false);
      setTransactionToCancel(null);
      setCancelForm({ motivo: '', observacoes: '' });
      
      // Recarregar dados
      loadData();
      
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactionsData = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clients.find(c => c.id === transaction.client_id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const groupedTransactions = filteredTransactionsData.reduce((acc, transaction) => {
    // Garantir que estamos usando a data correta sem problemas de fuso horário
    const dateParts = transaction.due_date.split('T')[0].split('-');
    const month = `${dateParts[0]}-${dateParts[1]}`; // Formato YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(transaction);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedTransactions).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  const getTotalPending = () => {
    return filteredTransactionsData
      .filter(t => t.status === "pendente")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getDueThisWeek = () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    return filteredTransactionsData
      .filter(t => {
        // Criar data sem problemas de fuso horário
        const dateParts = t.due_date.split('T')[0].split('-').map(Number);
        const dueDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
        return t.status === "pendente" && dueDate >= today && dueDate <= nextWeek;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D0F36]">Contas a Receber</h3>
          <p className="text-[#294380] text-sm">Gerencie suas receitas e cobranças</p>
        </div>
        <Button 
          onClick={() => setShowNewTransactionDialog(true)}
          className="bg-[#294380] hover:bg-[#0D0F36]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-[#F1F6CE]/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Total a Receberr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">
              R$ {getTotalPending().toFixed(2)}
            </div>
            <div className="text-xs text-[#294380] flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              {filteredTransactionsData.filter(t => t.status === "pendente").length} contas pendentes
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-[#F1F6CE]/50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Previsão próx. 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">
              R$ {getDueThisWeek().toFixed(2)}
            </div>
            <div className="text-xs text-[#294380] flex items-center gap-1 mt-1">
              <CalendarIcon className="w-3 h-3" />
              Recebimentos próximos
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
            placeholder="Buscar por descrição ou cliente..."
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
              <TableHead>Cliente</TableHead>
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
                  const client = clients.find(c => c.id === transaction.client_id);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-500">{transaction.category.replace(/_/g, ' ')}</div>
                      </TableCell>
                      <TableCell>{client?.name || '-'}</TableCell>
                      <TableCell>
                        {transaction.due_date ? format(new Date(transaction.due_date.split('T')[0].split('-').map((v, i) => i === 1 ? parseInt(v) - 1 : parseInt(v))), "dd/MM/yyyy") : '-'}
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
                                title="Marcar como recebido"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelClick(transaction)}
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
            {filteredTransactionsData.length === 0 && (
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
            <DialogTitle>Nova Receita</DialogTitle>
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
                    <SelectItem value="venda_servico">Venda de Serviço</SelectItem>
                    <SelectItem value="venda_produto">Venda de Produto</SelectItem>
                    <SelectItem value="venda_pacote">Venda de Pacote</SelectItem>
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
              <Label>Cliente</Label>
              <Select
                value={newTransaction.client_id}
                onValueChange={(value) => setNewTransaction({...newTransaction, client_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
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

      {/* Modal de Cancelamento de Venda */}
      <Dialog open={showCancelSaleDialog} onOpenChange={setShowCancelSaleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              {transactionToCancel?.sale_id ? 'Cancelar Venda' : 'Cancelar Transação'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {transactionToCancel?.sale_id && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Esta ação irá cancelar a venda e todos os itens relacionados 
                  (pacotes, transações). Os dados serão mantidos para auditoria, mas marcados como cancelados.
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <Select 
                value={cancelForm.motivo} 
                onValueChange={(value) => setCancelForm(prev => ({ ...prev, motivo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solicitação do Cliente">Solicitação do Cliente</SelectItem>
                  <SelectItem value="Problema de Pagamento">Problema de Pagamento</SelectItem>
                  <SelectItem value="Erro na Venda">Erro na Venda</SelectItem>
                  <SelectItem value="Serviço Indisponível">Serviço Indisponível</SelectItem>
                  <SelectItem value="Duplicação">Duplicação</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="observacoes">Observações (Opcional)</Label>
              <textarea
                id="observacoes"
                className="w-full p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="Descreva detalhes sobre o cancelamento..."
                value={cancelForm.observacoes}
                onChange={(e) => setCancelForm(prev => ({ ...prev, observacoes: e.target.value }))}
              />
            </div>
            
            {transactionToCancel && (
              <div className="bg-gray-50 border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">Itens que serão cancelados:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Transação: {transactionToCancel.description}</li>
                  <li>• Valor: R$ {transactionToCancel.amount?.toFixed(2)}</li>
                  {transactionToCancel.sale_id && (
                    <li>• Pacotes relacionados serão cancelados automaticamente</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelSaleDialog(false);
                setTransactionToCancel(null);
                setCancelForm({ motivo: '', observacoes: '' });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCancelSale}
              disabled={!cancelForm.motivo || isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
