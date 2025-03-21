import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function FinancialDashboard() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#294380] to-[#69D2CD]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Saldo em Caixa</CardTitle>
            <DollarSign className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">R$ 15.430,00</div>
            <p className="text-xs text-[#F1F6CE] flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +20% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#69D2CD] to-[#B9F1D6]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#0D0F36]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">R$ 45.890,00</div>
            <p className="text-xs text-[#294380]">
              Meta: R$ 50.000,00
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#B9F1D6] to-[#F1F6CE]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-[#0D0F36]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">R$ 28.450,00</div>
            <p className="text-xs text-[#294380]">
              Limite: R$ 35.000,00
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#F1F6CE] to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Contas a Receber</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-[#0D0F36]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">R$ 12.780,00</div>
            <p className="text-xs text-[#294380]">
              15 pagamentos pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[#69D2CD] border-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36]">
              Últimas Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Render recent income transactions */}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#69D2CD] border-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36]">
              Últimas Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Render recent expense transactions */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}