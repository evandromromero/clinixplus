import React, { useState, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter, ChevronDown, ChevronUp, RefreshCw, FileText, Download, Printer } from "lucide-react";
import { FinancialTransaction, Client, PaymentMethod, Sale } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';
import { toast } from "@/components/ui/use-toast";
import html2pdf from 'html2pdf.js';

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
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [sales, setSales] = useState([]);

  // Estado para o diálogo de detalhes
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [receiptHtml, setReceiptHtml] = useState('');
  const receiptRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      console.log('[AccountsReceivable] Carregando métodos de pagamento...');
      const methods = await PaymentMethod.list();
      console.log(`[AccountsReceivable] ${methods.length} métodos de pagamento carregados`);
      setPaymentMethods(methods);
      return methods;
    } catch (error) {
      console.error('[AccountsReceivable] Erro ao carregar métodos de pagamento:', error);
      return [];
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[AccountsReceivable] Carregando dados...');
      
      // Carrega as transações (agora exclusivamente do Firebase)
      console.log('[AccountsReceivable] Buscando transações financeiras...');
      const transactionsData = await FinancialTransaction.list();
      console.log(`[AccountsReceivable] ${transactionsData.length} transações encontradas`);
      
      // Carrega os clientes para enriquecer as transações
      console.log('[AccountsReceivable] Buscando clientes...');
      const clientsData = await Client.list();
      console.log(`[AccountsReceivable] ${clientsData.length} clientes encontrados`);
      setClients(clientsData);
      
      // Carrega os métodos de pagamento
      console.log('[AccountsReceivable] Buscando métodos de pagamento...');
      const paymentMethodsData = await PaymentMethod.list();
      console.log(`[AccountsReceivable] ${paymentMethodsData.length} métodos de pagamento encontrados`);
      setPaymentMethods(paymentMethodsData);
      
      // Carrega as vendas para enriquecer as transações com informações detalhadas
      console.log('[AccountsReceivable] Buscando vendas...');
      const salesData = await Sale.list();
      console.log(`[AccountsReceivable] ${salesData.length} vendas encontradas`);
      setSales(salesData);
      
      // Mapeamento de clientes por ID para facilitar o acesso
      const clientsMap = clientsData.reduce((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {});
      
      // Mapeamento de vendas por ID para facilitar o acesso
      const salesMap = salesData.reduce((acc, sale) => {
        acc[sale.id] = sale;
        return acc;
      }, {});
      
      // Criar um mapa de métodos de pagamento para facilitar a busca
      const paymentMethodsMap = paymentMethodsData.reduce((acc, method) => {
        acc[method.id] = method;
        return acc;
      }, {});
      
      console.log('[AccountsReceivable] Mapa de métodos de pagamento:', paymentMethodsMap);
      
      // Processa as transações para exibição
      console.log('[AccountsReceivable] Processando transações para exibição...');
      
      // Log de todas as transações antes do filtro
      console.log('[AccountsReceivable] Todas as transações:', transactionsData.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        payment_method: t.payment_method,
        is_installment: t.is_installment,
        amount: t.amount,
        sale_id: t.sale_id
      })));
      
      const processedTransactions = transactionsData
        .filter(transaction => {
          // Filtra transações a receber:
          // 1. Transações do tipo receita que não estão pagas
          // 2. Transações com cartão de crédito (que são a prazo)
          // 3. Transações marcadas como parceladas (is_installment)
          // 4. TODAS as transações do tipo receita (para mostrar histórico)
          // 5. Excluir aberturas de caixa
          const paymentMethodId = transaction.payment_method || '';
          const paymentMethod = paymentMethodsMap[paymentMethodId];
          
          // Verifica se é um cartão de crédito baseado no método de pagamento do Firebase
          const isCredit = paymentMethod ? 
            (paymentMethod.name && (
              paymentMethod.name.toLowerCase().includes('crédito') || 
              paymentMethod.name.toLowerCase().includes('credito')
            )) : false;
          
          // Mostra todas as transações do tipo receita, exceto aberturas de caixa
          const isOpeningTransaction = transaction.category === 'abertura_caixa';
          const shouldInclude = transaction.type === 'receita' && !isOpeningTransaction;
          
          // Log para cada transação avaliada
          console.log(`[AccountsReceivable] Avaliando transação ${transaction.id}:`, {
            type: transaction.type,
            status: transaction.status,
            payment_method: paymentMethodId,
            payment_method_name: paymentMethod ? paymentMethod.name : 'Desconhecido',
            isCredit,
            is_installment: transaction.is_installment,
            shouldInclude
          });
          
          return shouldInclude;
        })
        .map(transaction => {
          // Enriquece a transação com dados do cliente
          const client = clientsMap[transaction.client_id] || { name: 'Cliente não encontrado' };
          const sale = salesMap[transaction.sale_id] || { items: [] };
          
          return {
            ...transaction,
            client_name: client.name,
            sale_items: sale.items,
            formatted_amount: formatCurrency(transaction.amount),
            formatted_due_date: transaction.due_date 
              ? format(new Date(transaction.due_date), 'dd/MM/yyyy', { locale: ptBR })
              : 'Sem data',
            status_class: getStatusClass(transaction.status),
            // Formata a descrição para mostrar informações mais úteis
            formatted_description: formatTransactionDescription(transaction, sale)
          };
        });
      
      // Log após o processamento
      console.log('[AccountsReceivable] Transações processadas:', processedTransactions.length);
      
      setTransactions(processedTransactions);
      setFilteredTransactions(processedTransactions);
      console.log('[AccountsReceivable] Dados carregados com sucesso');
    } catch (error) {
      console.error('[AccountsReceivable] Erro ao carregar dados:', error);
      setError(error);
      
      // Exibe mensagem de erro para o usuário
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as transações. Tente novamente mais tarde.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Aplicar filtros quando os critérios mudarem
    if (!transactions.length) return;
    
    console.log('[AccountsReceivable] Aplicando filtros...');
    console.log('[AccountsReceivable] Filtros atuais:', { statusFilter, dateFilter, clientFilter, searchTerm });
    console.log('[AccountsReceivable] Total de transações antes do filtro:', transactions.length);
    
    let filtered = [...transactions];
    
    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    // Filtro de data
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay()); // Domingo
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      filtered = filtered.filter(t => {
        if (!t.due_date) return false;
        
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            return dueDate.getTime() === today.getTime();
          case 'thisWeek':
            return dueDate >= thisWeekStart && dueDate <= today;
          case 'thisMonth':
            return dueDate >= thisMonthStart && dueDate <= today;
          case 'overdue':
            return dueDate < today;
          default:
            return true;
        }
      });
    }
    
    // Filtro de cliente
    if (clientFilter !== 'all') {
      filtered = filtered.filter(t => t.client_id === clientFilter);
    }
    
    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.client_name && t.client_name.toLowerCase().includes(term))
      );
    }
    
    // Ordenação - Modificando para ordenar por data mais recente primeiro
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === "due_date") {
        // Para datas, invertemos a comparação para mostrar as mais recentes primeiro
        aValue = a.due_date ? new Date(a.due_date) : new Date(0);
        bValue = b.due_date ? new Date(b.due_date) : new Date(0);
        
        // Inverte a ordenação para mostrar as datas mais recentes primeiro
        if (sortDirection === "asc") {
          return bValue - aValue; // Mais recentes primeiro
        } else {
          return aValue - bValue; // Mais antigas primeiro
        }
      } else if (sortField === "amount") {
        aValue = a.amount || 0;
        bValue = b.amount || 0;
      } else if (sortField === "client_name") {
        aValue = a.client_name || '';
        bValue = b.client_name || '';
      } else {
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    console.log('[AccountsReceivable] Total de transações após aplicar filtros:', filtered.length);
    setFilteredTransactions(filtered);
  }, [transactions, statusFilter, dateFilter, clientFilter, searchTerm, sortField, sortDirection]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

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

  const getStatusClass = (status) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "pago": return "bg-green-100 text-green-800";
      case "cancelado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatTransactionDescription = (transaction, sale) => {
    // Se não tiver venda associada ou não for do tipo venda
    if (!transaction.sale_id || transaction.category !== 'venda') {
      return transaction.description || 'Transação sem descrição';
    }
    
    // Se não tiver itens na venda
    if (!sale || !sale.items || sale.items.length === 0) {
      return transaction.description || 'Venda sem itens';
    }
    
    // Pega o primeiro item da venda para exibir na descrição
    const firstItem = sale.items[0];
    const itemName = firstItem.name || 'Item sem nome';
    const itemType = firstItem.type || '';
    
    // Formata o tipo do item para exibição
    let typeDisplay = '';
    switch (itemType.toLowerCase()) {
      case 'produto':
        typeDisplay = 'Produto';
        break;
      case 'serviço':
      case 'servico':
        typeDisplay = 'Serviço';
        break;
      case 'pacote':
        typeDisplay = 'Pacote';
        break;
      case 'gift_card':
        typeDisplay = 'Gift Card';
        break;
      case 'assinatura':
        typeDisplay = 'Assinatura';
        break;
      default:
        typeDisplay = itemType;
    }
    
    // Se tiver mais de um item, indica a quantidade total
    let additionalItems = '';
    if (sale.items.length > 1) {
      additionalItems = ` + ${sale.items.length - 1} item(s)`;
    }
    
    // Retorna a descrição formatada
    return `${typeDisplay}: ${itemName}${additionalItems}`;
  };

  const refreshFromSource = async () => {
    try {
      setIsLoading(true);
      
      // Marca para forçar atualização a partir da Base44
      localStorage.setItem('force_refresh_financial_transactions', 'true');
      localStorage.setItem('force_refresh_clients', 'true');
      
      toast({
        title: "Atualizando dados",
        description: "Buscando dados atualizados do servidor...",
        duration: 3000,
      });
      
      await loadData();
      
      toast({
        title: "Dados atualizados",
        description: "Os dados foram atualizados com sucesso.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReceipt = async (transaction) => {
    try {
      // Buscar a venda relacionada à transação
      const sale = sales.find(s => s.id === transaction.sale_id);
      if (!sale) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar os detalhes da venda.",
          variant: "destructive"
        });
        return;
      }

      // Buscar o método de pagamento
      const paymentMethod = paymentMethods.find(m => m.id === transaction.payment_method);
      const paymentMethodName = paymentMethod ? paymentMethod.name : 'Método não identificado';

      // Calcular o total dos itens
      const totalItems = sale.items.reduce((total, item) => {
        return total + (parseFloat(item.price) * (parseInt(item.quantity) || 1));
      }, 0);

      // Gerar o HTML do recibo
      const receiptHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h2 style="margin: 0;">MAGNIFIC</h2>
              <p style="margin: 5px 0; font-size: 14px;">Rua Eduardo Santos Pereira, 2221</p>
              <p style="margin: 5px 0; font-size: 14px;">Campo Grande MS 79020-170</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0;">RECIBO DE VENDA</h2>
              <p style="margin: 5px 0; font-size: 14px;">Nº ${transaction.sale_id}</p>
              <p style="margin: 5px 0; font-size: 14px;">Data: ${format(new Date(transaction.payment_date || transaction.due_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
          </div>

          <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">CLIENTE</h3>
            <p style="margin: 5px 0;"><strong>Nome:</strong> ${transaction.client_name}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qtd</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Valor Unit.</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity || 1}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R$ ${parseFloat(item.price).toFixed(2)}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">R$ ${(parseFloat(item.price) * (parseInt(item.quantity) || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f9f9f9;">
                <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>TOTAL</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>R$ ${parseFloat(transaction.amount).toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 48%;">
              <h3 style="margin-top: 0;">FORMA DE PAGAMENTO</h3>
              <p><strong>${paymentMethodName}</strong></p>
              ${transaction.is_installment ? `<p>Parcelado em ${transaction.installments}x</p>` : ''}
              <p><strong>Status:</strong> ${formatStatus(transaction.status)}</p>
            </div>
            <div style="width: 48%;">
              <h3 style="margin-top: 0;">INFORMAÇÕES ADICIONAIS</h3>
              <p><strong>Vendedor:</strong> ${transaction.employee_id || 'Não informado'}</p>
              <p><strong>Observações:</strong> ${transaction.notes || 'Nenhuma observação'}</p>
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Este documento não possui valor fiscal</p>
            <p>MAGNIFIC - Todos os direitos reservados</p>
          </div>
        </div>
      `;

      setReceiptHtml(receiptHtml);
    } catch (error) {
      console.error("[AccountsReceivable] Erro ao gerar recibo:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao gerar o recibo. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (!receiptRef.current) return;

    const opt = {
      margin: 1,
      filename: `recibo_${selectedTransaction.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
    };

    html2pdf().from(receiptRef.current).set(opt).save();
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(receiptRef.current.outerHTML);
    printWindow.print();
    printWindow.close();
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
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Contas a Receber</h2>
        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

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
                      {transaction.formatted_description}
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
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowDetailsDialog(true);
                        }}>
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
      
      {/* Diálogo de Detalhes da Transação */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransaction && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Descrição</h3>
                    <p>{selectedTransaction.formatted_description}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Cliente</h3>
                    <p>{selectedTransaction.client_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Valor</h3>
                    <p>{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Status</h3>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${selectedTransaction.status === 'pago' ? 'bg-green-100 text-green-800' : 
                          selectedTransaction.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}
                    >
                      {formatStatus(selectedTransaction.status)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Data de Vencimento</h3>
                    <p>{selectedTransaction.formatted_due_date}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Data de Pagamento</h3>
                    <p>
                      {selectedTransaction.payment_date 
                        ? format(new Date(selectedTransaction.payment_date), "dd/MM/yyyy")
                        : 'Não pago'}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => generateReceipt(selectedTransaction)}
                    disabled={!selectedTransaction.sale_id}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Recibo
                  </Button>
                </div>
                
                {receiptHtml && (
                  <div className="mt-6 border rounded-md p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Recibo da Venda</h3>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleDownloadReceipt}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handlePrintReceipt}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Imprimir
                        </Button>
                      </div>
                    </div>
                    <div 
                      ref={receiptRef}
                      className="max-h-[60vh] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: receiptHtml }} 
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}