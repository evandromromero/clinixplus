import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DataLoader({
  fetchData,
  onDataLoaded,
  onError,
  loadingMessage = "Carregando dados...",
  errorMessage = "Ocorreu um erro ao carregar os dados. Tente novamente.",
  retryMessage = "Tentar novamente",
  retryCount = 3,
  initialDelay = 2000,
  backoffFactor = 2,
  loadSimulatedData = null,
  children,
  className = ""
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentRetry, setCurrentRetry] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithRetry = async () => {
    setLoading(true);
    setError(null);
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (attempt > 0) {
          const delayTime = initialDelay * Math.pow(backoffFactor, attempt - 1);
          console.log(`Aguardando ${delayTime}ms antes da tentativa ${attempt}...`);
          
          // Configurar timer para contagem regressiva
          setTimeRemaining(Math.floor(delayTime / 1000));
          setTimerActive(true);
          
          await new Promise(resolve => {
            const timer = setInterval(() => {
              setTimeRemaining(prev => {
                if (prev <= 1) {
                  clearInterval(timer);
                  setTimerActive(false);
                  resolve();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          });
        }
        
        console.log(`Tentativa ${attempt + 1} de ${retryCount + 1}...`);
        const data = await fetchData();
        setLoading(false);
        if (onDataLoaded) onDataLoaded(data);
        return data;
      } catch (error) {
        console.error(`Tentativa ${attempt + 1} falhou:`, error);
        setCurrentRetry(attempt + 1);
        
        const isRateLimit = 
          error?.message?.includes('429') || 
          error?.message?.includes('Rate limit') ||
          error?.toString()?.includes('429');
          
        // Na última tentativa ou em caso de erro que não seja rate limit
        if (attempt === retryCount || !isRateLimit) {
          setLoading(false);
          setError(error);
          if (onError) onError(error);
          
          // Se temos dados simulados para mostrar em caso de falha
          if (loadSimulatedData) {
            console.log("Carregando dados simulados devido a falhas consecutivas");
            const simulatedData = loadSimulatedData();
            if (onDataLoaded) onDataLoaded(simulatedData);
          }
          
          break;
        }
        
        // Se for rate limit, precisamos esperar mais
        if (isRateLimit) {
          setError({ message: "Limite de requisições excedido. Aguardando para tentar novamente..." });
        }
      }
    }
  };

  // Efeito inicial para carregar dados
  useEffect(() => {
    fetchWithRetry();
  }, []);

  // Timer para contagem regressiva
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timerActive, timeRemaining]);

  // Se estamos mostrando o conteúdo filho diretamente
  if (children && !loading && !error) {
    return children;
  }

  if (loading) {
    return (
      <Card className={`bg-blue-50 border-blue-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="animate-spin">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-blue-700 font-medium">{loadingMessage}</p>
                {timerActive && timeRemaining > 0 && (
                  <p className="text-sm text-blue-600">
                    Próxima tentativa em {timeRemaining} segundos...
                  </p>
                )}
              </div>
            </div>
            
            {currentRetry > 0 && (
              <span className="text-xs text-blue-600 px-2 py-1 bg-blue-100 rounded">
                Tentativa {currentRetry}/{retryCount + 1}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-red-50 border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium">{errorMessage}</p>
                <p className="text-sm text-red-600 mt-1">
                  {error.message || "Ocorreu um erro inesperado."}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                size="sm" 
                onClick={fetchWithRetry}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryMessage}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}