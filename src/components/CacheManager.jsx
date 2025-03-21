import { useState, useEffect } from 'react';

// Contador global para controlar o número máximo de requisições
let apiRequestCount = 0;
let lastResetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 45; // Limite conservador para evitar 429

export default function useCacheManager(entityName, entityApi, defaultData = [], expirationTime = 3600000) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Função para resetar contador se passou tempo suficiente
  const checkAndResetCounter = () => {
    const now = Date.now();
    if (now - lastResetTime > 60000) { // 1 minuto
      apiRequestCount = 0;
      lastResetTime = now;
      return true;
    }
    return false;
  };

  // Função para verificar se podemos fazer uma nova requisição
  const canMakeRequest = () => {
    checkAndResetCounter();
    return apiRequestCount < MAX_REQUESTS_PER_MINUTE;
  };

  // Função para carregar dados com tratamento de cache
  const fetchData = async (force = false) => {
    try {
      setError(null);
      
      // Verifica se temos dados em cache
      const cacheKey = `entity_${entityName}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData && !force) {
        try {
          const { data: storedData, timestamp } = JSON.parse(cachedData);
          const isExpired = Date.now() - timestamp > expirationTime;
          
          if (!isExpired && Array.isArray(storedData)) {
            console.log(`Usando dados em cache para ${entityName}`);
            setData(storedData);
            setIsLoading(false);
            setLastUpdated(new Date(timestamp));
            
            // Se o cache não está expirado, faz uma atualização silenciosa apenas se possível
            if (canMakeRequest()) {
              updateSilently();
            }
            
            return storedData;
          }
        } catch (e) {
          console.warn(`Erro ao ler cache de ${entityName}:`, e);
          localStorage.removeItem(cacheKey);
        }
      }
      
      // Se não podemos fazer uma requisição agora, usa dados padrão ou vazio
      if (!canMakeRequest()) {
        console.warn(`Limite de requisições atingido. Usando dados padrão para ${entityName}`);
        setData(defaultData);
        setIsLoading(false);
        setError({ message: "Limite de requisições excedido. Usando dados temporários." });
        return defaultData;
      }
      
      // Faz a requisição API
      apiRequestCount++;
      const result = await entityApi.list();
      
      // Salva os dados em cache
      if (result && Array.isArray(result)) {
        const cacheData = {
          data: result,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        
        setData(result);
        setLastUpdated(new Date());
      } else {
        throw new Error("Dados inválidos retornados");
      }
      
      setIsLoading(false);
      return result;
    } catch (error) {
      console.error(`Erro ao carregar ${entityName}:`, error);
      setError(error);
      setIsLoading(false);
      
      // Tenta usar dados em cache mesmo se expirados
      const cacheKey = `entity_${entityName}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const { data: storedData } = JSON.parse(cachedData);
          if (Array.isArray(storedData)) {
            console.log(`Usando cache expirado para ${entityName} devido a erro`);
            setData(storedData);
            return storedData;
          }
        } catch (e) {
          console.warn(`Erro ao ler cache expirado de ${entityName}:`, e);
        }
      }
      
      setData(defaultData);
      return defaultData;
    }
  };
  
  // Função para atualizar dados em segundo plano sem alterar UI
  const updateSilently = async () => {
    try {
      if (!canMakeRequest()) return;
      
      apiRequestCount++;
      const result = await entityApi.list();
      
      if (result && Array.isArray(result)) {
        const cacheKey = `entity_${entityName}`;
        const cacheData = {
          data: result,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        
        // Atualiza os dados silenciosamente
        setData(result);
        setLastUpdated(new Date());
        console.log(`Atualização silenciosa de ${entityName} concluída`);
      }
    } catch (error) {
      console.warn(`Erro na atualização silenciosa de ${entityName}:`, error);
      // Não altera o estado em caso de erro
    }
  };
  
  // Função para limpar o cache
  const clearCache = () => {
    const cacheKey = `entity_${entityName}`;
    localStorage.removeItem(cacheKey);
    setData([]);
    setIsLoading(true);
    fetchData(true);
  };
  
  // Carrega dados na montagem
  useEffect(() => {
    fetchData();
  }, []);
  
  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh: () => fetchData(true),
    clearCache,
    updateSilently
  };
}