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
import { Role } from "@/firebase/entities";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  UserCog
} from "lucide-react";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    { id: "view_reports", name: "Visualizar Relatórios", description: "Acesso aos relatórios do sistema" }
  ];

  useEffect(() => {
    loadRoles();
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

  const handleCreateRole = async () => {
    try {
      if (isEditing && selectedRole) {
        await Role.update(selectedRole.id, newRole);
      } else {
        await Role.create(newRole);
      }
      setShowRoleDialog(false);
      resetForm();
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

  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Cargos e Permissões</h2>
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
                    {availablePermissions.filter(p => p.id !== 'admin').map((permission) => (
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
      <RateLimitHandler />
    </div>
  );
}