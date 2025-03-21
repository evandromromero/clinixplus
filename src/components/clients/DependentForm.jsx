import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DependentForm({ dependent, onSubmit, onCancel }) {
  const [data, setData] = React.useState(dependent || {
    name: "",
    cpf: "",
    birthdate: "",
    relationship: "",
    skin_type: "normal",
    allergies: "",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo*</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationship">Parentesco*</Label>
          <Select
            value={data.relationship}
            onValueChange={(value) => setData({ ...data, relationship: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cônjuge">Cônjuge</SelectItem>
              <SelectItem value="filho(a)">Filho(a)</SelectItem>
              <SelectItem value="pai/mãe">Pai/Mãe</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={data.cpf}
            onChange={(e) => setData({ ...data, cpf: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthdate">Data de Nascimento</Label>
          <Input
            id="birthdate"
            type="date"
            value={data.birthdate}
            onChange={(e) => setData({ ...data, birthdate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="skin_type">Tipo de Pele</Label>
          <Select
            value={data.skin_type}
            onValueChange={(value) => setData({ ...data, skin_type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="seca">Seca</SelectItem>
              <SelectItem value="oleosa">Oleosa</SelectItem>
              <SelectItem value="mista">Mista</SelectItem>
              <SelectItem value="sensível">Sensível</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="allergies">Alergias</Label>
          <Input
            id="allergies"
            value={data.allergies}
            onChange={(e) => setData({ ...data, allergies: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={data.notes}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
          className="h-20"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#294380] hover:bg-[#0D0F36]">
          {dependent ? "Atualizar" : "Adicionar"} Dependente
        </Button>
      </div>
    </form>
  );
}