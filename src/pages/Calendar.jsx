import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, List, Grid3X3 } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Appointment, Client, Employee, Service } from "@/firebase/entities";

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("day");
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [hideCancelled, setHideCancelled] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("[Calendário] Iniciando carregamento de dados...");
      
      // Carregar funcionários primeiro para garantir que estão disponíveis
      const employeesData = await Employee.list();
      
      // Filtrar apenas funcionários ativos que prestam serviços
      const providersData = employeesData.filter(
        employee => employee.provides_services !== false && employee.active !== false
      );
      
      // Carregar outros dados
      const [appointmentsData, clientsData, servicesData] = await Promise.all([
        Appointment.list(),
        Client.list(),
        Service.list()
      ]);

      // Normalizar datas dos agendamentos (garantir string ISO)
      const normalizedAppointments = appointmentsData.map(app => ({
        ...app,
        date: typeof app.date === 'string' ? app.date : (app.date instanceof Date ? app.date.toISOString() : String(app.date))
      }));

      // Log para depuração
      console.log("[Calendário] Agendamentos carregados:", normalizedAppointments.map(a => ({id: a.id, date: a.date, status: a.status, employee_id: a.employee_id})));

      // Atualizar estados
      setEmployees(providersData);
      setSelectedEmployees(providersData.map(emp => emp.id));
      setAppointments(normalizedAppointments);
      setClients(clientsData);
      setServices(servicesData);

      console.log("[Calendário] Todos os dados carregados com sucesso");
    } catch (error) {
      console.error("[Calendário] Erro ao carregar dados:", error);
    }
  };

  const toggleEmployeeFilter = (empId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  const getFilteredAppointments = () => {
    return appointments.filter(app => {
      const employeeMatch = selectedEmployees.includes(app.employee_id);
      const statusMatch = !hideCancelled || app.status !== 'cancelado';
      return employeeMatch && statusMatch;
    });
  };

  const getAppointmentsForDate = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const filtered = getFilteredAppointments().filter(app => {
      // Log para depuração de cada comparação
      const appDate = format(new Date(app.date), 'yyyy-MM-dd');
      const match = appDate === formattedDate;
      if (match) {
        console.log(`[Calendário][DEBUG] Agendamento encontrado para o dia ${formattedDate}:`, app);
      }
      return match;
    });
    if (filtered.length === 0) {
      console.log(`[Calendário][DEBUG] Nenhum agendamento para o dia ${formattedDate}`);
    }
    return filtered;
  };

  const handlePrevious = () => {
    if (view === 'day') {
      setDate(prev => addDays(prev, -1));
    } else if (view === 'week') {
      setDate(prev => addWeeks(prev, -1));
    } else if (view === 'month') {
      setDate(prev => addMonths(prev, -1));
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      setDate(prev => addDays(prev, 1));
    } else if (view === 'week') {
      setDate(prev => addWeeks(prev, 1));
    } else if (view === 'month') {
      setDate(prev => addMonths(prev, 1));
    }
  };

  const handleViewAppointment = (appointmentId) => {
    navigate(`/appointments?appointment_id=${appointmentId}`);
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(date);
    
    // Agrupar por hora
    const appointmentsByHour = {};
    dayAppointments.forEach(app => {
      const appDate = new Date(app.date);
      const hour = appDate.getHours();
      if (!appointmentsByHour[hour]) {
        appointmentsByHour[hour] = [];
      }
      appointmentsByHour[hour].push(app);
    });

    // Horários de funcionamento (8h às 20h)
    const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">
            {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        
        <div className="space-y-2">
          {timeSlots.map(hour => (
            <Card key={hour} className={appointmentsByHour[hour]?.length ? "border-l-4 border-l-purple-500" : ""}>
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm font-medium">{`${hour}:00`}</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                {appointmentsByHour[hour]?.length ? (
                  <div className="space-y-2">
                    {appointmentsByHour[hour].map(app => {
                      const client = clients.find(c => c.id === app.client_id);
                      const employee = employees.find(e => e.id === app.employee_id);
                      const service = services.find(s => s.id === app.service_id);
                      
                      return (
                        <div 
                          key={app.id}
                          className={`p-3 rounded-md cursor-pointer hover:bg-gray-50 ${
                            app.status === 'cancelado' ? 'bg-red-50' : 
                            app.status === 'concluido' ? 'bg-green-50' : 'bg-white'
                          }`}
                          style={{
                            borderLeft: `3px solid ${employee?.color || '#94a3b8'}`,
                            backgroundColor: `${employee?.color}15` || 'white'
                          }}
                          onClick={() => handleViewAppointment(app.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{client?.name || 'Cliente não encontrado'}</p>
                              <p className="text-sm text-gray-600">{service?.name || 'Serviço não encontrado'}</p>
                              <p className="text-xs text-gray-500">
                                {employee?.name || 'Profissional não encontrado'} • 
                                {format(new Date(app.date), " HH:mm")}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                app.status === 'cancelado' ? 'destructive' : 
                                app.status === 'concluido' ? 'success' : 'default'
                              }
                            >
                              {app.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum agendamento</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(date, { weekStartsOn: 0 });
    const endDate = endOfWeek(date, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">
            {format(startDate, "dd 'de' MMMM", { locale: ptBR })} - {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {days.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            
            return (
              <Card key={day.toString()} className="h-full">
                <CardHeader className="py-2 px-4 bg-gray-50">
                  <CardTitle className="text-sm font-medium text-center">
                    {format(day, "EEE, dd/MM", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 max-h-[400px] overflow-y-auto">
                  {dayAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {dayAppointments
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map(app => {
                          const client = clients.find(c => c.id === app.client_id);
                          const service = services.find(s => s.id === app.service_id);
                          
                          return (
                            <div 
                              key={app.id}
                              className={`p-2 rounded-md cursor-pointer hover:bg-gray-50 text-sm ${
                                app.status === 'cancelado' ? 'bg-red-50' : 
                                app.status === 'concluido' ? 'bg-green-50' : 'bg-white'
                              }`}
                              style={{
                                borderLeft: `3px solid ${employees.find(e => e.id === app.employee_id)?.color || '#94a3b8'}`,
                                backgroundColor: `${employees.find(e => e.id === app.employee_id)?.color}15` || 'white'
                              }}
                              onClick={() => handleViewAppointment(app.id)}
                            >
                              <p className="font-medium truncate">{client?.name}</p>
                              <p className="text-xs text-gray-600 truncate">{service?.name}</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(app.date), "HH:mm")}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center">Nenhum agendamento</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Adicionar dias do início da semana (se o mês não começar no domingo)
    const firstDay = startDate.getDay();
    const prevMonthDays = Array.from({ length: firstDay }, (_, i) => 
      addDays(startDate, -(i + 1))
    ).reverse();
    
    // Adicionar dias do final da semana (se o mês não terminar no sábado)
    const lastDay = endDate.getDay();
    const nextMonthDays = Array.from({ length: 6 - lastDay }, (_, i) => 
      addDays(endDate, i + 1)
    );
    
    const allDays = [...prevMonthDays, ...days, ...nextMonthDays];
    
    // Agrupar em semanas
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">
            {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="font-medium text-sm py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1 h-24">
              {week.map(day => {
                const isCurrentMonth = isSameMonth(day, date);
                const isToday = isSameDay(day, new Date());
                const dayAppointments = getAppointmentsForDate(day);
                
                return (
                  <div 
                    key={day.toString()}
                    className={`border rounded-md p-1 relative ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                    } ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}`}
                  >
                    <div className="text-right text-sm mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="overflow-y-auto max-h-[calc(100%-20px)]">
                      {dayAppointments.length > 0 ? (
                        dayAppointments.length <= 3 ? (
                          dayAppointments.map(app => (
                            <div 
                              key={app.id}
                              className={`text-xs p-1 mb-1 rounded truncate ${
                                app.status === 'cancelado' ? 'bg-red-100' : 
                                app.status === 'concluido' ? 'bg-green-100' : 'bg-white'
                              }`}
                              style={{
                                borderLeft: `2px solid ${employees.find(e => e.id === app.employee_id)?.color || '#94a3b8'}`,
                                backgroundColor: `${employees.find(e => e.id === app.employee_id)?.color}15` || 'white'
                              }}
                              onClick={() => handleViewAppointment(app.id)}
                            >
                              {format(new Date(app.date), "HH:mm")}
                            </div>
                          ))
                        ) : (
                          <div 
                            className="text-xs p-1 bg-gray-100 rounded text-center cursor-pointer"
                            onClick={() => {
                              setDate(day);
                              setView('day');
                            }}
                          >
                            {dayAppointments.length} agendamentos
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Calendário</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDate(new Date())}
          >
            Hoje
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[300px,1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Tabs defaultValue="day" value={view} onValueChange={setView}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="day">
                      <List className="h-4 w-4 mr-2" />
                      Dia
                    </TabsTrigger>
                    <TabsTrigger value="week">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Semana
                    </TabsTrigger>
                    <TabsTrigger value="month">
                      <Grid3X3 className="h-4 w-4 mr-2" />
                      Mês
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Filtrar Profissionais</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedEmployees(employees.map(e => e.id))}
                    >
                      Todos
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {employees.map(employee => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`emp-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployeeFilter(employee.id)}
                        />
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: employee.color || '#94a3b8' }}
                        />
                        <Label htmlFor={`emp-${employee.id}`} className="flex items-center gap-2">
                          {employee.name.length > 16 ? employee.name.substring(0, 16) + '...' : employee.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hide-cancelled"
                      checked={hideCancelled}
                      onCheckedChange={(checked) => setHideCancelled(checked)}
                    />
                    <Label htmlFor="hide-cancelled" className="flex items-center gap-2">
                      Ocultar agendamentos cancelados
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full"
            onClick={() => navigate('/appointments')}
          >
            Ir para Agenda
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {view === 'day' && renderDayView()}
            {view === 'week' && renderWeekView()}
            {view === 'month' && renderMonthView()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
