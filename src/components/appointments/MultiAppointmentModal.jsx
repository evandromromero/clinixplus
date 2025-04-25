import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Package as PackageIcon, Scissors, Clock, PlusCircle, AlertTriangle } from "lucide-react";

export default function MultiAppointmentModal({
  open,
  onOpenChange,
  clients,
  services,
  ClientPackage, // entidade para buscar pacotes ativos
  employees, // lista de profissionais
  onConfirm,
  pendingServices: pendingServicesProp = [] // NOVO: prop para serviços pendentes
}) {
  // Estados internos da modal
  const [multiClientId, setMultiClientId] = useState("");
  const [multiClientSearch, setMultiClientSearch] = useState("");
  const [multiClientPackages, setMultiClientPackages] = useState([]);
  const [multiSelectedPackageId, setMultiSelectedPackageId] = useState("");
  const [multiSelectedItems, setMultiSelectedItems] = useState([]); // [{ id, name, professional_id }]
  const [multiDateTime, setMultiDateTime] = useState("");
  const [avulsoSearch, setAvulsoSearch] = useState("");
  const [tipoAgendamento, setTipoAgendamento] = useState('');

  // Estados para procedimentos avulsos e pendentes
  const [avulsos, setAvulsos] = useState([]); // Serviços avulsos disponíveis
  const [pendentes, setPendentes] = useState([]); // Serviços pendentes do cliente

  // Novo estado: linhas dinâmicas de agendamento
  const [agendamentoLinhas, setAgendamentoLinhas] = useState([
    { tipo: '', servico: '', profissional: '', data: '', hora: '' }
  ]);

  // Buscar pacotes ativos do cliente ao selecionar
  useEffect(() => {
    if (!multiClientId) {
      setMultiClientPackages([]);
      setMultiSelectedPackageId("");
      setMultiSelectedItems([]);
      return;
    }
    (async () => {
      const pkgs = await ClientPackage.filter({ client_id: multiClientId, status: "ativo" });
      // Normalizar pacotes para garantir nome e serviços
      const pkgsNormalizados = pkgs.map(normalizarPacoteCliente);
      setMultiClientPackages(pkgsNormalizados);
    })();
  }, [multiClientId]);

  // Buscar procedimentos avulsos e pendentes ao selecionar cliente
  useEffect(() => {
    if (!multiClientId) {
      setAvulsos([]);
      setPendentes([]);
      return;
    }
    // Avulsos: todos os serviços disponíveis
    setAvulsos(services || []);
    // Pendentes: usar prop se fornecida
    if (pendingServicesProp && pendingServicesProp.length > 0) {
      setPendentes(pendingServicesProp.map(ps => ({
        ...ps,
        id: ps.service_id || ps.id,
        name: ps.name || (services.find(s => s.id === (ps.service_id || ps.id))?.name ?? 'Procedimento Pendente')
      })));
    } else if (clients && clients.length > 0) {
      const client = clients.find(c => c.id === multiClientId);
      setPendentes(client?.pending_services || []); // fallback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiClientId]);

  // Função auxiliar para montar pacotes do cliente com nome e serviços corretos
  function normalizarPacoteCliente(pkg) {
    // 1. Se tem snapshot, use o nome e serviços do snapshot
    if (pkg.package_snapshot) {
      let snapshotServices = [];
      if (Array.isArray(pkg.package_snapshot.services)) {
        snapshotServices = pkg.package_snapshot.services;
      } else if (pkg.package_snapshot.services && typeof pkg.package_snapshot.services === 'object') {
        snapshotServices = Object.values(pkg.package_snapshot.services);
      }
      console.log('[LOG] normalizarPacoteCliente - snapshotServices:', snapshotServices);
      return {
        ...pkg,
        name: pkg.package_snapshot.name || pkg.name || 'Pacote',
        services: snapshotServices,
      };
    }
    // 2. Se não tem snapshot, tenta buscar na lista global de pacotes
    if (pkg.package_id && Array.isArray(services)) {
      const pacoteGlobal = services.find(p => p.id === pkg.package_id);
      let globalServices = [];
      if (pacoteGlobal && Array.isArray(pacoteGlobal.services)) {
        globalServices = pacoteGlobal.services;
      }
      console.log('[LOG] normalizarPacoteCliente - globalServices:', globalServices);
      return {
        ...pkg,
        name: pacoteGlobal?.name || pkg.name || 'Pacote',
        services: globalServices,
      };
    }
    // 3. Fallback: serviços direto do pacote
    let directServices = [];
    if (Array.isArray(pkg.services)) {
      directServices = pkg.services;
    } else if (pkg.services && typeof pkg.services === 'object') {
      directServices = Object.values(pkg.services);
    }
    console.log('[LOG] normalizarPacoteCliente - directServices:', directServices);
    return {
      ...pkg,
      services: directServices,
    };
  }

  // Serviços do pacote selecionado
  const selectedPackage = multiClientPackages.find(pkg => pkg.id === multiSelectedPackageId);
  let selectedPackageServices = [];
  if (selectedPackage && selectedPackage.services) {
    selectedPackageServices = selectedPackage.services.map(sid => {
      if (typeof sid === "string") return services.find(s => s.id === sid);
      if (typeof sid === "object" && sid.id) return services.find(s => s.id === sid.id);
      return undefined;
    }).filter(Boolean);
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(multiClientSearch.toLowerCase())
  );

  const filteredAvulsos = avulsos.filter(item =>
    item.name && item.name.toLowerCase().includes(avulsoSearch.toLowerCase())
  );

  // Função para obter serviços disponíveis conforme o tipo selecionado
  function getServicosDisponiveis() {
    console.log('[LOG] getServicosDisponiveis chamado. tipoAgendamento:', tipoAgendamento, 'multiSelectedPackageId:', multiSelectedPackageId);
    if (tipoAgendamento === 'pacote') {
      const pacote = multiClientPackages.find(pkg => pkg.id === multiSelectedPackageId);
      console.log('[LOG] Pacote encontrado em getServicosDisponiveis:', pacote);
      if (!pacote || !pacote.services) return [];
      console.log('[LOG] Conteúdo de pacote.services:', pacote.services);
      console.log('[LOG] Lista global de services:', services);
      const servicos = pacote.services.map(sid => {
        let serviceId = null;
        if (typeof sid === 'string') serviceId = sid;
        else if (typeof sid === 'object' && (sid.service_id || sid.id)) serviceId = sid.service_id || sid.id;
        else return undefined;
        const found = services.find(s => s.id === serviceId);
        if (!found) {
          console.log('[LOG] Serviço NÃO encontrado no global para serviceId:', serviceId, 'sid:', sid);
        }
        return found;
      }).filter(Boolean);
      console.log('[LOG] Serviços retornados por getServicosDisponiveis (corrigido):', servicos);
      return servicos;
    }
    if (tipoAgendamento === 'avulso') {
      return avulsos;
    }
    if (tipoAgendamento === 'pendente') {
      return pendentes;
    }
    return [];
  }

  // Função para selecionar o pacote e garantir atualização dos serviços
  function handleSelectPackage(packageId) {
    console.log('[LOG] handleSelectPackage chamado com packageId:', packageId);
    setMultiSelectedPackageId(packageId);
    setTipoAgendamento('pacote'); // Atualiza o tipo de agendamento
    setMultiSelectedItems([]);
    // Log para ajudar a depurar o estado dos pacotes
    const pacoteSelecionado = multiClientPackages.find(pkg => pkg.id === packageId);
    console.log('[LOG] Pacote selecionado:', pacoteSelecionado);
    if (pacoteSelecionado) {
      console.log('[LOG] Serviços do pacote selecionado:', pacoteSelecionado.services);
      if (pacoteSelecionado.package_snapshot) {
        console.log('[LOG] package_snapshot:', pacoteSelecionado.package_snapshot);
      }
    } else {
      console.log('[LOG] Nenhum pacote foi encontrado com esse ID.');
    }
  }

  function handleToggleMultiSelectedItem(item) {
    setMultiSelectedItems(prev => {
      if (prev.some(sel => sel.id === item.id)) {
        return prev.filter(sel => sel.id !== item.id);
      }
      // Adiciona com professional_id vazio
      return [...prev, { ...item, professional_id: '' }];
    });
  }

  function handleProfessionalChange(serviceId, professionalId) {
    setMultiSelectedItems(prev =>
      prev.map(sel =>
        sel.id === serviceId ? { ...sel, professional_id: professionalId } : sel
      )
    );
  }

  function handleConfirm() {
    // Agora exige professional_id preenchido para cada procedimento
    if (!multiClientId || !multiSelectedPackageId || multiSelectedItems.length === 0 || !multiDateTime || multiSelectedItems.some(item => !item.professional_id)) return;
    if (onConfirm) {
      onConfirm({
        client_id: multiClientId,
        package_id: multiSelectedPackageId,
        services: multiSelectedItems,
        date: multiDateTime
      });
    }
    setMultiClientId("");
    setMultiSelectedPackageId("");
    setMultiSelectedItems([]);
    setMultiDateTime("");
    setMultiClientSearch("");
    setMultiClientPackages([]);
  }

  // Função para adicionar uma nova linha de agendamento
  function adicionarLinhaAgendamento() {
    setAgendamentoLinhas([...agendamentoLinhas, { tipo: '', servico: '', profissional: '', data: '', hora: '' }]);
  }

  // Função para remover uma linha
  function removerLinhaAgendamento(idx) {
    setAgendamentoLinhas(agendamentoLinhas.filter((_, i) => i !== idx));
  }

  // Função para atualizar um campo de uma linha
  function atualizarLinhaAgendamento(idx, campo, valor) {
    setAgendamentoLinhas(agendamentoLinhas.map((linha, i) =>
      i === idx ? { ...linha, [campo]: valor } : linha
    ));
  }

  // Função para gerar horários disponíveis baseado no intervalo do profissional
  function getAvailableHours(employeeId) {
    if (!employeeId || !employees) return [];
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !employee.appointment_interval) return [];
    const interval = employee.appointment_interval;
    const intervalInMinutes = interval;
    const startHour = 8;
    const endHour = 20;
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += intervalInMinutes) {
        const h = String(hour).padStart(2, '0');
        const m = String(min).padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  }

  // Função para contar agendamentos existentes para um profissional em um horário e data
  function countAppointments(employeeId, dateStr, hourStr) {
    if (!employeeId || !dateStr || !hourStr) return 0;
    // Supondo que appointments seja passado como prop futuramente, por enquanto sempre retorna 0
    // Para integração real, deve-se passar appointments como prop e filtrar aqui
    return 0;
  }

  // Função para verificar se existe conflito de horário
  function hasTimeConflict(employeeId, dateStr, hourStr) {
    return countAppointments(employeeId, dateStr, hourStr) > 0;
  }

  // Exibir alerta se tentar agendar em horário ocupado
  useEffect(() => {
    agendamentoLinhas.forEach((linha, idx) => {
      if (linha.profissional && linha.data && linha.hora) {
        if (hasTimeConflict(linha.profissional, linha.data, linha.hora)) {
          // Aqui pode-se exibir um alerta visual na linha ou usar toast/alert
          // Exemplo simples: adicionar um campo de erro ou highlight visual
          // Para integração real, utilize um estado de erro por linha
          // window.alert(`Conflito de horário na linha ${idx + 1}`);
        }
      }
    });
  }, [agendamentoLinhas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        style={{
          maxWidth: 1200, 
          minWidth: 800,  
          minHeight: 500, 
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          borderRadius: 18,
          boxShadow: '0 6px 32px #0002',
          padding: 0,
          background: '#fff',
          overflow: 'auto'
        }}
      >
        {/* Coluna 1: Título, Cliente e Pacotes */}
        <div className="flex flex-col flex-1 min-w-[270px] max-w-[340px] px-8 py-8 border-r h-full justify-start bg-white">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
              <PlusCircle className="w-6 h-6 text-primary" /> Novo Agendamento Múltiplo
            </DialogTitle>
          </DialogHeader>
          {/* Cliente */}
          <div className="mb-4">
            <Label htmlFor="multi-client" className="flex items-center gap-2 text-base font-semibold text-primary"><User className="w-4 h-4 mr-1 text-primary" /> Cliente</Label>
            <Input
              placeholder="Buscar cliente..."
              value={multiClientSearch}
              onChange={e => setMultiClientSearch(e.target.value)}
              className="mb-2 mt-1 bg-white border-primary/20 focus:border-primary/60"
            />
            <select
              id="multi-client"
              className="w-full border rounded px-2 py-1 bg-white border-primary/20 focus:border-primary/60"
              value={multiClientId || ''}
              onChange={e => { setMultiClientId(e.target.value); }}
            >
              <option value="">Selecione um cliente</option>
              {filteredClients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          {/* Seletor de tipo de agendamento */}
          <div className="mt-2 space-y-2">
            <Label>Tipo de Agendamento</Label>
            <select
              className="w-full border rounded px-2 py-1 bg-white border-primary/20 focus:border-primary/60"
              value={tipoAgendamento}
              onChange={e => setTipoAgendamento(e.target.value)}
            >
              <option value="">Selecione um tipo</option>
              <option value="pacote">Pacote</option>
              <option value="avulso">Avulso</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          {/* Lista de pacotes do cliente */}
          {tipoAgendamento === 'pacote' && (
            <div className="mt-2 space-y-2">
              <Label>Pacotes ativos do cliente</Label>
              <div className="space-y-1">
                {multiClientPackages.map(pkg => (
                  <div key={pkg.id} className={`border rounded p-2 bg-gray-50 cursor-pointer ${multiSelectedPackageId === pkg.id ? 'ring-2 ring-blue-400' : ''}`}
                    onClick={() => handleSelectPackage(pkg.id)}
                  >
                    <div className="font-semibold text-green-800">{pkg.name}</div>
                    <div className="text-xs text-gray-600">Sessões restantes: {pkg.sessions_left ?? '-'}</div>
                    {pkg.services && Array.isArray(pkg.services) && pkg.services.length > 0 && (
                      <div className="text-xs mt-1 text-gray-700">
                        Procedimentos: {pkg.services.map(sid => {
                          // sid pode ser string (id) ou objeto
                          let nome = '';
                          if (typeof sid === 'string') {
                            const svc = services.find(s => s.id === sid);
                            nome = svc ? svc.name : sid;
                          } else if (typeof sid === 'object') {
                            nome = sid.name || (sid.id && (services.find(s => s.id === sid.id)?.name)) || sid.id || '[objeto]';
                          }
                          return nome;
                        }).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Coluna 2: Procedimentos e Horário */}
        <div className="flex-1 min-w-[240px] space-y-6 pl-8 pr-8 py-8 bg-white">
          {/* Linhas dinâmicas de agendamento */}
          <div>
            <Label className="flex items-center gap-2 text-base font-semibold text-primary">Linhas de Agendamento</Label>
            {agendamentoLinhas.map((linha, idx) => {
              const servicosDisponiveis = getServicosDisponiveis();
              return (
                <div key={idx} className="flex flex-row gap-2 items-center mb-2">
                  {/* Serviço */}
                  <select
                    className="border rounded px-2 py-1 bg-white border-primary/20 focus:border-primary/60"
                    value={linha.servico}
                    onChange={e => atualizarLinhaAgendamento(idx, 'servico', e.target.value)}
                  >
                    <option value="">Serviço...</option>
                    {servicosDisponiveis.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {/* Profissional */}
                  <select
                    className="border rounded px-2 py-1 bg-white border-primary/20 focus:border-primary/60"
                    value={linha.profissional}
                    onChange={e => atualizarLinhaAgendamento(idx, 'profissional', e.target.value)}
                  >
                    <option value="">Profissional...</option>
                    {employees && employees.length > 0 && employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  {/* Data */}
                  <input
                    type="date"
                    className="border rounded px-2 py-1 bg-white border-primary/20 focus:border-primary/60"
                    value={linha.data}
                    onChange={e => atualizarLinhaAgendamento(idx, 'data', e.target.value)}
                  />
                  {/* Hora */}
                  <select
                    className="border rounded px-2 py-1 bg-white border-primary/20 focus:border-primary/60"
                    value={linha.hora}
                    onChange={e => atualizarLinhaAgendamento(idx, 'hora', e.target.value)}
                  >
                    <option value="">Horário...</option>
                    {linha.profissional && linha.data && getAvailableHours(linha.profissional).map(horario => {
                      const agendamentos = countAppointments(linha.profissional, linha.data, horario);
                      return (
                        <option key={horario} value={horario} style={agendamentos > 0 ? { color: 'red', fontWeight: 'bold' } : {}}>
                          {horario} {agendamentos > 0 ? `(${agendamentos} agendamento${agendamentos > 1 ? 's' : ''})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button type="button" className="text-red-600 ml-2" onClick={() => removerLinhaAgendamento(idx)}>Remover</button>
                </div>
              );
            })}
            <Button onClick={adicionarLinhaAgendamento}>Adicionar Linha</Button>
          </div>
          {/* Seleção de Horários */}
          <div>
            <Label className="flex items-center gap-2 text-base font-semibold text-primary"><Clock className="w-4 h-4 mr-1 text-primary" /> Horário</Label>
            <Input
              type="datetime-local"
              value={multiDateTime}
              onChange={e => setMultiDateTime(e.target.value)}
              className="mt-1 bg-white border-primary/20 focus:border-primary/60"
            />
          </div>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleConfirm} disabled={!multiClientId || !multiSelectedPackageId || multiSelectedItems.length === 0 || !multiDateTime || multiSelectedItems.some(item => !item.professional_id)}>
              Confirmar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
