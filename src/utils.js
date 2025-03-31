// Funções utilitárias

// Função para criar URLs de páginas
export function createPageUrl(pageName, params) {
  // Mapeamento de nomes de páginas para rotas
  const routes = {
    Dashboard: '/dashboard',
    Appointments: '/appointments',
    Clients: '/clients',
    ClientDetails: '/client-details',
    ClientPackages: '/client-packages',
    ClientPortal: '/client-portal',
    ClientReturns: '/client-returns',
    SalesRegister: '/sales-register',
    CashRegister: '/cash-register',
    Products: '/products',
    Services: '/services',
    Packages: '/packages',
    GiftCards: '/gift-cards',
    Financial: '/financial',
    Reports: '/reports',
    Employees: '/employees',
    Roles: '/roles',
    Settings: '/settings',
    Suppliers: '/suppliers',
    Birthdays: '/birthdays',
    Inventory: '/inventory',
    Subscriptions: '/subscriptions',
    AccountsPayable: '/accounts-payable',
    AccountsReceivable: '/accounts-receivable',
    PaymentMethods: '/payment-methods',
    DataManager: '/data-manager',
    'contract-templates': '/contract-templates',
    AnamneseTemplates: '/anamnese-templates',
    Users: '/users',
    Login: '/login',
    Public: '/'
  };

  // Obter a rota base
  const route = routes[pageName] || '/';
  
  // Se não houver parâmetros, retornar a rota base
  if (!params) return route;
  
  // Se params for uma string, assumir que já está formatado como query string
  if (typeof params === 'string') {
    return `${route}?${params}`;
  }
  
  // Se params for um objeto, converter para query string
  if (typeof params === 'object') {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return `${route}?${queryString}`;
  }
  
  return route;
}

// Outras funções utilitárias podem ser adicionadas aqui
