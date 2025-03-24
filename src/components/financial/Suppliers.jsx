import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, AlertCircle, Phone, Mail, Building2, FileText, Pencil } from "lucide-react";
import { Supplier } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showNewSupplierDialog, setShowNewSupplierDialog] = useState(false);
  const [showViewSupplierDialog, setShowViewSupplierDialog] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    cnpj: "",
    contact_name: "",
    phone: "",
    email: "",
    address: {
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: ""
    },
    payment_info: {
      bank: "",
      agency: "",
      account: "",
      pix_key: ""
    },
    active: true,
    notes: ""
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await Supplier.list();
      setSuppliers(data);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      await Supplier.create(newSupplier);
      setShowNewSupplierDialog(false);
      setNewSupplier({
        name: "",
        cnpj: "",
        contact_name: "",
        phone: "",
        email: "",
        address: {
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zip: ""
        },
        payment_info: {
          bank: "",
          agency: "",
          account: "",
          pix_key: ""
        },
        active: true,
        notes: ""
      });
      loadSuppliers();
    } catch (error) {
      console.error("Error creating supplier:", error);
    }
  };

  const handleViewSupplier = (supplier) => {
    setCurrentSupplier(supplier);
    setShowViewSupplierDialog(true);
  };

  const handleEditSupplier = (supplier) => {
    setCurrentSupplier({...supplier});
    setShowEditSupplierDialog(true);
  };

  const handleUpdateSupplier = async () => {
    try {
      await Supplier.update(currentSupplier.id, currentSupplier);
      setShowEditSupplierDialog(false);
      setCurrentSupplier(null);
      loadSuppliers();
    } catch (error) {
      console.error("Error updating supplier:", error);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.cnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D0F36]">Fornecedores</h3>
          <p className="text-[#294380] text-sm">Cadastro e gestão de fornecedores</p>
        </div>
        <Button 
          onClick={() => setShowNewSupplierDialog(true)}
          className="bg-[#294380] hover:bg-[#0D0F36]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome, CNPJ ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-[#294380]" />
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.contact_name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {supplier.phone}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail className="w-4 h-4" />
                    {supplier.email}
                  </div>
                </TableCell>
                <TableCell>{supplier.cnpj}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      supplier.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {supplier.active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewSupplier(supplier)}>
                      <FileText className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditSupplier(supplier)}>
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSuppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="flex flex-col items-center">
                    <AlertCircle className="h-6 w-6 text-gray-400 mb-2" />
                    <p className="text-gray-500">Nenhum fornecedor encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNewSupplierDialog} onOpenChange={setShowNewSupplierDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={newSupplier.cnpj}
                  onChange={(e) => setNewSupplier({...newSupplier, cnpj: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Contato</Label>
                <Input
                  value={newSupplier.contact_name}
                  onChange={(e) => setNewSupplier({...newSupplier, contact_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Rua"
                  value={newSupplier.address.street}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, street: e.target.value}
                  })}
                />
                <Input
                  placeholder="Número"
                  value={newSupplier.address.number}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, number: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Complemento"
                  value={newSupplier.address.complement}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, complement: e.target.value}
                  })}
                />
                <Input
                  placeholder="Bairro"
                  value={newSupplier.address.neighborhood}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, neighborhood: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Cidade"
                  value={newSupplier.address.city}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, city: e.target.value}
                  })}
                />
                <Input
                  placeholder="Estado"
                  value={newSupplier.address.state}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, state: e.target.value}
                  })}
                />
                <Input
                  placeholder="CEP"
                  value={newSupplier.address.zip}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    address: {...newSupplier.address, zip: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dados de Pagamento</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Banco"
                  value={newSupplier.payment_info.bank}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    payment_info: {...newSupplier.payment_info, bank: e.target.value}
                  })}
                />
                <Input
                  placeholder="Agência"
                  value={newSupplier.payment_info.agency}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    payment_info: {...newSupplier.payment_info, agency: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Conta"
                  value={newSupplier.payment_info.account}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    payment_info: {...newSupplier.payment_info, account: e.target.value}
                  })}
                />
                <Input
                  placeholder="Chave PIX"
                  value={newSupplier.payment_info.pix_key}
                  onChange={(e) => setNewSupplier({
                    ...newSupplier, 
                    payment_info: {...newSupplier.payment_info, pix_key: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSupplierDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSupplier} className="bg-[#294380] hover:bg-[#0D0F36]">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewSupplierDialog} onOpenChange={setShowViewSupplierDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Visualizar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <p>{currentSupplier?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <p>{currentSupplier?.cnpj}</p>
              </div>
              <div className="space-y-2">
                <Label>Nome do Contato</Label>
                <p>{currentSupplier?.contact_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <p>{currentSupplier?.phone}</p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <p>{currentSupplier?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <div className="grid grid-cols-2 gap-4">
                <p>Rua: {currentSupplier?.address.street}</p>
                <p>Número: {currentSupplier?.address.number}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <p>Complemento: {currentSupplier?.address.complement}</p>
                <p>Bairro: {currentSupplier?.address.neighborhood}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <p>Cidade: {currentSupplier?.address.city}</p>
                <p>Estado: {currentSupplier?.address.state}</p>
                <p>CEP: {currentSupplier?.address.zip}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dados de Pagamento</Label>
              <div className="grid grid-cols-2 gap-4">
                <p>Banco: {currentSupplier?.payment_info.bank}</p>
                <p>Agência: {currentSupplier?.payment_info.agency}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <p>Conta: {currentSupplier?.payment_info.account}</p>
                <p>Chave PIX: {currentSupplier?.payment_info.pix_key}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <p>{currentSupplier?.notes}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewSupplierDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditSupplierDialog} onOpenChange={setShowEditSupplierDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={currentSupplier?.name}
                onChange={(e) => setCurrentSupplier({...currentSupplier, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={currentSupplier?.cnpj}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, cnpj: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Contato</Label>
                <Input
                  value={currentSupplier?.contact_name}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, contact_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={currentSupplier?.phone}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={currentSupplier?.email}
                  onChange={(e) => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Rua"
                  value={currentSupplier?.address.street}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, street: e.target.value}
                  })}
                />
                <Input
                  placeholder="Número"
                  value={currentSupplier?.address.number}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, number: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Complemento"
                  value={currentSupplier?.address.complement}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, complement: e.target.value}
                  })}
                />
                <Input
                  placeholder="Bairro"
                  value={currentSupplier?.address.neighborhood}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, neighborhood: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Cidade"
                  value={currentSupplier?.address.city}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, city: e.target.value}
                  })}
                />
                <Input
                  placeholder="Estado"
                  value={currentSupplier?.address.state}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, state: e.target.value}
                  })}
                />
                <Input
                  placeholder="CEP"
                  value={currentSupplier?.address.zip}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    address: {...currentSupplier.address, zip: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dados de Pagamento</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Banco"
                  value={currentSupplier?.payment_info.bank}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    payment_info: {...currentSupplier.payment_info, bank: e.target.value}
                  })}
                />
                <Input
                  placeholder="Agência"
                  value={currentSupplier?.payment_info.agency}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    payment_info: {...currentSupplier.payment_info, agency: e.target.value}
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Conta"
                  value={currentSupplier?.payment_info.account}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    payment_info: {...currentSupplier.payment_info, account: e.target.value}
                  })}
                />
                <Input
                  placeholder="Chave PIX"
                  value={currentSupplier?.payment_info.pix_key}
                  onChange={(e) => setCurrentSupplier({
                    ...currentSupplier, 
                    payment_info: {...currentSupplier.payment_info, pix_key: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={currentSupplier?.notes}
                onChange={(e) => setCurrentSupplier({...currentSupplier, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSupplierDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSupplier} className="bg-[#294380] hover:bg-[#0D0F36]">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}