import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X, Filter, Tag, Plus, Search, Scissors } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ServiceSelector({ services, selectedServices, onServicesChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showServiceBrowser, setShowServiceBrowser] = useState(false);
  
  // Obtenha categorias únicas para o filtro
  const serviceCategories = ["all", ...new Set(services.map(service => service.category))];
  
  // Filtrar serviços baseado nos critérios de busca e categoria
  const filteredServices = services.filter(service => 
    (service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     service.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterCategory === "all" || service.category === filterCategory)
  );

  // Filtrar serviços já selecionados
  const selectedServiceObjects = services.filter(service => 
    selectedServices.includes(service.id)
  );
  
  const handleToggleService = (serviceId) => {
    if (selectedServices.includes(serviceId)) {
      onServicesChange(selectedServices.filter(id => id !== serviceId));
    } else {
      onServicesChange([...selectedServices, serviceId]);
    }
  };
  
  const handleSelectAll = () => {
    const servicesToAdd = filteredServices
      .map(service => service.id)
      .filter(id => !selectedServices.includes(id));
    
    onServicesChange([...selectedServices, ...servicesToAdd]);
  };
  
  const handleDeselectAll = () => {
    const servicesToKeep = selectedServices.filter(
      id => !filteredServices.some(service => service.id === id)
    );
    
    onServicesChange(servicesToKeep);
  };

  const handleRemoveService = (serviceId) => {
    onServicesChange(selectedServices.filter(id => id !== serviceId));
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Scissors className="w-4 h-4 mr-2 text-purple-600" />
          Serviços selecionados ({selectedServiceObjects.length})
        </h4>
        <Button 
          size="sm" 
          onClick={() => setShowServiceBrowser(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Serviços
        </Button>
      </div>

      {selectedServiceObjects.length === 0 ? (
        <div className="border border-dashed rounded-md py-8 px-4 text-center">
          <p className="text-gray-500 text-sm">
            Nenhum serviço selecionado. Clique em "Adicionar Serviços" para selecionar os serviços que este profissional realiza.
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <div className="grid divide-y">
            {selectedServiceObjects.map(service => (
              <div key={service.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-start flex-1">
                  <div className="ml-2">
                    <div className="font-medium">{service.name}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {service.duration} min
                      </span>
                      <span>
                        R$ {service.price?.toFixed(2).replace('.', ',')}
                      </span>
                      <Badge 
                        variant="outline" 
                        className="bg-purple-50 text-purple-700 border-purple-100 text-xs"
                      >
                        {service.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleRemoveService(service.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showServiceBrowser} onOpenChange={setShowServiceBrowser}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Selecionar Serviços</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <div className="w-full sm:w-48">
                <Select 
                  value={filterCategory} 
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="flex items-center">
                    <Tag className="w-4 h-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {serviceCategories
                      .filter(category => category !== "all")
                      .map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Filter className="w-3 h-3" />
                <span>
                  Exibindo {filteredServices.length} de {services.length} serviços
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Selecionar todos
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  Desmarcar todos
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto p-1">
              {services.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Nenhum serviço cadastrado.</p>
              ) : filteredServices.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Nenhum serviço encontrado para esta busca.</p>
              ) : (
                filteredServices.map(service => (
                  <div 
                    key={service.id} 
                    className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedServices.includes(service.id) 
                        ? "border-purple-300 bg-purple-50" 
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => handleToggleService(service.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox 
                        id={`service-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => handleToggleService(service.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                      />
                    </div>
                    <div className="grid gap-1 ml-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label 
                          htmlFor={`service-${service.id}`}
                          className="text-base font-medium cursor-pointer"
                        >
                          {service.name}
                        </label>
                        <Badge 
                          variant="outline" 
                          className="bg-purple-50 text-purple-700 border-purple-100"
                        >
                          {service.category}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-500 flex gap-4">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {service.duration} min
                        </span>
                        <span>
                          R$ {service.price?.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceBrowser(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}