// Script simplificado para migrar assinaturas de agendamentos para pacotes
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Função principal para migrar assinaturas
async function migrateSignatures() {
  console.log('Iniciando migração de assinaturas...');
  
  try {
    // 1. Buscar todos os agendamentos concluídos que têm assinatura
    console.log('Buscando agendamentos concluídos com assinatura...');
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsSnapshot = await getDocs(appointmentsRef);
    
    const completedAppointmentsWithSignature = [];
    appointmentsSnapshot.forEach(doc => {
      const appointment = { id: doc.id, ...doc.data() };
      if (appointment.status === 'concluido' && appointment.signature) {
        completedAppointmentsWithSignature.push(appointment);
      }
    });
    
    console.log(`Encontrados ${completedAppointmentsWithSignature.length} agendamentos concluídos com assinatura.`);
    
    if (completedAppointmentsWithSignature.length === 0) {
      console.log('Nenhum agendamento com assinatura encontrado. Migração concluída.');
      return;
    }
    
    // 2. Buscar todos os pacotes
    console.log('Buscando todos os pacotes...');
    const clientPackagesRef = collection(db, 'client_packages');
    const clientPackagesSnapshot = await getDocs(clientPackagesRef);
    
    const clientPackages = [];
    clientPackagesSnapshot.forEach(doc => {
      clientPackages.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Encontrados ${clientPackages.length} pacotes no total.`);
    
    // 3. Para cada agendamento concluído com assinatura
    let updatedPackagesCount = 0;
    let updatedSessionsCount = 0;
    let notFoundCount = 0;
    
    for (const appointment of completedAppointmentsWithSignature) {
      console.log(`\nProcessando agendamento ${appointment.id}...`);
      
      if (!appointment.service_id) {
        console.log(`Agendamento ${appointment.id} não tem serviço associado. Pulando...`);
        continue;
      }
      
      // Encontrar pacotes relevantes para este agendamento
      const relevantPackages = clientPackages.filter(pkg => 
        pkg.client_id === appointment.client_id
      );
      
      console.log(`Encontrados ${relevantPackages.length} pacotes para o cliente.`);
      
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
            const packageDocRef = doc(db, 'client_packages', pkg.id);
            await updateDoc(packageDocRef, {
              session_history: updatedSessionHistory
            });
            
            updatedSessionsCount++;
            updatedPackagesCount++;
            console.log(`Pacote ${pkg.id} atualizado com sucesso.`);
          } else {
            console.log(`A sessão já possui assinatura. Pulando...`);
          }
        }
      }
      
      if (!foundMatch) {
        console.log(`Não foi possível encontrar uma sessão correspondente para o agendamento ${appointment.id}.`);
        notFoundCount++;
      }
    }
    
    console.log(`\n=== RESUMO DA MIGRAÇÃO ===`);
    console.log(`Total de agendamentos processados: ${completedAppointmentsWithSignature.length}`);
    console.log(`Sessões atualizadas: ${updatedSessionsCount}`);
    console.log(`Pacotes atualizados: ${updatedPackagesCount}`);
    console.log(`Agendamentos sem sessão correspondente: ${notFoundCount}`);
    console.log(`Migração concluída!`);
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

// Executar a migração
migrateSignatures().then(() => {
  console.log('Script de migração finalizado.');
}).catch(error => {
  console.error('Erro fatal durante a migração:', error);
});

export default migrateSignatures;
