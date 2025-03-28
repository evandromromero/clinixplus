import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  format, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  isAfter, 
  parseISO, 
  addMonths, 
  startOfWeek, 
  addDays 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from "recharts";
import { Sale } from "@/api/entities";
import { Client } from "@/api/entities";
import { Appointment } from "@/api/entities";
import { Service } from "@/api/entities";
import { Package } from "@/api/entities";
import { Product } from "@/api/entities";
import { Employee } from "@/api/entities";
import { Inventory } from "@/api/entities";
import { 
  AlertTriangle, 
  RefreshCw, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Download,
  TrendingUp,
  Users,
  Package as PackageIcon,
  Clock,
  Award
} from "lucide-react";

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

// Cache para armazenar dados dos relatórios - inicializado com objetos vazios
const dataCache = {
  clients: { data: null, timestamp: null },
  sales: { data: null, timestamp: null },
  appointments: { data: null, timestamp: null },
  products: { data: null, timestamp: null },
  services: { data: null, timestamp: null },
  employees: { data: null, timestamp: null },
  inventory: { data: null, timestamp: null }
};

// Tempo de expiração do cache em milissegundos (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export default function Reports() {
  // Estados básicos
  const [period, setPeriod] = useState('last_30_days');
  const [salesData, setSalesData] = useState([]);
  const [clientsData, setClientsData] = useState({
    totalClients: 0,
    activeClients: 0,
    averageTicket: 0,
    clientStats: []
  });
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Novos estados para relatórios adicionais
  const [trendsData, setTrendsData] = useState([]);
  const [retentionData, setRetentionData] = useState([]);
  const [inventoryAlertData, setInventoryAlertData] = useState([]);
  const [peakHoursData, setPeakHoursData] = useState({
    hourData: [],
    weekdayData: [],
    peakHour: 0,
    peakDay: 0,
    peakHourLabel: '',
    peakDayLabel: ''
  });
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [expensesData, setExpensesData] = useState({
    totalExpenses: 0,
    categorizedExpenses: [],
    monthlyExpenses: [],
    topExpenses: []
  });

  // Filtros avançados
  const [filters, setFilters] = useState({
    salesType: [], // produto, serviço, pacote
    employeeId: "",
    minValue: "",
    maxValue: "",
    productCategory: "",
    serviceCategory: "",
    paymentMethod: ""
  });
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [availableProductCategories, setAvailableProductCategories] = useState([]);
  const [availableServiceCategories, setAvailableServiceCategories] = useState([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Verifica se os dados em cache são válidos
  const isCacheValid = (cacheKey) => {
    // Verificar se a chave existe e se os dados não são nulos
    if (!dataCache[cacheKey] || dataCache[cacheKey].data === null || dataCache[cacheKey].timestamp === null) {
      return false;
    }
    
    // Verificar se o cache não expirou
    return new Date().getTime() - dataCache[cacheKey].timestamp.getTime() < CACHE_EXPIRATION;
  };

  // Função para buscar dados com suporte a cache
  const fetchWithCache = useCallback(async (entityName, entityFunction) => {
    // Garantir que a entrada de cache existe
    if (!dataCache[entityName]) {
      dataCache[entityName] = { data: null, timestamp: null };
    }
    
    // Se o cache for válido, retorne os dados em cache
    if (isCacheValid(entityName)) {
      console.log(`Usando dados em cache para ${entityName}`);
      return dataCache[entityName].data;
    }

    // Se o cache for inválido, busque novos dados
    console.log(`Buscando novos dados para ${entityName}`);
    try {
      // Adiciona um pequeno delay para evitar limite de taxa de chamadas da API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const data = await entityFunction();
      
      // Atualiza o cache
      dataCache[entityName] = {
        data,
        timestamp: new Date()
      };
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar ${entityName}:`, error);
      // Se houver dados em cache, mesmo que expirados, use-os em caso de erro
      if (dataCache[entityName] && dataCache[entityName].data !== null) {
        console.log(`Usando dados em cache expirados para ${entityName} após erro`);
        return dataCache[entityName].data;
      }
      // Se não houver dados em cache, retorne array vazio para evitar erros
      return [];
    }
  }, []);

  // Extrair dados para filtros
  const extractFilterOptions = useCallback((products, services, employees, sales) => {
    // Verificar se os arrays não são undefined
    if (!products) products = [];
    if (!services) services = [];
    if (!employees) employees = [];
    if (!sales) sales = [];
    
    const productCategories = [...new Set(products.map(p => p?.category))].filter(Boolean);
    setAvailableProductCategories(productCategories);
    
    const serviceCategories = [...new Set(services.map(s => s?.category))].filter(Boolean);
    setAvailableServiceCategories(serviceCategories);
    
    const activeEmployees = employees.filter(e => e?.active !== false);
    setAvailableEmployees(activeEmployees);
    
    const paymentMethods = [...new Set(sales
      .filter(s => s?.payment_methods)
      .map(s => s.payment_methods))].filter(Boolean);
    setAvailablePaymentMethods(paymentMethods);
  }, []);

  // Aplicar filtros avançados
  const applyFilters = useCallback((sales, products, services, employees) => {
    // Verificar se os arrays não são undefined
    if (!sales) sales = [];
    if (!products) products = [];
    if (!services) services = [];
    if (!employees) employees = [];
    
    let filteredSales = [...sales];
    
    // Filtrar por tipo de venda
    if (filters.salesType && filters.salesType.length > 0) {
      filteredSales = filteredSales.filter(sale => filters.salesType.includes(sale.type));
    }
    
    // Filtrar por funcionário
    if (filters.employeeId) {
      filteredSales = filteredSales.filter(sale => sale.employee_id === filters.employeeId);
    }
    
    // Filtrar por valor
    if (filters.minValue) {
      const minValue = parseFloat(filters.minValue);
      if (!isNaN(minValue)) {
        filteredSales = filteredSales.filter(sale => sale.total_amount >= minValue);
      }
    }
    
    if (filters.maxValue) {
      const maxValue = parseFloat(filters.maxValue);
      if (!isNaN(maxValue)) {
        filteredSales = filteredSales.filter(sale => sale.total_amount <= maxValue);
      }
    }
    
    if (filters.paymentMethod) {
      filteredSales = filteredSales.filter(sale => 
        sale.payment_methods && sale.payment_methods.includes(filters.paymentMethod)
      );
    }
    
    let filteredProducts = [...products];
    if (filters.productCategory) {
      filteredProducts = filteredProducts.filter(
        product => product.category === filters.productCategory
      );
    }
    
    let filteredServices = [...services];
    if (filters.serviceCategory) {
      filteredServices = filteredServices.filter(
        service => service.category === filters.serviceCategory
      );
    }
    
    // Garantir que temos employees válidos
    const employeesData = employees
      .filter(employee => employee) // filtrar undefined
      .map(employee => {
        const employeeSales = filteredSales.filter(
          sale => sale.employee_id === employee.id
        );
        
        return {
          id: employee.id,
          name: employee.name || 'Sem nome',
          role: employee.role || 'Não especificado',
          sales: employeeSales.length,
          revenue: employeeSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    
    return {
      filteredSales,
      filteredProducts,
      filteredServices,
      employeesData
    };
  }, [filters]);

  // Determinar período de data baseado na seleção
  const getPeriodStart = useCallback(() => {
    switch (period) {
      case 'last_7_days':
        return subMonths(new Date(), 0.25); // aproximadamente 7 dias
      case 'last_30_days':
        return subMonths(new Date(), 1);
      case 'last_90_days':
        return subMonths(new Date(), 3);
      case 'last_12_months':
        return subMonths(new Date(), 12);
      default:
        return subMonths(new Date(), 1);
    }
  }, [period]);

  // Agrupar vendas por data e tipo
  const groupSalesByDate = useCallback((sales) => {
    if (!sales || sales.length === 0) return [];
    
    const salesByDate = {};
    
    sales.forEach(sale => {
      if (!sale.date) return;
      
      // Extrair apenas a parte da data (YYYY-MM-DD)
      const date = sale.date.split('T')[0];
      
      if (!salesByDate[date]) {
        salesByDate[date] = {
          date,
          total: 0,
          products: 0,
          services: 0,
          packages: 0,
          giftcards: 0,
          subscriptions: 0
        };
      }
      
      salesByDate[date].total += sale.total_amount || 0;
      
      // Adicionar valor ao tipo específico
      if (sale.type === 'produto') {
        salesByDate[date].products += sale.total_amount || 0;
      } else if (sale.type === 'serviço') {
        salesByDate[date].services += sale.total_amount || 0;
      } else if (sale.type === 'pacote') {
        salesByDate[date].packages += sale.total_amount || 0;
      } else if (sale.type === 'giftcard') {
        salesByDate[date].giftcards += sale.total_amount || 0;
      } else if (sale.type === 'assinatura') {
        salesByDate[date].subscriptions += sale.total_amount || 0;
      }
    });
    
    return Object.values(salesByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
  }, []);

  // Processar estatísticas de clientes
  const processClientStats = useCallback((clients, appointments, sales) => {
    // Verificar se os arrays não são undefined
    if (!clients) clients = [];
    if (!appointments) appointments = [];
    if (!sales) sales = [];
    
    const totalClients = clients.length;
    const periodStart = getPeriodStart();
    const activeClientIds = new Set();
    
    // Encontrar clientes ativos baseado em compromissos
    appointments.forEach(appointment => {
      if (appointment.date && isAfter(new Date(appointment.date), periodStart)) {
        activeClientIds.add(appointment.client_id);
      }
    });
    
    // Encontrar clientes ativos baseado em vendas
    sales.forEach(sale => {
      if (sale.date && isAfter(new Date(sale.date), periodStart)) {
        activeClientIds.add(sale.client_id);
      }
    });
    
    const activeClients = activeClientIds.size;
    
    // Calcular ticket médio
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
    
    // Estatísticas detalhadas por cliente
    const clientStats = clients
      .filter(client => client) // filtrar undefined
      .map(client => {
        const clientAppointments = appointments.filter(
          appointment => appointment.client_id === client.id
        );
        
        const clientSales = sales.filter(
          sale => sale.client_id === client.id
        );
        
        return {
          id: client.id,
          name: client.name || 'Cliente sem nome',
          appointments: clientAppointments.length,
          sales: clientSales.length,
          value: clientSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
        };
      })
      .sort((a, b) => b.value - a.value);
    
    return {
      totalClients,
      activeClients,
      averageTicket,
      clientStats
    };
  }, [getPeriodStart]);

  // Processar estatísticas de produtos
  const processProductStats = useCallback((sales, products) => {
    // Verificar se os arrays não são undefined
    if (!sales) sales = [];
    if (!products) products = [];
    
    const productSales = {};
    const productsMap = products.reduce((map, product) => {
      if (product && product.id) {
        map[product.id] = product;
      }
      return map;
    }, {});
    
    sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (item && item.item_id && productsMap[item.item_id]) {
            if (!productSales[item.item_id]) {
              productSales[item.item_id] = {
                id: item.item_id,
                name: productsMap[item.item_id].name || item.name || `Produto ${item.item_id}`,
                category: productsMap[item.item_id].category || 'Não especificado',
                sales: 0,
                quantity: 0,
                revenue: 0,
                cost: 0,
                margin: 0
              };
            }
            
            const quantity = item.quantity || 1;
            const price = item.price || 0;
            const discount = item.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            const cost = productsMap[item.item_id].cost || 0;
            
            productSales[item.item_id].sales += 1;
            productSales[item.item_id].quantity += quantity;
            productSales[item.item_id].revenue += quantity * finalPrice;
            productSales[item.item_id].cost += quantity * cost;
            productSales[item.item_id].margin += quantity * (finalPrice - cost);
          }
        });
      }
    });
    
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
  }, []);

  // Processar estatísticas de serviços
  const processServiceStats = useCallback((appointments, services) => {
    // Verificar se os arrays não são undefined
    if (!appointments) appointments = [];
    if (!services) services = [];
    
    const serviceStats = {};
    const servicesMap = services.reduce((map, service) => {
      if (service && service.id) {
        map[service.id] = service;
      }
      return map;
    }, {});
    
    appointments.forEach(appointment => {
      if (appointment && appointment.service_id && servicesMap[appointment.service_id]) {
        if (!serviceStats[appointment.service_id]) {
          serviceStats[appointment.service_id] = {
            id: appointment.service_id,
            name: servicesMap[appointment.service_id].name || `Serviço ${appointment.service_id}`,
            category: servicesMap[appointment.service_id].category || 'Não especificado',
            appointments: 0,
            revenue: 0
          };
        }
        
        serviceStats[appointment.service_id].appointments += 1;
        
        if (servicesMap[appointment.service_id].price) {
          serviceStats[appointment.service_id].revenue += servicesMap[appointment.service_id].price;
        }
      }
    });
    
    return Object.values(serviceStats).sort((a, b) => b.appointments - a.appointments);
  }, []);

  // Processar estatísticas de funcionários
  const processEmployeeStats = useCallback((sales, appointments, employees) => {
    // Verificar se os arrays não são undefined
    if (!sales) sales = [];
    if (!appointments) appointments = [];
    if (!employees) employees = [];
    
    const employeeStats = {};
    
    employees.forEach(employee => {
      if (employee && employee.id) {
        employeeStats[employee.id] = {
          id: employee.id,
          name: employee.name || 'Funcionário sem nome',
          role: employee.role || 'Não especificado',
          sales: 0,
          appointments: 0,
          completed_appointments: 0,
          canceled_appointments: 0,
          scheduled_appointments: 0,
          revenue: 0,
          commission: 0
        };
      }
    });
    
    sales.forEach(sale => {
      if (sale.employee_id && employeeStats[sale.employee_id]) {
        employeeStats[sale.employee_id].sales += 1;
        employeeStats[sale.employee_id].revenue += sale.total_amount || 0;
        
        const employee = employees.find(emp => emp.id === sale.employee_id);
        if (employee && employee.commission_rate) {
          employeeStats[sale.employee_id].commission += 
            (sale.total_amount || 0) * (employee.commission_rate / 100);
        }
      }
    });
    
    appointments.forEach(appointment => {
      if (appointment.employee_id && employeeStats[appointment.employee_id]) {
        // Incrementa o contador total de agendamentos
        employeeStats[appointment.employee_id].appointments += 1;
        
        // Incrementa o contador específico baseado no status
        if (appointment.status === 'concluido') {
          employeeStats[appointment.employee_id].completed_appointments += 1;
        } else if (appointment.status === 'cancelado') {
          employeeStats[appointment.employee_id].canceled_appointments += 1;
        } else {
          // Considera como agendado qualquer outro status (incluindo 'agendado' ou null)
          employeeStats[appointment.employee_id].scheduled_appointments += 1;
        }
      }
    });
    
    return Object.values(employeeStats).sort((a, b) => b.revenue - a.revenue);
  }, []);

  // Processar dados de eficiência dos funcionários
  const processEfficiencyData = useCallback((employeesData, appointments) => {
    if (!employeesData || !appointments) return [];

    // Processar dados de horários de pico
    const hourCounts = {};
    const weekdayCounts = {};
    const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sábado'];
    
    appointments.forEach(app => {
      if (!app.date) return;
      
      const date = new Date(app.date);
      const hour = date.getHours();
      const weekday = date.getDay();
      
      // Contar por hora
      if (!hourCounts[hour]) hourCounts[hour] = 0;
      hourCounts[hour]++;
      
      // Contar por dia da semana
      if (!weekdayCounts[weekday]) weekdayCounts[weekday] = 0;
      weekdayCounts[weekday]++;
    });
    
    // Converter para arrays para os gráficos
    const hourData = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      hourLabel: `${hour}:00`,
      count
    })).sort((a, b) => a.hour - b.hour);
    
    const weekdayData = Object.entries(weekdayCounts).map(([day, count]) => ({
      day: parseInt(day),
      dayLabel: weekdayNames[day],
      count
    })).sort((a, b) => a.day - b.day);
    
    // Encontrar horário e dia de pico
    let peakHour = 0;
    let peakHourCount = 0;
    let peakDay = 0;
    let peakDayCount = 0;
    
    hourData.forEach(hourItem => {
      if (hourItem.count > peakHourCount) {
        peakHourCount = hourItem.count;
        peakHour = hourItem.hour;
      }
    });
    
    weekdayData.forEach(dayItem => {
      if (dayItem.count > peakDayCount) {
        peakDayCount = dayItem.count;
        peakDay = dayItem.day;
      }
    });
    
    // Não chamar setPeakHoursData diretamente aqui para evitar problemas de renderização
    // Em vez disso, retornar os dados para serem processados na função principal
    const peakHoursData = {
      hourData,
      weekdayData,
      peakHour,
      peakDay,
      peakHourLabel: hourData.length > 0 ? `${peakHour}:00` : 'N/A',
      peakDayLabel: weekdayData.length > 0 ? weekdayNames[peakDay] : 'N/A'
    };

    const efficiencyData = employeesData.map(employee => {
      // Filtrar agendamentos deste funcionário
      const employeeAppointments = appointments.filter(app => app.employee_id === employee.id);
      
      // Calcular taxa de conclusão (concluídos / total de agendamentos não cancelados)
      const totalNonCanceled = employeeAppointments.filter(app => app.status !== 'cancelado').length;
      const completedCount = employeeAppointments.filter(app => app.status === 'concluido').length;
      const completionRate = totalNonCanceled > 0 
        ? Math.round((completedCount / totalNonCanceled) * 100) 
        : 0;
      
      // Calcular tempo médio de atendimento (baseado em dados reais se disponíveis)
      // Se não houver dados reais, usar a duração padrão do serviço ou um valor padrão
      const avgDuration = 60; // Valor padrão de 60 minutos
      
      // Calcular receita por hora (mesmo com agendamentos apenas agendados)
      const workHours = Math.max(1, employeeAppointments.length * (avgDuration / 60)); // Mínimo de 1 hora
      const revenuePerHour = employee.revenue / workHours;
      
      // Calcular tempo ocioso (placeholder - precisaria de dados reais)
      const idleTime = 15; // Valor padrão de 15 minutos
      
      // Agrupar agendamentos por semana
      const appointmentsByWeek = {};
      employeeAppointments.forEach(app => {
        if (!app.date) return;
        
        const date = new Date(app.date);
        const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        if (!appointmentsByWeek[weekStart]) {
          appointmentsByWeek[weekStart] = {
            total: 0,
            completed: 0,
            canceled: 0,
            scheduled: 0
          };
        }
        
        appointmentsByWeek[weekStart].total += 1;
        
        if (app.status === 'concluido') {
          appointmentsByWeek[weekStart].completed += 1;
        } else if (app.status === 'cancelado') {
          appointmentsByWeek[weekStart].canceled += 1;
        } else {
          appointmentsByWeek[weekStart].scheduled += 1;
        }
      });
      
      // Converter para array para facilitar o uso
      const weeklyStats = Object.entries(appointmentsByWeek).map(([week, stats]) => ({
        week,
        weekLabel: `${format(parseISO(week), 'dd/MM')} - ${format(addDays(parseISO(week), 6), 'dd/MM')}`,
        ...stats
      }));
      
      return {
        ...employee,
        completionRate,
        avgDuration,
        revenuePerHour,
        idleTime,
        weeklyStats
      };
    });
    
    return { efficiencyData, peakHoursData };
  }, []);

  // Carregar todos os dados de relatórios
  const loadAllReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Inicializar o cache se não existir
      Object.keys(dataCache).forEach(key => {
        if (!dataCache[key]) {
          dataCache[key] = { data: null, timestamp: null };
        }
      });
      
      // Buscar todos os dados necessários com cache
      const clients = await fetchWithCache('clients', () => Client.list());
      const sales = await fetchWithCache('sales', () => Sale.list());
      const appointments = await fetchWithCache('appointments', () => Appointment.list());
      const products = await fetchWithCache('products', () => Product.list());
      const services = await fetchWithCache('services', () => Service.list());
      const employees = await fetchWithCache('employees', () => Employee.list());
      
      // Tentativa de buscar dados de inventário, mas não falha se não existir
      let inventory = [];
      try {
        inventory = await fetchWithCache('inventory', () => Inventory.list());
      } catch (error) {
        console.error("Erro ao buscar dados de inventário:", error);
      }
      
      // Filtrar dados pelo período selecionado
      const periodStart = getPeriodStart();
      const filteredSales = sales.filter(sale => 
        sale.date && new Date(sale.date) >= periodStart
      );
      const filteredAppointments = appointments.filter(apt => 
        apt.date && new Date(apt.date) >= periodStart
      );
      
      // Extrair opções para filtros
      extractFilterOptions(products, services, employees, filteredSales);
      
      // Aplicar filtros
      const {
        filteredSales: filteredSalesByFilters,
        filteredProducts,
        filteredServices,
        employeesData: filteredEmployees
      } = applyFilters(filteredSales, products, services, employees);
      
      // Agrupar vendas por data e tipo
      const salesByDate = groupSalesByDate(filteredSalesByFilters);
      setSalesData(salesByDate);
      
      // Processar estatísticas de clientes
      const clientStats = processClientStats(clients, filteredAppointments, filteredSalesByFilters);
      setClientsData(clientStats);
      
      // Processar estatísticas de produtos
      const productStats = processProductStats(filteredSalesByFilters, filteredProducts);
      setProductsData(productStats);
      
      // Processar estatísticas de serviços
      const serviceStats = processServiceStats(filteredAppointments, filteredServices);
      setServicesData(serviceStats);
      
      // Processar estatísticas de funcionários
      const employeeStats = processEmployeeStats(filteredSalesByFilters, filteredAppointments, filteredEmployees);
      setEmployeesData(employeeStats);
      
      // Processar dados de eficiência dos funcionários
      const { efficiencyData, peakHoursData } = processEfficiencyData(employeeStats, filteredAppointments);
      setEfficiencyData(efficiencyData);
      setPeakHoursData(peakHoursData);
      
      // Processar dados para relatórios adicionais
      const trendsData = processTrendsData(filteredSalesByFilters);
      setTrendsData(trendsData);
      
      // Processar dados de fidelização
      const retentionData = processRetentionData(clients, filteredSalesByFilters, filteredAppointments);
      setRetentionData(retentionData);
      
      // Processar dados de inventário para alertas
      const inventoryAlerts = processInventoryAlerts(products, inventory);
      setInventoryAlertData(inventoryAlerts);
      
      // Processar dados de despesas
      const expensesData = processExpensesData(filteredSalesByFilters, filteredEmployees);
      setExpensesData(expensesData);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Erro ao carregar dados dos relatórios:", error);
      setError("Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }, [
    period, 
    filters, 
    fetchWithCache, 
    extractFilterOptions,
    applyFilters,
    groupSalesByDate,
    processClientStats,
    processProductStats,
    processServiceStats,
    processEmployeeStats,
    processEfficiencyData,
    getPeriodStart
  ]);

  // Carregar dados na inicialização e quando o período ou filtros mudarem
  useEffect(() => {
    loadAllReportData();
  }, [loadAllReportData]);

  // Processar dados de inventário para alertas
  const processInventoryAlerts = (products, inventory) => {
    // Se não houver produtos ou inventário, retornar array vazio
    if (!products || !products.length) {
      return [];
    }

    // Mapear produtos com seus dados de inventário
    const productsWithInventory = products.map(product => {
      // Encontrar o item de inventário correspondente ao produto
      const inventoryItem = inventory && inventory.length ? 
        inventory.find(item => item.product_id === product.id) : null;
      
      // Se não houver item de inventário, usar valores do produto diretamente
      const currentStock = inventoryItem ? inventoryItem.quantity : (product.stock || 0);
      const minStock = product.min_stock || 5; // Valor padrão de estoque mínimo
      
      return {
        ...product,
        name: product.name,
        category: product.category,
        stock: currentStock,
        min_stock: minStock,
        price: product.price || 0,
        status: currentStock <= 0 ? 'esgotado' : currentStock < minStock ? 'baixo' : 'normal',
        daysToRestock: 7, // Valor padrão para previsão de reposição
        isLow: currentStock < minStock,
        isOut: currentStock <= 0
      };
    });

    // Filtrar produtos com estoque baixo ou esgotado
    return productsWithInventory.filter(product => product.status === 'esgotado' || product.status === 'baixo');
  };

  // Função para processar dados de fidelização
  const processRetentionData = (clients, sales, appointments) => {
    if (!clients || !clients.length) {
      return [];
    }

    const now = new Date();
  
    return clients.map(client => {
      // Filtrar vendas e agendamentos deste cliente
      const clientSales = sales.filter(sale => sale.client_id === client.id);
      const clientAppointments = appointments.filter(app => app.client_id === client.id);
      
      // Calcular total gasto
      const totalSpent = clientSales.reduce((total, sale) => total + (parseFloat(sale.total) || 0), 0);
      
      // Calcular número de compras e agendamentos
      const purchaseCount = clientSales.length;
      const appointmentCount = clientAppointments.length;
      
      // Encontrar data da última visita (venda ou agendamento)
      const salesDates = clientSales.map(sale => new Date(sale.date));
      const appointmentDates = clientAppointments.map(app => new Date(app.date));
      const allDates = [...salesDates, ...appointmentDates].filter(date => !isNaN(date.getTime()));
      
      // Se não houver datas válidas, usar a data de criação do cliente ou hoje
      const lastVisitDate = allDates.length > 0 
        ? new Date(Math.max(...allDates.map(date => date.getTime())))
        : (client.created_date ? new Date(client.created_date) : now);
      
      // Calcular dias desde a última visita
      const daysSinceLast = Math.floor((now - lastVisitDate) / (1000 * 60 * 60 * 24));
      
      // Determinar categoria de recência
      let recencyCategory = 'recente';
      if (daysSinceLast > 180) {
        recencyCategory = 'inativo';
      } else if (daysSinceLast > 90) {
        recencyCategory = 'em risco';
      } else if (daysSinceLast > 30) {
        recencyCategory = 'ativo';
      }
      
      // Calcular pontuação RFM (Recência, Frequência, Monetização)
      // Pontuação de 1-5 para cada dimensão
      
      // Recência (R) - menor é melhor
      let r = 5;
      if (daysSinceLast > 365) r = 1;
      else if (daysSinceLast > 180) r = 2;
      else if (daysSinceLast > 90) r = 3;
      else if (daysSinceLast > 30) r = 4;
      
      // Frequência (F) - maior é melhor
      let f = 1;
      const totalVisits = purchaseCount + appointmentCount;
      if (totalVisits > 20) f = 5;
      else if (totalVisits > 10) f = 4;
      else if (totalVisits > 5) f = 3;
      else if (totalVisits > 2) f = 2;
      
      // Monetização (M) - maior é melhor
      let m = 1;
      if (totalSpent > 5000) m = 5;
      else if (totalSpent > 2000) m = 4;
      else if (totalSpent > 1000) m = 3;
      else if (totalSpent > 500) m = 2;
      
      // Pontuação total RFM
      const rfmScore = {
        r, f, m,
        total: r + f + m
      };
      
      return {
        id: client.id,
        name: client.name,
        daysSinceLast,
        totalSpent,
        purchaseCount,
        appointmentCount,
        recencyCategory,
        rfmScore
      };
    });
  };

  // Função para processar dados de tendências
  const processTrendsData = (sales) => {
    if (!sales || !sales.length) {
      return [];
    }

    // Agrupar vendas por mês
    const salesByMonth = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Inicializar os últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth - i + 12) % 12;
      const year = currentYear - Math.floor((i - currentMonth) / 12);
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthName = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      salesByMonth[monthKey] = {
        month: monthName,
        total: 0,
        count: 0,
        projected: i < 0 // Meses futuros são projeções
      };
    }
    
    // Agrupar vendas por mês
    sales.forEach(sale => {
      if (!sale.date) return;
      
      const saleDate = new Date(sale.date);
      const month = saleDate.getMonth();
      const year = saleDate.getFullYear();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // Verificar se o mês está nos últimos 12 meses
      if (salesByMonth[monthKey]) {
        salesByMonth[monthKey].total += parseFloat(sale.total) || 0;
        salesByMonth[monthKey].count += 1;
      }
    });
    
    // Converter para array e ordenar por data
    const trendsArray = Object.values(salesByMonth).sort((a, b) => {
      return a.month.localeCompare(b.month);
    });
    
    // Calcular projeções para o mês atual (se ainda não terminou)
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthData = salesByMonth[currentMonthKey];
    
    if (currentMonthData) {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const remainingDays = daysInMonth - dayOfMonth;
      
      // Se ainda não chegamos ao final do mês, fazer projeção
      if (remainingDays > 0) {
        const dailyAverage = currentMonthData.total / dayOfMonth;
        const projectedTotal = currentMonthData.total + (dailyAverage * remainingDays);
        
        // Adicionar projeção como um ponto separado
        currentMonthData.projectedTotal = projectedTotal;
      }
    }
    
    return trendsArray;
  };

  // Função para processar dados de despesas
  const processExpensesData = (sales, employees) => {
    if (!sales || !sales.length) {
      return {
        totalExpenses: 0,
        categorizedExpenses: [],
        monthlyExpenses: [],
        topExpenses: []
      };
    }

    // Calcular total de despesas
    const totalExpenses = sales.reduce((acc, sale) => acc + (sale.expenses || 0), 0);

    // Agrupar despesas por categoria
    const categorizedExpenses = {};
    sales.forEach(sale => {
      if (sale.expenses && sale.expense_category) {
        if (!categorizedExpenses[sale.expense_category]) {
          categorizedExpenses[sale.expense_category] = 0;
        }
        categorizedExpenses[sale.expense_category] += sale.expenses;
      }
    });
    const categorizedExpensesArray = Object.keys(categorizedExpenses).map(category => ({
      category,
      value: categorizedExpenses[category]
    }));

    // Agrupar despesas por mês
    const monthlyExpenses = {};
    sales.forEach(sale => {
      if (sale.expenses) {
        const month = new Date(sale.date).getMonth();
        const year = new Date(sale.date).getFullYear();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (!monthlyExpenses[monthKey]) {
          monthlyExpenses[monthKey] = 0;
        }
        monthlyExpenses[monthKey] += sale.expenses;
      }
    });
    const monthlyExpensesArray = Object.keys(monthlyExpenses).map(month => ({
      month,
      value: monthlyExpenses[month]
    }));

    // Encontrar as maiores despesas
    const topExpenses = sales
      .filter(sale => sale.expenses)
      .sort((a, b) => b.expenses - a.expenses)
      .slice(0, 5);

    return {
      totalExpenses,
      categorizedExpenses: categorizedExpensesArray,
      monthlyExpenses: monthlyExpensesArray,
      topExpenses
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Relatórios</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={period}
            onValueChange={setPeriod}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
              <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
              <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
              <SelectItem value="last_12_months">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              setLastRefresh(new Date());
              loadAllReportData();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {showFilters ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <p className="ml-2 text-gray-500">Carregando dados...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-700 border border-red-200">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={loadAllReportData}
          >
            Tentar novamente
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="sales">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
            <TabsTrigger value="retention">Fidelização</TabsTrigger>
            <TabsTrigger value="inventory">Estoque</TabsTrigger>
            <TabsTrigger value="efficiency">Eficiência</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-violet-100 to-violet-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-violet-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Total de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-violet-900">
                    {formatCurrency(salesData.reduce((acc, item) => acc + item.total, 0))}
                  </p>
                  <p className="text-sm text-violet-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-emerald-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-emerald-900">
                    {formatCurrency(
                      salesData.length > 0
                        ? salesData.reduce((acc, item) => acc + item.total, 0) / salesData.length
                        : 0
                    )}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Clientes Atendidos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-amber-900">
                    {clientsData?.activeClients || 0}
                  </p>
                  <p className="text-sm text-amber-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-2 border-b border-blue-200">
                <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Vendas no Período
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {salesData.length > 0 ? (
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <defs>
                          <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="colorServices" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="colorPackages" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="colorGiftcards" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="colorSubscriptions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return format(date, 'dd/MM');
                          }}
                          stroke="#6b7280"
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                          stroke="#6b7280"
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend 
                          iconType="circle"
                          wrapperStyle={{
                            paddingTop: '10px'
                          }}
                        />
                        <Bar name="Produtos" dataKey="products" fill="url(#colorProducts)" radius={[4, 4, 0, 0]} />
                        <Bar name="Serviços" dataKey="services" fill="url(#colorServices)" radius={[4, 4, 0, 0]} />
                        <Bar name="Pacotes" dataKey="packages" fill="url(#colorPackages)" radius={[4, 4, 0, 0]} />
                        <Bar name="Giftcards" dataKey="giftcards" fill="url(#colorGiftcards)" radius={[4, 4, 0, 0]} />
                        <Bar name="Assinaturas" dataKey="subscriptions" fill="url(#colorSubscriptions)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md m-4">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500">Nenhum dado de vendas disponível para o período selecionado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 pb-2 border-b border-indigo-200">
                  <CardTitle className="text-lg font-medium text-indigo-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Distribuição por Tipo de Venda
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Produtos', value: salesData.reduce((acc, item) => acc + (item.products || 0), 0) },
                            { name: 'Serviços', value: salesData.reduce((acc, item) => acc + (item.services || 0), 0) },
                            { name: 'Pacotes', value: salesData.reduce((acc, item) => acc + (item.packages || 0), 0) },
                            { name: 'Giftcards', value: salesData.reduce((acc, item) => acc + (item.giftcards || 0), 0) },
                            { name: 'Assinaturas', value: salesData.reduce((acc, item) => acc + (item.subscriptions || 0), 0) },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-2 border-b border-blue-200">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Evolução de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return format(date, 'dd/MM');
                          }}
                          stroke="#6b7280"
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                          stroke="#6b7280"
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          name="Total" 
                          stroke="#6366f1" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#6366f1" }}
                          activeDot={{ r: 6, fill: "#4f46e5" }}
                          fill="url(#colorTotal)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-indigo-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Total de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-indigo-900">
                    {formatCurrency(trendsData.reduce((acc, item) => acc + item.total, 0))}
                  </p>
                  <p className="text-sm text-indigo-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-purple-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-purple-900">
                    {formatCurrency(
                      trendsData.length > 0
                        ? trendsData.reduce((acc, item) => acc + item.total, 0) / trendsData.length
                        : 0
                    )}
                  </p>
                  <p className="text-sm text-purple-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-cyan-100 to-cyan-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-cyan-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Clientes Atendidos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-cyan-900">
                    {clientsData?.activeClients || 0}
                  </p>
                  <p className="text-sm text-cyan-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 pb-2 border-b border-indigo-200">
                  <CardTitle className="text-lg font-medium text-indigo-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tendência de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendsData}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6b7280"
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                          stroke="#6b7280"
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend 
                          iconType="circle"
                          wrapperStyle={{
                            paddingTop: '10px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          name="Vendas" 
                          stroke="#6366f1" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#6366f1" }}
                          activeDot={{ r: 6, fill: "#4f46e5" }}
                          fill="url(#colorTrend)"
                        />
                        {trendsData.some(item => item.projectedTotal) && (
                          <Line 
                            type="monotone" 
                            dataKey="projectedTotal" 
                            name="Projeção" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4, fill: "#f59e0b" }}
                            activeDot={{ r: 6, fill: "#d97706" }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-2 border-b border-blue-200">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Retenção de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Recentes (até 30d)', value: retentionData.filter(c => c.recencyCategory === 'recente').length, color: '#10b981' },
                            { name: 'Ativos (30-90d)', value: retentionData.filter(c => c.recencyCategory === 'ativo').length, color: '#3b82f6' },
                            { name: 'Em risco (90-180d)', value: retentionData.filter(c => c.recencyCategory === 'em risco').length, color: '#f59e0b' },
                            { name: 'Inativos (180d+)', value: retentionData.filter(c => c.recencyCategory === 'inativo').length, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {({ name, value, color }) => (
                            <Cell key={`cell-${name}`} fill={color} />
                          )}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [value, 'Clientes']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend 
                          iconType="circle"
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{
                            paddingLeft: '10px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 pb-2 border-b border-amber-200">
                <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Análise Projetada de Crescimento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData}>
                      <defs>
                        <linearGradient id="colorTotalArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280"
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                        stroke="#6b7280"
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                      <Legend 
                        iconType="circle"
                        wrapperStyle={{
                          paddingTop: '10px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTotalArea)" 
                        name="Vendas"
                      />
                      {trendsData.findIndex(item => item.projected) >= 0 && (
                        <ReferenceLine y={0} stroke="#6b7280" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                  <div className="flex items-center text-sm text-amber-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>A projeção é baseada na média diária de vendas do mês atual, aplicada aos dias restantes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retention" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-green-100 to-green-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-green-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Taxa de Retenção
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-green-900">
                    {retentionData.length > 0 
                      ? `${Math.round((retentionData.filter(c => c.recencyCategory !== 'inativo').length / retentionData.length) * 100)}%` 
                      : '0%'}
                  </p>
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Clientes que retornaram
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674z" />
                    </svg>
                    Clientes VIP
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-blue-900">
                    {retentionData
                      .filter(c => c.rfmScore && c.rfmScore.total >= 12)
                      .length}
                  </p>
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Alto valor e frequência
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Clientes em Risco
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-amber-900">
                    {retentionData
                      .filter(c => c.recencyCategory === 'em risco')
                      .length}
                  </p>
                  <p className="text-sm text-amber-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sem visitas há 90-180 dias
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 pb-2 border-b border-purple-200">
                <CardTitle className="text-lg font-medium text-purple-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Análise RFM (Recência, Frequência, Monetização)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <defs>
                        <linearGradient id="colorRecent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorInactive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        dataKey="daysSinceLast" 
                        name="Recência" 
                        label={{ value: 'Dias desde última visita', position: 'insideBottom', offset: -5, fill: '#6b7280' }} 
                        stroke="#6b7280"
                      />
                      <YAxis 
                        type="number" 
                        dataKey="totalSpent" 
                        name="Valor" 
                        label={{ value: 'Valor total gasto', angle: -90, position: 'insideLeft', fill: '#6b7280' }} 
                        tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                        stroke="#6b7280"
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="appointmentCount" 
                        range={[50, 400]} 
                        name="Frequência" 
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'Valor') return formatCurrency(value);
                          if (name === 'Recência') return `${value} dias`;
                          if (name === 'Frequência') return `${value} visitas`;
                          return value;
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          border: '1px solid #e5e7eb'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            let statusColor = "#10b981"; // verde para recente
                            if (data.recencyCategory === 'em risco') statusColor = "#f59e0b"; // âmbar para em risco
                            else if (data.recencyCategory === 'inativo') statusColor = "#ef4444"; // vermelho para inativo
                            else if (data.recencyCategory === 'ativo') statusColor = "#3b82f6"; // azul para ativo
                            
                            return (
                              <div className="bg-white p-3 border rounded shadow-lg text-sm">
                                <p className="font-semibold text-gray-900 border-b pb-1 mb-1">{data.name}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p>Última visita:</p>
                                    <p className="font-medium">{data.daysSinceLast} dias atrás</p>
                                  </div>
                                  <div>
                                    <p>Visitas:</p>
                                    <p className="font-medium">{data.appointmentCount + (data.purchaseCount || 0)}</p>
                                  </div>
                                  <div>
                                    <p>Total gasto:</p>
                                    <p className="font-medium">{formatCurrency(data.totalSpent)}</p>
                                  </div>
                                  <div>
                                    <p>Status:</p>
                                    <p className="font-medium flex items-center">
                                      <span className={`w-2 h-2 rounded-full mr-1`} style={{backgroundColor: statusColor}}></span>
                                      {data.recencyCategory === 'recente' ? 'Recente' : 
                                       data.recencyCategory === 'ativo' ? 'Ativo' : 
                                       data.recencyCategory === 'em risco' ? 'Em risco' : 'Inativo'}
                                    </p>
                                  </div>
                                  <div>
                                    <p>Pontuação RFM:</p>
                                    <p className="font-medium">{data.rfmScore ? 
                                      `R${data.rfmScore.r} F${data.rfmScore.f} M${data.rfmScore.m}` : 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter 
                        name="Clientes" 
                        data={retentionData} 
                        fill="#8884d8"
                      >
                        {retentionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.recencyCategory === 'recente' ? '#10b981' : 
                            entry.recencyCategory === 'ativo' ? '#3b82f6' : 
                            entry.recencyCategory === 'em risco' ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Scatter>
                      <ReferenceLine y={0} stroke="#6b7280" />
                      <ReferenceLine x={30} stroke="#10b981" strokeDasharray="3 3" 
                        label={{ value: '30 dias', position: 'insideTopRight', fill: '#10b981' }} />
                      <ReferenceLine x={90} stroke="#3b82f6" strokeDasharray="3 3" 
                        label={{ value: '90 dias', position: 'insideTopRight', fill: '#3b82f6' }} />
                       <ReferenceLine x={180} stroke="#f59e0b" strokeDasharray="3 3" 
                        label={{ value: '180 dias', position: 'insideTopRight', fill: '#f59e0b' }} />
                    </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="bg-gradient-to-r from-rose-50 to-rose-100 pb-2 border-b border-rose-200">
                    <CardTitle className="text-lg font-medium text-rose-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Distribuição por Categoria de Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-64 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Recentes (até 30d)', value: retentionData.filter(c => c.recencyCategory === 'recente').length, color: '#10b981' },
                              { name: 'Ativos (30-90d)', value: retentionData.filter(c => c.recencyCategory === 'ativo').length, color: '#3b82f6' },
                              { name: 'Em risco (90-180d)', value: retentionData.filter(c => c.recencyCategory === 'em risco').length, color: '#f59e0b' },
                              { name: 'Inativos (180d+)', value: retentionData.filter(c => c.recencyCategory === 'inativo').length, color: '#ef4444' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {({ name, value, color }) => (
                              <Cell key={`cell-${name}`} fill={color} />
                            )}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [value, 'Clientes']}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              border: '1px solid #e5e7eb'
                            }}
                          />
                          <Legend 
                            iconType="circle"
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{
                              paddingLeft: '10px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 pb-2 border-b border-teal-200">
                    <CardTitle className="text-lg font-medium text-teal-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Distribuição por Valor Gasto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-64 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={[
                            { name: 'Até R$500', value: retentionData.filter(c => c.totalSpent <= 500).length, color: '#94a3b8' },
                            { name: 'R$501-1000', value: retentionData.filter(c => c.totalSpent > 500 && c.totalSpent <= 1000).length, color: '#60a5fa' },
                            { name: 'R$1001-2000', value: retentionData.filter(c => c.totalSpent > 1000 && c.totalSpent <= 2000).length, color: '#3b82f6' },
                            { name: 'R$2001-5000', value: retentionData.filter(c => c.totalSpent > 2000 && c.totalSpent <= 5000).length, color: '#2563eb' },
                            { name: 'Acima de R$5000', value: retentionData.filter(c => c.totalSpent > 5000).length, color: '#1d4ed8' }
                          ]}
                          layout="vertical"
                          margin={{ left: 120 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                          <XAxis type="number" />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            stroke="#6b7280"
                            tick={{ width: 100 }}
                          />
                          <Tooltip 
                            formatter={(value) => [value, 'Clientes']}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              border: '1px solid #e5e7eb'
                            }}
                          />
                          <Bar 
                            dataKey="value" 
                            name="Clientes" 
                            radius={[0, 4, 4, 0]}
                          >
                            {[
                              { name: 'Até R$500', color: '#94a3b8' },
                              { name: 'R$501-1000', color: '#60a5fa' },
                              { name: 'R$1001-2000', color: '#3b82f6' },
                              { name: 'R$2001-5000', color: '#2563eb' },
                              { name: 'Acima de R$5000', color: '#1d4ed8' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-red-100 to-red-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-red-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Produtos Esgotados
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-red-900">
                    {inventoryAlertData.filter(product => product.status === 'esgotado').length}
                  </p>
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Precisam de reposição urgente
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Estoque Baixo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-amber-900">
                    {inventoryAlertData.filter(product => product.status === 'baixo').length}
                  </p>
                  <p className="text-sm text-amber-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Abaixo do mínimo
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tempo Médio Reposição
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-blue-900">
                    {inventoryAlertData.length > 0 ? 
                      inventoryAlertData[0].daysToRestock + ' dias' : 
                      'N/A'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Para produtos em alerta
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 pb-2 border-b border-purple-200">
                  <CardTitle className="text-lg font-medium text-purple-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Distribuição por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(() => {
                            // Agrupar produtos por categoria
                            const categories = {};
                            inventoryAlertData.forEach(product => {
                              if (!categories[product.category]) {
                                categories[product.category] = 0;
                              }
                              categories[product.category]++;
                            });
                            
                            // Converter para array no formato esperado pelo gráfico
                            const colors = ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'];
                            return Object.keys(categories).map((category, index) => ({
                              name: category.charAt(0).toUpperCase() + category.slice(1),
                              value: categories[category],
                              color: colors[index % colors.length]
                            }));
                          })()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {({ name, value, color }) => (
                            <Cell key={`cell-${name}`} fill={color} />
                          )}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [value, 'Produtos']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend 
                          iconType="circle"
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{
                            paddingLeft: '10px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 pb-2 border-b border-teal-200">
                  <CardTitle className="text-lg font-medium text-teal-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Valor em Estoque por Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { 
                            name: 'Estoque Normal', 
                            value: 5000,
                            color: '#10b981'
                          },
                          { 
                            name: 'Estoque Baixo', 
                            value: 3000,
                            color: '#f59e0b'
                          },
                          { 
                            name: 'Esgotado', 
                            value: 1000,
                            color: '#ef4444'
                          }
                        ]}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          type="number" 
                          stroke="#6b7280" 
                          tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="#6b7280"
                          tick={{ width: 100 }}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Valor']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          name="Valor" 
                          radius={[0, 4, 4, 0]}
                        >
                          {[
                            { name: 'Estoque Normal', color: '#10b981' },
                            { name: 'Estoque Baixo', color: '#f59e0b' },
                            { name: 'Esgotado', color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Produtos com Estoque Crítico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-teal-50 to-teal-100">
                      <tr className="border-b border-teal-200">
                        <th className="text-left py-3 px-4 font-medium text-teal-800">Produto</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Categoria</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Estoque Atual</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Estoque Mínimo</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Status</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Valor em Estoque</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Previsão Reposição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryAlertData.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors duration-150">
                          <td className="py-3 px-4 font-medium">{product.name}</td>
                          <td className="py-3 px-4 text-center capitalize">{product.category}</td>
                          <td className="py-3 px-4 text-center font-medium">{product.stock}</td>
                          <td className="py-3 px-4 text-center">{product.min_stock}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              product.status === 'esgotado' 
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {product.status === 'esgotado' ? 'Esgotado' : 'Estoque Baixo'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">
                            {formatCurrency(product.stock * product.price)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {product.daysToRestock} dias
                            </span>
                          </td>
                        </tr>
                      ))}
                      {inventoryAlertData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p>Nenhum produto com estoque crítico</p>
                              <p className="text-sm text-gray-400 mt-1">Todos os produtos estão com estoque adequado</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Horário de Pico
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-blue-900">
                    {peakHoursData.peakHourLabel || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Maior volume de atendimentos
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-indigo-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Dia mais Movimentado
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-indigo-900">
                    {peakHoursData.peakDayLabel || 'N/A'}
                  </p>
                  <p className="text-sm text-indigo-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Da semana
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-green-100 to-green-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-green-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Taxa de Conclusão
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-green-900">
                    {efficiencyData.length > 0 
                      ? `${Math.round(efficiencyData.reduce((acc, emp) => acc + parseFloat(emp.completionRate || 0), 0) / efficiencyData.length)}%` 
                      : '0%'}
                  </p>
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Agendamentos concluídos
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    {efficiencyData.length > 0 && efficiencyData.every(emp => emp.completionRate === 0)
                      ? "Nenhum agendamento foi concluído ainda"
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-2 border-b border-blue-200">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Distribuição de Atendimentos por Hora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakHoursData.hourData || []}>
                        <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="hourLabel" 
                          tickFormatter={(value) => value}
                          stroke="#6b7280"
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          formatter={(value) => [value, 'Atendimentos']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          name="Atendimentos" 
                          fill="url(#colorHours)"
                          radius={[4, 4, 0, 0]}
                        >
                          {peakHoursData.hourData && peakHoursData.hourData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.hourLabel === peakHoursData.peakHourLabel ? '#1d4ed8' : '#60a5fa'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {peakHoursData.hourData && peakHoursData.hourData.length === 0 && (
                    <div className="flex justify-center items-center h-20 mt-4">
                      <p className="text-gray-500">Nenhum dado de atendimento disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 pb-2 border-b border-purple-200">
                  <CardTitle className="text-lg font-medium text-purple-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Eficiência dos Profissionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={efficiencyData}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.8}/>
                          </linearGradient>
                          <linearGradient id="colorIdle" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.8}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="#6b7280"
                          tick={{ width: 100 }}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Receita por Hora') return formatCurrency(value);
                            return value;
                          }}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend iconType="circle" />
                        <Bar name="Receita por Hora" dataKey="revenuePerHour" fill="url(#colorRevenue)" radius={[0, 4, 4, 0]} />
                        <Bar name="Tempo Ocioso (min)" dataKey="idleTime" fill="url(#colorIdle)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {efficiencyData.length === 0 && (
                    <div className="flex justify-center items-center h-20 mt-4">
                      <p className="text-gray-500">Nenhum dado de eficiência disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Desempenho dos Profissionais no Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Profissional</th>
                        <th className="text-center py-3 px-4">Função</th>
                        <th className="text-center py-3 px-4">Total</th>
                        <th className="text-center py-3 px-4">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Concluídos
                          </span>
                        </th>
                        <th className="text-center py-3 px-4">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Cancelados
                          </span>
                        </th>
                        <th className="text-center py-3 px-4">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Agendados
                          </span>
                        </th>
                        <th className="text-center py-3 px-4">Taxa Conclusão</th>
                        <th className="text-center py-3 px-4">Tempo Médio</th>
                        <th className="text-center py-3 px-4">Receita</th>
                        <th className="text-center py-3 px-4">Receita/Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {efficiencyData.map((employee, index) => (
                        <React.Fragment key={index}>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{employee.name}</td>
                            <td className="py-3 px-4 text-center capitalize">{employee.role}</td>
                            <td className="py-3 px-4 text-center">{employee.appointments}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {employee.completed_appointments || 0}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                {employee.canceled_appointments || 0}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {employee.scheduled_appointments || 0}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                parseInt(employee.completionRate) >= 80 
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : parseInt(employee.completionRate) >= 50
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {employee.completionRate}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">{employee.avgDuration} min</td>
                            <td className="py-3 px-4 text-center font-medium">{formatCurrency(employee.revenue)}</td>
                            <td className="py-3 px-4 text-center font-medium">{formatCurrency(employee.revenuePerHour)}</td>
                          </tr>
                          {employee.weeklyStats && employee.weeklyStats.length > 0 && (
                            <tr className="bg-gray-50">
                              <td colSpan={10} className="py-2 px-4">
                                <div className="text-xs text-gray-500 mb-1">Agendamentos por Semana</div>
                                <div className="flex items-center gap-1">
                                  {employee.weeklyStats.map((stat, i) => (
                                    <div key={i} className="flex flex-col items-center">
                                      <div className="text-xs text-gray-500">{stat.week}</div>
                                      <div className="flex gap-0.5 mt-1">
                                        <div 
                                          className="w-6 bg-green-500 rounded-sm" 
                                          style={{ height: `${Math.max(4, stat.completed * 4)}px` }}
                                          title={`Concluídos: ${stat.completed}`}
                                        ></div>
                                        <div 
                                          className="w-6 bg-red-500 rounded-sm" 
                                          style={{ height: `${Math.max(4, stat.canceled * 4)}px` }}
                                          title={`Cancelados: ${stat.canceled}`}
                                        ></div>
                                        <div 
                                          className="w-6 bg-blue-500 rounded-sm" 
                                          style={{ height: `${Math.max(4, stat.scheduled * 4)}px` }}
                                          title={`Agendados: ${stat.scheduled}`}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {efficiencyData.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p>Nenhum dado de eficiência disponível</p>
                              <p className="text-sm text-gray-400 mt-1">Selecione outro período ou aguarde novos agendamentos</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-red-100 to-red-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-red-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Total de Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold text-red-900">
                    {formatCurrency(expensesData.totalExpenses)}
                  </p>
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Despesas por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesData.categorizedExpenses}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="category"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {expensesData.categorizedExpenses.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [value, 'Despesas']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend 
                          iconType="circle"
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{
                            paddingLeft: '10px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-blue-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Despesas por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-64 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={expensesData.monthlyExpenses}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="month" 
                          stroke="#6b7280"
                          tick={{ width: 100 }}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Despesas']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          name="Despesas" 
                          radius={[0, 4, 4, 0]}
                        >
                          {expensesData.monthlyExpenses.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-teal-50 to-teal-100">
                      <tr className="border-b border-teal-200">
                        <th className="text-left py-3 px-4 font-medium text-teal-800">Categoria</th>
                        <th className="text-center py-3 px-4 font-medium text-teal-800">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesData.categorizedExpenses.map((expense, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors duration-150">
                          <td className="py-3 px-4 font-medium">{expense.category}</td>
                          <td className="py-3 px-4 text-center font-medium">{formatCurrency(expense.value)}</td>
                        </tr>
                      ))}
                      {expensesData.categorizedExpenses.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p>Nenhuma despesa registrada</p>
                              <p className="text-sm text-gray-400 mt-1">Verifique se há despesas no período selecionado</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 pb-2 border-b border-red-200">
                <CardTitle className="text-lg font-medium text-red-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Maiores Despesas no Período
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-red-50 to-red-100">
                      <tr className="border-b border-red-200">
                        <th className="text-left py-3 px-4 font-medium text-red-800">Descrição</th>
                        <th className="text-center py-3 px-4 font-medium text-red-800">Data</th>
                        <th className="text-center py-3 px-4 font-medium text-red-800">Categoria</th>
                        <th className="text-center py-3 px-4 font-medium text-red-800">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesData.topExpenses.map((expense, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors duration-150">
                          <td className="py-3 px-4 font-medium">{expense.description || 'Sem descrição'}</td>
                          <td className="py-3 px-4 text-center">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              {expense.expense_category || 'Não categorizado'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-red-600">{formatCurrency(expense.expenses)}</td>
                        </tr>
                      ))}
                      {expensesData.topExpenses.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p>Nenhuma despesa registrada</p>
                              <p className="text-sm text-gray-400 mt-1">Verifique se há despesas no período selecionado</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 pb-2 border-b border-purple-200">
                  <CardTitle className="text-lg font-medium text-purple-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Evolução de Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={expensesData.monthlyExpenses}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6b7280"
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Despesas']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#ef4444" 
                          fillOpacity={1} 
                          fill="url(#colorExpenses)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 pb-2 border-b border-amber-200">
                  <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Distribuição de Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {expensesData.categorizedExpenses.map((entry, index) => (
                            <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                              <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.5}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie
                          data={expensesData.categorizedExpenses}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expensesData.categorizedExpenses.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#colorGradient-${index})`} 
                              stroke={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Despesas']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
