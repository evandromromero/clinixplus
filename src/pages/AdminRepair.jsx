import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { repairAdminRole } from "@/utils/repairAdminRole";
import { Link } from "react-router-dom";

export default function AdminRepair() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRepair = async () => {
    try {
      setLoading(true);
      setResult(null);
      setError(null);
      
      const adminRoleId = await repairAdminRole();
      
      setResult({
        success: true,
        message: `Cargo Administrador Geral reparado com sucesso! ID: ${adminRoleId}`,
      });
    } catch (err) {
      console.error("Erro ao reparar cargo:", err);
      setError({
        message: `Erro ao reparar cargo: ${err.message || "Erro desconhecido"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Reparo do Sistema</CardTitle>
          <CardDescription>
            Use esta ferramenta para reparar o cargo de Administrador Geral quando necessário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Este utilitário irá:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Verificar se o cargo Administrador Geral existe</li>
            <li>Criar o cargo se não existir</li>
            <li>Atribuir o cargo ao usuário atual</li>
            <li>Atualizar o usuário no Firestore</li>
          </ul>
          
          {result && (
            <div className="p-3 bg-green-100 border border-green-300 rounded-md mb-4">
              <p className="text-green-800">{result.message}</p>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-md mb-4">
              <p className="text-red-800">{error.message}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={handleRepair}
            disabled={loading}
          >
            {loading ? "Reparando..." : "Reparar Cargo Administrador"}
          </Button>
          
          <Link to="/dashboard">
            <Button variant="outline">
              Voltar para o Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
