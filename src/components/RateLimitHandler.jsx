import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RateLimitHandler({ 
  error, 
  onRetry, 
  allowReload = true,
  showWhenNoError = false,
  className = ''
}) {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(30);
  const [isVisible, setIsVisible] = useState(false);
  
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
                ? `O sistema atingiu o limite de requisições. Aguarde ${remainingTime} segundos para tentar novamente ou clique no botão abaixo.`
                : "Ocorreu um erro ao carregar os dados. Por favor, tente recarregar a página."}
            </p>
          </div>
          
          <div className="flex gap-2">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
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