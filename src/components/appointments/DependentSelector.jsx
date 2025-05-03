import React from 'react';
import { User, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DependentSelector = ({ 
  client, 
  selectedPersonId, 
  onPersonSelect 
}) => {
  if (!client) return null;
  
  const hasDependents = client.dependents && client.dependents.length > 0;
  
  if (!hasDependents) return null;
  
  const options = [
    { id: client.id, name: `${client.name} (Titular)` },
    ...client.dependents.map(dep => ({ 
      id: dep.id, 
      name: `${dep.name} (Dependente)` 
    }))
  ];
  
  return (
    <div className="w-full">
      <Select value={selectedPersonId} onValueChange={onPersonSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione o paciente..." />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center gap-2">
                {option.id === client.id ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                {option.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DependentSelector;
