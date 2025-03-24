import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  UserPlus,
  Search,
  Clock,
  Calendar,
  Star,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Phone,
  Mail,
  MapPin,
  Banknote,
  CreditCard,
  User,
  AlertTriangle,
  Scissors,
  Filter,
  Tag,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Employee, Service, Role } from "@/firebase/entities";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SimpleAlert from "@/components/SimpleAlert";
import ServiceSelector from "../components/employees/ServiceSelector";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [serviceFilterCategory, setServiceFilterCategory] = useState("all");
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    employee: null
  });
  const itemsPerPage = 10;

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    cpf: "",
    rg: "",
    birthdate: "",
    roleId: "",
    specialties: [],
    email: "",
    phone: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: ""
    },
    payment_info: {
      bank: "",
      agency: "",
      account: "",
      account_type: "corrente",
      pix_key: "",
      pix_type: "cpf"
    },
    commission_rate: 10,
    work_hours: {
      sunday: [],
      monday: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" }
      ],
      tuesday: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" }
      ],
      wednesday: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" }
      ],
      thursday: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" }
      ],
      friday: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" }
      ],
      saturday: [
        { start: "08:00", end: "12:00" }
      ]
    },
    appointment_interval: 30,
    hire_date: format(new Date(), "yyyy-MM-dd"),
    active: true,
    notes: "",
    color: "#f87171",
    provides_services: true,
    block_schedule: false,
    block_start_date: "",
    block_end_date: "",
    block_reason: "",
    can_manage_cash: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeeData, serviceData, roleData] = await Promise.all([
        Employee.list(),
        Service.list(),
        Role.list()
      ]);
      setEmployees(employeeData);
      setServices(serviceData);
      setRoles(roleData);
    } catch (error) {
      console.error("Error loading data:", error);
      setAlert({
        type: "error",
        message: "Erro ao carregar dados. Tente novamente."
      });
    }
  };

  const handleCreateEmployee = async () => {
    try {
      if (isEditing && selectedEmployee) {
        await Employee.update(selectedEmployee.id, newEmployee);
        setAlert({
          type: "success",
          message: "Funcionário atualizado com sucesso!"
        });
      } else {
        await Employee.create(newEmployee);
        setAlert({
          type: "success",
          message: "Funcionário criado com sucesso!"
        });
      }
      setShowNewEmployeeDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving employee:", error);
      setAlert({
        type: "error",
        message: "Erro ao salvar funcionário. Tente novamente."
      });
    }
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setNewEmployee({
      name: employee.name || "",
      cpf: employee.cpf || "",
      rg: employee.rg || "",
      birthdate: employee.birthdate || "",
      roleId: employee.roleId || "",
      specialties: employee.specialties || [],
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip: ""
      },
      payment_info: employee.payment_info || {
        bank: "",
        agency: "",
        account: "",
        account_type: "corrente",
        pix_key: "",
        pix_type: "cpf"
      },
      commission_rate: employee.commission_rate || 10,
      work_hours: employee.work_hours || {
        sunday: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      },
      appointment_interval: employee.appointment_interval || 30,
      hire_date: employee.hire_date || format(new Date(), "yyyy-MM-dd"),
      active: employee.active !== false,
      notes: employee.notes || "",
      color: employee.color || "#f87171",
      provides_services: employee.provides_services !== false,
      block_schedule: employee.block_schedule || false,
      block_start_date: employee.block_start_date || "",
      block_end_date: employee.block_end_date || "",
      block_reason: employee.block_reason || "",
      can_manage_cash: employee.can_manage_cash || false
    });
    setIsEditing(true);
    setShowNewEmployeeDialog(true);
  };

  const handleDeleteEmployee = async () => {
    try {
      if (deleteConfirmation.employee) {
        await Employee.delete(deleteConfirmation.employee.id);
        setAlert({
          type: "success",
          message: "Funcionário excluído com sucesso!"
        });
        loadData();
      }
      setDeleteConfirmation({ isOpen: false, employee: null });
    } catch (error) {
      console.error("Error deleting employee:", error);
      setAlert({
        type: "error",
        message: "Erro ao excluir funcionário. Tente novamente."
      });
    }
  };

  const resetForm = () => {
    setNewEmployee({
      name: "",
      cpf: "",
      rg: "",
      birthdate: "",
      roleId: "",
      specialties: [],
      email: "",
      phone: "",
      address: {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip: ""
      },
      payment_info: {
        bank: "",
        agency: "",
        account: "",
        account_type: "corrente",
        pix_key: "",
        pix_type: "cpf"
      },
      commission_rate: 10,
      work_hours: {
        sunday: [],
        monday: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "18:00" }
        ],
        tuesday: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "18:00" }
        ],
        wednesday: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "18:00" }
        ],
        thursday: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "18:00" }
        ],
        friday: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "18:00" }
        ],
        saturday: [
          { start: "08:00", end: "12:00" }
        ]
      },
      appointment_interval: 30,
      hire_date: format(new Date(), "yyyy-MM-dd"),
      active: true,
      notes: "",
      color: "#f87171",
      provides_services: true,
      block_schedule: false,
      block_start_date: "",
      block_end_date: "",
      block_reason: "",
      can_manage_cash: false
    });
    setSelectedEmployee(null);
    setIsEditing(false);
  };

  const addTimeSlot = (day) => {
    setNewEmployee(prev => {
      const hours = {...prev.work_hours};
      hours[day] = [...hours[day], { start: "08:00", end: "18:00" }];
      return {...prev, work_hours: hours};
    });
  };

  const removeTimeSlot = (day, index) => {
    setNewEmployee(prev => {
      const hours = {...prev.work_hours};
      hours[day] = hours[day].filter((_, i) => i !== index);
      return {...prev, work_hours: hours};
    });
  };

  const updateTimeSlot = (day, index, field, value) => {
    setNewEmployee(prev => {
      const hours = {...prev.work_hours};
      hours[day] = hours[day].map((slot, i) => {
        if (i === index) {
          return { ...slot, [field]: value };
        }
        return slot;
      });
      return {...prev, work_hours: hours};
    });
  };

  const toggleSpecialty = (serviceId) => {
    setNewEmployee(prev => {
      const specialties = [...prev.specialties];
      if (specialties.includes(serviceId)) {
        return {...prev, specialties: specialties.filter(id => id !== serviceId)};
      } else {
        return {...prev, specialties: [...specialties, serviceId]};
      }
    });
  };

  const updateAddressField = (field, value) => {
    setNewEmployee(prev => ({
      ...prev, 
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const updatePaymentField = (field, value) => {
    setNewEmployee(prev => ({
      ...prev, 
      payment_info: {
        ...prev.payment_info,
        [field]: value
      }
    }));
  };

  const filteredEmployees = employees
    .filter(employee =>
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const weekDays = [
    { value: "monday", label: "Segunda-feira" },
    { value: "tuesday", label: "Terça-feira" },
    { value: "wednesday", label: "Quarta-feira" },
    { value: "thursday", label: "Quinta-feira" },
    { value: "friday", label: "Sexta-feira" },
    { value: "saturday", label: "Sábado" },
    { value: "sunday", label: "Domingo" }
  ];

  const intervalOptions = [
    { value: 15, label: "15 minutos" },
    { value: 20, label: "20 minutos" },
    { value: 30, label: "30 minutos" },
    { value: 40, label: "40 minutos" },
    { value: 45, label: "45 minutos" },
    { value: 60, label: "1 hora" },
    { value: 90, label: "1 hora e 30 minutos" },
    { value: 120, label: "2 horas" }
  ];

  const filteredServices = services
    .filter(service => 
      (service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
       service.description?.toLowerCase().includes(serviceSearchTerm.toLowerCase())) &&
      (serviceFilterCategory === "all" || service.category === serviceFilterCategory)
    );

  const serviceCategories = ["all", ...new Set(services.map(service => service.category))];

  const handleServicesChange = (newSpecialties) => {
    setNewEmployee({...newEmployee, specialties: newSpecialties});
  };

  return (
    <div className="space-y-6">
      {alert && (
        <SimpleAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Funcionários</h2>
        <Button 
          onClick={() => {
            resetForm();
            setShowNewEmployeeDialog(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar funcionários por nome, cargo, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  {searchTerm ? "Nenhum funcionário encontrado para esta busca." : "Nenhum funcionário cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.cpf}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{roles.find(r => r.id === employee.roleId)?.name || 'Sem cargo'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        {employee.phone}
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="w-4 h-4" />
                        {employee.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{employee.commission_rate}%</TableCell>
                  <TableCell>
                    {employee.active !== false ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                        <Check className="w-3 h-3 mr-1" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                        <X className="w-3 h-3 mr-1" />
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteConfirmation({
                          isOpen: true,
                          employee: employee
                        })}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredEmployees.length > itemsPerPage && (
        <Pagination>
          <PaginationContent>
            <PaginationPrevious 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            />
            {Array.from({ length: Math.ceil(filteredEmployees.length / itemsPerPage) }, (_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  isActive={currentPage === index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationNext 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEmployees.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredEmployees.length / itemsPerPage)}
            />
          </PaginationContent>
        </Pagination>
      )}

      <Dialog 
        open={showNewEmployeeDialog} 
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowNewEmployeeDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
              <TabsTrigger value="payment">Pagamento</TabsTrigger>
              <TabsTrigger value="work">Trabalho</TabsTrigger>
              <TabsTrigger value="services">Serviços</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo*</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Data de Nascimento</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={newEmployee.birthdate}
                    onChange={(e) => setNewEmployee({...newEmployee, birthdate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={newEmployee.cpf}
                    onChange={(e) => setNewEmployee({...newEmployee, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={newEmployee.rg}
                    onChange={(e) => setNewEmployee({...newEmployee, rg: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hire_date">Data de Contratação</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={newEmployee.hire_date}
                  onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={newEmployee.notes}
                  onChange={(e) => setNewEmployee({...newEmployee, notes: e.target.value})}
                  placeholder="Qualquer informação adicional relevante"
                  rows={3}
                />
              </div>

              <div className="space-y-4 pt-2 border-t">
                <h3 className="font-medium text-base">Status e Permissões</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="active" className="font-medium">Status do Funcionário</Label>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="active_yes"
                          name="active_status"
                          checked={newEmployee.active === true}
                          onChange={() => setNewEmployee({...newEmployee, active: true})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="active_yes" className="text-sm font-medium">
                          Ativo
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="active_no"
                          name="active_status"
                          checked={newEmployee.active === false}
                          onChange={() => setNewEmployee({...newEmployee, active: false})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="active_no" className="text-sm font-medium">
                          Inativo
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Funcionários inativos não aparecerão nas listas de seleção e não poderão realizar atendimentos.
                    </p>
                  </div>

                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="provides_services" className="font-medium">Realiza Atendimentos</Label>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="provides_services_yes"
                          name="provides_services_status"
                          checked={newEmployee.provides_services === true}
                          onChange={() => setNewEmployee({...newEmployee, provides_services: true})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="provides_services_yes" className="text-sm font-medium">
                          Sim
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="provides_services_no"
                          name="provides_services_status"
                          checked={newEmployee.provides_services === false}
                          onChange={() => setNewEmployee({...newEmployee, provides_services: false})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="provides_services_no" className="text-sm font-medium">
                          Não
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Funcionários que não realizam atendimentos não aparecerão na agenda.
                    </p>
                  </div>
                </div>

                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="can_manage_cash" className="font-medium">Gerenciamento de Caixa</Label>
                  </div>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="can_manage_cash_yes"
                        name="can_manage_cash_status"
                        checked={newEmployee.can_manage_cash === true}
                        onChange={() => setNewEmployee({...newEmployee, can_manage_cash: true})}
                        className="h-4 w-4 text-purple-600"
                      />
                      <label htmlFor="can_manage_cash_yes" className="text-sm font-medium">
                        Pode abrir/fechar caixa
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="can_manage_cash_no"
                        name="can_manage_cash_status"
                        checked={newEmployee.can_manage_cash === false}
                        onChange={() => setNewEmployee({...newEmployee, can_manage_cash: false})}
                        className="h-4 w-4 text-purple-600"
                      />
                      <label htmlFor="can_manage_cash_no" className="text-sm font-medium">
                        Não pode gerenciar caixa
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Apenas funcionários com esta permissão poderão abrir e fechar o caixa.
                  </p>
                </div>

                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="block_schedule" className="font-medium">Bloqueio de Agenda</Label>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="block_schedule" 
                        checked={newEmployee.block_schedule === true}
                        onCheckedChange={(checked) => setNewEmployee({...newEmployee, block_schedule: checked})}
                      />
                      <Label htmlFor="block_schedule" className="text-sm font-medium">
                        Bloquear agenda para este funcionário
                      </Label>
                    </div>

                    {newEmployee.block_schedule && (
                      <div className="flex flex-col space-y-3 mt-2 pl-6">
                        <div className="space-y-2">
                          <Label htmlFor="block_start_date" className="text-sm">
                            Data de início do bloqueio
                          </Label>
                          <Input
                            id="block_start_date"
                            type="date"
                            value={newEmployee.block_start_date || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, block_start_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="block_end_date" className="text-sm">
                            Data de fim do bloqueio
                          </Label>
                          <Input
                            id="block_end_date"
                            type="date"
                            value={newEmployee.block_end_date || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, block_end_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="block_reason" className="text-sm">
                            Motivo do bloqueio
                          </Label>
                          <Input
                            id="block_reason"
                            value={newEmployee.block_reason || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, block_reason: e.target.value})}
                            placeholder="Ex: Férias, licença, treinamento..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Bloqueie a agenda do funcionário por um período específico. Durante este período, não será possível agendar novos atendimentos.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 py-4">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Endereço</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Rua/Logradouro</Label>
                    <Input
                      id="street"
                      value={newEmployee.address.street}
                      onChange={(e) => updateAddressField('street', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={newEmployee.address.number}
                        onChange={(e) => updateAddressField('number', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={newEmployee.address.complement}
                        onChange={(e) => updateAddressField('complement', e.target.value)}
                        placeholder="Apto, Bloco, etc."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={newEmployee.address.neighborhood}
                      onChange={(e) => updateAddressField('neighborhood', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={newEmployee.address.city}
                      onChange={(e) => updateAddressField('city', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={newEmployee.address.state}
                      onChange={(e) => updateAddressField('state', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">CEP</Label>
                    <Input
                      id="zip"
                      value={newEmployee.address.zip}
                      onChange={(e) => updateAddressField('zip', e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 py-4">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Informações Bancárias</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank">Banco</Label>
                    <Input
                      id="bank"
                      value={newEmployee.payment_info.bank}
                      onChange={(e) => updatePaymentField('bank', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agency">Agência</Label>
                    <Input
                      id="agency"
                      value={newEmployee.payment_info.agency}
                      onChange={(e) => updatePaymentField('agency', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Conta</Label>
                    <Input
                      id="account"
                      value={newEmployee.payment_info.account}
                      onChange={(e) => updatePaymentField('account', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Tipo de Conta</Label>
                    <Select
                      value={newEmployee.payment_info.account_type}
                      onValueChange={(value) => updatePaymentField('account_type', value)}
                    >
                      <SelectTrigger id="account_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupança">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pix_type">Tipo de Chave PIX</Label>
                    <Select
                      value={newEmployee.payment_info.pix_type}
                      onValueChange={(value) => updatePaymentField('pix_type', value)}
                    >
                      <SelectTrigger id="pix_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="chave_aleatoria">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix_key">Chave PIX</Label>
                    <Input
                      id="pix_key"
                      value={newEmployee.payment_info.pix_key}
                      onChange={(e) => updatePaymentField('pix_key', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission_rate">Taxa de Comissão (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="commission_rate"
                      type="number"
                      min="0"
                      max="100"
                      value={newEmployee.commission_rate}
                      onChange={(e) => setNewEmployee({...newEmployee, commission_rate: parseFloat(e.target.value)})}
                    />
                    <span className="font-medium">%</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Percentual de comissão sobre serviços realizados.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="work" className="py-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Cargo e Especialidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleId">Cargo*</Label>
                      <Select
                        value={newEmployee.roleId}
                        onValueChange={(value) => setNewEmployee({...newEmployee, roleId: value})}
                      >
                        <SelectTrigger id="roleId">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="appointment_interval">Intervalo entre Agendamentos</Label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {intervalOptions.map(option => (
                          <div 
                            key={option.value}
                            onClick={() => setNewEmployee({...newEmployee, appointment_interval: option.value})}
                            className={`px-4 py-2 rounded-md cursor-pointer text-sm ${
                              newEmployee.appointment_interval === option.value 
                                ? 'bg-purple-100 border-purple-300 border text-purple-700 font-medium' 
                                : 'bg-gray-100 border-gray-200 border hover:bg-gray-200'
                            }`}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Define o intervalo padrão entre agendamentos para este profissional.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Horário de Trabalho
                    </CardTitle>
                    <CardDescription>
                      Configure os horários de cada período de trabalho por dia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {weekDays.map(day => (
                        <div key={day.value} className="space-y-4 pb-4 border-b last:border-b-0">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                id={`works_${day.value}`}
                                checked={newEmployee.work_hours[day.value].length > 0}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    setNewEmployee(prev => {
                                      const hours = {...prev.work_hours};
                                      hours[day.value] = [];
                                      return {...prev, work_hours: hours};
                                    });
                                  } else {
                                    setNewEmployee(prev => {
                                      const hours = {...prev.work_hours};
                                      hours[day.value] = [{ start: "08:00", end: "18:00" }];
                                      return {...prev, work_hours: hours};
                                    });
                                  }
                                }}
                              />
                              <Label className="font-semibold" htmlFor={`works_${day.value}`}>{day.label}</Label>
                            </div>

                            {newEmployee.work_hours[day.value].length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addTimeSlot(day.value)}
                                className="h-8"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Período
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {newEmployee.work_hours[day.value].map((slot, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) => updateTimeSlot(day.value, index, 'start', e.target.value)}
                                  className="w-32"
                                />
                                <span>até</span>
                                <Input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) => updateTimeSlot(day.value, index, 'end', e.target.value)}
                                  className="w-32"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTimeSlot(day.value, index)}
                                  className="h-8 w-8"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            {newEmployee.work_hours[day.value].length === 0 && (
                              <p className="text-sm text-gray-500 italic">
                                Não trabalha neste dia
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">Status do Funcionário</Label>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="active_yes_work"
                          name="active_status_work"
                          checked={newEmployee.active === true}
                          onChange={() => setNewEmployee({...newEmployee, active: true})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="active_yes_work" className="text-sm font-medium">
                          Ativo
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="active_no_work"
                          name="active_status_work"
                          checked={newEmployee.active === false}
                          onChange={() => setNewEmployee({...newEmployee, active: false})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="active_no_work" className="text-sm font-medium">
                          Inativo
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">Realiza Atendimentos</Label>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="provides_services_yes_work"
                          name="provides_services_status_work"
                          checked={newEmployee.provides_services === true}
                          onChange={() => setNewEmployee({...newEmployee, provides_services: true})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="provides_services_yes_work" className="text-sm font-medium">
                          Sim
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="provides_services_no_work"
                          name="provides_services_status_work"
                          checked={newEmployee.provides_services === false}
                          onChange={() => setNewEmployee({...newEmployee, provides_services: false})}
                          className="h-4 w-4 text-purple-600"
                        />
                        <label htmlFor="provides_services_no_work" className="text-sm font-medium">
                          Não
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="services" className="space-y-4 py-4">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Scissors className="mr-2 h-5 w-5 text-purple-500" />
                  Serviços que este profissional realiza
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Selecione os serviços que este profissional está habilitado a realizar. Apenas estes serviços estarão disponíveis para agendamento com este profissional.
                </p>

                <ServiceSelector 
                  services={services}
                  selectedServices={newEmployee.specialties}
                  onServicesChange={handleServicesChange}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm();
                setShowNewEmployeeDialog(false);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateEmployee}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!newEmployee.name || !newEmployee.roleId}
            >
              {isEditing ? "Atualizar" : "Salvar"} Funcionário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={deleteConfirmation.isOpen} 
        onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, employee: null })}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Funcionário
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2">
              Você tem certeza que deseja excluir o funcionário{" "}
              <span className="font-semibold">{deleteConfirmation.employee?.name}</span>?
            </p>
            <p className="text-sm text-gray-500">
              Esta ação não pode ser desfeita. Todos os dados associados a este funcionário serão permanentemente removidos.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ isOpen: false, employee: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
