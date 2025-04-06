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
  const [duplicateCheck, setDuplicateCheck] = useState({
    isChecking: false,
    results: null
  });
  const [duplicatesDialog, setDuplicatesDialog] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState([]);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const itemsPerPage = 50;

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

  const checkDuplicates = () => {
    setDuplicateCheck({ isChecking: true, results: null });
    setSelectedForDeletion([]);
    
    // Cria um mapa para rastrear números de telefone duplicados
    const phoneMap = new Map();
    const phoneMatches = [];
    
    // Encontra todos os telefones duplicados
    clients.forEach(client => {
      if (client.phone && client.phone.trim() !== '') {
        if (phoneMap.has(client.phone)) {
          // Se já encontramos este telefone antes, adicione aos resultados
          const existingClient = phoneMap.get(client.phone);
          
          // Verifica se já adicionamos este telefone aos resultados
          const alreadyAdded = phoneMatches.some(match => 
            match.phone === client.phone
          );
          
          if (!alreadyAdded) {
            // Adiciona o primeiro cliente com este telefone
            phoneMatches.push(existingClient);
          }
          
          // Adiciona o cliente atual
          phoneMatches.push(client);
        } else {
          // Primeira vez que encontramos este telefone
          phoneMap.set(client.phone, client);
        }
      }
    });
    
    // Cria um mapa para rastrear nomes duplicados
    const nameMap = new Map();
    const nameMatches = [];
    
    // Encontra todos os nomes duplicados
    clients.forEach(client => {
      if (client.name && client.name.trim() !== '') {
        const normalizedName = client.name.toLowerCase().trim().replace(/\s+/g, ' ');
        
        if (nameMap.has(normalizedName)) {
          // Se já encontramos este nome antes, adicione aos resultados
          const existingClient = nameMap.get(normalizedName);
          
          // Verifica se já adicionamos este nome aos resultados
          const alreadyAdded = nameMatches.some(match => 
            match.name.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedName
          );
          
          if (!alreadyAdded) {
            // Adiciona o primeiro cliente com este nome
            nameMatches.push(existingClient);
          }
          
          // Adiciona o cliente atual
          nameMatches.push(client);
        } else {
          // Primeira vez que encontramos este nome
          nameMap.set(normalizedName, client);
        }
      }
    });
    
    const results = {
      phoneMatches,
      nameMatches
    };
    
    setDuplicateCheck({
      isChecking: false,
      results
    });
    
    // Se encontrou duplicatas, abre o diálogo
    if (phoneMatches.length > 0 || nameMatches.length > 0) {
      setDuplicatesDialog(true);
    } else {
      // Mostra apenas o resultado na página principal
      setDuplicatesDialog(false);
    }
  };
  
  // Função para selecionar/deselecionar cliente para exclusão
  const toggleClientSelection = (clientId) => {
    setSelectedForDeletion(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };
  
  // Função para excluir múltiplos clientes
  const deleteSelectedClients = async () => {
    setIsDeletingMultiple(true);
    
    try {
      // Exclui cada cliente selecionado
      for (const clientId of selectedForDeletion) {
        await Client.delete(clientId);
      }
      
      // Recarrega a lista de clientes
      await loadClients();
      
      // Limpa a seleção
      setSelectedForDeletion([]);
      
      // Fecha o diálogo
      setDuplicatesDialog(false);
      
      // Mostra alerta de sucesso
      setAlert({
        message: `${selectedForDeletion.length} clientes excluídos com sucesso!`,
        type: "success"
      });
    } catch (error) {
      setAlert({
        message: "Erro ao excluir clientes. Tente novamente.",
        type: "error"
      });
    } finally {
      setIsDeletingMultiple(false);
    }
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={checkDuplicates}
            className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
          >
            Verificar Duplicatas
          </Button>
          <Button onClick={handleOpenNewClientDialog} className="bg-[#294380] hover:bg-[#0D0F36]">
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {duplicateCheck.results && !duplicatesDialog && (
        <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
          <h4 className="font-medium text-amber-800 mb-2">Resultados da verificação:</h4>
          {duplicateCheck.results.phoneMatches.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-amber-800">
                Encontrados {duplicateCheck.results.phoneMatches.length} clientes com o mesmo telefone:
              </p>
              <ul className="text-sm list-disc pl-5 text-amber-700">
                {duplicateCheck.results.phoneMatches.slice(0, 5).map(client => (
                  <li key={client.id}>{client.name} - {client.phone}</li>
                ))}
                {duplicateCheck.results.phoneMatches.length > 5 && (
                  <li>...e mais {duplicateCheck.results.phoneMatches.length - 5} clientes</li>
                )}
              </ul>
            </div>
          )}
          {duplicateCheck.results.nameMatches.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-800">
                Encontrados {duplicateCheck.results.nameMatches.length} clientes com o mesmo nome:
              </p>
              <ul className="text-sm list-disc pl-5 text-amber-700">
                {duplicateCheck.results.nameMatches.slice(0, 5).map(client => (
                  <li key={client.id}>{client.name} - {client.phone}</li>
                ))}
                {duplicateCheck.results.nameMatches.length > 5 && (
                  <li>...e mais {duplicateCheck.results.nameMatches.length - 5} clientes</li>
                )}
              </ul>
            </div>
          )}
          {duplicateCheck.results.phoneMatches.length === 0 && duplicateCheck.results.nameMatches.length === 0 && (
            <p className="text-sm text-green-700">Nenhuma duplicata encontrada.</p>
          )}
        </div>
      )}

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
                        <Link to={`/client-details?id=${client.id}`}>
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
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                />
                {(() => {
                  const pageButtons = [];
                  const maxVisiblePages = 10;
                  const startPage = Math.floor((currentPage - 1) / maxVisiblePages) * maxVisiblePages + 1;
                  const endPage = Math.min(startPage + maxVisiblePages - 1, pageCount);
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pageButtons.push(
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => setCurrentPage(i)}
                          isActive={currentPage === i}
                        >
                          {i}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  return pageButtons;
                })()}
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                  disabled={currentPage === pageCount}
                />
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
      
      {/* Diálogo para mostrar e gerenciar duplicatas */}
      <Dialog 
        open={duplicatesDialog} 
        onOpenChange={setDuplicatesDialog}
        className="max-w-4xl"
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Clientes Duplicados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {duplicateCheck.results?.phoneMatches.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-amber-800">
                  Clientes com telefones duplicados
                </h3>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Selecionar</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicateCheck.results.phoneMatches.map(client => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <input 
                              type="checkbox" 
                              checked={selectedForDeletion.includes(client.id)}
                              onChange={() => toggleClientSelection(client.id)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>
                            {client.created_date ? format(new Date(client.created_date), "dd/MM/yyyy") : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {duplicateCheck.results?.nameMatches.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-amber-800">
                  Clientes com nomes duplicados
                </h3>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Selecionar</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicateCheck.results.nameMatches.map(client => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <input 
                              type="checkbox" 
                              checked={selectedForDeletion.includes(client.id)}
                              onChange={() => toggleClientSelection(client.id)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>
                            {client.created_date ? format(new Date(client.created_date), "dd/MM/yyyy") : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">
                {selectedForDeletion.length} clientes selecionados para exclusão
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDuplicatesDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={deleteSelectedClients}
                disabled={selectedForDeletion.length === 0 || isDeletingMultiple}
              >
                {isDeletingMultiple ? "Excluindo..." : "Excluir Selecionados"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}