// Versões aprimoradas das entidades do Base44 com suporte ao Firebase
import { base44 } from '../api/base44Client';
import { createEnhancedEntity } from './enhancedEntities';
import { db } from './config';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, addDoc, updateDoc } from 'firebase/firestore';

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
      const docRef = doc(collectionRef);
      await setDoc(docRef, templateData);

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
  ...baseContract,
  collection: 'contracts',

  generate: async function(clientId, templateId = null) {
    try {
      let content;
      
      if (templateId) {
        // Usar template existente
        const template = await ContractTemplate.get(templateId);
        if (!template || !template.content) {
          throw new Error('Template não encontrado ou sem conteúdo definido');
        }
        content = template.content;
      } else {
        // Template padrão
        content = {
          sections: [
            {
              title: "Objeto do Contrato",
              content: "Prestação de serviços..."
            },
            {
              title: "Valor e Forma de Pagamento",
              content: "O valor dos serviços..."
            },
            {
              title: "Prazo",
              content: "O presente contrato tem prazo..."
            }
          ]
        };
      }

      // Validação extra para garantir que content não seja undefined
      if (!content) {
        throw new Error('Conteúdo do contrato não pode ser vazio');
      }

      const contractData = {
        client_id: clientId,
        template_id: templateId,
        content, // Agora temos certeza que content não é undefined
        status: 'draft',
        issue_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const collectionRef = collection(db, this.collection);
      const docRef = doc(collectionRef);
      await setDoc(docRef, contractData);

      return { id: docRef.id, ...contractData };
    } catch (error) {
      console.error('Error generating contract:', error);
      throw error;
    }
  },

  sendByEmail: async function(contractData, email, pdfFileName) {
    try {
      // Aqui você implementará a lógica de envio de email com o seu serviço de email
      console.log('Sending contract by email:', {
        to: email,
        subject: 'Contrato de Prestação de Serviços',
        attachments: [pdfFileName]
      });
      
      // Salvar o registro de envio no Firebase
      const emailLog = {
        contract_id: contractData.id,
        sent_to: email,
        sent_at: new Date().toISOString(),
        type: 'email'
      };
      
      const collectionRef = collection(db, 'contract_shares');
      const docRef = doc(collectionRef);
      await setDoc(docRef, emailLog);

      return true;
    } catch (error) {
      console.error('Error sending contract by email:', error);
      throw error;
    }
  },

  getByClientId: async function(clientId) {
    try {
      const collectionRef = collection(db, this.collection);
      const q = query(
        collectionRef,
        where('client_id', '==', clientId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting client contracts:', error);
      throw error;
    }
  },

  update: async function(contractId, data) {
    try {
      const docRef = doc(db, this.collection, contractId);
      await setDoc(docRef, data, { merge: true });
      return { id: contractId, ...data };
    } catch (error) {
      console.error('Error updating contract:', error);
      throw error;
    }
  },

  delete: async function(contractId) {
    try {
      const docRef = doc(db, this.collection, contractId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting contract:', error);
      throw error;
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
    quantity: { type: 'number', required: true },
    status: { type: 'string', required: true }, // pendente, agendado, cancelado
    created_date: { type: 'string', required: true },
    expiration_date: { type: 'string', required: false },
    appointment_id: { type: 'string', required: false },
    notes: { type: 'string', required: false }
  },
  create: async (data) => {
    const docRef = await addDoc(collection(db, 'pending_services'), data);
    return { id: docRef.id, ...data };
  },
  update: async (id, data) => {
    const docRef = doc(db, 'pending_services', id);
    await updateDoc(docRef, data);
    return { id, ...data };
  },
  delete: async (id) => {
    const docRef = doc(db, 'pending_services', id);
    await deleteDoc(docRef);
  },
  get: async (id) => {
    const docRef = doc(db, 'pending_services', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  },
  list: async () => {
    const querySnapshot = await getDocs(collection(db, 'pending_services'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  filter: async (filters) => {
    try {
      const querySnapshot = await getDocs(query(
        collection(db, 'pending_services'),
        where('client_id', '==', filters.client_id),
        where('status', '==', filters.status)
      ));
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[PendingService] Erro ao filtrar serviços pendentes:', error);
      throw error;
    }
  }
};

export const PendingService = createEnhancedEntity('pending_services', PendingServiceBase);

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
export const ClientPackage = createEnhancedEntity('client_packages', {
  create: true,
  update: true,
  delete: true,
  list: true,
  get: true,
  query: true,
  defaultData: {
    dependents: [],
    session_history: [],
    status: 'ativo'
  }
});
export const Package = createEnhancedEntity('packages', base44.entities.Package);
export const Service = createEnhancedEntity('services', base44.entities.Service);
export const Supplier = createEnhancedEntity('suppliers', base44.entities.Supplier);
export const Role = createEnhancedEntity('roles', base44.entities.Role);
export const PaymentMethod = createEnhancedEntity('payment_methods', base44.entities.PaymentMethod);
export const SubscriptionPlan = createEnhancedEntity('subscription_plans', base44.entities.SubscriptionPlan);
export const ClientSubscription = createEnhancedEntity('client_subscriptions', base44.entities.ClientSubscription);
export const GiftCard = createEnhancedEntity('gift_cards', base44.entities.GiftCard);
export const ClientPackageSession = createEnhancedEntity('client_package_sessions', base44.entities.ClientPackageSession);
export const Receipt = createEnhancedEntity('receipts', base44.entities.Receipt);
export const UnfinishedSale = createEnhancedEntity('unfinished_sales', null); 
export const CompanySettings = createEnhancedEntity('company_settings', base44.entities.CompanySettings);
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

// Exporta as entidades originais para as demais (que serão migradas gradualmente)
export const ClientAuth = base44.entities.ClientAuth;

// Auth SDK
export const User = base44.auth;

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

      // Salvar no Firestore
      await setDoc(doc(db, 'appointments', id), appointmentData);
      return appointmentData;
    } catch (error) {
      console.error('Error creating appointment:', error);
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
