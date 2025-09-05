import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, LogIn, AlertCircle, Home, UserIcon } from 'lucide-react';
import SimpleAlert from "@/components/SimpleAlert";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se já existe um usuário logado
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      // Determinar rota de redirecionamento baseada nas permissões
      const checkUserPermissions = async () => {
        try {
          const user = JSON.parse(userData);
          let redirectPath = '/dashboard'; // Padrão
          
          if (user.roleId) {
            const { Role } = await import('@/firebase/entities');
            const roleData = await Role.get(user.roleId);
            
            if (roleData && roleData.permissions) {
              // Se não tem permissão para dashboard, redirecionar para appointments
              if (!roleData.permissions.includes('view_dashboard') && !roleData.permissions.includes('admin')) {
                redirectPath = '/appointments';
              }
            }
          }
          
          navigate(redirectPath);
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
          // Em caso de erro, usar appointments como fallback seguro
          navigate('/appointments');
        }
      };
      
      checkUserPermissions();
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setAlert({
        type: 'error',
        message: 'Por favor, preencha todos os campos.'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Autenticar usuário
      const user = await User.login(email, password);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      // Salvar dados do usuário e token no localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', 'token-simulado-' + Date.now()); // Em produção, usar JWT
      
      // Determinar rota de redirecionamento baseada nas permissões
      let redirectPath = '/dashboard'; // Padrão
      
      if (user.roleId) {
        try {
          const { Role } = await import('@/firebase/entities');
          const roleData = await Role.get(user.roleId);
          
          if (roleData && roleData.permissions) {
            // Se não tem permissão para dashboard, redirecionar para appointments
            if (!roleData.permissions.includes('view_dashboard') && !roleData.permissions.includes('admin')) {
              redirectPath = '/appointments';
            }
          }
        } catch (roleError) {
          console.error('Erro ao carregar permissões do usuário:', roleError);
          // Em caso de erro, usar appointments como fallback seguro
          redirectPath = '/appointments';
        }
      }
      
      // Redirecionar para a rota apropriada
      navigate(redirectPath);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
      
      if (error.message === 'Senha incorreta') {
        errorMessage = 'Senha incorreta. Por favor, tente novamente.';
      } else if (error.message === 'Usuário não encontrado') {
        errorMessage = 'Email não encontrado. Verifique se digitou corretamente.';
      } else if (error.message === 'Usuário inativo') {
        errorMessage = 'Sua conta está inativa. Entre em contato com o administrador.';
      }
      
      setAlert({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      {alert && (
        <SimpleAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <Button variant="ghost" className="mb-2">
              <Home className="mr-2 h-4 w-4" />
              Voltar para o site
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-[#0D0F36]">ClinixPlus</h1>
          <p className="text-gray-500">Sistema de Gestão para Clínicas</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o painel administrativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#0D0F36] hover:bg-[#294380]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-3">
            <p className="text-sm text-gray-500">
              Esqueceu sua senha? Entre em contato com o administrador do sistema.
            </p>
            <div className="border-t w-full pt-3">
              <Link to="/employee-portal" className="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 transition-colors">
                <UserIcon className="mr-1 h-4 w-4" />
                Acessar Portal do Funcionário
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
