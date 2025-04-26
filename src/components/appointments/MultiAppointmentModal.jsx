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
  const [agendamentoLinhas, setAgendamentoLinhas] = useState([
    { tipo: '', servico: '', profissional: '', data: '', hora: '' }
  ]);

  // Estados para procedimentos avulsos e pendentes
  const [avulsos, setAvulsos] = useState([]); // Serviços avulsos disponíveis
  const [pendentes, setPendentes] = useState([]); // Serviços pendentes do cliente

  // Corrigir: garantir que tipoAgendamento está definido como estado
  const [tipoAgendamento, setTipoAgendamento] = useState('');

  // Corrigir: garantir que avulsoSearch está definido como estado
  const [avulsoSearch, setAvulsoSearch] = useState("");

  // Buscar pacotes ativos do cliente ao selecionar
  useEffect(() => {
    if (!multiClientId) {
      setMultiClientPackages([]);
      setMultiSelectedPackageId("");
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

  // Função utilitária para calcular sessões restantes por serviço do pacote
  function getSessionsLeft(pkg, serviceId) {
    if (!pkg || !pkg.session_history || !pkg.services) return null;
    // Encontrar objeto do serviço no pacote (pode ser string ou objeto)
    let serviceObj = null;
    if (Array.isArray(pkg.services)) {
      for (const s of pkg.services) {
        if (
          (typeof s === 'string' && s === serviceId) ||
          (typeof s === 'object' && (s.id === serviceId || s.service_id === serviceId))
        ) {
          serviceObj = s;
          break;
        }
      }
    }
    // Buscar quantidade total (quantity ou total, senão fallback 1)
    let total = 1;
    if (serviceObj) {
      total = serviceObj.quantity || serviceObj.total || 1;
    }
    // Contar sessões usadas
    let used = 0;
    if (Array.isArray(pkg.session_history)) {
      used = pkg.session_history.filter(h => {
        // Normaliza para comparar corretamente
        return (
          h.status === 'concluido' &&
          (h.service_id === serviceId || h.service_id === (serviceObj?.id || serviceObj?.service_id))
        );
      }).length;
    }
    return { total, used, left: Math.max(0, total - used) };
  }

  // Função utilitária para calcular sessões reagendáveis (não concluídas)
  function getReagendaveis(pkg, serviceId) {
    if (!pkg || !pkg.session_history) return [];
    // Sessões não concluídas (ex: faltou, cancelada, etc)
    return pkg.session_history.filter(h =>
      h.service_id === serviceId && h.status !== 'concluido'
    );
  }

  // Função para formatar data e hora para exibição
  function formatDateTime(dateString) {
    if (!dateString) return 'Data não disponível';
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return 'Data inválida';
    }
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

  // Nova lógica: permitir confirmar se todas as linhas de agendamento têm serviço, profissional, data e hora preenchidos
  const podeConfirmar =
    multiClientId &&
    multiSelectedPackageId &&
    agendamentoLinhas.length > 0 &&
    agendamentoLinhas.every(linha => linha.servico && linha.profissional && linha.data && linha.hora);

  // Função para confirmar múltiplos agendamentos
  function handleConfirm() {
    console.log('[DEBUG][MultiAppointmentModal] handleConfirm chamado');
    console.log('[DEBUG][MultiAppointmentModal] Estado atual:', {
      multiClientId,
      multiSelectedPackageId,
      tipoAgendamento,
      agendamentoLinhas,
      multiClientPackages
    });
    let packageIdToSend = multiSelectedPackageId;
    if (tipoAgendamento === 'pacote' && !multiSelectedPackageId && multiClientPackages.length > 0) {
      packageIdToSend = multiClientPackages[0].id;
    }
    // Força o tipo correto em todas as linhas antes de enviar
    const linhasCorrigidas = agendamentoLinhas.map(linha => ({
      ...linha,
      tipo: tipoAgendamento
    }));
    console.log('[DEBUG][MultiAppointmentModal] handleConfirm - Linhas corrigidas:', linhasCorrigidas);
    const dadosParaSalvar = {
      client_id: multiClientId,
      package_id: tipoAgendamento === 'pacote' ? packageIdToSend : undefined,
      agendamentos: linhasCorrigidas
    };
    console.log('[DEBUG][MultiAppointmentModal] handleConfirm - Dados enviados para onConfirm:', dadosParaSalvar);
    if (onConfirm) {
      onConfirm(dadosParaSalvar);
    }
    setMultiClientId("");
    setMultiSelectedPackageId("");
    setAgendamentoLinhas([{ tipo: '', servico: '', profissional: '', data: '', hora: '' }]);
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

  // Função de ação para reagendamento
  function handleReagendarSessao(pkg, serviceId) {
    // Encontrar a primeira sessão não concluída para este serviço
    const reagendaveis = getReagendaveis(pkg, serviceId);
    const sessaoParaReagendar = reagendaveis.length > 0 ? reagendaveis[0] : null;
    
    // Adicionar uma linha pré-preenchida para reagendar
    setAgendamentoLinhas(prev => [
      ...prev,
      {
        tipo: 'pacote',
        servico: serviceId,
        profissional: sessaoParaReagendar?.employee_id || '',
        data: '',
        hora: ''
      }
    ]);
    
    // Rolar para a área de agendamento
    setTimeout(() => {
      const agendamentoArea = document.querySelector('.agendamento-linhas');
      if (agendamentoArea) {
        agendamentoArea.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  // Nova função para reagendar uma sessão específica
  function handleReagendarSessaoEspecifica(sessao) {
    if (!sessao) return;
    
    // Adicionar uma linha pré-preenchida com os dados da sessão específica
    setAgendamentoLinhas(prev => [
      ...prev,
      {
        tipo: 'pacote',
        servico: sessao.service_id,
        profissional: sessao.employee_id || '',
        data: '',
        hora: ''
      }
    ]);
    
    // Rolar para a área de agendamento
    setTimeout(() => {
      const agendamentoArea = document.querySelector('.agendamento-linhas');
      if (agendamentoArea) {
        agendamentoArea.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

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
                        Procedimentos:
                        <ul className="ml-2 list-disc">
                          {pkg.services.map(sid => {
                            let serviceId = typeof sid === 'string' ? sid : sid.id || sid.service_id;
                            const svc = services.find(s => s.id === serviceId || s.service_id === serviceId);
                            let nome = svc ? svc.name : (sid.name || serviceId);
                            const sess = getSessionsLeft(pkg, serviceId);
                            const reagendaveis = getReagendaveis(pkg, serviceId);
                            return (
                              <li key={serviceId} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span>{nome} {sess && `(${sess.left}/${sess.total} sessões)`}</span>
                                  {reagendaveis.length > 0 && (
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      className="ml-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                                      onClick={() => handleReagendarSessao(pkg, serviceId)}
                                      title="Reagendar sessão não concluída"
                                    >
                                      Reagendar sessão
                                    </Button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
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
          {/* Área de sessões para reagendar */}
          {multiSelectedPackageId && (() => {
            // Buscar todas as sessões reagendáveis do pacote selecionado
            const pacote = multiClientPackages.find(pkg => pkg.id === multiSelectedPackageId);
            if (!pacote || !pacote.session_history) return null;
            
            // Filtrar todas as sessões não concluídas
            const todasSessoesReagendaveis = pacote.session_history.filter(h => h.status !== 'concluido');
            
            if (todasSessoesReagendaveis.length === 0) return null;
            
            return (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-gray-700">Sessões pendentes para reagendar:</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {todasSessoesReagendaveis.map((sessao, idx) => {
                    const servicoInfo = services.find(s => s.id === sessao.service_id);
                    return (
                      <div 
                        key={idx} 
                        className="bg-orange-50 border border-orange-200 rounded-md p-2 text-xs flex-1 min-w-[200px] max-w-[250px]"
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span className="font-medium">{formatDateTime(sessao.date)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-500" />
                          <span>{sessao.employee_name || 'Profissional não informado'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <Scissors className="h-3 w-3 text-gray-500" />
                          <span>{sessao.service_name || servicoInfo?.name || 'Serviço não informado'}</span>
                        </div>
                        {sessao.status && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {sessao.status === 'cancelado' ? 'Cancelado' : sessao.status === 'faltou' ? 'Faltou' : 'Não concluído'}
                            </span>
                          </div>
                        )}
                        <Button
                          size="xs"
                          variant="outline"
                          className="mt-2 w-full text-orange-600 border-orange-300 hover:bg-orange-100"
                          onClick={() => handleReagendarSessaoEspecifica(sessao)}
                        >
                          Reagendar esta sessão
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          
          {/* Linhas dinâmicas de agendamento */}
          <div className="agendamento-linhas">
            <Label className="flex items-center gap-2 text-base font-semibold text-primary">Linhas de Agendamento</Label>
            {agendamentoLinhas.map((linha, idx) => {
              const servicosDisponiveis = getServicosDisponiveis().filter(s => {
                if (tipoAgendamento === 'pacote' && selectedPackage) {
                  const sess = getSessionsLeft(selectedPackage, s.id);
                  return !sess || sess.left > 0;
                }
                return true;
              });
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
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleConfirm} disabled={!podeConfirmar}>
              Confirmar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
