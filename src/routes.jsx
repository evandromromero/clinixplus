import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Importando as páginas
import Public from './pages/Public';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import ClientPackages from './pages/ClientPackages';
import ClientPortal from './pages/ClientPortal';
import ClientReturns from './pages/ClientReturns';
import SalesRegister from './pages/SalesRegister';
import CashRegister from './pages/CashRegister';
import Products from './pages/Products';
import Services from './pages/Services';
import Packages from './pages/Packages';
import GiftCards from './pages/GiftCards';
import Financial from './pages/Financial';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import Layout from './pages/Layout';
import Suppliers from './pages/Suppliers';
import Birthdays from './pages/Birthdays';
import Inventory from './pages/Inventory';
import Subscriptions from './pages/Subscriptions';
import AccountsPayable from './pages/AccountsPayable';
import AccountsReceivable from './pages/AccountsReceivable';
import PaymentMethods from './pages/PaymentMethods';
import DataManager from './pages/DataManager';
import ContractTemplates from './pages/ContractTemplates';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/" element={<Public />} />
      
      {/* Rotas administrativas com layout comum */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/client-details" element={<ClientDetails />} />
        <Route path="/client-packages" element={<ClientPackages />} />
        <Route path="/client-returns" element={<ClientReturns />} />
        <Route path="/sales-register" element={<SalesRegister />} />
        <Route path="/cash-register" element={<CashRegister />} />
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/gift-cards" element={<GiftCards />} />
        <Route path="/financial" element={<Financial />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/birthdays" element={<Birthdays />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/accounts-payable" element={<AccountsPayable />} />
        <Route path="/accounts-receivable" element={<AccountsReceivable />} />
        <Route path="/payment-methods" element={<PaymentMethods />} />
        <Route path="/data-manager" element={<DataManager />} />
        <Route path="/contract-templates" element={<ContractTemplates />} />
      </Route>
      
      {/* Rota do portal do cliente */}
      <Route path="/client-portal" element={<ClientPortal />} />
      
      {/* Rota de fallback para páginas não encontradas */}
      <Route path="*" element={<Public />} />
    </Routes>
  );
}
