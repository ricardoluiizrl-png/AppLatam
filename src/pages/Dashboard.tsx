import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/mockApi";
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
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
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
      const response = await apiFetch("/api/processes");
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
    if (filterVoo.trim()) {
      const match = proc.bagagens.some(b => 
        b.vooOrigem.toLowerCase().includes(filterVoo.trim().toLowerCase())
      );
      if (!match) return false;
    }

    if (filterData.trim()) {
      const match = proc.bagagens.some(b => 
        b.dataVoo.includes(filterData.trim())
      );
      if (!match) return false;
    }

    if (filterSituacao) {
      const match = proc.bagagens.some(b => b.situacao === filterSituacao);
      if (!match) return false;
    }

    return true;
  });

  const handleCopyHtml = (htmlContent: string | undefined, id: string) => {
    if (!htmlContent) return;
    navigator.clipboard.writeText(htmlContent);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16 font-sans">
      
      {/* 1. HERO BANNER OPERACIONAL LATAM COM IMAGEM DE AEROPORTO */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#0a255c] text-white shadow-2xl border border-blue-900/40">
        {/* Background photo */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity transform scale-105 transition-transform duration-1000"
          style={{ backgroundImage: `url('/src/assets/images/latam_airport_hero_1786420020822.jpg')` }}
        />
        {/* Gradient overlays for high text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a255c] via-[#0a255c]/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a255c] via-transparent to-transparent" />

        <div className="relative z-10 p-4 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[10px] sm:text-xs font-extrabold text-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E31837]" />
              <span>Painel de Conciliação em Solo · GRU Airport</span>
            </div>
            
            <h1 className="text-lg sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-snug sm:leading-tight">
              Controle Inteligente de Bagagens Sobras & Irregulares
            </h1>
            
            <p className="text-[11px] sm:text-sm text-blue-100/90 font-medium leading-tight sm:leading-relaxed">
              Sistema operacional para registro com câmera OCR, agrupamento automático de lotes a cada 24h, exportação de relatórios padrão Receita Federal e fechamento de assinaturas.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 sm:gap-3 shrink-0">
            <button
              onClick={fetchProcesses}
              className="px-3.5 py-2 sm:px-5 sm:py-3 bg-[#E31837] hover:bg-[#c0132e] text-white font-extrabold text-[11px] sm:text-xs rounded-xl sm:rounded-2xl shadow-lg shadow-red-950/40 transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border border-red-400/30"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Atualizar Banco de Dados</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. GUIA DIDÁTICO RÁPIDO PARA O OPERADOR (BEM DIDÁTICO E CHIQUE) */}
      <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-red-50/60 rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#003087] text-white rounded-xl shadow-xs">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#003087] uppercase tracking-wider">Como Funciona o Fluxo Operacional (Guia Rápido)</h2>
              <p className="text-xs text-slate-500">Aprenda os 3 passos simples para conciliar e gerar o arquivo de sobras</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#003087] font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">Escanear ou Inserir Tag</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Use a aba <strong>Ler Etiqueta</strong> para fotografar a tag ou informe o número manualmente definindo a situação (ex: CI, NE, LI).
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">Alertas & PNR Duplicado</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Se houver mesma reserva (PNR), o sistema avisa e mantém as malas juntas no sistema e em linhas separadas na planilha CSV.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800">Lotes 24h & Assinatura CSV</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Após 24 horas, as etiquetas vão para o Histórico em lotes por data/horário com a linha final de assinatura (FC).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MÉTRICAS CONSOLIDADAS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E31837]" />
            <span>Métricas Consolidadas de Solo</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Total Lido: {totalBagsCount} bagagens
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Total Volumes */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-[#003087]" />
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total de Bagagens Ativas</p>
              <h2 className="text-3xl font-black text-[#003087] mt-1">{totalBagsCount}</h2>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Registradas no sistema de solo</p>
            </div>
            <div className="bg-blue-50 text-[#003087] p-3.5 rounded-2xl border border-blue-100 group-hover:scale-110 transition-transform">
              <Luggage className="w-7 h-7" />
            </div>
          </div>

          {/* Card 2: Lotes Unificados */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-[#E31837]" />
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Processos Emitidos</p>
              <h2 className="text-3xl font-black text-[#E31837] mt-1">{processes.length}</h2>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Relatórios e e-mails gerados</p>
            </div>
            <div className="bg-red-50 text-[#E31837] p-3.5 rounded-2xl border border-red-100 group-hover:scale-110 transition-transform">
              <Layers className="w-7 h-7" />
            </div>
          </div>

          {/* Card 3: Status Crítico */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-rose-600" />
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Não Embarcado (NE)</p>
              <h2 className="text-3xl font-black text-rose-600 mt-1">{counters.NE}</h2>
              <p className="text-[11px] text-rose-600 font-bold mt-1">Atenção Prioritária</p>
            </div>
            <div className="bg-rose-50 text-rose-600 p-3.5 rounded-2xl border border-rose-100 group-hover:scale-110 transition-transform">
              <Plane className="w-7 h-7 transform rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHUTES POR SITUAÇÃO GRID */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-3">
          Distribuição Didática por Código de Situação
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 bg-slate-100/80 p-4 rounded-3xl border border-slate-200">
          {Object.entries(SITUACOES).map(([kode, val]) => {
            const count = counters[kode] || 0;
            const isSelected = filterSituacao === kode;
            return (
              <button
                type="button"
                key={kode} 
                onClick={() => setFilterSituacao(isSelected ? "" : kode)}
                className={`p-3.5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                  isSelected 
                    ? "bg-[#003087] text-white border-[#003087] shadow-md scale-[1.02]" 
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-extrabold rounded-md border ${
                    isSelected ? "bg-white/20 text-white border-white/30" : val.bg
                  }`}>
                    {kode}
                  </span>
                  <p className={`text-[11px] font-medium truncate mt-2 ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                    {val.label}
                  </p>
                </div>
                <h3 className={`text-xl font-black mt-2 flex items-baseline justify-between ${isSelected ? "text-white" : "text-slate-800"}`}>
                  <span>{count}</span>
                  {totalBagsCount > 0 && (
                    <span className={`text-[10px] font-bold ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                      {Math.round((count / totalBagsCount) * 100)}%
                    </span>
                  )}
                </h3>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. LISTAGEM FILTRÁVEL DE PROCESSOS RECENTES */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/80">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#003087]">Processos Emitidos & Relatórios PIR</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Consulte e gerencie relatórios gerados para a Receita Federal / GRU Airport.</p>
          </div>
          {filterSituacao && (
            <button
              onClick={() => setFilterSituacao("")}
              className="text-xs font-extrabold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              Limpar Filtro ({filterSituacao})
            </button>
          )}
        </div>

        {/* CONTROLE DE FILTROS ROW */}
        <div className="p-5 bg-slate-50/40 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterVoo}
              onChange={(e) => setFilterVoo(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#003087]"
              placeholder="Buscar por Voo (Ex: LA8070)"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#003087]"
              placeholder="Data do Voo (Ex: 25/06)"
            />
          </div>

          <div>
            <select
              value={filterSituacao}
              onChange={(e) => setFilterSituacao(e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#003087]"
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

        {/* LISTING CONTENT */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-[#003087] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">Carregando banco de processos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-600 mb-1">Falha Operacional</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Luggage className="w-12 h-12 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-semibold">Nenhum processo corresponde aos filtros informados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProcesses.map((proc) => {
              const isOpen = expandedId === proc.id;
              const formattedDate = new Date(proc.createdAt).toLocaleString("pt-BR", {
                timeZone: "UTC",
                dateStyle: "short",
                timeStyle: "short"
              });

              return (
                <div key={proc.id} className="bg-white hover:bg-slate-50/50 transition">
                  <div 
                    onClick={() => setExpandedId(isOpen ? null : proc.id)}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#003087] font-mono">{proc.id}</span>
                        <span className="bg-blue-50 text-[#003087] px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-blue-200">
                          {proc.companhiaAerea}
                        </span>
                        <span className="text-slate-500 text-xs font-medium">| {proc.bagagens.length} Volume(s)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-500">
                        <p><strong>Gerado em:</strong> {formattedDate}</p>
                        <p><strong>Voo(s):</strong> {Array.from(new Set(proc.bagagens.map(b => b.vooOrigem))).filter(Boolean).join(", ") || "-"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1 overflow-hidden">
                        {proc.bagagens.slice(0, 3).map((bag) => (
                          <div 
                            key={bag.id}
                            className={`w-7 h-7 rounded-full border-2 border-white text-[9px] font-black flex items-center justify-center text-white ${
                              bag.situacao === "LI" ? "bg-emerald-500" : bag.situacao === "NE" ? "bg-red-500" : "bg-[#003087]"
                            }`}
                            title={bag.etiqueta}
                          >
                            {bag.situacao}
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition">
                        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50/80 border-t border-slate-200 flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Emitido pelo Operador:</span>
                          <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                            {proc.funcionarios.map(f => `${f.nome} (${f.matricula})`).join(", ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyHtml(proc.htmlGerado, proc.id)}
                          className="inline-flex items-center justify-center gap-1.5 bg-[#003087] hover:bg-blue-900 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{copiedId === proc.id ? "HTML Copiado!" : "Copiar Relatório HTML"}</span>
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#003087] text-white uppercase text-[10px] tracking-wider font-extrabold">
                            <tr>
                              <th className="px-4 py-3">Situação</th>
                              <th className="px-4 py-3">Etiqueta</th>
                              <th className="px-4 py-3">Reserva (PNR)</th>
                              <th className="px-4 py-3">Voo Origem</th>
                              <th className="px-4 py-3">Data Voo</th>
                              <th className="px-4 py-3">Cor / Tipo</th>
                              <th className="px-4 py-3">Observações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {proc.bagagens.map((bag) => {
                              const situacaoStyle = SITUACOES[bag.situacao as SituacaoType] || { label: bag.situacao, bg: "bg-slate-100", text: "text-slate-800" };
                              return (
                                <tr key={bag.id} className="hover:bg-slate-50 transition">
                                  <td className="px-4 py-2.5 font-sans">
                                    <span className={`inline-block px-2 py-0.5 rounded-md border uppercase text-[10px] font-extrabold ${situacaoStyle.bg}`}>
                                      {situacaoStyle.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-[#003087]">{bag.etiqueta || "-"}</td>
                                  <td className="px-4 py-2.5 font-bold text-[#E31837]">{bag.pnr || "-"}</td>
                                  <td className="px-4 py-2.5 font-sans font-semibold text-slate-800">{bag.vooOrigem || "-"}</td>
                                  <td className="px-4 py-2.5 font-sans text-slate-600">{bag.dataVoo || "-"}</td>
                                  <td className="px-4 py-2.5 font-sans text-slate-700">{bag.corTipo || "-"}</td>
                                  <td className="px-4 py-2.5 font-sans text-xs text-slate-500 font-normal italic">{bag.observacoes || "-"}</td>
                                </tr>
                              );
                            })}
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
  );
}

