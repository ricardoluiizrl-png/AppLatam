import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/mockApi";
import { ProcessoPIR, SITUACOES, SituacaoType } from "../types";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  ArrowLeftRight, 
  RefreshCw, 
  Luggage, 
  Layers, 
  Plane, 
  ChevronRight, 
  SlidersHorizontal,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import { motion } from "motion/react";

interface MonthlyData {
  key: string;         // "YYYY-MM"
  label: string;       // "Julho / 2026"
  totalBags: number;
  totalProcesses: number;
  situacoes: Record<SituacaoType, number>;
  monthCode: number;
  year: number;
  voos: Set<string>;
}

export default function Estatisticas() {
  const [processes, setProcesses] = useState<ProcessoPIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Month comparison keys
  const [monthAKey, setMonthAKey] = useState<string>("");
  const [monthBKey, setMonthBKey] = useState<string>("");

  // Individual trend focus situacao
  const [focusSituacao, setFocusSituacao] = useState<SituacaoType>("NE");

  // Load and Parse
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/processes");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os dados das bagagens.");
      }
      const data: ProcessoPIR[] = await response.json();
      setProcesses(data);
    } catch (e: any) {
      console.error(e);
      setError("Erro ao carregar dados operacionais para gerar estatísticas.");
    } finally {
      setLoading(false);
    }
  };

  // Seeding high-fidelity mockup data spanning 4 months so the charts are fully visible
  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      const demoProcesses = [
        // --- MARCH 2026 ---
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-03-05T08:30:00.000Z",
          deleted: false,
          bagagens: [
            { id: "mar_1", situacao: "PR", etiqueta: "0095111103", pnr: "AXHG76", vooOrigem: "LA8067", dataVoo: "05/03/2026", corTipo: "Mala preta", observacoes: "" },
            { id: "mar_2", situacao: "LI", etiqueta: "0095222204", pnr: "PLKM89", vooOrigem: "LA8070", dataVoo: "05/03/2026", corTipo: "Mala azul", observacoes: "Liberado Receita" },
            { id: "mar_3", situacao: "LI", etiqueta: "0095333305", pnr: "QWES12", vooOrigem: "LA8067", dataVoo: "05/03/2026", corTipo: "Mala preta", observacoes: "Liberado direto" },
            { id: "mar_4", situacao: "SE", etiqueta: "0095444406", pnr: "TYUI78", vooOrigem: "LA4562", dataVoo: "04/03/2026", corTipo: "Mochila cinza", observacoes: "Sem etiqueta" },
            { id: "mar_5", situacao: "NE", etiqueta: "0095555507", pnr: "ZXCV56", vooOrigem: "LA8067", dataVoo: "05/03/2026", corTipo: "Mala vermelha", observacoes: "Deixada em pátio" }
          ]
        },
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-03-24T18:15:00.000Z",
          deleted: false,
          bagagens: [
            { id: "mar_6", situacao: "RT", etiqueta: "0095666608", pnr: "NBVC76", vooOrigem: "LA8070", dataVoo: "24/03/2026", corTipo: "Mala verde", observacoes: "Retirado" },
            { id: "mar_7", situacao: "CI", etiqueta: "0095777709", pnr: "KJHX12", vooOrigem: "LA1234", dataVoo: "24/03/2026", corTipo: "Sacola marrom", observacoes: "International connection" },
            { id: "mar_8", situacao: "73", etiqueta: "0095888810", pnr: "POIQ43", vooOrigem: "LA8067", dataVoo: "24/03/2026", corTipo: "Mala rígida preta", observacoes: "Abandonada" }
          ]
        },
        // --- APRIL 2026 ---
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-04-12T14:20:00.000Z",
          deleted: false,
          bagagens: [
            { id: "apr_1", situacao: "PR", etiqueta: "0095121201", pnr: "REQT21", vooOrigem: "LA8067", dataVoo: "12/04/2026", corTipo: "Mala amarela rígida", observacoes: "Aberto PIR" },
            { id: "apr_2", situacao: "PR", etiqueta: "0095232302", pnr: "YUIP43", vooOrigem: "LA8070", dataVoo: "12/04/2026", corTipo: "Mala cinza", observacoes: "" },
            { id: "apr_3", situacao: "LI", etiqueta: "0095343403", pnr: "UIOP89", vooOrigem: "LA8067", dataVoo: "12/04/2026", corTipo: "Bolsa esportiva", observacoes: "Enviado e-mail" },
            { id: "apr_4", situacao: "LI", etiqueta: "0095454504", pnr: "LKJH22", vooOrigem: "LA4562", dataVoo: "12/04/2026", corTipo: "Mala preta", observacoes: "Liberado Receita" },
            { id: "apr_5", situacao: "NE", etiqueta: "0095565605", pnr: "MNBV09", vooOrigem: "LA8067", dataVoo: "12/04/2026", corTipo: "Sacola amarela", observacoes: "Erro carregamento" },
            { id: "apr_6", situacao: "RT", etiqueta: "0095676706", pnr: "VFRT65", vooOrigem: "LA8070", dataVoo: "11/04/2026", corTipo: "Mala preta", observacoes: "Entregue a termo" }
          ]
        },
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-04-28T10:45:00.000Z",
          deleted: false,
          bagagens: [
            { id: "apr_7", situacao: "CI", etiqueta: "0095787807", pnr: "BGT76Y", vooOrigem: "LA1234", dataVoo: "28/04/2026", corTipo: "Bolsa preta", observacoes: "Conexao" },
            { id: "apr_8", situacao: "SE", etiqueta: "0095898908", pnr: "NHG65T", vooOrigem: "LA8067", dataVoo: "28/04/2026", corTipo: "Mala preta de couro", observacoes: "Sem etiqueta" },
            { id: "apr_9", situacao: "RP", etiqueta: "0095909009", pnr: "MKLO09", vooOrigem: "LA8070", dataVoo: "28/04/2026", corTipo: "Carrinho de bebê", observacoes: "Achados e Perdidos" }
          ]
        },
        // --- MAY 2026 ---
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-05-14T09:12:00.000Z",
          deleted: false,
          bagagens: [
            { id: "may_1", situacao: "PR", etiqueta: "0095999901", pnr: "CDFR54", vooOrigem: "LA8067", dataVoo: "14/05/2026", corTipo: "Mala verde-claro", observacoes: "" },
            { id: "may_2", situacao: "LI", etiqueta: "0095888802", pnr: "XSWE21", vooOrigem: "LA8070", dataVoo: "14/05/2026", corTipo: "Mala vermelha rígida", observacoes: "Liberado Receita" },
            { id: "may_3", situacao: "LI", etiqueta: "0095777703", pnr: "VGTR76", vooOrigem: "LA8067", dataVoo: "14/05/2026", corTipo: "Mochila cinza", observacoes: "PIR Finalizado" },
            { id: "may_4", situacao: "LI", etiqueta: "0095666604", pnr: "NHY65T", vooOrigem: "LA1234", dataVoo: "13/05/2026", corTipo: "Mala preta", observacoes: "Liberada" },
            { id: "may_5", situacao: "NE", etiqueta: "0095555505", pnr: "XCD321", vooOrigem: "LA8067", dataVoo: "14/05/2026", corTipo: "Mala preta Samsonite", observacoes: "Não embarcou" },
            { id: "may_6", situacao: "NE", etiqueta: "0095444406", pnr: "KI98UY", vooOrigem: "LA4562", dataVoo: "13/05/2026", corTipo: "Bolsa azul", observacoes: "Deixada no pátio GRU" },
            { id: "may_7", situacao: "NE", etiqueta: "0095333307", pnr: "OPO987", vooOrigem: "LA8067", dataVoo: "14/05/2026", corTipo: "Mala rígida amarela", observacoes: "Atraso no pátio" }
          ]
        },
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-05-27T16:50:00.000Z",
          deleted: false,
          bagagens: [
            { id: "may_8", situacao: "SE", etiqueta: "0095222208", pnr: "IUYT32", vooOrigem: "LA8070", dataVoo: "27/05/2026", corTipo: "Carrinho de bebê", observacoes: "Sem etiqueta" },
            { id: "may_9", situacao: "CI", etiqueta: "0095111109", pnr: "QWEA12", vooOrigem: "LA8067", dataVoo: "27/05/2026", corTipo: "Case de guitarra", observacoes: "Conexao" },
            { id: "may_10", situacao: "73", etiqueta: "0095000010", pnr: "LKJU87", vooOrigem: "LA8070", dataVoo: "26/05/2026", corTipo: "Mala prata", observacoes: "Abandonada" },
            { id: "may_11", situacao: "RP", etiqueta: "0095030303", pnr: "JHGF43", vooOrigem: "LA1234", dataVoo: "27/05/2026", corTipo: "Mochila infantil", observacoes: "Achados e Perdidos" }
          ]
        },
        // --- JUNE 2026 ---
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-06-03T11:45:00.000Z",
          deleted: false,
          bagagens: [
            { id: "jun_1", situacao: "PR", etiqueta: "0095123412", pnr: "HGFT32", vooOrigem: "LA8067", dataVoo: "03/06/2026", corTipo: "Mala vermelha rígida", observacoes: "Processo aberto" },
            { id: "jun_2", situacao: "LI", etiqueta: "0095234523", pnr: "PLLK12", vooOrigem: "LA8070", dataVoo: "03/06/2026", corTipo: "Mala preta de rodinhas", observacoes: "Liberado Receita" },
            { id: "jun_3", situacao: "LI", etiqueta: "0095345634", pnr: "LKJA90", vooOrigem: "LA1234", dataVoo: "02/06/2026", corTipo: "Acessórios infantil", observacoes: "Entregue" },
            { id: "jun_4", situacao: "NE", etiqueta: "0095456745", pnr: "POI21Q", vooOrigem: "LA4562", dataVoo: "03/06/2026", corTipo: "Mala cinza tecido", observacoes: "Irregularidade pátio" },
            { id: "jun_5", situacao: "CI", etiqueta: "0095567856", pnr: "WERF54", vooOrigem: "LA8067", dataVoo: "03/06/2026", corTipo: "Sacola verde", observacoes: "Trânsito internacional" }
          ]
        },
        {
          companhiaAerea: "LATAM Airlines (GRU)",
          funcionarios: [{ id: "f1", nome: "Ricardo Luiz", matricula: "GRU-0564" }],
          createdAt: "2026-06-11T14:40:00.000Z",
          deleted: false,
          bagagens: [
            { id: "jun_6", situacao: "PR", etiqueta: "0095728394", pnr: "BVCK88", vooOrigem: "LA8067", dataVoo: "11/06/2026", corTipo: "Sacola azul", observacoes: "OCR automatizado" },
            { id: "jun_7", situacao: "LI", etiqueta: "0095034857", pnr: "UIOP32", vooOrigem: "LA8070", dataVoo: "11/06/2026", corTipo: "Mala preta rígida", observacoes: "" },
            { id: "jun_8", situacao: "RT", etiqueta: "0095847385", pnr: "LKJH88", vooOrigem: "LA8067", dataVoo: "11/06/2026", corTipo: "Sacola esportiva", observacoes: "Retirada pelo passageiro" },
            { id: "jun_9", situacao: "SE", etiqueta: "0095938475", pnr: "MNBV90", vooOrigem: "LA1234", dataVoo: "10/06/2026", corTipo: "Mala preta de tecido", observacoes: "Sem tag identificadora" }
          ]
        }
      ];

      // POST each process to /api/processes
      for (const proc of demoProcesses) {
        await apiFetch("/api/processes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proc)
        });
      }

      setSeedSuccess(true);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Houve um problema ao simular dados.");
    } finally {
      setIsSeeding(false);
    }
  };

  // HELPER DATE PARSER TO GROUP PROCESSES BY MONTH
  const getMonthYearKey = (createdAtStr: string, dataVooStr?: string) => {
    if (createdAtStr) {
      const d = new Date(createdAtStr);
      if (!isNaN(d.getTime())) {
        const monthNames = [
          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        return {
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          label: `${monthNames[d.getMonth()]} / ${d.getFullYear()}`,
          monthCode: d.getMonth(),
          year: d.getFullYear(),
        };
      }
    }
    
    if (dataVooStr) {
      const parts = dataVooStr.split("/");
      if (parts.length >= 2) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        const yr = parts[2] ? parseInt(parts[2], 10) : 2026;
        if (monthIndex >= 0 && monthIndex < 12) {
          const monthNames = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
          ];
          return {
            key: `${yr}-${String(monthIndex + 1).padStart(2, '0')}`,
            label: `${monthNames[monthIndex]} / ${yr}`,
            monthCode: monthIndex,
            year: yr
          };
        }
      }
    }

    return { key: "2026-06", label: "Junho / 2026", monthCode: 5, year: 2026 };
  };

  // Compile month to month statistics
  const compileMonthlyData = (): MonthlyData[] => {
    const monthsMap: Record<string, MonthlyData> = {};

    processes.forEach((proc) => {
      // Skip if marked deleted
      if (proc.deleted) return;

      const dateMeta = getMonthYearKey(proc.createdAt, proc.bagagens[0]?.dataVoo);
      const mKey = dateMeta.key;

      if (!monthsMap[mKey]) {
        monthsMap[mKey] = {
          key: mKey,
          label: dateMeta.label,
          totalBags: 0,
          totalProcesses: 0,
          situacoes: {
            PR: 0, "73": 0, SE: 0, LI: 0, CI: 0, RT: 0, RP: 0, NE: 0, OT: 0
          },
          monthCode: dateMeta.monthCode,
          year: dateMeta.year,
          voos: new Set<string>()
        };
      }

      monthsMap[mKey].totalProcesses++;

      proc.bagagens.forEach((bag) => {
        monthsMap[mKey].totalBags++;
        if (bag.vooOrigem) {
          monthsMap[mKey].voos.add(bag.vooOrigem.toUpperCase().trim());
        }

        const sit = bag.situacao as SituacaoType;
        if (monthsMap[mKey].situacoes[sit] !== undefined) {
          monthsMap[mKey].situacoes[sit]++;
        } else {
          monthsMap[mKey].situacoes.OT++;
        }
      });
    });

    return Object.values(monthsMap);
  };

  const monthlyList = compileMonthlyData().sort((a, b) => a.key.localeCompare(b.key));

  // Initialize selected comparison months if not set
  useEffect(() => {
    if (monthlyList.length >= 2 && !monthAKey && !monthBKey) {
      // Default: set A as the first historical month, B as the latest active month
      setMonthAKey(monthlyList[0].key);
      setMonthBKey(monthlyList[monthlyList.length - 1].key);
    } else if (monthlyList.length === 1 && !monthAKey) {
      setMonthAKey(monthlyList[0].key);
      setMonthBKey(monthlyList[0].key);
    }
  }, [monthlyList, monthAKey, monthBKey]);

  // Extract selected months data
  const dataMonthA = monthlyList.find((m) => m.key === monthAKey);
  const dataMonthB = monthlyList.find((m) => m.key === monthBKey);

  // Total accumulators
  const totalProcessesCount = processes.filter(p => !p.deleted).length;
  const totalBagsTracked = processes.filter(p => !p.deleted).reduce((acc, p) => acc + p.bagagens.length, 0);

  // Resolution efficiency score (LI + RT + CI vs others)
  const getEfficiencyScore = (data?: MonthlyData) => {
    if (!data || data.totalBags === 0) return 0;
    const resolved = (data.situacoes.LI || 0) + (data.situacoes.RT || 0) + (data.situacoes.CI || 0);
    return Math.round((resolved / data.totalBags) * 100);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* HEADER ROW WITH COUNTERS & SUMMARY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-slate-200">
        <div>
          <span className="bg-[#E31837] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
            Painel Executivo
          </span>
          <h2 className="text-xl font-extrabold text-[#003087] mt-1.5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Estatísticas & Comparativos Mensais
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analise volumes acumulados, taxas de resolução e faça comparativos entre períodos operacionais de todas as situações de bagagens.
          </p>
        </div>

        {/* REFRESH & SEED ACTIONS */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            type="button"
            onClick={fetchData}
            className="px-3.5 py-2 hover:bg-slate-50 text-slate-700 bg-white border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 
            Atualizar Painel
          </button>

          <button
            type="button"
            disabled={isSeeding}
            onClick={handleSeedDemoData}
            className={`px-3.5 py-2 text-white bg-[#003087] hover:bg-blue-800 disabled:opacity-50 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
              seedSuccess ? "bg-emerald-600 hover:bg-emerald-700" : ""
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {isSeeding ? "Simulando..." : seedSuccess ? "Histórico seeded!" : "Gerar Histórico Demo"}
          </button>
        </div>
      </div>

      {/* WARNING IF NO HISTORICAL DATA REVEALED */}
      {monthlyList.length < 2 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold uppercase tracking-wide text-[10px]">Histórico de Períodos Escasso</p>
            <p>
              Detectamos apenas {monthlyList.length} mês ativo registrado. Para visualizar os comparativos mensais de situações, gráficos de tendência temporal e crescimento percentual, clique em <strong>"Gerar Histórico Demo"</strong> acima.
            </p>
          </div>
        </div>
      )}

      {/* TOP KPI BLOCK SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL BAGS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Acúmulo de Volumes Lidos</span>
            <h3 className="text-2xl font-black text-[#003087] mt-1">{totalBagsTracked}</h3>
            <span className="text-[10px] text-slate-500 font-mono">Em {totalProcessesCount} processos unificados</span>
          </div>
          <div className="bg-[#003087]/5 text-[#003087] p-3 rounded-lg">
            <Luggage className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: EFICIÊNCIA DO MÊS B */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Índice de Resolução (Mês B)</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {dataMonthB ? `${getEfficiencyScore(dataMonthB)}%` : "0%"}
            </h3>
            <span className="text-[10px] text-slate-500">Liberações, conexões e retiradas diretas</span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: NÃO EMBARCADO TOTAL */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Não Embarcados (Total Geral)</span>
            <h3 className="text-2xl font-black text-red-600 mt-1">
              {processes.filter(p => !p.deleted).reduce((acc, p) => acc + p.bagagens.filter(b => b.situacao === "NE").length, 0)}
            </h3>
            <span className="text-[10px] text-red-500 font-bold font-mono">Irregularidades pendentes</span>
          </div>
          <div className="bg-red-50 text-red-500 p-3 rounded-lg">
            <Plane className="w-6 h-6 transform rotate-45" />
          </div>
        </div>

        {/* KPI 4: ATIVIDADE DAS LINHAS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Voos de Origem Atendidos</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {Array.from(new Set(processes.filter(p => !p.deleted).flatMap(p => p.bagagens.map(b => b.vooOrigem.trim().toUpperCase())).filter(Boolean))).length}
            </h3>
            <span className="text-[10px] text-slate-500">Identificados em conciliação física</span>
          </div>
          <div className="bg-slate-100 text-slate-700 p-3 rounded-lg">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CORE 1: MONTH-TO-MONTH TREND CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* GRAPH 1: MONTH-TO-MONTH TOTAL VOLUME TREND COLUMN GRAPH (8 Cols) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Movimentação Mensal</h3>
                <h4 className="text-sm font-extrabold text-slate-800 mt-0.5">Evolução do Volume de Bagagens Conciliadas</h4>
              </div>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total de bagagens com situações mapeadas e notificadas para cada período analisado.
            </p>
          </div>

          {/* SVG COLUMN GRAPH (RESPONSIVE IN COMPONENT) */}
          <div className="mt-6 h-64 w-full flex items-end justify-between px-2 pb-4 pt-8 border-b border-l border-slate-200 relative">
            
            {/* GRID LINES HELPER */}
            <div className="absolute inset-x-0 bottom-1/4 border-t border-slate-100 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-2/4 border-t border-slate-100 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-3/4 border-t border-slate-100 pointer-events-none" />

            {monthlyList.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                Nenhum dado cadastrado para exibir o gráfico de colunas.
              </div>
            ) : (
              monthlyList.map((month) => {
                const maxVal = Math.max(...monthlyList.map(m => m.totalBags), 10);
                const heightPercentage = (month.totalBags / maxVal) * 100;
                
                return (
                  <div key={month.key} className="flex-1 flex flex-col items-center group relative mx-2">
                    
                    {/* TOOLTIP ON HOVER CARDS */}
                    <div className="absolute bottom-full mb-2 bg-[#0a255c] text-white p-2.5 rounded-lg text-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg z-20 min-w-[124px] text-[10px]">
                      <p className="font-extrabold text-[#E31837] tracking-wider uppercase mb-1">{month.label}</p>
                      <p>Mala(s): <strong className="font-mono text-xs">{month.totalBags}</strong></p>
                      <p>Processos: <strong className="font-mono">{month.totalProcesses}</strong></p>
                      <p>Vôos Atendidos: <strong className="font-mono">{month.voos.size}</strong></p>
                      <div className="w-2 h-2 bg-[#0a255c] absolute top-full left-1/2 -translate-x-1/2 rotate-45" />
                    </div>

                    {/* DUAL COLUMNS FOR REAL TIME RATIO (Total vs Resolved) */}
                    <div className="w-full flex items-end gap-1 justify-center">
                      
                      {/* Main absolute column (Total Volume) */}
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-8 sm:w-12 bg-[#003087] rounded-t-md hover:bg-blue-800 transition-colors relative"
                        style={{ minHeight: "10px" }}
                      >
                        <span className="absolute -top-6 inset-x-0 text-center font-mono font-bold text-xs text-[#003087]">
                          {month.totalBags}
                        </span>
                      </motion.div>

                      {/* Resolved volumes subgroup column (LI + RT + CI) */}
                      {(() => {
                        const resolvedBags = (month.situacoes.LI || 0) + (month.situacoes.RT || 0) + (month.situacoes.CI || 0);
                        const resolvedHeight = (resolvedBags / maxVal) * 100;
                        return (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${resolvedHeight}%` }}
                            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                            className="w-5 sm:w-8 bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-colors relative"
                            style={{ minHeight: "5px" }}
                          >
                            <span className="absolute -top-5 inset-x-0 text-center font-mono text-[9px] text-emerald-600 font-bold">
                              {resolvedBags}
                            </span>
                          </motion.div>
                        );
                      })()}

                    </div>

                    {/* LABEL OF MONTH */}
                    <span className="text-[10px] text-slate-500 font-bold mt-2 truncate w-full text-center">
                      {month.label.split(" / ")[0].slice(0, 3)}/{month.label.split(" / ")[1]}
                    </span>
                  </div>
                );
              })
            )}

          </div>

          <div className="flex gap-4 items-center justify-center mt-3 text-[10px] text-slate-500 font-bold">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-[#003087] rounded-sm" />
              <span>Log de Bagagens Lidas (Total)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm" />
              <span>Bagagens Resolvidas (LI, RT, CI)</span>
            </div>
          </div>
        </div>

        {/* GRAPH 2: INDIVIDUAL STATUS CHRONOLOGY LINE (4 Cols) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Análise de Tendência</h3>
              <TrendingUp className="w-5 h-5 text-red-500" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800 mt-0.5">Evolução por Situação Isolada</h4>
            
            {/* FOCUS SELECTOR */}
            <div className="mt-3">
              <label className="text-[9px] block uppercase font-bold text-slate-400 mb-1">Escolher Situação para Mapear:</label>
              <select
                value={focusSituacao}
                onChange={(e) => setFocusSituacao(e.target.value as SituacaoType)}
                className="w-full text-xs font-bold py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:ring-1 focus:ring-red-500 outline-none"
              >
                {Object.entries(SITUACOES).map(([kode, val]) => (
                  <option key={kode} value={kode}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LINE CHART GRAPH REPRESENTATION */}
          <div className="mt-6 h-40 w-full flex items-end justify-between px-2 pb-4 pt-10 border-b border-l border-slate-200 relative">
            {monthlyList.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                Nenhum dado para o gráfico de tendência.
              </div>
            ) : (
              monthlyList.map((month, i) => {
                const count = month.situacoes[focusSituacao] || 0;
                const maxVal = Math.max(...monthlyList.map(m => m.situacoes[focusSituacao] || 0), 5);
                const pct = (count / maxVal) * 100;
                const colorHex = SITUACOES[focusSituacao]?.text || "text-slate-800";

                return (
                  <div key={month.key} className="flex-1 flex flex-col items-center group relative mx-1">
                    {/* Tooltip on individual trend */}
                    <div className="absolute bottom-full mb-1 bg-slate-900 text-white px-2 py-1 rounded text-[9px] font-sans opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center">
                      <p className="font-bold">{month.label.split(" / ")[0]}</p>
                      <p className="font-mono">Volume: {count}</p>
                    </div>

                    {/* CIRCLE POINT GAUGE */}
                    <div className="w-full relative flex flex-col items-center justify-end h-full">
                      <motion.div 
                        initial={{ bottom: 0 }}
                        animate={{ bottom: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-3.5 h-3.5 rounded-full bg-[#E31837] border-2 border-white absolute shadow-md z-10 hover:scale-125 transition-transform"
                      />
                      {/* Vertical line connection */}
                      <div className="w-0.5 bg-red-100 absolute bottom-0 top-0 pointer-events-none" />
                    </div>

                    {/* Value readout tag */}
                    <span className="font-mono text-[10px] font-bold text-slate-700 absolute" style={{ bottom: `${pct}%`, transform: 'translateY(-18px)' }}>
                      {count}
                    </span>

                    {/* Month Label indicator */}
                    <span className="text-[9px] text-slate-400 font-bold truncate mt-2 w-full text-center">
                      {month.label.split(" / ")[0].slice(0, 3)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 mt-2 flex items-start gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-blue-800 shrink-0 mt-0.5" />
            <p>
              Acompanhe acima o pico e redução cíclica do status de interesse (<strong>{SITUACOES[focusSituacao]?.label}</strong>) para identificar gargalos operacionais específicos.
            </p>
          </div>
        </div>

      </div>

      {/* CORE 2: COMPARATIVE SELECTOR AND ANALYSIS BLOCKS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        
        {/* SELECTOR PANEL */}
        <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h3 className="text-xs font-black text-[#E31837] uppercase tracking-widest">Ferramenta Comparativa</h3>
            <h4 className="text-md font-extrabold text-slate-800 mt-1 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-slate-400" /> Analisar e Comparar Períodos Operacionais
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Selecione à direita duas datas do banco para realizar o cálculo diferencial de variações de conciliação.
            </p>
          </div>

          {/* DROPDOWNS SELECTOR */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Mês Base (A):</label>
              <select
                value={monthAKey}
                onChange={(e) => setMonthAKey(e.target.value)}
                className="text-xs font-extrabold py-1 px-3 bg-white border border-slate-300 rounded border-b-2 border-b-[#003087] text-slate-700 focus:outline-none"
              >
                {monthlyList.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 font-extrabold text-xs pt-4">VS</div>

            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Mês Comparativo (B):</label>
              <select
                value={monthBKey}
                onChange={(e) => setMonthBKey(e.target.value)}
                className="text-xs font-extrabold py-1 px-3 bg-white border border-slate-300 rounded border-b-2 border-b-[#E31837] text-slate-700 focus:outline-none"
              >
                {monthlyList.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* COMPARISON RESULTS INTERFACE CONTAINER */}
        {!dataMonthA || !dataMonthB ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Selecione períodos válidos acima para ver os comparativos de fluxo de bagagem do aeroporto.
          </div>
        ) : (
          <div className="pt-6 space-y-6">
            
            {/* DETAILED STATS BY SITUATION LIST */}
            <div className="space-y-4">
              <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-4">
                <div className="col-span-5 md:col-span-4">Situação (Status da Mala)</div>
                <div className="col-span-3 text-center bg-blue-50/50 p-1 rounded-t-md text-[#003087]">Mês A count ({dataMonthA.label.split(" / ")[0].slice(0, 3)})</div>
                <div className="col-span-3 text-center bg-red-50/50 p-1 rounded-t-md text-[#E31837]">Mês B count ({dataMonthB.label.split(" / ")[0].slice(0, 3)})</div>
                <div className="col-span-1 md:col-span-2 text-right">Crescimento / Declínio</div>
              </div>

              {/* LIST LOOP WITH SIDE-BY-SIDE PROGRESSIVE GAUGE BAR */}
              <div className="divide-y divide-slate-100">
                {Object.entries(SITUACOES).map(([kode, val]) => {
                  const countA = dataMonthA.situacoes[kode as SituacaoType] || 0;
                  const countB = dataMonthB.situacoes[kode as SituacaoType] || 0;
                  
                  // Calculate absolute difference and percentage
                  const diff = countB - countA;
                  let pctChangeStr = "0%";
                  let pctClass = "text-slate-500 font-medium";

                  if (countA > 0) {
                    const ratio = (diff / countA) * 100;
                    pctChangeStr = `${ratio > 0 ? "+" : ""}${ratio.toFixed(1)}%`;
                    
                    // Is an increase/decrease positive or negative?
                    // Depends on status:
                    // For NE, PR, 73, SE, RP -> higher is worse, lower is better
                    // For LI, RT, CI -> higher is better, lower is worse
                    const positiveStatus = ["LI", "RT", "CI"].includes(kode);
                    if (diff > 0) {
                      pctClass = positiveStatus ? "text-emerald-600 font-extrabold" : "text-amber-600 font-bold";
                    } else if (diff < 0) {
                      pctClass = positiveStatus ? "text-[#E31837] font-bold" : "text-emerald-600 font-extrabold";
                    }
                  } else if (countB > 0) {
                    pctChangeStr = "+100%";
                    pctClass = ["LI", "RT", "CI"].includes(kode) ? "text-emerald-600 font-extrabold" : "text-amber-600 font-medium";
                  }

                  // Max value for internal graph scale
                  const scaleMax = Math.max(
                    ...monthlyList.map(m => Math.max(...Object.values(m.situacoes), 1)),
                    1
                  );
                  const barAWid = (countA / scaleMax) * 100;
                  const barBWid = (countB / scaleMax) * 100;

                  return (
                    <div key={kode} className="grid grid-cols-12 items-center py-4 px-4 hover:bg-slate-50/70 transition">
                      
                      {/* Status Name */}
                      <div className="col-span-5 md:col-span-4 pr-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] uppercase font-bold text-center tracking-wider mb-1 ${val.bg}`}>
                          {kode}
                        </span>
                        <p className="text-xs font-bold text-slate-800 truncate" title={val.label}>
                          {val.label.split(" - ")[1]}
                        </p>
                      </div>

                      {/* Month A readout */}
                      <div className="col-span-3 text-center flex flex-col items-center justify-center">
                        <span className="font-mono text-sm font-extrabold text-[#003087]">
                          {countA}
                        </span>
                        {/* Gauge A */}
                        <div className="w-full max-w-[80px] h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-[#003087] transition-all duration-300" style={{ width: `${barAWid}%` }} />
                        </div>
                      </div>

                      {/* Month B readout */}
                      <div className="col-span-3 text-center flex flex-col items-center justify-center">
                        <span className="font-mono text-sm font-extrabold text-[#E31837]">
                          {countB}
                        </span>
                        {/* Gauge B */}
                        <div className="w-full max-w-[80px] h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-[#E31837] transition-all duration-300" style={{ width: `${barBWid}%` }} />
                        </div>
                      </div>

                      {/* Percentage output */}
                      <div className="col-span-1 md:col-span-2 text-right">
                        <span className={`text-xs block font-mono ${pctClass}`}>
                          {pctChangeStr}
                        </span>
                        <span className={`text-[10px] block font-mono ${diff > 0 ? "text-slate-500" : diff < 0 ? "text-slate-500" : "text-slate-300"}`}>
                          {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "Estável"}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK ANALYTICAL SUMMARY NOTE FROM THE COMPARE */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Veredito de Eficiência
                </h4>
                <div className="text-xs text-slate-600 space-y-1.5 mt-2 leading-relaxed">
                  <p>
                    No Mês Base (A), a taxa geral de resolução foi de <strong>{getEfficiencyScore(dataMonthA)}%</strong>. 
                    Já no Mês Comparativo (B), a taxa fechou em <strong>{getEfficiencyScore(dataMonthB)}%</strong>.
                  </p>
                  <p className="font-medium text-[#0a255c]">
                    {getEfficiencyScore(dataMonthB) >= getEfficiencyScore(dataMonthA) ? (
                      <span className="text-emerald-700">✓ O Mês comparativo apresentou melhoria nas liberações gerais no aeroporto de GRU!</span>
                    ) : (
                      <span className="text-amber-700">⚠ O Mês comparativo possui um índice de resolução menor que o mês base. Verifique os volumes de pendência em PIR.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-4">
                <h4 className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#003087]" /> Conselhos de Operações (LATAM GRU)
                </h4>
                <ul className="list-disc pl-4 mt-2 text-xs text-slate-500 space-y-1">
                  <li>Inconsistências no status <strong>NE (Não Embarcado)</strong> demandam conciliação expressa nas esteiras prioritárias.</li>
                  <li>Sempre verifique as tags de 10 dígitos (prefixo 0095 para voos internacionais e conexões).</li>
                </ul>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* CORE 3: CHRONOLOGICAL MATRIX DATA TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-700">Matriz Operacional Histórica Completa</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Tabela analítica consolidada com volumes de todas as situações de bagagens mês a mês.</p>
          </div>
          <Calendar className="w-5 h-5 text-slate-400" />
        </div>

        {monthlyList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum dado cadastrado para exibir a tabela. Clique em "Gerar Histórico Demo" acima para popular o banco.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-[#003087] text-white uppercase text-[9px] tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">Período / Mês</th>
                  <th className="px-4 py-3.5 text-center">Processos</th>
                  <th className="px-4 py-3.5 text-center bg-blue-900/40">Total Lidas</th>
                  {Object.keys(SITUACOES).map((sit) => (
                    <th key={sit} className="px-3 py-3.5 text-center font-bold">{sit}</th>
                  ))}
                  <th className="px-6 py-3.5 text-center">Eficiência (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px] text-slate-700">
                {monthlyList.map((m) => {
                  const resolvedRate = getEfficiencyScore(m);
                  return (
                    <tr key={m.key} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-sans font-bold text-slate-900">{m.label}</td>
                      <td className="px-4 py-4 text-center text-slate-500">{m.totalProcesses}</td>
                      <td className="px-4 py-4 text-center font-extrabold text-[#003087] bg-slate-50">{m.totalBags}</td>
                      
                      {/* SITUACAO SPECIFIC COUNTS */}
                      {Object.keys(SITUACOES).map((sit) => {
                        const count = m.situacoes[sit as SituacaoType] || 0;
                        return (
                          <td 
                            key={sit} 
                            className={`px-3 py-4 text-center font-bold ${
                              count > 0 ? "text-slate-800" : "text-slate-300"
                            }`}
                          >
                            {count}
                          </td>
                        );
                      })}

                      <td className="px-6 py-4 text-center font-sans font-extrabold">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] ${
                          resolvedRate >= 70 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : 
                          resolvedRate >= 50 ? "bg-amber-50 text-amber-800 border border-amber-200" : 
                          "bg-red-50 text-red-800 border border-red-200"
                        }`}>
                          {resolvedRate}%
                        </span>
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
