import React, { useState, useEffect } from 'react';
import { Package, Service } from '@/firebase/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, Package as PackageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    validity_days: 90,
    total_price: 0,
    discount: 0,
    discount_type: "percentage",
    color: "#294380", // Cor padrão
    services: [],
    desired_price: 0
  });
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceQuantity, setSelectedServiceQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  
  const colors = [
    "#294380", // Azul principal
    "#FF6B6B", // Vermelho
    "#4CAF50", // Verde
    "#FFA07A", // Salmão
    "#9370DB", // Roxo
    "#20B2AA", // Verde água
    "#FFD700"  // Dourado
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [packagesData, servicesData] = await Promise.all([
        Package.list(),
        Service.list(),
      ]);
      setPackages(packagesData);
      setServices(servicesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setAlert({
        type: "error",
        message: error.message || "Não foi possível carregar os dados"
      });
    }
  };

  const handleOpenDialog = (pkg = null) => {
    if (pkg) {
      setPackageForm({
        name: pkg.name,
        description: pkg.description || "",
        validity_days: pkg.validity_days,
        total_price: pkg.total_price,
        discount: pkg.discount || 0,
        discount_type: pkg.discount_type || "percentage",
        color: pkg.color || "#294380",
        services: pkg.services || []
      });
      setCurrentPackage(pkg);
      setIsEditing(true);
    } else {
      setPackageForm({
        name: "",
        description: "",
        validity_days: 90,
        total_price: 0,
        discount: 0,
        discount_type: "percentage",
        color: "#294380",
        services: []
      });
      setCurrentPackage(null);
      setIsEditing(false);
    }
    setShowDialog(true);
  };

  const handleEditPackage = async (packageToEdit) => {
    // Garantir que temos os dados completos dos serviços
    const updatedServices = await Promise.all(
      (packageToEdit.services || []).map(async (service) => {
        const fullService = services.find(s => s.id === service.service_id);
        return {
          service_id: service.service_id,
          name: fullService ? fullService.name : 'Serviço não encontrado',
          price: fullService ? fullService.price : 0,
          quantity: service.quantity || 1
        };
      })
    );

    setPackageForm({
      name: packageToEdit.name,
      description: packageToEdit.description || "",
      validity_days: packageToEdit.validity_days,
      total_price: packageToEdit.total_price,
      discount: packageToEdit.discount || 0,
      discount_type: packageToEdit.discount_type || "percentage",
      color: packageToEdit.color || "#294380",
      services: updatedServices
    });

    // Recalcular o preço total após carregar os serviços
    const servicesTotal = updatedServices.reduce((total, service) => {
      return total + (service.price * service.quantity);
    }, 0);
    
    const discountAmount = (packageToEdit.discount || 0) > 0 
      ? (servicesTotal * ((packageToEdit.discount || 0) / 100)) 
      : 0;

    setPackageForm(prev => ({
      ...prev,
      total_price: servicesTotal - discountAmount
    }));

    setCurrentPackage(packageToEdit);
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleAddService = () => {
    if (!selectedServiceId) return;

    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    const serviceExists = packageForm.services.some(s => s.service_id === selectedServiceId);
    
    if (serviceExists) {
      setPackageForm(prev => ({
        ...prev,
        services: prev.services.map(s => 
          s.service_id === selectedServiceId 
            ? { ...s, quantity: s.quantity + selectedServiceQuantity }
            : s
        )
      }));
    } else {
      setPackageForm(prev => ({
        ...prev,
        services: [
          ...prev.services,
          {
            service_id: selectedServiceId,
            name: service.name,
            price: service.price,
            quantity: selectedServiceQuantity
          }
        ]
      }));
    }

    calculateFinalPrice();
    
    setSelectedServiceId("");
    setSelectedServiceQuantity(1);
  };

  const handleRemoveService = (serviceId) => {
    setPackageForm(prev => ({
      ...prev,
      services: prev.services.filter(s => s.service_id !== serviceId)
    }));
    
    calculateFinalPrice();
  };

  const calculateFinalPrice = () => {
    const subtotal = packageForm.services.reduce((total, service) => {
      return total + (service.price * service.quantity);
    }, 0);

    let discount = 0;
    let finalPrice = subtotal;
    
    if (packageForm.discount_type === "percentage") {
      discount = (subtotal * packageForm.discount) / 100;
      finalPrice = subtotal - discount;
    } else if (packageForm.discount_type === "fixed") {
      discount = packageForm.discount;
      finalPrice = subtotal - discount;
    } else if (packageForm.discount_type === "desired_price") {
      // Se o preço desejado for maior que o subtotal, não aplicamos desconto
      if (packageForm.desired_price >= subtotal) {
        discount = 0;
        finalPrice = subtotal;
      } else {
        // Calculamos o desconto necessário para atingir o preço desejado
        discount = subtotal - packageForm.desired_price;
        finalPrice = packageForm.desired_price;
      }
    }

    // Atualizamos o formulário com os novos valores calculados
    setPackageForm(prev => ({
      ...prev,
      discount: discount,
      total_price: packageForm.discount_type === "desired_price" ? packageForm.desired_price : finalPrice
    }));
  };
  

  const handleDiscountChange = (value, type) => {
    if (type === "desired_price") {
      setPackageForm(prev => ({
        ...prev,
        desired_price: value,
        discount_type: type
      }));
    } else {
      setPackageForm(prev => ({
        ...prev,
        discount: value,
        discount_type: type
      }));
    }
    calculateFinalPrice();
  };
  
  const handleDesiredPriceChange = (value) => {
    setPackageForm(prev => ({
      ...prev,
      desired_price: value
    }));
    calculateFinalPrice();
  };

  useEffect(() => {
    calculateFinalPrice();
  }, [packageForm.services, packageForm.discount, packageForm.discount_type]);

  const handleCreatePackage = async () => {
    try {
      if (packageForm.services.length === 0) {
        setAlert({
          type: "error",
          message: "Adicione pelo menos um serviço ao pacote"
        });
        return;
      }

      const finalPackage = {
        name: packageForm.name,
        description: packageForm.description,
        validity_days: packageForm.validity_days,
        total_price: packageForm.total_price,
        discount: packageForm.discount,
        discount_type: packageForm.discount_type,
        color: packageForm.color,
        services: packageForm.services.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity
        }))
      };

      if (isEditing && currentPackage?.id) {
        // Atualiza o pacote diretamente no Firebase
        await Package.update(currentPackage.id, finalPackage);
        setAlert({
          type: "success",
          message: "Pacote atualizado com sucesso"
        });
      } else {
        // Cria um novo pacote no Firebase
        await Package.create(finalPackage);
        setAlert({
          type: "success",
          message: "Pacote criado com sucesso"
        });
      }

      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar pacote:", error);
      setAlert({
        type: "error",
        message: error.message || "Não foi possível salvar o pacote"
      });
    }
  };

  const handleDeletePackage = async () => {
    try {
      if (!currentPackage?.id) return;
      
      // Remove o pacote diretamente do Firebase
      await Package.delete(currentPackage.id);
      
      setAlert({
        type: "success",
        message: "Pacote removido com sucesso"
      });
      
      setShowDeleteConfirm(false);
      loadData();
    } catch (error) {
      console.error("Erro ao remover pacote:", error);
      setAlert({
        type: "error",
        message: error.message || "Não foi possível remover o pacote"
      });
      setShowDeleteConfirm(false);
    }
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Serviço não encontrado";
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const calculateTotalSessions = (services) => {
    if (!services || !Array.isArray(services)) {
      return 0;
    }
    
    return services.reduce((total, service) => {
      return total + (service.quantity || 0);
    }, 0);
  };

  const calculatePackageSessions = (pkg) => {
    if (!pkg.services) return 0;
    return calculateTotalSessions(pkg.services);
  };

  return (
    <div className="space-y-6">
      {alert.message && (
        <div className={`p-4 rounded-md ${
          alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          alert.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {alert.message}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Pacotes de Serviços</h2>
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Pacote
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {packages.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <PackageIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum pacote cadastrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Crie seu primeiro pacote de serviços clicando no botão acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map(pkg => (
                <Card key={pkg.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: pkg.color || "#294380" }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setCurrentPackage(pkg);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-baseline mb-3">
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(pkg.total_price)}
                      </p>
                      <div className="text-sm text-gray-500">
                        {calculatePackageSessions(pkg)} sessões
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                    )}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Serviços incluídos:</p>
                      <div className="space-y-1">
                        {pkg.services && pkg.services.map((service, index) => (
                          <div 
                            key={`${service.service_id}-${index}`}
                            className="text-sm flex justify-between"
                          >
                            <span>{getServiceName(service.service_id)}</span>
                            <span className="font-medium">{service.quantity}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
                      Validade: {pkg.validity_days} dias
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Pacote</Label>
                <Input
                  id="name"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                  placeholder="Ex: Pacote Facial Completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                  placeholder="Descreva os benefícios deste pacote"
                  rows={3}
                />
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="color">Cor do Pacote</Label>
                <div className="flex gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 ${packageForm.color === color ? 'border-black' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setPackageForm(prev => ({ ...prev, color: color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validity">Validade (dias)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={packageForm.validity_days}
                    onChange={(e) => setPackageForm({...packageForm, validity_days: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto</Label>
                  <div className="flex gap-2 mb-2">
                    <Select
                      value={packageForm.discount_type}
                      onValueChange={(value) => handleDiscountChange(packageForm.discount, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tipo de desconto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                        <SelectItem value="desired_price">Preço final desejado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {packageForm.discount_type === "desired_price" ? (
                    <div className="space-y-2">
                      <Label htmlFor="desired_price">Preço final desejado (R$)</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="desired_price"
                          type="number"
                          value={packageForm.desired_price}
                          onChange={(e) => handleDesiredPriceChange(parseFloat(e.target.value) || 0)}
                        />
                        {packageForm.services.length > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-500">Desconto aplicado:</span> 
                            <span className="font-medium ml-1 text-red-500">
                              {formatCurrency(packageForm.discount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="discount">{packageForm.discount_type === "percentage" ? "Porcentagem (%)" : "Valor fixo (R$)"}</Label>
                      <Input
                        id="discount"
                        type="number"
                        value={packageForm.discount}
                        onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0, packageForm.discount_type)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="mb-2 block">Adicionar Serviços</Label>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-4 relative">
                    <div className="relative">
                      <div 
                        className="flex items-center border rounded-md px-3 py-2 w-full text-sm focus-within:ring-1 focus-within:ring-ring"
                        onClick={() => setIsServiceDropdownOpen(true)}
                      >
                        {selectedServiceId ? (
                          <span>
                            {services.find(s => s.id === selectedServiceId)?.name} - 
                            {formatCurrency(services.find(s => s.id === selectedServiceId)?.price || 0)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Selecione um serviço</span>
                        )}
                      </div>
                      
                      {isServiceDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          <div className="sticky top-0 bg-white p-2 border-b">
                            <Input
                              placeholder="Buscar serviço..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full"
                              autoFocus
                            />
                          </div>
                          
                          <div>
                            {/* Filtrar serviços com base no termo de busca */}
                            {(() => {
                              const filteredServices = services.filter(service => 
                                service.name.toLowerCase().includes(searchTerm.toLowerCase())
                              );
                              
                              return filteredServices.length > 0 ? (
                                filteredServices.map(service => (
                                  <div
                                    key={service.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setSelectedServiceId(service.id);
                                      setIsServiceDropdownOpen(false);
                                      setSearchTerm("");
                                    }}
                                  >
                                    {service.name} - {formatCurrency(service.price)}
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-gray-500 text-center">
                                  Nenhum serviço encontrado
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {isServiceDropdownOpen && (
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsServiceDropdownOpen(false)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={selectedServiceQuantity}
                      onChange={(e) => setSelectedServiceQuantity(parseInt(e.target.value) || 1)}
                      min={1}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      onClick={handleAddService}
                      className="w-full"
                      disabled={!selectedServiceId}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {packageForm.services.length > 0 && (
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packageForm.services.map((service) => (
                        <TableRow key={service.service_id}>
                          <TableCell>{service.name}</TableCell>
                          <TableCell className="text-right">{service.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(service.price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(service.price * service.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleRemoveService(service.service_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {packageForm.discount > 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">
                            {packageForm.discount_type === "desired_price" 
                              ? "Desconto (Preço final desejado)" 
                              : `Desconto (${packageForm.discount_type === "percentage" ? `${packageForm.discount}%` : `R$ ${formatCurrency(packageForm.discount)}`})`
                            }
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            -{formatCurrency(
                              packageForm.discount_type === "percentage" 
                                ? packageForm.services.reduce((total, s) => total + (s.price * s.quantity), 0) * 
                                  (packageForm.discount / 100)
                                : packageForm.discount
                            )}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">
                          Total do Pacote
                        </TableCell>
                        <TableCell className="text-right font-bold text-purple-600">
                          {formatCurrency(packageForm.total_price)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreatePackage}
              disabled={!packageForm.name || packageForm.services.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isEditing ? "Atualizar" : "Criar"} Pacote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Pacote</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este pacote? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDeletePackage}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}