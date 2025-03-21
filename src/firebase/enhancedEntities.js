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
  writeBatch,
  enableIndexedDbPersistence
} from 'firebase/firestore';

// Habilita persistência offline para melhorar a experiência do usuário
// e reduzir o número de requisições ao Firestore
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Persistência offline não pôde ser habilitada. Múltiplas abas abertas.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Navegador não suporta persistência offline.');
    }
  });
} catch (e) {
  console.warn('[Firebase] Erro ao configurar persistência:', e);
}

// Flag para controlar se devemos tentar usar o Firebase
// Se ocorrerem muitos erros de permissão, desativamos temporariamente
let useFirebaseCache = true;
let permissionErrorCount = 0;
const MAX_PERMISSION_ERRORS = 5;

// Função para verificar e gerenciar erros de permissão
const handleFirebaseError = (error, entityName, operation) => {
  console.error(`[Firebase] Erro ao ${operation} ${entityName}:`, error);
  
  // Verifica se é um erro de permissão
  if (error && 
      (error.code === 'permission-denied' || 
       (error.toString && error.toString().includes('permission-denied')))) {
    permissionErrorCount++;
    
    // Se tivermos muitos erros de permissão, desativamos o Firebase temporariamente
    if (permissionErrorCount >= MAX_PERMISSION_ERRORS) {
      console.warn(`[Firebase] Muitos erros de permissão (${permissionErrorCount}). Desativando cache temporariamente.`);
      useFirebaseCache = false;
      
      // Reativamos após 5 minutos
      setTimeout(() => {
        useFirebaseCache = true;
        permissionErrorCount = 0;
        console.log('[Firebase] Cache reativado após período de espera.');
      }, 5 * 60 * 1000);
    }
  }
};

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
        if (useFirebaseCache) {
          try {
            await setDoc(doc(db, entityName, result.id), result);
            console.log(`[Firebase] Documento ${entityName}/${result.id} criado com sucesso`);
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, 'criar documento');
          }
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
        if (useFirebaseCache) {
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
            handleFirebaseError(firebaseError, entityName, `atualizar documento ${id}`);
          }
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
        if (useFirebaseCache) {
          try {
            await deleteDoc(doc(db, entityName, id));
            console.log(`[Firebase] Documento ${entityName}/${id} excluído com sucesso`);
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, `excluir documento ${id}`);
          }
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
        // Tenta buscar do Firebase primeiro se estiver habilitado
        if (useFirebaseCache) {
          try {
            const querySnapshot = await getDocs(collection(db, entityName));
            
            if (!querySnapshot.empty) {
              const items = querySnapshot.docs.map(doc => doc.data());
              console.log(`[Firebase] ${items.length} documentos de ${entityName} obtidos do cache`);
              return items;
            }
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, 'buscar documentos');
          }
        }
        
        // Se não encontrar no Firebase ou ocorrer erro, busca do Base44
        console.log(`[Base44] Buscando documentos de ${entityName}...`);
        const items = await baseEntity.list();
        
        // Salva no Firebase para futuras consultas
        if (useFirebaseCache && items && items.length > 0) {
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
            handleFirebaseError(firebaseError, entityName, 'salvar documentos no cache');
          }
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
        if (useFirebaseCache) {
          try {
            const docRef = doc(db, entityName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              console.log(`[Firebase] Documento ${entityName}/${id} obtido do cache`);
              return docSnap.data();
            }
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, `buscar documento ${id}`);
          }
        }
        
        // Se não encontrar no Firebase ou ocorrer erro, busca do Base44
        console.log(`[Base44] Buscando documento ${entityName}/${id}...`);
        const item = await baseEntity.get(id);
        
        // Salva no Firebase para futuras consultas
        if (useFirebaseCache && item && item.id) {
          try {
            await setDoc(doc(db, entityName, id), item);
            console.log(`[Firebase] Documento ${entityName}/${id} salvo no cache`);
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, `salvar documento ${id} no cache`);
          }
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
