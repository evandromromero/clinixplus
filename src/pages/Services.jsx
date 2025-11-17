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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Clock, 
  Pencil, 
  Trash2,
  Scissors,
  Globe,
  ImagePlus
} from "lucide-react"; 
import { Service } from "@/firebase/entities";
import { Switch } from "@/components/ui/switch";
import RateLimitHandler from '@/components/RateLimitHandler';

export default function Services() {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewServiceDialog, setShowNewServiceDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [newService, setNewService] = useState({
    name: "",
    category: "facial",
    duration: 60,
    price: 0,
    description: "",
    required_specialties: [],
    return_days: 0,
    requires_return: false,
    image_url: "",
    show_on_website: false,
    show_price_on_website: true,
    website_order: 999,
    available_in_shop: false,
    is_promotion: false
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      console.log("[Serviços] Carregando serviços do Firebase...");
      const serviceData = await Service.list();
      console.log("[Serviços] Serviços carregados:", serviceData);
      setServices(serviceData);
    } catch (error) {
      console.error("[Serviços] Erro ao carregar serviços:", error);
    }
  };

  const handleCreateService = async () => {
    try {
      console.log("[Serviços] Iniciando " + (isEditing ? "atualização" : "criação") + " de serviço...");
      
      if (isEditing && selectedService) {
        console.log("[Serviços] Atualizando serviço:", selectedService.id);
        await Service.update(selectedService.id, {
          ...newService,
          updated_date: new Date().toISOString()
        });
        console.log("[Serviços] Serviço atualizado com sucesso");
      } else {
        console.log("[Serviços] Criando novo serviço");
        await Service.create({
          ...newService,
          created_date: new Date().toISOString()
        });
        console.log("[Serviços] Serviço criado com sucesso");
      }
      
      setShowNewServiceDialog(false);
      resetForm();
      await loadServices();
    } catch (error) {
      console.error("[Serviços] Erro ao salvar serviço:", error);
      alert("Erro ao salvar serviço. Por favor, tente novamente.");
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) {
      return;
    }

    try {
      console.log("[Serviços] Excluindo serviço:", serviceId);
      await Service.delete(serviceId);
      console.log("[Serviços] Serviço excluído com sucesso");
      await loadServices();
    } catch (error) {
      console.error("[Serviços] Erro ao excluir serviço:", error);
      alert("Erro ao excluir serviço. Por favor, tente novamente.");
    }
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    setNewService({
      name: service.name || "",
      category: service.category || "facial",
      duration: service.duration || 60,
      price: service.price || 0,
      description: service.description || "",
      required_specialties: service.required_specialties || [],
      return_days: service.return_days || 0,
      requires_return: service.requires_return || false,
      image_url: service.image_url || "",
      show_on_website: service.show_on_website || false,
      show_price_on_website: service.show_price_on_website !== undefined ? service.show_price_on_website : true,
      website_order: service.website_order || 999,
      available_in_shop: service.available_in_shop || false,
      is_promotion: service.is_promotion || false
    });
    setIsEditing(true);
    setShowNewServiceDialog(true);
  };

  const resetForm = () => {
    setNewService({
      name: "",
      category: "facial",
      duration: 60,
      price: 0,
      description: "",
      required_specialties: [],
      return_days: 0,
      requires_return: false,
      image_url: "",
      show_on_website: false,
      show_price_on_website: true,
      website_order: 999,
      available_in_shop: false,
      is_promotion: false
    });
    setSelectedService(null);
    setIsEditing(false);
  };

  const filteredServices = services.filter(service =>
    service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Serviços</h2>
        <Button 
          onClick={() => {
            resetForm();
            setShowNewServiceDialog(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <Card key={service.id} className="overflow-hidden">
            <div className={`h-2 ${
              service.category === 'facial' ? 'bg-pink-500' :
              service.category === 'corporal' ? 'bg-blue-500' :
              service.category === 'depilação' ? 'bg-purple-500' :
              service.category === 'massagem' ? 'bg-green-500' :
              'bg-gray-500'
            }`} />
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                      {service.category}
                    </span>
                    {service.return_days > 0 && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                        Retorno em {service.return_days} dias
                      </span>
                    )}
                    {service.show_on_website && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                        <Globe className="w-3 h-3 mr-1" />
                        Exibido no site
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {service.show_price_on_website && (
                    <p className="font-bold text-lg">{formatPrice(service.price)}</p>
                  )}
                  <div className="flex items-center justify-end text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duration} minutos
                  </div>
                </div>
              </div>
              
              {service.description && (
                <p className="text-sm text-gray-600 mt-4 line-clamp-2">{service.description}</p>
              )}

              {service.image_url && (
                <div className="mt-4 h-24 overflow-hidden rounded">
                  <img 
                    src={service.image_url} 
                    alt={service.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex justify-end mt-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleEditService(service)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteService(service.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog 
        open={showNewServiceDialog} 
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowNewServiceDialog(open);
        }}
      >
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Serviço *</Label>
                <Input
                  id="name"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="Ex: Limpeza de Pele"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={newService.category}
                  onValueChange={(value) => setNewService({ ...newService, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facial">Facial</SelectItem>
                    <SelectItem value="corporal">Corporal</SelectItem>
                    <SelectItem value="capilar">Capilar</SelectItem>
                    <SelectItem value="massagem">Massagem</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                placeholder="Descreva o serviço..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="requires_return">Necessita Retorno</Label>
                <Switch
                  id="requires_return"
                  checked={newService.requires_return}
                  onCheckedChange={(checked) => setNewService({ ...newService, requires_return: checked })}
                />
              </div>

              {newService.requires_return && (
                <div className="space-y-2">
                  <Label htmlFor="return_days">Dias para Retorno</Label>
                  <Input
                    id="return_days"
                    type="number"
                    min="1"
                    value={newService.return_days}
                    onChange={(e) => setNewService({ ...newService, return_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Configurações do Site</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_on_website">Mostrar no Site</Label>
                  <Switch
                    id="show_on_website"
                    checked={newService.show_on_website}
                    onCheckedChange={(checked) => setNewService({ ...newService, show_on_website: checked })}
                  />
                </div>

                {newService.show_on_website && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_price_on_website">Mostrar Preço no Site</Label>
                      <Switch
                        id="show_price_on_website"
                        checked={newService.show_price_on_website}
                        onCheckedChange={(checked) => setNewService({ ...newService, show_price_on_website: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website_order">Ordem no Site</Label>
                      <Input
                        id="website_order"
                        type="number"
                        min="0"
                        value={newService.website_order}
                        onChange={(e) => setNewService({ ...newService, website_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image_url">URL da Imagem</Label>
                      <Input
                        id="image_url"
                        value={newService.image_url}
                        onChange={(e) => setNewService({ ...newService, image_url: e.target.value })}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Configurações da Loja (Portal do Cliente)</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="available_in_shop">Vender na Loja</Label>
                    <p className="text-xs text-gray-500">Disponibilizar para compra no portal do cliente</p>
                  </div>
                  <Switch
                    id="available_in_shop"
                    checked={newService.available_in_shop}
                    onCheckedChange={(checked) => setNewService({ ...newService, available_in_shop: checked })}
                  />
                </div>

                {newService.available_in_shop && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_promotion">Destacar como Promoção</Label>
                      <p className="text-xs text-gray-500">Aparece entre os primeiros na loja</p>
                    </div>
                    <Switch
                      id="is_promotion"
                      checked={newService.is_promotion}
                      onCheckedChange={(checked) => setNewService({ ...newService, is_promotion: checked })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowNewServiceDialog(false);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateService}
              className="bg-[#294380] hover:bg-[#0D0F36]"
              disabled={!newService.name || !newService.category || !newService.duration || newService.price < 0}
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Serviço'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}
