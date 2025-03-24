// Versões aprimoradas das entidades do Base44 com suporte ao Firebase
import { base44 } from '../api/base44Client';
import { createEnhancedEntity } from './enhancedEntities';
import { db } from './config';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

// Cria versões aprimoradas das entidades mais utilizadas
export const Client = createEnhancedEntity('clients', base44.entities.Client);
export const Appointment = createEnhancedEntity('appointments', base44.entities.Appointment);
export const Sale = createEnhancedEntity('sales', null); // Removendo dependência do Base44
export const FinancialTransaction = createEnhancedEntity('financial_transactions', base44.entities.FinancialTransaction);
export const CompanySettings = createEnhancedEntity('company_settings', base44.entities.CompanySettings);
export const SlideShowImage = createEnhancedEntity('slideshow_images', base44.entities.SlideShowImage);
export const Testimonial = createEnhancedEntity('testimonials', base44.entities.Testimonial);
export const Employee = createEnhancedEntity('employees', base44.entities.Employee);
export const Service = createEnhancedEntity('services', base44.entities.Service);
export const Product = createEnhancedEntity('products', base44.entities.Product);
export const Package = createEnhancedEntity('packages', base44.entities.Package);
export const Supplier = createEnhancedEntity('suppliers', base44.entities.Supplier);
export const Role = createEnhancedEntity('roles', base44.entities.Role);
export const PaymentMethod = createEnhancedEntity('payment_methods', base44.entities.PaymentMethod);
export const Inventory = createEnhancedEntity('inventory', base44.entities.Inventory);
export const ClientPackage = createEnhancedEntity('client_packages', base44.entities.ClientPackage);
export const SubscriptionPlan = createEnhancedEntity('subscription_plans', base44.entities.SubscriptionPlan);
export const ClientSubscription = createEnhancedEntity('client_subscriptions', base44.entities.ClientSubscription);
export const GiftCard = createEnhancedEntity('gift_cards', base44.entities.GiftCard);
export const ClientPackageSession = createEnhancedEntity('client_package_sessions', base44.entities.ClientPackageSession);
export const Receipt = createEnhancedEntity('receipts', base44.entities.Receipt);
export const UnfinishedSale = createEnhancedEntity('unfinished_sales', null); // Removendo dependência do Base44

// Exporta as entidades originais para as demais (que serão migradas gradualmente)
export const ClientAuth = base44.entities.ClientAuth;

// Auth SDK
export const User = base44.auth;

// Entidades apenas Firebase
export class ContractTemplate {
  static collection = 'contract_templates';

  static async create(data) {
    try {
      const templateData = {
        name: data.name,
        description: data.description,
        created_at: new Date().toISOString(),
        sections: data.sections || []
      };

      const collectionRef = collection(db, this.collection);
      const docRef = doc(collectionRef);
      await setDoc(docRef, templateData);
      
      return { id: docRef.id, ...templateData };
    } catch (error) {
      console.error('Error creating contract template:', error);
      throw error;
    }
  }

  static async list() {
    try {
      const collectionRef = collection(db, this.collection);
      const q = query(collectionRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing contract templates:', error);
      throw error;
    }
  }

  static async get(id) {
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
      console.error('Error getting contract template:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const docRef = doc(db, this.collection, id);
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating contract template:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting contract template:', error);
      throw error;
    }
  }
}

export class Contract {
  static collection = 'contracts';

  static async generate(clientId, templateId = null) {
    try {
      let content;
      
      if (templateId) {
        const template = await ContractTemplate.get(templateId);
        content = {
          sections: template.sections
        };
      } else {
        content = {
          sections: [
            {
              title: 'Cláusula Primeira - Do Objeto',
              content: 'O presente contrato tem por objeto a prestação de serviços de estética e bem-estar...'
            },
            {
              title: 'Cláusula Segunda - Do Preço e Forma de Pagamento',
              content: 'Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor acordado...'
            },
            {
              title: 'Cláusula Terceira - Das Obrigações',
              content: 'O CONTRATADO se compromete a prestar os serviços com qualidade e profissionalismo...'
            }
          ]
        };
      }

      const contractData = {
        client_id: clientId,
        template_id: templateId,
        issue_date: new Date().toISOString(),
        status: 'draft',
        content
      };

      const collectionRef = collection(db, this.collection);
      const docRef = doc(collectionRef);
      await setDoc(docRef, contractData);
      
      return { id: docRef.id, ...contractData };
    } catch (error) {
      console.error('Error generating contract:', error);
      throw error;
    }
  }

  static async sendByEmail(contractData) {
    try {
      // Aqui implementaremos o envio por email quando tivermos o serviço configurado
      console.log('Sending contract by email:', contractData);
      return true;
    } catch (error) {
      console.error('Error sending contract by email:', error);
      throw error;
    }
  }

  static async getByClientId(clientId) {
    try {
      const collectionRef = collection(db, this.collection);
      const q = query(
        collectionRef,
        where('client_id', '==', clientId),
        orderBy('issue_date', 'desc')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting contracts:', error);
      throw error;
    }
  }

  static async update(contractId, data) {
    try {
      const docRef = doc(db, this.collection, contractId);
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating contract:', error);
      throw error;
    }
  }

  static async delete(contractId) {
    try {
      const docRef = doc(db, this.collection, contractId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting contract:', error);
      throw error;
    }
  }
}
