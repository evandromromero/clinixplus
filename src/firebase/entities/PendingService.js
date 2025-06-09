import { db } from '../config';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const COLLECTION_NAME = 'pending_services';

/**
 * Classe para gerenciar serviços pendentes de pagamento no Firebase
 */
class PendingService {
  /**
   * Obtém um serviço pendente pelo ID
   * @param {string} id - ID do serviço pendente
   * @returns {Promise<Object|null>} - Dados do serviço pendente ou null se não encontrado
   */
  static async get(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error("Erro ao buscar serviço pendente:", error);
      throw error;
    }
  }
  
  /**
   * Lista todos os serviços pendentes
   * @returns {Promise<Array>} - Lista de serviços pendentes
   */
  static async list() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao listar serviços pendentes:", error);
      throw error;
    }
  }
  
  /**
   * Lista serviços pendentes de um cliente específico
   * @param {string} clientId - ID do cliente
   * @returns {Promise<Array>} - Lista de serviços pendentes do cliente
   */
  static async listByClient(clientId) {
    try {
      const q = query(collection(db, COLLECTION_NAME), where("client_id", "==", clientId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao listar serviços pendentes do cliente:", error);
      throw error;
    }
  }
  
  /**
   * Cria um novo serviço pendente
   * @param {Object} data - Dados do serviço pendente
   * @returns {Promise<Object>} - Serviço pendente criado com ID
   */
  static async create(data) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      return {
        id: docRef.id,
        ...data
      };
    } catch (error) {
      console.error("Erro ao criar serviço pendente:", error);
      throw error;
    }
  }
  
  /**
   * Atualiza um serviço pendente existente
   * @param {string} id - ID do serviço pendente
   * @param {Object} data - Novos dados do serviço pendente
   * @returns {Promise<void>}
   */
  static async update(id, data) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error("Erro ao atualizar serviço pendente:", error);
      throw error;
    }
  }
  
  /**
   * Exclui um serviço pendente
   * @param {string} id - ID do serviço pendente
   * @returns {Promise<void>}
   */
  static async delete(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao excluir serviço pendente:", error);
      throw error;
    }
  }
  
  /**
   * Busca serviço pendente por referência externa (ID do pagamento)
   * @param {string} externalReference - Referência externa do pagamento
   * @returns {Promise<Object|null>} - Serviço pendente encontrado ou null
   */
  static async getByExternalReference(externalReference) {
    try {
      const q = query(collection(db, COLLECTION_NAME), where("external_reference", "==", externalReference));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error("Erro ao buscar serviço pendente por referência externa:", error);
      throw error;
    }
  }
  
  /**
   * Atualiza o status de um serviço pendente
   * @param {string} id - ID do serviço pendente
   * @param {string} status - Novo status (pendente, aprovado, rejeitado, etc)
   * @returns {Promise<void>}
   */
  static async updateStatus(id, status) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { 
        status,
        updated_date: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao atualizar status do serviço pendente:", error);
      throw error;
    }
  }
}

export default PendingService;
