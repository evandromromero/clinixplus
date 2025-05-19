// Script para migrar assinaturas de agendamentos concluídos para o histórico de sessões de pacotes
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebase/config';
import { Appointment, ClientPackage, Service, Package, Employee } from '../firebase/entities';
import { db } from '../firebase/config';

// Inicializa o Firebase se necessário
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.log('Firebase já inicializado ou erro na inicialização:', error.message);
}

/**
 * Função para verificar se um serviço está incluído em um pacote
 */
function isServiceInPackage(serviceId, pkg) {
  // Verificar em diferentes formatos de dados de pacotes
  
  // 1. Verificar em services direto
  if (pkg.services && Array.isArray(pkg.services)) {
    const found = pkg.services.some(s => {
      if (typeof s === 'object') {
        return (s.service_id || s.id) === serviceId;
      }
      return s === serviceId;
    });
    if (found) return true;
  }
  
  // 2. Verificar em package_snapshot.services
  if (pkg.package_snapshot && pkg.package_snapshot.services && Array.isArray(pkg.package_snapshot.services)) {
    const found = pkg.package_snapshot.services.some(s => {
      if (typeof s === 'object') {
        return (s.service_id || s.id) === serviceId;
      }
      return s === serviceId;
    });
    if (found) return true;
  }
  
  // 3. Verificar em services_included
  if (pkg.services_included && Array.isArray(pkg.services_included)) {
    const found = pkg.services_included.some(s => {
      if (typeof s === 'object') {
        return (s.service_id || s.id) === serviceId;
      }
      return s === serviceId;
    });
    if (found) return true;
  }
  
  return false;
}

/**
 * Função principal para migrar assinaturas
 */
async function migrateSignatures() {
  console.log('Iniciando migração de assinaturas...');
  
  try {
    // 0. Carregar dados necessários
    console.log('Carregando serviços, pacotes e funcionários...');
    const services = await Service.list();
    const packages = await Package.list();
    const employees = await Employee.list();
    
    // 1. Buscar todos os agendamentos concluídos que têm assinatura
    console.log('Buscando agendamentos concluídos com assinatura...');
    const appointments = await Appointment.list();
    const completedAppointmentsWithSignature = appointments.filter(
      app => app.status === 'concluido' && app.signature
    );
    
    console.log(`Encontrados ${completedAppointmentsWithSignature.length} agendamentos concluídos com assinatura.`);
    
    if (completedAppointmentsWithSignature.length === 0) {
      console.log('Nenhum agendamento com assinatura encontrado. Migração concluída.');
      return;
    }
    
    // 2. Buscar todos os pacotes (ativos e inativos)
    console.log('Buscando todos os pacotes...');
    const clientPackages = await ClientPackage.list();
    
    console.log(`Encontrados ${clientPackages.length} pacotes no total.`);
    
    // 3. Para cada agendamento concluído com assinatura
    let updatedPackagesCount = 0;
    let updatedSessionsCount = 0;
    let notFoundCount = 0;
    
    for (const appointment of completedAppointmentsWithSignature) {
      console.log(`\nProcessando agendamento ${appointment.id}...`);
      console.log(`Cliente: ${appointment.client_id}, Serviço: ${appointment.service_id}`);
      
      if (!appointment.service_id) {
        console.log(`Agendamento ${appointment.id} não tem serviço associado. Pulando...`);
        continue;
      }
      
      // Encontrar o nome do serviço
      const serviceData = services.find(s => s.id === appointment.service_id);
      const serviceName = serviceData ? serviceData.name : "Serviço não encontrado";
      
      // Encontrar o nome do funcionário
      let employeeName = "Profissional não encontrado";
      if (appointment.employee_id) {
        const employeeData = employees.find(e => e.id === appointment.employee_id);
        if (employeeData) {
          employeeName = employeeData.name;
        }
      }
      
      // Encontrar pacotes relevantes para este agendamento
      const relevantPackages = clientPackages.filter(pkg => {
        // Verificar se é do mesmo cliente
        if (pkg.client_id !== appointment.client_id) return false;
        
        // Verificar se o serviço está incluído no pacote
        return isServiceInPackage(appointment.service_id, pkg);
      });
      
      console.log(`Encontrados ${relevantPackages.length} pacotes relevantes para este agendamento.`);
      
      let foundMatch = false;
      
      for (const pkg of relevantPackages) {
        // Verificar se o pacote tem histórico de sessões
        if (!pkg.session_history) {
          pkg.session_history = [];
        }
        
        if (!Array.isArray(pkg.session_history)) {
          pkg.session_history = [];
        }
        
        // Verificar se existe uma sessão para este agendamento
        const sessionIndex = pkg.session_history.findIndex(
          session => session.appointment_id === appointment.id
        );
        
        if (sessionIndex >= 0) {
          // Sessão encontrada, atualizar com a assinatura
          foundMatch = true;
          const updatedSessionHistory = [...pkg.session_history];
          
          // Verificar se a sessão já tem assinatura
          if (!updatedSessionHistory[sessionIndex].signature) {
            console.log(`Adicionando assinatura à sessão do agendamento ${appointment.id} no pacote ${pkg.id}`);
            
            updatedSessionHistory[sessionIndex] = {
              ...updatedSessionHistory[sessionIndex],
              signature: appointment.signature
            };
            
            // Atualizar o pacote
            await ClientPackage.update(pkg.id, {
              session_history: updatedSessionHistory
            });
            
            updatedSessionsCount++;
            updatedPackagesCount++;
            console.log(`Pacote ${pkg.id} atualizado com sucesso.`);
          } else {
            console.log(`A sessão já possui assinatura. Pulando...`);
          }
        } else {
          // Não encontrou sessão para este agendamento, criar uma nova
          console.log(`Criando nova sessão para o agendamento ${appointment.id} no pacote ${pkg.id}`);
          
          const sessionHistoryEntry = {
            service_id: appointment.service_id,
            service_name: serviceName,
            employee_id: appointment.employee_id,
            employee_name: employeeName,
            date: appointment.date,
            appointment_id: appointment.id,
            status: 'concluido',
            notes: appointment.notes || "",
            signature: appointment.signature
          };
          
          const updatedSessionHistory = [...pkg.session_history, sessionHistoryEntry];
          
          // Atualizar o pacote
          await ClientPackage.update(pkg.id, {
            session_history: updatedSessionHistory,
            sessions_used: (pkg.sessions_used || 0) + 1
          });
          
          updatedSessionsCount++;
          updatedPackagesCount++;
          foundMatch = true;
          console.log(`Nova sessão adicionada ao pacote ${pkg.id}.`);
        }
      }
      
      if (!foundMatch) {
        console.log(`Não foi possível encontrar um pacote correspondente para o agendamento ${appointment.id}.`);
        notFoundCount++;
      }
    }
    
    console.log(`\n=== RESUMO DA MIGRAÇÃO ===`);
    console.log(`Total de agendamentos processados: ${completedAppointmentsWithSignature.length}`);
    console.log(`Sessões atualizadas: ${updatedSessionsCount}`);
    console.log(`Pacotes atualizados: ${updatedPackagesCount}`);
    console.log(`Agendamentos sem pacote correspondente: ${notFoundCount}`);
    console.log(`Migração concluída!`);
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

// Executar a migração
migrateSignatures().then(() => {
  console.log('Script de migração finalizado.');
  process.exit(0);
}).catch(error => {
  console.error('Erro fatal durante a migração:', error);
  process.exit(1);
});
