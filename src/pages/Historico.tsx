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
  Layers,
  Scan,
  Activity,
  Download,
  Filter,
  Mail,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { ProcessoPIR, SITUACOES, SituacaoType, UsabilityLog } from "../types";
import { addNotification } from "../utils/notifications";

export interface HistoricoProps {
  activeUser?: {
    nome: string;
    matricula: string;
    email?: string;
  };
}

export default function Historico({ activeUser }: HistoricoProps = {}) {
  const [viewMode, setViewMode] = useState<"usabilidade" | "lotes" | "bagagens">("usabilidade");
  const [activeTab, setActiveTab] = useState<"ativos" | "lixeira">("ativos");
  const [processes, setProcesses] = useState<ProcessoPIR[]>([]);
  const [expiredBags, setExpiredBags] = useState<any[]>([]);
  const [usabilityLogs, setUsabilityLogs] = useState<UsabilityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("TODAS");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Refresh and load lists
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (viewMode === "lotes") {
        const isLixeira = activeTab === "lixeira";
        const res = await apiFetch(`/api/processes?includeDeleted=${isLixeira}`);
        if (!res.ok) {
          throw new Error("Erro ao carregar dados do histórico.");
        }
        const data = await res.json();
        setProcesses(data);
      } else if (viewMode === "bagagens") {
        const res = await apiFetch("/api/baggages/expired");
        if (!res.ok) {
          throw new Error("Erro ao carregar bagagens expiradas ou descartadas.");
        }
        const data = await res.json();
        setExpiredBags(data);
      } else if (viewMode === "usabilidade") {
        const res = await apiFetch("/api/usability-logs");
        if (!res.ok) {
          throw new Error("Erro ao carregar registro de usabilidade.");
        }
        const data = await res.json();
        setUsabilityLogs(data);
      }
    } catch (e: any) {
      console.error(e);
      setError("Falha ao sincronizar com o banco: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearUsabilityLogs = async () => {
    if (!window.confirm("⚠️ Tem certeza que deseja LIMPAR TODO O HISTÓRICO DE USABILIDADE? Esta ação zerará os registros de auditoria.")) return;
    try {
      setLoading(true);
      const res = await apiFetch("/api/usability-logs", { method: "DELETE" });
      if (res.ok) {
        setUsabilityLogs([]);
        alert("Histórico de usabilidade zerado com sucesso.");
      }
    } catch (e: any) {
      alert("Erro ao limpar histórico: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsabilityCsv = () => {
    if (usabilityLogs.length === 0) {
      alert("Não há registros de usabilidade para exportar.");
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
    csvContent += "ID_LOG;DATA_HORA;NOME_AGENTE;MATRICULA;EMAIL;ACAO;DESCRICAO;QUANTIDADE_BAGAGENS;DETALHE_BAGAGENS\n";

    usabilityLogs.forEach((log) => {
      const dataHora = new Date(log.timestamp).toLocaleString("pt-BR");
      const bagCount = log.bagagens ? log.bagagens.length : 0;
      const bagDetails = log.bagagens 
        ? log.bagagens.map(b => `[Tag: ${b.etiqueta || 'N/A'}, PNR: ${b.pnr || 'N/A'}, Voo: ${b.vooOrigem || 'N/A'}, Situação: ${b.situacao || 'PR'}]`).join(" | ") 
        : "";

      const line = [
        `"${log.id}"`,
        `"${dataHora}"`,
        `"${log.usuarioNome || ''}"`,
        `"${log.usuarioMatricula || ''}"`,
        `"${log.usuarioEmail || ''}"`,
        `"${log.acao || ''}"`,
        `"${(log.descricao || '').replace(/"/g, '""')}"`,
        `"${bagCount}"`,
        `"${bagDetails.replace(/"/g, '""')}"`
      ].join(";");

      csvContent += line + "\n";
    });

    const filename = `historico_usabilidade_bipagens_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({
      type: "csv_generated",
      title: "Planilha CSV do Histórico Gerada",
      message: `A planilha '${filename}' com ${usabilityLogs.length} registros de usabilidade foi exportada com sucesso.`,
      linkTab: "historico"
    });
  };

  useEffect(() => {
    fetchAll();
    setExpandedId(null);
  }, [viewMode, activeTab]);

  // Soft Delete handler (Move to Lixeira)
  const handleSoftDelete = async (id: string) => {
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

  // Search & Filter logic for usability logs
  const filteredUsabilityLogs = usabilityLogs.filter((log) => {
    if (actionFilter !== "TODAS" && log.acao !== actionFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();

    const nameMatch = log.usuarioNome?.toLowerCase().includes(term);
    const matMatch = log.usuarioMatricula?.toLowerCase().includes(term);
    const emailMatch = log.usuarioEmail?.toLowerCase().includes(term);
    const descMatch = log.descricao?.toLowerCase().includes(term);

    let bagMatch = false;
    if (Array.isArray(log.bagagens)) {
      bagMatch = log.bagagens.some((b) =>
        b.etiqueta?.toLowerCase().includes(term) ||
        b.pnr?.toLowerCase().includes(term) ||
        b.vooOrigem?.toLowerCase().includes(term) ||
        b.corTipo?.toLowerCase().includes(term) ||
        b.situacao?.toLowerCase().includes(term)
      );
    }

    return nameMatch || matMatch || emailMatch || descMatch || bagMatch;
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
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap w-full md:w-max gap-1">
        <button
          onClick={() => setViewMode("usabilidade")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
            viewMode === "usabilidade"
              ? "bg-[#003087] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" /> Usabilidade & Auditoria de Bipagens
        </button>
        <button
          onClick={() => setViewMode("lotes")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
            viewMode === "lotes"
              ? "bg-[#003087] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" /> Relatórios de Lotes Gerados
        </button>
        <button
          onClick={() => setViewMode("bagagens")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer ${
            viewMode === "bagagens"
              ? "bg-[#003087] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Luggage className="w-4 h-4" /> Etiquetas de Bagagens (Histórico/Trash)
        </button>
      </div>

      {/* USABILITY AUDIT LOGS VIEW */}
      {viewMode === "usabilidade" && (
        <div className="space-y-6">
          {/* STATS METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total de Registros</p>
                <p className="text-2xl font-black text-[#003087] mt-1">{usabilityLogs.length}</p>
              </div>
              <div className="p-3 bg-blue-50 text-[#003087] rounded-xl border border-blue-100">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Logins no Sistema</p>
                <p className="text-2xl font-black text-blue-600 mt-1">
                  {usabilityLogs.filter(l => l.acao === "LOGIN").length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Bipagens OCR</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {usabilityLogs.filter(l => l.acao === "BIPAGEM_ETIQUETA").length}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Scan className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Bagagens Processadas</p>
                <p className="text-2xl font-black text-purple-600 mt-1">
                  {usabilityLogs.reduce((acc, curr) => acc + (curr.bagagens ? curr.bagagens.length : 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                <Luggage className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ACTION FILTER CHIPS & EXPORT BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar Operação:
              </span>
              {[
                { id: "TODAS", label: "Todas" },
                { id: "LOGIN", label: "Logins" },
                { id: "BIPAGEM_ETIQUETA", label: "Bipagens OCR" },
                { id: "CADASTRO_MANUAL", label: "Lançamento Manual" },
                { id: "SALVAMENTO_LOTE", label: "Fila de Trabalho" },
                { id: "CRIACAO_PROCESSO_PIR", label: "Processos PIR" }
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => setActionFilter(chip.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    actionFilter === chip.id
                      ? "bg-[#003087] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportUsabilityCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar Planilha (CSV)
              </button>
              <button
                onClick={handleClearUsabilityLogs}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition cursor-pointer"
                title="Limpar logs"
              >
                <Trash2 className="w-4 h-4" /> Zerar Histórico
              </button>
            </div>
          </div>

          {/* SEARCH BOX */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-[#003087]"
              placeholder="Pesquise por nome do agente, matrícula, e-mail, número da etiqueta (10 dígitos), PNR ou voo..."
            />
            <button
              onClick={fetchAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>

          {/* USABILITY LOGS LIST */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                Registros de Usabilidade e Auditoria ({filteredUsabilityLogs.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Sincronizado em Tempo Real no Banco Central
              </span>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <RefreshCcw className="w-8 h-8 text-[#003087] animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Carregando logs de usabilidade...</p>
              </div>
            ) : filteredUsabilityLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Activity className="w-12 h-12 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-semibold">Nenhum registro de usabilidade localizado.</p>
                <p className="text-[10px] text-slate-500 mt-1">Realize logins, bipagens de bagagem ou emissão de relatórios no sistema para registrar o histórico.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredUsabilityLogs.map((log) => {
                  const logDate = new Date(log.timestamp).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "medium"
                  });

                  let badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
                  let actionLabel = log.acao;

                  if (log.acao === "LOGIN") {
                    badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
                    actionLabel = "🔑 LOGIN NO SISTEMA";
                  } else if (log.acao === "BIPAGEM_ETIQUETA") {
                    badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    actionLabel = "📷 BIPAGEM OCR (ETIQUETA)";
                  } else if (log.acao === "CADASTRO_MANUAL") {
                    badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
                    actionLabel = "✏️ CADASTRO MANUAL";
                  } else if (log.acao === "SALVAMENTO_LOTE") {
                    badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
                    actionLabel = "📦 FILA DE TRABALHO";
                  } else if (log.acao === "CRIACAO_PROCESSO_PIR") {
                    badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                    actionLabel = "📄 PROCESSO PIR EMITIDO";
                  }

                  return (
                    <div key={log.id} className="p-5 hover:bg-slate-50/50 transition">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                        {/* USER IDENTITY & ACTION BADGE */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded border tracking-wide ${badgeColor}`}>
                              {actionLabel}
                            </span>
                            <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-[#003087]" />
                              {log.usuarioNome || "Agente LATAM"}
                            </span>
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-mono font-bold rounded">
                              Matrícula: {log.usuarioMatricula || "N/A"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono flex-wrap">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <strong className="text-slate-600 font-normal">{log.usuarioEmail || "agente.latam@latam.com"}</strong>
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <strong>{logDate}</strong>
                            </span>
                          </div>
                        </div>

                        {/* DESCRICAO */}
                        <div className="text-right md:max-w-md">
                          <p className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                            {log.descricao}
                          </p>
                        </div>
                      </div>

                      {/* BAGGAGES TABLE IF PRESENT */}
                      {Array.isArray(log.bagagens) && log.bagagens.length > 0 && (
                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1">
                              <Luggage className="w-3.5 h-3.5 text-[#003087]" /> Bagagens Vinculadas ({log.bagagens.length})
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-[10px] uppercase font-extrabold text-slate-400 bg-white">
                                  <th className="px-3 py-2">Etiqueta (Bag Tag)</th>
                                  <th className="px-3 py-2">Reserva (PNR)</th>
                                  <th className="px-3 py-2">Voo</th>
                                  <th className="px-3 py-2">Situação</th>
                                  <th className="px-3 py-2">Cor / Tipo</th>
                                  <th className="px-3 py-2 text-right">Origem</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-xs font-mono">
                                {log.bagagens.map((bag, idx) => (
                                  <tr key={idx} className="hover:bg-white/80">
                                    <td className="px-3 py-2 font-bold text-[#003087]">
                                      {bag.etiqueta || <span className="text-slate-300 italic">S/N</span>}
                                    </td>
                                    <td className="px-3 py-2 font-bold text-[#E31837]">
                                      {bag.pnr || <span className="text-slate-300 italic">S/N</span>}
                                    </td>
                                    <td className="px-3 py-2 font-bold text-slate-700">
                                      {bag.vooOrigem || "-"}
                                    </td>
                                    <td className="px-3 py-2 font-sans text-[10px] font-extrabold text-slate-600">
                                      {bag.situacao || "PR"}
                                    </td>
                                    <td className="px-3 py-2 font-sans text-slate-500 text-[11px] truncate max-w-[150px]">
                                      {bag.corTipo || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${bag.scanned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                        {bag.scanned ? 'Bipado OCR' : 'Lançado Manual'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
