import { extractClientsFromSQL } from '../utils/importClients.js';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebase/config.js';

// Inicializa o Firebase
initializeApp(firebaseConfig);

console.log('Iniciando importação de clientes...');
extractClientsFromSQL()
    .then(() => {
        console.log('Processo de importação finalizado.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Erro durante a importação:', error);
        process.exit(1);
    });
