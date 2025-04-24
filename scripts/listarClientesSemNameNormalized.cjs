// Script para listar todos os clientes sem o campo name_normalized
// Execute este script em ambiente Node.js com acesso ao Firebase

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { firebaseConfig } = require('../src/firebase/config');

async function listarClientesSemNameNormalized() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const clientesRef = collection(db, 'clients');
  const snapshot = await getDocs(clientesRef);

  const clientesSemCampo = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.name_normalized) {
      clientesSemCampo.push({ id: doc.id, ...data });
    }
  });

  if (clientesSemCampo.length === 0) {
    console.log('Todos os clientes possuem o campo name_normalized.');
  } else {
    console.log('Clientes sem name_normalized:');
    clientesSemCampo.forEach(cliente => {
      console.log(`ID: ${cliente.id}, Nome: ${cliente.name}`);
    });
  }
}

listarClientesSemNameNormalized().catch(console.error);
