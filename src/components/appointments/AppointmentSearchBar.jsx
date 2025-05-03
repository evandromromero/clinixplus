import React from 'react';
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AppointmentSearchBar = ({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Buscar agendamentos...",
  className = ""
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8 pr-4"
        />
      </div>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default AppointmentSearchBar;
