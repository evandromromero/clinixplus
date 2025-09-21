// Versões aprimoradas das entidades do Base44 com suporte ao Firebase
import { base44 } from '../api/base44Client';
import { createEnhancedEntity } from './enhancedEntities';
import { db } from './config';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Função de normalização (disponível para todo o módulo)
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Criar as versões base das entidades
const baseClient = createEnhancedEntity('clients', base44.entities.Client);
const baseContract = createEnhancedEntity('contracts', null);
const baseContractTemplate = createEnhancedEntity('contract_templates', null);
const baseAnamneseTemplate = createEnhancedEntity('anamnese_templates', null);

// Estender o objeto Client com os métodos de foto
export const Client = {
  ...baseClient,
  collection: 'clients',
  
  uploadPhoto: async function(clientId, { before, after }, type = 'upload') {
    if (!before || !after) {
      throw new Error('Both before and after photos are required');
    }

    if (!clientId) {
      throw new Error('No client ID provided');
    }

    try {
      // Converter ambas as fotos para base64
      const toBase64 = async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const beforeBase64 = await toBase64(before);
      const afterBase64 = await toBase64(after);

      // Salvar no Firestore
      const photoData = {
        before: beforeBase64,
        after: afterBase64,
        uploadedAt: new Date().toISOString(),
        type // 'camera' ou 'upload'
      };
      
      const collectionRef = collection(db, 'clients', clientId, 'photos');
      const docRef = doc(collectionRef);
      await setDoc(docRef, photoData);

      return { id: docRef.id, ...photoData };
    } catch (error) {
      console.error('Error uploading photos:', error);
      throw error;
    }
  },

  getPhotos: async function(clientId) {
    try {
      const collectionRef = collection(db, 'clients', clientId, 'photos');
      const q = query(collectionRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting photos:', error);
      throw error;
    }
  },

  deletePhoto: async function(clientId, photoId) {
    try {
      const photoRef = doc(db, 'clients', clientId, 'photos', photoId);
      await deleteDoc(photoRef);
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  },

  getObservations: async function(clientId) {
    try {
      const observationsRef = collection(db, 'clients', clientId, 'observations');
      const observationsSnapshot = await getDocs(observationsRef);
      return observationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting observations:', error);
      throw error;
    }
  },

  addObservation: async function(clientId, observation) {
    try {
      const observationsRef = collection(db, 'clients', clientId, 'observations');
      const docRef = await addDoc(observationsRef, observation);
      return docRef.id;
    } catch (error) {
      console.error('Error adding observation:', error);
      throw error;
    }
  },

  deleteObservation: async function(clientId, observationId) {
    try {
      const observationRef = doc(db, 'clients', clientId, 'observations', observationId);
      await deleteDoc(observationRef);
    } catch (error) {
      console.error('Error deleting observation:', error);
      throw error;
    }
  },

  update: async function(clientId, data) {
    try {
      const clientRef = doc(db, 'clients', clientId);
      await setDoc(clientRef, data, { merge: true });
      
      // Atualizar também no Base44
      await baseClient.update(clientId, data);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  get: async function(clientId) {
    try {
      const docRef = doc(db, 'clients', clientId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  },

  getAnamnese: async function(clientId) {
    try {
      const anamneseRef = doc(db, 'clients', clientId, 'anamnese', 'current');
      const docSnap = await getDoc(anamneseRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting anamnese:', error);
      throw error;
    }
  },

  getAnamneseById: async function(clientId, anamneseId) {
    try {
      const anamneseRef = doc(db, 'clients', clientId, 'anamnese', anamneseId);
      const docSnap = await getDoc(anamneseRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar anamnese:', error);
      throw error;
    }
  },

  saveAnamnese: async function(clientId, data) {
    try {
      const anamneseRef = doc(db, 'clients', clientId, 'anamnese', 'current');
      await setDoc(anamneseRef, {
        ...data,
        updated_at: new Date().toISOString()
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error saving anamnese:', error);
      throw error;
    }
  },

  saveAnamneseById: async function(clientId, anamneseId, data) {
    try {
      const anamneseRef = doc(db, 'clients', clientId, 'anamnese', anamneseId);
      await setDoc(anamneseRef, {
        ...data,
        updated_at: new Date().toISOString()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar anamnese:', error);
      throw error;
    }
  },
  async list() {
    try {
      const collectionRef = collection(db, this.collection);
      const querySnapshot = await getDocs(collectionRef);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      throw error;
    }
  },
  async filter(filters) {
    try {
      let q = collection(db, this.collection);
      if (filters) {
        if (filters.client_id) {
          q = query(q, where('client_id', '==', filters.client_id));
        }
        if (filters.status) {
          q = query(q, where('status', '==', filters.status));
        }
        if (filters.id) {
          q = query(q, where('__name__', '==', filters.id));
        }
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao filtrar clientes:', error);
      throw error;
    }
  },
  async get(id) {
    try {
      if (!id) {
        throw new Error('ID do cliente não fornecido');
      }
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        // Em vez de lançar um erro, retornar um objeto temporário
        console.warn(`Cliente ${id} não encontrado ou inacessível. Criando referência temporária.`);
        return {
          id,
          name: `Cliente Indisponível (ID: ${id.substring(0, 5)}...)`,
          _missing: true // Flag para identificar clientes não encontrados
        };
      }
    } catch (error) {
      console.error(`Erro ao buscar cliente ${id}:`, error);
      // Para outros erros (não relacionados a cliente não encontrado), ainda lançamos o erro
      throw error;
    }
  },
  async create(data) {
    try {
      // Função de normalização (usada internamente e na busca)
      // CREATE: Adiciona name_normalized automaticamente
      const templateData = {
        ...data,
        createdAt: serverTimestamp(),
        // Calcula e adiciona name_normalized se o nome existir
        ...(data.name && { name_normalized: normalizeString(data.name) }),
      };
      
      const collectionRef = collection(db, this.collection);
      const docRef = await addDoc(collectionRef, templateData);
      
      return {
        id: docRef.id,
        ...templateData
      };
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  },
  async delete(id) {
    try {
      if (!id) {
        throw new Error('ID do cliente não fornecido');
      }
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error(`Erro ao excluir cliente ${id}:`, error);
      throw error;
    }
  },
  update: async function(id, data) {
    try {
      if (!id) {
        throw new Error('ID do cliente não fornecido');
      }
      
      // UPDATE: Adiciona name_normalized se o nome estiver sendo atualizado
      const dataToUpdate = {
        ...data,
        updatedAt: serverTimestamp(),
        // Calcula e adiciona name_normalized se o nome estiver sendo atualizado
        ...(data.name && { name_normalized: normalizeString(data.name) }),
      };
      
      const docRef = doc(db, this.collection, id);
      await updateDoc(docRef, dataToUpdate);
      
      return { id, ...dataToUpdate };
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },
  async search(searchTerm, resultLimit = 20) {
    // Normaliza o termo de busca da mesma forma que o campo name_normalized
    const normalizedTerm = normalizeString(searchTerm);

    if (!normalizedTerm || normalizedTerm.length < 2) {
      return []; // Retorna vazio se o termo for muito curto
    }

    console.log(`[Client.search] Searching for prefix: '${normalizedTerm}' (Original: '${searchTerm}')`);

    const clientsRef = collection(db, 'clients');
    // Caractere especial que define o fim do intervalo para busca por prefixo
    const endTerm = normalizedTerm + '\uf8ff';

    // Usa o índice: clients name_normalized Crescente
    const q = query(
      clientsRef,
      where('name_normalized', '>=', normalizedTerm),
      where('name_normalized', '<=', endTerm),
      orderBy('name_normalized'), // Ordena pelo campo indexado
      // orderBy('name'), // Poderia ordenar pelo nome original se tivesse índice composto (name_normalized ASC, name ASC)
      limit(resultLimit)
    );

    console.log(`[Client.search] Firestore Prefix Query on 'name_normalized': >= '${normalizedTerm}', <= '${endTerm}'`);

    try {
      const querySnapshot = await getDocs(q);
      console.log(`[Client.search] Firestore documents found: ${querySnapshot.size}`);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error searching clients with prefix query: ", error);
      // Log para ajudar a debuggar erros de índice:
      if (error.code === 'failed-precondition') {
        console.warn(`Firestore index missing or not ready for query: ${error.message}. Check the Firestore console for index creation links OR wait for index creation.`);
      }
      return []; // Retorna vazio em caso de erro
    }
  },
  async listAnamneses(clientId) {
    try {
      const collectionRef = collection(db, 'clients', clientId, 'anamnese');
      const snapshot = await getDocs(collectionRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar anamneses:', error);
      return [];
    }
  }
};

// Estender o objeto ContractTemplate
export const ContractTemplate = {
  ...baseContractTemplate,
  collection: 'contract_templates',

  create: async function(data) {
    try {
      // Validar dados obrigatórios
      if (!data.name || !data.sections) {
        throw new Error('Nome e seções são obrigatórios');
      }

      const templateData = {
        name: data.name,
        description: data.description || '',
        content: {
          sections: data.sections || []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const collectionRef = collection(db, this.collection);
      const docRef = await addDoc(collectionRef, templateData);

      return { id: docRef.id, ...templateData };
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  list: async function() {
    try {
      const collectionRef = collection(db, this.collection);
      const q = query(collectionRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing templates:', error);
      throw error;
    }
  },

  get: async function(id) {
    try {
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Template not found');
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  },

  update: async function(id, data) {
    try {
      // Validar dados obrigatórios
      if (!data.name || !data.sections) {
        throw new Error('Nome e seções são obrigatórios');
      }

      const templateData = {
        name: data.name,
        description: data.description || '',
        content: {
          sections: data.sections || []
        },
        updated_at: new Date().toISOString()
      };

      const docRef = doc(db, this.collection, id);
      await setDoc(docRef, templateData, { merge: true });

      return { id, ...templateData };
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  delete: async function(id) {
    try {
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
};

// Estender o objeto AnamneseTemplate
export const AnamneseTemplate = {
  ...baseAnamneseTemplate,
  collection: 'anamnese_templates',

  async create(data) {
    try {
      // Gerar um ID único se não fornecido
      const id = data.id || doc(collection(db, 'anamnese_templates')).id;
      
      // Adicionar metadados
      const now = new Date().toISOString();
      const templateData = {
        ...data,
        id,
        created_at: now,
        updated_at: now
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'anamnese_templates', id), templateData);
      return templateData;
    } catch (error) {
      console.error('Error creating anamnese template:', error);
      throw error;
    }
  },

  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'anamnese_templates'));
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error listing anamnese templates:', error);
      return [];
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'anamnese_templates', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting anamnese template:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, 'anamnese_templates', id);
      const now = new Date().toISOString();
      
      const updateData = {
        ...data,
        updated_at: now
      };

      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (error) {
      console.error('Error updating anamnese template:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'anamnese_templates', id));
    } catch (error) {
      console.error('Error deleting anamnese template:', error);
      throw error;
    }
  }
};

// Estender o objeto Contract
export const Contract = {
  collection: 'contracts',
  
  async generate(clientId, templateId = null) {
    try {
      // Buscar o template de contrato
      let template = null;
      if (templateId) {
        template = await ContractTemplate.get(templateId);
      } else {
        // Buscar o primeiro template disponível se nenhum for especificado
        const templates = await ContractTemplate.list();
        if (templates.length > 0) {
          template = templates[0];
        }
      }
      
      if (!template) {
        throw new Error('Nenhum template de contrato encontrado');
      }
      
      // Buscar dados do cliente
      const client = await Client.get(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }
      
      // Gerar o texto do contrato substituindo as variáveis
      let contractText = template.content;
      
      // Substituir variáveis do cliente
      contractText = contractText.replace(/\{client\.name\}/g, client.name || '');
      contractText = contractText.replace(/\{client\.email\}/g, client.email || '');
      contractText = contractText.replace(/\{client\.phone\}/g, client.phone || '');
      contractText = contractText.replace(/\{client\.address\}/g, client.address || '');
      contractText = contractText.replace(/\{client\.cpf\}/g, client.cpf || '');
      
      // Substituir variáveis da empresa
      const company = await SystemConfig.get('company');
      if (company) {
        contractText = contractText.replace(/\{company\.name\}/g, company.name || '');
        contractText = contractText.replace(/\{company\.email\}/g, company.email || '');
        contractText = contractText.replace(/\{company\.phone\}/g, company.phone || '');
        contractText = contractText.replace(/\{company\.address\}/g, company.address || '');
        contractText = contractText.replace(/\{company\.cnpj\}/g, company.cnpj || '');
      }
      
      // Substituir data atual
      const currentDate = new Date().toLocaleDateString('pt-BR');
      contractText = contractText.replace(/\{current_date\}/g, currentDate);
      
      // Criar o contrato no Firebase
      const contractData = {
        client_id: clientId,
        template_id: template.id,
        title: template.title,
        content: contractText,
        status: 'draft',
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
      
      // Salvar no Firebase
      const docRef = doc(collection(db, 'contracts'));
      await setDoc(docRef, {
        ...contractData,
        id: docRef.id
      });
      
      return {
        id: docRef.id,
        ...contractData
      };
    } catch (error) {
      console.error('Error generating contract:', error);
      throw error;
    }
  },
  
  async sendByEmail(contractData, email, pdfFileName) {
    try {
      // Verificar se o contrato existe
      if (!contractData || !contractData.id) {
        throw new Error('Dados do contrato inválidos');
      }
      
      // Preparar dados para envio
      const emailData = {
        to: email,
        subject: `Contrato: ${contractData.title}`,
        body: `Segue em anexo o contrato "${contractData.title}"`,
        attachments: [
          {
            filename: pdfFileName || `contrato_${contractData.id}.pdf`,
            content: contractData.content,
            contentType: 'application/pdf'
          }
        ]
      };
      
      // Enviar email (implementação fictícia)
      // Na implementação real, você usaria um serviço de email
      console.log('Enviando contrato por email:', emailData);
      
      // Atualizar status do contrato
      await this.update(contractData.id, {
        status: 'sent',
        sent_date: new Date().toISOString(),
        sent_to: email
      });
      
      return true;
    } catch (error) {
      console.error('Error sending contract by email:', error);
      throw error;
    }
  },
  
  async getByClientId(clientId) {
    try {
      if (!clientId) {
        throw new Error('ID do cliente não fornecido');
      }
      
      // Buscar contratos do cliente
      const q = query(
        collection(db, this.collection),
        where('client_id', '==', clientId)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting contracts by client ID:', error);
      return [];
    }
  },
  
  async update(id, data) {
    try {
      if (!id) {
        throw new Error('ID do contrato não fornecido');
      }
      
      const docRef = doc(db, this.collection, id);
      await updateDoc(docRef, {
        ...data,
        updated_date: new Date().toISOString()
      });
      
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error('Error updating contract:', error);
      throw error;
    }
  },
  
  async delete(id) {
    try {
      if (!id) {
        throw new Error('ID do contrato não fornecido');
      }
      
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting contract:', error);
      throw error;
    }
  },
  
  async get(id) {
    try {
      if (!id) {
        throw new Error('ID do contrato não fornecido');
      }
      
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting contract:', error);
      throw error;
    }
  },
  
  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collection));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing contracts:', error);
      return [];
    }
  },
  
  async filter(filters) {
    try {
      let q = collection(db, this.collection);
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering contracts:', error);
      return [];
    }
  }
};

// Entidade para serviços pendentes de agendamento
const PendingServiceBase = {
  collection: 'pending_services',
  schema: {
    client_id: { type: 'string', required: true },
    service_id: { type: 'string', required: true },
    sale_id: { type: 'string', required: true },
    status: { type: 'string', required: true },
    created_date: { type: 'string', required: true },
    expiration_date: { type: 'string', required: false },
    appointment_id: { type: 'string', required: false },
    notes: { type: 'string', required: false }
  },

  async create(data) {
    try {
      // Verifica se já existe um serviço pendente com os mesmos dados
      const existingServices = await this.filter({
        client_id: data.client_id,
        service_id: data.service_id,
        sale_id: data.sale_id,
        status: data.status
      });

      if (existingServices && existingServices.length > 0) {
        console.log('Serviço pendente já existe:', existingServices[0]);
        return existingServices[0];
      }

      // Se não existe, cria um novo
      const collectionRef = collection(db, 'pending_services');
      const docRef = await addDoc(collectionRef, {
        ...data,
        created_date: new Date().toISOString()
      });

      return {
        id: docRef.id,
        ...data
      };
    } catch (error) {
      console.error('Error creating pending service:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, 'pending_services', id);
      await updateDoc(docRef, data);
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error('Error updating pending service:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'pending_services', id));
    } catch (error) {
      console.error('Error deleting pending service:', error);
      throw error;
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'pending_services', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting pending service:', error);
      throw error;
    }
  },

  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'pending_services'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing pending services:', error);
      return [];
    }
  },

  async filter(filters) {
    try {
      let q = collection(db, 'pending_services');
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            q = query(q, where(key, '==', value));
          }
        });
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering pending services:', error);
      return [];
    }
  }
};

export const PendingService = PendingServiceBase;

// Implementação completa da entidade Employee usando Firebase
export const Employee = {
  collection: 'employees',
  
  create: async function(data) {
    try {
      // Gerar um ID único se não fornecido
      const id = data.id || doc(collection(db, 'employees')).id;
      
      // Adicionar metadados
      const now = new Date().toISOString();
      const employeeData = {
        ...data,
        id,
        created_date: data.created_date || now,
        updated_date: now
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'employees', id), employeeData);
      return employeeData;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, 'employees', id);
      const now = new Date().toISOString();
      
      const updateData = {
        ...data,
        updated_date: now
      };

      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'employees', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting employee:', error);
      throw error;
    }
  },

  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing employees:', error);
      return [];
    }
  },

  async filter(filters) {
    try {
      let q = collection(db, 'employees');
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering employees:', error);
      return [];
    }
  }
};

// Implementação da entidade Product usando Firebase
export const Product = {
  collection: 'products',
  
  create: async function(data) {
    try {
      // Gerar um ID único se não fornecido
      const id = data.id || doc(collection(db, 'products')).id;
      
      // Adicionar metadados
      const now = new Date().toISOString();
      const productData = {
        ...data,
        id,
        created_date: data.created_date || now,
        updated_date: now
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'products', id), productData);
      return productData;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, 'products', id);
      const now = new Date().toISOString();
      
      const updateData = {
        ...data,
        updated_date: now
      };

      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  },

  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing products:', error);
      return [];
    }
  },

  async filter(filters) {
    try {
      let q = collection(db, 'products');
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering products:', error);
      return [];
    }
  }
};

// Implementação da entidade Inventory usando Firebase
export const Inventory = {
  collection: 'inventory',
  
  create: async function(data) {
    try {
      // Gerar um ID único se não fornecido
      const id = data.id || doc(collection(db, 'inventory')).id;
      
      // Adicionar metadados
      const now = new Date().toISOString();
      const inventoryData = {
        ...data,
        id,
        created_date: data.created_date || now,
        updated_date: now
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'inventory', id), inventoryData);
      return inventoryData;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, 'inventory', id);
      const now = new Date().toISOString();
      
      const updateData = {
        ...data,
        updated_date: now
      };

      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'inventory', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting inventory item:', error);
      throw error;
    }
  },

  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing inventory items:', error);
      return [];
    }
  },

  async filter(filters) {
    try {
      let q = collection(db, 'inventory');
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering inventory items:', error);
      return [];
    }
  }
};

export const Sale = createEnhancedEntity('sales', null); 
export const FinancialTransaction = createEnhancedEntity('financial_transactions', base44.entities.FinancialTransaction);

// Implementação completa da entidade ClientPackage usando apenas Firebase
export const ClientPackage = {
  collection: 'client_packages',
  
  async create(data) {
    try {
      // Gerar ID único se não fornecido
      const docRef = data.id 
        ? doc(db, this.collection, data.id)
        : doc(collection(db, this.collection));
      
      // Preparar dados para salvar
      const packageData = {
        ...data,
        id: docRef.id,
        dependents: data.dependents || [],
        session_history: data.session_history || [],
        status: data.status || 'ativo',
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
      
      // Salvar no Firebase
      await setDoc(docRef, packageData);
      
      return packageData;
    } catch (error) {
      console.error('Erro ao criar pacote:', error);
      throw error;
    }
  },
  
  async update(id, data) {
    try {
      if (!id) {
        throw new Error('ID do pacote não fornecido');
      }
      
      const docRef = doc(db, this.collection, id);
      
      // Atualizar apenas os campos fornecidos
      await updateDoc(docRef, {
        ...data,
        updated_date: new Date().toISOString()
      });
      
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error(`Erro ao atualizar pacote ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id) {
    try {
      if (!id) {
        throw new Error('ID do pacote não fornecido');
      }
      
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      
      return { success: true };
    } catch (error) {
      console.error(`Erro ao excluir pacote ${id}:`, error);
      throw error;
    }
  },
  
  async get(id) {
    try {
      if (!id) {
        throw new Error('ID do pacote não fornecido');
      }
      
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar pacote ${id}:`, error);
      throw error;
    }
  },
  
  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collection));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar pacotes:', error);
      return [];
    }
  },
  
  async filter(filters) {
    try {
      let q = collection(db, this.collection);
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao filtrar pacotes:', error);
      return [];
    }
  },
  
  async removeSessionFromHistory(packageId, sessionIndex) {
    try {
      if (!packageId) {
        throw new Error('ID do pacote não fornecido');
      }
      
      // Obter o pacote atual
      const packageData = await this.get(packageId);
      if (!packageData) {
        throw new Error('Pacote não encontrado');
      }
      
      // Verificar se o histórico de sessões existe
      if (!packageData.session_history || !Array.isArray(packageData.session_history)) {
        throw new Error('Histórico de sessões não encontrado ou inválido');
      }
      
      // Remover a sessão pelo índice
      const updatedSessionHistory = [...packageData.session_history];
      if (sessionIndex >= 0 && sessionIndex < updatedSessionHistory.length) {
        updatedSessionHistory.splice(sessionIndex, 1);
      } else {
        throw new Error('Índice de sessão inválido');
      }
      
      // Atualizar o pacote com o novo histórico E decrementar sessions_used
      await this.update(packageId, {
        session_history: updatedSessionHistory,
        sessions_used: Math.max(0, (packageData.sessions_used || 0) - 1)
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Erro ao remover sessão do pacote ${packageId}:`, error);
      throw error;
    }
  },

  async addSessionsToPackage(packageId, servicesAdditions, reason = '', employeeName = '') {
    try {
      if (!packageId) {
        throw new Error('ID do pacote não fornecido');
      }
      
      if (!servicesAdditions || !Array.isArray(servicesAdditions)) {
        throw new Error('Lista de serviços não fornecida');
      }

      // Calcular total de sessões a adicionar
      const totalAdditionalSessions = servicesAdditions.reduce((sum, service) => 
        sum + (service.additional_quantity || 0), 0
      );

      if (totalAdditionalSessions <= 0) {
        throw new Error('Nenhuma sessão foi adicionada');
      }

      if (totalAdditionalSessions > 100) {
        throw new Error('Máximo de 100 sessões por vez');
      }
      
      // Obter o pacote atual
      const packageData = await this.get(packageId);
      if (!packageData) {
        throw new Error('Pacote não encontrado');
      }
      
      // Calcular novo total de sessões
      const currentTotal = packageData.total_sessions || 0;
      const newTotal = currentTotal + totalAdditionalSessions;
      
      // Atualizar serviços no package_snapshot (se for pacote personalizado)
      let updatedPackageSnapshot = packageData.package_snapshot;
      if (updatedPackageSnapshot?.services) {
        updatedPackageSnapshot = {
          ...updatedPackageSnapshot,
          services: updatedPackageSnapshot.services.map(service => {
            const addition = servicesAdditions.find(add => add.service_id === service.service_id);
            if (addition && addition.additional_quantity > 0) {
              return {
                ...service,
                quantity: (service.quantity || 0) + addition.additional_quantity
              };
            }
            return service;
          })
        };
      }
      
      // Criar log da adição
      const additionLog = {
        date: new Date().toISOString(),
        services_added: servicesAdditions.filter(s => s.additional_quantity > 0),
        total_sessions_added: totalAdditionalSessions,
        reason: reason || 'Não informado',
        employee_name: employeeName || 'Não informado',
        previous_total: currentTotal,
        new_total: newTotal
      };
      
      // Preparar dados para atualização
      const updateData = {
        total_sessions: newTotal,
        sessions_addition_history: [
          ...(packageData.sessions_addition_history || []),
          additionLog
        ]
      };

      // Adicionar package_snapshot atualizado se necessário
      if (updatedPackageSnapshot) {
        updateData.package_snapshot = updatedPackageSnapshot;
      }
      
      // Atualizar o pacote
      await this.update(packageId, updateData);
      
      return { 
        success: true, 
        previousTotal: currentTotal,
        newTotal: newTotal,
        sessionsAdded: totalAdditionalSessions,
        servicesUpdated: servicesAdditions.filter(s => s.additional_quantity > 0)
      };
    } catch (error) {
      console.error(`Erro ao adicionar sessões ao pacote ${packageId}:`, error);
      throw error;
    }
  }
};

export const Package = createEnhancedEntity('packages', base44.entities.Package);
export const Service = createEnhancedEntity('services', base44.entities.Service);
export const Supplier = createEnhancedEntity('suppliers', base44.entities.Supplier);
// export const Role = createEnhancedEntity('roles', base44.entities.Role); // Comentado para usar a implementação completa abaixo
export const PaymentMethod = createEnhancedEntity('payment_methods', base44.entities.PaymentMethod);
export const SubscriptionPlan = createEnhancedEntity('subscription_plans', base44.entities.SubscriptionPlan);
// Implementação completa da entidade ClientSubscription usando apenas Firebase
export const ClientSubscription = {
  collection: 'client_subscriptions',
  
  async create(data) {
    try {
      const collectionRef = collection(db, 'client_subscriptions');
      const docRef = await addDoc(collectionRef, {
        ...data,
        created_date: new Date().toISOString()
      });
      
      return {
        id: docRef.id,
        ...data
      };
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  },
  
  async update(id, data) {
    try {
      if (!id) {
        throw new Error('ID da assinatura não fornecido');
      }
      
      const docRef = doc(db, 'client_subscriptions', id);
      await updateDoc(docRef, data);
      
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error(`Erro ao atualizar assinatura ${id}:`, error);
      throw error;
    }
  },
  
  async delete(id) {
    try {
      if (!id) {
        throw new Error('ID da assinatura não fornecido');
      }
      
      const docRef = doc(db, 'client_subscriptions', id);
      await deleteDoc(docRef);
      
      return { success: true };
    } catch (error) {
      console.error(`Erro ao excluir assinatura ${id}:`, error);
      throw error;
    }
  },
  
  async get(id) {
    try {
      if (!id) {
        throw new Error('ID da assinatura não fornecido');
      }
      
      const docRef = doc(db, 'client_subscriptions', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Assinatura não encontrada');
      }
    } catch (error) {
      console.error(`Erro ao buscar assinatura ${id}:`, error);
      throw error;
    }
  },
  
  async list() {
    try {
      const collectionRef = collection(db, 'client_subscriptions');
      const querySnapshot = await getDocs(collectionRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar assinaturas:', error);
      throw error;
    }
  },
  
  async filter(filters) {
    try {
      let q = collection(db, 'client_subscriptions');
      
      if (filters) {
        if (filters.client_id) {
          q = query(q, where('client_id', '==', filters.client_id));
        }
        
        if (filters.status) {
          q = query(q, where('status', '==', filters.status));
        }
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao filtrar assinaturas:', error);
      throw error;
    }
  }
};

export const ClientPackageSession = createEnhancedEntity('client_package_sessions', base44.entities.ClientPackageSession);
export const Receipt = createEnhancedEntity('receipts', base44.entities.Receipt);
export const UnfinishedSale = createEnhancedEntity('unfinished_sales', null); 
export const CompanySettings = {
  collection: 'company_settings',

  async get() {
    try {
      const querySnapshot = await getDocs(collection(db, 'company_settings'));
      const settings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))[0] || {
        name: "ClinixPlus",
        cnpj: "",
        email: "contato@exemplo.com",
        phone: "(00) 0000-0000",
        whatsapp: "(00) 0000-0000",
        address: "Rua Exemplo, 123",
        city: "São Paulo",
        state: "SP",
        zipcode: "00000-000",
        timezone: "America/Sao_Paulo", // Fuso horário padrão
        opening_hours: {
          weekdays: "8h às 20h",
          weekend: "9h às 18h"
        }
      };
      return settings;
    } catch (error) {
      console.error('Error getting company settings:', error);
      throw error;
    }
  },

  async update(data) {
    try {
      const querySnapshot = await getDocs(collection(db, 'company_settings'));
      const settingsDoc = querySnapshot.docs[0];
      
      if (settingsDoc) {
        await updateDoc(doc(db, 'company_settings', settingsDoc.id), data);
        return {
          id: settingsDoc.id,
          ...data
        };
      } else {
        const docRef = await addDoc(collection(db, 'company_settings'), data);
        return {
          id: docRef.id,
          ...data
        };
      }
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  }
}; 

export const SlideShowImage = createEnhancedEntity('slideshow_images', base44.entities.SlideShowImage);
export const Testimonial = createEnhancedEntity('testimonials', base44.entities.Testimonial);
export const Anamnesis = createEnhancedEntity('anamnesis', {
  create: true,
  update: true,
  delete: true,
  list: true,
  get: true,
  query: true,
  defaultData: {
    skin_type: "",
    allergies: "",
    health_conditions: "",
    medications: "",
    observations: "",
    last_update: ""
  }
});

// Implementação da entidade User usando Firebase
export const User = {
  collection: 'users',
  
  create: async function(data) {
    try {
      // Validar dados obrigatórios
      if (!data.email || !data.password || !data.name || !data.roleId) {
        throw new Error('Dados incompletos: email, senha, nome e cargo são obrigatórios');
      }
      
      // Verificar se já existe um usuário com este email
      const existingUsers = await this.filter({ email: data.email });
      if (existingUsers.length > 0) {
        throw new Error('Já existe um usuário com este email');
      }
      
      // Preparar dados para salvar
      const userData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: data.active !== undefined ? data.active : true
      };
      
      // Criar documento no Firestore
      const collectionRef = collection(db, this.collection);
      const docRef = await addDoc(collectionRef, userData);
      
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },
  
  update: async function(id, data) {
    try {
      if (!id) {
        throw new Error('ID do usuário não fornecido');
      }
      
      // Atualizar timestamp
      const updatedData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      // Atualizar documento no Firestore
      const docRef = doc(db, this.collection, id);
      await updateDoc(docRef, updatedData);
      
      return { id, ...updatedData };
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },
  
  delete: async function(id) {
    try {
      if (!id) {
        throw new Error('ID do usuário não fornecido');
      }
      
      // Excluir documento no Firestore
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  },
  
  get: async function(id) {
    try {
      if (!id) {
        throw new Error('ID do usuário não fornecido');
      }
      
      // Buscar documento no Firestore
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Usuário não encontrado');
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
  },
  
  list: async function() {
    try {
      // Buscar todos os documentos na coleção
      const collectionRef = collection(db, this.collection);
      const snapshot = await getDocs(collectionRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },
  
  filter: async function(filters) {
    try {
      let q = collection(db, this.collection);
      
      // Aplicar filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            q = query(q, where(key, '==', value));
          }
        });
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao filtrar usuários:', error);
      throw error;
    }
  },
  
  // Método para autenticação
  login: async function(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email e senha são obrigatórios');
      }
      
      // Buscar usuário pelo email
      const users = await this.filter({ email });
      
      if (users.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      const user = users[0];
      
      // Verificar senha (em produção, usar hash)
      if (user.password !== password) {
        throw new Error('Senha incorreta');
      }
      
      // Verificar se o usuário está ativo
      if (user.active === false) {
        throw new Error('Usuário inativo');
      }
      
      return user;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  }
};

// Exporta as entidades originais para as demais (que serão migradas gradualmente)
export const ClientAuth = base44.entities.ClientAuth;

// Auth SDK
export const Auth = base44.auth;

export const FIREBASE_ONLY_ENTITIES = [
  'appointments',
  'employees',
  'services',
  'payment_methods',
  'company_settings',
  'slideshow_images',
  'testimonials',
  'inventory',
  'inventory_movements',
  'products',
  'anamnesis',
  'anamnese_templates',
  'client_packages',
  'pending_services'
];

export const Appointment = {
  collection: 'appointments',
  
  create: async function(data) {
    try {
      console.log('[DEBUG][Appointment.create] Dados recebidos:', data);
      // Gerar um ID único se não fornecido
      const id = data.id || doc(collection(db, 'appointments')).id;
      
      // Adicionar metadados
      const now = new Date().toISOString();
      const appointmentData = {
        ...data,
        id,
        created_date: data.created_date || now,
        updated_date: now
      };
      console.log('[DEBUG][Appointment.create] Dados finais para salvar:', appointmentData);

      // Salvar no Firestore
      await setDoc(doc(db, 'appointments', id), appointmentData);
      console.log('[DEBUG][Appointment.create] Sucesso ao salvar agendamento:', id);
      return appointmentData;
    } catch (error) {
      console.error('[DEBUG][Appointment.create] ERRO ao criar agendamento:', error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, 'appointments', id);
      const now = new Date().toISOString();
      
      const updateData = {
        ...data,
        updated_date: now
      };

      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, 'appointments', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting appointment:', error);
      throw error;
    }
  },

  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'appointments'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing appointments:', error);
      return [];
    }
  },

  async filter(filters) {
    try {
      let q = collection(db, 'appointments');
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering appointments:', error);
      return [];
    }
  }
};

// Implementação da entidade Role usando Firebase
export const Role = {
  collection: 'roles',
  
  create: async function(data) {
    try {
      // Validar dados obrigatórios
      if (!data.name) {
        throw new Error('Nome do cargo é obrigatório');
      }
      
      // Preparar dados para salvar
      const roleData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: data.active !== undefined ? data.active : true
      };
      
      // Criar documento no Firestore
      const collectionRef = collection(db, this.collection);
      const docRef = await addDoc(collectionRef, roleData);
      
      return { id: docRef.id, ...roleData };
    } catch (error) {
      console.error('Erro ao criar cargo:', error);
      throw error;
    }
  },
  
  update: async function(id, data) {
    try {
      if (!id) {
        throw new Error('ID do cargo não fornecido');
      }
      
      // Atualizar timestamp
      const updatedData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      // Atualizar documento no Firestore
      const docRef = doc(db, this.collection, id);
      await updateDoc(docRef, updatedData);
      
      return { id, ...updatedData };
    } catch (error) {
      console.error('Erro ao atualizar cargo:', error);
      throw error;
    }
  },
  
  delete: async function(id) {
    try {
      if (!id) {
        throw new Error('ID do cargo não fornecido');
      }
      
      // Excluir documento no Firestore
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir cargo:', error);
      throw error;
    }
  },
  
  get: async function(id) {
    try {
      if (!id) {
        throw new Error('ID do cargo não fornecido');
      }
      
      // Buscar documento no Firestore
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Cargo não encontrado');
      }
      
      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('Erro ao buscar cargo:', error);
      throw error;
    }
  },
  
  list: async function() {
    try {
      // Buscar todos os documentos na coleção
      const collectionRef = collection(db, this.collection);
      const snapshot = await getDocs(collectionRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar cargos:', error);
      throw error;
    }
  },
  
  filter: async function(filters) {
    try {
      let q = collection(db, this.collection);
      
      // Aplicar filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            q = query(q, where(key, '==', value));
          }
        });
      }
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao filtrar cargos:', error);
      throw error;
    }
  },
  
  // Método para criar múltiplos cargos de uma vez
  bulkCreate: async function(roles) {
    try {
      if (!Array.isArray(roles) || roles.length === 0) {
        throw new Error('É necessário fornecer um array de cargos');
      }
      
      const results = [];
      
      // Verificar se o cargo Administrador Geral já existe
      const adminExists = await this.checkAdminRoleExists();
      
      // Criar cada cargo individualmente
      for (const roleData of roles) {
        // Pular a criação do Administrador Geral se ele já existir
        if (adminExists && roleData.name === "Administrador Geral") {
          continue;
        }
        
        const result = await this.create(roleData);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Erro ao criar múltiplos cargos:', error);
      throw error;
    }
  },
  
  // Método para verificar se o cargo Administrador Geral já existe
  checkAdminRoleExists: async function() {
    try {
      const q = query(
        collection(db, this.collection),
        where('name', '==', 'Administrador Geral')
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar existência do cargo Administrador Geral:', error);
      return false;
    }
  }
};

// Entidade para gerenciar configurações do sistema
export const SystemConfig = {
  async get(key) {
    try {
      const configsRef = collection(db, 'system_configs');
      const querySnapshot = await getDocs(configsRef);
      const configs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const config = configs.find(c => c.key === key);
      return config ? config.value : null;
    } catch (error) {
      console.error(`Erro ao obter configuração ${key}:`, error);
      return null;
    }
  },
  
  async set(key, value) {
    try {
      const configsRef = collection(db, 'system_configs');
      const q = query(configsRef, where("key", "==", key));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Atualizar configuração existente
        const docId = querySnapshot.docs[0].id;
        const docRef = doc(db, 'system_configs', docId);
        const updatedConfig = { 
          key, 
          value, 
          updated_at: new Date().toISOString() 
        };
        await updateDoc(docRef, updatedConfig);
        return { ...updatedConfig, id: docId };
      } else {
        // Criar nova configuração
        const newConfig = { 
          key, 
          value, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const docRef = await addDoc(configsRef, newConfig);
        return { ...newConfig, id: docRef.id };
      }
    } catch (error) {
      console.error(`Erro ao salvar configuração ${key}:`, error);
      throw error;
    }
  },
  
  async list() {
    try {
      const configsRef = collection(db, 'system_configs');
      const querySnapshot = await getDocs(configsRef);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao listar configurações:', error);
      return [];
    }
  }
};

// Função auxiliar para verificar permissões habilitadas
export const checkEnabledPermission = async (permissionId) => {
  try {
    // Buscar permissões habilitadas
    const configsRef = collection(db, 'system_configs');
    const q = query(configsRef, where("key", "==", "enabled_permissions"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Se não existir configuração, todas as permissões estão habilitadas por padrão
      return true;
    }
    
    const enabledPermissions = querySnapshot.docs[0].data().value || [];
    
    // Verificar se a permissão específica está habilitada
    return enabledPermissions.includes(permissionId);
  } catch (error) {
    console.error(`Erro ao verificar permissão ${permissionId}:`, error);
    // Em caso de erro, permitir a permissão por padrão
    return true;
  }
};

// Implementação completa da entidade GiftCard usando apenas Firebase
export const GiftCard = {
  collection: 'gift_cards',
  
  async create(data) {
    try {
      // Gerar ID único se não fornecido
      const docRef = data.id 
        ? doc(db, 'gift_cards', data.id)
        : doc(collection(db, 'gift_cards'));
      
      // Preparar dados para salvar
      const giftCardData = {
        ...data,
        id: docRef.id,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
      
      // Salvar no Firebase
      await setDoc(docRef, giftCardData);
      
      return giftCardData;
    } catch (error) {
      console.error('Error creating gift card:', error);
      throw error;
    }
  },
  
  async update(id, data) {
    try {
      const docRef = doc(db, 'gift_cards', id);
      
      // Atualizar apenas os campos fornecidos
      await updateDoc(docRef, {
        ...data,
        updated_date: new Date().toISOString()
      });
      
      return {
        id,
        ...data
      };
    } catch (error) {
      console.error('Error updating gift card:', error);
      throw error;
    }
  },
  
  async delete(id) {
    try {
      await deleteDoc(doc(db, 'gift_cards', id));
    } catch (error) {
      console.error('Error deleting gift card:', error);
      throw error;
    }
  },
  
  async get(id) {
    try {
      const docRef = doc(db, 'gift_cards', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting gift card:', error);
      throw error;
    }
  },
  
  async list() {
    try {
      const querySnapshot = await getDocs(collection(db, 'gift_cards'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing gift cards:', error);
      return [];
    }
  },
  
  async filter(filters) {
    try {
      let q = collection(db, 'gift_cards');
      
      // Aplicar filtros se fornecidos
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          q = query(q, where(key, '==', value));
        });
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering gift cards:', error);
      return [];
    }
  }
};

// Entidade para mensagens de contato
export const ContactMessage = {
  create: async (data) => {
    try {
      // Adicionar timestamp à mensagem
      const messageData = {
        ...data,
        created_at: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(collection(db, 'contact_messages'), messageData);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar mensagem de contato:", error);
      throw error;
    }
  },
  
  list: async (orderByField = 'created_at', direction = 'desc') => {
    try {
      const messagesRef = collection(db, 'contact_messages');
      const q = query(messagesRef, orderBy(orderByField, direction));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at ? new Date(doc.data().created_at.toDate()) : new Date()
      }));
    } catch (error) {
      console.error("Erro ao listar mensagens de contato:", error);
      return [];
    }
  },
  
  get: async (id) => {
    try {
      const docRef = doc(db, 'contact_messages', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_at: data.created_at ? new Date(data.created_at.toDate()) : new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error("Erro ao obter mensagem de contato:", error);
      return null;
    }
  },
  
  update: async (id, data) => {
    try {
      const docRef = doc(db, 'contact_messages', id);
      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar mensagem de contato:", error);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      const docRef = doc(db, 'contact_messages', id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Erro ao excluir mensagem de contato:", error);
      throw error;
    }
  },
  
  markAsRead: async (id) => {
    try {
      const docRef = doc(db, 'contact_messages', id);
      await updateDoc(docRef, { read: true });
      return true;
    } catch (error) {
      console.error("Erro ao marcar mensagem como lida:", error);
      throw error;
    }
  }
};
