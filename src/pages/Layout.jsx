import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { setupAdminRole } from '@/utils/setupAdminRole';
import { CompanySettings } from '@/firebase/entities';
import {
  LayoutGrid,
  CalendarDays,
  Users,
  Package,
  Scissors,
  Settings,
  Menu,
  ChevronDown,
  DollarSign,
  LogOut,
  PieChart,
  ShoppingBag,
  Truck,
  Home,
  User,
  X,
  Clock,
  Shield,
  Database,
  FolderPlus,
  Gift,
  Globe,
  Moon,
  Sun
} from "lucide-react";
import { User as UserEntity } from "@/api/entities";

export default function Layout() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Verificar se estamos em páginas públicas
  if (currentPath === "/" || currentPath === "/client-portal") {
    return <Outlet />;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [peopleMenuOpen, setPeopleMenuOpen] = useState(false);
  const [financialMenuOpen, setFinancialMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [cadastrosMenuOpen, setCadastrosMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [companySettings, setCompanySettings] = useState({});

  useEffect(() => {
    // Carregar dados do usuário logado
    const loadUserData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
          setCurrentUser(userData);
          
          // Carregar cargo do usuário para obter permissões
          if (userData.roleId) {
            // Importar a entidade Role diretamente do Firebase
            const { Role, SystemConfig } = await import('@/firebase/entities');
            try {
              const roleData = await Role.get(userData.roleId);
              if (roleData) {
                setUserRole(roleData);
                setUserPermissions(roleData.permissions || []);
              }
            } catch (roleError) {
              console.error("Erro ao carregar cargo:", roleError);
              
              // Verificar se o usuário é administrador
              const isAdmin = userData.email === 'admin@example.com' || userData.isAdmin;
              
              if (isAdmin) {
                try {
                  // Usar o script de configuração do cargo Administrador Geral
                  console.log('Executando script de configuração do cargo Administrador Geral...');
                  const adminRoleId = await setupAdminRole();
                  
                  // Recarregar o cargo após a configuração
                  if (adminRoleId) {
                    const adminRole = await Role.get(adminRoleId);
                    if (adminRole) {
                      setUserRole(adminRole);
                      setUserPermissions(adminRole.permissions || []);
                      console.log('Cargo Administrador Geral configurado com sucesso');
                    }
                  }
                } catch (setupError) {
                  console.error("Erro ao configurar cargo Administrador Geral:", setupError);
                  // Definir permissões de administrador mesmo sem o cargo
                  setUserPermissions(['admin', 'manage_users', 'manage_roles', 'manage_clients', 
                                     'manage_appointments', 'manage_services', 'manage_products', 
                                     'manage_sales', 'manage_finances', 'manage_settings',
                                     'manage_subscriptions', 'manage_gift_cards']);
                }
              } else {
                // Para usuários não-admin, definir permissões padrão básicas
                console.log('Definindo permissões básicas para usuário não-admin');
                setUserPermissions(['manage_clients', 'manage_appointments']);
              }
            }
          } else if (userData.email === 'admin@example.com' || userData.isAdmin) {
            // Se o usuário é admin mas não tem roleId, configurar o cargo Administrador Geral
            try {
              console.log('Usuário admin sem roleId, configurando cargo Administrador Geral...');
              const adminRoleId = await setupAdminRole();
              
              // Recarregar o cargo após a configuração
              if (adminRoleId) {
                const { Role } = await import('@/firebase/entities');
                const adminRole = await Role.get(adminRoleId);
                if (adminRole) {
                  setUserRole(adminRole);
                  setUserPermissions(adminRole.permissions || []);
                  console.log('Cargo Administrador Geral configurado com sucesso');
                }
              }
            } catch (setupError) {
              console.error("Erro ao configurar cargo Administrador Geral:", setupError);
              // Definir permissões de administrador mesmo sem o cargo
              setUserPermissions(['admin', 'manage_users', 'manage_roles', 'manage_clients', 
                                 'manage_appointments', 'manage_services', 'manage_products', 
                                 'manage_sales', 'manage_finances', 'manage_settings',
                                 'manage_subscriptions', 'manage_gift_cards']);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        // Garantir que o usuário tenha pelo menos algumas permissões básicas
        setUserPermissions(['manage_clients', 'manage_appointments']);
      }
    };
    
    loadUserData();
  }, []);

  useEffect(() => {
    // Carregar configurações da empresa
    const loadCompanySettings = async () => {
      try {
        const companySettingsData = await CompanySettings.get();
        if (companySettingsData) {
          setCompanySettings(companySettingsData);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações da empresa:", error);
      }
    };
    
    loadCompanySettings();
  }, []);

  useEffect(() => {
    // Aplicar tema escuro
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const menuItems = [
    { name: "Dashboard", icon: <Home className="w-5 h-5" />, url: "Dashboard", permission: "view_dashboard" },
    { name: "Agenda", icon: <CalendarDays className="w-5 h-5" />, url: "Appointments", permission: "manage_appointments" },
    {
      name: "Pessoas",
      icon: <Users className="w-5 h-5" />,
      permission: ["manage_clients", "manage_employees", "manage_suppliers", "manage_users", "view_birthdays", "manage_client_returns"],
      submenu: [
        { name: "Clientes", url: "Clients", permission: "manage_clients" },
        { name: "Funcionários", url: "Employees", permission: "manage_employees" },
        { name: "Fornecedores", url: "Suppliers", permission: "manage_suppliers" },
        { name: "Usuários", url: "Users", permission: "manage_users" },
        { name: "Aniversariantes", url: "Birthdays", permission: "view_birthdays" },
        { name: "Retornos", url: "ClientReturns", permission: "manage_client_returns" }
      ]
    },
    {
      name: "Cadastros",
      icon: <FolderPlus className="w-5 h-5" />,
      permission: ["manage_services", "manage_roles", "manage_products", "manage_payment_methods", "manage_contract_templates", "manage_anamnese_templates"],
      submenu: [
        { name: "Serviços", url: "Services", permission: "manage_services" },
        { name: "Cargos", url: "Roles", permission: "manage_roles" },
        { name: "Produtos", url: "Products", permission: "manage_products" },
        { name: "Formas de Pagamento", url: "PaymentMethods", permission: "manage_payment_methods" },
        { name: "Modelos de Contrato", url: "contract-templates", permission: "manage_contract_templates" },
        { name: "Modelos de Anamnese", url: "AnamneseTemplates", permission: "manage_anamnese_templates" }
      ]
    },
    { name: "Estoque", icon: <Package className="w-5 h-5" />, url: "Inventory", permission: "manage_inventory" },
    { name: "Pacotes", icon: <Package className="w-5 h-5" />, url: "Packages", permission: "manage_packages" },
    { name: "Pacotes de Clientes", icon: <User className="w-5 h-5" />, url: "ClientPackages", permission: "manage_client_packages" },
    { name: "Assinaturas", icon: <Clock className="w-5 h-5" />, url: "Subscriptions", permission: "manage_subscriptions" },
    { name: "Gift Cards", icon: <Gift className="w-5 h-5" />, url: "GiftCards", permission: "manage_gift_cards" },
    { name: "Vendas", icon: <ShoppingBag className="w-5 h-5" />, url: "SalesRegister", permission: "manage_sales" },
    {
      name: "Financeiro",
      icon: <DollarSign className="w-5 h-5" />,
      permission: ["manage_finances", "manage_accounts_payable", "manage_accounts_receivable", "manage_cash_register"],
      submenu: [
        { name: "Contas a Pagar", url: "AccountsPayable", permission: "manage_accounts_payable" },
        { name: "Contas a Receber", url: "AccountsReceivable", permission: "manage_accounts_receivable" },
        { name: "Caixa", url: "CashRegister", permission: "manage_cash_register" }
      ]
    },
    { name: "Relatórios", icon: <PieChart className="w-5 h-5" />, url: "Reports", permission: "view_reports" },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5" />,
      permission: ["manage_settings", "manage_data"],
      submenu: [
        { name: "Configurações Gerais", url: "Settings", permission: "manage_settings" },
        { name: "Gerenciador de Dados", url: "DataManager", permission: "manage_data" },
        { name: "Reparo do Sistema", url: "admin-repair", permission: "admin" }
      ]
    },
    { name: "Página Inicial Pública", icon: <Globe className="w-5 h-5" />, url: "Public" }
  ];

  // Função para verificar se o usuário tem permissão para acessar um item de menu
  const hasPermission = (requiredPermission) => {
    // Se o usuário for admin, tem acesso a tudo
    if (userPermissions.includes('admin')) {
      return true;
    }
    
    // Se não houver permissão definida, permitir acesso
    if (!requiredPermission) {
      return true;
    }
    
    // Se a permissão for um array, verificar se o usuário tem pelo menos uma das permissões
    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(perm => userPermissions.includes(perm));
    }
    
    // Verificar se o usuário tem a permissão específica
    return userPermissions.includes(requiredPermission);
  };
  
  // Filtrar menus com base nas permissões do usuário
  const filteredMenuItems = menuItems.filter(item => {
    // Se o item não tiver submenu, verificar permissão diretamente
    if (!item.submenu) {
      return hasPermission(item.permission);
    }
    
    // Se tiver submenu, verificar se pelo menos um item do submenu está disponível
    const filteredSubmenu = item.submenu.filter(subItem => hasPermission(subItem.permission));
    return filteredSubmenu.length > 0;
  });
  
  // Função para obter os itens de submenu filtrados
  const getFilteredSubmenu = (submenu) => {
    return submenu.filter(subItem => hasPermission(subItem.permission));
  };

  const handleLogout = () => {
    // Limpar token de autenticação
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    
    // Redirecionar para a página pública
    window.location.href = createPageUrl("Public");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar para desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#294380] text-white">
        <div className="p-4 border-b border-[#2D2F59]">
          <div className="flex flex-shrink-0 items-center justify-center">
            {companySettings.logo_url ? (
              <img className="h-10 w-auto" src={companySettings.logo_url} alt={companySettings.name || "ClinixPlus"} />
            ) : (
              <span className="text-xl font-bold text-white">ClinixPlus</span>
            )}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {filteredMenuItems.map((item, index) => (
              <li key={index} className="mb-1">
                {item.submenu ? (
                  <div>
                    <button
                      className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-[#0D0F36]/20 transition-colors"
                      onClick={() => {
                        if (item.name === "Pessoas") setPeopleMenuOpen(!peopleMenuOpen);
                        if (item.name === "Financeiro") setFinancialMenuOpen(!financialMenuOpen);
                        if (item.name === "Configurações") setSettingsMenuOpen(!settingsMenuOpen);
                        if (item.name === "Cadastros") setCadastrosMenuOpen(!cadastrosMenuOpen);
                      }}
                    >
                      <span className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        (item.name === "Pessoas" && peopleMenuOpen) ||
                        (item.name === "Financeiro" && financialMenuOpen) ||
                        (item.name === "Configurações" && settingsMenuOpen) ||
                        (item.name === "Cadastros" && cadastrosMenuOpen)
                          ? "rotate-180"
                          : ""
                      }`} />
                    </button>
                    <ul className={`pl-6 mt-1 space-y-1 ${
                      (item.name === "Pessoas" && peopleMenuOpen) ||
                      (item.name === "Financeiro" && financialMenuOpen) ||
                      (item.name === "Configurações" && settingsMenuOpen) ||
                      (item.name === "Cadastros" && cadastrosMenuOpen)
                        ? "block"
                        : "hidden"
                    }`}>
                      {getFilteredSubmenu(item.submenu).map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <Link
                            to={createPageUrl(subItem.url)}
                            className="block px-4 py-2 hover:bg-[#0D0F36]/20 transition-colors"
                          >
                            {subItem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Link
                    to={createPageUrl(item.url)}
                    className="flex items-center px-4 py-2 hover:bg-[#0D0F36]/20 transition-colors"
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#0D0F36]/20">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay para mobile quando o sidebar está aberto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar para mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#294380] text-white transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#0D0F36]/20">
          <div className="flex flex-shrink-0 items-center justify-center">
            {companySettings.logo_url ? (
              <img className="h-8 w-auto" src={companySettings.logo_url} alt={companySettings.name || "ClinixPlus"} />
            ) : (
              <span className="text-lg font-bold text-white">ClinixPlus</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {filteredMenuItems.map((item, index) => (
              <li key={index} className="mb-1">
                {item.submenu ? (
                  <div>
                    <button
                      className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-[#0D0F36]/20 transition-colors"
                      onClick={() => {
                        if (item.name === "Pessoas") setPeopleMenuOpen(!peopleMenuOpen);
                        if (item.name === "Financeiro") setFinancialMenuOpen(!financialMenuOpen);
                        if (item.name === "Configurações") setSettingsMenuOpen(!settingsMenuOpen);
                        if (item.name === "Cadastros") setCadastrosMenuOpen(!cadastrosMenuOpen);
                      }}
                    >
                      <span className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        (item.name === "Pessoas" && peopleMenuOpen) ||
                        (item.name === "Financeiro" && financialMenuOpen) ||
                        (item.name === "Configurações" && settingsMenuOpen) ||
                        (item.name === "Cadastros" && cadastrosMenuOpen)
                          ? "rotate-180"
                          : ""
                      }`} />
                    </button>
                    <ul className={`pl-6 mt-1 space-y-1 ${
                      (item.name === "Pessoas" && peopleMenuOpen) ||
                      (item.name === "Financeiro" && financialMenuOpen) ||
                      (item.name === "Configurações" && settingsMenuOpen) ||
                      (item.name === "Cadastros" && cadastrosMenuOpen)
                        ? "block"
                        : "hidden"
                    }`}>
                      {getFilteredSubmenu(item.submenu).map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <Link
                            to={createPageUrl(subItem.url)}
                            className="block px-4 py-2 hover:bg-[#0D0F36]/20 transition-colors"
                            onClick={() => setSidebarOpen(false)}
                          >
                            {subItem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Link
                    to={createPageUrl(item.url)}
                    className="flex items-center px-4 py-2 hover:bg-[#0D0F36]/20 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#0D0F36]/20">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <div className="relative">
                <button className="flex items-center text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  <User className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Administrador</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
          <div className="flex-1 p-4">
            <Outlet />
          </div>
          
          {/* Footer */}
          <footer className="border-t border-gray-200 dark:border-gray-700 py-4 px-6 bg-white dark:bg-gray-800">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {new Date().getFullYear()} ClinixPlus. Todos os direitos reservados.
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
