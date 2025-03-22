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
    services: []
  });
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceQuantity, setSelectedServiceQuantity] = useState(1);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [showEditPackageDialog, setShowEditPackageDialog] = useState(false);
  
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

    calculateTotalPrice();
    
    setSelectedServiceId("");
    setSelectedServiceQuantity(1);
  };

  const handleRemoveService = (serviceId) => {
    setPackageForm(prev => ({
      ...prev,
      services: prev.services.filter(s => s.service_id !== serviceId)
    }));
    
    calculateTotalPrice();
  };

  const calculateTotalPrice = () => {
    const servicesTotal = packageForm.services.reduce((total, service) => {
      return total + (service.price * service.quantity);
    }, 0);
    
    const discountAmount = packageForm.discount > 0 
      ? (servicesTotal * (packageForm.discount / 100)) 
      : 0;
    
    setPackageForm(prev => ({
      ...prev,
      total_price: servicesTotal - discountAmount
    }));
  };

  useEffect(() => {
    calculateTotalPrice();
  }, [packageForm.services, packageForm.discount]);

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
                <Card key={pkg.id} className="hover:shadow-md transition-shadow">
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
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={packageForm.discount}
                    onChange={(e) => setPackageForm({...packageForm, discount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <Label className="mb-2 block">Adicionar Serviços</Label>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-4">
                    <Select
                      value={selectedServiceId}
                      onValueChange={setSelectedServiceId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {formatCurrency(service.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            Desconto ({packageForm.discount}%)
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            -{formatCurrency(
                              packageForm.services.reduce((total, s) => total + (s.price * s.quantity), 0) * 
                              (packageForm.discount / 100)
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