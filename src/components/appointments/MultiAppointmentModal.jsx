import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Package as PackageIcon, Scissors, Clock, PlusCircle, AlertTriangle, ChevronDown, X } from "lucide-react";
import "./MultiAppointmentModal.mobile.css"; // Importação do CSS apenas para mobile

export default function MultiAppointmentModal({
  open,
  onOpenChange,
  clients,
  services,
  ClientPackage, // entidade para buscar pacotes ativos
  employees, // lista de profissionais
  onConfirm,
  pendingServices: pendingServicesProp = [], // NOVO: prop para serviços pendentes
  PendingService // NOVO: entidade para buscar serviços pendentes
}) {
  // Estados internos da modal
  const [multiClientId, setMultiClientId] = useState("");
  const [multiClientSearch, setMultiClientSearch] = useState("");
  const [multiClientPackages, setMultiClientPackages] = useState([]);
  const [multiSelectedPackageId, setMultiSelectedPackageId] = useState("");
  const [agendamentoLinhas, setAgendamentoLinhas] = useState([
    { tipo: '', servico: '', profissional: '', data: '', hora: '', original_appointment_id: null }
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
    
    // Carregar serviços pendentes
    const carregarServicosPendentes = async () => {
      try {
        // Se temos a entidade PendingService, buscar diretamente do Firebase
        if (PendingService) {
          console.log("[MultiAppointmentModal] Buscando serviços pendentes para cliente:", multiClientId);
          const pendingServicesData = await PendingService.filter({
            client_id: multiClientId,
            status: "pendente"
          });
          console.log("[MultiAppointmentModal] Serviços pendentes encontrados:", pendingServicesData);
          
          // Normalizar os serviços pendentes com informações completas
          const pendentesNormalizados = pendingServicesData.map(ps => {
            const serviceInfo = services.find(s => s.id === ps.service_id);
            return {
              ...ps,
              id: ps.service_id || ps.id,
              name: serviceInfo?.name || ps.name || 'Procedimento Pendente'
            };
          });
          
          setPendentes(pendentesNormalizados);
        } 
        // Se não temos a entidade, usar a prop ou o fallback
        else if (pendingServicesProp && pendingServicesProp.length > 0) {
          setPendentes(pendingServicesProp.map(ps => ({
            ...ps,
            id: ps.service_id || ps.id,
            name: ps.name || (services.find(s => s.id === (ps.service_id || ps.id))?.name ?? 'Procedimento Pendente')
          })));
        } else if (clients && clients.length > 0) {
          const client = clients.find(c => c.id === multiClientId);
          setPendentes(client?.pending_services || []); // fallback
        }
      } catch (error) {
        console.error("[MultiAppointmentModal] Erro ao carregar serviços pendentes:", error);
      }
    };
    
    carregarServicosPendentes();
    
  }, [multiClientId, services, clients, pendingServicesProp, PendingService]);

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
      tipo: tipoAgendamento || 'avulso'
    }));
    const dadosParaSalvar = {
      client_id: multiClientId,
      package_id: tipoAgendamento === 'pacote' ? packageIdToSend : null, // Usar null em vez de undefined
      agendamentos: linhasCorrigidas
    };
    console.log('[DEBUG][MultiAppointmentModal] handleConfirm - Dados enviados para onConfirm:', dadosParaSalvar);
    if (onConfirm) {
      onConfirm(dadosParaSalvar);
    }
    setMultiClientId("");
    setMultiSelectedPackageId("");
    setAgendamentoLinhas([{ tipo: '', servico: '', profissional: '', data: '', hora: '', original_appointment_id: null }]);
    setMultiClientSearch("");
    setMultiClientPackages([]);
  }

  // Função para adicionar uma nova linha de agendamento
  function adicionarLinhaAgendamento() {
    setAgendamentoLinhas([...agendamentoLinhas, { tipo: '', servico: '', profissional: '', data: '', hora: '', original_appointment_id: null }]);
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
    
    // Limpar todas as linhas existentes e criar apenas uma linha com os dados da sessão
    setAgendamentoLinhas([{
      tipo: 'pacote',
      servico: serviceId,
      profissional: sessaoParaReagendar?.employee_id || '',
      data: '',
      hora: '',
      original_appointment_id: sessaoParaReagendar?.appointment_id || null // Adicionar ID do agendamento original
    }]);
    
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
    
    // Limpar todas as linhas existentes e criar apenas uma linha com os dados da sessão
    setAgendamentoLinhas([{
      tipo: 'pacote',
      servico: sessao.service_id,
      profissional: sessao.employee_id || '',
      data: '',
      hora: '',
      original_appointment_id: sessao.appointment_id // Adicionar ID do agendamento original
    }]);
    
    // Rolar para a área de agendamento
    setTimeout(() => {
      const agendamentoArea = document.querySelector('.agendamento-linhas');
      if (agendamentoArea) {
        agendamentoArea.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  // Função para validar o formulário antes de habilitar o botão de confirmar
  function isFormValid() {
    // Verificar se cliente e tipo foram selecionados
    if (!multiClientId || !tipoAgendamento) return false;
    
    // Verificar se todas as linhas estão preenchidas
    return agendamentoLinhas.every(linha => 
      linha.servico && linha.profissional && linha.data && linha.hora
    );
  }

  // Função para obter todas as sessões reagendáveis do pacote selecionado
  function getTodasSessoesReagendaveis() {
    // Verificar se há um pacote selecionado
    if (!multiSelectedPackageId) return [];
    
    // Buscar o pacote selecionado
    const pacote = multiClientPackages.find(pkg => pkg.id === multiSelectedPackageId);
    if (!pacote || !pacote.session_history) return [];
    
    // Filtrar todas as sessões não concluídas
    return pacote.session_history.filter(h => h.status !== 'concluido');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="dialog-content-mobile"
        style={{
          maxWidth: 1200, 
          minWidth: 800,  
          height: 'calc(100vh - 80px)', // Altura máxima com margem
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          borderRadius: 18,
          boxShadow: '0 6px 32px rgba(0, 0, 0, 0.12)',
          padding: 0,
          background: '#fff',
          overflow: 'hidden'
        }}
      >
        {/* Coluna 1: Título, Cliente e Pacotes */}
        <div className="flex flex-col flex-1 min-w-[270px] max-w-[340px] px-8 py-8 border-r h-full justify-start bg-gradient-to-b from-blue-50 to-white column-1-mobile">
          <DialogHeader className="mb-6 p-0">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
              <PlusCircle className="w-6 h-6 text-primary" /> Novo Agendamento Múltiplo
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Agende múltiplos serviços para um cliente</p>
          </DialogHeader>
          {/* Cliente */}
          <div className="mb-6">
            <Label htmlFor="multi-client" className="flex items-center gap-2 text-base font-semibold text-primary mb-2">
              <User className="w-4 h-4 mr-1 text-primary" /> Cliente
            </Label>
            <div className="relative mb-2">
              <Input
                placeholder="Buscar cliente..."
                value={multiClientSearch}
                onChange={e => setMultiClientSearch(e.target.value)}
                className="mb-2 mt-1 bg-white border-primary/20 focus:border-primary/60 pl-8"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-2 top-[13px]" />
            </div>
            <div className="relative">
              <select
                id="multi-client"
                className="w-full border rounded-md px-3 py-2 bg-white border-primary/20 focus:border-primary/60 appearance-none text-gray-700"
                value={multiClientId || ''}
                onChange={e => { setMultiClientId(e.target.value); }}
              >
                <option value="">Selecione um cliente</option>
                {filteredClients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-[10px] pointer-events-none" />
            </div>
          </div>
          {/* Seletor de tipo de agendamento */}
          <div className="mb-6">
            <Label className="flex items-center gap-2 text-base font-semibold text-primary mb-2">Tipo de Agendamento</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoAgendamento('pacote')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border transition-all ${
                  tipoAgendamento === 'pacote' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PackageIcon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Pacote</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoAgendamento('avulso')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border transition-all ${
                  tipoAgendamento === 'avulso' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Scissors className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Avulso</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoAgendamento('pendente')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border transition-all ${
                  tipoAgendamento === 'pendente' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">Pendente</span>
              </button>
            </div>
          </div>
          {/* Lista de pacotes do cliente */}
          {tipoAgendamento === 'pacote' && (
            <div className="mt-2 space-y-2 overflow-auto flex-grow">
              <Label className="flex items-center gap-2 text-base font-semibold text-primary mb-2">
                <PackageIcon className="w-4 h-4 mr-1 text-primary" /> Pacotes ativos
              </Label>
              <div className="space-y-3 pr-1 max-h-[calc(100vh-450px)] overflow-auto">
                {multiClientPackages.map(pkg => (
                  <div 
                    key={pkg.id} 
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${
                      multiSelectedPackageId === pkg.id 
                        ? 'ring-2 ring-primary bg-primary/5 border-primary/30' 
                        : 'bg-white border-gray-200'
                    }`}
                    onClick={() => handleSelectPackage(pkg.id)}
                  >
                    <div className="font-semibold text-primary">{pkg.name}</div>
                    <div className="text-xs text-gray-600 mt-1">Sessões restantes: {pkg.sessions_left ?? '-'}</div>
                    {pkg.services && Array.isArray(pkg.services) && pkg.services.length > 0 && (
                      <div className="text-xs mt-2 text-gray-700">
                        <div className="font-medium mb-1">Procedimentos:</div>
                        <ul className="ml-1 space-y-1.5">
                          {pkg.services.map(sid => {
                            let serviceId = null;
                            if (typeof sid === 'string') serviceId = sid;
                            else if (typeof sid === 'object' && (sid.service_id || sid.id)) serviceId = sid.service_id || sid.id;
                            else return undefined;
                            const found = services.find(s => s.id === serviceId);
                            if (!found) {
                              console.log('[LOG] Serviço NÃO encontrado no global para serviceId:', serviceId, 'sid:', sid);
                            }
                            return (
                              <li key={serviceId} className="flex items-center gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center">
                                    <Scissors className="w-3 h-3 text-gray-500 mr-1" />
                                    <span>{found?.name || sid.name || serviceId}</span>
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100">
                                    {getSessionsLeft(pkg, serviceId) && `${getSessionsLeft(pkg, serviceId).left}/${getSessionsLeft(pkg, serviceId).total}`}
                                  </span>
                                </div>
                                {getReagendaveis(pkg, serviceId).length > 0 && (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="mt-1 text-orange-600 border-orange-300 hover:bg-orange-50 py-0 h-6 text-xs"
                                    onClick={() => handleReagendarSessao(pkg, serviceId)}
                                    title="Reagendar sessão não concluída"
                                  >
                                    <Clock className="w-3 h-3 mr-1" /> Reagendar sessão
                                  </Button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                {multiClientPackages.length === 0 && multiClientId && (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <PackageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm">Este cliente não possui pacotes ativos</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {tipoAgendamento === 'pendente' && (
            <div className="space-y-4">
              <Label className="font-medium">Serviços Pendentes</Label>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {pendentes.length > 0 ? (
                  pendentes.map((servico) => (
                    <div
                      key={servico.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all border-amber-200 hover:border-amber-300 bg-amber-50`}
                      onClick={() => {
                        // Criar uma linha de agendamento com este serviço pendente
                        setAgendamentoLinhas([{
                          tipo: 'pendente',
                          servico: servico.id || servico.service_id,
                          profissional: '',
                          data: '',
                          hora: '',
                          original_appointment_id: null,
                          pending_service_id: servico.id // Guardar o ID do serviço pendente
                        }]);
                        
                        // Rolar para a área de agendamento
                        setTimeout(() => {
                          const agendamentoArea = document.querySelector('.agendamento-linhas');
                          if (agendamentoArea) {
                            agendamentoArea.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{servico.name}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                          Pendente
                        </span>
                      </div>
                      {servico.notes && (
                        <div className="text-xs text-gray-600 mt-2">
                          <div className="font-medium mb-1">Observações:</div>
                          <p className="ml-1">{servico.notes}</p>
                        </div>
                      )}
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-amber-600 border-amber-200 hover:bg-amber-100 h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Criar uma linha de agendamento com este serviço pendente
                            setAgendamentoLinhas([{
                              tipo: 'pendente',
                              servico: servico.id || servico.service_id,
                              profissional: '',
                              data: '',
                              hora: '',
                              original_appointment_id: null,
                              pending_service_id: servico.id // Guardar o ID do serviço pendente
                            }]);
                            
                            // Rolar para a área de agendamento
                            setTimeout(() => {
                              const agendamentoArea = document.querySelector('.agendamento-linhas');
                              if (agendamentoArea) {
                                agendamentoArea.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 100);
                          }}
                        >
                          <Clock className="w-4 h-4 mr-1" /> Agendar este serviço
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-4 text-gray-500 text-sm">
                    Nenhum serviço pendente encontrado
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Coluna 2: Procedimentos e Horário */}
        <div className="flex-1 min-w-[240px] space-y-6 pl-8 pr-8 py-8 bg-white overflow-auto column-2-mobile">
          {/* Área de sessões para reagendar */}
          {tipoAgendamento === 'pacote' && multiSelectedPackageId && getTodasSessoesReagendaveis().length > 0 && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-medium text-gray-800">Sessões pendentes para reagendar</h3>
              </div>
              <div className="flex flex-wrap gap-3 mb-2">
                {getTodasSessoesReagendaveis().map((sessao, idx) => {
                  const servicoInfo = services.find(s => s.id === sessao.service_id);
                  return (
                    <div 
                      key={idx} 
                      className="bg-white border border-orange-200 rounded-md p-3 text-xs flex-1 min-w-[200px] max-w-[250px] shadow-sm"
                    >
                      <div className="flex items-center gap-1 text-orange-700">
                        <Clock className="h-3.5 w-3.5 text-orange-500" />
                        <span className="font-medium">{formatDateTime(sessao.date)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        <span>{sessao.employee_name || 'Profissional não informado'}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <Scissors className="h-3.5 w-3.5 text-gray-500" />
                        <span>{sessao.service_name || servicoInfo?.name || 'Serviço não informado'}</span>
                      </div>
                      {sessao.status && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {sessao.status === 'cancelado' ? 'Cancelado' : sessao.status === 'faltou' ? 'Faltou' : 'Não concluído'}
                          </span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full text-orange-600 border-orange-300 hover:bg-orange-100 h-8"
                        onClick={() => handleReagendarSessaoEspecifica(sessao)}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" /> Reagendar esta sessão
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Linhas dinâmicas de agendamento */}
          <div className="agendamento-linhas">
            <div className="flex items-center justify-between mb-4">
              <Label className="flex items-center gap-2 text-base font-semibold text-primary">
                <PlusCircle className="w-4 h-4 text-primary" /> Linhas de Agendamento
              </Label>
              <Button 
                type="button" 
                onClick={adicionarLinhaAgendamento} 
                className="h-8 px-3 bg-primary/10 hover:bg-primary/20 text-primary border-none"
                disabled={!multiClientId || !tipoAgendamento}
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Adicionar Linha
              </Button>
            </div>
            
            {agendamentoLinhas.map((linha, idx) => {
              const servicosDisponiveis = getServicosDisponiveis().filter(s => {
                if (tipoAgendamento === 'pacote' && selectedPackage) {
                  const sess = getSessionsLeft(selectedPackage, s.id);
                  return !sess || sess.left > 0;
                }
                return true;
              });
              return (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg mb-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Agendamento #{idx + 1}</span>
                    {idx > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-red-500 hover:bg-red-50"
                        onClick={() => removerLinhaAgendamento(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3 grid-mobile">
                    {/* Serviço */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Serviço</Label>
                      <div className="relative">
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-white border-gray-200 focus:border-primary/60 appearance-none text-gray-700"
                          value={linha.servico}
                          onChange={e => atualizarLinhaAgendamento(idx, 'servico', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {servicosDisponiveis.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-[10px] pointer-events-none" />
                      </div>
                    </div>
                    {/* Profissional */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Profissional</Label>
                      <div className="relative">
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-white border-gray-200 focus:border-primary/60 appearance-none text-gray-700"
                          value={linha.profissional}
                          onChange={e => atualizarLinhaAgendamento(idx, 'profissional', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {employees && employees.length > 0 && employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-[10px] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 grid-mobile">
                    {/* Data */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Data</Label>
                      <div className="relative">
                        <input
                          type="date"
                          className="w-full border rounded-md px-3 py-2 bg-white border-gray-200 focus:border-primary/60 text-gray-700"
                          value={linha.data}
                          onChange={e => atualizarLinhaAgendamento(idx, 'data', e.target.value)}
                        />
                      </div>
                    </div>
                    {/* Hora */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Horário</Label>
                      <div className="relative">
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-white border-gray-200 focus:border-primary/60 appearance-none text-gray-700"
                          value={linha.hora}
                          onChange={e => atualizarLinhaAgendamento(idx, 'hora', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {linha.profissional && linha.data && getAvailableHours(linha.profissional).map(horario => {
                            const agendamentos = countAppointments(linha.profissional, linha.data, horario);
                            return (
                              <option 
                                key={horario} 
                                value={horario} 
                                className={agendamentos > 0 ? "text-red-500 font-semibold" : ""}
                              >
                                {horario} {agendamentos > 0 ? `(${agendamentos} agendamento${agendamentos > 1 ? 's' : ''})` : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-[10px] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {agendamentoLinhas.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <PlusCircle className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Selecione um cliente e tipo de agendamento para começar</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t buttons-mobile">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-gray-300 text-gray-700 button-mobile"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm} 
              disabled={!isFormValid()}
              className="bg-primary hover:bg-primary/90 button-mobile"
            >
              Confirmar Agendamentos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
