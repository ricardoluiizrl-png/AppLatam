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
  UserCheck,
  History,
  Undo2,
  ArchiveRestore,
  AlertTriangle,
  FolderCheck
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

  // Expired / Deleted bags (Trash bin)
  const [expiredBags, setExpiredBags] = useState<Bagagem[]>([]);
  const [selectedExpiredBagIds, setSelectedExpiredBagIds] = useState<string[]>([]);
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [lixeiraExpanded, setLixeiraExpanded] = useState(false);
  const [processedExpanded, setProcessedExpanded] = useState(true);

  // Geração / Output States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [generatedCsv, setGeneratedCsv] = useState("");
  const [generatedCsvFilename, setGeneratedCsvFilename] = useState("");
  const [successInfo, setSuccessInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'email' | 'csv'>('email');

  // Modal active interactive editor states
  const [modalFuncionarios, setModalFuncionarios] = useState<Funcionario[]>([]);
  const [modalBagagens, setModalBagagens] = useState<Bagagem[]>([]);
  const [isAddingFunc, setIsAddingFunc] = useState(false);
  const [isAddingBag, setIsAddingBag] = useState(false);
  const [newFuncNome, setNewFuncNome] = useState("");
  const [newFuncMatricula, setNewFuncMatricula] = useState("");
  const [newBagSub, setNewBagSub] = useState<any>({
    situacao: "PR",
    etiqueta: "",
    pnr: "",
    vooOrigem: "",
    dataVoo: new Date().toLocaleDateString("pt-BR"),
    corTipo: "",
    observacoes: ""
  });

  // Sync with central database
  const fetchBaggages = async () => {
    try {
      setLoadingBags(true);
      const res = await apiFetch("/api/baggages");
      if (res.ok) {
        const data = await res.json();
        setBagagens(data);
        // Pre-select pending (not generated) baggages for process creation by default
        const pending = data.filter((item: any) => !item.generated);
        setSelectedBagIds(pending.map((item: any) => item.id));
      }
    } catch (e) {
      console.error("Erro ao sincronizar bagagens:", e);
    } finally {
      setLoadingBags(false);
    }
  };

  const fetchExpiredBags = async () => {
    try {
      setLoadingExpired(true);
      const res = await apiFetch("/api/baggages/expired");
      if (res.ok) {
        const data = await res.json();
        setExpiredBags(data);
        // Clean up selected IDs that are no longer in the trash
        const validIds = data.map((b: any) => b.id);
        setSelectedExpiredBagIds(prev => prev.filter(id => validIds.includes(id)));
      }
    } catch (e) {
      console.error("Erro ao carregar lixeira:", e);
    } finally {
      setLoadingExpired(false);
    }
  };

  useEffect(() => {
    fetchBaggages();
    fetchExpiredBags();
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
      sanitizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
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
        await fetchExpiredBags(); // Refresh lixeira lists too
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

  // Separation of active baggages
  const pendingBags = bagagens.filter(b => !b.generated);
  const processedBags = bagagens.filter(b => b.generated);

  // Toggle selection of pending items
  const handleToggleSelectAllPending = () => {
    const pendingIds = pendingBags.map(b => b.id);
    const allSelectedPending = pendingBags.length > 0 && pendingIds.every(id => selectedBagIds.includes(id));
    if (allSelectedPending) {
      setSelectedBagIds(prev => prev.filter(id => !pendingIds.includes(id)));
    } else {
      setSelectedBagIds(prev => {
        const others = prev.filter(id => !pendingIds.includes(id));
        return [...others, ...pendingIds];
      });
    }
  };

  // Toggle selection of processed items
  const handleToggleSelectAllProcessed = () => {
    const processedIds = processedBags.map(b => b.id);
    const allSelectedProcessed = processedBags.length > 0 && processedIds.every(id => selectedBagIds.includes(id));
    if (allSelectedProcessed) {
      setSelectedBagIds(prev => prev.filter(id => !processedIds.includes(id)));
    } else {
      setSelectedBagIds(prev => {
        const others = prev.filter(id => !processedIds.includes(id));
        return [...others, ...processedIds];
      });
    }
  };

  // Select all overall active bags
  const handleToggleSelectAll = () => {
    if (selectedBagIds.length === bagagens.length) {
      setSelectedBagIds([]);
    } else {
      setSelectedBagIds(bagagens.map((b) => b.id));
    }
  };

  // Restore bag from recycle bin
  const handleRestoreBag = async (id: string) => {
    try {
      const res = await apiFetch(`/api/baggages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true })
      });
      if (res.ok) {
        await fetchBaggages();
        await fetchExpiredBags();
      }
    } catch (err) {
      console.error("Erro ao restaurar bagagem:", err);
    }
  };

  // Permanently delete a baggage
  const handlePermanentDeleteBag = async (id: string) => {
    if (!window.confirm("⚠️ Tem certeza que deseja EXCLUIR DEFINITIVAMENTE esta bagagem? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await apiFetch(`/api/baggages/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchExpiredBags();
      }
    } catch (err) {
      console.error("Erro ao excluir bagagem permanentemente:", err);
    }
  };

  // Empty the recycle bin
  const handleEmptyTrash = async () => {
    if (expiredBags.length === 0) return;
    if (!window.confirm(`⚠️ Tem certeza que deseja ESVAZIAR A LIXEIRA? Todas as ${expiredBags.length} bagagens serão excluídas de forma permanente!`)) return;
    try {
      for (const b of expiredBags) {
        await apiFetch(`/api/baggages/${b.id}`, {
          method: "DELETE"
        });
      }
      await fetchExpiredBags();
    } catch (err) {
      console.error("Erro ao esvaziar lixeira:", err);
    }
  };

  // Toggle selection for a single expired bag
  const handleToggleExpiredBagSelect = (id: string) => {
    if (selectedExpiredBagIds.includes(id)) {
      setSelectedExpiredBagIds(selectedExpiredBagIds.filter((i) => i !== id));
    } else {
      setSelectedExpiredBagIds([...selectedExpiredBagIds, id]);
    }
  };

  // Toggle selection for all expired bags
  const handleToggleSelectAllExpired = () => {
    if (selectedExpiredBagIds.length === expiredBags.length) {
      setSelectedExpiredBagIds([]);
    } else {
      setSelectedExpiredBagIds(expiredBags.map((b) => b.id));
    }
  };

  // Restore selected expired bags (mass recovery)
  const handleRestoreSelectedBags = async () => {
    if (selectedExpiredBagIds.length === 0) return;
    try {
      setLoadingExpired(true);
      for (const id of selectedExpiredBagIds) {
        await apiFetch(`/api/baggages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restore: true })
        });
      }
      setSelectedExpiredBagIds([]);
      await fetchBaggages();
      await fetchExpiredBags();
    } catch (err) {
      console.error("Erro ao restaurar bagagens selecionadas:", err);
    } finally {
      setLoadingExpired(false);
    }
  };

  // Permanently delete selected expired bags (mass deletion)
  const handleDeleteSelectedBags = async () => {
    if (selectedExpiredBagIds.length === 0) return;
    if (!window.confirm(`⚠️ Tem certeza que deseja EXCLUIR DEFINITIVAMENTE as ${selectedExpiredBagIds.length} bagagens selecionadas? Esta ação não pode ser desfeita.`)) return;
    try {
      setLoadingExpired(true);
      for (const id of selectedExpiredBagIds) {
        await apiFetch(`/api/baggages/${id}`, {
          method: "DELETE"
        });
      }
      setSelectedExpiredBagIds([]);
      await fetchExpiredBags();
    } catch (err) {
      console.error("Erro ao excluir bagagens selecionadas:", err);
    } finally {
      setLoadingExpired(false);
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
      setModalFuncionarios(savedData.funcionarios || mockProcess.funcionarios || []);
      setModalBagagens(savedData.bagagens || mockProcess.bagagens || []);
      setIsAddingFunc(false);
      setIsAddingBag(false);
      setNewFuncNome("");
      setNewFuncMatricula("");
      setGeneratedHtml(compiledHtml);
      setGeneratedCsv(compiledCsv);
      setGeneratedCsvFilename(csvFilename);
      setModalOpen(true);
      setCopied(false);
      setActivePreviewTab('email');

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

  // Updates local states and regenerates compiled HTML and CSV in real-time
  const handleUpdateModalData = (updatedFuncs: Funcionario[], updatedBags: Bagagem[]) => {
    setModalFuncionarios(updatedFuncs);
    setModalBagagens(updatedBags);

    // Recompile mock process using the updated fields (for preview / output sync)
    const updatedProcess = {
      ...successInfo,
      companhiaAerea: successInfo?.companhiaAerea || companhiaAerea,
      funcionarios: updatedFuncs,
      bagagens: updatedBags,
      createdAt: successInfo?.createdAt || new Date().toISOString()
    };

    // Compile new HTML & CSV
    const newHtml = gerarHtmlEmail(updatedProcess);
    const newCsv = gerarCsvRelatorio(updatedProcess, updatedFuncs[0] || activeUser);
    
    setGeneratedHtml(newHtml);
    setGeneratedCsv(newCsv);
  };

  const handleModalGenerateAndDownload = () => {
    // Generate latest content based on currently state lists
    const updatedProcess = {
      ...successInfo,
      companhiaAerea: successInfo?.companhiaAerea || companhiaAerea,
      funcionarios: modalFuncionarios,
      bagagens: modalBagagens,
      createdAt: successInfo?.createdAt || new Date().toISOString()
    };

    const newCsv = gerarCsvRelatorio(updatedProcess, modalFuncionarios[0] || activeUser);
    const newFilename = gerarNomeArquivoCsv(updatedProcess);

    setGeneratedCsv(newCsv);
    setGeneratedCsvFilename(newFilename);

    handleDownloadCsv(newCsv, newFilename);
  };

  const handleModalClear = () => {
    handleUpdateModalData([], []);
    setIsAddingFunc(false);
    setIsAddingBag(false);
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



      {/* SEÇÃO 4: DUAS TABELAS DE EXECUÇÃO (PENDENTES VS PROCESSADAS) */}
      
      {/* SEÇÃO 4A: ETIQUETAS PENDENTES (AINDA NÃO GERADAS EM ARQUIVO) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-px">
        <div className="bg-gradient-to-r from-[#003087]/5 to-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="text-sm font-extrabold text-slate-800">Etiquetas Pendentes</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Ainda não foram geradas no arquivo CSV | Total ativo pendente: <strong>{pendingBags.length}</strong> volumes | Selecionados: <strong>{pendingBags.filter(b => selectedBagIds.includes(b.id)).length}</strong> volumes
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={fetchBaggages}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
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
              <Plus className="w-3.5 h-3.5" /> Adicionar Bagagem Manual
            </button>
          </div>
        </div>

        {pendingBags.length > 0 ? (
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full border-collapse border border-slate-100 text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider select-none">
                  <th className="px-3 py-3 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={pendingBags.length > 0 && pendingBags.every(b => selectedBagIds.includes(b.id))} 
                      onChange={handleToggleSelectAllPending}
                      className="rounded text-[#003087] border-slate-300 focus:ring-[#003087] h-4 w-4 cursor-pointer" 
                      title="Selecionar todas as pendentes"
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
                {pendingBags.map((bag) => {
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
                          className="text-slate-400 hover:text-[#E31837] p-1.5 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remover bagagem (enviar para lixeira)"
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
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs mx-6 my-6 leading-relaxed">
            🧳 Nenhuma bagagem pendente de geração de arquivo. <br />
            Insira novas etiquetas na tela <strong className="text-[#003087]">"Ler Etiqueta"</strong> ou clique em <strong className="text-[#003087]">"Adicionar Bagagem Manual"</strong> acima.
          </div>
        )}
      </div>

      {/* SEÇÃO 4B: ETIQUETAS PROCESSADAS (JÁ GERADAS EM ARQUIVO / LOTES) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setProcessedExpanded(!processedExpanded)}
          className="w-full bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between hover:bg-slate-100/75 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-sm font-extrabold text-slate-800">
              Etiquetas Processadas (Lotes Gerados)
            </h3>
            <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded ml-2">
              {processedBags.length} volumes
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs font-semibold text-slate-500">
              {processedExpanded ? "Ocultar tabela" : "Mostrar tabela"}
            </span>
            {processedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {processedExpanded && (
          <div className="p-0 animate-fade-in">
            <p className="text-[11px] text-slate-500 px-6 pt-4 pb-2 leading-relaxed">
              ⚠️ Estas bagagens já foram exportadas para um ou mais arquivos CSV da Receita Federal. Você ainda pode selecioná-las se precisar gerar um novo lote unificado com elas!
            </p>
            {processedBags.length > 0 ? (
              <div className="overflow-x-auto min-w-full">
                <table className="min-w-full border-collapse border border-slate-100 text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider select-none">
                      <th className="px-3 py-3 w-10 text-center">
                        <input 
                          type="checkbox" 
                          checked={processedBags.length > 0 && processedBags.every(b => selectedBagIds.includes(b.id))} 
                          onChange={handleToggleSelectAllProcessed}
                          className="rounded text-[#003087] border-slate-300 focus:ring-[#003087] h-4 w-4 cursor-pointer" 
                          title="Selecionar todas as processadas"
                        />
                      </th>
                      <th className="px-2 py-3 w-36">Status do Lote</th>
                      <th className="px-2 py-3 w-48">Situação</th>
                      <th className="px-2 py-3 w-36">Etiqueta (Tag)</th>
                      <th className="px-2 py-3 w-28">Reserva (PNR)</th>
                      <th className="px-2 py-3 w-24">Voo Origem</th>
                      <th className="px-2 py-3 w-24">Data Voo</th>
                      <th className="px-2 py-3 w-36">Cor e Tipo de Mala</th>
                      <th className="px-2 py-3">Observações</th>
                      <th className="px-2 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {processedBags.map((bag) => {
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

                          {/* Lote Status badge */}
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-150">
                              <FolderCheck className="w-2.5 h-2.5" /> CSV Gerado
                            </span>
                          </td>

                          {/* Situacao SELECT */}
                          <td className="px-2 py-2">
                            <select
                              value={bag.situacao}
                              onChange={(e) => handleUpdateBagagem(bag.id, "situacao", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#003087] outline-none font-semibold text-slate-500 bg-slate-50"
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
                              value={bag.etiqueta}
                              onChange={(e) => handleUpdateBagagem(bag.id, "etiqueta", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#003087] outline-none font-mono font-bold text-slate-500 bg-slate-50"
                              placeholder="Ex: 0095843920"
                              maxLength={10}
                            />
                          </td>

                          {/* PNR Code */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={bag.pnr}
                              onChange={(e) => handleUpdateBagagem(bag.id, "pnr", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#E31837] outline-none font-mono font-bold text-slate-500 bg-slate-50 uppercase"
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
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none font-mono text-slate-500 bg-slate-50"
                              placeholder="Ex: LA8070"
                            />
                          </td>

                          {/* Data Voo */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={bag.dataVoo || ""}
                              onChange={(e) => handleUpdateBagagem(bag.id, "dataVoo", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none text-slate-500 bg-slate-50 animate-duration-200"
                              placeholder="Ex: 07/06/2026"
                            />
                          </td>

                          {/* Cor/Tipo */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={bag.corTipo || ""}
                              onChange={(e) => handleUpdateBagagem(bag.id, "corTipo", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none text-slate-500 bg-slate-50"
                              placeholder="Ex: Mala rodinha preta"
                            />
                          </td>

                          {/* Obs */}
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={bag.observacoes || ""}
                              onChange={(e) => handleUpdateBagagem(bag.id, "observacoes", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-400 outline-none text-slate-500 bg-slate-50"
                              placeholder="Obs adicionais"
                            />
                          </td>

                          {/* Rem button */}
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBagagem(bag.id)}
                              className="text-slate-400 hover:text-[#E31837] p-1.5 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Remover bagagem (enviar para lixeira)"
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
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-150 rounded-xl text-slate-400 text-xs mx-6 my-6">
                Nenhum volume foi exportado para arquivo ainda nesta sessão.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEÇÃO 4C: LIXEIRA & HISTÓRICO DE EXCLUSÃO/EXPIRAÇÃO (>24h) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setLixeiraExpanded(!lixeiraExpanded)}
          className="w-full bg-[#E31837]/5 border-b border-slate-200 px-6 py-4 flex items-center justify-between hover:bg-[#E31837]/10 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#E31837]" />
            <h3 className="text-sm font-extrabold text-[#E31837]">
              Lixeira de Bagagens (Expiradas & Excluídas)
            </h3>
            <span className="text-[10px] uppercase font-bold bg-[#E31837]/15 text-[#E31837] px-2.5 py-0.5 rounded ml-2">
              {expiredBags.length} volumes
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#E31837]/60">
            <span className="text-xs font-semibold">
              {lixeiraExpanded ? "Ocultar lixeira" : "Visualizar lixeira para recuperação"}
            </span>
            {lixeiraExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {lixeiraExpanded && (
          <div className="p-0 animate-fade-in">
            <div className="bg-amber-50/50 border-b border-amber-100 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-normal max-w-2xl text-left">
                  Conforme as especificações operacionais, as bagagens lidas vão <strong>automaticamente para a lixeira após 24 horas</strong> da leitura para manter o painel de conciliação limpo. Você pode recuperar qualquer etiqueta quando quiser para que ela volte ao painel ativo por mais 24 horas!
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedExpiredBagIds.length > 0 ? (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-extrabold text-slate-600">
                      {selectedExpiredBagIds.length} selecionados:
                    </span>
                    <button
                      type="button"
                      onClick={handleRestoreSelectedBags}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Undo2 className="w-3 h-3" /> Restaurar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedBags}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-md transition cursor-pointer shadow-xs"
                    >
                      Excluir
                    </button>
                  </div>
                ) : (
                  expiredBags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border border-rose-200 transition shrink-0 cursor-pointer"
                    >
                      ✕ Esvaziar Lixeira
                    </button>
                  )
                )}
              </div>
            </div>

            {expiredBags.length > 0 ? (
              <div className="overflow-x-auto min-w-full">
                <table className="min-w-full border-collapse border border-slate-100 text-xs text-left bg-slate-50/20">
                  <thead>
                    <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider select-none">
                      <th className="px-3 py-3 w-10 text-center">
                        <input 
                          type="checkbox" 
                          checked={expiredBags.length > 0 && expiredBags.every(b => selectedExpiredBagIds.includes(b.id))} 
                          onChange={handleToggleSelectAllExpired}
                          className="rounded text-rose-600 border-slate-300 focus:ring-rose-500 h-4 w-4 cursor-pointer" 
                          title="Selecionar todas as expiradas"
                        />
                      </th>
                      <th className="px-4 py-3 w-36">Motivo</th>
                      <th className="px-2 py-3 w-40">Situação</th>
                      <th className="px-2 py-3 w-36">Etiqueta (Tag)</th>
                      <th className="px-2 py-3 w-28">Reserva (PNR)</th>
                      <th className="px-2 py-3 w-28">Voo</th>
                      <th className="px-2 py-3">Mala / Observações</th>
                      <th className="px-4 py-3 text-right w-52">Ações de Recuperação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {expiredBags.map((bag) => {
                      const createdTime = new Date(bag.createdAt || bag.timestamp || "").getTime();
                      const isExpired = (Date.now() - createdTime) > 24 * 60 * 60 * 1000;
                      const isChecked = selectedExpiredBagIds.includes(bag.id);
                      return (
                        <tr key={bag.id} className={`hover:bg-slate-100/30 transition-colors ${isChecked ? 'bg-rose-500/5' : 'bg-white'}`}>
                          <td className="px-3 py-3 text-center">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleExpiredBagSelect(bag.id)}
                              className="rounded text-rose-600 border-slate-300 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                <Clock className="w-2.5 h-2.5 text-amber-600" /> Expirado &gt;24h
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded">
                                <Trash2 className="w-2.5 h-2.5 text-rose-600" /> Excluído Manual
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3 font-semibold text-slate-600">
                            {SITUACOES[bag.situacao]?.label || bag.situacao}
                          </td>
                          <td className="px-2 py-3 font-mono font-black text-slate-700">
                            {bag.etiqueta || "—"}
                          </td>
                          <td className="px-2 py-3 font-mono font-extrabold text-slate-700">
                            {bag.pnr || "—"}
                          </td>
                          <td className="px-2 py-3 text-slate-500 font-mono">
                            {bag.vooOrigem || "—"}
                          </td>
                          <td className="px-2 py-3 text-slate-500 leading-tight">
                            <div className="font-semibold">{bag.corTipo || "Sem descrição"}</div>
                            <div className="text-[10px] opacity-80">{bag.observacoes}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleRestoreBag(bag.id)}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition cursor-pointer"
                                title="Recuperar esta etiqueta e reinserir na fila por mais 24h"
                              >
                                <Undo2 className="w-3.5 h-3.5" /> Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePermanentDeleteBag(bag.id)}
                                className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-150 transition cursor-pointer"
                                title="Excluir de forma permanente"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs leading-relaxed">
                🗑️ A lixeira está limpa. Nenhuma etiqueta expirada ou excluída no momento.
              </div>
            )}
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

            {/* MODAL CONTENT CONTAINER - Soft elegant off-white background representing the print preview environment */}
            <div className="flex-1 p-6 bg-[#eaeaea] overflow-y-auto flex flex-col items-stretch justify-start min-h-[500px] space-y-6">
              
              {/* SUCCESS MESSAGE */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 flex gap-3 text-xs w-full">
                <div className="bg-emerald-500 rounded-full p-1 text-white shrink-0 self-start">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-left w-full">
                  <p className="font-bold text-sm">Salvo com sucesso e Baixado Automaticamente!</p>
                  <p className="mt-1 text-slate-600 font-medium">
                    O arquivo de planilha <strong className="font-mono text-emerald-900 bg-emerald-100 px-1 py-0.5 rounded">{generatedCsvFilename}</strong> já foi gerado e o download iniciou automaticamente no seu navegador.
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS & INFO PANEL */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4 w-full text-left">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-700 uppercase block">Envio Operacional GRU / Receita:</span>
                    <p className="text-[11px] text-slate-500 mt-1">Clique no botão abaixo para abrir o Gmail pré-preenchido e apenas anexe o arquivo CSV recém-baixado.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
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
                  <div className="text-[11px] text-slate-700 space-y-1.5 leading-relaxed font-sans">
                    <p className="font-extrabold uppercase text-[10px] tracking-wide text-[#003087]">Como enviar o e-mail de imediato:</p>
                    <ol className="list-decimal pl-4 space-y-1 font-medium">
                      <li>O navegador já baixou a planilha <strong className="text-slate-900">{generatedCsvFilename}</strong> automaticamente na sua pasta de Downloads.</li>
                      <li>Clique no botão vermelho <strong className="text-[#E31837]">"Enviar Relatório no Gmail App"</strong> acima. Uma nova aba do Gmail se abrirá com o destinatário correto, assunto e mensagem preenchidos de forma padrão.</li>
                      <li>Na aba do Gmail aberta, basta <strong>arrastar e soltar (drag and drop) o arquivo CSV baixado</strong> ou clicar no ícone de anexo para concluir o envio oficial.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* TABS CONTROLLER */}
              <div className="border-b border-slate-200 w-full text-left">
                <div className="flex gap-4 -mb-px">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('email')}
                    className={`pb-3 px-2 font-bold text-xs uppercase tracking-wider border-b-2 transition-all focus:outline-none cursor-pointer ${
                      activePreviewTab === 'email'
                        ? "border-[#003087] text-[#003087]"
                        : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    💌 E-mail Oficial (Tela Azul da Receita)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('csv')}
                    className={`pb-3 px-2 font-bold text-xs uppercase tracking-wider border-b-2 transition-all focus:outline-none cursor-pointer ${
                      activePreviewTab === 'csv'
                        ? "border-[#003087] text-[#003087]"
                        : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    📊 Excel / Planilha de Sobras (CSV)
                  </button>
                </div>
              </div>

              {/* ACTIVE TAB VIEW WRAPPER */}
              <div className="w-full flex justify-center">
                {activePreviewTab === 'email' ? (
                <div className="w-full max-w-4xl bg-[#003B70] text-white shadow-2xl flex flex-col text-left font-sans animate-fade-in border border-white/10">
                  
                  {/* Outer Frame Title Bar */}
                  <div className="bg-[#002f63] px-5 py-3 flex items-center justify-between border-b border-[#00254f] select-none shrink-0">
                    <span className="font-sans font-extrabold text-[11px] tracking-wider text-white">
                      FORMULÁRIO OFICIAL — RECEITA FEDERAL DO BRASIL
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('csv')}
                      className="bg-[#204a80] hover:bg-[#2b5d9c] text-white font-bold text-[10px] uppercase px-3 py-1 bg-slate-500 rounded-sm border border-white/20 tracking-wider transition-all cursor-pointer font-sans"
                    >
                      PREVIEW HTML
                    </button>
                  </div>
                  
                  {/* Blue form body */}
                  <div className="p-8 space-y-6">
                    
                    {/* Companhia Aérea */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white select-none">Companhia Aérea:</span>
                      <select 
                        value={companhiaAerea} 
                        onChange={(e) => setCompanhiaAerea(e.target.value)}
                        className="bg-white text-black font-extrabold text-xs px-2 py-1.5 w-48 rounded-none border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                      >
                        <option value="LATAM Airlines">LATAM Airlines</option>
                        <option value="TAM Linhas Aéreas">TAM Linhas Aéreas</option>
                        <option value="LATAM CARGO">LATAM Cargo</option>
                        <option value="LATAM GRU">LATAM GRU</option>
                      </select>
                    </div>

                    <p className="text-xs font-bold text-white select-none leading-relaxed">
                      Informar abaixo os funcionários que acompanharão as bagagens até a Alfândega:
                    </p>

                    {/* Companion Employees table list */}
                    <div className="max-w-xl">
                      <div className="grid grid-cols-2 text-xs font-bold text-blue-200 border-b border-white/25 pb-1 select-none">
                        <div>Nome</div>
                        <div>Matrícula GRU</div>
                      </div>
                      <div className="divide-y divide-white/10 mt-1 max-h-[160px] overflow-y-auto">
                        {modalFuncionarios.map((f, i) => (
                          <div key={i} className="grid grid-cols-2 text-xs py-2 font-bold text-white group items-center">
                            <div>{f.nome}</div>
                            <div className="flex justify-between items-center pr-2 font-mono">
                              <span>{f.matricula}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  const filtered = modalFuncionarios.filter((_, idx) => idx !== i);
                                  handleUpdateModalData(filtered, modalBagagens);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 font-bold transition text-[9px] cursor-pointer bg-black/30 border border-white/10 px-1.5 py-0.5 rounded"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                        {modalFuncionarios.length === 0 && (
                          <div className="py-3 text-xs italic text-blue-200/50">Nenhum funcionário adicionado.</div>
                        )}
                      </div>
                    </div>

                    {/* Inline operator input form */}
                    {isAddingFunc ? (
                      <div className="bg-black/25 p-4 border border-white/20 mt-2 flex flex-col sm:flex-row gap-3 items-end text-white rounded max-w-xl animate-fade-in">
                        <div className="flex-1 w-full text-left">
                          <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            value={newFuncNome}
                            onChange={(e) => setNewFuncNome(e.target.value)}
                            placeholder="Nome..."
                            className="w-full bg-white text-black font-extrabold text-xs px-2.5 py-1.5 outline-none rounded-none border border-slate-300"
                          />
                        </div>
                        <div className="w-full sm:w-40 text-left">
                          <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Matrícula</label>
                          <input 
                            type="text" 
                            value={newFuncMatricula}
                            onChange={(e) => setNewFuncMatricula(e.target.value)}
                            placeholder="Matrícula..."
                            className="w-full bg-white text-black font-extrabold text-xs px-2.5 py-1.5 font-mono outline-none rounded-none border border-slate-300"
                          />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end md:justify-start">
                          <button
                            type="button"
                            onClick={() => {
                              if (!newFuncNome.trim() || !newFuncMatricula.trim()) {
                                alert("Por favor, preencha o Nome e a Matrícula do funcionário.");
                                return;
                              }
                              const updated = [...modalFuncionarios, { nome: newFuncNome.trim(), matricula: newFuncMatricula.trim() }];
                              handleUpdateModalData(updated, modalBagagens);
                              setIsAddingFunc(false);
                              setNewFuncNome("");
                              setNewFuncMatricula("");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xs transition cursor-pointer"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingFunc(false)}
                            className="bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xs transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingFunc(true);
                          setIsAddingBag(false);
                        }}
                        className="bg-white text-slate-900 font-extrabold text-[12px] px-3.5 py-1.5 shadow-sm border border-slate-300 hover:bg-slate-50 transition cursor-pointer rounded-xs"
                      >
                        Adicionar Funcionário
                      </button>
                    )}

                    {/* Fieldset Bagagens */}
                    <fieldset className="border border-white/30 p-5 rounded-none relative text-left w-full mt-4 bg-transparent">
                      <legend className="px-2 font-black text-xs text-white bg-[#003B70] leading-none select-none">
                        Bagagens
                      </legend>
                      
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse mb-1">
                          <thead>
                            <tr className="border-b border-white/20 text-[11px] font-bold text-blue-200 select-none">
                              <th className="py-2 px-1 text-xs">Situação</th>
                              <th className="py-2 px-1 text-xs">Etiqueta</th>
                              <th className="py-2 px-1 text-xs">Reserva</th>
                              <th className="py-2 px-1 text-xs">Voo de Origem</th>
                              <th className="py-2 px-1 text-xs">Data do Voo</th>
                              <th className="py-2 px-1 text-xs">Cor e Tipo</th>
                              <th className="py-2 px-1 text-xs">Observação</th>
                              <th className="py-2 px-1 text-right w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-bold text-white">
                            {modalBagagens.map((b, i) => (
                              <tr key={i} className="hover:bg-white/5 transition">
                                <td className="py-2 px-1 text-slate-100 font-sans">
                                  {SITUACOES[b.situacao as SituacaoType]?.label || b.situacao}
                                </td>
                                <td className="py-2 px-1 font-mono tracking-wider text-white">
                                  {b.etiqueta || "-"}
                                </td>
                                <td className="py-2 px-1 font-mono text-indigo-100">
                                  {b.pnr || "-"}
                                </td>
                                <td className="py-2 px-1 text-white">
                                  {b.vooOrigem || "-"}
                                </td>
                                <td className="py-2 px-1 text-slate-200 font-sans">
                                  {b.dataVoo || "-"}
                                </td>
                                <td className="py-2 px-1 text-slate-200">
                                  {b.corTipo || "-"}
                                </td>
                                <td className="py-2 px-1 text-slate-300 font-medium font-sans max-w-xs truncate" title={b.observacoes}>
                                  {b.observacoes || "-"}
                                </td>
                                <td className="py-2 px-1 text-right">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const filtered = modalBagagens.filter((_, idx) => idx !== i);
                                      handleUpdateModalData(modalFuncionarios, filtered);
                                    }}
                                    className="text-white/60 hover:text-rose-400 font-bold transition text-[10px] cursor-pointer bg-black/25 hover:bg-black/40 px-2 py-0.5 rounded border border-white/5"
                                  >
                                    Remover
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {modalBagagens.length === 0 && (
                              <tr>
                                <td colSpan={8} className="py-4 text-center text-xs text-blue-200/50 italic font-medium">
                                  Nenhuma bagagem incluída.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Inline bag addition form block inside fieldset */}
                      {isAddingBag ? (
                        <div className="bg-black/25 p-4 border border-white/20 mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs animate-fade-in text-white rounded">
                          <div className="text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Situação</label>
                            <select 
                              value={newBagSub.situacao}
                              onChange={(e) => setNewBagSub({...newBagSub, situacao: e.target.value})}
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 outline-none font-sans"
                            >
                              {Object.entries(SITUACOES).map(([k, v]) => (
                                <option key={k} value={k} className="text-black font-bold">
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Etiqueta (Até 12 caracteres)</label>
                            <input 
                              type="text" 
                              maxLength={12}
                              value={newBagSub.etiqueta}
                              onChange={(e) => setNewBagSub({...newBagSub, etiqueta: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")})}
                              placeholder="Ex: 0045202956"
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 font-mono outline-none"
                            />
                          </div>
                          <div className="text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Reserva PNR (6 caracteres)</label>
                            <input 
                              type="text" 
                              maxLength={6}
                              value={newBagSub.pnr}
                              onChange={(e) => setNewBagSub({...newBagSub, pnr: e.target.value.toUpperCase()})}
                              placeholder="Ex: DCDVNP"
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 font-mono outline-none"
                            />
                          </div>
                          <div className="text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Voo de Origem</label>
                            <input 
                              type="text" 
                              value={newBagSub.vooOrigem}
                              onChange={(e) => setNewBagSub({...newBagSub, vooOrigem: e.target.value.toUpperCase()})}
                              placeholder="Ex: LA3553"
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 outline-none"
                            />
                          </div>
                          <div className="text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Data do Voo</label>
                            <input 
                              type="text" 
                              value={newBagSub.dataVoo}
                              onChange={(e) => setNewBagSub({...newBagSub, dataVoo: e.target.value})}
                              placeholder="Ex: 13/06/2026"
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 outline-none"
                            />
                          </div>
                          <div className="text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Cor e Tipo</label>
                            <input 
                              type="text" 
                              value={newBagSub.corTipo}
                              onChange={(e) => setNewBagSub({...newBagSub, corTipo: e.target.value})}
                              placeholder="Ex: Preta rígida"
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 outline-none"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-left">
                            <label className="block text-[10px] text-blue-200 uppercase font-bold mb-1">Observação</label>
                            <input 
                              type="text" 
                              value={newBagSub.observacoes}
                              onChange={(e) => setNewBagSub({...newBagSub, observacoes: e.target.value})}
                              placeholder="Ex: Mala riscada"
                              className="w-full bg-white text-black font-extrabold text-xs p-1.5 outline-none font-sans"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-4 flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newBagSub.etiqueta || !newBagSub.pnr || !newBagSub.vooOrigem) {
                                  alert("Por favor, preencha os campos obrigatórios (Etiqueta, Reserva e Voo).");
                                  return;
                                }
                                const updated = [...modalBagagens, { ...newBagSub, id: "temp_bag_" + Date.now() }];
                                handleUpdateModalData(modalFuncionarios, updated);
                                setIsAddingBag(false);
                                setNewBagSub({
                                  situacao: "PR",
                                  etiqueta: "",
                                  pnr: "",
                                  vooOrigem: "",
                                  dataVoo: new Date().toLocaleDateString("pt-BR"),
                                  corTipo: "",
                                  observacoes: ""
                                });
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 cursor-pointer transition rounded-xs"
                            >
                              Salvar Bagagem
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingBag(false)}
                              className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 cursor-pointer transition rounded-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsAddingBag(true);
                            setIsAddingFunc(false);
                          }}
                          className="mt-3 bg-white text-slate-900 font-extrabold text-[12px] px-3.5 py-1.5 shadow-sm border border-slate-300 hover:bg-slate-50 transition cursor-pointer rounded-xs"
                        >
                          Adicionar Bagagem
                        </button>
                      )}
                    </fieldset>

                    {/* Operational Action Buttons alignment exactly like first print screen */}
                    <div className="pt-4 flex flex-col gap-3 text-left w-full max-w-xs select-none">
                      <button 
                        type="button"
                        onClick={handleModalGenerateAndDownload}
                        className="bg-white text-slate-950 font-extrabold text-[12px] px-4 py-2.5 shadow-xs border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer text-left w-full rounded-sm"
                      >
                        Gerar arquivo para envio
                      </button>
                      <button 
                        type="button"
                        onClick={handleModalClear}
                        className="bg-white text-slate-950 font-extrabold text-[12px] px-6 py-2 shadow-xs border border-slate-300 hover:bg-[#eaeaea] transition-all cursor-pointer text-center w-24 rounded-sm"
                      >
                        Limpar
                      </button>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="w-full max-w-4xl bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-fade-in text-left">
                  
                  {/* Fake spreadsheet application bar */}
                  <div className="bg-[#2a2c2e] px-4 py-3 flex items-center justify-between border-b border-[#3c4043] text-sm text-white font-sans shrink-0 select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 bg-[#107c41] rounded flex items-center justify-center text-[10px] font-black leading-none select-none text-white">
                        X
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-200 tracking-wide select-all">
                        {generatedCsvFilename || "sobras_latam.csv"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('email')}
                      className="bg-[#204a80] hover:bg-[#2b5d9c] text-white text-[10px] font-extrabold uppercase px-3 py-1.5 rounded transition tracking-wider border border-white/10"
                    >
                      PREVIEW HTML
                    </button>
                  </div>

                  {/* Operation spreadsheet view */}
                  <div className="overflow-x-auto max-w-full bg-white select-text">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
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
                        <tr className="bg-white border-b border-[#dadce0] text-slate-900 font-extrabold text-[11px] divide-x divide-[#dadce0]">
                          <td className="bg-[#f8f9fa] text-[#5f6368] font-normal text-center select-none py-2 border-r border-[#dadce0]">1</td>
                          <td className="px-3 py-2 bg-slate-50">DATA_LEITURA</td>
                          <td className="px-3 py-2 bg-slate-50">SITUACAO</td>
                          <td className="px-3 py-2 bg-slate-50">ETIQUETA</td>
                          <td className="px-3 py-2 bg-slate-50">RESERVA</td>
                          <td className="px-3 py-2 bg-slate-50">VOO_ORIGEM</td>
                          <td className="px-3 py-2 bg-slate-50">DATA_VOO_ORIGEM</td>
                          <td className="px-3 py-2 bg-slate-50">COR_TIPO</td>
                          <td className="px-3 py-2 bg-slate-50">OBSERVACAO</td>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dadce0]">
                        {modalBagagens.map((bag: Bagagem, index: number) => {
                          const rowNum = index + 2;
                          return (
                            <tr key={bag.id || index} className="hover:bg-blue-50/40 text-slate-800 text-[11px] divide-x divide-[#dadce0] transition">
                              <td className="bg-[#f8f9fa] text-[#5f6368] font-normal text-center select-none py-2 border-r border-[#dadce0] font-sans font-medium text-[10px] w-10 sticky left-0 z-10">
                                {rowNum}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-sans">
                                {formatarDataParaCsv(successInfo?.createdAt || new Date().toISOString())}
                              </td>
                              <td className="px-3 py-2 text-center font-bold font-sans">
                                {bag.situacao}
                              </td>
                              <td className="px-3 py-2 font-mono font-medium tracking-wide text-slate-900">
                                {bag.etiqueta || "-"}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">
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

                        {/* Signature bottom spreadsheet row */}
                        {(() => {
                          const sigRowNumber = modalBagagens.length + 2;
                          const userObj = modalFuncionarios[0] || activeUser;
                          const signatureString = `${userObj.nome} / ${userObj.matricula || "0"}`;
                          return (
                            <tr className="bg-slate-50 border-b border-[#dadce0] text-slate-800 text-[11px] divide-x divide-[#dadce0] transition font-bold font-sans">
                              <td className="bg-[#f8f9fa] text-[#5f6368] font-normal text-center select-none py-2 border-r border-[#dadce0] font-sans font-medium text-[10px] w-10 sticky left-0 z-10">
                                {sigRowNumber}
                              </td>
                              <td className="px-3 py-2 text-slate-500 font-sans font-normal">
                                {formatarDataParaCsv(successInfo?.createdAt || new Date().toISOString())}
                              </td>
                              <td className="px-3 py-2 text-center text-[#E31837] font-extrabold uppercase">
                                FC
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">0</td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">0</td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">0</td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">0</td>
                              <td className="px-3 py-2 text-center text-slate-400 font-medium font-mono">0</td>
                              <td className="px-3 py-2 text-slate-900 font-mono tracking-wide font-black text-right pr-4">
                                {signatureString}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
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
