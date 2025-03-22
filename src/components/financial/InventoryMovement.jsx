import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, AlertCircle, FileText, X } from "lucide-react";
import { Inventory, Product, Supplier } from "@/firebase/entities";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function InventoryMovement() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showNewMovementDialog, setShowNewMovementDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMovement, setNewMovement] = useState({
    product_id: "",
    type: "entrada",
    quantity: "1",
    unit_price: "0",
    supplier_id: "",
    invoice_number: "",
    batch_number: "",
    expiration_date: ""
  });
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("[Estoque] Carregando dados do Firebase...");
      const [movementsData, productsData, suppliersData] = await Promise.all([
        Inventory.list(),
        Product.list(),
        Supplier.list()
      ]);
      console.log("[Estoque] Dados carregados:", {
        movements: movementsData.length,
        products: productsData.length,
        suppliers: suppliersData.length
      });
      
      setMovements(movementsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("[Estoque] Erro ao carregar dados:", error);
      setAlert({
        type: "error",
        message: "Erro ao carregar dados do estoque. Por favor, tente novamente."
      });
    }
  };

  const handleCreateMovement = async () => {
    try {
      console.log("[Estoque] Iniciando nova movimentação...");
      
      // Validações
      if (!newMovement.product_id) {
        setAlert({
          type: "error",
          message: "Selecione um produto."
        });
        return;
      }

      if (!newMovement.quantity || newMovement.quantity <= 0) {
        setAlert({
          type: "error",
          message: "A quantidade deve ser maior que zero."
        });
        return;
      }

      // Criar movimentação
      const movementData = {
        ...newMovement,
        created_date: new Date().toISOString(),
        unit_price: parseFloat(newMovement.unit_price) || 0
      };
      
      console.log("[Estoque] Criando movimentação:", movementData);
      await Inventory.create(movementData);
      
      // Atualizar estoque do produto
      const product = products.find(p => p.id === newMovement.product_id);
      if (product) {
        const newStock = newMovement.type === "entrada"
          ? (product.stock || 0) + parseInt(newMovement.quantity)
          : (product.stock || 0) - parseInt(newMovement.quantity);
        
        if (newMovement.type === "saida" && newStock < 0) {
          setAlert({
            type: "error",
            message: "Estoque insuficiente para esta saída."
          });
          return;
        }

        console.log("[Estoque] Atualizando estoque do produto:", {
          produto: product.name,
          estoqueAtual: product.stock,
          novoEstoque: newStock
        });
        
        await Product.update(product.id, { 
          ...product, 
          stock: newStock,
          updated_date: new Date().toISOString()
        });
      }

      setShowNewMovementDialog(false);
      setNewMovement({
        product_id: "",
        type: "entrada",
        quantity: "1",
        unit_price: "0",
        supplier_id: "",
        invoice_number: "",
        batch_number: "",
        expiration_date: ""
      });
      
      setAlert({
        type: "success",
        message: "Movimentação registrada com sucesso!"
      });
      
      await loadData();
    } catch (error) {
      console.error("[Estoque] Erro ao criar movimentação:", error);
      setAlert({
        type: "error",
        message: "Erro ao registrar movimentação. Por favor, tente novamente."
      });
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
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-[#0D0F36]">Movimentação de Estoque</h3>
            <p className="text-[#294380] text-sm">Controle de entrada e saída de produtos</p>
          </div>
          <Button 
            onClick={() => {
              setNewMovement({
                product_id: "",
                type: "entrada",
                quantity: "1",
                unit_price: "0",
                supplier_id: "",
                invoice_number: "",
                batch_number: "",
                expiration_date: ""
              });
              setShowNewMovementDialog(true);
            }}
            className="bg-[#294380] hover:bg-[#0D0F36]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Movimentação
          </Button>
        </div>

        {alert && (
          <div className={`flex items-center p-4 mb-4 text-sm rounded-lg ${
            alert.type === "success" 
              ? "text-green-800 bg-green-50" 
              : "text-red-800 bg-red-50"
          }`} role="alert">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="sr-only">Info</span>
            <div>
              <span className="font-medium">{alert.message}</span>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8"
            >
              <span className="sr-only">Fechar</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

        <div className="border rounded-lg">
          {filteredMovements.length > 0 ? (
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
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          movement.type === 'entrada'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </TableCell>
                      <TableCell>{product?.name || 'N/A'}</TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(movement.unit_price)}
                      </TableCell>
                      <TableCell>{supplier?.name || 'N/A'}</TableCell>
                      <TableCell>{movement.invoice_number || 'N/A'}</TableCell>
                      <TableCell>{movement.batch_number || 'N/A'}</TableCell>
                      <TableCell>
                        {movement.expiration_date 
                          ? format(new Date(movement.expiration_date), "dd/MM/yyyy")
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900">Nenhuma movimentação encontrada</h3>
              <p className="text-sm text-gray-500">
                {searchTerm 
                  ? "Tente ajustar sua busca para encontrar o que você está procurando."
                  : "Comece registrando uma nova movimentação de estoque."}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showNewMovementDialog} onOpenChange={setShowNewMovementDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo*</Label>
                <Select
                  value={newMovement.type}
                  onValueChange={(value) => setNewMovement({ ...newMovement, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Produto*</Label>
                <Select
                  value={newMovement.product_id}
                  onValueChange={(value) => setNewMovement({ ...newMovement, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade*</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newMovement.quantity}
                  onChange={(e) => setNewMovement({ ...newMovement, quantity: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">Valor Unitário</Label>
                <Input
                  id="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMovement.unit_price}
                  onChange={(e) => setNewMovement({ ...newMovement, unit_price: e.target.value })}
                />
              </div>
            </div>

            {newMovement.type === "entrada" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select
                    value={newMovement.supplier_id}
                    onValueChange={(value) => setNewMovement({ ...newMovement, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Nota Fiscal</Label>
                    <Input
                      id="invoice"
                      value={newMovement.invoice_number}
                      onChange={(e) => setNewMovement({ ...newMovement, invoice_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch">Lote</Label>
                    <Input
                      id="batch"
                      value={newMovement.batch_number}
                      onChange={(e) => setNewMovement({ ...newMovement, batch_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Data de Validade</Label>
                  <Input
                    id="expiration"
                    type="date"
                    value={newMovement.expiration_date}
                    onChange={(e) => setNewMovement({ ...newMovement, expiration_date: e.target.value })}
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

      <RateLimitHandler />
    </>
  );
}