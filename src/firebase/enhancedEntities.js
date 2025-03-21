// Camada de abstração para entidades que usa Firebase como cache
import { db } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';

/**
 * Cria uma versão aprimorada de uma entidade do Base44 que também salva no Firebase
 * @param {string} entityName - Nome da coleção no Firestore (ex: 'clients')
 * @param {Object} baseEntity - Entidade original do Base44
 * @returns {Object} Entidade aprimorada com suporte a Firebase
 */
export function createEnhancedEntity(entityName, baseEntity) {
  return {
    // Mantém a referência à entidade original
    _baseEntity: baseEntity,

    /**
     * Cria um novo documento
     * @param {Object} data - Dados para criar
     * @returns {Promise<Object>} Documento criado
     */
    async create(data) {
      try {
        // Primeiro salva no Base44
        const result = await baseEntity.create(data);
        
        // Depois salva no Firebase (não bloqueia a operação principal)
        try {
          await setDoc(doc(db, entityName, result.id), result);
          console.log(`[Firebase] Documento ${entityName}/${result.id} criado com sucesso`);
        } catch (firebaseError) {
          console.error(`[Firebase] Erro ao criar documento ${entityName}:`, firebaseError);
          // Não propaga o erro do Firebase para não afetar a operação principal
        }
        
        return result;
      } catch (error) {
        console.error(`Erro ao criar ${entityName}:`, error);
        throw error;
      }
    },
    
    /**
     * Atualiza um documento existente
     * @param {string} id - ID do documento
     * @param {Object} data - Dados para atualizar
     * @returns {Promise<Object>} Documento atualizado
     */
    async update(id, data) {
      try {
        // Primeiro atualiza no Base44
        const result = await baseEntity.update(id, data);
        
        // Depois atualiza no Firebase
        try {
          // Obtém o documento atual do Firebase (se existir)
          const docRef = doc(db, entityName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Mescla os dados existentes com os novos
            await setDoc(docRef, { ...docSnap.data(), ...result }, { merge: true });
          } else {
            // Se não existir, cria um novo
            await setDoc(docRef, result);
          }
          
          console.log(`[Firebase] Documento ${entityName}/${id} atualizado com sucesso`);
        } catch (firebaseError) {
          console.error(`[Firebase] Erro ao atualizar documento ${entityName}/${id}:`, firebaseError);
        }
        
        return result;
      } catch (error) {
        console.error(`Erro ao atualizar ${entityName}/${id}:`, error);
        throw error;
      }
    },
    
    /**
     * Exclui um documento
     * @param {string} id - ID do documento
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async delete(id) {
      try {
        // Primeiro exclui do Base44
        await baseEntity.delete(id);
        
        // Depois exclui do Firebase
        try {
          await deleteDoc(doc(db, entityName, id));
          console.log(`[Firebase] Documento ${entityName}/${id} excluído com sucesso`);
        } catch (firebaseError) {
          console.error(`[Firebase] Erro ao excluir documento ${entityName}/${id}:`, firebaseError);
        }
        
        return true;
      } catch (error) {
        console.error(`Erro ao excluir ${entityName}/${id}:`, error);
        throw error;
      }
    },
    
    /**
     * Lista todos os documentos
     * @returns {Promise<Array>} Lista de documentos
     */
    async list() {
      try {
        // Tenta buscar do Firebase primeiro
        try {
          const querySnapshot = await getDocs(collection(db, entityName));
          
          if (!querySnapshot.empty) {
            const items = querySnapshot.docs.map(doc => doc.data());
            console.log(`[Firebase] ${items.length} documentos de ${entityName} obtidos do cache`);
            return items;
          }
        } catch (firebaseError) {
          console.warn(`[Firebase] Erro ao buscar documentos de ${entityName}:`, firebaseError);
        }
        
        // Se não encontrar no Firebase ou ocorrer erro, busca do Base44
        console.log(`[Base44] Buscando documentos de ${entityName}...`);
        const items = await baseEntity.list();
        
        // Salva no Firebase para futuras consultas
        try {
          const batch = writeBatch(db);
          
          items.forEach(item => {
            if (item && item.id) {
              const docRef = doc(db, entityName, item.id);
              batch.set(docRef, item);
            }
          });
          
          await batch.commit();
          console.log(`[Firebase] ${items.length} documentos de ${entityName} salvos no cache`);
        } catch (firebaseError) {
          console.error(`[Firebase] Erro ao salvar documentos de ${entityName} no cache:`, firebaseError);
        }
        
        return items;
      } catch (error) {
        console.error(`Erro ao listar documentos de ${entityName}:`, error);
        throw error;
      }
    },
    
    /**
     * Obtém um documento pelo ID
     * @param {string} id - ID do documento
     * @returns {Promise<Object>} Documento
     */
    async get(id) {
      if (!id) {
        throw new Error(`ID inválido para ${entityName}`);
      }
      
      try {
        // Tenta buscar do Firebase primeiro
        try {
          const docRef = doc(db, entityName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log(`[Firebase] Documento ${entityName}/${id} obtido do cache`);
            return docSnap.data();
          }
        } catch (firebaseError) {
          console.warn(`[Firebase] Erro ao buscar documento ${entityName}/${id}:`, firebaseError);
        }
        
        // Se não encontrar no Firebase ou ocorrer erro, busca do Base44
        console.log(`[Base44] Buscando documento ${entityName}/${id}...`);
        const item = await baseEntity.get(id);
        
        // Salva no Firebase para futuras consultas
        try {
          if (item && item.id) {
            await setDoc(doc(db, entityName, id), item);
            console.log(`[Firebase] Documento ${entityName}/${id} salvo no cache`);
          }
        } catch (firebaseError) {
          console.error(`[Firebase] Erro ao salvar documento ${entityName}/${id} no cache:`, firebaseError);
        }
        
        return item;
      } catch (error) {
        console.error(`Erro ao obter documento ${entityName}/${id}:`, error);
        throw error;
      }
    },
    
    // Passa qualquer método não implementado para a entidade original
    __proto__: baseEntity
  };
}
