import React, { useState, useEffect } from "react";
import { apiFetch } from "../utils/mockApi";
import { 
  FileText, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Check, 
  Clock, 
  AlertCircle,
  Copy,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronUp,
  UserCheck
} from "lucide-react";
import { Funcionario, Bagagem, SituacaoType, SITUACOES } from "../types";
import { gerarHtmlEmail } from "../utils/gerarHtmlEmail";
import { gerarCsvRelatorio, gerarNomeArquivoCsv, formatarDataParaCsv } from "../utils/gerarCsvRelatorio";

interface NovoProcessoProps {
  activeUser: { nome: string; matricula: string };
  onActiveUserChange: (user: { nome: string; matricula: string }) => void;
}

export default function NovoProcesso({ activeUser, onActiveUserChange }: NovoProcessoProps) {
  const [companhiaAerea, setCompanhiaAerea] = useState("LATAM Airlines");
  
  // Single worker mapped array for backward database compatibility
  const funcionarios: Funcionario[] = [
    { id: "active", nome: activeUser.nome, matricula: activeUser.matricula }
  ];

  // Bagagem items array loading from the server DB
  const [bagagens, setBagagens] = useState<Bagagem[]>([]);
  // Individual row IDs chosen to compile into the generated PIR email file
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);
  const [loadingBags, setLoadingBags] = useState(false);

  // Geração / Output States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [generatedCsv, setGeneratedCsv] = useState("");
  const [generatedCsvFilename, setGeneratedCsvFilename] = useState("");
  const [successInfo, setSuccessInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Sync with central database
  const fetchBaggages = async () => {
    try {
      setLoadingBags(true);
      const res = await apiFetch("/api/baggages");
      if (res.ok) {
        const data = await res.json();
        setBagagens(data);
        // Pre-select all baggages for process creation by default
        setSelectedBagIds(data.map((item: any) => item.id));
      }
    } catch (e) {
      console.error("Erro ao sincronizar bagagens:", e);
    } finally {
      setLoadingBags(false);
    }
  };

  useEffect(() => {
    fetchBaggages();
  }, []);

  // Add empty baggage line to server & state
  const handleAddBagagem = async () => {
    const template = {
      situacao: "PR",
      etiqueta: "",
      pnr: "",
      vooOrigem: "",
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      corTipo: "",
      observacoes: ""
    };

    try {
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template)
      });
      if (res.ok) {
        const created = await res.json();
        setBagagens([created, ...bagagens]);
        setSelectedBagIds([created.id, ...selectedBagIds]);
      }
    } catch (err) {
      console.error("Erro ao adicionar bagagem:", err);
      alert("Falha de comunicação com o servidor.");
    }
  };

  // Update baggage line value with server synchronization
  const handleUpdateBagagem = async (id: string, field: keyof Bagagem, value: string) => {
    let sanitizedValue = value;
    if (field === "etiqueta") {
      sanitizedValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (field === "pnr") {
      sanitizedValue = value.toUpperCase().slice(0, 6);
    }

    // Update locally for visual immediacy
    setBagagens((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: sanitizedValue } : b))
    );

    // PUT to update in server JSON DB
    try {
      await apiFetch(`/api/baggages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: sanitizedValue })
      });
    } catch (err) {
      console.error("Erro ao sincronizar alteração no banco:", err);
    }
  };

  // Remove baggage line (soft-delete to lixeira database)
  const handleRemoveBagagem = async (id: string) => {
    try {
      const res = await apiFetch(`/api/baggages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true })
      });
      if (res.ok) {
        setBagagens((prev) => prev.filter((b) => b.id !== id));
        setSelectedBagIds((prev) => prev.filter((bid) => bid !== id));
      }
    } catch (err) {
      console.error("Erro ao arquivar bagagem:", err);
    }
  };

  // Toggle selection state for a baggage
  const handleToggleBagSelect = (id: string) => {
    if (selectedBagIds.includes(id)) {
      setSelectedBagIds(selectedBagIds.filter((i) => i !== id));
    } else {
      setSelectedBagIds([...selectedBagIds, id]);
    }
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedBagIds.length === bagagens.length) {
      setSelectedBagIds([]);
    } else {
      setSelectedBagIds(bagagens.map((b) => b.id));
    }
  };

  // Submit to Generate and Save
  const handleGenerateProcess = async () => {
    // Filter chosen baggages
    const selectedBaggages = bagagens.filter((b) => selectedBagIds.includes(b.id));

    if (!companhiaAerea.trim()) {
      alert("Por favor, preencha a Companhia Aérea.");
      return;
    }
    if (funcionarios.length === 0) {
      alert("Por favor, adicione pelo menos um Funcionário.");
      return;
    }
    if (selectedBaggages.length === 0) {
      alert("Por favor, selecione pelo menos uma Bagagem da tabela para gerar o relatório.");
      return;
    }

    const emptyTags = selectedBaggages.some(b => !b.etiqueta || b.etiqueta.length < 10);
    const emptyPnrs = selectedBaggages.some(b => !b.pnr || b.pnr.length < 6);

    try {
      setIsSubmitting(true);

      const mockProcess: any = {
        id: "temp_generation",
        companhiaAerea,
        funcionarios,
        bagagens: selectedBaggages,
        createdAt: new Date().toISOString(),
        deleted: false
      };

      // Compile beautiful inline HTML email
      const compiledHtml = gerarHtmlEmail(mockProcess);
      
      // Compile CSV and generate filename matching image
      const compiledCsv = gerarCsvRelatorio(mockProcess, activeUser);
      const csvFilename = gerarNomeArquivoCsv(mockProcess);

      // Call API POST to store
      const response = await apiFetch("/api/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companhiaAerea,
          funcionarios,
          bagagens: selectedBaggages,
          htmlGerado: compiledHtml
        })
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar o processo no banco.");
      }

      const savedData = await response.json();
      
      // Update local states for presentation
      setSuccessInfo(savedData);
      setGeneratedHtml(compiledHtml);
      setGeneratedCsv(compiledCsv);
      setGeneratedCsvFilename(csvFilename);
      setModalOpen(true);
      setCopied(false);

      // Automatically trigger CSV file download instantly so it is already generated and downloaded
      try {
        const blob = new Blob([compiledCsv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = csvFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Erro no download automático do CSV:", err);
      }

    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar processo: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy code helpers
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedCsv, setCopiedCsv] = useState(false);
  const handleCopyCsvData = () => {
    if (!generatedCsv) return;
    navigator.clipboard.writeText(generatedCsv);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const handleDownloadCsv = (csvContent?: string, filename?: string) => {
    const csvToDownload = csvContent || generatedCsv;
    const nameToDownload = filename || generatedCsvFilename || "sobras_latam.csv";
    if (!csvToDownload) return;
    try {
      const blob = new Blob([csvToDownload], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nameToDownload;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar CSV:", err);
    }
  };

  // Reset/Archive active list completely
  const handleClearForm = async () => {
    try {
      setIsSubmitting(true);
      for (const b of bagagens) {
        await apiFetch(`/api/baggages/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleted: true })
        });
      }
      await fetchBaggages();
      onActiveUserChange({ nome: "Ricardo Luiz", matricula: "GRU-0564" });
      setCompanhiaAerea("LATAM Airlines");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* SEÇÃO 1: CABEÇALHO/COMPANHIA OPERACIONAL */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-[#003087] p-4 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="bg-white p-1 rounded-sm">
              <img src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" alt="LATAM" className="h-4" />
            </div>
            <div>
              <div className="text-white text-[10px] font-bold uppercase leading-tight tracking-wider">Receita Federal do Brasil</div>
              <div className="text-white text-xs opacity-80 uppercase leading-none font-semibold">Formulário de Bagagens Extraviadas</div>
            </div>
          </div>

        </div>
        
        {/* Form Body */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Companhia Aérea</label>
            <input
              type="text"
              value={companhiaAerea}
              onChange={(e) => setCompanhiaAerea(e.target.value)}
              className="w-full px-3 py-2 border rounded border-slate-300 text-sm focus:ring-1 focus:ring-[#003087] outline-none font-medium text-slate-800"
              placeholder="Ex: LATAM Airlines"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Local do Registro Corporativo</label>
            <div className="px-3 py-2 bg-slate-50 border rounded border-slate-200 text-sm font-medium text-slate-500 cursor-not-allowed">
              Aeroporto de Guarulhos S/A (GRU)
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: FUNCIONÁRIO RESPONSÁVEL (DADOS PARA ASSINATURA DO ARQUIVO) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#003087]" />
            <h3 className="text-sm font-extrabold uppercase text-slate-800">
              Funcionário Responsável (Assinatura do Arquivo)
            </h3>
          </div>
          <span className="text-[10px] uppercase font-bold bg-[#003087]/15 text-[#003087] px-2 py-1 rounded">
            Operador Único unificado
          </span>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            As informações abaixo serão incorporadas à assinatura e ao cabeçalho do arquivo gerado para a Receita Federal. Altere quando preferir para registrar outro operador (as mudanças também sincronizam no topo e lateral do app!).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome Completo do Responsável</label>
              <input
                type="text"
                value={activeUser.nome}
                onChange={(e) => onActiveUserChange({ ...activeUser, nome: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg border-slate-300 text-xs focus:ring-1 focus:ring-[#003087] outline-none font-semibold text-slate-800"
                placeholder="Ex: Ricardo Luiz"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Matrícula Corporativa GRU</label>
              <input
                type="text"
                value={activeUser.matricula}
                onChange={(e) => onActiveUserChange({ ...activeUser, matricula: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border rounded-lg border-slate-300 text-xs focus:ring-1 focus:ring-[#003087] outline-none font-mono font-bold text-slate-800"
                placeholder="Ex: GRU-0564"
              />
            </div>
          </div>
        </div>
      </div>



      {/* SEÇÃO 4: LISTA DE COBRANÇAS DE BAGAGENS (MAIN ROWS GRID) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Tabela de Bagagens em Execução</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Total ativo no painel: {bagagens.length} volumes | Selecionados para compor lote: {selectedBagIds.length} volumes</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchBaggages}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition"
              title="Sincronizar com Servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBags ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
            <button
              type="button"
              onClick={handleAddBagagem}
              className="inline-flex items-center gap-1.5 bg-[#003087] hover:bg-blue-950 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Bagagem
            </button>
          </div>
        </div>

        {/* INPUTS TIPO TABELA */}
        {bagagens.length > 0 ? (
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full border-collapse border border-slate-100 text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider select-none">
                  <th className="px-3 py-3 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedBagIds.length === bagagens.length && bagagens.length > 0} 
                      onChange={handleToggleSelectAll}
                      className="rounded text-[#003087] border-slate-300 focus:ring-[#003087] h-4 w-4 cursor-pointer" 
                      title="Selecionar todos os volumes"
                    />
                  </th>
                  <th className="px-2 py-3 w-48">Situação *</th>
                  <th className="px-2 py-3 w-36">Etiqueta (Tag)*</th>
                  <th className="px-2 py-3 w-28">Reserva (PNR)*</th>
                  <th className="px-2 py-3 w-24">Voo Origem</th>
                  <th className="px-2 py-3 w-24">Data Voo</th>
                  <th className="px-2 py-3 w-36">Cor e Tipo de Mala</th>
                  <th className="px-2 py-3">Observações</th>
                  <th className="px-2 py-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bagagens.map((bag) => {
                  const isChecked = selectedBagIds.includes(bag.id);
                  return (
                    <tr 
                      key={bag.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isChecked ? "bg-[#003087]/[0.02]" : "bg-white opacity-85"
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="px-3 py-3 text-center">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleBagSelect(bag.id)}
                          className="rounded text-[#003087] border-slate-300 focus:ring-[#003087] h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Situacao SELECT */}
                      <td className="px-2 py-2">
                        <select
                          id={`input-situacao-${bag.id}`}
                          value={bag.situacao}
                          onChange={(e) => handleUpdateBagagem(bag.id, "situacao", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#003087] outline-none font-semibold text-slate-700 bg-white"
                        >
                          {Object.entries(SITUACOES).map(([kode, val]) => (
                            <option key={kode} value={kode}>
                              {val.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Tag Number */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          id={`input-etiqueta-${bag.id}`}
                          value={bag.etiqueta}
                          onChange={(e) => handleUpdateBagagem(bag.id, "etiqueta", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#003087] outline-none font-mono font-bold text-[#003087]"
                          placeholder="Ex: 0095843920"
                          maxLength={10}
                        />
                      </td>

                      {/* PNR Code */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          id={`input-pnr-${bag.id}`}
                          value={bag.pnr}
                          onChange={(e) => handleUpdateBagagem(bag.id, "pnr", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#E31837] outline-none font-mono font-bold text-[#E31837] uppercase"
                          placeholder="Ex: LHMQ9Z"
                          maxLength={6}
                        />
                      </td>

                      {/* Flight orig */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={bag.vooOrigem || ""}
                          onChange={(e) => handleUpdateBagagem(bag.id, "vooOrigem", e.target.value.toUpperCase())}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none font-mono"
                          placeholder="Ex: LA8070"
                        />
                      </td>

                      {/* Data Voo */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={bag.dataVoo || ""}
                          onChange={(e) => handleUpdateBagagem(bag.id, "dataVoo", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none"
                          placeholder="Ex: 07/06/2026"
                        />
                      </td>

                      {/* Cor/Tipo */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={bag.corTipo || ""}
                          onChange={(e) => handleUpdateBagagem(bag.id, "corTipo", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none"
                          placeholder="Ex: Mala rodinha preta"
                        />
                      </td>

                      {/* Obs */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={bag.observacoes || ""}
                          onChange={(e) => handleUpdateBagagem(bag.id, "observacoes", e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none"
                          placeholder="Obs adicionais"
                        />
                      </td>

                      {/* Rem button */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveBagagem(bag.id)}
                          className="text-slate-400 hover:text-[#E31837] p-1.5 hover:bg-rose-50 rounded-lg transition"
                          title="Remover bagagem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs mx-6 my-6">
            🧳 Nenhuma bagagem escalada no formulário de conciliação. Leia etiquetas na tela "Ler Etiqueta" ou clique em "Adicionar Bagagem" acima.
          </div>
        )}
      </div>

      {/* CORE CONTROLES FOR ENTIRE FORM */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-100 border border-slate-200 p-5 rounded">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Fuso Oficial: <strong>UTC (Brasília +3h no e-mail)</strong></span>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            type="button"
            id="btn-clear-entire-form"
            onClick={handleClearForm}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold border border-[#003087] text-[#003087] rounded hover:bg-blue-50 transition-all cursor-pointer bg-white"
          >
            Limpar Tudo
          </button>
          
          <button
            type="button"
            id="btn-generate-pir-process"
            onClick={handleGenerateProcess}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold bg-[#003087] text-white rounded shadow-xs hover:bg-blue-900 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processando...
              </>
            ) : (
              <>
                Gerar Arquivo para Envio
              </>
            )}
          </button>
        </div>
      </div>
      {/* MODAL PREVIEW CSV SPREADSHEET */}
      {modalOpen && (
        <div id="html-generation-modal" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* MODAL HEADER */}
            <div className="bg-[#003087] text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" /> Relatório CSV Gerado!
                </h4>
                <p className="text-xs text-blue-200 mt-1">
                  Arquivo CSV de sobras criado e salvo com sucesso no banco de dados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  fetchBaggages(); // Refresh bags
                }}
                className="bg-white/15 hover:bg-white/20 p-1.5 rounded-full text-white transition-all text-xs font-bold px-3 py-1.5 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {/* MODAL CONTENT CONTAINER */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* SUCCESS MESSAGE */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 flex gap-3 text-xs">
                <div className="bg-emerald-500 rounded-full p-1 text-white shrink-0 self-start">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Salvo com sucesso e Baixado Automaticamente!</p>
                  <p className="mt-1 text-slate-600">
                    O arquivo de planilha <strong className="font-mono text-emerald-900 bg-emerald-100 px-1 py-0.5 rounded">{generatedCsvFilename}</strong> já foi gerado e o download iniciou automaticamente no seu navegador.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS & INFO PANEL */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-700 uppercase block">Envio Operacional GRU / Receita:</span>
                    <p className="text-[11px] text-slate-500 mt-1">Clique no botão abaixo para abrir o Gmail pré-preenchido e apenas anexe o arquivo CSV recém-baixado.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* DOWNLOAD AGAIN BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleDownloadCsv()}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Baixar Arquivo CSV
                    </button>

                    {/* COPY CSV DATA BUTTON */}
                    <button
                      type="button"
                      onClick={handleCopyCsvData}
                      className={`flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition cursor-pointer ${
                        copiedCsv 
                          ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedCsv ? "Dados CSV Copiados!" : "Copiar Texto CSV"}
                    </button>

                    {/* DIRECT GMAIL ENVELOPE LAUNCHER */}
                    <button
                      type="button"
                      onClick={() => {
                        // Automatically trigger download again just to make sure they have it
                        handleDownloadCsv();

                        // Standard destination and email template parameters
                        const emailTo = "alfgru.bagagem@rfb.gov.br";
                        const emailSubject = "Lista de sobras";
                        const emailBody = `Prezada Receita Federal do Brasil,\n\nSegue em anexo o arquivo "${generatedCsvFilename}" contendo o relatório de sobras de bagagem cadastrado no terminal de conciliação LATAM de Guarulhos S/A (GRU).\n\nAtenciosamente,\n${activeUser.nome}\nMatrícula: ${activeUser.matricula}\nLATAM Airlines - GRU Conciliação`;
                        
                        // Compose Gmail Web application link
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                        window.open(gmailUrl, "_blank");
                      }}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 font-black text-xs px-6 py-2.5 rounded-lg shadow-md bg-[#E31837] text-white hover:bg-rose-700 transition cursor-pointer"
                    >
                      {/* Logo LATAM minimalist inside button */}
                      <img 
                        src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
                        alt="Latam" 
                        className="h-2.5 invert brightness-200 mr-0.5 object-contain"
                      />
                      Enviar Relatório no Gmail App
                    </button>
                  </div>
                </div>

                {/* HELPFUL STEP-BY-STEP DOCK */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-lg text-sm select-none shrink-0 font-bold">💡</div>
                  <div className="text-[11.5px] text-slate-700 space-y-1.5 leading-relaxed">
                    <p className="font-extrabold uppercase text-[10px] tracking-wide text-[#003087]">Como enviar o e-mail de imediato:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>O navegador já baixou a planilha <strong className="text-slate-900">{generatedCsvFilename}</strong> automaticamente na sua pasta de Downloads.</li>
                      <li>Clique no botão vermelho <strong className="text-[#E31837]">"Enviar Relatório no Gmail App"</strong> acima. Uma nova aba do Gmail se abrirá com o destinatário correto, assunto e mensagem preenchidos de forma padrão.</li>
                      <li>Na aba do Gmail aberta, basta <strong>arrastar e soltar (drag and drop) o arquivo CSV baixado</strong> ou clicar no ícone de anexo para concluir o envio oficial.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* SPREADSHEET DECORATED SECTION */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">
                  Visualização Prévia do Arquivo Gerado (Identico à Planilha Excel/Sheets)
                </label>

                {/* GOOGLE SPREADSHEET LAYOUT FRAMEWORK */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-md bg-[#202124] flex flex-col">
                  
                  {/* Google Sheets Header bar */}
                  <div className="bg-[#202124] px-4 py-3 flex items-center justify-between border-b border-[#3c4043] text-sm text-white">
                    <div className="flex items-center gap-2.5">
                      {/* Grid Spreadsheet icon */}
                      <div className="w-5 h-5 bg-[#107c41] rounded flex items-center justify-center text-[10px] font-black font-sans leading-none select-none text-white">
                        X
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-200 tracking-wide select-all">
                        {generatedCsvFilename || "sobras_latam.csv"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 select-none">
                      CSV UTF-8
                    </div>
                  </div>

                  {/* Operational Spreadsheet container */}
                  <div className="overflow-x-auto max-w-full bg-white">
                    <table className="w-full text-left border-collapse text-xs select-text font-mono">
                      <thead>
                        {/* Alphabetical Header Row */}
                        <tr className="bg-[#f8f9fa] border-b border-[#dadce0] text-[#5f6368] text-center text-[10px] divide-x divide-[#dadce0]">
                          <th className="w-10 bg-[#f8f9fa] font-normal leading-none py-1 border-r border-[#dadce0]"></th>
                          <th className="w-32 py-1 select-none font-bold">A</th>
                          <th className="w-24 py-1 select-none font-bold">B</th>
                          <th className="w-32 py-1 select-none font-bold">C</th>
                          <th className="w-32 py-1 select-none font-bold">D</th>
                          <th className="w-28 py-1 select-none font-bold">E</th>
                          <th className="w-32 py-1 select-none font-bold">F</th>
                          <th className="w-36 py-1 select-none font-bold">G</th>
                          <th className="w-56 py-1 select-none font-bold">H</th>
                        </tr>

                        {/* Column Titles Row (Row #1 in target sheet view) */}
                        <tr className="bg-white border-b border-[#dadce0] text-slate-900 font-extrabold text-[11px] divide-x divide-[#dadce0]">
                          <td className="bg-[#f8f9fa] text-[#5f6368] font-normal text-center select-none py-2 border-r border-[#dadce0]">1</td>
                          <td className="px-3 py-2 bg-slate-50">DATA_LEITURA</td>
                          <td className="px-3 py-2 bg-slate-50">SITUACAO</td>
                          <td className="px-3 py-2 bg-slate-50">ETIQUETA</td>
                          <td className="px-3 py-2 bg-slate-50">RESERVA</td>
                          <td className="px-3 py-2 bg-slate-50">VOO_ORIGEM</td>
                          <td className="px-3 py-2 bg-slate-50">DATA_VOO_ORIGE</td>
                          <td className="px-3 py-2 bg-slate-50">COR_TIPO</td>
                          <td className="px-3 py-2 bg-slate-50">OBSERVACAO</td>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dadce0]">
                        {/* Data Rows mapped from chosen list items */}
                        {(successInfo?.bagagens || bagagens.filter(b => selectedBagIds.includes(b.id))).map((bag: Bagagem, index: number) => {
                          const rowNum = index + 2; // Rows starts at 2 after header
                          return (
                            <tr key={bag.id} className="hover:bg-blue-50/40 text-slate-800 text-[11px] divide-x divide-[#dadce0] transition">
                              <td className="bg-[#f8f9fa] text-[#5f6368] font-normal text-center select-none py-2 border-r border-[#dadce0] font-sans font-medium text-[10px] w-10 sticky left-0 z-10">
                                {rowNum}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-sans">
                                {formatarDataParaCsv(successInfo?.createdAt || new Date().toISOString())}
                              </td>
                              <td className="px-3 py-2 text-center font-bold font-sans">
                                <span className="inline-block outline-hidden">
                                  {bag.situacao}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono font-medium tracking-wide text-slate-900 select-all">
                                {bag.etiqueta || "-"}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700 select-all">
                                {bag.pnr || "-"}
                              </td>
                              <td className="px-3 py-2 font-sans font-semibold text-[#003087]">
                                {bag.vooOrigem || "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {formatarDataParaCsv(bag.dataVoo) || "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-700 text-xs">
                                {bag.corTipo || "-"}
                              </td>
                              <td className="px-3 py-2 text-slate-600 italic font-sans text-xs max-w-xs truncate" title={bag.observacoes}>
                                {bag.observacoes || ""}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Signature Row exactly matching Excel bottom pattern */}
                        {(() => {
                          const currentBags = successInfo?.bagagens || bagagens.filter(b => selectedBagIds.includes(b.id));
                          const signatureRowNumber = currentBags.length + 2;
                          const primeiroNome = (activeUser?.nome || "OPERADOR").trim().split(" ")[0].toUpperCase();
                          const signatureString = `${primeiroNome} / ${activeUser?.matricula || "0"}`;
                          return (
                            <tr className="bg-slate-50 border-b border-[#dadce0] text-slate-800 text-[11px] divide-x divide-[#dadce0] transition font-bold font-sans">
                              <td className="bg-[#f8f9fa] text-[#5f6368] font-normal text-center select-none py-2 border-r border-[#dadce0] font-sans font-medium text-[10px] w-10 sticky left-0 z-10">
                                {signatureRowNumber}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-sans font-normal">
                                {formatarDataParaCsv(successInfo?.createdAt || new Date().toISOString())}
                              </td>
                              <td className="px-3 py-2 text-center text-[#E31837] font-extrabold uppercase">
                                FC
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">
                                0
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">
                                0
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">
                                0
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">
                                0
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">
                                0
                              </td>
                              <td className="px-3 py-2 text-slate-900 font-mono tracking-wide select-all font-black text-right pr-4">
                                {signatureString}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0 gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  fetchBaggages(); // Refresh bags
                }}
                className="bg-[#003087] hover:bg-blue-900 text-white font-extrabold text-xs px-6 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Concluir e Voltar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
