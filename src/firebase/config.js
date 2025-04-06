// Configuração do Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuração do projeto Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyD8EBMO2hTzBuP5oSN6dflTPJ8oNA6XaNk",
  authDomain: "alpha-ponto.firebaseapp.com",
  projectId: "alpha-ponto",
  storageBucket: "alpha-ponto.firebasestorage.app",
  messagingSenderId: "82554855477",
  appId: "1:82554855477:web:8de1378711bc73dfd2517c"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
export const db = getFirestore(app);

// Exporta a instância do app Firebase
export default app;
