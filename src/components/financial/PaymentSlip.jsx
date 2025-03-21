import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, FileText, Printer, XCircle } from "lucide-react";
import { Sale } from "@/api/entities";
import { Client } from "@/api/entities";
import { Service } from "@/api/entities";
import { Product } from "@/api/entities";

export default function PaymentSlip() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewSaleDialog, setShowNewSaleDialog] = useState(false);
  const [currentItems, setCurrentItems] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, clientsData, servicesData, productsData] = await Promise.all([
        Sale.list(),
        Client.list(),
        Service.list(),
        Product.list()
      ]);
      setSales(salesData);
      setClients(clientsData);
      setServices(servicesData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const addItem = (type, itemId) => {
    const item = type === 'service' 
      ? services.find(s => s.id === itemId)
      : products.find(p => p.id === itemId);

    if (!item) return;

    setCurrentItems(prev => [
      ...prev,
      {
        item_id: itemId,
        type,
        name: item.name,
        quantity: 1,
        price: item.price,
        discount: 0
      }
    ]);
  };

  const removeItem = (index) => {
    setCurrentItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index, quantity) => {
    setCurrentItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity };
      return newItems;
    });
  };

  const calculateTotal = () => {
    return currentItems.reduce((total, item) => {
      return total + (item.price * item.quantity * (1 - item.discount / 100));
    }, 0);
  };

  const handleCreateSale = async () => {
    if (!selectedClient || currentItems.length === 0) return;

    const saleData = {
      client_id: selectedClient,
      type: currentItems[0].type === 'service' ? 'serviço' : 'produto',
      items: currentItems,
      total_amount: calculateTotal(),
      date: new Date().toISOString(),
      payment_method: "dinheiro",
      status: "pendente"
    };

    try {
      await Sale.create(saleData);
      setShowNewSaleDialog(false);
      setCurrentItems([]);
      setSelectedClient(null);
      loadData();
    } catch (error) {
      console.error("Error creating sale:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-[#0D0F36]">Comanda</h3>
          <p className="text-[#294380] text-sm">Gestão de comandas e pagamentos</p>
        </div>
        <Button 
          onClick={() => setShowNewSaleDialog(true)}
          className="bg-[#294380] hover:bg-[#0D0F36]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Comanda
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar comandas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sales
          .filter(sale => 
            sale.status === "pendente" &&
            (clients.find(c => c.id === sale.client_id)?.name || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
          .map((sale) => {
            const client = clients.find(c => c.id === sale.client_id);
            
            return (
              <Card key={sale.id} className="relative">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {client?.name || "Cliente não encontrado"}
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    {format(new Date(sale.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sale.items.map((item, index) => {
                      const itemDetails = item.type === 'service'
                        ? services.find(s => s.id === item.item_id)
                        : products.find(p => p.id === item.item_id);

                      return (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{itemDetails?.name}</div>
                            <div className="text-sm text-gray-500">
                              {item.quantity}x R$ {item.price?.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-medium">
                            R$ {(item.quantity * item.price * (1 - (item.discount || 0) / 100)).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total</span>
                        <span>R$ {sale.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-[#294380] hover:bg-[#0D0F36]">
                        Finalizar
                      </Button>
                      <Button variant="outline" size="icon">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Dialog open={showNewSaleDialog} onOpenChange={setShowNewSaleDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Comanda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={selectedClient}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adicionar Item</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(value) => {
                    const [type, id] = value.split(':');
                    addItem(type, id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um item..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null} disabled>
                      Serviços
                    </SelectItem>
                    {services.map(service => (
                      <SelectItem key={service.id} value={`service:${service.id}`}>
                        {service.name} - R$ {service.price.toFixed(2)}
                      </SelectItem>
                    ))}
                    <SelectItem value={null} disabled>
                      Produtos
                    </SelectItem>
                    {products.map(product => (
                      <SelectItem key={product.id} value={`product:${product.id}`}>
                        {product.name} - R$ {product.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currentItems.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4">
                {currentItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        R$ {item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value))}
                        className="w-20"
                        min="1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>R$ {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSaleDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSale}
              disabled={!selectedClient || currentItems.length === 0}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              Criar Comanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}