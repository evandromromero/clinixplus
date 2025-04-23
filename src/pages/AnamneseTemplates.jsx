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
    options: '',
    optionalText: ''
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
      options: '',
      optionalText: ''
    });
  };

  const addField = () => {
    if (!newField.label) {
      toast.error('Digite um nome para o campo');
      return;
    }

    let field = {
      id: newField.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      label: newField.label,
      type: newField.type,
      value: ''
    };

    if (newField.type === 'select' && newField.options) {
      field.options = newField.options.split(',').map(opt => opt.trim());
    }

    if (newField.type === 'boolean' && newField.optionalText) {
      field.optionalText = newField.optionalText;
    }

    setFormData({
      ...formData,
      fields: [...formData.fields, field]
    });

    setNewField({
      label: '',
      type: 'text',
      options: '',
      optionalText: ''
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
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Modelo" : "Novo Modelo"} de Anamnese
            </DialogTitle>
            <DialogDescription>
              Crie ou edite um modelo de anamnese para usar com seus clientes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Modelo *</Label>
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
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Campos do Modelo</h3>
                
                <div className="grid gap-4">
                  {formData.fields.map((field, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{field.label}</p>
                        <p className="text-sm text-gray-500">
                          Tipo: {field.type === 'text' ? 'Texto' : field.type === 'select' ? 'Seleção' : 'Sim/Não'}
                          {field.type === 'select' && (
                            <> • Opções: {field.options.join(', ')}</>
                          )}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFields = [...formData.fields];
                          newFields.splice(index, 1);
                          setFormData({ ...formData, fields: newFields });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fieldLabel">Nome do Campo</Label>
                      <Input
                        id="fieldLabel"
                        value={newField.label}
                        onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                        placeholder="Ex: Tipo de Pele"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fieldType">Tipo do Campo</Label>
                      <Select
                        value={newField.type}
                        onValueChange={(value) => setNewField({ ...newField, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="select">Seleção</SelectItem>
                          <SelectItem value="boolean">Sim/Não (com resposta opcional)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newField.type === 'select' && (
                      <div className="space-y-2">
                        <Label htmlFor="fieldOptions">Opções (separadas por vírgula)</Label>
                        <Input
                          id="fieldOptions"
                          value={newField.options}
                          onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                          placeholder="Ex: Normal, Seca, Oleosa, Mista"
                        />
                      </div>
                    )}
                    {newField.type === 'boolean' && (
                      <div className="space-y-2">
                        <Label htmlFor="fieldOptionalText">Texto para resposta opcional (ex: Resp. Corrida Diária)</Label>
                        <Input
                          id="fieldOptionalText"
                          value={newField.optionalText || ''}
                          onChange={(e) => setNewField({ ...newField, optionalText: e.target.value })}
                          placeholder="Ex: Resp. Corrida Diária"
                        />
                        <span className="text-xs text-gray-500">Se preenchido, ao marcar "Sim" aparecerá um campo para resposta opcional.</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      onClick={addField}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Campo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowDialog(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#294380] hover:bg-[#0D0F36]">
                {editingTemplate ? 'Salvar Alterações' : 'Criar Modelo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
