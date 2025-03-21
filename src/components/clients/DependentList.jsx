import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DependentList({ dependents, onEdit, onDelete }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Parentesco</TableHead>
          <TableHead>Data de Nascimento</TableHead>
          <TableHead>Tipo de Pele</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dependents?.length > 0 ? (
          dependents.map((dependent, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{dependent.name}</TableCell>
              <TableCell>{dependent.relationship}</TableCell>
              <TableCell>
                {dependent.birthdate
                  ? format(new Date(dependent.birthdate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })
                  : "-"}
              </TableCell>
              <TableCell>
                <span className="capitalize">{dependent.skin_type || "-"}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(dependent, index)}
                  >
                    <Edit className="h-4 w-4 text-amber-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-4">
              Nenhum dependente cadastrado
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}