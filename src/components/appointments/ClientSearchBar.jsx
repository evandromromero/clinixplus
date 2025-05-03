import React, { useState, useEffect } from 'react';
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const ClientSearchBar = ({ 
  clients, 
  onClientSelect, 
  selectedClient = null,
  onClear,
  placeholder = "Buscar cliente...",
  className = ""
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  
  // Filtrar clientes quando a busca mudar
  useEffect(() => {
    if (!search) {
      setFilteredClients(clients.slice(0, 5)); // Mostrar 5 clientes recentes por padrão
      return;
    }
    
    const searchLower = search.toLowerCase();
    const filtered = clients
      .filter(client => 
        client.name?.toLowerCase().includes(searchLower) || 
        client.email?.toLowerCase().includes(searchLower) || 
        client.phone?.includes(search)
      )
      .slice(0, 10); // Limitar a 10 resultados
    
    setFilteredClients(filtered);
  }, [search, clients]);
  
  // Selecionar cliente e fechar popover
  const handleSelectClient = (client) => {
    onClientSelect(client);
    setOpen(false);
    setSearch("");
  };
  
  // Limpar seleção
  const handleClear = () => {
    onClear();
    setSearch("");
  };
  
  return (
    <div className={`relative ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center">
            {selectedClient ? (
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => setOpen(true)}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedClient.name}</span>
                </div>
                {onClear && (
                  <X 
                    className="h-4 w-4 text-muted-foreground hover:text-foreground" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  />
                )}
              </Button>
            ) : (
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={placeholder}
                  className="pl-8 pr-4"
                  onClick={() => setOpen(true)}
                  readOnly
                />
              </div>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="p-0 w-[300px]" align="start">
          <Command>
            <CommandInput 
              placeholder="Digite nome, email ou telefone..." 
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
              <CommandGroup>
                {filteredClients.map(client => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => handleSelectClient(client)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span>{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {client.email || client.phone || "Sem contato"}
                      </span>
                    </div>
                    {client.dependents?.length > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {client.dependents.length} dependente(s)
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ClientSearchBar;
