import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AnamneseTemplate, Client } from '@/firebase/entities';
import { ClipboardList, Plus, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnamneseActionCard({ clientId, clientName }) {
  const [loading, setLoading] = useState(false);
  const [anamnese, setAnamnese] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadAnamnese();
    loadTemplates();
    // eslint-disable-next-line
  }, [clientId]);

  const loadAnamnese = async () => {
    try {
      setLoading(true);
      const data = await Client.getAnamnese(clientId);
      setAnamnese(data);
    } catch (error) {
      toast.error('Erro ao buscar anamnese.');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await AnamneseTemplate.list();
      setTemplates(data);
    } catch (error) {
      toast.error('Erro ao buscar modelos de anamnese.');
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      toast.error('Selecione um modelo.');
      return;
    }
    try {
      setLoading(true);
      await Client.saveAnamnese(clientId, {
        template_id: selectedTemplate.id,
        data: formData,
      });
      toast.success('Anamnese cadastrada com sucesso!');
      setShowForm(false);
      loadAnamnese();
    } catch (error) {
      toast.error('Erro ao salvar anamnese.');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    if (!selectedTemplate) return null;
    return selectedTemplate.fields?.map((field) => (
      <div key={field.id} className="space-y-2">
        <label className="font-medium text-gray-700">{field.label}</label>
        {field.type === 'boolean' ? (
          <select
            className="w-32 border rounded px-2 py-1"
            value={formData[field.id]?.value || ''}
            onChange={e => {
              setFormData(prev => ({
                ...prev,
                [field.id]: { value: e.target.value, optional: e.target.value === 'Sim' ? (prev[field.id]?.optional || '') : '' }
              }));
            }}
          >
            <option value="">Selecione</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        ) : field.type === 'select' ? (
          <select
            className="border rounded px-2 py-1"
            value={formData[field.id] || ''}
            onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
          >
            <option value="">Selecione</option>
            {field.options?.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            className="border rounded px-2 py-1 w-full"
            type="text"
            value={formData[field.id] || ''}
            onChange={e => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
          />
        )}
        {field.type === 'boolean' && field.optionalText && formData[field.id]?.value === 'Sim' && (
          <input
            className="border rounded px-2 py-1 w-full mt-1"
            type="text"
            placeholder={field.optionalText}
            value={formData[field.id]?.optional || ''}
            onChange={e => setFormData(prev => ({ ...prev, [field.id]: { ...prev[field.id], optional: e.target.value } }))}
          />
        )}
      </div>
    ));
  };

  if (loading) {
    return <div className="text-blue-700">Carregando...</div>;
  }

  // Exibe a anamnese já cadastrada
  if (anamnese && !showForm) {
    return (
      <Card className="mt-4 border-blue-300">
        <CardHeader className="flex flex-row items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-700" />
          <span className="font-semibold text-blue-900">Anamnese do Cliente</span>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => toast('Funcionalidade de visualização detalhada em breve!')}>
            <Eye className="w-4 h-4" /> Visualizar Anamnese
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Exibe o formulário para cadastrar anamnese
  if (!anamnese && showForm) {
    return (
      <Card className="mt-4 border-blue-300">
        <CardHeader className="flex flex-row items-center gap-2">
          <Plus className="w-5 h-5 text-green-700" />
          <span className="font-semibold text-green-900">Cadastrar Anamnese</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-medium text-gray-700">Modelo</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={selectedTemplate?.id || ''}
              onChange={e => {
                const tpl = templates.find(t => t.id === e.target.value);
                setSelectedTemplate(tpl);
                setFormData({});
              }}
            >
              <option value="">Selecione um modelo</option>
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
              ))}
            </select>
          </div>
          {renderFormFields()}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-green-700 text-white">Salvar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Exibe botão para cadastrar se não houver anamnese
  if (!anamnese && !showForm) {
    return (
      <Card className="mt-4 border-blue-300">
        <CardHeader className="flex flex-row items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-700" />
          <span className="font-semibold text-blue-900">Anamnese do Cliente</span>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Cadastrar Anamnese
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
