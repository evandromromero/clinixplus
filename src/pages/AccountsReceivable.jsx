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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { normalizeDate } from "@/utils/dateUtils";
import { ptBR } from "date-fns/locale";
import { Search, Filter, ChevronDown, ChevronUp, RefreshCw, FileText, Download, Printer, Plus, CalendarIcon, XCircle, Trash2, DollarSign, AlertCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Edit, X } from "lucide-react";
import { FinancialTransaction, Client, PaymentMethod, Sale } from "@/firebase/entities";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import RateLimitHandler from '@/components/RateLimitHandler';
import { toast } from "@/components/ui/use-toast";
import html2pdf from 'html2pdf.js';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AccountsReceivable() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para carregamento otimizado
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortField, setSortField] = useState("due_date");
  const [sortDirection, setSortDirection] = useState("asc");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [sales, setSales] = useState([]);

  // Estado para o diálogo de detalhes
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Estados para cancelamento de venda
  const [showCancelSaleDialog, setShowCancelSaleDialog] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelObservations, setCancelObservations] = useState('');

  // Estado para o diálogo de nova conta a receber
  const [showNewReceivableDialog, setShowNewReceivableDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    date: new Date(),
    payments: [{ method: '', amount: 0 }]
  });
  
  // Estado para o diálogo de edição de transação
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  // Estados antigos para busca de clientes (mantidos para compatibilidade)
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [clientSearchTimeout, setClientSearchTimeout] = useState(null);
  const [clientCache, setClientCache] = useState(new Map());

  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Estado para geração de recibo
  const [receiptHtml, setReceiptHtml] = useState('');
  const receiptRef = useRef(null);

  const handleDelete = async (transaction) => {
    try {
      if (!transaction) return;

      // Se tiver sale_id, abrir modal de cancelamento em vez de excluir diretamente
      if (transaction.sale_id) {
        setSaleToCancel({
          id: transaction.sale_id,
          transaction: transaction
        });
        setShowCancelSaleDialog(true);
        return;
      }

      // Para transações sem venda, manter o comportamento de exclusão
      if (!window.confirm('Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.')) {
        return;
      }

      await FinancialTransaction.delete(transaction.id);
      loadPageData();

      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
        variant: "success"
      });
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir transação. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancelSale = async () => {
    try {
      if (!saleToCancel || !cancelReason) {
        toast({
          title: "Erro",
          description: "Selecione um motivo para o cancelamento",
          variant: "destructive"
        });
        return;
      }

      // Simular dados do usuário (em produção, pegar do contexto de autenticação)
      const currentUser = {
        id: 'admin-user-id',
        nome: 'Administrador'
      };

      const cancelData = {
        motivo: cancelReason,
        observacoes: cancelObservations,
        usuario_id: currentUser.id,
        usuario_nome: currentUser.nome
      };

      const result = await Sale.cancelSale(saleToCancel.id, cancelData);

      if (result.success) {
        toast({
          title: "Sucesso",
          description: `Venda cancelada com sucesso. ${result.affectedItems.packages.length} pacote(s) e ${result.affectedItems.transactions.length} transação(ões) foram cancelados.`,
          variant: "success"
        });

        // Fechar modal e limpar estados
        setShowCancelSaleDialog(false);
        setSaleToCancel(null);
        setCancelReason('');
        setCancelObservations('');

        // Recarregar dados
        loadPageData();
      }
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleShowReceiveDialog = (transaction) => {
    setSelectedTransaction(transaction);
    setPaymentData({
      date: new Date(),
      payments: [{ method: '', amount: transaction.amount }]
    });
    setShowReceiveDialog(true);
  };

  const handleShowEditDialog = (transaction) => {
    // Preparar os dados da transação para edição
    let paymentDate;
    
    if (transaction.payment_date) {
      try {
        // Verificar se a data está no formato esperado
        if (transaction.payment_date.includes('T')) {
          // Formato ISO com timestamp (YYYY-MM-DDTHH:MM:SS)
          paymentDate = new Date(transaction.payment_date);
        } else if (transaction.payment_date.includes('-') && transaction.payment_date.split('-').length === 3) {
          // Formato YYYY-MM-DD
          const [year, month, day] = transaction.payment_date.split('-').map(Number);
          
          // Verificar se os componentes da data são válidos
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            // Criar uma data com os valores exatos, sem ajustes de fuso horário
            // Subtrair 1 do mês porque JavaScript usa mês de 0-11
            paymentDate = new Date(year, month - 1, day, 12, 0, 0, 0);
            console.log('Data carregada no modal (formato YYYY-MM-DD):', `${day}/${month}/${year}`);
          } else {
            throw new Error('Componentes da data inválidos');
          }
        } else {
          // Tentar criar a data diretamente
          paymentDate = new Date(transaction.payment_date);
          console.log('Data carregada no modal (formato alternativo):', paymentDate.toLocaleDateString());
        }
        
        // Verificar se a data é válida
        if (isNaN(paymentDate.getTime())) {
          throw new Error('Data inválida');
        }
      } catch (error) {
        console.error('Erro ao processar a data de pagamento:', error, transaction.payment_date);
        // Em caso de erro, usar a data atual
        paymentDate = new Date();
        paymentDate.setHours(12, 0, 0, 0);
      }
    } else {
      // Se não houver data de pagamento, usar a data atual
      paymentDate = new Date();
      paymentDate.setHours(12, 0, 0, 0);
    }
    
    setTransactionToEdit({
      ...transaction,
      edit_payment_method: transaction.payment_method || '',
      edit_payment_date: paymentDate
    });
    
    setShowEditDialog(true);
  };

  const handleAddPaymentMethod = () => {
    setPaymentData(prev => ({
      ...prev,
      payments: [...prev.payments, { method: '', amount: 0 }]
    }));
  };

  const handleRemovePaymentMethod = (index) => {
    setPaymentData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  const handlePaymentMethodChange = (index, field, value) => {
    setPaymentData(prev => {
      const newPayments = [...prev.payments];
      newPayments[index] = { ...newPayments[index], [field]: value };
      return { ...prev, payments: newPayments };
    });
  };

  const handleReceivePayment = async () => {
    try {
      if (!selectedTransaction) return;

      // Validar se todas as formas de pagamento foram selecionadas
      const hasEmptyMethod = paymentData.payments.some(p => !p.method);
      if (hasEmptyMethod) {
        toast({
          title: "Erro",
          description: "Selecione uma forma de pagamento para continuar",
          variant: "destructive"
        });
        return;
      }

      // Validar se o total dos pagamentos é igual ao valor da transação
      const totalPayments = paymentData.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      if (Math.abs(totalPayments - selectedTransaction.amount) > 0.01) {
        toast({
          title: "Erro",
          description: "O total dos pagamentos deve ser igual ao valor da transação",
          variant: "destructive"
        });
        return;
      }

      // Atualizar a transação
      await FinancialTransaction.update(selectedTransaction.id, {
        ...selectedTransaction,
        status: 'pago',
        payment_date: normalizeDate(paymentData.date),
        payment_methods: paymentData.payments
      });

      setShowReceiveDialog(false);
      loadPageData();

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o pagamento",
        variant: "destructive"
      });
    }
  };
  
  const handleSaveEdit = async () => {
    try {
      if (!transactionToEdit) return;
      
      // Preparar os dados atualizados
      const updatedData = {
        ...transactionToEdit,
        payment_method: transactionToEdit.edit_payment_method
      };
      
      // Se a transação já estiver paga, atualizar a data de pagamento
      if (transactionToEdit.status === 'pago' && transactionToEdit.edit_payment_date) {
        try {
          // Verificar se a data é válida
          const selectedDate = new Date(transactionToEdit.edit_payment_date);
          
          if (isNaN(selectedDate.getTime())) {
            throw new Error('Data inválida');
          }
          
          // Extrair apenas a data (dia, mês, ano) ignorando completamente a hora
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth() + 1; // JavaScript usa mês de 0-11, precisamos ajustar
          const day = selectedDate.getDate();
          
          // Formatar a data como string no formato YYYY-MM-DD sem componente de hora
          // Esta é a forma mais segura de armazenar apenas a data
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          // Armazenar a data sem nenhuma informação de hora
          updatedData.payment_date = formattedDate;
          
          console.log('Data selecionada para salvar:', formattedDate);
        } catch (error) {
          console.error('Erro ao processar a data de pagamento para salvar:', error);
          // Em caso de erro, usar a data atual formatada
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          updatedData.payment_date = `${year}-${month}-${day}`;
          console.log('Usando data atual como fallback:', updatedData.payment_date);
        }
      }
      
      // Remover campos temporários de edição
      delete updatedData.edit_due_date;
      delete updatedData.edit_payment_method;
      delete updatedData.edit_payment_date;
      
      // Atualizar no Firebase
      await FinancialTransaction.update(transactionToEdit.id, updatedData);
      
      // Atualizar o estado local imediatamente
      const updatedTransactions = transactions.map(t => {
        if (t.id === transactionToEdit.id) {
          // Criar um objeto atualizado com todos os dados formatados
          const sale = dataCache.current.sales.get(t.sale_id) || { items: [] };
          const client = dataCache.current.clients.get(t.client_id) || { name: 'Cliente não encontrado' };
          
          // Atualizar o objeto com os novos dados
          const updated = {
            ...t,
            ...updatedData,
            client_name: client.name,
            sale_items: sale.items,
            formatted_amount: formatCurrency(t.amount),
            formatted_due_date: t.due_date 
              ? format(new Date(t.due_date), 'dd/MM/yyyy', { locale: ptBR })
              : 'Sem data',
            status_class: getStatusClass(t.status),
            formatted_description: formatTransactionDescription(t, sale)
          };
          
          // Se for uma transação paga com data de pagamento, formatar a data
          if (updated.status === 'pago' && updated.payment_date) {
            updated.formatted_payment_date = format(new Date(updated.payment_date), 'dd/MM/yyyy', { locale: ptBR });
          }
          
          return updated;
        }
        return t;
      });
      
      // Atualizar o cache
      if (dataCache.current && dataCache.current.transactions) {
        const transactionIndex = dataCache.current.transactions.findIndex(t => t.id === transactionToEdit.id);
        if (transactionIndex !== -1) {
          dataCache.current.transactions[transactionIndex] = {
            ...dataCache.current.transactions[transactionIndex],
            ...updatedData
          };
        }
      }
      
      // Atualizar os estados
      setTransactions(updatedTransactions);
      
      // Aplicar os mesmos filtros que estão atualmente ativos
      const filtered = updatedTransactions.filter(transaction => {
        // Filtro por status
        if (statusFilter !== 'all' && transaction.status !== statusFilter) {
          return false;
        }
        
        // Filtro por cliente
        if (clientFilter !== 'all' && transaction.client_id !== clientFilter) {
          return false;
        }
        
        // Filtro por termo de busca (nome do cliente ou descrição)
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matchesName = transaction.client_name?.toLowerCase().includes(term);
          const matchesDescription = transaction.description?.toLowerCase().includes(term);
          if (!matchesName && !matchesDescription) {
            return false;
          }
        }
        
        // Filtro por data
        if (dateFilter !== 'all') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const dueDate = transaction.due_date ? new Date(transaction.due_date) : null;
          
          if (dateFilter === 'overdue') {
            // Vencidas: data de vencimento é anterior a hoje e status não é pago
            if (!dueDate || dueDate >= today || transaction.status === 'pago') {
              return false;
            }
          } else if (dateFilter === 'today') {
            // Hoje: data de vencimento é hoje
            if (!dueDate || dueDate.toDateString() !== today.toDateString()) {
              return false;
            }
          } else if (dateFilter === 'thisWeek') {
            // Esta semana: data de vencimento é entre hoje e 7 dias para frente
            if (!dueDate) return false;
            
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            
            if (dueDate < today || dueDate > nextWeek) {
              return false;
            }
          } else if (dateFilter === 'thisMonth') {
            // Este mês: data de vencimento é neste mês
            if (!dueDate) return false;
            
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            if (dueDate.getMonth() !== currentMonth || dueDate.getFullYear() !== currentYear) {
              return false;
            }
          }
        }
        
        return true;
      });
      
      setFilteredTransactions(filtered);
      setShowEditDialog(false);
      
      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a transação",
        variant: "destructive"
      });
    }
  };

  const [newReceivable, setNewReceivable] = useState({
    description: '',
    client_id: 'sem_cliente',
    amount: '',
    due_date: new Date(),
    payment_method: 'sem_metodo',
    category: 'outros',
    type: 'receita',
    status: 'pendente',
    notes: '',
    source: 'cliente' // Nova propriedade para indicar a origem do recebimento
  });


  // Referência para controlar se o componente está montado
  const isMounted = useRef(true);
  
  // Cache de dados para evitar recarregamentos desnecessários
  const dataCache = useRef({
    lastUpdate: null,
    transactions: [],
    clients: new Map(),
    sales: new Map(),
    paymentMethods: []
  });
  
  useEffect(() => {
    // Carregar dados na montagem do componente
    loadPageData(1, itemsPerPage);
    
    // Limpar referência quando o componente for desmontado
    return () => {
      isMounted.current = false;
    };
  }, []); // Executar apenas uma vez ao montar o componente

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    // Com paginação otimizada, os filtros devem ser aplicados no servidor
    // Por enquanto, usar transactions diretamente até implementar filtros no servidor
    setFilteredTransactions(transactions);
  }, [transactions]);

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Recarregar dados quando filtros mudarem
  useEffect(() => {
    // Invalidar cache para forçar recálculo dos filtros
    dataCache.current.allTransactions = null;
    setCurrentPage(1); // Voltar para primeira página ao filtrar
    loadPageData(1, itemsPerPage);
  }, [statusFilter, dateFilter, clientFilter, debouncedSearchTerm]);

  useEffect(() => {
    // Calcular paginação baseada no total de transações, não apenas as filtradas da página atual
    setTotalPages(Math.ceil(totalTransactions / itemsPerPage));
  }, [totalTransactions, itemsPerPage]);

  // Fechar dropdown de clientes ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showClientDropdown && !event.target.closest('.relative')) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClientDropdown]);

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

  const getStatusLabel = (status) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "pago": return "Pago";
      case "cancelada": return "Cancelado";
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pendente": return "bg-yellow-100 text-yellow-800";
      case "pago": return "bg-green-100 text-green-800";
      case "cancelada": return "bg-red-100 text-red-800";
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
      
      // Limpar o cache para forçar uma recarga completa
      dataCache.current = {
        lastUpdate: null,
        transactions: [],
        clients: new Map(),
        sales: new Map(),
        paymentMethods: []
      };
      
      toast({
        title: "Atualizando dados",
        description: "Buscando dados atualizados do servidor...",
        duration: 3000,
      });
      
      // Forçar recarga dos dados
      await loadData(true); // true = forçar atualização
      
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

      // Verificar se é uma transação combinada (com múltiplos métodos de pagamento)
      let paymentMethodsHtml = '';
      if (transaction.is_combined && transaction.payment_methods) {
        // Gerar HTML para a tabela de métodos de pagamento
        paymentMethodsHtml = `
          <h3 style="margin-top: 0;">FORMAS DE PAGAMENTO</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Método</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${transaction.payment_methods.map(method => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${method.name}</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${method.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        // Buscar o método de pagamento para transação normal
        const paymentMethod = paymentMethods.find(m => m.id === transaction.payment_method);
        const paymentMethodName = paymentMethod ? paymentMethod.name : 'Método não identificado';
        
        paymentMethodsHtml = `
          <h3 style="margin-top: 0;">FORMA DE PAGAMENTO</h3>
          <p><strong>${paymentMethodName}</strong></p>
          ${transaction.is_installment ? `<p>Parcelado em ${transaction.installments}x</p>` : ''}
        `;
      }

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
              ${paymentMethodsHtml}
              <p><strong>Status:</strong> ${getStatusLabel(transaction.status)}</p>
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

  const handleSaveNewReceivable = async () => {
    setIsLoading(true);

    try {
      // Validar campos obrigatórios
      if (!newReceivable.description) {
        toast.error("Por favor, informe uma descrição para a conta a receber.");
        setIsLoading(false);
        return;
      }

      if (!newReceivable.amount || parseFloat(newReceivable.amount) <= 0) {
        toast.error("Por favor, informe um valor válido para a conta a receber.");
        setIsLoading(false);
        return;
      }

      // Preparar os dados para salvar
      const receivableData = {
        description: newReceivable.description,
        amount: parseFloat(newReceivable.amount),
        type: newReceivable.type,
        category: newReceivable.category,
        status: newReceivable.status,
        payment_method_id: newReceivable.payment_method === "sem_metodo" ? null : newReceivable.payment_method,
        due_date: format(newReceivable.due_date, "yyyy-MM-dd"),
        payment_date: newReceivable.status === "pago" ? format(new Date(), "yyyy-MM-dd") : null,
        client_id: newReceivable.client_id === "sem_cliente" ? null : newReceivable.client_id,
        notes: newReceivable.notes,
        source: newReceivable.source
      };

      // Salvar no Firebase
      await FinancialTransaction.create(receivableData);
      
      toast.success("Conta a receber cadastrada com sucesso!");
      setShowNewReceivableDialog(false);
      
      // Resetar o formulário
      setNewReceivable({
        description: '',
        client_id: 'sem_cliente',
        amount: '',
        due_date: new Date(),
        payment_method: 'sem_metodo',
        category: 'outros',
        type: 'receita',
        status: 'pendente',
        notes: '',
        source: 'cliente'
      });

      // Recarregar os dados
      loadPageData();
    } catch (error) {
      console.error("Erro ao salvar conta a receber:", error);
      toast.error("Erro ao salvar conta a receber. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await PaymentMethod.list();
      setPaymentMethods(methods);
      return methods;
    } catch (error) {
      console.error('[AccountsReceivable] Erro ao carregar métodos de pagamento:', error);
      return [];
    }
  };

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setClientFilter("all");
    setClientSearchTerm("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setShowClientDropdown(false);
  };

  // Função para buscar clientes
  const handleClientSearch = async (searchValue) => {
    setClientSearchTerm(searchValue);
    
    if (!searchValue || searchValue.length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }

    try {
      // Buscar nos clientes já carregados primeiro
      const filteredClients = clients.filter(client =>
        normalizeText(client.name).includes(normalizeText(searchValue))
      ).slice(0, 10);

      setClientSearchResults(filteredClients);
      setShowClientDropdown(true);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  // Função para selecionar cliente
  const handleSelectClient = (client) => {
    setClientFilter(client.id);
    setClientSearchTerm(client.name);
    setShowClientDropdown(false);
  };

  // Função para limpar seleção de cliente
  const handleClearClientFilter = () => {
    setClientFilter("all");
    setClientSearchTerm("");
    setShowClientDropdown(false);
  };

  // Função auxiliar para normalizar texto (remove acentos)
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  // Função para aplicar filtros e ordenação no servidor
  const applyServerSideFilters = (transactions) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Domingo
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Preparar o termo de busca normalizado
    const term = debouncedSearchTerm ? normalizeText(debouncedSearchTerm) : '';
    
    
    // Primeiro aplicar filtros
    const filtered = transactions.filter(t => {
      // Filtro de status
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      
      // Filtro de data (baseado na data de vencimento ou pagamento)
      if (dateFilter !== 'all') {
        let targetDate = null;
        
        // Priorizar data de pagamento se existir, senão usar data de vencimento
        if (t.payment_date) {
          targetDate = new Date(t.payment_date);
        } else if (t.due_date) {
          targetDate = new Date(t.due_date);
        }
        
        if (!targetDate) return false;
        
        targetDate.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            if (targetDate.getTime() !== today.getTime()) return false;
            break;
          case 'thisWeek':
            if (!(targetDate >= thisWeekStart && targetDate <= today)) return false;
            break;
          case 'thisMonth':
            if (!(targetDate >= thisMonthStart && targetDate <= today)) return false;
            break;
          case 'overdue':
            // Para vencidas, usar apenas data de vencimento
            const dueDate = t.due_date ? new Date(t.due_date) : null;
            if (!dueDate) return false;
            dueDate.setHours(0, 0, 0, 0);
            if (!(dueDate < today && t.status !== 'pago')) return false;
            break;
        }
      }
      
      // Filtro de cliente
      if (clientFilter !== 'all' && clientFilter !== 'sem_cliente' && t.client_id !== clientFilter) {
        return false;
      }
      
      // ✅ BUSCA MELHORADA - Usa cache e múltiplos campos
      if (term) {
        const searchMatches = [];
        
        // 1. Buscar na descrição
        if (t.description) {
          searchMatches.push(normalizeText(t.description).includes(term));
        }
        
        // 2. Buscar no nome do cliente (usando cache)
        if (t.client_id && dataCache.current.clients && dataCache.current.clients.has(t.client_id)) {
          const clientName = dataCache.current.clients.get(t.client_id).name;
          searchMatches.push(normalizeText(clientName).includes(term));
        }
        
        // 3. Buscar no valor (sem normalização para números)
        if (t.amount) {
          searchMatches.push(t.amount.toString().includes(debouncedSearchTerm));
        }
        
        // 4. Buscar na categoria
        if (t.category) {
          searchMatches.push(normalizeText(t.category.replace(/_/g, ' ')).includes(term));
        }
        
        // 5. Buscar no status
        if (t.status) {
          const statusText = t.status === 'pago' ? 'pago' : 
                            t.status === 'pendente' ? 'pendente' : 
                            t.status === 'vencido' ? 'vencido' : 
                            t.status === 'cancelada' ? 'cancelado' : t.status;
          searchMatches.push(normalizeText(statusText).includes(term));
        }
        
        // Retornar true se algum campo corresponder
        if (!searchMatches.some(match => match)) {
          return false;
        }
      }
      
      return true;
    });
    
    // ORDENAÇÃO: Mais recentes primeiro (data de pagamento prioritária)
    return filtered.sort((a, b) => {
      // Obter data de referência para ordenação (priorizar payment_date)
      const getDateForSort = (transaction) => {
        if (transaction.payment_date) {
          return new Date(transaction.payment_date);
        } else if (transaction.due_date) {
          return new Date(transaction.due_date);
        }
        return new Date(0); // Data muito antiga se não tiver nenhuma data
      };
      
      const dateA = getDateForSort(a);
      const dateB = getDateForSort(b);
      
      // Ordenar por data decrescente (mais recente primeiro)
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      
      // Se as datas forem iguais, priorizar transações com payment_date
      if (a.payment_date && !b.payment_date) return -1;
      if (!a.payment_date && b.payment_date) return 1;
      
      return 0;
    });
  };

  // Função OTIMIZADA para carregar apenas dados da página atual
  const loadPageData = async (page = currentPage, pageSize = itemsPerPage) => {
    if (!isMounted.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`[DEBUG] Carregando página ${page} com ${pageSize} itens por página`);
      
      // Carregar métodos de pagamento (só uma vez)
      if (!dataCache.current.paymentMethods) {
        const paymentMethodsData = await PaymentMethod.list();
        dataCache.current.paymentMethods = paymentMethodsData;
        setPaymentMethods(paymentMethodsData);
      }
      
      // Carregar TODAS as transações apenas para contagem (sem dados relacionados)
      let allTransactions = dataCache.current.allTransactions;
      if (!allTransactions) {
        console.log('[DEBUG] Primeira carga: buscando todas as transações...');
        const transactionsData = await FinancialTransaction.filter({ type: 'receita' });
        allTransactions = transactionsData.filter(t => t.type === 'receita' && t.category !== 'abertura_caixa');
        dataCache.current.allTransactions = allTransactions;
      }
      
      // APLICAR FILTROS E ORDENAÇÃO NO SERVIDOR
      const filteredTransactions = applyServerSideFilters(allTransactions);
      setTotalTransactions(filteredTransactions.length);
      
      console.log(`[DEBUG] Transações filtradas e ordenadas: ${filteredTransactions.length} de ${allTransactions.length}`);
      
      // Calcular transações da página atual (já filtradas)
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageTransactions = filteredTransactions.slice(startIndex, endIndex);
      
      console.log(`[DEBUG] Mostrando transações ${startIndex + 1}-${Math.min(endIndex, allTransactions.length)} de ${allTransactions.length}`);
      
      // Coletar apenas IDs necessários para esta página
      const clientIds = new Set();
      const saleIds = new Set();
      
      pageTransactions.forEach(transaction => {
        if (transaction.client_id) clientIds.add(transaction.client_id);
        if (transaction.sale_id) saleIds.add(transaction.sale_id);
      });
      
      console.log(`[DEBUG] Página precisa de: ${clientIds.size} clientes, ${saleIds.size} vendas`);
      
      // Inicializar caches
      if (!dataCache.current.clients) dataCache.current.clients = new Map();
      if (!dataCache.current.sales) dataCache.current.sales = new Map();
      
      // Função para carregar apenas dados não cacheados
      const loadMissingData = async (ids, entityType) => {
        const idArray = Array.from(ids);
        const Entity = entityType === 'client' ? Client : Sale;
        const collectionName = entityType === 'client' ? 'clients' : 'sales';
        const cacheMap = dataCache.current[entityType === 'client' ? 'clients' : 'sales'];
        
        const missingIds = idArray.filter(id => !cacheMap.has(id));
        
        if (missingIds.length > 0) {
          console.log(`[DEBUG] Carregando ${missingIds.length} ${entityType}s em falta`);
          
          // Dividir em chunks de 10 para WHERE IN
          for (let i = 0; i < missingIds.length; i += 10) {
            const chunk = missingIds.slice(i, i + 10);
            
            try {
              const q = query(
                collection(db, collectionName),
                where('__name__', 'in', chunk)
              );
              
              const snapshot = await getDocs(q);
              snapshot.docs.forEach(doc => {
                const item = { id: doc.id, ...doc.data() };
                cacheMap.set(item.id, item);
              });
              
            } catch (error) {
              console.warn(`[WARN] Erro no WHERE IN, usando fallback individual para ${entityType}s`);
              // Fallback: carregar individualmente
              for (const id of chunk) {
                try {
                  const item = await Entity.get(id);
                  if (item) cacheMap.set(item.id, item);
                } catch (err) {
                  console.warn(`[WARN] Erro ao carregar ${entityType} ${id}`);
                }
              }
            }
          }
        }
      };
      
      // Carregar apenas dados em falta
      await Promise.all([
        loadMissingData(clientIds, 'client'),
        loadMissingData(saleIds, 'sale')
      ]);
      
      // Processar transações da página com dados carregados
      const processedTransactions = pageTransactions.map(transaction => {
        const client = dataCache.current.clients.get(transaction.client_id) || { name: 'Cliente não encontrado' };
        const sale = dataCache.current.sales.get(transaction.sale_id) || { items: [] };
        
        return {
          ...transaction,
          client_name: client.name,
          client_phone: client.phone,
          sale_items: sale.items || []
        };
      });
      
      // Atualizar estados
      setTransactions(processedTransactions);
      setClients(Array.from(dataCache.current.clients.values()));
      setSales(Array.from(dataCache.current.sales.values()));
      
      console.log(`[DEBUG] ✅ Página ${page} carregada: ${processedTransactions.length} transações`);
      
    } catch (error) {
      console.error('[ERROR] Erro ao carregar página:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (forceRefresh = false) => {
    // Função mantida para compatibilidade - redireciona para loadPageData
    return loadPageData();
  };

  // Função para mudar de página com melhor performance
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Carregar dados da nova página
    loadPageData(page, itemsPerPage);
    
    // Rolar para o topo da tabela quando mudar de página
    window.scrollTo({ top: document.querySelector('table')?.offsetTop - 100 || 0, behavior: 'smooth' });
  };

  // Função para mudar o número de itens por página
  const handleItemsPerPageChange = (value) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Voltar para a primeira página ao mudar itens por página
    // Carregar dados com novo tamanho de página
    loadPageData(1, newItemsPerPage);
  };

  // Com paginação otimizada, transactions já contém apenas os dados da página atual
  const currentPageItems = transactions;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Contas a Receber</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              disabled={true}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Conta a Receber
            </Button>
            <Button 
              variant="outline" 
              disabled={true}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Atualizando...
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 opacity-50">
              {/* Esqueletos de filtros */}
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mr-2" />
              <p className="text-xl font-medium">Carregando contas a receber...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Contas a Receber</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowNewReceivableDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Conta a Receber
          </Button>
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
          <div className="flex justify-between items-center">
            <CardTitle>Filtros</CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {totalTransactions > 0 && (
                  <span>
                    {transactions.length} de {totalTransactions} transações
                    {debouncedSearchTerm && ` • Buscando: "${debouncedSearchTerm}"`}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Limpar Filtros
              </Button>
            </div>
          </div>
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
                  <SelectItem value="cancelada">Cancelado</SelectItem>
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
            
            <div className="relative">
              <label className="text-sm font-medium mb-1 block">Cliente</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => handleClientSearch(e.target.value)}
                  onFocus={() => clientSearchTerm.length >= 2 && setShowClientDropdown(true)}
                  className="pl-8 pr-8"
                />
                {clientSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearClientFilter}
                    className="absolute right-1 top-1 h-auto p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Dropdown de resultados */}
              {showClientDropdown && clientSearchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                      onClick={() => {
                        setClientFilter("all");
                        setClientSearchTerm("");
                        setShowClientDropdown(false);
                      }}
                    >
                      Todos os clientes
                    </div>
                    {clientSearchResults.map(client => (
                      <div
                        key={client.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded"
                        onClick={() => handleSelectClient(client)}
                      >
                        {client.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Descrição, cliente, valor, categoria, status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1 top-1 h-auto p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {/* Feedback de busca */}
              {debouncedSearchTerm && (
                <div className="text-xs text-gray-500 mt-1">
                  Buscando por "{debouncedSearchTerm}"...
                </div>
              )}
              {searchTerm !== debouncedSearchTerm && searchTerm && (
                <div className="text-xs text-blue-500 mt-1">
                  Digitando...
                </div>
              )}
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
                  className="cursor-pointer"
                  onClick={() => toggleSort("payment_date")}
                >
                  <div className="flex items-center">
                    Data Pagamento {getSortIcon("payment_date")}
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#294380]"></div>
                      <p className="mt-2 text-gray-500">Carregando transações...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentPageItems.length > 0 ? (
                currentPageItems.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.formatted_description}</div>
                      <div className="text-xs text-gray-500">{transaction.category.replace(/_/g, ' ')}</div>
                    </TableCell>
                    <TableCell>{transaction.client_name || '-'}</TableCell>
                    <TableCell>
                      {transaction.due_date ? format(new Date(transaction.due_date), "dd/MM/yyyy") : '-'}
                    </TableCell>
                    <TableCell>
                      {transaction.payment_date && transaction.status === 'pago' 
                        ? (() => {
                            try {
                              // Verificar se a data está no formato antigo (com T ou Z)
                              if (transaction.payment_date.includes('T') || transaction.payment_date.includes('Z')) {
                                // Extrair apenas a data (DD/MM/YYYY) de forma segura
                                const date = new Date(transaction.payment_date);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              } else if (transaction.payment_date.includes('-')) {
                                // Formato YYYY-MM-DD (novo formato)
                                const [year, month, day] = transaction.payment_date.split('-');
                                return `${day}/${month}/${year}`;
                              } else {
                                // Tenta exibir a data como está
                                return transaction.payment_date;
                              }
                            } catch (error) {
                              console.error('Erro ao formatar data:', error);
                              return transaction.payment_date || '-';
                            }
                          })() 
                        : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusClass(transaction.status)}>
                        {getStatusLabel(transaction.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {transaction.status === 'pendente' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowReceiveDialog(transaction)}
                            title="Receber pagamento"
                          >
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShowEditDialog(transaction)}
                          title="Editar transação"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            generateReceipt(transaction);
                            setShowDetailsDialog(true);
                          }}
                          title="Ver detalhes"
                        >
                          <FileText className="h-4 w-4 text-[#294380]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="h-6 w-6 text-gray-400 mb-2" />
                      <p className="text-gray-500">Nenhuma transação encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Controles de paginação */}
      {filteredTransactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} a {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length} transações
            </span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">por página</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Botões de página */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Lógica para mostrar as páginas ao redor da página atual
              let pageNum;
              if (totalPages <= 5) {
                // Se tivermos 5 ou menos páginas, mostrar todas
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                // Se estivermos nas primeiras páginas
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                // Se estivermos nas últimas páginas
                pageNum = totalPages - 4 + i;
              } else {
                // Se estivermos no meio
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className={currentPage === pageNum ? "bg-[#294380]" : ""}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
                      {getStatusLabel(selectedTransaction.status)}
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
                  
                  {/* Exibir métodos de pagamento para transações combinadas */}
                  {selectedTransaction.is_combined && selectedTransaction.payment_methods && (
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium mb-2">Métodos de Pagamento</h3>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left pb-2">Método</th>
                              <th className="text-right pb-2">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTransaction.payment_methods.map((method, index) => (
                              <tr key={index} className="border-b border-gray-200 last:border-0">
                                <td className="py-2">{method.name}</td>
                                <td className="py-2 text-right">{formatCurrency(method.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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

      {/* Diálogo de Nova Conta a Receber */}
      <Dialog open={showNewReceivableDialog} onOpenChange={setShowNewReceivableDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newReceivable.description}
                onChange={(e) => setNewReceivable({...newReceivable, description: e.target.value})}
                placeholder="Descrição da conta a receber"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={newReceivable.category}
                  onValueChange={(value) => setNewReceivable({...newReceivable, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
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
                  value={newReceivable.amount}
                  onChange={(e) => setNewReceivable({...newReceivable, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    handleClientSearch(e.target.value);
                  }}
                />
                
                {clientSearchTerm.length >= 2 && (
                  <div className="border rounded-md max-h-[200px] overflow-y-auto">
                    {isSearchingClients ? (
                      <div className="p-2 text-center text-sm text-gray-500">Buscando...</div>
                    ) : clientSearchResults.length > 0 ? (
                      <div className="divide-y">
                        {clientSearchResults.map(client => (
                          <div 
                            key={client.id} 
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setNewReceivable({...newReceivable, client_id: client.id});
                              setClientSearchTerm(client.name);
                              setClientSearchResults([]);
                            }}
                          >
                            <div className="font-medium">{client.name}</div>
                            <div className="text-xs text-gray-500">
                              {client.email || ''} {client.cpf ? `• CPF: ${client.cpf}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={newReceivable.notes}
                onChange={(e) => setNewReceivable({...newReceivable, notes: e.target.value})}
                placeholder="Observações adicionais sobre esta conta a receber"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewReceivableDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveNewReceivable}
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de Recebimento */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Receber Pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(paymentData.date, 'dd/MM/yyyy', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentData.date}
                    onSelect={(date) => setPaymentData(prev => ({ ...prev, date: date || new Date() }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Formas de Pagamento</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPaymentMethod}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {paymentData.payments.map((payment, index) => (
                <div key={index} className="grid grid-cols-[1fr,120px,40px] gap-2 items-start">
                  <Select
                    value={payment.method}
                    onValueChange={(value) => handlePaymentMethodChange(index, 'method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => handlePaymentMethodChange(index, 'amount', parseFloat(e.target.value))}
                    className="w-[120px]"
                  />
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePaymentMethod(index)}
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}

              {selectedTransaction && (
                <div className="flex justify-between text-sm font-medium">
                  <span>Total da Transação:</span>
                  <span>{formatCurrency(selectedTransaction.amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-medium">
                <span>Total Informado:</span>
                <span className={`${Math.abs(paymentData.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) - (selectedTransaction?.amount || 0)) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(paymentData.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReceivePayment}
              disabled={paymentData.payments.some(p => !p.method)}
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Transação */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            {/* Forma de Pagamento */}
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={transactionToEdit?.edit_payment_method || ''}
                onValueChange={(value) => setTransactionToEdit(prev => ({
                  ...prev,
                  edit_payment_method: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Data de Pagamento (apenas se a transação estiver paga) */}
            {transactionToEdit?.status === 'pago' && (
              <div className="space-y-2">
                <Label>Data de Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionToEdit?.edit_payment_date 
                        ? (() => {
                            try {
                              const date = new Date(transactionToEdit.edit_payment_date);
                              if (isNaN(date.getTime())) {
                                return 'Selecione uma data';
                              }
                              return format(date, 'dd/MM/yyyy', { locale: ptBR });
                            } catch (error) {
                              console.error('Erro ao formatar data para exibição:', error);
                              return 'Selecione uma data';
                            }
                          })()
                        : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionToEdit?.edit_payment_date}
                      onSelect={(date) => {
                        if (date) {
                          // Criar uma nova data com o fuso horário local
                          const selectedDate = new Date(date);
                          // Ajustar para meio-dia para evitar problemas de fuso horário
                          selectedDate.setHours(12, 0, 0, 0);
                          
                          setTransactionToEdit(prev => ({
                            ...prev,
                            edit_payment_date: selectedDate
                          }));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento de Venda */}
      <Dialog open={showCancelSaleDialog} onOpenChange={setShowCancelSaleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Cancelar Venda
            </DialogTitle>
            <DialogDescription>
              Esta ação irá cancelar a venda e todos os itens relacionados (pacotes, transações). 
              Os dados serão mantidos para auditoria, mas marcados como cancelados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo do Cancelamento *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitacao_cliente">Solicitação do Cliente</SelectItem>
                  <SelectItem value="problema_pagamento">Problema de Pagamento</SelectItem>
                  <SelectItem value="servico_indisponivel">Serviço Indisponível</SelectItem>
                  <SelectItem value="erro_dados">Erro nos Dados</SelectItem>
                  <SelectItem value="duplicacao">Venda Duplicada</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Observações (Opcional)</Label>
              <Textarea 
                value={cancelObservations}
                onChange={(e) => setCancelObservations(e.target.value)}
                placeholder="Descreva detalhes sobre o cancelamento..."
                rows={3}
              />
            </div>
            
            {saleToCancel && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Itens que serão cancelados:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Venda ID: {saleToCancel.id}</li>
                  <li>• Transação: {saleToCancel.transaction?.description}</li>
                  <li>• Valor: R$ {saleToCancel.transaction?.amount?.toFixed(2)}</li>
                  <li>• Pacotes relacionados serão cancelados automaticamente</li>
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelSaleDialog(false);
                setSaleToCancel(null);
                setCancelReason('');
                setCancelObservations('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSale}
              disabled={!cancelReason}
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}