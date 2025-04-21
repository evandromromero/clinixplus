// src/scripts/migrate-clients-add-normalized-name.js
import { db } from '../firebase/config.js'; // Ajuste o caminho se necessário
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

// Função de normalização (igual à usada na busca)
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function migrateClients() {
  console.log('Iniciando migração para adicionar name_normalized aos clientes...');
  const clientsRef = collection(db, 'clients');
  let updatedCount = 0;
  let errorCount = 0;
  const batchSize = 400; // Processar em lotes para evitar sobrecarga (máx 500 por batch)
  let batch = writeBatch(db);
  let batchCount = 0;

  try {
    const querySnapshot = await getDocs(clientsRef);
    const totalClients = querySnapshot.size;
    console.log(`Total de clientes encontrados: ${totalClients}`);

    querySnapshot.forEach((documentSnapshot) => {
      const clientData = documentSnapshot.data();
      const clientId = documentSnapshot.id;

      if (clientData && clientData.name) {
        const currentNormalized = clientData.name_normalized;
        const calculatedNormalized = normalizeString(clientData.name);

        // Atualiza apenas se não existir ou for diferente (para idempotência)
        if (currentNormalized !== calculatedNormalized) {
          const clientDocRef = doc(db, 'clients', clientId);
          batch.update(clientDocRef, { name_normalized: calculatedNormalized });
          batchCount++;
          updatedCount++;
          console.log(`Agendando atualização para cliente ${clientId}: ${clientData.name} -> ${calculatedNormalized}`);

          // Commit do lote quando atingir o tamanho máximo
          if (batchCount === batchSize) {
            console.log(`Commitando lote de ${batchCount} atualizações...`);
            batch.commit().then(() => {
              console.log(`Lote ${Math.ceil(updatedCount / batchSize)} commitado com sucesso.`);
            }).catch(err => {
              console.error(`Erro ao commitar lote: `, err);
              errorCount += batchCount; // Assume que todo o lote falhou
            });
            // Cria um novo lote
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      } else {
        console.warn(`Cliente ${clientId} sem nome ou dados inválidos.`);
      }
    });

    // Commit do último lote (se houver operações restantes)
    if (batchCount > 0) {
      console.log(`Commitando último lote de ${batchCount} atualizações...`);
      await batch.commit();
      console.log(`Último lote commitado com sucesso.`);
    }

    console.log('-----------------------------------------');
    console.log(`Migração concluída.`);
    console.log(`Clientes atualizados: ${updatedCount}`);
    console.log(`Erros encontrados (aproximado): ${errorCount}`);
    console.log('-----------------------------------------');

  } catch (error) {
    console.error('Erro GERAL durante a migração:', error);
    console.log('-----------------------------------------');
    console.log(`ATENÇÃO: A migração pode ter sido interrompida.`);
    console.log(`Clientes processados antes do erro (aproximado): ${updatedCount}`);
    console.log('-----------------------------------------');
  }
}

// Executa a função de migração
migrateClients();
