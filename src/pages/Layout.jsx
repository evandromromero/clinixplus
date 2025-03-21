import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  Globe
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

  const menuItems = [
    { name: "Dashboard", icon: <Home className="w-5 h-5" />, url: "Dashboard" },
    { name: "Agenda", icon: <CalendarDays className="w-5 h-5" />, url: "Appointments" },
    {
      name: "Pessoas",
      icon: <Users className="w-5 h-5" />,
      submenu: [
        { name: "Clientes", url: "Clients" },
        { name: "Funcionários", url: "Employees" },
        { name: "Fornecedores", url: "Suppliers" },
        { name: "Aniversariantes", url: "Birthdays" },
        { name: "Retornos", url: "ClientReturns" }
      ]
    },
    {
      name: "Cadastros",
      icon: <FolderPlus className="w-5 h-5" />,
      submenu: [
        { name: "Serviços", url: "Services" },
        { name: "Cargos", url: "Roles" },
        { name: "Produtos", url: "Products" },
        { name: "Formas de Pagamento", url: "PaymentMethods" }
      ]
    },
    { name: "Estoque", icon: <Package className="w-5 h-5" />, url: "Inventory" },
    { name: "Pacotes", icon: <Package className="w-5 h-5" />, url: "Packages" },
    { name: "Pacotes de Clientes", icon: <User className="w-5 h-5" />, url: "ClientPackages" },
    { name: "Assinaturas", icon: <Clock className="w-5 h-5" />, url: "Subscriptions" },
    { name: "Gift Cards", icon: <Gift className="w-5 h-5" />, url: "GiftCards" },
    { name: "Vendas", icon: <ShoppingBag className="w-5 h-5" />, url: "SalesRegister" },
    {
      name: "Financeiro",
      icon: <DollarSign className="w-5 h-5" />,
      submenu: [
        { name: "Contas a Pagar", url: "AccountsPayable" },
        { name: "Contas a Receber", url: "AccountsReceivable" },
        { name: "Caixa", url: "CashRegister" }
      ]
    },
    { name: "Relatórios", icon: <PieChart className="w-5 h-5" />, url: "Reports" },
    {
      name: "Configurações",
      icon: <Settings className="w-5 h-5" />,
      submenu: [
        { name: "Configurações Gerais", url: "Settings" },
        { name: "Gerenciador de Dados", url: "DataManager" }
      ]
    },
    { name: "Página Inicial Pública", icon: <Globe className="w-5 h-5" />, url: "Public" }
  ];

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
            <img className="h-10 w-auto" src="https://esthétique.com.br/wp-content/uploads/2023/08/logo-marca-dagua.png" alt="Logo" />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {menuItems.map((item, index) => (
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
                      {item.submenu.map((subItem, subIndex) => (
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
            <img className="h-8 w-auto" src="https://esthétique.com.br/wp-content/uploads/2023/08/logo-marca-dagua.png" alt="Logo" />
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
            {menuItems.map((item, index) => (
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
                      {item.submenu.map((subItem, subIndex) => (
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="flex items-center text-gray-700 hover:text-gray-900">
                  <User className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Administrador</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
