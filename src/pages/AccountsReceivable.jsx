import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { FinancialTransaction, Client } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function AccountsReceivable() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("due_date");
  const [sortDirection, setSortDirection] = useState("asc");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Usar Promise.allSettled para evitar que uma falha interrompa a outra requisição
      const results = await Promise.allSettled([
        FinancialTransaction.list(),
        Client.list()
      ]);
      
      // Processar resultados de transações
      let transactionsData = [];
      if (results[0].status === 'fulfilled') {
        transactionsData = results[0].value;
      } else {
        console.error("Erro ao carregar transações:", results[0].reason);
        throw results[0].reason;
      }
      
      // Processar resultados de clientes
      let clientsData = [];
      if (results[1].status === 'fulfilled') {
        clientsData = results[1].value;
      } else {
        console.warn("Erro ao carregar clientes:", results[1].reason);
        // Não interrompemos completamente se os clientes falharem
      }
      
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

  // Adicionar função para simular dados caso ocorra erro de carregamento
  const generateDummyData = () => {
    const today = new Date();
    const dummyData = [
      {
        id: "dummy1",
        description: "Serviço de Limpeza de Pele",
        client_id: "client1",
        client_name: "Maria Silva",
        due_date: new Date().toISOString(),
        amount: 150.00,
        status: "pendente"
      },
      {
        id: "dummy2",
        description: "Massagem Terapêutica",
        client_id: "client2",
        client_name: "João Santos",
        due_date: new Date(today.setDate(today.getDate() + 5)).toISOString(),
        amount: 200.00,
        status: "pendente"
      },
      {
        id: "dummy3",
        description: "Pacote Facial Premium",
        client_id: "client3",
        client_name: "Ana Oliveira",
        due_date: new Date(today.setDate(today.getDate() - 5)).toISOString(),
        amount: 450.00,
        status: "pago"
      }
    ];
    
    return dummyData;
  };

  useEffect(() => {
    applyFilters();
  }, [statusFilter, dateFilter, searchTerm, clientFilter, transactions, sortField, sortDirection]);

  const applyFilters = () => {
    // Se não há transações, verifica se é por erro e gera dados de exemplo
    if (error && transactions.length === 0) {
      const dummyData = generateDummyData();
      setFilteredTransactions(dummyData);
      return;
    }
    
    let filtered = [...transactions];
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    const today = new Date();
    if (dateFilter === "today") {
      filtered = filtered.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate.toDateString() === today.toDateString();
      });
    } else if (dateFilter === "thisWeek") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      filtered = filtered.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate >= startOfWeek && dueDate <= endOfWeek;
      });
    } else if (dateFilter === "thisMonth") {
      filtered = filtered.filter(t => {
        const dueDate = new Date(t.due_date);
        return (
          dueDate.getMonth() === today.getMonth() && 
          dueDate.getFullYear() === today.getFullYear()
        );
      });
    } else if (dateFilter === "overdue") {
      filtered = filtered.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate < today && t.status === "pendente";
      });
    }
    
    if (clientFilter !== "all") {
      filtered = filtered.filter(t => t.client_id === clientFilter);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(search) ||
        t.client_name?.toLowerCase().includes(search)
      );
    }
    
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === "due_date") {
        aValue = new Date(a.due_date);
        bValue = new Date(b.due_date);
      } else if (sortField === "amount") {
        aValue = a.amount;
        bValue = b.amount;
      } else if (sortField === "client_name") {
        aValue = a.client_name;
        bValue = b.client_name;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredTransactions(filtered);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatStatus = (status) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "pago": return "Pago";
      case "cancelado": return "Cancelado";
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mr-2" />
        <p className="text-xl font-medium">Carregando contas a receber...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <RateLimitHandler error={error} onRetry={loadData}>
          <Card className="bg-yellow-50 border-yellow-200 mb-4">
            <CardContent className="pt-6">
              <p className="text-yellow-700 mb-2">
                Exibindo dados de exemplo devido a erro de carregamento. Clique em "Atualizar" para tentar novamente.
              </p>
            </CardContent>
          </Card>
        </RateLimitHandler>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contas a Receber</h1>
        <Button 
          variant="outline" 
          onClick={loadData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Data</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="thisWeek">Esta semana</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Cliente</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Descrição ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort("description")}
                >
                  <div className="flex items-center">
                    Descrição {getSortIcon("description")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort("client_name")}
                >
                  <div className="flex items-center">
                    Cliente {getSortIcon("client_name")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort("due_date")}
                >
                  <div className="flex items-center">
                    Vencimento {getSortIcon("due_date")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => toggleSort("amount")}
                >
                  <div className="flex items-center justify-end">
                    Valor {getSortIcon("amount")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => toggleSort("status")}
                >
                  <div className="flex items-center">
                    Status {getSortIcon("status")}
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma conta a receber encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell>{transaction.client_name}</TableCell>
                    <TableCell>
                      {transaction.due_date && format(new Date(transaction.due_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${transaction.status === 'pago' ? 'bg-green-100 text-green-800' : 
                            transaction.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}
                      >
                        {formatStatus(transaction.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Detalhes
                        </Button>
                        {transaction.status === 'pendente' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            Receber
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}