import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AnamneseTemplate, Client } from '@/firebase/entities';
import { ClipboardList, Plus, Eye, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';

export default function AnamneseActionCard({ clientId, clientName, mode = 'card', anamnese: anamneseProp = null, onClose, employeeName }) {
  const [loading, setLoading] = useState(false);
  const [anamnese, setAnamnese] = useState(anamneseProp);
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(mode === 'edit' || mode === 'create');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState(anamneseProp?.data || {});
  const [showViewModal, setShowViewModal] = useState(mode === 'view');
  const [anamneseTemplate, setAnamneseTemplate] = useState(null);
  const [signature, setSignature] = useState(anamneseProp?.signature || null);
  const [signatureError, setSignatureError] = useState('');
  const sigCanvasRef = useRef();

  useEffect(() => {
    if (anamneseProp) {
      setAnamnese(anamneseProp);
      setFormData(anamneseProp.data || {});
      setSignature(anamneseProp.signature || null);
    }
  }, [anamneseProp]);

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line
  }, [clientId]);

  useEffect(() => {
    if (anamnese && anamnese.template_id && templates.length > 0) {
      const tpl = templates.find(t => t.id === anamnese.template_id);
      setAnamneseTemplate(tpl);
      setSelectedTemplate(tpl);
    }
  }, [anamnese, templates]);

  useEffect(() => {
    if (sigCanvasRef.current && signature) {
      try {
        sigCanvasRef.current.fromDataURL(signature);
      } catch (e) {
        sigCanvasRef.current.clear();
      }
    } else if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  }, [signature]);

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
    if (!signature) {
      setSignatureError('A assinatura é obrigatória.');
      return;
    }
    try {
      setLoading(true);
      const saveData = {
        template_id: selectedTemplate.id,
        data: formData,
        signature: signature,
      };
      // Se employeeName for passado, salva o nome do funcionário que editou/criou
      if (employeeName) {
        saveData.employeeName = employeeName;
      }
      if (anamnese && anamnese.id) {
        await Client.saveAnamneseById(clientId, anamnese.id, saveData);
      } else {
        // Novo cadastro: gerar id automático
        const newId = String(Date.now());
        await Client.saveAnamneseById(clientId, newId, {
          ...saveData,
          created_at: new Date().toISOString(),
        });
      }
      toast.success('Anamnese salva com sucesso!');
      setShowForm(false);
      setSignature(null);
      if (onClose) onClose();
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

  const renderViewModal = () => {
    if (!showViewModal || !anamnese || !anamneseTemplate) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
          <button onClick={() => setShowViewModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold text-blue-900 mb-4">Anamnese de {clientName}</h2>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {anamneseTemplate.fields.map((field) => {
              let value = anamnese.data?.[field.id];
              if (field.type === 'boolean') {
                return (
                  <div key={field.id}>
                    <span className="font-semibold text-gray-700">{field.label}:</span> {value?.value || '-'}
                    {field.optionalText && value?.value === 'Sim' && value.optional && (
                      <span className="block text-xs text-gray-500 mt-1">{field.optionalText}: {value.optional}</span>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={field.id}>
                    <span className="font-semibold text-gray-700">{field.label}:</span> {value || '-'}
                  </div>
                );
              }
            })}
            {anamnese.signature && (
              <div className="mt-4">
                <span className="font-semibold text-gray-700 block mb-1">Assinatura do Cliente:</span>
                <img src={anamnese.signature} alt="Assinatura do cliente" className="border rounded shadow h-24 bg-gray-50" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSignaturePad = () => (
    <div className="mt-4">
      <label className="font-medium text-gray-700 block mb-1">Assinatura do Cliente <span className="text-red-500">*</span></label>
      <div className="border rounded bg-gray-50 flex flex-col items-center p-2">
        <SignatureCanvas
          ref={sigCanvasRef}
          penColor="#175EA0"
          canvasProps={{ width: 320, height: 100, className: 'rounded bg-white border' }}
          onEnd={() => {
            setSignature(sigCanvasRef.current.getCanvas().toDataURL('image/png'));
            setSignatureError('');
          }}
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => {
            sigCanvasRef.current.clear();
            setSignature(null);
          }}>
            <Trash2 className="w-4 h-4 mr-1" /> Limpar
          </Button>
        </div>
        {signatureError && <span className="text-xs text-red-500 mt-1">{signatureError}</span>}
      </div>
    </div>
  );

  if (mode === 'view' && anamnese) {
    return renderViewModal();
  }
  if (mode === 'edit' && anamnese) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow space-y-4 max-h-[75vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-700" /> Editar Anamnese
          </h2>
          <div className="space-y-4">
            <div>
              <label className="font-medium text-gray-700">Modelo</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={selectedTemplate?.id || ''}
                onChange={e => {
                  const tpl = templates.find(t => t.id === e.target.value);
                  setSelectedTemplate(tpl);
                }}
                disabled
              >
                <option value="">Selecione um modelo</option>
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
            {renderFormFields()}
            {(anamnese && anamnese.signature && !showForm) ? (
              <div className="mt-4">
                <span className="font-semibold text-gray-700 block mb-1">Assinatura do Cliente:</span>
                <img src={anamnese.signature} alt="Assinatura do cliente" className="border rounded shadow h-24 bg-gray-50" />
              </div>
            ) : (
              renderSignaturePad()
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); if (onClose) onClose(); }}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-green-700 text-white">Salvar Alterações</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (mode === 'create') {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow space-y-4 max-h-[75vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-700" /> Cadastrar Anamnese
          </h2>
          <div className="space-y-4">
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
            {(anamnese && anamnese.signature && !showForm) ? (
              <div className="mt-4">
                <span className="font-semibold text-gray-700 block mb-1">Assinatura do Cliente:</span>
                <img src={anamnese.signature} alt="Assinatura do cliente" className="border rounded shadow h-24 bg-gray-50" />
              </div>
            ) : (
              renderSignaturePad()
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); if (onClose) onClose(); }}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-green-700 text-white">Salvar</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-blue-700">Carregando...</div>;
  }

  // Modal para cadastrar, visualizar e editar anamnese
  if (mode === 'modal') {
    // Exibe a anamnese já cadastrada
    if (anamnese && !showForm) {
      return (
        <div className="w-full">
          <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-700" /> Anamnese do Cliente
          </h2>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowViewModal(true)}>
              <Eye className="w-4 h-4" /> Visualizar Anamnese
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => {
              setShowForm(true);
              setSelectedTemplate(anamneseTemplate);
              setFormData(anamnese.data || {});
              setSignature(anamnese.signature || null);
            }}>
              <Plus className="w-4 h-4" /> Editar Anamnese
            </Button>
          </div>
          {renderViewModal()}
        </div>
      );
    }
    // Exibe o formulário para cadastrar anamnese
    if (!anamnese && showForm) {
      return (
        <div className="w-full flex justify-center">
          <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow space-y-4 max-h-[75vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-700" /> Cadastrar Anamnese
            </h2>
            <div className="space-y-4">
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
              {(anamnese && anamnese.signature && !showForm) ? (
                <div className="mt-4">
                  <span className="font-semibold text-gray-700 block mb-1">Assinatura do Cliente:</span>
                  <img src={anamnese.signature} alt="Assinatura do cliente" className="border rounded shadow h-24 bg-gray-50" />
                </div>
              ) : (
                renderSignaturePad()
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowForm(false); if (onClose) onClose(); }}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-green-700 text-white">Salvar</Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Edição de anamnese
    if (anamnese && showForm) {
      return (
        <div className="w-full flex justify-center">
          <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow space-y-4 max-h-[75vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-700" /> Editar Anamnese
            </h2>
            <div className="space-y-4">
              <div>
                <label className="font-medium text-gray-700">Modelo</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={selectedTemplate?.id || ''}
                  onChange={e => {
                    const tpl = templates.find(t => t.id === e.target.value);
                    setSelectedTemplate(tpl);
                  }}
                  disabled
                >
                  <option value="">Selecione um modelo</option>
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </div>
              {renderFormFields()}
              {(anamnese && anamnese.signature && !showForm) ? (
                <div className="mt-4">
                  <span className="font-semibold text-gray-700 block mb-1">Assinatura do Cliente:</span>
                  <img src={anamnese.signature} alt="Assinatura do cliente" className="border rounded shadow h-24 bg-gray-50" />
                </div>
              ) : (
                renderSignaturePad()
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowForm(false); if (onClose) onClose(); }}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-green-700 text-white">Salvar Alterações</Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Exibe botão para cadastrar se não houver anamnese
    if (!anamnese && !showForm) {
      return (
        <div className="w-full">
          <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-700" /> Anamnese do Cliente
          </h2>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Cadastrar Anamnese
          </Button>
        </div>
      );
    }
    return null;
  }

  // Modo antigo (card)
  // Exibe a anamnese já cadastrada
  if (anamnese && !showForm) {
    return (
      <>
        <Card className="mt-4 border-blue-300">
          <CardHeader className="flex flex-row items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-700" />
            <span className="font-semibold text-blue-900">Anamnese do Cliente</span>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowViewModal(true)}>
              <Eye className="w-4 h-4" /> Visualizar Anamnese
            </Button>
          </CardContent>
        </Card>
        {renderViewModal()}
      </>
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
          {(anamnese && anamnese.signature && !showForm) ? (
            <div className="mt-4">
              <span className="font-semibold text-gray-700 block mb-1">Assinatura do Cliente:</span>
              <img src={anamnese.signature} alt="Assinatura do cliente" className="border rounded shadow h-24 bg-gray-50" />
            </div>
          ) : (
            renderSignaturePad()
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowForm(false); if (onClose) onClose(); }}>Cancelar</Button>
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
