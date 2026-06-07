import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/mockApi";
import { 
  History, 
  Trash2, 
  RefreshCcw, 
  Search, 
  FileText, 
  ShieldAlert, 
  Luggage, 
  Copy, 
  ArrowLeftRight,
  UserCheck,
  Clock,
  Layers
} from "lucide-react";
import { ProcessoPIR, SITUACOES, SituacaoType } from "../types";

export default function Historico() {
  const [viewMode, setViewMode] = useState<"lotes" | "bagagens">("lotes");
  const [activeTab, setActiveTab] = useState<"ativos" | "lixeira">("ativos");
  const [processes, setProcesses] = useState<ProcessoPIR[]>([]);
  const [expiredBags, setExpiredBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Refresh and load lists
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (viewMode === "lotes") {
        // We pass query param includeDeleted=true if we are viewing the trash tab
        const isLixeira = activeTab === "lixeira";
        const res = await apiFetch(`/api/processes?includeDeleted=${isLixeira}`);
        if (!res.ok) {
          throw new Error("Erro ao carregar dados do histórico.");
        }
        const data = await res.json();
        setProcesses(data);
      } else {
        const res = await apiFetch("/api/baggages/expired");
        if (!res.ok) {
          throw new Error("Erro ao carregar bagagens expiradas ou descartadas.");
        }
        const data = await res.json();
        setExpiredBags(data);
      }
    } catch (e: any) {
      console.error(e);
      setError("Falha ao sincronizar com o banco: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    setExpandedId(null);
  }, [viewMode, activeTab]);

  // Soft Delete handler (Move to Lixeira)
  const handleSoftDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente mover este processo PIR para a lixeira?")) {
      return;
    }
    try {
      setLoading(true);
      const response = await apiFetch(`/api/processes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true })
      });
      if (!response.ok) {
        throw new Error("Não foi possível excluir o item.");
      }
      // Reload lists
      await fetchAll();
      alert("Processo movido para a lixeira com sucesso!");
    } catch (e: any) {
      alert("Erro ao remover: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Restore handler for reports
  const handleRestore = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/processes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: false })
      });
      if (!response.ok) {
        throw new Error("Não foi possível restaurar o item.");
      }
      await fetchAll();
      alert("Processo restaurado e reintegrado com sucesso!");
    } catch (e: any) {
      alert("Erro ao restaurar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Permanent Delete Handler for reports
  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm("ATENÇÃO: Deseja realmente EXCLUIR PERMANENTEMENTE este processo do banco de dados? Esta ação é irreversível.")) {
      return;
    }
    try {
      setLoading(true);
      const response = await apiFetch(`/api/processes/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Falha na remoção do banco central.");
      }
      await fetchAll();
      alert("Processo excluído permanentemente do servidor central.");
    } catch (e: any) {
      alert("Erro ao apagar permanentemente: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Baggage restore logic (resets timestamp and sets deleted = false)
  const handleRestoreBaggage = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/baggages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true })
      });
      if (!res.ok) {
        throw new Error("Não foi possível restaurar a bagagem.");
      }
      await fetchAll();
      alert("Bagagem restaurada com sucesso! Ela retornou à tabela ativa e seu cronômetro de 24h foi zerado.");
    } catch (e: any) {
      alert("Erro ao restaurar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Baggage permanent delete
  const handlePermanentDeleteBaggage = async (id: string) => {
    if (!window.confirm("ATENÇÃO: Deseja realmente EXCLUIR PERMANENTEMENTE esta bagagem do banco de dados?")) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch(`/api/baggages/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error("Falha na remoção da bagagem.");
      }
      await fetchAll();
      alert("Bagagem excluída com sucesso.");
    } catch (e: any) {
      alert("Erro ao excluir bagagem: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Search logic for processes
  const filteredList = processes.filter((proc) => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase().trim();
    
    // check ID
    if (proc.id.toLowerCase().includes(term)) return true;
    
    // check employees
    const matchEmp = proc.funcionarios.some(
      (f) => f.nome.toLowerCase().includes(term) || f.matricula.toLowerCase().includes(term)
    );
    if (matchEmp) return true;

    // check bags (tag, PNR, flight)
    const matchBag = proc.bagagens.some(
      (b) => 
        b.etiqueta.includes(term) || 
        b.pnr.toLowerCase().includes(term) || 
        b.vooOrigem.toLowerCase().includes(term) ||
        b.corTipo.toLowerCase().includes(term)
    );
    if (matchBag) return true;

    return false;
  });

  // Search logic for baggages
  const filteredBagsList = expiredBags.filter((bag) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();

    return (
      (bag.etiqueta && bag.etiqueta.includes(term)) ||
      (bag.pnr && bag.pnr.toLowerCase().includes(term)) ||
      (bag.vooOrigem && bag.vooOrigem.toLowerCase().includes(term)) ||
      (bag.corTipo && bag.corTipo.toLowerCase().includes(term)) ||
      (bag.observacoes && bag.observacoes.toLowerCase().includes(term))
    );
  });

  const handleCopyHtml = (htmlContent: string | undefined, id: string) => {
    if (!htmlContent) return;
    navigator.clipboard.writeText(htmlContent);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* SCOPE SEPARATOR VIEWS CONTROLLERS */}
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex w-full md:w-max">
        <button
          onClick={() => setViewMode("lotes")}
          className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
            viewMode === "lotes"
              ? "bg-[#003087] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" /> Relatórios de Lotes Gerados
        </button>
        <button
          onClick={() => setViewMode("bagagens")}
          className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
            viewMode === "bagagens"
              ? "bg-[#003087] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Luggage className="w-4 h-4" /> Etiquetas de Bagagens (Histórico/Trash)
        </button>
      </div>

      {/* 1. DUAL SWITCHER TABS NAVBAR (ONLY SHOWN IF viewMode === "lotes") */}
      {viewMode === "lotes" && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("ativos")}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "ativos"
                ? "border-[#003087] text-[#003087]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <History className="w-4 h-4" /> Processos Ativos
          </button>
          <button
            onClick={() => setActiveTab("lixeira")}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all relative cursor-pointer ${
              activeTab === "lixeira"
                ? "border-[#E31837] text-[#E31837]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Lixeira de Descarte PIR
          </button>
        </div>
      )}

      {/* 2. SEARCH BOX ROW */}
      <div className="bg-white border border-slate-200 p-5 rounded rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded rounded-lg text-xs placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#003087]"
            placeholder={
              viewMode === "lotes"
                ? "Pesquise por Etiqueta (10 dígitos), PNR (6 dígitos), Voo, ou Nome do Funcionário..."
                : "Pesquise bagagens arquivadas por tag, código de reserva, voo ou cor..."
            }
          />
        </div>
        <button 
          onClick={fetchAll}
          className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-300 hover:bg-slate-100 p-2.5 rounded rounded-lg font-bold shadow-xs shrink-0 cursor-pointer"
        >
          <RefreshCcw className="w-3.5 h-3.5 text-slate-500" /> Sincronizar
        </button>
      </div>

      {/* LIST REPOSITORY */}
      <div className="bg-white border border-slate-200 rounded rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 font-sans">
            {viewMode === "lotes" ? (
              activeTab === "ativos" ? "Registros de Lotes Ativos" : "Registros Descartados na Lixeira"
            ) : "Histórico Geral & Lixeira de Volumes Individuais"} ({viewMode === "lotes" ? filteredList.length : filteredBagsList.length})
          </span>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <RefreshCcw className="w-8 h-8 text-[#003087] animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">Buscando banco central...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-slate-500">
            <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">{error}</p>
          </div>
        ) : (viewMode === "lotes" ? filteredList.length === 0 : filteredBagsList.length === 0) ? (
          <div className="text-center py-16 text-slate-400">
            <History className="w-12 h-12 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-semibold">Nenhum registro localizado no banco.</p>
            <p className="text-[10px] text-slate-500 mt-1">Experimente remover termos de pesquisa ou registrar novas etiquetas.</p>
          </div>
        ) : viewMode === "lotes" ? (
          <div className="divide-y divide-slate-200">
            {filteredList.map((proc) => {
              const isExpanded = expandedId === proc.id;
              const formattedDate = new Date(proc.createdAt).toLocaleString("pt-BR", {
                timeZone: "UTC",
                dateStyle: "short",
                timeStyle: "short"
              });

              return (
                <div key={proc.id} className="bg-white hover:bg-slate-50/20 transition">
                  {/* TRIGGER SUMMARY LINE */}
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[#003087]">{proc.id}</span>
                        <span className="bg-slate-100 border px-2 py-0.5 text-[10px] uppercase font-bold tracking-tight rounded text-slate-700">
                          {proc.companhiaAerea}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">| {proc.bagagens.length} Bagagens relacionadas</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 flex flex-wrap gap-x-4">
                        <p><span className="font-sans text-slate-400">Criado:</span> <strong>{formattedDate}</strong></p>
                        <p><span className="font-sans text-slate-400">Funcionários:</span> <strong className="text-slate-700">{proc.funcionarios.map(f => f.nome).join(", ")}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : proc.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition"
                      >
                        {isExpanded ? "Esconder Detalhes" : "Ver Detalhes"}
                      </button>

                      {activeTab === "ativos" ? (
                        <button
                          type="button"
                          id={`btn-soft-delete-${proc.id}`}
                          onClick={() => handleSoftDelete(proc.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg border border-red-100 focus:outline-none"
                          title="Mover para a lixeira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            id={`btn-restore-${proc.id}`}
                            onClick={() => handleRestore(proc.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-lg border border-emerald-100 focus:outline-none"
                            title="Restaurar este processo"
                          >
                            <RefreshCcw className="w-4 h-4 text-emerald-500" />
                          </button>
                          
                          <button
                            type="button"
                            id={`btn-perm-delete-${proc.id}`}
                            onClick={() => handlePermanentDelete(proc.id)}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-2 rounded-lg focus:outline-none"
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* DETAILS CARD SPECIFICS IF EXPANDED */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50 border-t border-slate-100 space-y-6">
                      
                      {/* ACTION BAR AND METADATAS */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-extrabold text-[#003087] uppercase flex items-center gap-1">
                            <UserCheck className="w-4 h-4" /> Equipe Responsável:
                          </span>
                          {proc.funcionarios.map(f => (
                            <span key={f.id} className="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1 rounded font-mono font-bold">
                              {f.nome} ({f.matricula})
                            </span>
                          ))}
                        </div>

                        {proc.htmlGerado && (
                          <button
                            type="button"
                            onClick={() => handleCopyHtml(proc.htmlGerado, proc.id)}
                            className="inline-flex items-center gap-1 bg-[#003087] hover:bg-blue-800 text-white font-extrabold text-xs px-4 py-2 rounded-lg shadow-sm cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedId === proc.id ? "HTML Copiado!" : "Copiar HTML de E-mail"}
                          </button>
                        )}
                      </div>

                      {/* BAGS TABLE DETAIL */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#003087] text-white uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Situação</th>
                              <th className="px-4 py-3">Etiqueta (Tag)</th>
                              <th className="px-4 py-3">Reserva (PNR)</th>
                              <th className="px-4 py-3">Voo Origem</th>
                              <th className="px-4 py-3">Data Voo</th>
                              <th className="px-4 py-3">Características Cor e Tipo</th>
                              <th className="px-4 py-3">Observação de Lote</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-mono">
                            {proc.bagagens.map((bag) => {
                              const situacaoStyle = SITUACOES[bag.situacao as SituacaoType] || { label: bag.situacao, bg: "bg-slate-100", text: "text-slate-800" };
                              return (
                                <tr key={bag.id} className="hover:bg-slate-50 transition">
                                  <td className="px-4 py-3 font-sans">
                                    <span className={`inline-block px-2 py-0.5 rounded border uppercase text-[10px] font-bold ${situacaoStyle.bg}`}>
                                      {situacaoStyle.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-bold text-[#003087]">{bag.etiqueta || "-"}</td>
                                  <td className="px-4 py-3 font-bold text-[#E31837]">{bag.pnr || "-"}</td>
                                  <td className="px-4 py-3 font-sans font-semibold text-slate-700">{bag.vooOrigem || "-"}</td>
                                  <td className="px-4 py-3 font-sans text-slate-500">{bag.dataVoo || "-"}</td>
                                  <td className="px-4 py-3 font-sans text-slate-700">{bag.corTipo || "-"}</td>
                                  <td className="px-4 py-3 font-sans text-xs text-slate-400 font-normal italic">{bag.observacoes || "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* EMBEDDED PREVIEW BOX */}
                      {proc.htmlGerado && (
                        <div className="bg-slate-200/50 p-4 rounded-xl border border-slate-300">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Relatório de E-mail Inline</span>
                          <div 
                            className="max-h-[220px] overflow-y-auto border rounded-lg bg-white p-4 shadow-inner"
                            dangerouslySetInnerHTML={{ __html: proc.htmlGerado }}
                          />
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* BAGGAGES INDIVIDUAL EXPIRED LIST MODE */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-[#003087] text-white uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="px-6 py-4">Status / Motivo</th>
                  <th className="px-6 py-4">Situação Oper.</th>
                  <th className="px-6 py-4">Etiqueta (Tag)</th>
                  <th className="px-6 py-4">Reserva (PNR)</th>
                  <th className="px-6 py-4">Voo Origem</th>
                  <th className="px-6 py-4">Mala Características</th>
                  <th className="px-6 py-4">Horário de Leitura</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBagsList.map((bag) => {
                  const now = Date.now();
                  const ageMs = now - new Date(bag.createdAt || bag.timestamp).getTime();
                  const isBDeleted = bag.deleted;
                  const isExpired = !bag.deleted && ageMs > 24 * 60 * 60 * 1000;
                  
                  const situacaoStyle = SITUACOES[bag.situacao as SituacaoType] || { label: bag.situacao, bg: "bg-slate-100", text: "text-slate-800" };
                  
                  return (
                    <tr key={bag.id} className="hover:bg-slate-50 transition-colors">
                      {/* Reason Tag */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isBDeleted ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase border border-red-200">
                            <Trash2 className="w-3 h-3" /> Arquivado Manual
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase border border-amber-200">
                            <Clock className="w-3 h-3" /> Expirado &gt; 24h
                          </span>
                        )}
                      </td>

                      {/* Operation Situacao */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded border uppercase text-[10px] font-extrabold ${situacaoStyle.bg}`}>
                          {situacaoStyle.label}
                        </span>
                      </td>

                      {/* Bag tag */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#003087]">
                        {bag.etiqueta || <span className="text-slate-300 italic">Vazia</span>}
                      </td>

                      {/* PNR reservation */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-[#E31837]">
                        {bag.pnr || <span className="text-slate-300 italic">Vazio</span>}
                      </td>

                      {/* Voo Origem */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-700">
                        {bag.vooOrigem || "-"}
                      </td>

                      {/* Color/Tipo details style */}
                      <td className="px-6 py-4 text-xs text-slate-600 font-sans max-w-[200px] truncate" title={bag.corTipo}>
                        {bag.corTipo || "-"}
                      </td>

                      {/* Time stamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {new Date(bag.createdAt || bag.timestamp).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short"
                        })}
                      </td>

                      {/* Rescue buttons */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestoreBaggage(bag.id)}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-150 border border-emerald-200 hover:border-emerald-400 text-emerald-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all uppercase cursor-pointer shadow-xs"
                            title="Restaurar de volta para a Mesa Ativa"
                          >
                            <RefreshCcw className="w-3 h-3 text-emerald-600" /> Restaurar
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteBaggage(bag.id)}
                            className="inline-flex items-center bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 border border-rose-200 rounded-lg transition"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
