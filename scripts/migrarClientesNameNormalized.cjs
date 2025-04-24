// Script para migrar e preencher o campo name_normalized de todos os clientes que estão sem esse campo
// Execute este script em ambiente Node.js com acesso ao Firebase

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const { firebaseConfig } = require('../src/firebase/config');

// Função para normalizar o nome (igual ao normalizeString do projeto)
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function migrarClientesNameNormalized() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const clientesRef = collection(db, 'clients');
  const snapshot = await getDocs(clientesRef);

  let totalAtualizados = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data.name_normalized && data.name) {
      const name_normalized = normalizeString(data.name);
      await updateDoc(doc(db, 'clients', docSnap.id), { name_normalized });
      console.log(`Atualizado: ID ${docSnap.id} | Nome: ${data.name} | name_normalized: ${name_normalized}`);
      totalAtualizados++;
    }
  }

  if (totalAtualizados === 0) {
    console.log('Nenhum cliente precisava ser atualizado.');
  } else {
    console.log(`Total de clientes atualizados: ${totalAtualizados}`);
  }
}

migrarClientesNameNormalized().catch(console.error);
