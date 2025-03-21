import React, { useState, useEffect } from 'react';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RateLimitHandler({ 
  error, 
  onRetry, 
  allowReload = true,
  showWhenNoError = false,
  className = '',
  useFirebaseCache = true
}) {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(30);
  const [isVisible, setIsVisible] = useState(false);
  const [usingFirebaseCache, setUsingFirebaseCache] = useState(useFirebaseCache);
  
  useEffect(() => {
    const isRateLimit = error && (
      (typeof error === 'string' && error.includes('rate limit')) || 
      (error?.message && error.message.includes('rate limit')) ||
      (error?.message && error.message.includes('429')) ||
      (error?.toString().includes('429'))
    );
    
    setIsRateLimited(isRateLimit);
    setIsVisible(isRateLimit || showWhenNoError);
    
    if (isRateLimit) {
      // Quando ocorre um erro de limite de taxa, ativamos o cache do Firebase
      setUsingFirebaseCache(true);
      
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onRetry) onRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setRemainingTime(30);
    }
  }, [error, onRetry, showWhenNoError]);
  
  if (!isVisible) return null;
  
  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-red-700 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {isRateLimited ? "Limite de requisições excedido" : "Erro de carregamento"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="p-3 rounded-md bg-red-100 border-l-4 border-red-500">
            <p className="text-sm">
              {isRateLimited 
                ? `O sistema atingiu o limite de requisições. ${usingFirebaseCache ? 'Usando dados do cache do Firebase.' : ''} Aguarde ${remainingTime} segundos para tentar novamente ou clique no botão abaixo.`
                : "Ocorreu um erro ao carregar os dados. Por favor, tente recarregar a página."}
            </p>
            
            {isRateLimited && usingFirebaseCache && (
              <div className="mt-2 flex items-center text-xs text-red-700">
                <Database className="w-3 h-3 mr-1" />
                <span>Dados podem não estar totalmente atualizados enquanto estiver usando o cache.</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Tentar novamente
              </Button>
            )}
            
            {allowReload && (
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Recarregar página
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}