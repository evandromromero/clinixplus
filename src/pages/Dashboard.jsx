import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  Plus,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  AlertTriangle,
  Cake,
  Award,
  CalendarDays,
  BarChart2,
  Mail,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, subDays, startOfMonth, endOfMonth, addDays, isToday, setHours, setMinutes, isSameDay, isSameMonth, getDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Client, Appointment, Sale, FinancialTransaction } from "@/firebase/entities";
import { Product, Service, Employee } from "@/api/entities";
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
  Area
} from "recharts";
import RateLimitHandler from "../components/RateLimitHandler";

const COLORS = ['#0D0F36', '#294380', '#69D2CD', '#B9F1D6', '#F1F6CE'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    appointments: 0,
    sales: 0,
    revenue: 0,
    expenses: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [financialData, setFinancialData] = useState({
    revenueByCategory: [],
    expensesByCategory: [],
    revenueVsExpenses: []
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [occupationData, setOccupationData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [birthdayClients, setBirthdayClients] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [revenueForecast, setRevenueForecast] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setLoadingError(null);

      const fetchWithDelay = async (entityFn, delay = 1000, retries = 3) => {
        let lastError;
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
            }
            
            const result = await entityFn();
            return result;
          } catch (error) {
            console.log(`Tentativa ${attempt + 1} falhou:`, error);
            lastError = error;
            
            if (error.message && (error.message.includes("Rate limit") || error.toString().includes("429"))) {
              await new Promise(resolve => setTimeout(resolve, 3000 * Math.pow(2, attempt)));
            }
          }
        }
        throw lastError; 
      };

      const [clients, appointments, sales, transactions, products, services, employees] = await Promise.all([
        fetchWithDelay(() => Client.list()),
        fetchWithDelay(() => Appointment.list()),
        fetchWithDelay(() => Sale.list()),
        fetchWithDelay(() => FinancialTransaction.list()),
        fetchWithDelay(() => Product.list()),
        fetchWithDelay(() => Service.list()),
        fetchWithDelay(() => Employee.list())
      ]);

      const revenue = transactions
        .filter(t => t.type === 'receita' && t.status === 'pago')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
      const expenses = transactions
        .filter(t => t.type === 'despesa' && t.status === 'pago')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      setStats({
        clients: clients.length,
        appointments: appointments.length,
        sales: sales.length,
        revenue,
        expenses
      });

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayAppts = appointments.filter(app => 
        app.date.startsWith(todayStr) && 
        app.status !== 'cancelado'
      );
      setTodayAppointments(todayAppts);

      const recentSales = sales
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setRecentSales(recentSales);

      processFinancialData(transactions);
      processCalendarEvents(appointments, clients, employees);
      processOccupationData(appointments, employees);
      processAlerts(products, transactions, appointments);
      processBirthdayClients(clients);
      processTopServices(sales, services);
      processRevenueForecast(appointments, sales, transactions);
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoadingError(error);
      
      if (error.message && (error.message.includes("Rate limit") || error.toString().includes("429"))) {
        setAlerts(prev => [
          ...prev,
          {
            type: 'sistema',
            priority: 'alta',
            message: 'Limite de requisições excedido. Por favor, aguarde alguns instantes e recarregue a página.',
            id: 'rate-limit-error'
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const processFinancialData = (transactions) => {
    const revenueByCategory = {};
    transactions
      .filter(t => t.type === 'receita' && t.status === 'pago')
      .forEach(t => {
        const formattedCategory = formatCategory(t.category);
        revenueByCategory[formattedCategory] = (revenueByCategory[formattedCategory] || 0) + t.amount;
      });

    const expensesByCategory = {};
    transactions
      .filter(t => t.type === 'despesa' && t.status === 'pago')
      .forEach(t => {
        const formattedCategory = formatCategory(t.category);
        expensesByCategory[formattedCategory] = (expensesByCategory[formattedCategory] || 0) + t.amount;
      });

    const revenueVsExpenses = [];
    const last6Months = Array.from({length: 6}, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return format(date, 'yyyy-MM');
    }).reverse();

    last6Months.forEach(monthYear => {
      const [year, month] = monthYear.split('-');
      const monthRevenue = transactions
        .filter(t => t.type === 'receita' && t.status === 'pago' && t.payment_date && t.payment_date.startsWith(monthYear))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthExpenses = transactions
        .filter(t => t.type === 'despesa' && t.status === 'pago' && t.payment_date && t.payment_date.startsWith(monthYear))
        .reduce((sum, t) => sum + t.amount, 0);

      revenueVsExpenses.push({
        month: format(new Date(parseInt(year), parseInt(month) - 1), 'MMM', { locale: ptBR }),
        receita: monthRevenue,
        despesa: monthExpenses,
        lucro: monthRevenue - monthExpenses
      });
    });

    setFinancialData({
      revenueByCategory: Object.entries(revenueByCategory).map(([name, value]) => ({ name, value })),
      expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })),
      revenueVsExpenses
    });
  };

  const processCalendarEvents = (appointments, clients, employees) => {
    const nextDays = Array.from({length: 7}, (_, i) => addDays(new Date(), i));
    
    const events = [];
    nextDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAppts = appointments.filter(app => 
        app.date.startsWith(dayStr) && app.status !== 'cancelado'
      );
      
      if (dayAppts.length > 0) {
        dayAppts.forEach(appt => {
          const client = clients.find(c => c.id === appt.client_id);
          const employee = employees.find(e => e.id === appt.employee_id);
          
          events.push({
            id: appt.id,
            title: appt.service_id,
            client: client?.name || 'Cliente não encontrado',
            employee: employee?.name || 'Profissional não encontrado',
            start: new Date(appt.date),
            status: appt.status
          });
        });
      }
    });
    
    setCalendarEvents(events);
  };
  
  const processOccupationData = (appointments, employees) => {
    const occupationByEmployee = {};
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    employees.forEach(emp => {
      occupationByEmployee[emp.id] = {
        name: emp.name,
        total: 0,
        byWeekday: Array(7).fill(0),
        appointments: 0
      };
    });
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    appointments.forEach(app => {
      if (app.status !== 'cancelado' && new Date(app.date) >= thirtyDaysAgo) {
        const employeeId = app.employee_id;
        const weekday = getDay(new Date(app.date));
        
        if (occupationByEmployee[employeeId]) {
          occupationByEmployee[employeeId].total += 1;
          occupationByEmployee[employeeId].byWeekday[weekday] += 1;
          occupationByEmployee[employeeId].appointments += 1;
        }
      }
    });
    
    const occupationData = [];
    
    weekdays.forEach((day, index) => {
      const dayData = { name: day };
      
      Object.values(occupationByEmployee).forEach(emp => {
        dayData[emp.name] = emp.byWeekday[index];
      });
      
      occupationData.push(dayData);
    });
    
    setOccupationData(occupationData);
  };
  
  const processAlerts = (products, transactions, appointments) => {
    const alerts = [];
    
    products.forEach(product => {
      if (product.stock <= product.min_stock) {
        alerts.push({
          type: 'estoque',
          priority: product.stock === 0 ? 'alta' : 'média',
          message: `Estoque baixo: ${product.name} (${product.stock} unidades)`,
          id: product.id
        });
      }
    });
    
    const nextWeek = addDays(new Date(), 7);
    transactions
      .filter(t => t.type === 'despesa' && t.status === 'pendente')
      .forEach(t => {
        if (t.due_date && isWithinInterval(new Date(t.due_date), {
          start: new Date(),
          end: nextWeek
        })) {
          alerts.push({
            type: 'financeiro',
            priority: 'alta',
            message: `Conta a pagar: ${t.description} - R$ ${t.amount.toFixed(2)} - Vence em ${format(new Date(t.due_date), 'dd/MM/yyyy')}`,
            id: t.id
          });
        }
      });
    
    const today = new Date();
    const appointmentsByEmployee = {};
    
    appointments
      .filter(a => a.status !== 'cancelado' && isWithinInterval(new Date(a.date), {
        start: today,
        end: addDays(today, 1)
      }))
      .forEach(a => {
        if (!appointmentsByEmployee[a.employee_id]) {
          appointmentsByEmployee[a.employee_id] = [];
        }
        appointmentsByEmployee[a.employee_id].push(a);
      });
    
    Object.values(appointmentsByEmployee).forEach(empAppts => {
      if (empAppts.length > 1) {
        empAppts.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (let i = 0; i < empAppts.length - 1; i++) {
          const current = new Date(empAppts[i].date);
          const next = new Date(empAppts[i+1].date);
          
          const diffInMinutes = (next - current) / (1000 * 60);
          
          if (diffInMinutes < 15) {
            alerts.push({
              type: 'agendamento',
              priority: 'alta',
              message: `Possível conflito de agendamento para o profissional às ${format(current, 'HH:mm')}`,
              id: empAppts[i].id
            });
          }
        }
      }
    });
    
    setAlerts(alerts);
  };
  
  const processBirthdayClients = (clients) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    
    const birthdays = clients
      .filter(client => {
        if (!client.birthdate) return false;
        const birthMonth = parseInt(client.birthdate.split('-')[1]);
        return birthMonth === currentMonth;
      })
      .map(client => {
        const birthDay = parseInt(client.birthdate.split('-')[2]);
        const birthMonth = parseInt(client.birthdate.split('-')[1]);
        const currentDay = today.getDate();
        
        let status = 'próximo';
        if (birthMonth === (today.getMonth() + 1) && birthDay === currentDay) {
          status = 'hoje';
        } else if (birthMonth === (today.getMonth() + 1) && birthDay < currentDay) {
          status = 'passado';
        }
        
        return {
          ...client,
          birthDay,
          birthMonth,
          status
        };
      })
      .sort((a, b) => {
        if (a.status === 'hoje') return -1;
        if (b.status === 'hoje') return 1;
        return a.birthDay - b.birthDay;
      });
    
    setBirthdayClients(birthdays.slice(0, 5));
  };
  
  const processTopServices = (sales, services) => {
    const serviceCount = {};
    const serviceRevenue = {};
    
    sales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (item.item_id) {
            serviceCount[item.item_id] = (serviceCount[item.item_id] || 0) + (item.quantity || 1);
            serviceRevenue[item.item_id] = (serviceRevenue[item.item_id] || 0) + 
              ((item.price || 0) * (item.quantity || 1) * (1 - (item.discount || 0) / 100));
          }
        });
      }
    });
    
    const topServicesList = Object.entries(serviceCount)
      .map(([id, count]) => {
        const service = services.find(s => s.id === id);
        return {
          id,
          name: service ? service.name : `Serviço #${id}`,
          count,
          revenue: serviceRevenue[id] || 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setTopServices(topServicesList);
  };
  
  const processRevenueForecast = (appointments, sales, transactions) => {
    const today = new Date();
    const nextThreeMonths = [];
    
    for (let i = 0; i < 3; i++) {
      const month = new Date();
      month.setMonth(today.getMonth() + i);
      
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const confirmedRevenue = transactions
        .filter(t => 
          t.type === 'receita' && 
          t.due_date && 
          isWithinInterval(new Date(t.due_date), { start: monthStart, end: monthEnd })
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      const projectedRevenue = appointments
        .filter(a => 
          a.status !== 'cancelado' &&
          a.date &&
          isWithinInterval(new Date(a.date), { start: monthStart, end: monthEnd })
        )
        .reduce((sum, a) => {
          const serviceId = a.service_id;
          const similarSales = sales
            .filter(s => 
              s.items && 
              Array.isArray(s.items) && 
              s.items.some(item => item.item_id === serviceId)
            );
          
          let averageValue = 0;
          if (similarSales.length > 0) {
            averageValue = similarSales.reduce((sum, s) => {
              const item = s.items.find(i => i.item_id === serviceId);
              return sum + (item ? (item.price || 0) * (1 - (item.discount || 0) / 100) : 0);
            }, 0) / similarSales.length;
          }
          
          return sum + averageValue;
        }, 0);
      
      nextThreeMonths.push({
        month: format(month, 'MMM/yyyy', { locale: ptBR }),
        confirmado: confirmedRevenue,
        projetado: projectedRevenue,
        total: confirmedRevenue + projectedRevenue
      });
    }
    
    setRevenueForecast(nextThreeMonths);
  };

  const formatCategory = (category) => {
    return category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const getDayClass = (date) => {
    if (!isSameMonth(date, currentMonth)) {
      return "text-gray-400 bg-gray-50";
    }
    if (isToday(date)) {
      return "bg-[#294380] text-white";
    }
    
    const hasEvents = calendarEvents.some(event => 
      isSameDay(parseISO(event.start.toISOString()), date)
    );
    
    if (hasEvents) {
      return "bg-[#69D2CD]/20 font-medium";
    }
    
    return "";
  };
  
  const renderCalendarHeader = () => {
    const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    
    return (
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
    );
  };
  
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = setHours(setMinutes(monthStart, 0), 0);
    const endDate = setHours(setMinutes(monthEnd, 0), 0);
    
    const startDay = startDate.getDay();
    
    const prevMonthDays = [];
    for (let i = 0; i < startDay; i++) {
      prevMonthDays.unshift(subDays(startDate, i + 1));
    }
    
    const currentMonthDays = [];
    let day = startDate;
    while (day <= endDate) {
      currentMonthDays.push(day);
      day = addDays(day, 1);
    }
    
    const nextMonthDays = [];
    const remainingDays = 7 - (prevMonthDays.length + currentMonthDays.length) % 7;
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        nextMonthDays.push(addDays(endDate, i + 1));
      }
    }
    
    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    
    return (
      <div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
            {week.map((day, dayIndex) => {
              const dayClass = getDayClass(day);
              const hasAppointment = calendarEvents.filter(event => 
                isSameDay(parseISO(event.start.toISOString()), day)
              ).length;
              
              return (
                <button
                  key={dayIndex}
                  className={`text-center text-xs rounded-full w-7 h-7 flex items-center justify-center relative ${dayClass}`}
                  onClick={() => setSelectedDate(day)}
                >
                  {format(day, 'd')}
                  {hasAppointment > 0 && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#294380] rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };
  
  const renderDayEvents = () => {
    const dayEvents = calendarEvents.filter(event => 
      isSameDay(parseISO(event.start.toISOString()), selectedDate)
    ).sort((a, b) => new Date(a.start) - new Date(b.start));
    
    if (dayEvents.length === 0) {
      return (
        <div className="text-center py-2 text-sm text-gray-500">
          Nenhum agendamento para {format(selectedDate, 'dd/MM/yyyy')}
        </div>
      );
    }
    
    return (
      <div className="space-y-2 mt-2 overflow-y-auto max-h-40">
        {dayEvents.map((event, i) => (
          <div 
            key={i} 
            className="p-2 bg-gray-50 rounded-md text-xs border-l-2 border-[#294380]"
          >
            <div className="font-medium">{format(new Date(event.start), 'HH:mm')} - {event.title}</div>
            <div className="text-gray-500">{event.client}</div>
            <div className="text-[#294380] text-xs">{event.employee}</div>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-[#294380] mb-4" />
        <p className="text-lg text-gray-600">Carregando dados do dashboard...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <RateLimitHandler 
        error={loadingError} 
        onRetry={loadDashboardData} 
        allowReload={true}
        className="max-w-4xl mx-auto mt-8"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-[#0D0F36]">Dashboard</h2>
        <div className="flex gap-3">
          <Link to={createPageUrl("Appointments")}>
            <Button className="bg-[#294380] hover:bg-[#0D0F36] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </Link>
          <Link to={createPageUrl("SalesRegister")}>
            <Button variant="outline" className="text-[#294380] border-[#294380]">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-[#0D0F36] to-[#294380]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.clients}</div>
            <p className="text-xs text-[#F1F6CE]">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#294380] to-[#69D2CD]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.appointments}</div>
            <p className="text-xs text-white">
              {todayAppointments.length} agendamentos hoje
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#69D2CD] to-[#B9F1D6]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Total Vendas</CardTitle>
            <Package className="h-4 w-4 text-[#0D0F36]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">{stats.sales}</div>
            <p className="text-xs text-[#294380]">
              5 vendas nas últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#B9F1D6] to-[#F1F6CE]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">R$ {stats.revenue.toFixed(2)}</div>
            <p className="text-xs text-green-600 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              8% este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#0D0F36]">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D0F36]">R$ {stats.expenses.toFixed(2)}</div>
            <p className="text-xs text-red-600 flex items-center">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              3% este mês
            </p>
          </CardContent>
        </Card>
      </div>
      
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className={`p-3 rounded-md ${
                  alert.priority === 'alta' ? 'bg-red-100 border-l-4 border-red-500' : 'bg-amber-100 border-l-4 border-amber-500'
                }`}>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
              {alerts.length > 3 && (
                <Button variant="link" className="text-red-700 p-0">
                  Ver todos os {alerts.length} alertas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {alerts.some(a => a.id === 'rate-limit-error') && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-red-700 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Erro de Limite de Requisições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 rounded-md bg-red-100 border-l-4 border-red-500">
                <p className="text-sm">O sistema atingiu o limite de requisições. Por favor, aguarde alguns instantes e recarregue a página.</p>
              </div>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Recarregar Página
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-[#69D2CD] md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36] flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-[#294380]" />
              Calendário Rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h3>
                <div className="flex space-x-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    <span className="sr-only">Mês anterior</span>
                    &lt;
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    <span className="sr-only">Próximo mês</span>
                    &gt;
                  </Button>
                </div>
              </div>
              
              {renderCalendarHeader()}
              {renderCalendarDays()}
              {renderDayEvents()}
            </div>
            
            <Link to={createPageUrl("Appointments")}>
              <Button variant="outline" className="w-full mt-2 text-[#294380] border-[#294380]">
                Ver agenda completa
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="border-[#69D2CD] md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36] flex items-center">
              <Cake className="w-5 h-5 mr-2 text-[#294380]" />
              Aniversariantes do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {birthdayClients.length > 0 ? (
                birthdayClients.map((client, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-md flex items-center gap-3 ${
                      client.status === 'hoje' ? 'bg-[#F1F6CE]' : 'bg-gray-50'
                    }`}
                  >
                    <div className="bg-[#294380] text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(client.birthdate), 'dd/MM')}
                        {client.status === 'hoje' && (
                          <span className="ml-2 text-green-600 font-bold">Hoje!</span>
                        )}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-[#294380]"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nenhum aniversariante este mês
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[#69D2CD] md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36] flex items-center">
              <Award className="w-5 h-5 mr-2 text-[#294380]" />
              Serviços Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topServices.length > 0 ? (
                <>
                  {topServices.map((service, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      } font-bold text-sm`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{service.count} {service.count === 1 ? 'venda' : 'vendas'}</span>
                          <span>R$ {service.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="w-full h-[120px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topServices}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Quantidade' : '']} />
                        <Bar dataKey="count" name="Quantidade" fill="#294380" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nenhuma venda registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36] flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-[#294380]" />
              Receitas vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData.revenueVsExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#294380" />
                  <Bar dataKey="despesa" name="Despesa" fill="#69D2CD" />
                  <Bar dataKey="lucro" name="Lucro" fill="#B9F1D6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36] flex items-center">
              <BarChart2 className="w-5 h-5 mr-2 text-[#294380]" />
              Ocupação por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(occupationData[0] || {}).filter(k => k !== 'name').map((employee, index) => (
                    <Bar 
                      key={employee} 
                      dataKey={employee} 
                      stackId="a" 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#0D0F36] flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-[#294380]" />
            Previsão de Receitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="confirmado" 
                  name="Receita Confirmada" 
                  stackId="1" 
                  fill="#294380" 
                  stroke="#294380" 
                />
                <Area 
                  type="monotone" 
                  dataKey="projetado" 
                  name="Receita Projetada" 
                  stackId="1" 
                  fill="#69D2CD" 
                  stroke="#69D2CD" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            {revenueForecast.map((month, i) => (
              <Card key={i} className="bg-gray-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-center">{month.month}</h4>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Confirmado:</span>
                      <span className="font-medium">R$ {month.confirmado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Projetado:</span>
                      <span className="font-medium">R$ {month.projetado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1 border-t">
                      <span>Total:</span>
                      <span className="text-[#294380]">R$ {month.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[#69D2CD] border-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36]">
              Agendamentos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((appointment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-[#B9F1D6]/20 to[#F1F6CE]/20 rounded-lg border border-[#69D2CD]/30"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#294380]" />
                      <div>
                        <p className="font-medium text-[#0D0F36]">
                          {format(new Date(appointment.date), 'HH:mm')}
                        </p>
                        <p className="text-sm text-[#294380]">
                          {appointment.service_id}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-[#69D2CD] text-[#294380] hover:bg-[#69D2CD] hover:text-white"
                    >
                      Ver detalhes
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#294380] py-4">
                  Nenhum agendamento para hoje
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#69D2CD] border-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#0D0F36]">
              Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-[#B9F1D6]/20 to-[#F1F6CE]/20 rounded-lg border border-[#69D2CD]/30"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-[#294380]" />
                    <div>
                      <p className="font-medium text-[#0D0F36]">
                        R$ {sale.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-[#294380]">
                        {format(new Date(sale.date), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#294380]">
                      {sale.type}
                    </span>
                    {sale.status === 'pago' ? (
                      <span className="flex items-center text-[#69D2CD]">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="flex items-center text-red-500">
                        <ArrowDownRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
