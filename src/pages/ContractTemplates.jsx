import React, { useState, useEffect } from 'react';
import { ContractTemplate } from '@/firebase/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ContractTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sections: []
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await ContractTemplate.list();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        sections: template.sections
      });
      setEditingTemplate(template);
    } else {
      setFormData({
        name: '',
        description: '',
        sections: []
      });
      setEditingTemplate(null);
    }
    setShowDialog(true);
  };

  const handleAddSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { title: '', content: '' }]
    }));
  };

  const handleSectionChange = (index, field, value) => {
    const newSections = [...formData.sections];
    newSections[index] = {
      ...newSections[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      sections: newSections
    }));
  };

  const handleRemoveSection = (index) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    try {
      if (editingTemplate) {
        await ContractTemplate.update(editingTemplate.id, formData);
      } else {
        await ContractTemplate.create(formData);
      }
      setShowDialog(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (templateId) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      try {
        await ContractTemplate.delete(templateId);
        loadTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Modelos de Contrato</h1>
        <Button onClick={() => handleOpenDialog()} className="bg-[#3475B8]">
          <Plus className="w-4 h-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{template.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenDialog(template)}
                    className="p-1 hover:text-[#3475B8]"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              <div className="text-sm text-gray-500">
                {template.sections.length} cláusulas
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Modelo</label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Contrato Padrão"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito deste modelo..."
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Cláusulas</label>
                <Button onClick={handleAddSection} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cláusula
                </Button>
              </div>
              {formData.sections.map((section, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between gap-4">
                        <Input
                          value={section.title}
                          onChange={e => handleSectionChange(index, 'title', e.target.value)}
                          placeholder="Título da Cláusula"
                          className="flex-1"
                        />
                        <button
                          onClick={() => handleRemoveSection(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Textarea
                        value={section.content}
                        onChange={e => handleSectionChange(index, 'content', e.target.value)}
                        placeholder="Conteúdo da cláusula..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="bg-[#3475B8]">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
