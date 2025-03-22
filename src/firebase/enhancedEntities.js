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

// Lista de entidades que usam exclusivamente o Firebase (sem fallback para Base44)
const FIREBASE_ONLY_ENTITIES = ['financial_transactions', 'employees', 'services', 'appointments', 'payment_methods'];

/**
 * Verifica se uma entidade deve usar apenas o Firebase
 * @param {string} entityName - Nome da entidade
 * @returns {boolean} - True se a entidade deve usar apenas o Firebase
 */
const isFirebaseOnlyEntity = (entityName) => {
  return FIREBASE_ONLY_ENTITIES.includes(entityName);
};

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
        // Gera um ID único se não for fornecido
        if (!data.id) {
          data.id = doc(collection(db, entityName)).id;
        }
        
        // Adiciona metadados
        const now = new Date().toISOString();
        const enrichedData = {
          ...data,
          created_by: "anonymous",
          created_date: now,
          updated_date: now,
          is_sample: false
        };
        
        // Para entidades Firebase-only, salva diretamente no Firebase sem passar pelo Base44
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] Criando documento ${entityName}/${enrichedData.id} (Firebase-only)`);
          
          try {
            await setDoc(doc(db, entityName, enrichedData.id), enrichedData);
            console.log(`[Firebase] Documento ${entityName}/${enrichedData.id} criado com sucesso (Firebase-only)`);
            return enrichedData;
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, 'criar documento');
            throw firebaseError;
          }
        }
        
        // Para outras entidades, primeiro salva no Base44
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
        // Para entidades Firebase-only, atualiza diretamente no Firebase sem passar pelo Base44
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] Atualizando documento ${entityName}/${id} (Firebase-only)`);
          
          try {
            // Obtém o documento atual do Firebase
            const docRef = doc(db, entityName, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
              throw new Error(`Documento ${entityName}/${id} não encontrado`);
            }
            
            // Mescla os dados existentes com os novos
            const currentData = docSnap.data();
            const updatedData = {
              ...currentData,
              ...data,
              updated_date: new Date().toISOString()
            };
            
            // Atualiza no Firebase
            await setDoc(docRef, updatedData);
            console.log(`[Firebase] Documento ${entityName}/${id} atualizado com sucesso (Firebase-only)`);
            return updatedData;
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, `atualizar documento ${id}`);
            throw firebaseError;
          }
        }
        
        // Para outras entidades, primeiro atualiza no Base44
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
        // Para entidades Firebase-only, exclui diretamente do Firebase sem passar pelo Base44
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] Excluindo documento ${entityName}/${id} (Firebase-only)`);
          
          try {
            await deleteDoc(doc(db, entityName, id));
            console.log(`[Firebase] Documento ${entityName}/${id} excluído com sucesso (Firebase-only)`);
            return true;
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, `excluir documento ${id}`);
            throw firebaseError;
          }
        }
        
        // Para outras entidades, primeiro exclui do Base44
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
        // Verificar se devemos forçar atualização a partir da Base44
        const forceRefresh = localStorage.getItem(`force_refresh_${entityName}`);
        if (forceRefresh === 'true' && !isFirebaseOnlyEntity(entityName)) {
          console.log(`[EnhancedEntity] Forçando atualização de ${entityName} a partir da Base44`);
          localStorage.removeItem(`force_refresh_${entityName}`);
          
          // Busca da Base44 e atualiza o Firebase
          console.log(`[Base44] Buscando documentos de ${entityName}...`);
          const items = await baseEntity.list();
          
          // Limpa e recria a coleção no Firebase
          if (useFirebaseCache && items && items.length > 0) {
            try {
              // Primeiro obtém todos os documentos existentes para excluí-los
              const querySnapshot = await getDocs(collection(db, entityName));
              
              // Exclui todos os documentos existentes
              const batch = writeBatch(db);
              querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              
              // Adiciona os novos documentos
              items.forEach(item => {
                if (item && item.id) {
                  const docRef = doc(db, entityName, item.id);
                  batch.set(docRef, item);
                }
              });
              
              await batch.commit();
              console.log(`[Firebase] Coleção ${entityName} recriada com ${items.length} documentos`);
            } catch (firebaseError) {
              handleFirebaseError(firebaseError, entityName, 'recriar coleção');
            }
          }
          
          return items;
        }
        
        // Tenta buscar do Firebase primeiro se estiver habilitado
        if (useFirebaseCache) {
          try {
            const querySnapshot = await getDocs(collection(db, entityName));
            
            if (!querySnapshot.empty) {
              const items = querySnapshot.docs.map(doc => doc.data());
              console.log(`[Firebase] ${items.length} documentos de ${entityName} obtidos do cache`);
              return items;
            } else if (isFirebaseOnlyEntity(entityName)) {
              // Se a entidade é Firebase-only e não há dados, retorna array vazio
              console.log(`[Firebase] Nenhum documento encontrado para ${entityName} (Firebase-only)`);
              return [];
            }
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, 'buscar documentos');
            if (isFirebaseOnlyEntity(entityName)) {
              // Se ocorrer erro e a entidade é Firebase-only, retorna array vazio
              console.log(`[Firebase] Erro ao buscar ${entityName} (Firebase-only), retornando array vazio`);
              return [];
            }
          }
        }
        
        // Se a entidade é Firebase-only, não tenta buscar do Base44
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] ${entityName} é Firebase-only, não buscando do Base44`);
          return [];
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
        
        // Se a entidade é Firebase-only, retorna array vazio em caso de erro
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] Erro ao buscar ${entityName} (Firebase-only), retornando array vazio`);
          return [];
        }
        
        throw error;
      }
    },
    
    /**
     * Filtra documentos com base em critérios
     * @param {Object} criteria - Critérios de filtro
     * @param {Boolean} forceRefresh - Se true, força uma atualização do cache
     * @returns {Promise<Array>} Lista de documentos filtrados
     */
    async filter(criteria, forceRefresh = false) {
      try {
        console.log(`[EnhancedEntity] Filtrando ${entityName} com critérios:`, criteria);
        console.log(`[EnhancedEntity] Forçar atualização: ${forceRefresh}`);
        
        // Para filtros de data, precisamos verificar se estamos lidando com datas no formato ISO
        let isDateFilter = false;
        let dateField = null;
        let dateValue = null;
        
        // Verifica se temos um filtro de data (payment_date, due_date, etc)
        for (const key in criteria) {
          if (key.toLowerCase().includes('date')) {
            isDateFilter = true;
            dateField = key;
            dateValue = criteria[key];
            console.log(`[EnhancedEntity] Detectado filtro de data: ${dateField}=${dateValue}`);
            break;
          }
        }
        
        // Tenta buscar do Firebase primeiro se estiver habilitado
        if (useFirebaseCache) {
          try {
            // Se forceRefresh for true, busca diretamente do Firestore sem usar cache
            const querySnapshot = await getDocs(
              collection(db, entityName), 
              forceRefresh ? { source: "server" } : undefined
            );
            
            if (!querySnapshot.empty) {
              // Filtra os documentos em memória
              let items = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                _id: doc.id, // Garante que temos o ID do documento
                id: doc.data().id || doc.id // Mantém compatibilidade com o código existente
              }));
              
              console.log(`[Firebase] ${items.length} documentos brutos de ${entityName} recuperados`);
              
              // Aplica os filtros em memória
              for (const key in criteria) {
                if (isDateFilter && key === dateField) {
                  // Para filtros de data, compara apenas a parte da data (yyyy-MM-dd)
                  items = items.filter(item => {
                    if (!item[key]) return false;
                    
                    // Extrai apenas a parte da data do formato ISO
                    const itemDate = item[key].split('T')[0];
                    console.log(`[EnhancedEntity] Comparando datas: item[${key}]=${itemDate} vs criteria=${dateValue}`);
                    return itemDate === dateValue;
                  });
                } else if (Array.isArray(criteria[key])) {
                  // Para filtros com arrays (como category: ["abertura_caixa", "fechamento_caixa"])
                  console.log(`[EnhancedEntity] Filtrando por array de valores para ${key}:`, criteria[key]);
                  items = items.filter(item => {
                    if (!item[key]) return false;
                    return criteria[key].includes(item[key]);
                  });
                } else {
                  // Para outros filtros, compara diretamente
                  items = items.filter(item => item[key] === criteria[key]);
                }
              }
              
              console.log(`[Firebase] ${items.length} documentos de ${entityName} filtrados do cache`);
              return items;
            } else if (isFirebaseOnlyEntity(entityName)) {
              // Se a entidade é Firebase-only e não há dados, retorna array vazio
              console.log(`[Firebase] Nenhum documento encontrado para ${entityName} (Firebase-only)`);
              return [];
            }
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, 'filtrar documentos');
            if (isFirebaseOnlyEntity(entityName)) {
              // Se ocorrer erro e a entidade é Firebase-only, retorna array vazio
              console.log(`[Firebase] Erro ao filtrar ${entityName} (Firebase-only), retornando array vazio`);
              return [];
            }
          }
        }
        
        // Se a entidade é Firebase-only, não tenta buscar do Base44
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] ${entityName} é Firebase-only, não buscando do Base44`);
          return [];
        }
        
        // Se não encontrar no Firebase ou ocorrer erro, busca do Base44
        console.log(`[Base44] Filtrando documentos de ${entityName}...`);
        return await baseEntity.filter(criteria);
      } catch (error) {
        console.error(`Erro ao filtrar documentos de ${entityName}:`, error);
        
        // Se a entidade é Firebase-only, retorna array vazio em caso de erro
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] Erro ao filtrar ${entityName} (Firebase-only), retornando array vazio`);
          return [];
        }
        
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
            } else if (isFirebaseOnlyEntity(entityName)) {
              // Se a entidade é Firebase-only e o documento não existe, retorna null
              console.log(`[Firebase] Documento ${entityName}/${id} não encontrado (Firebase-only)`);
              return null;
            }
          } catch (firebaseError) {
            handleFirebaseError(firebaseError, entityName, `buscar documento ${id}`);
            if (isFirebaseOnlyEntity(entityName)) {
              // Se ocorrer erro e a entidade é Firebase-only, retorna null
              console.log(`[Firebase] Erro ao buscar documento ${entityName}/${id} (Firebase-only), retornando null`);
              return null;
            }
          }
        }
        
        // Se a entidade é Firebase-only, não tenta buscar do Base44
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] ${entityName} é Firebase-only, não buscando do Base44`);
          return null;
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
        
        // Se a entidade é Firebase-only, retorna null em caso de erro
        if (isFirebaseOnlyEntity(entityName)) {
          console.log(`[Firebase] Erro ao buscar documento ${entityName}/${id} (Firebase-only), retornando null`);
          return null;
        }
        
        throw error;
      }
    },
    
    // Passa qualquer método não implementado para a entidade original
    __proto__: baseEntity
  };
}
