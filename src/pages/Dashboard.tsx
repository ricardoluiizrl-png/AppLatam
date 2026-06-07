import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Layers, 
  Luggage, 
  Search, 
  Calendar, 
  Plane, 
  ChevronRight, 
  ChevronDown, 
  Mail, 
  Copy,
  PlusCircle,
  FileText,
  RefreshCw
} from "lucide-react";
import { ProcessoPIR, SITUACOES, SituacaoType } from "../types";

export default function Dashboard() {
  const [processes, setProcesses] = useState<ProcessoPIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter Hooks
  const [filterVoo, setFilterVoo] = useState("");
  const [filterSituacao, setFilterSituacao] = useState<string>("");
  const [filterData, setFilterData] = useState("");

  // Accordion details index tracker
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/processes");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os dados das bagagens.");
      }
      const data = await response.json();
      setProcesses(data);
    } catch (e: any) {
      console.error(e);
      setError("Erro ao carregar dados do servidor. Certifique-se de que o backend está respondendo.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Calculate status totals based on active (non-deleted) processes
  const counters: Record<string, number> = {
    PR: 0,
    "73": 0,
    SE: 0,
    LI: 0,
    CI: 0,
    RT: 0,
    RP: 0,
    NE: 0,
    OT: 0,
  };

  let totalBagsCount = 0;

  // Compile active count
  processes.forEach((proc) => {
    proc.bagagens.forEach((bag) => {
      if (counters[bag.situacao] !== undefined) {
        counters[bag.situacao]++;
      } else {
        counters.OT++; // Fallback
      }
      totalBagsCount++;
    });
  });

  // Filter processes
  const filteredProcesses = processes.filter((proc) => {
    // Check if any bag matches flight filter
    if (filterVoo.trim()) {
      const match = proc.bagagens.some(b => 
        b.vooOrigem.toLowerCase().includes(filterVoo.trim().toLowerCase())
      );
      if (!match) return false;
    }

    // Check if any bag matches date filter
    if (filterData.trim()) {
      const match = proc.bagagens.some(b => 
        b.dataVoo.includes(filterData.trim())
      );
      if (!match) return false;
    }

    // Check if any bag matches selected situation
    if (filterSituacao) {
      const match = proc.bagagens.some(b => b.situacao === filterSituacao);
      if (!match) return false;
    }

    return true;
  });

  // Helper copy to clipboard
  const handleCopyHtml = (htmlContent: string | undefined, id: string) => {
    if (!htmlContent) return;
    navigator.clipboard.writeText(htmlContent);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. TOP CARDS METRICS METRIC GRID */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Métricas Consolidadas (Lote Ativo)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Volumes */}
          <div className="bg-white border border-slate-200 rounded p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Bagagens Ativas</p>
              <h2 className="text-3xl font-bold text-[#003087] mt-1">{totalBagsCount}</h2>
              <p className="text-[11px] text-slate-500 mt-1">Registradas em todos os voos lidos</p>
            </div>
            <div className="bg-[#003087]/5 text-[#003087] p-3 rounded">
              <Luggage className="w-8 h-8" />
            </div>
          </div>

          {/* Card 2: Lotes Unificados */}
          <div className="bg-white border border-slate-200 rounded p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processos Unificados</p>
              <h2 className="text-3xl font-bold text-[#E31837] mt-1">{processes.length}</h2>
              <p className="text-[11px] text-slate-500 mt-1">Formulários de e-mails emitidos</p>
            </div>
            <div className="bg-[#E31837]/5 text-[#E31837] p-3 rounded">
              <Layers className="w-8 h-8" />
            </div>
          </div>

          {/* Card 3: Status Crítico */}
          <div className="bg-white border border-slate-200 rounded p-6 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Não Embarcado (NE)</p>
              <h2 className="text-3xl font-bold text-red-600 mt-1">{counters.NE}</h2>
              <p className="text-[11px] text-red-500 mt-1 font-semibold">Requer conciliação urgente</p>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded border border-red-100">
              <Plane className="w-8 h-8 transform rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. CHUTES POR SITUAÇÃO GRID */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Distribuição Operacional por Situação</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-100 p-4 rounded border border-slate-200">
          {Object.entries(SITUACOES).map(([kode, val]) => {
            const count = counters[kode] || 0;
            return (
              <div 
                key={kode} 
                className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  <span className={`inline-block px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border ${val.bg}`}>
                    {kode}
                  </span>
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-2">{val.label}</p>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mt-2 flex items-baseline justify-between">
                  <span>{count}</span>
                  {totalBagsCount > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {Math.round((count / totalBagsCount) * 100)}%
                    </span>
                  )}
                </h3>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LISTAGEM FILTRÁVEL (RECENT ACTIONS SEÇÃO) */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-700">Processos Recentes em Lote</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Filtre e gerencie os e-mails e relatórios emitidos para a Receita Federal / GRU.</p>
          </div>
          <button 
            type="button"
            onClick={fetchProcesses}
            className="text-xs text-[#003087] hover:text-blue-800 font-bold inline-flex items-center gap-1 bg-white border border-slate-300 px-3 py-1.5 rounded shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recarregar Banco
          </button>
        </div>

        {/* CONTROLE DE FILTROS ROW */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Voo orig search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={filterVoo}
              onChange={(e) => setFilterVoo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#003087]"
              placeholder="Voo de Origem (Ex: LA8070)"
            />
          </div>

          {/* Date Picker tag */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#003087]"
              placeholder="Data do Voo (Ex: 07/06)"
            />
          </div>

          {/* Situation Filter */}
          <div>
            <select
              value={filterSituacao}
              onChange={(e) => setFilterSituacao(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-600 outline-none focus:ring-1 focus:ring-[#003087]"
            >
              <option value="">Filtro por Situação (Todas)</option>
              {Object.entries(SITUACOES).map(([kode, val]) => (
                <option key={kode} value={kode}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* LOADING & ERROR WRAPPERS */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-[#003087] animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Contatando banco central...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <p className="text-sm font-bold text-red-600 mb-2">Falha Operacional</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Luggage className="w-12 h-12 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-semibold">Nenhum processo corresponde aos filtros aplicados.</p>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">Tente mudar o número de voo, a data ou limpe os inputs.</p>
          </div>
        ) : (
          /* ACCORDION TABLE LIST */
          <div className="divide-y divide-slate-100">
            {filteredProcesses.map((proc) => {
              const isOpen = expandedId === proc.id;
              const formattedDate = new Date(proc.createdAt).toLocaleString("pt-BR", {
                timeZone: "UTC",
                dateStyle: "short",
                timeStyle: "short"
              });

              return (
                <div key={proc.id} className="bg-white hover:bg-slate-50/30 transition">
                  {/* ACCORDION HEADER TRIGGER */}
                  <div 
                    onClick={() => setExpandedId(isOpen ? null : proc.id)}
                    className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#003087] font-mono">{proc.id}</span>
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                          {proc.companhiaAerea}
                        </span>
                        <span className="text-slate-400 text-xs font-medium">| {proc.bagagens.length} Bagagens</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-500 font-mono">
                        <p><span className="font-sans text-slate-400">Gerado:</span> <strong>{formattedDate}</strong></p>
                        <p><span className="font-sans text-slate-400">Voo(s):</span> <strong>{Array.from(new Set(proc.bagagens.map(b => b.vooOrigem))).filter(Boolean).join(", ") || "-"}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1 overflow-hidden">
                        {proc.bagagens.slice(0, 3).map((bag) => (
                          <div 
                            key={bag.id}
                            className={`w-6 h-6 rounded-full border border-white text-[9px] font-bold flex items-center justify-center text-white ${
                              bag.situacao === "LI" ? "bg-emerald-500" : bag.situacao === "NE" ? "bg-red-500" : "bg-[#003087]"
                            }`}
                            title={bag.etiqueta}
                          >
                            {bag.situacao}
                          </div>
                        ))}
                        {proc.bagagens.length > 3 && (
                          <div className="w-6 h-6 rounded-full border border-white bg-slate-300 text-[9px] font-bold text-slate-700 flex items-center justify-center">
                            +{proc.bagagens.length - 3}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-slate-400">
                        {isOpen ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* ACCORDION DETAILS CODES */}
                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-6">
                      
                      {/* EMPLOYEES DETAILS METADATA */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        <div className="md:col-span-4 bg-white p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Emitido por:</h4>
                          {proc.funcionarios.map(func => (
                            <div key={func.id} className="py-2.5 border-b border-slate-100 last:border-0 flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">{func.nome}</span>
                              <span className="font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100">{func.matricula}</span>
                            </div>
                          ))}
                        </div>

                        {/* ATTACHMENT QUICK BUTTONS ACCORDION */}
                        <div className="md:col-span-8 flex flex-col md:flex-row gap-3 md:justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopyHtml(proc.htmlGerado, proc.id)}
                            className="inline-flex items-center justify-center gap-1.5 bg-[#003087] hover:bg-blue-800 text-white text-xs font-extrabold px-5 py-3 rounded-lg shadow-sm"
                          >
                            <Copy className="w-4 h-4" />
                            {copiedId === proc.id ? "HTML Copiado!" : "Copiar Relatório HTML"}
                          </button>
                        </div>
                      </div>

                      {/* BAG ROW SPECIFICS */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#003087] text-white uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Situação</th>
                              <th className="px-4 py-3">Etiqueta (Tag)</th>
                              <th className="px-4 py-3">Reserva (PNR)</th>
                              <th className="px-4 py-3">Voo Origem</th>
                              <th className="px-4 py-3">Data Voo</th>
                              <th className="px-4 py-3">Cor e Tipo</th>
                              <th className="px-4 py-3">Observações</th>
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
                                  <td className="px-4 py-3 font-sans text-xs text-slate-500 font-normal italic">{bag.observacoes || "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* COMPLETE EMBEDDED PREVIEW IN ACCORDION BODY */}
                      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Código Inline Renderizado</span>
                        <div 
                          className="max-h-[220px] overflow-y-auto border rounded-lg bg-white p-4 shadow-inner"
                          dangerouslySetInnerHTML={{ __html: proc.htmlGerado || "" }}
                        />
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
  );
}
