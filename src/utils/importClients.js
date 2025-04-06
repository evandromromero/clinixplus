import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../firebase/config.js';
import { collection, doc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para normalizar números de telefone (remove tudo exceto números)
const normalizePhone = (phone) => {
    if (!phone || phone === 'NULL') return '';
    return phone.replace(/\D/g, '');
};

const extractClientsFromSQL = async () => {
    try {
        // Lê o arquivo SQL
        const sqlFile = fs.readFileSync(path.join(__dirname, '../magnific.sql'), 'utf8');
        
        // Divide o arquivo em linhas e pega apenas as linhas dos clientes (6371 a 12432)
        const allLines = sqlFile.split('\n');
        const clientLines = allLines.slice(6370, 12432) // Arrays são 0-based
            .filter(line => line.trim().startsWith('('))
            .map(line => line.trim());

        console.log(`Encontrados ${clientLines.length} clientes para importar`);

        // Processa cada cliente
        for (const line of clientLines) {
            // Remove parênteses e divide pelos campos
            const values = line.replace(/^\(|\),?$/g, '').split(',').map(v => v.trim().replace(/^'|'$/g, ''));
            const [sqlId, nome, telefone] = values;
            
            // Cria uma referência de documento com ID gerado pelo Firebase
            const newDocRef = doc(collection(db, 'clients'));
            const newId = newDocRef.id; // Pega o ID gerado
            
            // Salva o cliente com o ID gerado
            await setDoc(newDocRef, {
                id: newId, // Adiciona o ID gerado pelo Firebase
                name: nome || '',
                phone: normalizePhone(telefone),
                address: "",
                allergies: "",
                birthdate: "",
                cpf: "",
                created_by: "import",
                created_date: new Date().toISOString(),
                email: "",
                is_sample: false,
                notes: "",
                skin_type: "",
                updated_date: new Date().toISOString()
            });

            console.log(`Cliente importado: ${nome} (ID: ${newId})`);
        }

        console.log('Importação concluída!');

    } catch (error) {
        console.error('Erro ao importar clientes:', error);
    }
};

export { extractClientsFromSQL };
