import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Check, X, Filter, ArrowRight, User, DollarSign, History, Phone, Mail, FileText, Package as PackageIcon, Scissors, CalendarPlus, Trash2, AlertTriangle } from "lucide-react";
import { format, parseISO, addDays, isAfter, isBefore, isEqual, getDay, addMonths, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import showToast from '@/utils/toast';
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
  PendingService,
  User as UserEntity
} from "@/firebase/entities";
import { Calendar } from "@/components/ui/calendar"; 
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast"; // Import the useToast hook
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import MultiAppointmentModal from '@/components/appointments/MultiAppointmentModal';
import app from "@/firebase/config";
import { getAuth } from "firebase/auth";

// Inicializa a autenticação
const auth = getAuth(app);

export default function Appointments() {
  const navigate = useNavigate();

  // Estados para popovers dos campos digitáveis
  const [showProfessionalPopover, setShowProfessionalPopover] = useState(false);
  const [showServicePopover, setShowServicePopover] = useState(false);
  const [showPendingPopover, setShowPendingPopover] = useState(false);

  // Estados para modal de agendamento múltiplo
  const [showMultiAppointmentDialog, setShowMultiAppointmentDialog] = useState(false);
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);

  // Estados para modal de agendamento múltiplo
  const [multiClientId, setMultiClientId] = useState("");
  const [multiSelectedItems, setMultiSelectedItems] = useState([]); // [{id, name/title, type}]
  const [multiDateTime, setMultiDateTime] = useState("");
  const [multiSearch, setMultiSearch] = useState("");
  const [multiClientSearch, setMultiClientSearch] = useState("");
  const [multiClientPackages, setMultiClientPackages] = useState([]);

  // Helpers para valores selecionados
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [hideCancelled, setHideCancelled] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    client_id: "",
    employee_id: "",
    service_id: "",
    date: new Date(),
    status: "agendado",
    notes: "",
    original_appointment_id: null,
    pending_service_id: null,
    dependent_index: null
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedClientPackage, setSelectedClientPackage] = useState(null);
  const [clientPackages, setClientPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [procedimentoTipo, setProcedimentoTipo] = useState("avulso");
  const [packages, setPackages] = useState([]);
  const [availableHours, setAvailableHours] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [serviceSessionsLeft, setServiceSessionsLeft] = useState({});

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
  
  // Estado para controlar a visibilidade dos filtros
  const [showFilters, setShowFilters] = useState(true);

  // Estado para o intervalo dos slots da agenda (com persistência no localStorage e banco de dados)
  const [intervaloAgenda, setIntervaloAgenda] = useState(() => {
    // Primeiro tenta obter do localStorage para experiência imediata
    const savedInterval = localStorage.getItem('appointmentInterval');
    return savedInterval ? Number(savedInterval) : 60; // padrão: 60 minutos
  });

  // Salvar o intervalo no localStorage e no banco de dados quando ele mudar
  const handleIntervaloChange = async (value) => {
    const newInterval = Number(value);
    setIntervaloAgenda(newInterval);
    
    // Salvar no localStorage para persistência local
    localStorage.setItem('appointmentInterval', newInterval.toString());
    
    // Salvar no banco de dados para persistência entre dispositivos
    try {
      // Verifica se o usuário está logado
      const currentUser = auth.currentUser;
      if (currentUser) {
        await UserEntity.update(currentUser.uid, {
          appointment_interval: newInterval
        });
      }
    } catch (error) {
      console.error("Erro ao salvar intervalo de agendamento:", error);
    }
  };

  // Carregar o intervalo do banco de dados quando o componente montar
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userData = await UserEntity.get(currentUser.uid);
          if (userData && userData.appointment_interval) {
            setIntervaloAgenda(userData.appointment_interval);
            localStorage.setItem('appointmentInterval', userData.appointment_interval.toString());
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do usuário:", error);
      }
    };
    
    loadUserSettings();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const clientId = searchParams.get('client_id');
    const pendingServiceId = searchParams.get('pending_service_id');
    
    if (clientId && pendingServiceId) {
      // Carregar dados do cliente e serviço pendente
      const loadPendingServiceData = async () => {
        try {
          const [clientData, pendingServiceData] = await Promise.all([
            Client.get(clientId),
            PendingService.get(pendingServiceId)
          ]);
          
          if (clientData && pendingServiceData) {
            // Pré-selecionar o cliente
            handleClientSelection(clientData.id, clientData.name, 'client');
            
            // Pré-selecionar o serviço
            setNewAppointment(prev => ({
              ...prev,
              client_id: clientData.id,
              service_id: pendingServiceData.service_id,
              pending_service_id: pendingServiceId
            }));
            
            // Abrir o modal de novo agendamento
            setShowNewAppointmentDialog(true);
          }
        } catch (error) {
          console.error('Erro ao carregar dados do serviço pendente:', error);
          showToast.error("Não foi possível carregar os dados do serviço pendente");
        }
      };
      
      loadPendingServiceData();
    }
  }, []);

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
      console.log("[Agenda] Carregando pacotes e outros dados...");
      const [appointmentsData, clientsData, servicesData, packagesData] = await Promise.all([
        Appointment.list(),
        Client.list(),
        Service.list(),
        Package.list()
      ]);
      console.log("[Agenda] Agendamentos carregados:", appointmentsData);
      // Removido: logs detalhados de cada agendamento
      // appointmentsData.forEach(a => {
      //   console.log(`[Agenda][DEBUG] Agendamento: id=${a.id}, date=${a.date}, status=${a.status}, client_id=${a.client_id}, employee_id=${a.employee_id}, service_id=${a.service_id}, package_id=${a.package_id}`);
      // });
      console.log("[Agenda] Pacotes carregados:", packagesData);

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
        
        // Tentar recarregar também os pacotes
        console.log("[Agenda] Tentando recarregar pacotes...");
        const packagesData = await Package.list();
        console.log("[Agenda] Pacotes recarregados:", packagesData);
        setPackages(packagesData);
      } catch (retryError) {
        console.error("[Agenda] Erro ao recarregar dados:", retryError);
      }
    }
  };

  const getWeekDay = (date) => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[getDay(date)];
  };

  const handleCreateAppointment = async () => {
    try {
      // Validações...
      if (!newAppointment.client_id || !newAppointment.employee_id || !newAppointment.service_id) {
        showToast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      // Dados do agendamento
      const appointmentData = {
        client_id: newAppointment.client_id,
        employee_id: newAppointment.employee_id,
        service_id: newAppointment.service_id,
        date: format(newAppointment.date, "yyyy-MM-dd'T'HH:mm:ss"),
        status: 'agendado',
        notes: newAppointment.notes || "",
        pending_service_id: newAppointment.pending_service_id || null,
        dependent_index: newAppointment.dependent_index || null
      };
      
      let updatedAppointment;
      
      // Se for um reagendamento, atualiza o agendamento existente
      if (newAppointment.original_appointment_id) {
        updatedAppointment = await Appointment.update(newAppointment.original_appointment_id, appointmentData);
      } else {
        // Se não for reagendamento, cria um novo
        updatedAppointment = await Appointment.create(appointmentData);
      }

      // Se houver um pacote selecionado e o tipo de procedimento for pacote, atualiza o histórico
      if (procedimentoTipo === "pacote" && selectedPackageId && selectedPackageId !== "") {
        try {
          const currentPackage = await ClientPackage.get(selectedPackageId);
          const serviceData = services.find(s => s.id === newAppointment.service_id);
          const employeeData = employees.find(e => e.id === newAppointment.employee_id);

          // Cria a entrada do histórico
          const sessionHistoryEntry = {
            service_id: newAppointment.service_id,
            service_name: serviceData?.name || "Serviço não encontrado",
            employee_id: newAppointment.employee_id,
            employee_name: employeeData?.name || "Profissional não encontrado",
            date: appointmentData.date,
            appointment_id: updatedAppointment.id,
            status: 'agendado'
          };

          // Se for reagendamento, remove a entrada antiga do histórico
          let updatedSessionHistory = [...(currentPackage.session_history || [])];
          if (newAppointment.original_appointment_id) {
            updatedSessionHistory = updatedSessionHistory.filter(
              entry => entry.appointment_id !== newAppointment.original_appointment_id
            );
          }
          
          // Adiciona a nova entrada
          updatedSessionHistory.push(sessionHistoryEntry);

          await ClientPackage.update(selectedPackageId, {
            session_history: updatedSessionHistory
          });
        } catch (error) {
          console.error("[Appointments] Erro ao atualizar pacote:", error);
        }
      }

      // Se houver um serviço pendente associado, atualizar seu status
      if (newAppointment.pending_service_id) {
        await PendingService.update(newAppointment.pending_service_id, {
          status: 'agendado',
          appointment_id: updatedAppointment.id
        });
      }

      // Recarrega os dados
      await loadData();
      
      // Se for reagendamento, atualiza a modal
      if (newAppointment.original_appointment_id && selectedAppointmentDetails?.appointment?.id === newAppointment.original_appointment_id) {
        await handleSelectAppointment(updatedAppointment);
      }
      
      // Limpa o formulário e fecha a modal de novo agendamento
      setShowNewAppointmentDialog(false);
      clearNewAppointmentForm();

      showToast.success(newAppointment.original_appointment_id
        ? "Agendamento atualizado com sucesso!"
        : "Agendamento criado com sucesso!");
    } catch (error) {
      console.error("[Appointments] Erro ao ", newAppointment.original_appointment_id ? "atualizar" : "criar", " agendamento:", error);
      showToast.error(`Erro ao ${newAppointment.original_appointment_id ? 'atualizar' : 'criar'} agendamento`);
    }
  };

  const getDayAppointments = (date) => {
    return appointments.filter(app => {
      const dateMatch = format(new Date(app.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      const statusMatch = !hideCancelled || app.status !== 'cancelado';
      return dateMatch && statusMatch;
    });
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

  const getServiceLabel = (service, selectedPackage, packageInfo) => {
    if (!selectedPackage || !packageInfo) return service.name;

    const packageService = packageInfo.services.find(s => s.service_id === service.id);
    if (!packageService) return service.name;

    // Conta apenas sessões concluídas
    const usedSessions = selectedPackage.session_history?.filter(
      h => h.service_id === service.id && h.status === 'concluido'
    ).length || 0;
    
    const remainingSessions = packageService.quantity - usedSessions;
    
    return `${service.name} (${remainingSessions}/${packageService.quantity} sessões)`;
  };

  const updateServicesForEmployee = async (employeeId, currentPackageId = null) => {
    const employee = employees.find(emp => emp.id === employeeId);
    console.log("[DEBUG] Atualizando serviços para profissional:", employeeId);
    console.log("[DEBUG] Pacote atual:", currentPackageId || selectedPackageId);
    console.log("[DEBUG] Tipo de procedimento:", procedimentoTipo);
    
    if (employee && employee.specialties && employee.specialties.length > 0) {
      let availableServices = [];
      
      // Usa o pacote passado como parâmetro ou o estado atual
      const packageId = currentPackageId || selectedPackageId;
      
      // Se for procedimento de pacote e um pacote foi selecionado, mostrar apenas os serviços do pacote
      if (procedimentoTipo === "pacote" && packageId && packageId !== "") {
        console.log("[DEBUG] Filtrando por pacote:", {
          packageId,
          selectedClientPackage
        });
        
        const selectedPackage = clientPackages.find(pkg => pkg.id === packageId);
        if (!selectedPackage) {
          console.error("[ERROR] Pacote não encontrado:", packageId);
          setSelectedPackageId("");
          setSelectedClientPackage(null);
          return;
        }
        
        let packageInfo = null;
  
        // Verificar se é um pacote personalizado (IDs que começam com 'custom_')
        const isCustomPackage = selectedPackage.package_id?.startsWith('custom_');
        console.log("[DEBUG] É um pacote personalizado?", isCustomPackage);
  
        // Buscar informações do pacote
        if (!isCustomPackage) {
          // Para pacotes regulares, buscar da lista de pacotes
          packageInfo = packages.find(p => p.id === selectedPackage.package_id);
          console.log("[DEBUG] Informações do pacote regular:", packageInfo);
        } else {
          // Para pacotes personalizados, usar os serviços incluídos diretamente no pacote do cliente
          console.log("[DEBUG] Usando informações do pacote personalizado");
          console.log("[DEBUG] Pacote completo:", selectedPackage);
          
          // Verificar se temos serviços no package_snapshot
          const packageSnapshot = selectedPackage.package_snapshot;
          console.log("[DEBUG] Package snapshot:", packageSnapshot);
          
          // Verificar diferentes locais onde os serviços podem estar armazenados
          let packageServices = [];
          
          // Opção 1: Serviços no package_snapshot.services (formato de array de objetos com service_id)
          if (packageSnapshot && packageSnapshot.services && Array.isArray(packageSnapshot.services)) {
            // Extrair os IDs de serviço do package_snapshot.services
            packageServices = packageSnapshot.services.map(s => s.service_id);
            console.log("[DEBUG] Serviços encontrados no package_snapshot:", packageServices);
          }
          // Opção 2: Serviços no array services do pacote
          else if (selectedPackage.services && selectedPackage.services.length > 0) {
            packageServices = selectedPackage.services;
            console.log("[DEBUG] Serviços encontrados no array services:", packageServices);
          }
          
          if (packageServices.length > 0) {
            console.log("[DEBUG] Serviços do pacote personalizado:", packageServices);
            
            // Filtrar serviços que estão no pacote E que o profissional pode realizar
            availableServices = services.filter(service => {
              // Verificar se o serviço está no pacote personalizado
              const serviceInPackage = packageServices.includes(service.id);
              // Verificar se o profissional pode realizar este serviço
              const canPerformService = employee.specialties.includes(service.id);
              
              console.log(`[DEBUG] Avaliando serviço personalizado ${service.name}:`, {
                id: service.id,
                serviceInPackage,
                canPerformService
              });
              
              return serviceInPackage && canPerformService;
            }).map(service => ({
              ...service,
              displayName: `${service.name} (Pacote: ${selectedPackage.name || packageSnapshot?.name || "Personalizado"})`
            }));
          } else {
            // Se não encontrarmos serviços em nenhum lugar, mostrar uma mensagem de aviso
            console.log("[DEBUG] Nenhum serviço encontrado no pacote personalizado");
            showToast.warning("Este pacote não possui serviços definidos. Entre em contato com o administrador.");
            availableServices = [];
          }
        }
  
        // Se o pacote não for encontrado e não for personalizado, tentar recarregar
        if (!packageInfo && !isCustomPackage) {
          console.log("[DEBUG] Pacote não encontrado na lista atual, tentando recarregar...");
          try {
            // Recarregar todos os pacotes
            const packagesData = await Package.list();
            console.log("[DEBUG] Pacotes recarregados:", packagesData);
            setPackages(packagesData);
      
            // Tentar encontrar o pacote novamente
            packageInfo = packagesData.find(p => p.id === selectedPackage.package_id);
            console.log("[DEBUG] Pacote encontrado após recarga:", packageInfo);
      
            if (!packageInfo) {
              console.log("[DEBUG] Pacote não encontrado mesmo após recarga, tratando como personalizado");
              // Tratar como personalizado se não encontrar
            }
          } catch (error) {
            console.error("[ERROR] Erro ao recarregar pacotes:", error);
          }
        }
  
        // Atualiza os estados do pacote imediatamente
        setSelectedPackageId(packageId);
        setSelectedClientPackage(selectedPackage);
  
        // Limpa o serviço selecionado para forçar uma nova seleção
        setNewAppointment(prev => ({
          ...prev,
          service_id: ""
        }));

        // Atualiza os serviços disponíveis com base no profissional e pacote selecionados
        if (newAppointment.employee_id) {
          // Pequeno delay para garantir que o estado foi atualizado
          await new Promise(resolve => setTimeout(resolve, 100));
          // Chama a função com o pacote atual
          updateServicesForEmployee(newAppointment.employee_id, packageId);
        }
      } else {
        // Se for procedimento avulso ou não houver pacote selecionado, mostrar todos os serviços que o profissional pode realizar
        availableServices = services.filter(service =>
          employee.specialties.includes(service.id)
        );
      }
      
      console.log("[DEBUG] Serviços filtrados finais:", availableServices.map(s => s.displayName || s.name));
      setFilteredServices(availableServices);
    } else {
      console.log("[DEBUG] Nenhuma especialidade encontrada para o profissional");
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
      console.log("[DEBUG] Pacotes do cliente carregados:", clientPackagesData);
      
      // Verificar se os package_id dos pacotes do cliente existem na lista de pacotes
      if (clientPackagesData.length > 0) {
        console.log("[DEBUG] Lista de packages disponíveis:", packages);
        clientPackagesData.forEach(pkg => {
          const packageFound = packages.find(p => p.id === pkg.package_id);
          console.log(`[DEBUG] Pacote ${pkg.id} (package_id: ${pkg.package_id}) - Encontrado: ${!!packageFound}`, 
            packageFound ? packageFound.name : "Nome não encontrado");
        });
      }
      
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
      showToast.error("Erro ao carregar dados do cliente");
    }
  };

  const handlePackageSelection = async (packageId) => {
    console.log("[DEBUG] Pacote selecionado na função handlePackageSelection:", packageId);
    
    // Buscar o pacote selecionado por id (padrão) ou, se não existir, por fallback
    let selectedPackage = clientPackages.find(pkg => pkg.id === packageId);
    if (!selectedPackage) {
      // Fallback: tentar encontrar pelo package_id se o id não existir
      selectedPackage = clientPackages.find(pkg => pkg.package_id === packageId);
      if (!selectedPackage) {
        console.error("[ERROR] Pacote não encontrado:", packageId);
        setSelectedPackageId("");
        setSelectedClientPackage(null);
        setFilteredServices([]);
        setServiceSessionsLeft({});
        return;
      }
    }
    console.log('[DEBUG] selectedPackage:', selectedPackage);

    let packageInfo = null;
    let packageServices = [];
    let sessionsByService = {};
    const isCustomPackage = selectedPackage.package_id?.startsWith('custom_') || !selectedPackage.package_id;
    
    // Buscar informações do pacote
    if (!isCustomPackage) {
      packageInfo = packages.find(p => p.id === selectedPackage.package_id);
      if (packageInfo && Array.isArray(packageInfo.services)) {
        packageServices = packageInfo.services.map(s => typeof s === 'object' ? (s.service_id || s.id) : s);
        if (Array.isArray(packageInfo.services)) {
          packageInfo.services.forEach(s => {
            const serviceId = typeof s === 'object' ? (s.service_id || s.id) : s;
            sessionsByService[serviceId] = s.quantity || packageInfo.quantity || 1;
          });
        }
      }
    } else {
      // Para pacotes personalizados ou sem package_id, usar informações do próprio pacote do cliente
      const packageSnapshot = selectedPackage.package_snapshot;
      if (packageSnapshot && packageSnapshot.services && Array.isArray(packageSnapshot.services)) {
        packageServices = packageSnapshot.services.map(s => (typeof s === 'object' ? (s.service_id || s.id) : s));
        packageSnapshot.services.forEach(s => {
          const serviceId = typeof s === 'object' ? (s.service_id || s.id) : s;
          sessionsByService[serviceId] = s.quantity || packageSnapshot.quantity || 1;
        });
      } else if (selectedPackage.services && selectedPackage.services.length > 0) {
        packageServices = selectedPackage.services.map(s => (typeof s === 'object' ? (s.service_id || s.id) : s));
        selectedPackage.services.forEach(s => {
          const serviceId = typeof s === 'object' ? (s.service_id || s.id) : s;
          sessionsByService[serviceId] = s.quantity || selectedPackage.quantity || 1;
        });
      } else {
        // Fallback: tentar pegar serviços do campo services_included (caso exista)
        if (selectedPackage.services_included && Array.isArray(selectedPackage.services_included)) {
          packageServices = selectedPackage.services_included.map(s => (typeof s === 'object' ? (s.service_id || s.id) : s));
          selectedPackage.services_included.forEach(s => {
            const serviceId = typeof s === 'object' ? (s.service_id || s.id) : s;
            sessionsByService[serviceId] = s.quantity || 1;
          });
        }
      }
    }

    // Calcular sessões já utilizadas por serviço
    let usedSessionsByService = {};
    if (Array.isArray(selectedPackage.session_history)) {
      selectedPackage.session_history.forEach(sess => {
        if (sess.status === 'concluido' && sess.service_id) {
          usedSessionsByService[sess.service_id] = (usedSessionsByService[sess.service_id] || 0) + 1;
        }
      });
    }

    // Montar objeto final de sessões restantes por serviço
    const sessionsLeft = {};
    packageServices.forEach(serviceId => {
      const total = sessionsByService[serviceId] || 1;
      const used = usedSessionsByService[serviceId] || 0;
      sessionsLeft[serviceId] = total - used;
    });
    setServiceSessionsLeft(sessionsLeft);

    // Filtrar e montar lista de serviços para o select
    const filtered = services.filter(service => packageServices.includes(service.id)).map(service => ({
      ...service,
      displayName: `${service.name} (${sessionsLeft[service.id] > 0 ? `${sessionsLeft[service.id]} restante(s)` : 'Esgotado'})`
    }));
    setFilteredServices(filtered);

    setSelectedPackageId(packageId);
    setSelectedClientPackage(selectedPackage);
    setNewAppointment(prev => ({
      ...prev,
      service_id: ""
    }));
  };

  const handleSelectAppointment = async (appointment) => {
    try {
      setSelectedAppointment(appointment);
      
      const client = clients.find(c => c.id === appointment.client_id);
      
      const allAppointments = await Appointment.filter({ client_id: appointment.client_id });
      const sortedAppointments = allAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const clientPkgs = await ClientPackage.filter({ client_id: appointment.client_id, status: 'ativo' });
      
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
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      // Atualizar o status do agendamento
      await Appointment.update(appointmentId, { status: newStatus });

      // Se o agendamento tem um serviço pendente associado, atualizar seu status
      if (appointment.pending_service_id) {
        await PendingService.update(appointment.pending_service_id, {
          status: newStatus === 'concluido' ? 'concluido' : 'agendado'
        });
      }

      // Se o agendamento está associado a um pacote, atualizar a sessão
      if (appointment.package_id) {
        await updatePackageSession(appointment, newStatus);
      }

      // Atualizar a lista de agendamentos
      await loadData();

      showToast.success("O status do agendamento foi atualizado com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showToast.error("Não foi possível atualizar o status do agendamento");
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      // Exclui o agendamento
      await Appointment.delete(appointmentId);
      
      // Recarrega os dados
      await loadData();
      
      // Apenas fecha o diálogo de confirmação, mas mantém a modal de detalhes aberta
      setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
      
      // Atualiza os dados do cliente para refletir a exclusão
      if (selectedAppointmentDetails?.client) {
        const updatedAppointments = await Appointment.filter({ client_id: selectedAppointmentDetails.client.id });
        const sortedAppointments = updatedAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
        setClientAppointments(sortedAppointments);
      }
      
      // Mostra mensagem de sucesso
      showToast.success("Agendamento excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      
      // Mostra mensagem de erro
      showToast.error("Ocorreu um erro ao excluir o agendamento");
      
      // Apenas fecha o diálogo de confirmação em caso de erro
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

  const handleAddToEmptySlot = (employeeId, hour, minute) => {
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
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

      // Recarrega os dados gerais
      await loadData();

      // Se não for uma exclusão, atualiza os detalhes do agendamento
      if (confirmationDialog.type !== 'delete') {
        // Busca o agendamento atualizado
        const updatedAppointment = await Appointment.get(confirmationDialog.appointmentId);
        if (updatedAppointment) {
          // Atualiza os detalhes do agendamento na modal
          await handleSelectAppointment(updatedAppointment);
        }
        setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
      }
    } catch (error) {
      console.error("Erro ao executar ação:", error);
      showToast.error("Ocorreu um erro ao executar a ação");
      setConfirmationDialog({ isOpen: false, type: null, appointmentId: null });
    }
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
        showToast.error("Erro ao carregar serviços pendentes");
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
      original_appointment_id: null,
      pending_service_id: null,
      dependent_index: null
    });
    setSelectedClientPackage(null);
    setSelectedPackageId("");
    setProcedimentoTipo("avulso");
  };

  // Carregar a preferência do usuário do localStorage ao inicializar
  useEffect(() => {
    const savedPreference = localStorage.getItem('showAgendaFilters');
    if (savedPreference !== null) {
      setShowFilters(savedPreference === 'true');
    }
  }, []);

  // Salvar a preferência do usuário no localStorage quando mudar
  const toggleFilters = () => {
    const newValue = !showFilters;
    setShowFilters(newValue);
    localStorage.setItem('showAgendaFilters', newValue.toString());
  };

  const handleOpenNewAppointmentDialog = async () => {
    // Verificar se os pacotes já foram carregados
    if (packages.length === 0) {
      console.log("[Agenda] Carregando pacotes antes de abrir o modal...");
      try {
        const packagesData = await Package.list();
        console.log("[Agenda] Pacotes carregados:", packagesData);
        setPackages(packagesData);
      } catch (error) {
        console.error("[Agenda] Erro ao carregar pacotes:", error);
        showToast.error("Erro ao carregar pacotes. Tente novamente.");
      }
    }
    
    // Limpar o formulário e abrir o modal
    clearNewAppointmentForm();
    setShowNewAppointmentDialog(true);
  };

  const updatePackageSession = async (appointment, newStatus) => {
    try {
      console.log("[updatePackageSession][START] appointment:", appointment);
      console.log("[updatePackageSession][START] newStatus:", newStatus);
      const clientPackages = await ClientPackage.filter({ 
        client_id: appointment.client_id,
        status: 'ativo'
      });
      console.log("[updatePackageSession] Pacotes ativos encontrados:", clientPackages);
      // Novo: buscar pacote relevante por id OU package_id OU serviços incluídos
      const relevantPackage = clientPackages.find(pkg => {
        // 1. Se não tem package_id (personalizado), verifica serviços e snapshot
        if (!pkg.package_id) {
          if (pkg.services && pkg.services.some(s => (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
            return true;
          }
          if (pkg.package_snapshot && pkg.package_snapshot.services && pkg.package_snapshot.services.some(s => (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
            return true;
          }
          if (pkg.services_included && pkg.services_included.some(s => (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
            return true;
          }
          return false;
        }
        const packageData = packages.find(p => p.id === pkg.package_id);
        if (!packageData) return false;
        if (packageData.services && packageData.services.some(s => (typeof s === 'object' ? (s.service_id || s.id) : s) === appointment.service_id)) {
          return true;
        }
        return false;
      });
      console.log("[updatePackageSession] relevantPackage:", relevantPackage);
      if (relevantPackage) {
        console.log("[updatePackageSession] Pacote relevante encontrado:", relevantPackage.id);
        const serviceData = services.find(s => s.id === appointment.service_id);
        const employeeData = employees.find(e => e.id === appointment.employee_id);
        const currentSessionHistory = Array.isArray(relevantPackage.session_history) 
          ? relevantPackage.session_history 
          : [];
        let updatedSessionHistory;
        const sessionIndex = currentSessionHistory.findIndex(
          s => s.appointment_id === appointment.id
        );
        console.log("[updatePackageSession] sessionIndex:", sessionIndex, "currentSessionHistory:", currentSessionHistory);
        const wasCompleted = sessionIndex >= 0 && currentSessionHistory[sessionIndex].status === 'concluido';
        const willBeCompleted = newStatus === 'concluido';
        let sessionsUsedDelta = 0;
        if (!wasCompleted && willBeCompleted) {
          sessionsUsedDelta = 1;
        } else if (wasCompleted && !willBeCompleted) {
          sessionsUsedDelta = -1;
        }
        if (sessionIndex >= 0) {
          // Atualiza a sessão existente e remove duplicatas para este appointment_id
          updatedSessionHistory = currentSessionHistory
            .filter((session, index) => session.appointment_id !== appointment.id || index === sessionIndex)
            .map((session, index) =>
              index === sessionIndex
                ? { ...session, status: newStatus }
                : session
            );
          console.log("[updatePackageSession][Ajuste] Atualizando sessão existente e removendo duplicatas:", updatedSessionHistory);
          await ClientPackage.update(relevantPackage.id, {
            session_history: updatedSessionHistory,
            sessions_used: Math.max(0, (relevantPackage.sessions_used || 0) + sessionsUsedDelta)
          });
        } else {
          // Antes de adicionar uma nova, remove qualquer sessão duplicada para este appointment_id
          let updatedSessionHistory = [...(currentSessionHistory || [])].filter(session => session.appointment_id !== appointment.id);
          const sessionHistoryEntry = {
            service_id: appointment.service_id,
            service_name: serviceData?.name || "Serviço não encontrado",
            employee_id: appointment.employee_id,
            employee_name: employeeData?.name || "Profissional não encontrado",
            date: appointment.date,
            appointment_id: appointment.id,
            status: newStatus,
            notes: appointment.notes || ""
          };
          updatedSessionHistory.push(sessionHistoryEntry);

          await ClientPackage.update(relevantPackage.id, {
            session_history: updatedSessionHistory,
            sessions_used: Math.max(0, (relevantPackage.sessions_used || 0) + sessionsUsedDelta)
          });
        }
        if (appointment.pending_service_id) {
          console.log("[updatePackageSession] Atualizando serviço pendente:", appointment.pending_service_id);
          await PendingService.update(appointment.pending_service_id, {
            status: newStatus === 'concluido' ? 'concluido' : 'agendado'
          });
        }
        await loadData();
        if (appointment.original_appointment_id && selectedAppointmentDetails?.appointment?.id === appointment.original_appointment_id) {
          await handleSelectAppointment(appointment);
        }
        setShowNewAppointmentDialog(false);
        clearNewAppointmentForm();
        showToast.success("Agendamento criado com sucesso!");
      } else {
        console.log("[updatePackageSession] Nenhum pacote relevante encontrado para o agendamento:", appointment.id, appointment);
      }
    } catch (error) {
      console.error("[updatePackageSession][ERROR] Erro ao atualizar sessão do pacote:", error, appointment);
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

  // --- Bulk Action Handlers ---
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [bulkSelectedAppointments, setBulkSelectedAppointments] = useState([]);
  const [bulkActionsDate, setBulkActionsDate] = useState(date);

  const openBulkActionsModal = () => {
    setShowBulkActionsModal(true);
    setBulkSelectedAppointments([]);
  };

  const closeBulkActionsModal = () => {
    setShowBulkActionsModal(false);
    setBulkSelectedAppointments([]);
  };

  const bulkDayAppointments = getDayAppointments(bulkActionsDate);

  const toggleBulkAppointment = (appointmentId) => {
    setBulkSelectedAppointments(prev =>
      prev.includes(appointmentId)
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      for (const appointmentId of bulkSelectedAppointments) {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (!appointment) continue;
        await Appointment.update(appointmentId, { status: newStatus });
        if (appointment.package_id) {
          await updatePackageSession(appointment, newStatus);
        }
        if (appointment.pending_service_id) {
          await PendingService.update(appointment.pending_service_id, {
            status: newStatus === 'concluido' ? 'concluido' : 'agendado'
          });
        }
      }
      await loadData();
      showToast.success(`Agendamentos ${newStatus === 'concluido' ? 'confirmados' : 'cancelados'} com sucesso!`);
      closeBulkActionsModal();
    } catch (error) {
      showToast.error("Não foi possível atualizar os agendamentos em massa");
    }
  };

  const handleToggleMultiSelectedItem = (item) => {
    setMultiSelectedItems(prev => {
      if (prev.some(sel => sel.id === item.id)) {
        return prev.filter(sel => sel.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const handleMultiAppointmentConfirm = async (dados) => {
    // Espera-se: { client_id, package_id, agendamentos: [{ tipo, servico, profissional, data, hora, original_appointment_id, pending_service_id }] }
    if (!dados || !dados.client_id || !Array.isArray(dados.agendamentos) || dados.agendamentos.length === 0) return;
    const { client_id, package_id, agendamentos } = dados;
    
    try {
      // Contador para agendamentos bem-sucedidos
      let sucessCount = 0;
      
      for (const item of agendamentos) {
        await handleCreateAppointmentMulti({
          client_id,
          service_or_package_id: item.servico,
          date: item.data,
          type: item.tipo,
          employee_id: item.profissional,
          package_id: item.tipo === 'pacote' ? package_id : null,
          hora: item.hora, // Passa hora explicitamente
          original_appointment_id: item.original_appointment_id, // Passa o ID do agendamento original
          pending_service_id: item.pending_service_id // Passa o ID do serviço pendente
        });
        
        sucessCount++;
      }
      
      // Mostrar notificação de sucesso
      if (sucessCount > 0) {
        const message = sucessCount === 1 
          ? "Agendamento realizado com sucesso!" 
          : `${sucessCount} agendamentos realizados com sucesso!`;
        
        showToast.success(message);
      }
      
      setShowMultiAppointmentDialog(false);
      setMultiClientId("");
      setMultiSelectedItems([]);
      setMultiDateTime("");
    } catch (error) {
      console.error("Erro ao criar agendamentos:", error);
      showToast.error("Ocorreu um erro ao realizar os agendamentos. Por favor, tente novamente.");
    }
  };

  const handleCreateAppointmentMulti = async ({ client_id, service_or_package_id, date, type, employee_id, package_id, hora, original_appointment_id, pending_service_id }) => {
    try {
      // Combina data e hora igual ao modal antigo
      let appointmentDate;
      if (typeof date === 'string') {
        // Corrigir problema de fuso horário: garantir que a data seja interpretada no fuso horário local
        const [year, month, day] = date.split('-').map(Number);
        appointmentDate = new Date(year, month - 1, day); // Mês em JavaScript é 0-indexed
      } else {
        appointmentDate = new Date(date.getTime());
      }
      if (hora) {
        const [hours, minutes] = hora.split(":").map(Number);
        appointmentDate.setHours(hours, minutes, 0, 0);
      }
      const formattedDate = format(appointmentDate, "yyyy-MM-dd'T'HH:mm:ss");
      console.log("[DEBUG][handleCreateAppointmentMulti] Data original:", date);
      console.log("[DEBUG][handleCreateAppointmentMulti] Data formatada:", formattedDate);
      
      // Preparar os dados do agendamento, garantindo que package_id seja null e não undefined
      const appointmentData = {
        client_id,
        employee_id,
        service_id: service_or_package_id,
        date: formattedDate,
        status: 'agendado'
      };
      
      // Adicionar package_id apenas se for do tipo pacote e package_id existir
      if (type === 'pacote' && package_id) {
        appointmentData.package_id = package_id;
      } else {
        appointmentData.package_id = null; // Garantir que seja null e não undefined
      }
      
      // Adicionar pending_service_id se existir
      if (pending_service_id) {
        appointmentData.pending_service_id = pending_service_id;
      }

      let result;
      
      // Verificar se é um reagendamento
      if (original_appointment_id) {
        console.log("[DEBUG][handleCreateAppointmentMulti] Reagendando agendamento:", original_appointment_id);
        result = await Appointment.update(original_appointment_id, appointmentData);
      } else {
        // Se não for reagendamento, cria um novo
        result = await Appointment.create(appointmentData);
      }

      // Atualizar o histórico do pacote se o agendamento for do tipo pacote
      if (type === 'pacote' && package_id) {
        console.log("[DEBUG][handleCreateAppointmentMulti] Atualizando histórico do pacote:", package_id);
        
        try {
          const clientPackage = await ClientPackage.get(package_id);
          if (clientPackage) {
            let updatedSessionHistory = [...(clientPackage.session_history || [])];
            
            // Se for reagendamento, remover a entrada antiga do histórico
            if (original_appointment_id) {
              updatedSessionHistory = updatedSessionHistory.filter(
                entry => entry.appointment_id !== original_appointment_id
              );
            }
            
            // Adicionar a nova entrada ao histórico
            const serviceData = services.find(s => s.id === service_or_package_id);
            const employeeData = employees.find(e => e.id === employee_id);
            
            const sessionHistoryEntry = {
              service_id: service_or_package_id,
              service_name: serviceData?.name || "Serviço não encontrado",
              employee_id: employee_id,
              employee_name: employeeData?.name || "Profissional não encontrado",
              date: formattedDate,
              appointment_id: result.id || original_appointment_id,
              status: 'agendado'
            };
            
            updatedSessionHistory.push(sessionHistoryEntry);

            await ClientPackage.update(package_id, {
              session_history: updatedSessionHistory
            });
            
            console.log("[DEBUG][handleCreateAppointmentMulti] Histórico do pacote atualizado com sucesso");
          }
        } catch (error) {
          console.error("[ERROR][handleCreateAppointmentMulti] Erro ao atualizar histórico do pacote:", error);
        }
        
        await updatePackageSession(result, 'agendado');
      }
      
      // Atualizar o status do serviço pendente para "agendado" se existir
      if (pending_service_id) {
        try {
          console.log("[DEBUG][handleCreateAppointmentMulti] Atualizando serviço pendente:", pending_service_id);
          await PendingService.update(pending_service_id, {
            status: 'agendado',
            appointment_id: result.id || original_appointment_id
          });
          console.log("[DEBUG][handleCreateAppointmentMulti] Serviço pendente atualizado com sucesso");
        } catch (error) {
          console.error("[ERROR][handleCreateAppointmentMulti] Erro ao atualizar serviço pendente:", error);
        }
      }
      
      // Opcional: recarregar dados após criar
      await loadData();
      
      return result;
    } catch (error) {
      console.error("[ERROR][handleCreateAppointmentMulti] Falha ao criar agendamento múltiplo:", error);
      throw error; // Propagar o erro para ser tratado pelo chamador
    }
  };

  const filteredMultiItems = services.concat(packages).filter(item => {
    const term = multiSearch.toLowerCase();
    const name = (item.name || item.title || "").toLowerCase();
    return name.includes(term);
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(multiClientSearch.toLowerCase())
  );

  useEffect(() => {
    if (!multiClientId) {
      setMultiClientPackages([]);
      return;
    }
    (async () => {
      const pkgs = await ClientPackage.filter({ client_id: multiClientId, status: 'ativo' });
      setMultiClientPackages(pkgs);
    })();
  }, [multiClientId]);

  function renderClientPackages() {
    if (!multiClientId || multiClientPackages.length === 0) return null;
    return (
      <div className="mt-2 space-y-2">
        <Label>Pacotes ativos do cliente</Label>
        <div className="space-y-1">
          {multiClientPackages.map(pkg => (
            <div key={pkg.id} className="border rounded p-2 bg-gray-50">
              <div className="font-semibold text-green-800">{pkg.title || pkg.name || "Pacote"}</div>
              <div className="text-xs text-gray-600">Sessões restantes: {pkg.sessions_left ?? '-'}</div>
              {pkg.services && Array.isArray(pkg.services) && (
                <div className="text-xs mt-1 text-gray-700">
                  Procedimentos: {pkg.services.map(sid => {
                    const svc = services.find(s => s.id === (sid.id || sid));
                    return svc ? svc.name : sid.name || sid;
                  }).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedProfessional = employees.find(e => e.id === newAppointment.employee_id);
  const selectedService = services.find(s => s.id === newAppointment.service_id);
  const selectedPendingService = pendingServices.find(ps => ps.service_id === newAppointment.service_id);

  const handleViewClientDetails = (clientId) => {
    navigate(`/client-details?id=${clientId}`);
    setShowAppointmentDetails(false);
  };

  // Função para gerar os slots de horários dinâmicos
  const gerarSlots = () => {
    const slots = [];
    const start = 8 * 60; // 8:00 em minutos
    const end = 20 * 60; // 20:00 em minutos
    for (let min = start; min < end; min += intervaloAgenda) {
      slots.push(min);
    }
    return slots;
  };

  // Formatar os horários para exibição
  const formatarHora = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  // Função para verificar se um agendamento pertence a um slot específico
  const isAppointmentInSlot = (appointment, slotMinutes) => {
    const appDate = new Date(appointment.date);
    const appHour = appDate.getHours();
    const appMinute = appDate.getMinutes();
    const appTotalMinutes = appHour * 60 + appMinute;
    
    // Verifica se o agendamento está dentro do intervalo deste slot
    const slotStart = slotMinutes;
    const slotEnd = slotMinutes + intervaloAgenda;
    
    return appTotalMinutes >= slotStart && appTotalMinutes < slotEnd;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-gray-800">Agenda</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleFilters}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            {showFilters ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Ocultar Filtros
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-1" />
                Mostrar Filtros
              </>
            )}
          </Button>
        </div>
        <div className="flex gap-2 mb-4">
          <Button
            className="bg-purple-700 hover:bg-purple-800"
            onClick={() => setShowNewAppointmentDialog(true)}
          >
            + Novo Agendamento
          </Button>
          <Button
            className="bg-green-700 hover:bg-green-800"
            onClick={() => setShowMultiAppointmentDialog(true)}
          >
            + Agendamento Múltiplo
          </Button>
        </div>
      </div>

      <div className={`grid ${showFilters ? 'md:grid-cols-[300px,1fr]' : 'md:grid-cols-[0fr,1fr]'} gap-6`}>
        <div className={`space-y-4 transition-all duration-300 ${showFilters ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'}`}>
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
                      {employee.name.length > 16 ? employee.name.substring(0, 16) + '...' : employee.name}
                    </Label>
                  </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
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

          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={openBulkActionsModal}
            >
              <Check className="w-4 h-4" />
              Ações em Massa do Dia
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Label htmlFor="intervalo-agenda">Intervalo dos slots:</Label>
            <Select
              id="intervalo-agenda"
              value={intervaloAgenda.toString()}
              onValueChange={handleIntervaloChange}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="20">20 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="40">40 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                          {employee.name.length > 16 ? employee.name.substring(0, 16) + '...' : employee.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gerarSlots().map((slotMinutes) => {
                    const currentDate = new Date(date);
                    const slotHour = Math.floor(slotMinutes / 60);
                    const slotMinute = slotMinutes % 60;
                    const timeSlotDate = new Date(currentDate.setHours(slotHour, slotMinute, 0, 0));
                    
                    // Filtrar agendamentos que pertencem a este slot
                    const slotAppointments = getDayAppointments(date).filter(
                      app => isAppointmentInSlot(app, slotMinutes)
                    );

                    return (
                      <tr key={slotMinutes} className="border-b">
                        <td className="p-2 border-r text-sm text-gray-500 text-center">
                          {formatarHora(slotMinutes)}
                        </td>

                        {filteredEmployees.map(employee => {
                          const empAppointments = slotAppointments.filter(
                            app => app.employee_id === employee.id
                          );

                          const isAvailable = getEmployeeAvailability(employee.id, slotHour);

                          return (
                            <td 
                              key={employee.id} 
                              className={`p-2 ${isAvailable ? '' : 'bg-gray-100'}`}
                              style={isAvailable ? { 
                                backgroundColor: `${employee.color}05`,  // Fundo muito suave da cor do funcionário
                                borderLeft: `1px solid ${employee.color}30` // Borda lateral suave da cor do funcionário
                              } : {}}
                              onDragOver={(e) => {
                                if (isAvailable) {
                                  e.preventDefault(); // Permite o drop
                                  e.currentTarget.style.backgroundColor = `${employee.color}30`;
                                }
                              }}
                              onDragLeave={(e) => {
                                if (isAvailable) {
                                  e.currentTarget.style.backgroundColor = `${employee.color}05`;
                                }
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.currentTarget.style.backgroundColor = `${employee.color}05`;
                                
                                if (!isAvailable) return;
                                
                                try {
                                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                  const { appointmentId, clientId, serviceId, originalEmployeeId, originalHour } = data;
                                  
                                  // Evita mover para o mesmo lugar
                                  if (originalEmployeeId === employee.id && originalHour === slotHour) return;
                                  
                                  // Atualiza o agendamento com novo profissional e horário
                                  await Appointment.update(appointmentId, {
                                    employee_id: employee.id,
                                    date: format(timeSlotDate, "yyyy-MM-dd'T'HH:mm:ss")
                                  });
                                  
                                  // Busca o agendamento atualizado para verificar se pertence a um pacote
                                  const updatedAppointment = appointments.find(a => a.id === appointmentId);
                                  if (updatedAppointment && updatedAppointment.package_id) {
                                    // Atualiza o histórico do pacote com o novo profissional e horário
                                    await updatePackageSession(
                                      {
                                        ...updatedAppointment,
                                        employee_id: employee.id,
                                        date: format(timeSlotDate, "yyyy-MM-dd'T'HH:mm:ss")
                                      }, 
                                      updatedAppointment.status
                                    );
                                  }

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
                              }}
                            >
                              {empAppointments.map((app) => {
                                const client = clients.find(c => c.id === app.client_id);
                                const service = services.find(s => s.id === app.service_id);

                                return (
                                  <TooltipProvider key={app.id}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
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
                                          draggable={app.status === 'agendado'}
                                          onDragStart={(e) => {
                                            if (app.status !== 'agendado') return;
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                              appointmentId: app.id,
                                              clientId: app.client_id,
                                              serviceId: app.service_id,
                                              originalEmployeeId: app.employee_id,
                                              originalHour: new Date(app.date).getHours()
                                            }));
                                            e.dataTransfer.effectAllowed = 'move';
                                            
                                            // Adiciona efeito visual
                                            e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-blue-500');
                                            
                                            // Cria uma imagem fantasma para o arrasto (opcional)
                                            const ghost = document.createElement('div');
                                            ghost.classList.add('p-2', 'bg-white', 'rounded', 'shadow', 'text-sm');
                                            ghost.innerHTML = `<p>${client?.name}</p><p>${service?.name}</p>`;
                                            ghost.style.width = '150px';
                                            ghost.style.position = 'absolute';
                                            ghost.style.top = '-1000px';
                                            document.body.appendChild(ghost);
                                            e.dataTransfer.setDragImage(ghost, 75, 20);
                                            
                                            // Remove o elemento fantasma após o arrasto
                                            setTimeout(() => {
                                              document.body.removeChild(ghost);
                                            }, 0);
                                          }}
                                          onDragEnd={(e) => {
                                            // Remove o efeito visual
                                            e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-blue-500');
                                          }}
                                        >
                                          <div className="flex flex-col">
                                            <p className="font-medium">{client?.name?.length > 11 ? client.name.substring(0, 11) + '...' : client?.name}</p>
                                            <p className="text-xs text-gray-600 truncate">
                                              {service?.name?.length > 11 ? service.name.substring(0, 11) + '...' : service?.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {format(new Date(app.date), "HH:mm")}
                                            </p>
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent 
                                        style={{ 
                                          backgroundColor: employee.color || '#94a3b8',
                                          color: '#ffffff'
                                        }}
                                      >
                                        <div className="text-xs">
                                          <p><strong>Nome:</strong> {client?.name || 'N/A'}</p>
                                          <p><strong>Procedimento:</strong> {service?.name || 'N/A'}</p>
                                          <p><strong>Profissional:</strong> {employee?.name || 'N/A'}</p>
                                          <p><strong>Horário:</strong> {format(new Date(app.date), "HH:mm")}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}

                              {isAvailable && empAppointments.length === 0 && (
                                <div 
                                  className="h-10 w-full rounded-md border border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
                                  onClick={() => handleAddToEmptySlot(employee.id, slotHour, slotMinute)}
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
                <Popover open={showProfessionalPopover} onOpenChange={setShowProfessionalPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-start text-left font-normal"
                      aria-expanded={showProfessionalPopover}
                    >
                      {selectedProfessional ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProfessional.color || '#94a3b8' }} />
                          {selectedProfessional.name.length > 16 ? selectedProfessional.name.substring(0, 16) + '...' : selectedProfessional.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecione o profissional...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]">
                    <Command>
                      <CommandInput placeholder="Buscar profissional..." />
                      <CommandEmpty>Nenhum profissional encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {employees.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.name}
                              onSelect={() => {
                                setNewAppointment({ ...newAppointment, employee_id: employee.id, service_id: "" });
                                updateServicesForEmployee(employee.id);
                                setShowProfessionalPopover(false);
                              }}
                            >
                              <span className="w-3 h-3 rounded-full mr-2 inline-block" style={{ backgroundColor: employee.color || '#94a3b8' }} />
                              {employee.name.length > 24 ? employee.name.substring(0, 24) + '...' : employee.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {newAppointment.client_id && (
              <div className="space-y-2">
                <Label>Tipo de Procedimento</Label>
                <Select
                  value={procedimentoTipo}
                  onValueChange={(value) => {
                    setProcedimentoTipo(value);
                    if (value === "avulso") {
                      setSelectedPackageId("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avulso">Procedimento Avulso</SelectItem>
                    {clientPackages.length > 0 && (
                      <SelectItem value="pacote">Usar Pacote do Cliente</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newAppointment.client_id && clientPackages.length > 0 && procedimentoTipo === "pacote" && (
              <div className="space-y-2">
                <Label>Pacote do Cliente</Label>
                <Select
                  value={selectedPackageId}
                  onValueChange={handlePackageSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pacote..." />
                  </SelectTrigger>
                  <SelectContent>
                  {clientPackages.map((pkg) => {
  // Usar o nome do pacote do cliente em vez de tentar buscar pelo package_id
  const packageData = packages.find(p => p.id === pkg.package_id);
  
  // Usar o nome diretamente do pacote do cliente ou do package_snapshot
  const packageName = pkg.name || (pkg.package_snapshot?.name) || packageData?.name || "Pacote sem nome";
  
  // Formatar a data de compra
  const purchaseDate = pkg.created_date 
    ? format(new Date(pkg.created_date), "dd/MM/yyyy")
    : "Data desconhecida";
  
  console.log(`[DEBUG] Renderizando pacote ${pkg.id}:`, {
    packageId: pkg.package_id,
    packageData: packageData,
    packageName: packageName,
    purchaseDate: purchaseDate,
    rawPackage: pkg
  });
  
  return (
    <SelectItem key={pkg.id} value={pkg.id}>
      {packageName} - {pkg.sessions_used}/{pkg.total_sessions} sessões ({purchaseDate})
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
                <Popover open={showPendingPopover} onOpenChange={setShowPendingPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-start text-left font-normal"
                      aria-expanded={showPendingPopover}
                    >
                      {selectedPendingService ? (
                        <span>{selectedPendingService.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Selecione um serviço pendente...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]">
                    <Command>
                      <CommandInput placeholder="Buscar serviço pendente..." />
                      <CommandEmpty>Nenhum serviço pendente encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {pendingServices.map((ps, idx) => {
                            const service = services.find(s => s.id === ps.service_id);
                            if (!service) return null;
                            return (
                              <CommandItem
                                key={ps.service_id + '-' + idx}
                                value={service.name}
                                onSelect={() => {
                                  setNewAppointment({ ...newAppointment, service_id: ps.service_id });
                                  setShowPendingPopover(false);
                                }}
                              >
                                {service.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label>Serviço</Label>
              {filteredServices.length === 0 && newAppointment.employee_id && (
                <div className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                  Nenhum serviço disponível para o profissional selecionado. Verifique as especialidades cadastradas ou selecione outro profissional.
                </div>
              )}
              <Popover open={showServicePopover} onOpenChange={setShowServicePopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-start text-left font-normal"
                    aria-expanded={showServicePopover}
                    disabled={!newAppointment.employee_id}
                  >
                    {selectedService ? (
                      <span>{selectedService.displayName || selectedService.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Selecione o serviço...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[300px]">
                  <Command>
                    <CommandInput placeholder="Buscar serviço..." />
                    <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {filteredServices.map((service) => (
                          <CommandItem
                            key={service.id}
                            value={service.displayName || service.name}
                            onSelect={() => {
                              if (
                                procedimentoTipo === "avulso" ||
                                (serviceSessionsLeft[service.id] > 0)
                              ) {
                                setNewAppointment({ ...newAppointment, service_id: service.id });
                                setShowServicePopover(false);
                              }
                            }}
                            disabled={procedimentoTipo !== "avulso" && serviceSessionsLeft[service.id] <= 0}
                            style={procedimentoTipo !== "avulso" && serviceSessionsLeft[service.id] <= 0 ? { opacity: 0.5, pointerEvents: 'none', color: '#aaa' } : {}}
                          >
                            {service.displayName || service.name} ({service.duration}min)
                            {procedimentoTipo !== "avulso" && serviceSessionsLeft[service.id] <= 0 && (
                              <span style={{ marginLeft: 8, color: '#e74c3c', fontWeight: 'bold' }}>
                                Esgotado
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                      className="rounded-md border w-fit mx-auto"
                      locale={ptBR}
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
                      const { available, appointments: conflictingAppointments } = 
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
                              ({conflictingAppointments.length} agendamento{conflictingAppointments.length > 1 ? 's' : ''})
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
                         />
                         {employee.name.length > 16 ? employee.name.substring(0, 16) + '...' : employee.name}
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
                        <p className="font-medium">{selectedAppointmentDetails.employee.name.length > 16 ? selectedAppointmentDetails.employee.name.substring(0, 16) + '...' : selectedAppointmentDetails.employee.name}</p>
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
                                  app.status === 'concluido'
                                    ? 'bg-green-500'
                                    : app.status === 'cancelado'
                                    ? 'bg-red-500'
                                    : ''
                                }`} />
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {services.find(s => s.id === app.service_id)?.name} - 
                                    {employees.find(e => e.id === app.employee_id)?.name.length > 16 ? employees.find(e => e.id === app.employee_id)?.name.substring(0, 16) + '...' : employees.find(e => e.id === app.employee_id)?.name}
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
                                
                                {app.status !== 'agendado' && app.status !== 'cancelado' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => showConfirmDialog('delete', app.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
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
                        const packageData = packages.find(p => p.id === pkg.package_id);
                        const progress = (pkg.sessions_used / pkg.total_sessions) * 100;
                        
                        return (
                          <Card key={index}>
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{packageData?.name}</h4>
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
                      <Button
                        onClick={() => showConfirmDialog('delete', selectedAppointmentDetails.appointment.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Agendamento
                      </Button>
                    </>
                  )}
                  {selectedAppointmentDetails.appointment.status === 'cancelado' && (
                    <Button
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
                      <p className="font-medium">{client?.name}</p>
                      <p className="text-sm text-gray-600">{service?.name}</p>
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

      <Dialog 
        open={showBulkActionsModal} 
        onOpenChange={closeBulkActionsModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Agendamentos do dia
              <div className="mt-2">
                <Calendar
                  mode="single"
                  selected={bulkActionsDate}
                  onSelect={(newDate) => newDate && setBulkActionsDate(newDate)}
                  className="rounded-md border w-fit mx-auto"
                  locale={ptBR}
                />
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto my-4">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th></th>
                  <th>Horário</th>
                  <th>Cliente</th>
                  <th>Profissional</th>
                  <th>Serviço</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bulkDayAppointments.map(app => {
                  const client = clients.find(c => c.id === app.client_id);
                  const employee = employees.find(e => e.id === app.employee_id);
                  const service = services.find(s => s.id === app.service_id);
                  return (
                    <tr key={app.id} className={bulkSelectedAppointments.includes(app.id) ? 'bg-purple-50' : ''}>
                      <td>
                        <Checkbox
                          checked={bulkSelectedAppointments.includes(app.id)}
                          onCheckedChange={() => toggleBulkAppointment(app.id)}
                        />
                      </td>
                      <td>{format(new Date(app.date), 'HH:mm')}</td>
                      <td>{client?.name || '-'}</td>
                      <td>{employee?.name || '-'}</td>
                      <td>{service?.name || '-'}</td>
                      <td>
                        <Badge variant={app.status === 'concluido' ? 'success' : 'default'}>
                          {app.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeBulkActionsModal}
            >
              Fechar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={bulkSelectedAppointments.length === 0}
              onClick={() => handleBulkStatusChange('concluido')}
            >
              Confirmar Selecionados
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkSelectedAppointments.length === 0}
              onClick={() => handleBulkStatusChange('cancelado')}
            >
              Cancelar Selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MultiAppointmentModal
        open={showMultiAppointmentDialog}
        onOpenChange={setShowMultiAppointmentDialog}
        clients={clients}
        services={services}
        ClientPackage={ClientPackage}
        employees={employees}
        pendingServices={pendingServices}
        PendingService={PendingService}
        onConfirm={handleMultiAppointmentConfirm}
      />
    </div>
  );
}
