import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  if (isLoading) {
    // Exibir um indicador de carregamento enquanto verifica a autenticação
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0D0F36]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirecionar para a página de login se não estiver autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Renderizar o conteúdo protegido se estiver autenticado
  return children;
};

export default ProtectedRoute;
