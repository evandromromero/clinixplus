/**
 * Função corrigida para gerar o HTML do relatório de caixa
 * Esta função corrige o layout da tabela de transações
 */
export function generateCorrectedReportHtml(
  cashData, 
  transactions, 
  paymentMethods, 
  getPaymentMethodTotals, 
  formatPaymentMethodsForReport,
  formatDate,
  ptBR,
  format
) {
  // Definir formatTime localmente para evitar dependência externa
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      // Se for string ISO, converter para objeto Date
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    } catch (e) {
      console.error("Erro ao formatar hora:", e, dateStr);
      return '-';
    }
  };
  if (!cashData || !transactions) return '';
  
  const paymentTotals = getPaymentMethodTotals(transactions);
  const totalReceitas = transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0);
  
  // Função para obter o nome formatado do método de pagamento
  const getPaymentMethodName = (methodId) => {
    if (!paymentMethods || paymentMethods.length === 0) {
      // Fallback para nomes padrão
      const defaultNames = {
        'pix': 'PIX',
        'dinheiro': 'DINHEIRO',
        'cartao_debito': 'DÉBITO',
        'cartao_credito': 'CRÉDITO',
        'link': 'LINK'
      };
      return defaultNames[methodId] || methodId;
    }
    
    // Procurar o método de pagamento pelo ID
    const method = paymentMethods.find(m => m.id === methodId);
    
    // Se encontrar, retornar o nome, senão retornar o ID
    return method ? method.name.toUpperCase() : methodId;
  };
  
  // Gerar cabeçalhos de métodos de pagamento dinamicamente
  const paymentMethodHeaders = Object.keys(paymentTotals).map(type => 
    `<th style="padding: 8px; border: 1px solid #ddd;">${getPaymentMethodName(type)}</th>`
  ).join('');
  
  // Gerar células de valores de métodos de pagamento dinamicamente
  const paymentMethodCells = Object.entries(paymentTotals).map(([type, total]) => 
    `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(total).toFixed(2)}</td>`
  ).join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <img src="/logo.png" alt="Logo" style="height: 50px;" />
        <div style="text-align: right;">
          <h2 style="margin: 0 0 10px 0;">DETALHAMENTO CAIXA</h2>
          <p style="margin: 0;">OPERADOR: ${cashData.opened_by || '-'}</p>
          <p style="margin: 0;">${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
        <tr style="background-color: #f0f0f0;">
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">ABERTURA</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">FECHAMENTO</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">R$ ABERTURA</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">R$ FECHAMENTO</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">QUEBRA</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(cashData.opened_at)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(cashData.closed_at)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(cashData.initial_amount || 0).toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">R$ ${Number(cashData.final_amount || 0).toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${Number(cashData.difference || 0) < 0 ? 'red' : 'green'};">
            R$ ${Number(cashData.difference || 0).toFixed(2)}
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 10px;">DETALHAMENTO DE ENTRADAS / TOTAL: R$ ${transactions.reduce((acc, t) => t.type === 'receita' ? acc + Number(t.amount) : acc, 0).toFixed(2)}</h3>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr style="background-color: #f0f0f0;">
            ${paymentMethodHeaders}
          </tr>
          <tr>
            ${paymentMethodCells}
          </tr>
        </table>
      </div>

      <h3 style="margin-bottom: 10px;">Transações do Dia</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tr style="background-color: #f0f0f0;">
          <th style="padding: 8px; border: 1px solid #ddd; width: 35%;">DESCRIÇÃO</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 10%;">REF.</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 15%;">VALOR</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">DATA</th>
          <th style="padding: 8px; border: 1px solid #ddd; width: 20%;">FORMA PGTO</th>
        </tr>
        ${transactions.map(t => {
          const categoryMap = {
            'venda_produto': 'PRODUTO',
            'venda_servico': 'SERVIÇO',
            'venda_pacote': 'PACOTE',
            'venda_gift_card': 'GIFT CARD',
            'venda_assinatura': 'ASSINATURA',
            'abertura_caixa': 'ABERTURA',
            'venda': 'VENDA'
          };

          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.description || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${categoryMap[t.category] || t.category || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${Number(t.amount || 0).toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatDate(t.payment_date)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatPaymentMethodsForReport(t)}</td>
            </tr>
          `;
        }).join('')}
      </table>

      <div style="margin-top: 50px; text-align: center;">
        <div style="border-top: 1px solid #000; display: inline-block; padding-top: 10px; min-width: 200px;">
          (Assinatura)
        </div>
      </div>

      <div style="margin-top: 30px; font-size: 12px; text-align: center;">
        <p style="margin: 5px 0;">MAGNIFIC</p>
        <p style="margin: 5px 0;">Rua Eduardo Santos Pereira, 2221 - Campo Grande MS 79020-170</p>
      </div>
    </div>
  `;
  return html;
}
