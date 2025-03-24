import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import toast from 'react-hot-toast';
import { AnamneseTemplate } from "@/firebase/entities";

export default function AnamneseTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fields: []
  });
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    options: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await AnamneseTemplate.list();
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar modelos de anamnese');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await AnamneseTemplate.update(editingTemplate.id, formData);
        toast.success('Modelo atualizado com sucesso!');
      } else {
        await AnamneseTemplate.create(formData);
        toast.success('Modelo criado com sucesso!');
      }
      setShowDialog(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo de anamnese');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      fields: template.fields
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este modelo?')) {
      return;
    }
    try {
      await AnamneseTemplate.delete(id);
      toast.success('Modelo excluído com sucesso!');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir modelo de anamnese');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      fields: []
    });
    setNewField({
      label: '',
      type: 'text',
      options: ''
    });
  };

  const addField = () => {
    if (!newField.label) {
      toast.error('Digite um nome para o campo');
      return;
    }

    const field = {
      id: newField.label.toLowerCase().replace(/\s+/g, '_'),
      label: newField.label,
      type: newField.type,
      value: ''
    };

    // Se for do tipo select, adiciona as opções
    if (newField.type === 'select' && newField.options) {
      field.options = newField.options.split(',').map(opt => opt.trim());
    }

    setFormData({
      ...formData,
      fields: [...formData.fields, field]
    });

    setNewField({
      label: '',
      type: 'text',
      options: ''
    });
  };

  const removeField = (fieldId) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(f => f.id !== fieldId)
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#3475B8]">Modelos de Anamnese</h1>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            resetForm();
            setShowDialog(true);
          }}
          className="flex items-center gap-2 bg-[#3475B8] hover:bg-[#2C64A0]"
        >
          <Plus className="w-4 h-4" />
          Novo Modelo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="text-[#175EA0]">{template.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="w-4 h-4 text-amber-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              <div className="space-y-2">
                {template.fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-[#3475B8]">{field.label}:</span>
                    <span className="text-gray-600">
                      {field.type === 'select' ? 'Seleção' : 
                       field.type === 'boolean' ? 'Sim/Não' : 'Texto'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Modelo" : "Novo Modelo"} de Anamnese
            </DialogTitle>
            <DialogDescription>
              Crie ou edite um modelo de anamnese para usar com seus clientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Modelo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Anamnese Facial"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito deste modelo..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Campos do Modelo</h3>
              
              {/* Lista de campos existentes */}
              <div className="space-y-2">
                {formData.fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{field.label}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({field.type === 'select' ? 'Seleção' : 
                          field.type === 'boolean' ? 'Sim/Não' : 'Texto'})
                      </span>
                      {field.options && (
                        <span className="text-sm text-gray-500 ml-2">
                          Opções: {field.options.join(', ')}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(field.id)}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Adicionar novo campo */}
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-sm font-medium">Adicionar Novo Campo</h4>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Nome do campo"
                      value={newField.label}
                      onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    />
                  </div>
                  <div className="w-40">
                    <Select
                      value={newField.type}
                      onValueChange={(value) => setNewField({ ...newField, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="select">Seleção</SelectItem>
                        <SelectItem value="boolean">Sim/Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newField.type === 'select' && (
                  <div>
                    <Input
                      placeholder="Opções (separadas por vírgula)"
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: Opção 1, Opção 2, Opção 3
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addField}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Campo
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#3475B8] hover:bg-[#2C64A0]">
                {editingTemplate ? "Atualizar" : "Criar"} Modelo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
