import React, { useState, useEffect } from "react";
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
  const [successInfo, setSuccessInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Sync with central database
  const fetchBaggages = async () => {
    try {
      setLoadingBags(true);
      const res = await fetch("/api/baggages");
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
      const res = await fetch("/api/baggages", {
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
      await fetch(`/api/baggages/${id}`, {
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
    if (!window.confirm("Deseja realmente remover esta bagagem? Ela será enviada à lixeira de descarte.")) return;
    try {
      const res = await fetch(`/api/baggages/${id}`, {
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

    if (emptyTags || emptyPnrs) {
      if (!window.confirm("Algumas bagagens selecionadas possuem dados incompletos (Etiqueta de 10 dígitos ou PNR de 6). Deseja gerar mesmo assim?")) {
        return;
      }
    }

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

      // Call API POST to store
      const response = await fetch("/api/processes", {
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
      setModalOpen(true);
      setCopied(false);

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

  // Reset/Archive active list completely
  const handleClearForm = async () => {
    if (window.confirm("Deseja realmente arquivar (lixeira) todas as bagagens ativas e limpar os campos?")) {
      try {
        setIsSubmitting(true);
        for (const b of bagagens) {
          await fetch(`/api/baggages/${b.id}`, {
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
          <div className="text-right text-blue-100 text-[10px] leading-tight hidden sm:block">
            Instruções de Preenchimento<br />Dúvidas: 0800-LATAM-GRU
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

      {/* INFORMATIVE RETENTION & FLOW BANNER */}
      <div className="bg-[#003087]/5 border border-[#003087]/20 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <span className="p-1.5 bg-[#003087]/10 text-[#003087] rounded-lg mt-0.5">
          <Clock className="w-5 h-5" />
        </span>
        <div className="text-xs text-[#003087]">
          <h4 className="font-extrabold font-sans">Mesa de Conciliação em Tempo Real (24 Horas)</h4>
          <p className="mt-1 leading-relaxed text-[#003087]/85">
            Todas as etiquetas identificadas por OCR (Ler Etiqueta) ou criadas manualmente são salvas de forma persistente nesta tabela por <strong>24 horas</strong>. Marque as caixas de seleção na primeira coluna para definir quais itens serão compilados e gerados no lote de envio por e-mail. Itens excluídos ou mais antigos que 24h são movidos ao <strong>Histórico & Lixeira</strong>.
          </p>
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

      {/* MODAL PREVIEW HTML EMAIL */}
      {modalOpen && (
        <div id="html-generation-modal" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* MODAL HEADER */}
            <div className="bg-[#003087] text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-extrabold text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" /> Relatório Consolidado Criado!
                </h4>
                <p className="text-xs text-blue-200 mt-1">
                  Código de e-mail inline gerado com sucesso para envio ao corporativo e Receita Federal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  fetchBaggages(); // Refresh bags
                }}
                className="bg-white/15 hover:bg-white/20 p-1.5 rounded-full text-white transition-all text-xs font-bold px-3 py-1.5"
              >
                X Fechar
              </button>
            </div>

            {/* MODAL ACCORDION INFO SPLIT (EDIT / PREVIEW) */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-emerald-800 flex gap-3 text-xs">
                <div className="bg-emerald-500 rounded-full p-1 text-white shrink-0 self-start">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold">Salvo no Banco de Dados com sucesso!</p>
                  <p className="mt-0.5">Identificador do processo: <strong className="font-mono bg-emerald-100 px-1 rounded text-emerald-900">{successInfo?.id}</strong></p>
                  <p className="mt-2 text-slate-500">O código HTML abaixo possui CSS 100% inline, o que garante compatibilidade total de tabelas e cores no Outlook e Gmail de equipes de aeroportos.</p>
                </div>
              </div>

              {/* COPIADORES & EMAIL ACTIONS */}
              <div className="flex flex-col gap-4 pb-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-700 uppercase block">Opções de Envio e Cópia:</span>
                    <p className="text-[11px] text-slate-500 mt-1">Envie o arquivo HTML diretamente para a Receita Federal ou copie-o para uso manual.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      id="btn-copy-generated-html"
                      onClick={handleCopyHtml}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer ${
                        copied 
                          ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "HTML Copiado com Sucesso!" : "Copiar HTML para E-mail"}
                    </button>

                    {/* DIRECT GMAIL ENVELOPE LAUNCHER */}
                    <button
                      type="button"
                      onClick={() => {
                        // Automatically copy first to make pasting easy
                        handleCopyHtml();

                        // Automatically trigger HTML file download for easy drag-and-drop attachment
                        try {
                          const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "lista_de_sobras.html";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Erro ao baixar HTML:", err);
                        }

                        // Standard destination and email template parameters
                        const emailTo = "alfgru.bagagem@rfb.gov.br";
                        const emailSubject = "Lista de sobras";
                        const emailBody = `Prezada Receita Federal do Brasil,\n\nSegue em anexo o arquivo "lista_de_sobras.html" contendo o relatório consolidado de conciliação de bagagens extraviadas e sobras sob controle operacional da LATAM Airlines no Aeroporto de Guarulhos S/A (GRU).\n\nAtenciosamente,\n${activeUser.nome}\nMatrícula: ${activeUser.matricula}\nLATAM Airlines - GRU Conciliação`;
                        
                        // Compose Gmail Web application link
                        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTo)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                        window.open(gmailUrl, "_blank");
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 font-extrabold text-xs px-5 py-2.5 rounded-lg shadow-md bg-[#E31837] text-white hover:bg-rose-700 transition cursor-pointer"
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

                {/* HELPFUL DOCK TIP */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2.5 items-start">
                  <div className="p-1.5 bg-[#003087]/10 text-[#003087] rounded-md font-bold text-xs select-none">💡</div>
                  <div className="text-[11px] text-slate-700 leading-relaxed">
                    <strong>Como funciona o envio direto:</strong> Ao clicar no botão vermelho <strong className="text-[#E31837]">"Enviar Relatório no Gmail App"</strong>, o sistema <strong>baixa o arquivo HTML "lista_de_sobras.html" automaticamente</strong> para que você possa anexá-lo e também <strong>copia o relatório completo formatado</strong> para sua área de transferência. Basta anexar o arquivo baixado ou pressionar <strong>CTRL+V</strong> no corpo do e-mail do Gmail para inserir a tabela formatada com o logotipo da LATAM!
                  </div>
                </div>
              </div>

              {/* VISUAL LAYOUT PREVIEW SANDBOX */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Visualização Prévia do E-mail</label>
                <div 
                  className="border border-slate-300 rounded-xl overflow-hidden shadow-inner max-h-[450px] overflow-y-auto bg-slate-100 p-4"
                  dangerouslySetInnerHTML={{ __html: generatedHtml }}
                />
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  fetchBaggages(); // Refresh bags
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm px-6 py-2 rounded-lg"
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
