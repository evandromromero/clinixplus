import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Mail,
  Shield,
  User as UserIcon,
  Eye,
  EyeOff
} from "lucide-react";
import { User, Role } from "@/api/entities";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SimpleAlert from "@/components/SimpleAlert";
import { Badge } from "@/components/ui/badge";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    user: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const itemsPerPage = 10;

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    active: true
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadCurrentUser();
  }, []);

  const loadUsers = async () => {
    try {
      const userData = await User.list();
      setUsers(userData);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      setAlert({
        type: "error",
        message: "Erro ao carregar usuários: " + error.message
      });
    }
  };

  const loadRoles = async () => {
    try {
      const roleData = await Role.list();
      setRoles(roleData);
    } catch (error) {
      console.error("Erro ao carregar cargos:", error);
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

  const handleCreateUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password || !newUser.roleId) {
        setAlert({
          type: "error",
          message: "Por favor, preencha todos os campos obrigatórios."
        });
        return;
      }

      await User.create(newUser);
      setAlert({
        type: "success",
        message: "Usuário criado com sucesso!"
      });
      setShowNewUserDialog(false);
      resetNewUserForm();
      loadUsers();
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      setAlert({
        type: "error",
        message: "Erro ao criar usuário: " + error.message
      });
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!selectedUser.id) {
        setAlert({
          type: "error",
          message: "ID do usuário não encontrado."
        });
        return;
      }

      // Verificar se o usuário sendo editado tem cargo de Administrador Geral
      const userToEdit = users.find(u => u.id === selectedUser.id);
      if (userToEdit) {
        const userRole = roles.find(r => r.id === userToEdit.roleId);
        const isUserAdmin = userRole && userRole.name === "Administrador Geral";
        
        // Se o usuário sendo editado for Administrador Geral e o usuário atual não for admin
        if (isUserAdmin && !isAdminUser) {
          setAlert({
            type: "error",
            message: "Apenas usuários com cargo de Administrador Geral podem editar outros Administradores Gerais."
          });
          return;
        }
      }

      // Não enviar a senha se estiver vazia (manter a senha atual)
      const dataToUpdate = { ...selectedUser };
      if (!dataToUpdate.password) {
        delete dataToUpdate.password;
      }

      await User.update(selectedUser.id, dataToUpdate);
      setAlert({
        type: "success",
        message: "Usuário atualizado com sucesso!"
      });
      setShowNewUserDialog(false);
      loadUsers();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      setAlert({
        type: "error",
        message: "Erro ao atualizar usuário: " + error.message
      });
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!deleteConfirmation.user || !deleteConfirmation.user.id) {
        setAlert({
          type: "error",
          message: "ID do usuário não encontrado."
        });
        return;
      }

      await User.delete(deleteConfirmation.user.id);
      setAlert({
        type: "success",
        message: "Usuário excluído com sucesso!"
      });
      setDeleteConfirmation({ isOpen: false, user: null });
      loadUsers();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      setAlert({
        type: "error",
        message: "Erro ao excluir usuário: " + error.message
      });
    }
  };

  const resetNewUserForm = () => {
    setNewUser({
      name: "",
      email: "",
      password: "",
      roleId: "",
      active: true
    });
  };

  const handleEditUser = (user) => {
    // Verificar se o usuário a ser editado tem cargo de Administrador Geral
    const userRole = roles.find(r => r.id === user.roleId);
    const isUserAdmin = userRole && userRole.name === "Administrador Geral";
    
    // Se o usuário a ser editado for Administrador Geral e o usuário atual não for admin
    if (isUserAdmin && !isAdminUser) {
      setAlert({
        type: "error",
        message: "Apenas usuários com cargo de Administrador Geral podem editar outros Administradores Gerais."
      });
      return;
    }
    
    setSelectedUser(user);
    setIsEditing(true);
    setShowNewUserDialog(true);
  };

  const handleConfirmDeleteUser = (user) => {
    // Verificar se o usuário a ser excluído tem cargo de Administrador Geral
    const userRole = roles.find(r => r.id === user.roleId);
    const isUserAdmin = userRole && userRole.name === "Administrador Geral";
    
    // Se o usuário a ser excluído for Administrador Geral e o usuário atual não for admin
    if (isUserAdmin && !isAdminUser) {
      setAlert({
        type: "error",
        message: "Apenas usuários com cargo de Administrador Geral podem excluir outros Administradores Gerais."
      });
      return;
    }
    
    setDeleteConfirmation({
      isOpen: true,
      user
    });
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : "Sem cargo";
  };

  const getRoleBadge = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return null;
    
    return (
      <Badge style={{ backgroundColor: role.color || "#888" }}>
        {role.name}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {alert && (
        <SimpleAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Usuários do Sistema</h1>
        <Button onClick={() => {
          setIsEditing(false);
          resetNewUserForm();
          setShowNewUserDialog(true);
        }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center py-4">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4 text-gray-400" />
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-gray-400" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4 text-gray-400" />
                      {getRoleBadge(user.roleId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleConfirmDeleteUser(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  isActive={currentPage === i + 1}
                  onClick={() => paginate(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Modal de Novo/Editar Usuário */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={isEditing ? selectedUser?.name : newUser.name}
                  onChange={(e) => {
                    if (isEditing) {
                      setSelectedUser({ ...selectedUser, name: e.target.value });
                    } else {
                      setNewUser({ ...newUser, name: e.target.value });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={isEditing ? selectedUser?.email : newUser.email}
                  onChange={(e) => {
                    if (isEditing) {
                      setSelectedUser({ ...selectedUser, email: e.target.value });
                    } else {
                      setNewUser({ ...newUser, email: e.target.value });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha {isEditing && "(deixe em branco para manter a atual)"}</Label>
                <div className="flex">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isEditing ? "••••••••" : "Senha"}
                    value={isEditing ? selectedUser?.password || "" : newUser.password}
                    onChange={(e) => {
                      if (isEditing) {
                        setSelectedUser({ ...selectedUser, password: e.target.value });
                      } else {
                        setNewUser({ ...newUser, password: e.target.value });
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Select
                  value={isEditing ? selectedUser?.roleId : newUser.roleId}
                  onValueChange={(value) => {
                    if (isEditing) {
                      setSelectedUser({ ...selectedUser, roleId: value });
                    } else {
                      setNewUser({ ...newUser, roleId: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="active"
                  checked={isEditing ? selectedUser?.active : newUser.active}
                  onCheckedChange={(checked) => {
                    if (isEditing) {
                      setSelectedUser({ ...selectedUser, active: checked });
                    } else {
                      setNewUser({ ...newUser, active: checked });
                    }
                  }}
                />
                <Label htmlFor="active">Usuário ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={isEditing ? handleUpdateUser : handleCreateUser}>
              {isEditing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => setDeleteConfirmation({ ...deleteConfirmation, isOpen: open })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Tem certeza que deseja excluir o usuário{" "}
              <strong>{deleteConfirmation.user?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ isOpen: false, user: null })}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
