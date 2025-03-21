import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Plus, Search, UserPlus, Phone, Mail, Edit, FileText, Trash2 } from "lucide-react";
import { Client } from "@/firebase/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SimpleAlert from "@/components/SimpleAlert";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentClient, setCurrentClient] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    address: "",
    birthdate: "",
    skin_type: "normal",
    allergies: "",
    notes: ""
  });
  const [alert, setAlert] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    client: null
  });
  const itemsPerPage = 10;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await Client.list();
    setClients(data);
  };

  const resetForm = () => {
    setCurrentClient({
      name: "",
      cpf: "",
      email: "",
      phone: "",
      address: "",
      birthdate: "",
      skin_type: "normal",
      allergies: "",
      notes: ""
    });
    setIsEditMode(false);
  };

  const handleOpenNewClientDialog = () => {
    resetForm();
    setShowClientDialog(true);
  };

  const handleOpenEditClientDialog = (client) => {
    setCurrentClient({
      id: client.id,
      name: client.name || "",
      cpf: client.cpf || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      birthdate: client.birthdate || "",
      skin_type: client.skin_type || "normal",
      allergies: client.allergies || "",
      notes: client.notes || ""
    });
    setIsEditMode(true);
    setShowClientDialog(true);
  };

  const handleSaveClient = async () => {
    try {
      if (isEditMode) {
        const { id, ...clientData } = currentClient;
        await Client.update(id, clientData);
        
        setAlert({
          message: "Cliente atualizado com sucesso!",
          type: "success"
        });
      } else {
        await Client.create(currentClient);
        
        setAlert({
          message: "Cliente cadastrado com sucesso!",
          type: "success"
        });
      }
      
      setShowClientDialog(false);
      resetForm();
      loadClients();
    } catch (error) {
      setAlert({
        message: `Erro ao ${isEditMode ? "atualizar" : "cadastrar"} cliente. Tente novamente.`,
        type: "error"
      });
    }
  };

  const handleDeleteClient = async () => {
    try {
      await Client.delete(deleteConfirmation.client.id);
      setDeleteConfirmation({ isOpen: false, client: null });
      loadClients();
      
      setAlert({
        message: "Cliente excluído com sucesso!",
        type: "success"
      });
    } catch (error) {
      setAlert({
        message: "Erro ao excluir cliente. Tente novamente.",
        type: "error"
      });
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const pageCount = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteClick = (client) => {
    setDeleteConfirmation({
      isOpen: true,
      client: client
    });
  };

  return (
    <div className="space-y-6">
      {alert && (
        <SimpleAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-[#0D0F36]">Clientes</h2>
        <Button onClick={handleOpenNewClientDialog} className="bg-[#294380] hover:bg-[#0D0F36]">
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Tipo de Pele</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.length > 0 ? (
                paginatedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1 text-gray-500" />
                          <span>{client.phone}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <Mail className="h-3.5 w-3.5 mr-1 text-gray-500" />
                          <span className="text-sm">{client.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{client.skin_type || "Não definido"}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(client.created_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={createPageUrl(`ClientDetails?id=${client.id}`)}>
                          <Button size="icon" variant="ghost">
                            <FileText className="h-4 w-4 text-[#294380]" />
                          </Button>
                        </Link>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleOpenEditClientDialog(client)}
                        >
                          <Edit className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleDeleteClick(client)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    {searchTerm ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {pageCount > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: pageCount }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo*</Label>
                <Input
                  id="name"
                  value={currentClient.name}
                  onChange={(e) => setCurrentClient({ ...currentClient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF*</Label>
                <Input
                  id="cpf"
                  value={currentClient.cpf}
                  onChange={(e) => setCurrentClient({ ...currentClient, cpf: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail*</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentClient.email}
                  onChange={(e) => setCurrentClient({ ...currentClient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone*</Label>
                <Input
                  id="phone"
                  value={currentClient.phone}
                  onChange={(e) => setCurrentClient({ ...currentClient, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthdate">Data de Nascimento</Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={currentClient.birthdate}
                  onChange={(e) => setCurrentClient({ ...currentClient, birthdate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skin_type">Tipo de Pele</Label>
                <Select
                  value={currentClient.skin_type}
                  onValueChange={(value) => setCurrentClient({ ...currentClient, skin_type: value })}
                >
                  <SelectTrigger id="skin_type">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="seca">Seca</SelectItem>
                    <SelectItem value="oleosa">Oleosa</SelectItem>
                    <SelectItem value="mista">Mista</SelectItem>
                    <SelectItem value="sensível">Sensível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={currentClient.address}
                onChange={(e) => setCurrentClient({ ...currentClient, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Input
                  id="allergies"
                  value={currentClient.allergies}
                  onChange={(e) => setCurrentClient({ ...currentClient, allergies: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={currentClient.notes}
                  onChange={(e) => setCurrentClient({ ...currentClient, notes: e.target.value })}
                  className="h-20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveClient} className="bg-[#294380] hover:bg-[#0D0F36]">
              {isEditMode ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={deleteConfirmation.isOpen} 
        onOpenChange={(isOpen) => !isOpen && setDeleteConfirmation({ isOpen: false, client: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Você tem certeza que deseja excluir o cliente{" "}
              <span className="font-semibold">{deleteConfirmation.client?.name}</span>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmation({ isOpen: false, client: null })}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                await handleDeleteClient();
                setDeleteConfirmation({ isOpen: false, client: null });
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}