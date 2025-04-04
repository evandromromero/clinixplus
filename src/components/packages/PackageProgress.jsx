import React, { useState, useEffect } from 'react';
import { ClientPackage } from '@/api/entities';
import { Package } from '@/api/entities';
import { Employee } from '@/api/entities';
import { Service } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, Clock, User } from 'lucide-react';

export default function PackageProgress({ clientPackageId }) {
  const [packageData, setPackageData] = useState(null);
  const [packageInfo, setPackageInfo] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (clientPackageId) {
      loadPackageData();
    }
  }, [clientPackageId]);

  const loadPackageData = async () => {
    try {
      setLoading(true);
      const [clientPkg, allPackages, allEmployees, allServices] = await Promise.all([
        ClientPackage.get(clientPackageId),
        Package.list(),
        Employee.list(),
        Service.list()
      ]);

      setPackageData(clientPkg);
      setPackageInfo(allPackages.find(pkg => pkg.id === clientPkg.package_id));
      setEmployees(allEmployees);
      setServices(allServices);
      // Simulating fetching appointments data
      setAppointments([]); // Replace this with actual fetching logic if needed
    } catch (error) {
      console.error("Erro ao carregar dados do pacote:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUsedSessions = () => {
    if (!packageData.session_history) return 0;

    return packageData.session_history.filter(session => {
      if (session.appointment_id) {
        const appointment = appointments.find(app => app.id === session.appointment_id);
        return appointment && appointment.status === 'concluído';
      }
      return false;
    }).length;
  };

  const usedSessions = getUsedSessions();
  const progress = (usedSessions / packageData.total_sessions) * 100;
  const remainingSessions = packageData.total_sessions - usedSessions;

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : "Profissional não encontrado";
  };

  const getServiceName = (serviceId) => {
    const service = services.find(svc => svc.id === serviceId);
    return service ? service.name : "Serviço não encontrado";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Carregando dados do pacote...</p>
        </CardContent>
      </Card>
    );
  }

  if (!packageData || !packageInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Dados do pacote não encontrados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{packageInfo.name}</span>
          <Badge 
            variant="outline" 
            className={`${
              packageData.status === 'ativo' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : packageData.status === 'finalizado'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : packageData.status === 'expirado'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {packageData.status.charAt(0).toUpperCase() + packageData.status.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Data de aquisição</p>
            <p className="font-medium">
              {format(new Date(packageData.purchase_date), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Validade</p>
            <p className="font-medium">
              {format(new Date(packageData.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso:</span>
            <span>{usedSessions} de {packageData.total_sessions} sessões</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-500 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">
            {remainingSessions} sessões restantes
          </p>
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-3">Serviços Incluídos</h3>
          <div className="space-y-2 mb-6">
            {packageInfo.services.map((service, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{getServiceName(service.service_id)}</span>
                  <span className="text-sm text-gray-600">{service.quantity}x</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-medium mb-3">Histórico de sessões</h3>
          {packageData.session_history && packageData.session_history.length > 0 ? (
            <div className="space-y-3">
              {packageData.session_history.map((session, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">{getServiceName(session.service_id)}</p>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center text-gray-600 text-sm">
                            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                            <span>
                              {format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            <span>
                              {format(new Date(session.date), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <User className="w-3.5 h-3.5 mr-1.5" />
                            <span>{getEmployeeName(session.employee_id)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-none">
                      Sessão {index + 1}
                    </Badge>
                  </div>
                  {session.notes && (
                    <p className="mt-2 text-sm text-gray-600 italic border-t border-gray-200 pt-2">
                      "{session.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Nenhuma sessão realizada ainda.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
