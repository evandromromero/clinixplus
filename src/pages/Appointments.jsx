import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Check, X, Filter, ArrowRight, User, DollarSign, History, Phone, Mail, FileText, Package as PackageIcon, Scissors, CalendarPlus, Trash2, AlertTriangle } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek, isAfter, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Appointment, 
  Client, 
  Employee, 
  Service, 
  Package, 
  ClientPackage, 
  FinancialTransaction, 
  PendingService 
} from "@/firebase/entities";
import { Calendar } from "@/components/ui/calendar"; 
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast"; // Import the useToast hook

export default function Appointments() {
  const { toast } = useToast(); // Get the toast function from the hook
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    client_id: "",
    employee_id: "",
    service_id: "",
    date: new Date(),
    status: "agendado",
    notes: "",
    original_appointment_id: null
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedClientPackage, setSelectedClientPackage] = useState(null);
  const [clientPackages, setClientPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [packages, setPackages] = useState([]);
  const [availableHours, setAvailableHours] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState({
    employeeId: "",
    hour: null,
    date: null
  });

  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState(null);
  const [clientAppointments, setClientAppointments] = useState([]);
  const [clientServices, setClientServices] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);

  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    type: null,
    appointmentId: null,
    title: '',
    description: '',
    confirmText: ''
  });

  const [confirmOverlapDialog, setConfirmOverlapDialog] = useState({
    isOpen: false,
    timeSlot: null,
    existingAppointments: []
  });

  const navigate = useNavigate();

  const handleViewClientDetails = (clientId) => {
    navigate(`/client-details?id=${clientId}`);
    setShowAppointmentDetails(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Array de cores predefinidas para funcionários
  const predefinedColors = [
    "#4f46e5", // indigo
    "#0ea5e9", // sky
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#84cc16", // lime
    "#14b8a6", // teal
    "#6366f1", // indigo-500
    "#8b5cf6", // violet-500
    "#d946ef", // fuchsia-500
    "#f43f5e"  // rose-500
  ];

  // Função para atribuir cores aos funcionários
  const assignColorsToEmployees = (employeesData) => {
    return employeesData.map((employee, index) => {
      // Se o funcionário já tem uma cor, mantém a cor
      if (employee.color) {
        return employee;
      }
      
      // Atribui uma cor do array ou gera uma cor aleatória se não houver cores suficientes
      const color = index < predefinedColors.length 
        ? predefinedColors[index]
        : `#${Math.floor(Math.random()*16777215).toString(16)}`;
      
      return { ...employee, color };
    });
  };

  const loadData = async () => {
    try {
      console.log("[Agenda] Iniciando carregamento de dados...");
      
      // Carregar funcionários primeiro para garantir que estão disponíveis
      console.log("[Agenda] Carregando funcionários do Firebase...");
      const employeesData = await Employee.list();
      console.log("[Agenda] Funcionários carregados:", employeesData);
      
      // Filtrar apenas funcionários ativos que prestam serviços
      const providersData = employeesData.filter(
        employee => employee.provides_services !== false && employee.active !== false
      );
      console.log("[Agenda] Funcionários filtrados:", providersData);
      
      // Atribuir cores aos funcionários
      const providersWithColors = assignColorsToEmployees(providersData);
      
      // Carregar outros dados
      const [appointmentsData, clientsData, servicesData, packagesData] = await Promise.all([
        Appointment.list(),
        Client.list(),
        Service.list(),
        Package.list()
      ]);

      // Atualizar estados
      setEmployees(providersWithColors);
      setSelectedEmployees(providersWithColors.map(emp => emp.id));
      setAppointments(appointmentsData);
      setClients(clientsData);
      setServices(servicesData);
      setPackages(packagesData);

      console.log("[Agenda] Todos os dados carregados com sucesso");
    } catch (error) {
      console.error("[Agenda] Erro ao carregar dados:", error);
      // Tentar carregar funcionários novamente em caso de erro
      try {
        console.log("[Agenda] Tentando recarregar apenas funcionários...");
        const employeesData = await Employee.list();
        const providersData = employeesData.filter(
          employee => employee.provides_services !== false && employee.active !== false
        );
        setEmployees(providersData);
        setSelectedEmployees(providersData.map(emp => emp.id));
      } catch (retryError) {
        console.error("[Agenda] Erro ao recarregar funcionários:", retryError);
      }
    }
  };

  const getWeekDay = (date) => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[getDay(date)];
  };

  const handleCreateAppointment = async () => {
    try {
      const appointmentData = {
        ...newAppointment,
        date: format(newAppointment.date, "yyyy-MM-dd'T'HH:mm:ss"),
        status: newAppointment.original_appointment_id ? 'agendado' : newAppointment.status || 'agendado'
      };
      
      const createdAppointment = await Appointment.create(appointmentData);

      // Se for um reagendamento, atualiza o agendamento original
      if (newAppointment.original_appointment_id) {
        await Appointment.update(newAppointment.original_appointment_id, {
          rescheduled: true,
          rescheduled_to: createdAppointment.id
        });
      }

      // Se veio de um serviço pendente, atualizar o status
      const pendingService = pendingServices.find(ps => ps.service_id === newAppointment.service_id);
      if (pendingService) {
        await PendingService.update(pendingService.id, {
          status: "agendado",
          appointment_id: createdAppointment.id
        });
      }

      if (selectedClientPackage) {
        try {
          const currentPackage = await ClientPackage.get(selectedClientPackage.id);
          
          if (!currentPackage) {
            throw new Error("Pacote não encontrado");
          }

          console.log("Pacote atual:", currentPackage);

          const sessionHistoryEntry = {
            date: appointmentData.date,
            employee_id: appointmentData.employee_id,
            employee_name: employees.find(e => e.id === appointmentData.employee_id)?.name || "",
            appointment_id: createdAppointment.id,
            service_id: appointmentData.service_id,
            service_name: services.find(s => s.id === appointmentData.service_id)?.name || "",
            status: "agendado",
            notes: appointmentData.notes || ""
          };

          const currentSessionHistory = Array.isArray(currentPackage.session_history) 
            ? currentPackage.session_history 
            : [];

          await ClientPackage.update(selectedClientPackage.id, {
            session_history: [...currentSessionHistory, sessionHistoryEntry],
            sessions_used: (currentPackage.sessions_used || 0) + 1
          });
        } catch (error) {
          console.error("[Appointments] Erro ao atualizar pacote:", error);
        }
      }

      setShowNewAppointmentDialog(false);
      clearNewAppointmentForm();
      await loadData();

      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
        variant: "success"
      });
    } catch (error) {
      console.error("[Appointments] Erro ao criar agendamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento",
        variant: "destructive"
      });
    }
  };

  const getDayAppointments = (date) => {
    return appointments.filter(app =>
      format(new Date(app.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  // Função para gerar horários baseados no intervalo do profissional
  const getAvailableHours = (employeeId) => {
    if (!employeeId) return timeSlots;
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !employee.appointment_interval) return timeSlots;
    
    const interval = employee.appointment_interval;
    const intervalInHours = interval / 60;
    
    // Horário de trabalho padrão das 8h às 20h
    const startHour = 8;
    const endHour = 20;
    
    // Gerar slots baseados no intervalo
    const slots = [];
    for (let hour = startHour; hour < endHour; hour += intervalInHours) {
      // Arredondar para evitar problemas com números decimais
      const roundedHour = Math.round(hour * 100) / 100;
      slots.push(roundedHour);
    }
    
    return slots;
  };

  // Função para formatar a hora
  const formatHour = (hour) => {
    const hours = Math.floor(hour);
    const minutes = Math.round((hour % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Atualizar horários quando selecionar o profissional
  useEffect(() => {
    if (newAppointment.employee_id) {
      const hours = getAvailableHours(newAppointment.employee_id);
      setAvailableHours(hours);
    } else {
      setAvailableHours([]);
    }
  }, [newAppointment.employee_id]);

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8);

  const toggleEmployeeFilter = (empId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  const filteredEmployees = employees.filter(emp => selectedEmployees.includes(emp.id));

  const getEmployeeAvailability = (employeeId, hour) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !employee.work_hours) return true;

    const weekDay = getWeekDay(date);
    const workPeriods = employee.work_hours[weekDay] || [];

    return workPeriods.some(period => {
      const start = parseInt(period.start.split(':')[0]);
      const end = parseInt(period.end.split(':')[0]);
      return hour >= start && hour < end;
    });
  };

  const searchClientsAndDependents = (term) => {
    if (!term) {
      setSearchResults([]);
      return;
    }

    const results = [];

    clients.forEach(client => {
      if (client.name.toLowerCase().includes(term.toLowerCase())) {
        results.push({
          id: client.id,
          name: client.name,
          type: 'titular',
          parent: null
        });
      }

      if (client.dependents) {
        client.dependents.forEach((dependent, index) => {
          if (dependent.name.toLowerCase().includes(term.toLowerCase())) {
            results.push({
              id: `${client.id}-dep-${index}`,
              name: `${dependent.name} (Dependente de ${client.name})`,
              type: 'dependente',
              parent: client,
              dependentIndex: index
            });
          }
        });
      }
    });

    setSearchResults(results);
  };

  const updateServicesForEmployee = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && employee.specialties && employee.specialties.length > 0) {
      let availableServices = services.filter(service =>
        employee.specialties.includes(service.id)
      );
      
      if (selectedPackageId) {
        const selectedPackage = clientPackages.find(pkg => pkg.id === selectedPackageId);
        if (selectedPackage) {
          const packageData = packages.find(p => p.id === selectedPackage.package_id);
          if (packageData && packageData.services) {
            const packageServiceIds = packageData.services.map(s => s.service_id);
            availableServices = availableServices.filter(service => 
              packageServiceIds.includes(service.id)
            );
          }
        }
      }
      
      setFilteredServices(availableServices);
    } else {
      setFilteredServices([]);
    }
  };

  const handleClientSelection = async (clientId, clientName, clientType, dependentIndex) => {
    setNewAppointment({
      ...newAppointment,
      client_id: clientId,
      client_type: clientType,
      dependent_index: dependentIndex
    });
    setSearchTerm(clientName);
    setShowSearch(false);
    
    try {
      // Carregar pacotes do cliente
      const clientPackagesData = await ClientPackage.filter({ 
        client_id: clientId, 
        status: 'ativo'
      });
      setClientPackages(clientPackagesData);
      setFilteredPackages(clientPackagesData);
      
      // Carregar serviços pendentes
      console.log("[Appointments] Buscando serviços pendentes para cliente:", clientId);
      const pendingServicesData = await PendingService.filter({
        client_id: clientId,
        status: "pendente"
      });
      console.log("[Appointments] Serviços pendentes encontrados:", pendingServicesData);
      setPendingServices(pendingServicesData);
      
      setSelectedPackageId("");
      setSelectedClientPackage(null);
    } catch (error) {
      console.error("[Appointments] Erro ao carregar dados do cliente:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do cliente",
        variant: "destructive"
      });
    }
  };

  const handlePackageSelection = (packageId) => {
    setSelectedPackageId(packageId);
    const selectedPackage = clientPackages.find(pkg => pkg.id === packageId);
    setSelectedClientPackage(selectedPackage);
    
    if (newAppointment.employee_id) {
      updateServicesForEmployee(newAppointment.employee_id);
    }
    
    setNewAppointment({
      ...newAppointment,
      service_id: ""
    });
  };

  const handleSelectAppointment = async (appointment) => {
    try {
      setSelectedAppointment(appointment);
      
      const client = clients.find(c => c.id === appointment.client_id);
      
      const allAppointments = await Appointment.filter({ client_id: appointment.client_id });
      const sortedAppointments = allAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const clientPkgs = await ClientPackage.filter({ client_id: appointment.client_id });
      
      const payments = await FinancialTransaction.filter({ 
        client_id: appointment.client_id,
        type: 'receita'
      });

      setSelectedAppointmentDetails({
        appointment,
        client,
        service: services.find(s => s.id === appointment.service_id),
        employee: employees.find(e => e.id === appointment.employee_id)
      });
      setClientAppointments(sortedAppointments);
      setClientPackages(clientPkgs);
      setClientPayments(payments);
      
      setShowAppointmentDetails(true);
    } catch (error) {
      console.error("Erro ao carregar detalhes do agendamento:", error);
    }
  };

  const handleStatusChange = async (newStatus, appointmentId) => {
    try {
      await Appointment.update(appointmentId, {
        status: newStatus
      });
      
      if (newStatus === 'concluido') {
        const appointment = appointments.find(app => app.id === appointmentId);
        const clientPackages = await ClientPackage.filter({ 
          client_id: appointment.client_id,
          status: 'ativo'
        });
        
        const relevantPackage = clientPackages.find(pkg => {
          const packageData = packages.find(p => p.id === pkg.package_id);
          return packageData?.services.some(s => s.service_id === appointment.service_id);
        });

        if (relevantPackage) {
          const serviceData = services.find(s => s.id === appointment.service_id);
          const employeeData = employees.find(e => e.id === appointment.employee_id);
          const sessionHistoryEntry = {
            date: appointment.date,
            employee_id: appointment.employee_id,
            employee_name: employeeData ? employeeData.name : "",
            appointment_id: appointmentId,
            service_id: appointment.service_id,
            service_name: serviceData ? serviceData.name : "",
            status: newStatus,
            notes: appointment.notes || ""
          };

          const currentPackage = await ClientPackage.get(relevantPackage.id);
          const currentSessionHistory = Array.isArray(currentPackage.session_history) 
            ? currentPackage.session_history 
            : [];
          
          // Encontra e atualiza a sessão existente ou adiciona uma nova
          const existingSessionIndex = currentSessionHistory.findIndex(
            s => s.appointment_id === appointmentId
          );

          let updatedSessionHistory;
          if (existingSessionIndex >= 0) {
            updatedSessionHistory = [...currentSessionHistory];
            updatedSessionHistory[existingSessionIndex] = sessionHistoryEntry;
          } else {
            updatedSessionHistory = [...currentSessionHistory, sessionHistoryEntry];
          }
          
          // Se o status for concluído, incrementa as sessões usadas
          const sessionsToAdd = newStatus === 'concluido' ? 1 : 0;
          
          await ClientPackage.update(relevantPackage.id, {
            sessions_used: (currentPackage.sessions_used || 0) + sessionsToAdd,
            session_history: updatedSessionHistory,
            status: (currentPackage.sessions_used || 0) + sessionsToAdd >= currentPackage.total_sessions ? 'finalizado' : 'ativo'
          });
        }
      }
      
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      await Appointment.delete(appointmentId);
      await loadData();
      
      if (selectedAppointmentDetails?.appointment?.id === appointmentId) {
        setShowAppointmentDetails(false);
      }
      
      setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      await loadData();
      if (selectedAppointmentDetails?.appointment?.id === appointmentId) {
        setShowAppointmentDetails(false);
      }
      setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
    }
  };

  const handleMoveAppointment = async () => {
    if (!selectedAppointment || !moveTarget.employeeId || moveTarget.hour === null) {
      console.error("Selecione todos os dados necessários para mover o agendamento.");
      return;
    }

    try {
      const newDate = new Date(date);
      newDate.setHours(moveTarget.hour, 0, 0, 0);

      const isAvailable = getEmployeeAvailability(moveTarget.employeeId, moveTarget.hour);
      if (!isAvailable) {
        console.error("O profissional não atende neste horário.");
        return;
      }

      const hasConflict = appointments.some(app => 
        app.id !== selectedAppointment.id &&
        app.employee_id === moveTarget.employeeId &&
        format(new Date(app.date), "HH:mm") === format(newDate, "HH:mm") &&
        format(new Date(app.date), "yyyy-MM-dd") === format(newDate, "yyyy-MM-dd")
      );

      if (hasConflict) {
        console.error("Já existe um agendamento neste horário.");
        return;
      }

      await Appointment.update(selectedAppointment.id, {
        employee_id: moveTarget.employeeId,
        date: format(newDate, "yyyy-MM-dd'T'HH:mm:ss")
      });

      await loadData();
      
      console.log("Agendamento movido com sucesso.");
    } catch (error) {
      console.error("Erro ao mover agendamento:", error);
    } finally {
      setShowMoveDialog(false);
      setSelectedAppointment(null);
      setMoveTarget({
        employeeId: "",
        hour: null,
        date: null
      });
    }
  };

  const handleAddToEmptySlot = (employeeId, hour) => {
    const newDate = new Date(date);
    newDate.setHours(hour, 0, 0, 0);
    setNewAppointment(prev => ({ 
      ...prev, 
      date: newDate,
      employee_id: employeeId
    }));
    setShowNewAppointmentDialog(true);
  };

  const handleConfirmAction = async () => {
    try {
      const appointment = appointments.find(app => app.id === confirmationDialog.appointmentId);
      if (!appointment) {
        console.error("Agendamento não encontrado");
        return;
      }

      switch (confirmationDialog.type) {
        case 'cancel':
          await Appointment.update(confirmationDialog.appointmentId, { status: 'cancelado' });
          await updatePackageSession(appointment, 'cancelado');
          break;
        case 'complete':
          await Appointment.update(confirmationDialog.appointmentId, { status: 'concluido' });
          await updatePackageSession(appointment, 'concluido');
          break;
        case 'delete':
          await handleDeleteAppointment(confirmationDialog.appointmentId);
          break;
      }

      if (confirmationDialog.type !== 'delete') {
        setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
      }
      await loadData();
    } catch (error) {
      console.error("Erro ao executar ação:", error);
      setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
    }
  };

  const updatePackageSession = async (appointment, newStatus) => {
    try {
      const clientPackages = await ClientPackage.filter({ 
        client_id: appointment.client_id,
        status: 'ativo'
      });
      
      const relevantPackage = clientPackages.find(pkg => {
        const packageData = packages.find(p => p.id === pkg.package_id);
        return packageData?.services.some(s => s.service_id === appointment.service_id);
      });

      if (relevantPackage) {
        const serviceData = services.find(s => s.id === appointment.service_id);
        const employeeData = employees.find(e => e.id === appointment.employee_id);
        const currentPackage = await ClientPackage.get(relevantPackage.id);
        
        const currentSessionHistory = Array.isArray(currentPackage.session_history) 
          ? currentPackage.session_history 
          : [];
        
        const existingSessionIndex = currentSessionHistory.findIndex(
          s => s.appointment_id === appointment.id
        );

        const sessionHistoryEntry = {
          date: appointment.date,
          employee_id: appointment.employee_id,
          employee_name: employeeData ? employeeData.name : "",
          appointment_id: appointment.id,
          service_id: appointment.service_id,
          service_name: serviceData ? serviceData.name : "",
          status: newStatus,
          notes: appointment.notes || ""
        };

        let updatedSessionHistory;
        if (existingSessionIndex >= 0) {
          updatedSessionHistory = [...currentSessionHistory];
          updatedSessionHistory[existingSessionIndex] = sessionHistoryEntry;
        } else {
          updatedSessionHistory = [...currentSessionHistory, sessionHistoryEntry];
        }
        
        const sessionsToAdd = newStatus === 'concluido' ? 1 : 0;
        const newSessionsUsed = (currentPackage.sessions_used || 0) + sessionsToAdd;
        
        await ClientPackage.update(relevantPackage.id, {
          sessions_used: newSessionsUsed,
          session_history: updatedSessionHistory,
          status: newSessionsUsed >= currentPackage.total_sessions ? 'finalizado' : 'ativo'
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar sessão do pacote:", error);
    }
  };

  const showConfirmDialog = (type, appointmentId) => {
    const configs = {
      cancel: {
        title: 'Cancelar Agendamento',
        description: 'Tem certeza que deseja cancelar este agendamento?',
        confirmText: 'Sim, cancelar'
      },
      complete: {
        title: 'Concluir Agendamento',
        description: 'Confirmar que este agendamento foi realizado?',
        confirmText: 'Sim, concluir'
      },
      delete: {
        title: 'Excluir Agendamento',
        description: 'Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.',
        confirmText: 'Sim, excluir'
      }
    };

    setConfirmationDialog({
      isOpen: true,
      type,
      appointmentId,
      ...configs[type]
    });
  };

  // Função para validar se o horário escolhido respeita o intervalo do profissional
  const validateAppointmentInterval = (employeeId, selectedHour) => {
    if (!employeeId) return true;
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !employee.appointment_interval) return true;
    
    const interval = employee.appointment_interval;
    const dayAppointments = getDayAppointments(newAppointment.date);
    const employeeAppointments = dayAppointments.filter(app => app.employee_id === employeeId);
    
    // Verificar se existe algum agendamento dentro do intervalo mínimo
    return !employeeAppointments.some(app => {
      const appHour = new Date(app.date).getHours();
      const hourDiff = Math.abs(appHour - selectedHour);
      return hourDiff < (interval / 60);
    });
  };

  // Função para verificar se um horário já está ocupado
  const checkTimeSlotAvailability = (employeeId, date, hour) => {
    if (!employeeId || !date) return { available: true, appointments: [] };
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const employeeAppointments = appointments.filter(app => 
      app.employee_id === employeeId && 
      format(new Date(app.date), 'yyyy-MM-dd') === dateStr &&
      new Date(app.date).getHours() === hour
    );
    
    return { 
      available: employeeAppointments.length === 0,
      appointments: employeeAppointments
    };
  };

  // Modificar o onChange do Select de horário para validar o intervalo
  const handleTimeSelection = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    const newDate = new Date(newAppointment.date);
    newDate.setHours(hours, minutes, 0, 0);
    
    // Verificar disponibilidade do horário
    const { available, appointments: conflictingAppointments } = 
      checkTimeSlotAvailability(newAppointment.employee_id, newAppointment.date, hours);
    
    if (!available) {
      // Mostrar diálogo de confirmação
      setConfirmOverlapDialog({
        isOpen: true,
        timeSlot: { hours, minutes },
        existingAppointments: conflictingAppointments
      });
    } else {
      // Horário disponível, atualizar normalmente
      setNewAppointment({...newAppointment, date: newDate});
    }
  };

  // Função para confirmar agendamento em horário ocupado
  const confirmOverlappingAppointment = () => {
    const { timeSlot } = confirmOverlapDialog;
    const newDate = new Date(newAppointment.date);
    newDate.setHours(timeSlot.hours, timeSlot.minutes, 0, 0);
    
    setNewAppointment({...newAppointment, date: newDate});
    setConfirmOverlapDialog({ isOpen: false, timeSlot: null, existingAppointments: [] });
  };

  useEffect(() => {
    const loadPendingServices = async () => {
      if (!newAppointment.client_id) {
        setPendingServices([]);
        return;
      }

      try {
        const pendingServicesData = await PendingService.filter({
          client_id: newAppointment.client_id,
          status: "pendente"
        });

        // Remove duplicatas baseado no service_id
        const uniquePendingServices = pendingServicesData.reduce((acc, current) => {
          const x = acc.find(item => item.service_id === current.service_id);
          if (!x) {
            return acc.concat([current]);
          }
          return acc;
        }, []);

        console.log("[Appointments] Serviços pendentes carregados:", uniquePendingServices);
        setPendingServices(uniquePendingServices);
      } catch (error) {
        console.error("[Appointments] Erro ao carregar serviços pendentes:", error);
        toast.error("Erro ao carregar serviços pendentes");
      }
    };

    loadPendingServices();
  }, [newAppointment.client_id]);

  const clearNewAppointmentForm = () => {
    setNewAppointment({
      client_id: "",
      employee_id: "",
      service_id: "",
      date: new Date(),
      status: "agendado",
      notes: "",
      original_appointment_id: null
    });
    setSelectedClientPackage(null);
    setSelectedPackageId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Agenda</h2>
        <Button 
          onClick={() => setShowNewAppointmentDialog(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid md:grid-cols-[300px,1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Calendário</h3>
                  <div className="flex">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const prevDay = new Date(date);
                        prevDay.setDate(date.getDate() - 1);
                        setDate(prevDay);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const nextDay = new Date(date);
                        nextDay.setDate(date.getDate() + 1);
                        setDate(nextDay);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold">
                    {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                </div>
                
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  className="rounded-md border"
                  locale={ptBR}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
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

                <div className="space-y-2">
                  {employees.map(employee => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`emp-${employee.id}`}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => toggleEmployeeFilter(employee.id)}
                      />
                      <Label htmlFor={`emp-${employee.id}`} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: employee.color || '#94a3b8' }}
                        ></div>
                        {employee.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-24 border-r"></th>
                    {filteredEmployees.map(employee => (
                      <th 
                        key={employee.id} 
                        className="p-2 border-b font-medium text-center"
                        style={{ 
                          borderBottom: `2px solid ${employee.color || '#94a3b8'}`,
                          backgroundColor: `${employee.color}10` // Fundo muito suave da cor do funcionário
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: employee.color || '#94a3b8' }}
                          ></div>
                          {employee.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((hour) => {
                    const currentDate = new Date(date);
                    const timeSlotDate = new Date(currentDate.setHours(hour, 0, 0, 0));
                    const slotAppointments = getDayAppointments(date).filter(
                      app => new Date(app.date).getHours() === hour
                    );

                    return (
                      <tr key={hour} className="border-b">
                        <td className="p-2 border-r text-sm text-gray-500 text-center">
                          {format(timeSlotDate, 'HH:mm')}
                        </td>

                        {filteredEmployees.map(employee => {
                          const empAppointments = slotAppointments.filter(
                            app => app.employee_id === employee.id
                          );

                          const isAvailable = getEmployeeAvailability(employee.id, hour);

                          return (
                            <td 
                              key={employee.id} 
                              className={`p-2 ${isAvailable ? '' : 'bg-gray-100'}`}
                              style={isAvailable ? { 
                                backgroundColor: `${employee.color}05`,  // Fundo muito suave da cor do funcionário
                                borderLeft: `1px solid ${employee.color}30` // Borda lateral suave da cor do funcionário
                              } : {}}
                            >
                              {empAppointments.map((app) => {
                                const client = clients.find(c => c.id === app.client_id);
                                const service = services.find(s => s.id === app.service_id);

                                return (
                                  <div
                                    key={app.id}
                                    className={`p-2 rounded-lg mb-1 cursor-pointer ${
                                      app.status === 'cancelado'
                                        ? 'bg-red-50 border-red-100'
                                        : app.status === 'concluido'
                                        ? 'bg-green-50 border-green-100'
                                        : ''
                                    } hover:ring-2 hover:ring-purple-300 transition-all`}
                                    style={app.status === 'agendado' ? {
                                      backgroundColor: `${employee.color}20`,
                                      borderLeft: `3px solid ${employee.color}`
                                    } : {}}
                                    onClick={() => handleSelectAppointment(app)}
                                  >
                                    <div className="flex flex-col">
                                      <p className="font-medium text-sm truncate">{client?.name}</p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {service?.name}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {format(new Date(app.date), "HH:mm")}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}

                              {isAvailable && empAppointments.length === 0 && (
                                <div 
                                  className="h-10 w-full rounded-md border border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
                                  onClick={() => handleAddToEmptySlot(employee.id, hour)}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNewAppointmentDialog} onOpenChange={setShowNewAppointmentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="relative">
                  <Input
                    placeholder="Digite o nome do cliente..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      searchClientsAndDependents(e.target.value);
                      setShowSearch(true);
                    }}
                    onFocus={() => setShowSearch(true)}
                  />
                  {showSearch && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => handleClientSelection(
                            result.type === 'titular' ? result.id : result.parent.id,
                            result.name,
                            result.type,
                            result.type === 'dependente' ? result.dependentIndex : null
                          )}
                        >
                          <div>
                            <span className="font-medium">{result.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({result.type === 'titular' ? 'Titular' : 'Dependente'})
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select
                  value={newAppointment.employee_id}
                  onValueChange={(value) => {
                    setNewAppointment({...newAppointment, employee_id: value, service_id: ""});
                    updateServicesForEmployee(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: employee.color || '#94a3b8' }}
                          ></div>
                          {employee.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newAppointment.client_id && clientPackages.length > 0 && (
              <div className="space-y-2">
                <Label>Pacote do Cliente</Label>
                <Select
                  value={selectedPackageId}
                  onValueChange={handlePackageSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pacote (opcional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum pacote (pagamento normal)</SelectItem>
                    {clientPackages.map((pkg) => {
                      const packageData = packages.find(p => p.id === pkg.package_id);
                      return (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {packageData?.name} - {pkg.sessions_used}/{pkg.total_sessions} sessões
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newAppointment.client_id && pendingServices.length > 0 && (
              <div className="space-y-2">
                <Label>Serviços Pendentes</Label>
                <Select
                  value={newAppointment.service_id}
                  onValueChange={(value) => {
                    const pendingService = pendingServices.find(ps => ps.service_id === value);
                    const service = services.find(s => s.id === value);
                    if (pendingService && service) {
                      setNewAppointment({
                        ...newAppointment,
                        service_id: value,
                        duration: service.duration || 60
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço pendente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingServices.map((ps, index) => {
                      const service = services.find(s => s.id === ps.service_id);
                      if (!service) return null;
                      
                      const key = `${ps.id}-${ps.service_id}-${index}`;
                      const purchaseDate = format(new Date(ps.created_date), "dd/MM/yyyy");
                      
                      return (
                        <SelectItem 
                          key={key}
                          value={ps.service_id}
                        >
                          {service.name} - {purchaseDate}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select
                value={newAppointment.service_id}
                onValueChange={(value) => setNewAppointment({...newAppointment, service_id: value})}
                disabled={!newAppointment.employee_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !newAppointment.employee_id 
                      ? "Selecione um profissional primeiro" 
                      : "Selecione o serviço..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredServices.length > 0 ? (
                    filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration}min)
                        {selectedPackageId && (
                          <span className="ml-2 text-green-600 font-medium">Pacote</span>
                        )}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={null} disabled>
                      {newAppointment.employee_id 
                        ? selectedPackageId 
                          ? "Nenhum serviço disponível neste pacote para este profissional" 
                          : "Nenhum serviço disponível para este profissional" 
                        : "Selecione um profissional primeiro"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {newAppointment.employee_id && filteredServices.length === 0 && (
                <p className="text-sm text-red-500 mt-1">
                  {selectedPackageId 
                    ? "Este profissional não possui serviços associados neste pacote."
                    : "Este profissional não possui serviços associados. Edite o cadastro do profissional para adicionar especialidades."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newAppointment.date, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newAppointment.date}
                      onSelect={(date) => {
                        const currentHour = newAppointment.date.getHours();
                        const currentMinute = newAppointment.date.getMinutes();
                        const newDate = new Date(date);
                        newDate.setHours(currentHour, currentMinute, 0);
                        setNewAppointment({...newAppointment, date: newDate})
                      }}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Select
                  value={newAppointment.date ? format(newAppointment.date, 'HH:mm') : ''}
                  onValueChange={handleTimeSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHours.map((hour) => {
                      const { available, appointments: conflictingApps } = 
                        checkTimeSlotAvailability(newAppointment.employee_id, newAppointment.date, hour);
                      
                      return (
                        <SelectItem 
                          key={hour} 
                          value={formatHour(hour)}
                          className={!available ? "bg-red-50 text-red-700 font-medium" : ""}
                        >
                          {formatHour(hour)}
                          {!available && (
                            <span className="ml-2 text-xs">
                              ({conflictingApps.length} agendamento{conflictingApps.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                placeholder="Observações sobre o agendamento..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setShowNewAppointmentDialog(false);
              setSelectedClientPackage(null);
              setSelectedPackageId("");
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                handleCreateAppointment();
                setShowNewAppointmentDialog(false);
              }} 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!newAppointment.client_id || !newAppointment.employee_id || !newAppointment.service_id}
            >
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mover Agendamento</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="py-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Agendamento selecionado:</p>
                <p className="font-medium">
                  {clients.find(c => c.id === selectedAppointment.client_id)?.name} - 
                  {' '}{services.find(s => s.id === selectedAppointment.service_id)?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedAppointment.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Mover para profissional:</Label>
                  <Select
                    value={moveTarget.employeeId}
                    onValueChange={(value) => setMoveTarget({...moveTarget, employeeId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: employee.color || '#94a3b8' }}
                            ></div>
                            {employee.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Horário:</Label>
                  <Select
                    value={moveTarget.hour !== null ? String(moveTarget.hour) : ""}
                    onValueChange={(value) => setMoveTarget({...moveTarget, hour: parseFloat(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o horário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableHours(moveTarget.employeeId).map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {formatHour(hour)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMoveDialog(false);
                setSelectedAppointment(null);
                setMoveTarget({
                  employeeId: "",
                  hour: null,
                  date: null
                });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleMoveAppointment}
              disabled={!moveTarget.employeeId || moveTarget.hour === null}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Mover Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAppointmentDetails && (
            <>
              <DialogHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-semibold">
                      {selectedAppointmentDetails.client.name}
                    </DialogTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedAppointmentDetails.client.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {selectedAppointmentDetails.client.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => handleViewClientDetails(selectedAppointmentDetails.client.id)}
                    >
                      <User className="h-4 w-4" />
                      Ver Ficha Completa
                    </Button>
                    <Badge variant={
                      selectedAppointmentDetails.appointment.status === 'concluido' ? 'success' :
                      selectedAppointmentDetails.appointment.status === 'cancelado' ? 'destructive' :
                      selectedAppointmentDetails.appointment.status === 'agendado' ? 'default' :
                      'outline'
                    }>
                      {selectedAppointmentDetails.appointment.status}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-gray-500">Serviço</Label>
                        <p className="font-medium">{selectedAppointmentDetails.service.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Profissional</Label>
                        <p className="font-medium">{selectedAppointmentDetails.employee.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Data e Hora</Label>
                        <p className="font-medium">
                          {format(new Date(selectedAppointmentDetails.appointment.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="appointments" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="appointments" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="packages" className="flex items-center gap-2">
                      <PackageIcon className="h-4 w-4" />
                      Pacotes
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pagamentos
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="appointments" className="mt-4">
                    <div className="space-y-4">
                      {clientAppointments.map((app, index) => (
                        <Card key={index}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${
                                  app.status === 'concluido' ? 'bg-green-500' :
                                  app.status === 'cancelado' ? 'bg-red-500' :
                                  'bg-blue-500'
                                }`} />
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {services.find(s => s.id === app.service_id)?.name} - 
                                    {employees.find(e => e.id === app.employee_id)?.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={app.status === 'concluido' ? 'success' : 'default'}>
                                  {app.status}
                                </Badge>
                                
                                {app.status === 'agendado' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                      onClick={() => showConfirmDialog('cancel', app.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => showConfirmDialog('complete', app.id)}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                      onClick={() => showConfirmDialog('delete', app.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                
                                {app.status === 'cancelado' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                    onClick={() => {
                                      setShowAppointmentDetails(false);
                                      setShowNewAppointmentDialog(true);
                                      setNewAppointment({
                                        client_id: selectedAppointmentDetails.client.id,
                                        service_id: selectedAppointmentDetails.service.id,
                                        employee_id: selectedAppointmentDetails.employee.id,
                                        date: new Date(),
                                        original_appointment_id: selectedAppointmentDetails.appointment.id,
                                        status: 'agendado'
                                      });
                                    }}
                                  >
                                    <CalendarPlus className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => showConfirmDialog('delete', app.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {clientAppointments.length === 0 && (
                        <p className="text-center text-gray-500 py-4">
                          Nenhum agendamento encontrado
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="packages" className="mt-4">
                    <div className="space-y-4">
                      {clientPackages.length > 0 ? clientPackages.map((pkg, index) => {
                        const packageDetails = packages.find(p => p.id === pkg.package_id);
                        const progress = (pkg.sessions_used / pkg.total_sessions) * 100;
                        
                        return (
                          <Card key={index}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{packageDetails?.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      Válido até {format(new Date(pkg.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <Badge variant={pkg.status === 'ativo' ? 'success' : 'default'}>
                                    {pkg.status}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Progresso</span>
                                    <span>{pkg.sessions_used} de {pkg.total_sessions} sessões</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all" 
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }) : (
                        <p className="text-center text-gray-500 py-4">Nenhum pacote encontrado</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="payments" className="mt-4">
                    <div className="space-y-4">
                      {clientPayments.length > 0 ? clientPayments.map((payment, index) => (
                        <Card key={index}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-lg">
                                  R$ {payment.amount.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {payment.payment_date ? format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR }) : 'Data não definida'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {payment.description}
                                </p>
                              </div>
                              <Badge variant={payment.status === 'pago' ? 'success' : 'default'}>
                                {payment.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <p className="text-center text-gray-500 py-4">Nenhum pagamento encontrado</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        {selectedAppointmentDetails.appointment.notes ? (
                          <div className="prose max-w-none">
                            <p>{selectedAppointmentDetails.appointment.notes}</p>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">
                            Nenhuma observação para este agendamento
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {selectedAppointmentDetails.client.notes && (
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Observações do Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose max-w-none text-sm">
                            <p>{selectedAppointmentDetails.client.notes}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>

                <DialogFooter className="flex gap-2 mt-6">
                  {selectedAppointmentDetails.appointment.status === 'agendado' && (
                    <>
                      <Button
                        onClick={() => showConfirmDialog('cancel', selectedAppointmentDetails.appointment.id)}
                        variant="destructive"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar Agendamento
                      </Button>
                      <Button
                        onClick={() => showConfirmDialog('complete', selectedAppointmentDetails.appointment.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Marcar como Concluído
                      </Button>
                    </>
                  )}
                  {selectedAppointmentDetails.appointment.status === 'cancelado' && (
                    <Button
                      onClick={() => {
                        setShowAppointmentDetails(false);
                        setShowNewAppointmentDialog(true);
                        setNewAppointment({
                          ...newAppointment,
                          client_id: selectedAppointmentDetails.client.id,
                          service_id: selectedAppointmentDetails.service.id,
                          employee_id: selectedAppointmentDetails.employee.id,
                          date: new Date(),
                          original_appointment_id: selectedAppointmentDetails.appointment.id,
                          status: 'agendado'
                        });
                      }}
                    >
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Reagendar
                    </Button>
                  )}
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={confirmationDialog.isOpen} 
        onOpenChange={(isOpen) => setConfirmationDialog(prev => ({...prev, isOpen}))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationDialog.title}</DialogTitle>
          </DialogHeader>
          <p className="py-4">{confirmationDialog.description}</p>
          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmationDialog(prev => ({...prev, isOpen: false}))}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => handleConfirmAction()}
              variant={confirmationDialog.type === 'delete' ? 'destructive' : 
                      confirmationDialog.type === 'cancel' ? 'secondary' : 
                      'default'}
            >
              {confirmationDialog.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={confirmOverlapDialog.isOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) setConfirmOverlapDialog({ isOpen: false, timeSlot: null, existingAppointments: [] });
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Horário já ocupado</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Atenção!</p>
              </div>
              <p className="text-sm text-amber-700">
                O horário {confirmOverlapDialog.timeSlot ? formatHour(confirmOverlapDialog.timeSlot.hours) : ""} já possui {confirmOverlapDialog.existingAppointments.length} agendamento{confirmOverlapDialog.existingAppointments.length > 1 ? 's' : ''}.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Agendamentos existentes:</p>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {confirmOverlapDialog.existingAppointments.map(app => {
                  const client = clients.find(c => c.id === app.client_id);
                  const service = services.find(s => s.id === app.service_id);
                  
                  return (
                    <div key={app.id} className="border p-3 rounded-md bg-gray-50">
                      <p className="font-medium">{client?.name || "Cliente"}</p>
                      <p className="text-sm text-gray-600">{service?.name || "Serviço"}</p>
                      <p className="text-xs text-gray-500">{format(new Date(app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <p className="text-sm">
              Deseja prosseguir com o agendamento mesmo assim?
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmOverlapDialog({ isOpen: false, timeSlot: null, existingAppointments: [] })}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmOverlappingAppointment}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Agendar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
