import React, { useState, useEffect } from 'react';
import EmployeeLoginForm from '../components/employee-portal/EmployeeLoginForm';
import EmployeeAppointmentCard from '../components/employee-portal/EmployeeAppointmentCard';
import EmployeeHeader from '../components/employee-portal/EmployeeHeader';
import { Appointment, Employee, Service, Client } from '@/firebase/entities';
import SEOHead from '../components/SEOHead';

export default function EmployeePortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Login handler
  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    try {
      // Simples: busca funcionário pelo e-mail e senha (ajustar conforme autenticação real)
      const employees = await Employee.list();
      const employee = employees.find(emp => emp.email === email && emp.password === password);
      if (!employee) {
        alert('Funcionário não encontrado ou senha incorreta.');
        setLoading(false);
        return;
      }
      setCurrentEmployee(employee);
      setIsLoggedIn(true);
      localStorage.setItem('employeePortalLogin', JSON.stringify({ employee }));
      loadAppointments(employee.id);
    } catch (error) {
      alert('Erro ao fazer login.');
    }
    setLoading(false);
  };

  // Carrega agendamentos do funcionário logado
  const loadAppointments = async (employeeId) => {
    try {
      const [appointmentsData, servicesData, clientsData] = await Promise.all([
        Appointment.list(),
        Service.list(),
        Client.list()
      ]);
      const today = new Date();
      const appointmentsToday = appointmentsData
        .filter(app => app.employee_id === employeeId &&
          new Date(app.date).toDateString() === today.toDateString())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(app => {
          const service = servicesData.find(s => s.id === app.service_id);
          const client = clientsData.find(c => c.id === app.client_id);
          return {
            ...app,
            service_name: service ? service.name : 'Serviço não encontrado',
            client_name: client ? client.name : 'Cliente não encontrado',
          };
        });
      setAppointments(appointmentsToday);
    } catch (error) {
      alert('Erro ao carregar agendamentos.');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentEmployee(null);
    setAppointments([]);
    localStorage.removeItem('employeePortalLogin');
  };

  // Persistência de login
  useEffect(() => {
    const savedLoginData = localStorage.getItem('employeePortalLogin');
    if (savedLoginData) {
      try {
        const loginData = JSON.parse(savedLoginData);
        setCurrentEmployee(loginData.employee);
        setIsLoggedIn(true);
        loadAppointments(loginData.employee.id);
      } catch (error) {
        localStorage.removeItem('employeePortalLogin');
      }
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <SEOHead title="Portal do Funcionário - ClinixPlus" description="Acompanhe seus agendamentos do dia." />
      {isLoggedIn && currentEmployee ? (
        <>
          <EmployeeHeader employee={currentEmployee} onLogout={handleLogout} />
          <main className="w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 space-y-6 flex flex-col items-center">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Agendamentos de Hoje</h2>
            <div className="w-full">
              <EmployeeAppointmentCard appointments={appointments} onAction={() => loadAppointments(currentEmployee.id)} />
            </div>
          </main>
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-blue-900 mb-6 text-center">Portal do Funcionário</h1>
            <EmployeeLoginForm onLogin={handleLogin} loading={loading} />
          </div>
        </div>
      )}
    </div>
  );
}
