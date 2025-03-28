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
    const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
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
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
            <TabsTrigger value="retention">Fidelização</TabsTrigger>
            <TabsTrigger value="inventory">Estoque</TabsTrigger>
            <TabsTrigger value="efficiency">Eficiência</TabsTrigger>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Período selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-100 to-amber-200 rounded-t-lg">
                  <CardTitle className="text-lg font-medium text-amber-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500">Nenhum dado de vendas disponível para o período selecionado</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 pb-2 border-b border-pink-200">
                  <CardTitle className="text-lg font-medium text-pink-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
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
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 pb-2 border-b border-indigo-200">
                  <CardTitle className="text-lg font-medium text-indigo-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Total de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatCurrency(trendsData.reduce((acc, item) => acc + item.total, 0))}
                  </p>
                  <p className="text-sm text-gray-500">Período selecionado</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {formatCurrency(
                      trendsData.length > 0
                        ? trendsData.reduce((acc, item) => acc + item.total, 0) / trendsData.length
                        : 0
                    )}
                  </p>
                  <p className="text-sm text-gray-500">Período selecionado</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Clientes Atendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {clientsData?.activeClients || 0}
                  </p>
                  <p className="text-sm text-gray-500">Período selecionado</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Vendas no Período</h3>
              {salesData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return format(date, 'dd/MM');
                        }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })} 
                      />
                      <Legend />
                      <Bar name="Produtos" dataKey="products" fill={COLORS[0]} />
                      <Bar name="Serviços" dataKey="services" fill={COLORS[1]} />
                      <Bar name="Pacotes" dataKey="packages" fill={COLORS[2]} />
                      <Bar name="Giftcards" dataKey="giftcards" fill={COLORS[3]} />
                      <Bar name="Assinaturas" dataKey="subscriptions" fill={COLORS[4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Nenhum dado de vendas disponível para o período selecionado</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="retention" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Taxa de Retenção</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {retentionData.length > 0 
                      ? `${Math.round((retentionData.filter(c => c.recencyCategory !== 'inativo').length / retentionData.length) * 100)}%` 
                      : '0%'}
                  </p>
                  <p className="text-sm text-gray-500">Clientes que retornaram</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Clientes VIP</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {retentionData
                      .filter(c => c.rfmScore && c.rfmScore.total >= 12)
                      .length}
                  </p>
                  <p className="text-sm text-gray-500">Alto valor e frequência</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Clientes em Risco</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {retentionData
                      .filter(c => c.recencyCategory === 'em risco')
                      .length}
                  </p>
                  <p className="text-sm text-gray-500">Sem visitas há 90-180 dias</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Análise RFM (Recência, Frequência, Monetização)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="daysSinceLast" 
                        name="Recência" 
                        label={{ value: 'Dias desde última visita', position: 'insideBottom', offset: -5 }} 
                      />
                      <YAxis 
                        type="number" 
                        dataKey="totalSpent" 
                        name="Valor" 
                        label={{ value: 'Valor total gasto', angle: -90, position: 'insideLeft' }} 
                        tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
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
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border rounded shadow text-xs">
                                <p className="font-semibold">{data.name}</p>
                                <p>Última visita: {data.daysSinceLast} dias atrás</p>
                                <p>Visitas: {data.appointmentCount + data.purchaseCount}</p>
                                <p>Total gasto: {formatCurrency(data.totalSpent)}</p>
                                <p>Categoria: {data.rfmScore ? 
                                  `R${data.rfmScore.r}F${data.rfmScore.f}M${data.rfmScore.m}` : 'N/A'}</p>
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
                      />
                      <ReferenceLine y={0} stroke="#000" />
                      <ReferenceLine x={30} stroke="#2563eb" strokeDasharray="3 3" 
                        label={{ value: '30 dias', position: 'insideTopRight' }} />
                      <ReferenceLine x={90} stroke="#f59e0b" strokeDasharray="3 3" 
                        label={{ value: '90 dias', position: 'insideTopRight' }} />
                      <ReferenceLine x={180} stroke="#ef4444" strokeDasharray="3 3" 
                        label={{ value: '180 dias', position: 'insideTopRight' }} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    <li className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#2563eb]"></span>
                      <span>Clientes recentes (30 dias)</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
                      <span>Clientes ativos (90 dias)</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                      <span>Clientes em risco (180 dias)</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <span>Tamanho da bolha = Frequência de visitas</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Produtos Esgotados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {inventoryAlertData.filter(product => product.status === 'esgotado').length}
                  </p>
                  <p className="text-sm text-gray-500">Precisam de reposição urgente</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Estoque Baixo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {inventoryAlertData.filter(product => product.status === 'baixo').length}
                  </p>
                  <p className="text-sm text-gray-500">Abaixo do mínimo</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Tempo Médio Reposição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {inventoryAlertData.length > 0 ? 
                      inventoryAlertData[0].daysToRestock + ' dias' : 
                      'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Para produtos em alerta</p>
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
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Produto</th>
                        <th className="text-center py-3 px-4">Categoria</th>
                        <th className="text-center py-3 px-4">Estoque Atual</th>
                        <th className="text-center py-3 px-4">Estoque Mínimo</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-center py-3 px-4">Valor em Estoque</th>
                        <th className="text-center py-3 px-4">Previsão Reposição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryAlertData.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{product.name}</td>
                          <td className="py-3 px-4 text-center capitalize">{product.category}</td>
                          <td className="py-3 px-4 text-center font-medium">{product.stock}</td>
                          <td className="py-3 px-4 text-center">{product.min_stock}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              product.status === 'esgotado' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {product.status === 'esgotado' ? 'Esgotado' : 'Estoque Baixo'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {formatCurrency(product.stock * product.price)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {product.daysToRestock} dias
                          </td>
                        </tr>
                      ))}
                      {inventoryAlertData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-gray-500">
                            Nenhum produto com estoque crítico
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Horário de Pico</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {peakHoursData.peakHourLabel || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Maior volume de atendimentos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Dia mais Movimentado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {peakHoursData.peakDayLabel || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">Da semana</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Taxa de Conclusão</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {efficiencyData.length > 0 
                      ? `${Math.round(efficiencyData.reduce((acc, emp) => acc + parseFloat(emp.completionRate || 0), 0) / efficiencyData.length)}%` 
                      : '0%'}
                  </p>
                  <p className="text-sm text-gray-500">Agendamentos concluídos</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {efficiencyData.length > 0 && efficiencyData.every(emp => emp.completionRate === 0)
                      ? "Nenhum agendamento foi concluído ainda"
                      : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Distribuição de Atendimentos por Hora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakHoursData.hourData || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="hourLabel" 
                          tickFormatter={(value) => value}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar name="Atendimentos" dataKey="count" fill="#3b82f6" />
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    Eficiência dos Profissionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={efficiencyData}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ width: 100 }}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Receita por Hora') return formatCurrency(value);
                            return value;
                          }}
                        />
                        <Legend />
                        <Bar name="Receita por Hora" dataKey="revenuePerHour" fill="#8b5cf6" />
                        <Bar name="Tempo Ocioso (min)" dataKey="idleTime" fill="#f59e0b" />
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
                        <th className="text-center py-3 px-4">Concluídos</th>
                        <th className="text-center py-3 px-4">Cancelados</th>
                        <th className="text-center py-3 px-4">Agendados</th>
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
                            <td className="py-3 px-4 text-center">{employee.completed_appointments || 0}</td>
                            <td className="py-3 px-4 text-center">{employee.canceled_appointments || 0}</td>
                            <td className="py-3 px-4 text-center">{employee.scheduled_appointments || 0}</td>
                            <td className="py-3 px-4 text-center">{employee.completionRate}%</td>
                            <td className="py-3 px-4 text-center">{employee.avgDuration} min</td>
                            <td className="py-3 px-4 text-center">{formatCurrency(employee.revenue)}</td>
                            <td className="py-3 px-4 text-center">{formatCurrency(employee.revenuePerHour)}</td>
                          </tr>
                          {employee.weeklyStats && employee.weeklyStats.length > 0 && (
                            <tr className="bg-gray-50">
                              <td colSpan={10} className="p-0">
                                <div className="p-4">
                                  <h4 className="text-sm font-medium mb-2">Agendamentos por Semana</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {employee.weeklyStats.map((week, weekIndex) => (
                                      <div key={weekIndex} className="bg-white p-3 rounded border">
                                        <div className="text-xs font-medium mb-1">{week.weekLabel}</div>
                                        <div className="grid grid-cols-4 gap-2 text-xs">
                                          <div>
                                            <div className="font-medium text-center">{week.total}</div>
                                            <div className="text-gray-500 text-center">Total</div>
                                          </div>
                                          <div>
                                            <div className="font-medium text-center text-green-600">{week.completed}</div>
                                            <div className="text-gray-500 text-center">Concluídos</div>
                                          </div>
                                          <div>
                                            <div className="font-medium text-center text-red-600">{week.canceled}</div>
                                            <div className="text-gray-500 text-center">Cancelados</div>
                                          </div>
                                          <div>
                                            <div className="font-medium text-center text-blue-600">{week.scheduled}</div>
                                            <div className="text-gray-500 text-center">Agendados</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {efficiencyData.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-gray-500">
                            Nenhum dado de desempenho disponível
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
