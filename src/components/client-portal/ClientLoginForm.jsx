import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, User, Key, Eye, EyeOff } from "lucide-react";
import { ClientAuth } from "@/api/entities";
import { Client } from "@/api/entities";

export default function ClientLoginForm({ onSuccess }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("phone"); // "phone", "first_access", "login", "reset_password"
  const [clientData, setClientData] = useState(null);
  const [clientAuthData, setClientAuthData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!phone || phone.length < 8) {
      setError("Por favor, digite um telefone válido");
      return;
    }

    setLoading(true);
    try {
      // Buscar clientes para encontrar correspondência com telefone
      const clients = await Client.list();
      const matchingClient = clients.find(client => 
        client.phone && client.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
      );

      if (!matchingClient) {
        setError("Telefone não encontrado. Verifique o número ou entre em contato.");
        setLoading(false);
        return;
      }

      setClientData(matchingClient);

      // Verificar se cliente já tem autenticação
      const authRecords = await ClientAuth.list();
      let clientAuth = authRecords.find(auth => 
        auth.phone === phone && auth.client_id === matchingClient.id
      );
      
      if (!clientAuth) {
        // Primeiro acesso - criar registro de autenticação
        clientAuth = await ClientAuth.create({
          phone,
          client_id: matchingClient.id,
          first_access: true,
          verified: false
        });
        
        setClientAuthData(clientAuth);
        setStep("first_access");
      } else if (!clientAuth.password) {
        // Tem registro mas ainda não definiu senha
        setClientAuthData(clientAuth);
        setStep("first_access");
      } else {
        // Já tem senha, ir para login
        setClientAuthData(clientAuth);
        setStep("login");
      }
    } catch (err) {
      console.error("Erro ao verificar telefone:", err);
      setError("Erro ao verificar telefone. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!password) {
      setError("Por favor, digite sua senha");
      return;
    }

    setLoading(true);
    try {
      // Simples verificação de senha (em produção, isso seria com hash)
      if (clientAuthData.password !== password) {
        setError("Senha incorreta");
        setLoading(false);
        return;
      }

      // Atualizar último login
      await ClientAuth.update(clientAuthData.id, {
        last_login: new Date().toISOString(),
        verified: true
      });
      
      // Login bem-sucedido
      if (onSuccess) {
        onSuccess({
          client: clientData,
          auth: clientAuthData
        });
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!password) {
      setError("Por favor, crie uma senha");
      return;
    }
    
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      // Atualizar com a nova senha
      await ClientAuth.update(clientAuthData.id, {
        password,
        first_access: false,
        verified: true,
        last_login: new Date().toISOString()
      });
      
      // Buscar registro atualizado
      const updatedAuth = await ClientAuth.list();
      const updated = updatedAuth.find(auth => auth.id === clientAuthData.id);
      
      // Login bem-sucedido
      if (onSuccess) {
        onSuccess({
          client: clientData,
          auth: updated
        });
      }
    } catch (err) {
      console.error("Erro ao criar senha:", err);
      setError("Erro ao criar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    setError("");
    setLoading(true);
    
    try {
      // Gerar código de recuperação de 6 dígitos
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1); // Válido por 1 hora
      
      // Atualizar o auth com o token de reset
      await ClientAuth.update(clientAuthData.id, {
        password_reset_token: resetToken,
        password_reset_expiry: expiry.toISOString()
      });
      
      // Em um ambiente real, enviaríamos por WhatsApp ou SMS
      // Por enquanto, apenas exibimos na tela para teste
      console.log("Código de recuperação (normalmente enviado por WhatsApp):", resetToken);
      
      alert(`Seu código de recuperação é: ${resetToken}\n\nEm um ambiente real, este código seria enviado por WhatsApp para o número: ${phone}`);
      
      setStep("reset_password");
    } catch (err) {
      console.error("Erro ao solicitar redefinição de senha:", err);
      setError("Erro ao solicitar redefinição de senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!resetCode) {
      setError("Por favor, digite o código enviado");
      return;
    }
    
    if (!password) {
      setError("Por favor, crie uma nova senha");
      return;
    }
    
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      // Buscar registro atualizado para verificar o token
      const authRecords = await ClientAuth.list();
      const currentAuth = authRecords.find(auth => auth.id === clientAuthData.id);
      
      if (!currentAuth.password_reset_token || currentAuth.password_reset_token !== resetCode) {
        setError("Código inválido");
        setLoading(false);
        return;
      }
      
      // Verificar se o token expirou
      if (new Date(currentAuth.password_reset_expiry) < new Date()) {
        setError("Código expirado. Solicite um novo código");
        setLoading(false);
        return;
      }
      
      // Atualizar com a nova senha
      await ClientAuth.update(clientAuthData.id, {
        password,
        password_reset_token: null,
        password_reset_expiry: null,
        last_login: new Date().toISOString()
      });
      
      // Buscar registro atualizado
      const updatedAuth = await ClientAuth.list();
      const updated = updatedAuth.find(auth => auth.id === clientAuthData.id);
      
      // Login bem-sucedido
      if (onSuccess) {
        onSuccess({
          client: clientData,
          auth: updated
        });
      }
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      setError("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara de telefone brasileiro
    if (numbers.length <= 11) {
      let formatted = numbers;
      
      if (numbers.length > 2) {
        formatted = `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
      }
      
      if (numbers.length > 7) {
        formatted = `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
      }
      
      return formatted;
    }
    
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const renderPhoneStep = () => (
    <form onSubmit={handlePhoneSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Phone className="h-4 w-4 text-gray-500" />
          </div>
          <Input
            type="text"
            id="phone"
            placeholder="(00) 00000-0000"
            className="pl-10"
            value={phone}
            onChange={handlePhoneChange}
            disabled={loading}
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={loading}
      >
        {loading ? "Verificando..." : "Continuar"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );

  const renderFirstAccessStep = () => (
    <form onSubmit={handleCreatePassword} className="space-y-6">
      <div>
        <div className="p-3 mb-4 bg-blue-50 text-blue-700 rounded-md text-sm">
          Este é seu primeiro acesso. Por favor, crie uma senha para sua conta.
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-password">Crie sua senha</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Key className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                id="create-password"
                placeholder="********"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirme sua senha</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Key className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                placeholder="********"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button 
          type="submit" 
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={loading}
        >
          {loading ? "Criando senha..." : "Criar senha e entrar"}
        </Button>
        
        <Button 
          type="button" 
          variant="ghost"
          onClick={() => setStep("phone")}
          disabled={loading}
        >
          Voltar
        </Button>
      </div>
    </form>
  );

  const renderLoginStep = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <div className="p-2 mb-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              Telefone: <span className="font-medium">{phone}</span>
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Key className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="********"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button 
          type="submit" 
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </Button>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setStep("phone")}
            disabled={loading}
          >
            Trocar telefone
          </Button>
          
          <Button 
            type="button" 
            variant="outline"
            onClick={handleRequestPasswordReset}
            disabled={loading}
          >
            Esqueci a senha
          </Button>
        </div>
      </div>
    </form>
  );

  const renderResetPasswordStep = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div>
        <div className="p-3 mb-4 bg-blue-50 text-blue-700 rounded-md text-sm">
          Um código de verificação foi enviado para seu WhatsApp. Digite o código e crie uma nova senha.
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-code">Código de verificação</Label>
            <Input
              type="text"
              id="reset-code"
              placeholder="000000"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Key className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type={showPassword ? "text" : "password"}
                id="new-password"
                placeholder="********"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirme sua nova senha</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Key className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-new-password"
                placeholder="********"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? 
                  <EyeOff className="h-4 w-4" /> : 
                  <Eye className="h-4 w-4" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button 
          type="submit" 
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={loading}
        >
          {loading ? "Redefinindo senha..." : "Redefinir senha e entrar"}
        </Button>
        
        <Button 
          type="button" 
          variant="ghost"
          onClick={() => setStep("phone")}
          disabled={loading}
        >
          Voltar
        </Button>
      </div>
    </form>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex items-center justify-center mb-6">
        <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
          <User className="h-6 w-6 text-purple-600" />
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-center mb-2">Acesso ao Portal do Cliente</h2>
      <p className="text-gray-500 text-center mb-6">
        {step === "phone" && "Digite seu telefone para acessar"}
        {step === "first_access" && "Crie sua senha para acessar"}
        {step === "login" && "Digite sua senha para acessar"}
        {step === "reset_password" && "Redefina sua senha"}
      </p>
      
      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {step === "phone" && renderPhoneStep()}
      {step === "first_access" && renderFirstAccessStep()}
      {step === "login" && renderLoginStep()}
      {step === "reset_password" && renderResetPasswordStep()}
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Problemas para acessar? Entre em contato conosco.
        </p>
      </div>
    </div>
  );
}