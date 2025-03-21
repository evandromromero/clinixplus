import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  Plus,
  Building2,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FinancialTransaction } from "@/api/entities";

import FinancialDashboard from '../components/financial/FinancialDashboard';
import AccountsPayable from '../components/financial/AccountsPayable';
import AccountsReceivable from '../components/financial/AccountsReceivable';
import CashRegister from '../components/financial/CashRegister';
import PaymentSlip from '../components/financial/PaymentSlip';
import InventoryMovement from '../components/financial/InventoryMovement';
import Suppliers from '../components/financial/Suppliers';

export default function Financial() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-[#0D0F36]">Financeiro</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="accounts-payable" className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Contas a Pagar
          </TabsTrigger>
          <TabsTrigger value="accounts-receivable" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="cash-register" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Caixa
          </TabsTrigger>
          <TabsTrigger value="payment-slip" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Comanda
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="accounts-payable">
          <AccountsPayable />
        </TabsContent>

        <TabsContent value="accounts-receivable">
          <AccountsReceivable />
        </TabsContent>

        <TabsContent value="cash-register">
          <CashRegister />
        </TabsContent>

        <TabsContent value="payment-slip">
          <PaymentSlip />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryMovement />
        </TabsContent>

        <TabsContent value="suppliers">
          <Suppliers />
        </TabsContent>
      </Tabs>
    </div>
  );
}