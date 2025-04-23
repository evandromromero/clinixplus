import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Eye, Pencil } from 'lucide-react';
import { Client, AnamneseTemplate } from '@/firebase/entities';
import toast from 'react-hot-toast';
import AnamneseActionCard from './AnamneseActionCard';

export default function AnamneseListCard({ clientId, clientName }) {
  const [anamneses, setAnamneses] = useState([]);
  const [selectedAnamnese, setSelectedAnamnese] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnamneses();
  }, [clientId]);

  const loadAnamneses = async () => {
    setLoading(true);
    try {
      // Busca todas as anamneses do cliente
      const snapshot = await Client.listAnamneses(clientId);
      setAnamneses(snapshot || []);
    } catch (error) {
      toast.error('Erro ao buscar anamneses do cliente.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-700" /> Anamneses do Cliente
        </h2>
        <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowEdit(true)}>
          <Plus className="w-4 h-4" /> Nova Anamnese
        </Button>
      </div>
      {anamneses.length === 0 && (
        <Card className="border-blue-200">
          <CardContent className="text-gray-500">Nenhuma anamnese cadastrada.</CardContent>
        </Card>
      )}
      {anamneses.map((anamnese) => (
        <Card key={anamnese.id} className="border-blue-300">
          <CardHeader className="flex flex-row items-center gap-2 justify-between">
            <span className="font-semibold text-blue-900">{anamnese.created_at ? new Date(anamnese.created_at).toLocaleDateString('pt-BR') : 'Sem data'}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setSelectedAnamnese(anamnese); setShowView(true); }}>
                <Eye className="w-4 h-4" /> Mostrar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectedAnamnese(anamnese); setShowEdit(true); }}>
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
      {/* Modal de visualização */}
      {showView && selectedAnamnese && (
        <AnamneseActionCard
          clientId={clientId}
          clientName={clientName}
          mode="view"
          anamnese={selectedAnamnese}
          onClose={() => { setShowView(false); setSelectedAnamnese(null); loadAnamneses(); }}
        />
      )}
      {/* Modal de edição/cadastro */}
      {showEdit && (
        <AnamneseActionCard
          clientId={clientId}
          clientName={clientName}
          mode={selectedAnamnese ? 'edit' : 'create'}
          anamnese={selectedAnamnese}
          onClose={() => { setShowEdit(false); setSelectedAnamnese(null); loadAnamneses(); }}
        />
      )}
    </div>
  );
}
