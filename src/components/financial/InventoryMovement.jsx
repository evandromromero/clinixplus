import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, AlertCircle, FileText } from "lucide-react";
import { Inventory } from "@/api/entities";
import { Product } from "@/api/entities";
import { Supplier } from "@/api/entities";

export default function InventoryMovement() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showNewMovementDialog, setShowNewMovementDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMovement, setNewMovement] = useState({
    product_id: "",
    type: "entrada",
    quantity: 1,
    unit_price: 0,
    supplier_id: "",
    invoice_number: "",
    batch_number: "",
    expiration_date: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [movementsData, productsData, suppliersData] = await Promise.all([
        Inventory.list(),
        Product.list(),
        Supplier.list()
      ]);
      setMovements(movementsData);
      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleCreateMovement = async () => {
    try {
      await Inventory.create(newMovement);
      
      // Update product stock
      const product = products.find(p => p.id === newMovement.product_id);
      if (product) {
        const newStock = newMovement.type === "entrada"
          ? product.stock + newMovement.quantity
          : product.stock - newMovement.quantity;
        
        await Product.update(product.id, { ...product, stock: newStock });
      }

      setShowNewMovementDialog(false);
      setNewMovement({
        product_id: "",
        type: "entrada",
        quantity: 1,
        unit_price: 0,
        supplier_id: "",
        invoice_number: "",
        batch_number: "",
        expiration_date: ""
      });
      loadData();
    } catch (error) {
      console.error("Error creating movement:", error);
    }
  };

  const filteredMovements = movements.filter(movement => {
    const product = products.find(p => p.id === movement.product_id);
    const supplier = suppliers.find(s => s.id === movement.supplier_id);
    
    return (
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D0F36]">Movimentação de Estoque</h3>
          <p className="text-[#294380] text-sm">Controle de entrada e saída de produtos</p>
        </div>
        <Button 
          onClick={() => setShowNewMovementDialog(true)}
          className="bg-[#294380] hover:bg-[#0D0F36]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Movimentação
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por produto, fornecedor ou nota fiscal..."
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
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Valor Unit.</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Validade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.map((movement) => {
              const product = products.find(p => p.id === movement.product_id);
              const supplier = suppliers.find(s => s.id === movement.supplier_id);
              
              return (
                <TableRow key={movement.id}>
                  <TableCell>
                    {format(new Date(movement.created_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        movement.type === 'entrada'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {movement.type}
                    </span>
                  </TableCell>
                  <TableCell>{product?.name || '-'}</TableCell>
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell>R$ {movement.unit_price?.toFixed(2)}</TableCell>
                  <TableCell>{supplier?.name || '-'}</TableCell>
                  <TableCell>{movement.invoice_number || '-'}</TableCell>
                  <TableCell>{movement.batch_number || '-'}</TableCell>
                  <TableCell>
                    {movement.expiration_date
                      ? format(new Date(movement.expiration_date), "dd/MM/yyyy")
                      : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredMovements.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  <div className="flex flex-col items-center">
                    <AlertCircle className="h-6 w-6 text-gray-400 mb-2" />
                    <p className="text-gray-500">Nenhuma movimentação encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNewMovementDialog} onOpenChange={setShowNewMovementDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select
                value={newMovement.type}
                onValueChange={(value) => setNewMovement({...newMovement, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Produto</Label>
              <Select
                value={newMovement.product_id}
                onValueChange={(value) => {
                  const product = products.find(p => p.id === value);
                  setNewMovement({
                    ...newMovement, 
                    product_id: value,
                    unit_price: product?.price || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Estoque: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={newMovement.quantity}
                  onChange={(e) => setNewMovement({...newMovement, quantity: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  value={newMovement.unit_price}
                  onChange={(e) => setNewMovement({...newMovement, unit_price: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            {newMovement.type === "entrada" && (
              <>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={newMovement.supplier_id}
                    onValueChange={(value) => setNewMovement({...newMovement, supplier_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nota Fiscal</Label>
                    <Input
                      value={newMovement.invoice_number}
                      onChange={(e) => setNewMovement({...newMovement, invoice_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número do Lote</Label>
                    <Input
                      value={newMovement.batch_number}
                      onChange={(e) => setNewMovement({...newMovement, batch_number: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={newMovement.expiration_date}
                    onChange={(e) => setNewMovement({...newMovement, expiration_date: e.target.value})}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMovementDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMovement} className="bg-[#294380] hover:bg-[#0D0F36]">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}