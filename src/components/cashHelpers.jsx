import { format } from "date-fns";

// Verifica se o caixa está aberto
export const isCashOpen = () => {
  return localStorage.getItem('cashIsOpen') === 'true';
};

// Obtém a data de abertura do caixa
export const getCashOpeningDate = () => {
  return localStorage.getItem('cashOpeningDate') || format(new Date(), "yyyy-MM-dd");
};

// Salva o status do caixa no localStorage
export const updateCashStatus = (isOpen, date = null) => {
  localStorage.setItem('cashIsOpen', isOpen ? 'true' : 'false');
  if (date) {
    localStorage.setItem('cashOpeningDate', date);
  } else if (!isOpen) {
    localStorage.removeItem('cashOpeningDate');
  }
};

// Formata um valor monetário para exibição
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

// Calcula o saldo em dinheiro com base nas transações
export const calculateCashBalance = (transactions, initialAmount = 0) => {
  const cashTransactions = transactions.filter(t => 
    t.payment_method === "dinheiro" &&
    t.category !== "abertura_caixa" &&
    t.category !== "fechamento_caixa" &&
    t.status === "pago"
  );
  
  const cashMovement = cashTransactions.reduce((total, t) => {
    return total + (t.type === "receita" ? t.amount : -t.amount);
  }, 0);
  
  return initialAmount + cashMovement;
};

// Filtra transações por data
export const filterTransactionsByDate = (transactions, date) => {
  const formattedDate = format(date, "yyyy-MM-dd");
  return transactions.filter(t => {
    const transactionDate = t.payment_date ? format(new Date(t.payment_date), "yyyy-MM-dd") : null;
    return transactionDate === formattedDate;
  });
};

// Encontra a abertura de caixa para uma data específica
export const findCashOpening = (transactions, date) => {
  const formattedDate = format(date, "yyyy-MM-dd");
  return transactions.find(t => 
    t.category === "abertura_caixa" && 
    format(new Date(t.payment_date), "yyyy-MM-dd") === formattedDate
  );
};

// Encontra o fechamento de caixa para uma data específica
export const findCashClosing = (transactions, date) => {
  const formattedDate = format(date, "yyyy-MM-dd");
  return transactions.find(t => 
    t.category === "fechamento_caixa" && 
    format(new Date(t.payment_date), "yyyy-MM-dd") === formattedDate
  );
};