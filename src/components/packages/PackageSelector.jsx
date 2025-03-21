import React, { useState, useEffect } from 'react';
import { ClientPackage } from '@/api/entities';
import { Package } from '@/api/entities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function PackageSelector({ clientId, serviceId, onSelect }) {
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState("");

  useEffect(() => {
    if (clientId && serviceId) {
      loadAvailablePackages();
    }
  }, [clientId, serviceId]);

  const loadAvailablePackages = async () => {
    try {
      setLoading(true);
      const [allClientPackages, allPackages] = await Promise.all([
        ClientPackage.filter({ client_id: clientId, status: 'ativo' }),
        Package.list()
      ]);

      setPackages(allPackages);
      
      // Filtrar pacotes do cliente que contêm o serviço selecionado
      // e que ainda têm sessões disponíveis
      const validClientPackages = allClientPackages.filter(clientPkg => {
        // Verificar se o pacote existe nos pacotes disponíveis
        const pkg = allPackages.find(p => p.id === clientPkg.package_id);
        if (!pkg) return false;
        
        // Verificar se o pacote ainda é válido (não expirou)
        const isValid = isAfter(new Date(clientPkg.expiration_date), new Date());
        if (!isValid) return false;
        
        // Verificar se ainda tem sessões disponíveis
        const hasAvailableSessions = clientPkg.sessions_used < clientPkg.total_sessions;
        if (!hasAvailableSessions) return false;
        
        // Verificar se o serviço está incluído no pacote
        const serviceIncluded = pkg.services.some(svc => svc.service_id === serviceId);
        return serviceIncluded;
      });
      
      setClientPackages(validClientPackages);
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (packageId) => {
    setSelectedPackageId(packageId);
    const selectedPackage = clientPackages.find(pkg => pkg.id === packageId);
    onSelect(selectedPackage);
  };

  const getPackageName = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    return pkg ? pkg.name : "Pacote não encontrado";
  };

  const getProgressPercentage = (used, total) => {
    return Math.round((used / total) * 100);
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 italic">
        Carregando pacotes disponíveis...
      </div>
    );
  }

  if (clientPackages.length === 0) {
    return (
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">
          Este cliente não possui pacotes ativos para este serviço.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        value={selectedPackageId}
        onValueChange={handlePackageSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um pacote" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Nenhum pacote (pagamento normal)</SelectItem>
          {clientPackages.map(pkg => (
            <SelectItem key={pkg.id} value={pkg.id}>
              {getPackageName(pkg.package_id)} - {pkg.sessions_used}/{pkg.total_sessions} sessões
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPackageId && (
        <div className="bg-gray-50 p-3 rounded-md space-y-2">
          {clientPackages
            .filter(pkg => pkg.id === selectedPackageId)
            .map(pkg => (
              <div key={pkg.id}>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{getPackageName(pkg.package_id)}</h4>
                  <Badge 
                    variant="outline" 
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Ativo
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  Validade: {format(new Date(pkg.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progresso:</span>
                    <span>{pkg.sessions_used} de {pkg.total_sessions} sessões</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${getProgressPercentage(pkg.sessions_used, pkg.total_sessions)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}