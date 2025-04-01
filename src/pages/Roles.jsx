import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SystemConfig } from "@/api/entities";
import { Role } from "@/firebase/entities";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  UserCog,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  // Inicializar com um array vazio para garantir que nenhuma permissão seja mostrada até que as permissões habilitadas sejam carregadas
  const [enabledPermissions, setEnabledPermissions] = useState([]);
  const [showPermissionsManagerDialog, setShowPermissionsManagerDialog] = useState(false);
  
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: ["manage_clients", "view_reports"],
    is_default: false,
    color: "#60a5fa",
    department: "",
    active: true
  });

  const availablePermissions = [
    { id: "admin", name: "Administrador", description: "Acesso total ao sistema" },
    { id: "manage_clients", name: "Gerenciar Clientes", description: "Cadastrar, editar e excluir clientes" },
    { id: "manage_employees", name: "Gerenciar Funcionários", description: "Cadastrar, editar e excluir funcionários" },
    { id: "manage_services", name: "Gerenciar Serviços", description: "Cadastrar, editar e excluir serviços" },
    { id: "manage_products", name: "Gerenciar Produtos", description: "Cadastrar, editar e excluir produtos" },
    { id: "manage_appointments", name: "Gerenciar Agendamentos", description: "Criar e gerenciar agendamentos" },
    { id: "manage_sales", name: "Gerenciar Vendas", description: "Registrar e gerenciar vendas" },
    { id: "manage_finances", name: "Gerenciar Finanças", description: "Acesso ao módulo financeiro" },
    { id: "view_reports", name: "Visualizar Relatórios", description: "Acesso aos relatórios do sistema" },
    { id: "manage_gift_cards", name: "Gerenciar Gift Cards", description: "Criar e gerenciar gift cards" },
    { id: "manage_subscriptions", name: "Gerenciar Assinaturas", description: "Gerenciar planos e assinaturas" },
    { id: "manage_suppliers", name: "Gerenciar Fornecedores", description: "Cadastrar, editar e excluir fornecedores" },
    { id: "view_birthdays", name: "Visualizar Aniversariantes", description: "Acesso à lista de aniversariantes" },
    { id: "manage_client_returns", name: "Gerenciar Retornos", description: "Gerenciar retornos de clientes" },
    { id: "manage_roles", name: "Gerenciar Cargos", description: "Configurar cargos e permissões" },
    { id: "manage_payment_methods", name: "Gerenciar Formas de Pagamento", description: "Configurar métodos de pagamento" },
    { id: "manage_contract_templates", name: "Gerenciar Modelos de Contrato", description: "Criar e editar modelos de contrato" },
    { id: "manage_anamnese_templates", name: "Gerenciar Modelos de Anamnese", description: "Criar e editar modelos de anamnese" },
    { id: "manage_inventory", name: "Gerenciar Estoque", description: "Controlar entradas e saídas de estoque" },
    { id: "manage_packages", name: "Gerenciar Pacotes", description: "Criar e editar pacotes de serviços" },
    { id: "manage_client_packages", name: "Gerenciar Pacotes de Clientes", description: "Atribuir e gerenciar pacotes de clientes" },
    { id: "manage_accounts_payable", name: "Gerenciar Contas a Pagar", description: "Registrar e gerenciar contas a pagar" },
    { id: "manage_accounts_receivable", name: "Gerenciar Contas a Receber", description: "Registrar e gerenciar contas a receber" },
    { id: "manage_cash_register", name: "Gerenciar Caixa", description: "Abrir, fechar e gerenciar o caixa" },
    { id: "manage_settings", name: "Gerenciar Configurações", description: "Acesso às configurações gerais do sistema" },
    { id: "manage_data", name: "Gerenciar Dados", description: "Acesso ao gerenciador de dados (backup, restauração, etc.)" },
    { id: "view_dashboard", name: "Visualizar Dashboard", description: "Acesso ao painel principal com indicadores" },
    { id: "manage_users", name: "Gerenciar Usuários", description: "Cadastrar, editar e excluir usuários do sistema" }
  ];

  useEffect(() => {
    loadRoles();
    loadCurrentUser();
    loadEnabledPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      const roleData = await Role.list();
      setRoles(roleData);
      
      // Verifica se existe o cargo Administrador Geral
      if (roleData.length === 0 || !roleData.some(role => role.name === "Administrador Geral")) {
        await createDefaultAdminRole();
      }
    } catch (error) {
      console.error("Erro ao carregar cargos:", error);
    }
  };

  const createDefaultAdminRole = async () => {
    try {
      await Role.create({
        name: "Administrador Geral",
        description: "Acesso completo a todas as funcionalidades do sistema",
        permissions: availablePermissions.map(p => p.id),
        is_default: true,
        color: "#0D0F36",
        department: "Administração",
        active: true
      });
      loadRoles();
    } catch (error) {
      console.error("Erro ao criar cargo padrão:", error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      // Obter dados do usuário logado do localStorage
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData) {
        setCurrentUser(userData);
        
        // Carregar cargo do usuário
        if (userData.roleId) {
          const roleData = await Role.get(userData.roleId);
          if (roleData) {
            setUserRole(roleData);
            
            // Verificar se o usuário é um administrador geral
            const isAdmin = roleData.name === "Administrador Geral" || 
                           (roleData.permissions && roleData.permissions.includes('admin'));
            setIsAdminUser(isAdmin);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  };

  const loadEnabledPermissions = async () => {
    try {
      // Carregar permissões habilitadas do sistema
      const enabled = await SystemConfig.get('enabled_permissions');
      
      // Se não existir configuração, habilitar todas as permissões por padrão
      if (!enabled) {
        const allPermissionIds = availablePermissions.map(p => p.id);
        await SystemConfig.set('enabled_permissions', allPermissionIds);
        setEnabledPermissions(allPermissionIds);
      } else {
        console.log("Permissões habilitadas carregadas:", enabled);
        setEnabledPermissions(enabled);
      }
    } catch (error) {
      console.error("Erro ao carregar permissões habilitadas:", error);
      // Em caso de erro, habilitar todas as permissões por padrão
      const allPermissionIds = availablePermissions.map(p => p.id);
      setEnabledPermissions(allPermissionIds);
    }
  };

  const handleCreateRole = async () => {
    try {
      // Verificar se o usuário está tentando criar/editar um cargo de Administrador Geral sem ser admin
      if (newRole.name === "Administrador Geral" && !isAdminUser) {
        alert("Apenas administradores podem criar ou editar o cargo de Administrador Geral");
        return;
      }
      
      if (isEditing && selectedRole) {
        // Atualizar cargo existente
        await Role.update(selectedRole.id, newRole);
      } else {
        // Criar novo cargo
        await Role.create(newRole);
      }
      
      setShowRoleDialog(false);
      loadRoles();
    } catch (error) {
      console.error("Erro ao salvar cargo:", error);
    }
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setNewRole({
      name: role.name || "",
      description: role.description || "",
      permissions: role.permissions || [],
      is_default: role.is_default || false,
      color: role.color || "#60a5fa",
      department: role.department || "",
      active: role.active !== false
    });
    setIsEditing(true);
    setShowRoleDialog(true);
  };

  const handleDeleteRole = async (roleId) => {
    try {
      // Verificar se o cargo a ser excluído é o Administrador Geral
      const roleToDelete = roles.find(r => r.id === roleId);
      
      // Impedir exclusão do Administrador Geral por não-admins
      if (roleToDelete && roleToDelete.name === "Administrador Geral" && !isAdminUser) {
        alert("Apenas administradores podem excluir o cargo de Administrador Geral");
        return;
      }
      
      // Impedir exclusão de cargos padrão
      if (roleToDelete && roleToDelete.is_default) {
        alert("Não é possível excluir um cargo padrão do sistema");
        return;
      }
      
      await Role.delete(roleId);
      loadRoles();
    } catch (error) {
      console.error("Erro ao excluir cargo:", error);
    }
  };

  const resetForm = () => {
    setNewRole({
      name: "",
      description: "",
      permissions: ["manage_clients", "view_reports"],
      is_default: false,
      color: "#60a5fa",
      department: "",
      active: true
    });
    setSelectedRole(null);
    setIsEditing(false);
  };

  const togglePermission = (permissionId) => {
    setNewRole(prev => {
      const permissions = [...prev.permissions];
      if (permissions.includes(permissionId)) {
        return {...prev, permissions: permissions.filter(id => id !== permissionId)};
      } else {
        return {...prev, permissions: [...permissions, permissionId]};
      }
    });
  };

  const handleToggleAdmin = (checked) => {
    setNewRole(prev => {
      if (checked) {
        // Se admin for selecionado, incluir todas as permissões
        return {
          ...prev, 
          permissions: availablePermissions.map(p => p.id)
        };
      } else {
        // Se admin for desmarcado, remover apenas a permissão admin
        return {
          ...prev, 
          permissions: prev.permissions.filter(p => p !== "admin")
        };
      }
    });
  };

  const handleSaveEnabledPermissions = async () => {
    try {
      console.log("Salvando permissões habilitadas:", enabledPermissions);
      await SystemConfig.set('enabled_permissions', enabledPermissions);
      setShowPermissionsManagerDialog(false);
      
      // Recarregar as permissões para garantir que as alterações foram aplicadas
      await loadEnabledPermissions();
    } catch (error) {
      console.error("Erro ao salvar permissões habilitadas:", error);
    }
  };

  const togglePermissionVisibility = (permissionId) => {
    setEnabledPermissions(prevPermissions => {
      if (prevPermissions.includes(permissionId)) {
        // Se a permissão já está habilitada, desabilite-a
        return prevPermissions.filter(id => id !== permissionId);
      } else {
        // Se a permissão está desabilitada, habilite-a
        return [...prevPermissions, permissionId];
      }
    });
  };

  const toggleAllPermissions = (enable) => {
    if (enable) {
      // Habilitar todas as permissões
      const allPermissionIds = availablePermissions.map(p => p.id);
      setEnabledPermissions(allPermissionIds);
    } else {
      // Desabilitar todas as permissões
      setEnabledPermissions([]);
    }
  };

  const filteredRoles = roles.filter(role => {
    // Verificar se o cargo é "Administrador Geral" e se o usuário não é admin
    if (role.name === "Administrador Geral" && !isAdminUser) {
      return false;
    }
    
    // Filtrar por termo de busca
    return (
      role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Cargos e Permissões</h2>
        <div className="flex gap-2">
          {isAdminUser && (
            <Button 
              onClick={() => setShowPermissionsManagerDialog(true)}
              variant="outline"
              className="flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar Permissões
            </Button>
          )}
          <Button 
            onClick={() => {
              resetForm();
              setShowRoleDialog(true);
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cargo
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar cargos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Cargos</CardTitle>
          <CardDescription>
            Gerencie os cargos e permissões da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Padrão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: role.color || '#60a5fa' }}
                      />
                      <div className="font-medium">{role.name}</div>
                    </div>
                    {role.description && (
                      <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                    )}
                  </TableCell>
                  <TableCell>{role.department || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.includes('admin') ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          Admin
                        </Badge>
                      ) : (
                        <>
                          {role.permissions?.includes('manage_clients') && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Clientes
                            </Badge>
                          )}
                          {role.permissions?.includes('manage_employees') && (
                            <Badge className="bg-green-100 text-green-800">
                              Funcionários
                            </Badge>
                          )}
                          {role.permissions?.includes('manage_finances') && (
                            <Badge className="bg-amber-100 text-amber-800">
                              Finanças
                            </Badge>
                          )}
                          {role.permissions?.length > 3 && (
                            <Badge className="bg-gray-100 text-gray-800">
                              +{role.permissions.length - 3}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.is_default ? (
                      <Badge className="bg-indigo-100 text-indigo-800">
                        Padrão
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.active !== false ? (
                      <span className="inline-flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-600">
                        <XCircle className="w-4 h-4 mr-1" />
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditRole(role)}
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                      {!role.is_default && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRoles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum cargo encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog 
        open={showRoleDialog} 
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowRoleDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="name">Nome do Cargo*</Label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {['#0D0F36', '#294380', '#69D2CD', '#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#94a3b8'].map(color => (
                    <div 
                      key={color}
                      className={`h-8 w-full rounded-md cursor-pointer border-2 ${
                        newRole.color === color ? 'border-gray-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewRole({...newRole, color: color})}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={newRole.department}
                  onChange={(e) => setNewRole({...newRole, department: e.target.value})}
                />
              </div>
              
              <div className="flex items-center justify-end space-x-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newRole.active}
                    onCheckedChange={(checked) => setNewRole({...newRole, active: checked})}
                  />
                  <Label htmlFor="active">Cargo Ativo</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={newRole.is_default}
                    onCheckedChange={(checked) => setNewRole({...newRole, is_default: checked})}
                  />
                  <Label htmlFor="is_default">Cargo Padrão</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newRole.description}
                onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                placeholder="Descreva as responsabilidades deste cargo..."
                rows={3}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Permissões</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="admin-permission"
                    checked={newRole.permissions.includes('admin')}
                    onCheckedChange={handleToggleAdmin}
                  />
                  <Label htmlFor="admin-permission" className="font-medium text-purple-700 flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    Acesso de Administrador (todas as permissões)
                  </Label>
                </div>
              </div>
              
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {availablePermissions
                      .filter(p => {
                        // Sempre mostrar a permissão de admin separadamente
                        if (p.id === 'admin') return false; // Já está sendo mostrada separadamente
                        
                        // Para administradores gerais, mostrar todas as permissões
                        const userIsAdminGeral = userRole && userRole.name === "Administrador Geral";
                        if (userIsAdminGeral) return true;
                        
                        // Para usuários normais, mostrar apenas as permissões habilitadas
                        return enabledPermissions.includes(p.id);
                      })
                      .map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`permission-${permission.id}`}
                          checked={newRole.permissions.includes(permission.id)}
                          disabled={newRole.permissions.includes('admin')}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div>
                          <Label 
                            htmlFor={`permission-${permission.id}`}
                            className="font-medium"
                          >
                            {permission.name}
                          </Label>
                          <p className="text-xs text-gray-500">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowRoleDialog(false);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRole} className="bg-purple-600 hover:bg-purple-700">
              {isEditing ? "Salvar Alterações" : "Criar Cargo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showPermissionsManagerDialog} 
        onOpenChange={(open) => setShowPermissionsManagerDialog(open)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Permissões</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Permissões Habilitadas</Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleAllPermissions(true)}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleAllPermissions(false)}
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    {availablePermissions.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`permission-${permission.id}`}
                          checked={enabledPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermissionVisibility(permission.id)}
                        />
                        <div>
                          <Label 
                            htmlFor={`permission-${permission.id}`}
                            className="font-medium"
                          >
                            {permission.name}
                          </Label>
                          <p className="text-xs text-gray-500">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsManagerDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEnabledPermissions} className="bg-purple-600 hover:bg-purple-700">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}