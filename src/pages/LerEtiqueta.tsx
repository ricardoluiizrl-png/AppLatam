import React, { useRef, useState, useEffect } from "react";
import { apiFetch, getActiveGeminiKeyStatus } from "../utils/mockApi";
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  Check, 
  Trash2, 
  FileCheck, 
  AlertTriangle,
  Sparkles,
  Layers,
  StopCircle,
  Play,
  X
} from "lucide-react";
import { Bagagem, SITUACOES, SituacaoType } from "../types";

export interface PendingItem {
  id: string;
  fileName: string;
  loading: boolean;
  error?: string | null;
  bagTag: string;
  pnr: string;
  flight: string;
  corTipo: string;
  observacoes: string;
  situacao?: SituacaoType;
  isQuotaSimulated?: boolean;
}

export default function LerEtiqueta() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isQuotaSimulated, setIsQuotaSimulated] = useState(false);

  // List of pending scanned tags to be previewed/edited
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // Client-side Gemini API key state for static servers (like Netlify)
  const [localApiKey, setLocalApiKey] = useState(localStorage.getItem("client_gemini_api_key") || "");
  const [apiKeyStatus, setApiKeyStatus] = useState({ hasKey: false, source: "none" as "localStorage" | "env" | "none" });

  const handleSaveLocalKey = (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem("client_gemini_api_key", trimmed);
      setLocalApiKey(trimmed);
    } else {
      localStorage.removeItem("client_gemini_api_key");
      setLocalApiKey("");
    }
  };

  // Saved reads list loaded from database
  const [savedLists, setSavedLists] = useState<any[]>([]);
  // Completed processes (histórico) from DB for validation and enrichment
  const [processes, setProcesses] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSavedBags = async () => {
    try {
      const res = await apiFetch("/api/baggages");
      if (res.ok) {
        const data = await res.json();
        setSavedLists(data);
      }
    } catch (e) {
      console.error("Erro ao carregar bagagens:", e);
    }
  };

  const fetchProcesses = async () => {
    try {
      const res = await apiFetch("/api/processes");
      if (res.ok) {
        const data = await res.json();
        setProcesses(data);
      }
    } catch (e) {
      console.error("Erro ao carregar processos:", e);
    }
  };

  // Load saved lists and processes from database on mount, check API key status
  useEffect(() => {
    fetchSavedBags();
    fetchProcesses();
    setApiKeyStatus(getActiveGeminiKeyStatus());
  }, [localApiKey]);

  // High-precision automatic validation function per scanned item (dynamically checked)
  const checkValidation = (bagTag?: string, pnr?: string) => {
    const cleanTag = (bagTag || "").replace(/\D/g, "").trim();
    const cleanPnr = (pnr || "").trim().toUpperCase();

    if (!cleanTag && !cleanPnr) {
      return null;
    }

    // 1. Check in currently active bags
    const activeMatch = savedLists.find((b: any) => {
      const bTag = (b.etiqueta || "").replace(/\D/g, "").trim();
      const bPnr = (b.pnr || "").trim().toUpperCase();
      return (cleanTag && bTag === cleanTag) || (cleanPnr && bPnr === cleanPnr);
    });

    if (activeMatch) {
      return {
        found: true,
        source: "baggages" as const,
        item: activeMatch
      };
    }

    // 2. Check in historical processes
    for (const proc of processes) {
      if (Array.isArray(proc.bagagens)) {
        const match = proc.bagagens.find((b: any) => {
          const bTag = (b.etiqueta || "").replace(/\D/g, "").trim();
          const bPnr = (b.pnr || "").trim().toUpperCase();
          return (cleanTag && bTag === cleanTag) || (cleanPnr && bPnr === cleanPnr);
        });

        if (match) {
          return {
            found: true,
            source: "processes" as const,
            item: match,
            processId: proc.id
          };
        }
      }
    }

    return {
      found: false,
      source: "none" as const
    };
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Seu navegador ou o ambiente de visualização atual (como IFrame ou site sem HTTPS seguro) não suporta acesso direto à câmera.");
      }

      let mediaStream: MediaStream | null = null;
      let lastError: any = null;

      // Nível 1: Câmera traseira ideal com resoluções específicas
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1.7777777778 }
          },
          audio: false
        });
      } catch (err) {
        console.warn("Falha no nível 1 (Câmera traseira ideal):", err);
        lastError = err;
      }

      // Nível 2: Câmera traseira genérica com resoluções recomendadas
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: { ideal: 1.7777777778 }
            },
            audio: false
          });
        } catch (err) {
          console.warn("Falha no nível 2 (Câmera traseira sem exact):", err);
          lastError = err;
        }
      }

      // Nível 3: Câmera traseira básica sem limitações de resolução (evita OverconstrainedError em aparelhos antigos)
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment"
            },
            audio: false
          });
        } catch (err) {
          console.warn("Falha no nível 3 (Câmera traseira básica):", err);
          lastError = err;
        }
      }

      // Nível 4: Qualquer sensor de vídeo do sistema (evita falhas completas se houver apenas câmera frontal ou restrições graves)
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err) {
          console.warn("Falha no nível 4 (Qualquer câmera geral):", err);
          lastError = err;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error("Nenhum fluxo de vídeo pôde ser iniciado.");
      }

      setStream(mediaStream);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError(
        err.message || 
        "Não foi possível acessar a câmera do dispositivo. Certifique-se de que o site utiliza conexão segura (HTTPS), concedeu permissões para a câmera nas configurações do navegador ou use a opção 'Enviar Arquivo / Imagem' logo abaixo."
      );
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Effect to assign the camera stream to the video element and handle state cleanup on changes/unmount
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Forçar ativação explícita de vídeo em dispositivos móveis (muito importante para iPhones/iOS Safari)
      video.onloadedmetadata = () => {
        video.play()
          .then(() => console.log("Câmera reproduzida com sucesso via API play()"))
          .catch(e => {
            console.error("Falha ao dar play automático, tentando segunda tentativa de acionamento:", e);
            video.play().catch(pErr => console.error("Falha secundária de reprodução:", pErr));
          });
      };
    }

    return () => {
      // Quando o stream mudar ou o componente desmontar, encerra as tracks passadas
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log("Track de câmera interrompida no cleanup:", track.label);
        });
      }
    };
  }, [stream]);

  // We do NOT start the camera automatically anymore, preventing mobile Safari/Chrome from blocking camera permissions on page mount.
  // Instead, the user activates the camera cleanly on gesture (by pressing the "Ativar Câmera" button).
  useEffect(() => {
    // Only fetch saved states on mount
    setIsQuotaSimulated(false);
  }, []);

  // Process selected or captured image
  const processSingleImage = async (tempId: string, base64String: string, mime: string) => {
    try {
      const response = await apiFetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64String,
          mimeType: mime
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro ao processar imagem.");
      }

      const parsedOcr = await response.json();

      setPendingItems(prev => prev.map(item => {
        if (item.id === tempId) {
          return {
            ...item,
            loading: false,
            bagTag: parsedOcr.bagTag || "",
            pnr: parsedOcr.pnr || "",
            flight: parsedOcr.flight || parsedOcr.flightCode || "",
            corTipo: parsedOcr.cor_tipo || parsedOcr.corTipo || "",
            situacao: parsedOcr.situacao || "PR",
            isQuotaSimulated: parsedOcr.quotaFallbackActive || false,
            error: null
          };
        }
        return item;
      }));

      if (parsedOcr.quotaFallbackActive) {
        setIsQuotaSimulated(true);
      }
    } catch (err: any) {
      console.error(err);
      const errStr = (err.message || "").toLowerCase();
      let customErr = err.message || "Erro desconhecido ao processar OCR.";
      if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("exceeded")) {
        customErr = "Cota Excedida. Ative sua chave do Gemini para digitalização real.";
        setIsQuotaSimulated(true);
      }
      setPendingItems(prev => prev.map(item => {
        if (item.id === tempId) {
          return {
            ...item,
            loading: false,
            error: customErr
          };
        }
        return item;
      }));
    }
  };

  // Frame Capture from Live Stream
  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const tempId = Math.random().toString(36).substring(2, 9);
        const fileName = `Foto ${new Date().toLocaleTimeString("pt-BR")}`;

        const newItem: PendingItem = {
          id: tempId,
          fileName,
          loading: true,
          bagTag: "",
          pnr: "",
          flight: "",
          corTipo: "",
          observacoes: "",
          situacao: "PR"
        };

        setPendingItems(prev => [newItem, ...prev]);
        processSingleImage(tempId, dataUrl, "image/jpeg");
      }
    }
  };

  // File Upload Helper (supports MULTIPLE files!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: any) => {
        const reader = new FileReader();
        const tempId = Math.random().toString(36).substring(2, 9);

        const newItem: PendingItem = {
          id: tempId,
          fileName: file.name,
          loading: true,
          bagTag: "",
          pnr: "",
          flight: "",
          corTipo: "",
          observacoes: "",
          situacao: "PR"
        };

        setPendingItems(prev => [newItem, ...prev]);

        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            processSingleImage(tempId, reader.result, file.type);
          }
        };
        reader.readAsDataURL(file);
      });
      // Clear input so same files can be re-selected
      e.target.value = "";
    }
  };

  // Save specific item from the pending list to the stash database
  const handleSaveToStash = async (item: PendingItem) => {
    if (!item.bagTag || !item.pnr) return;

    const newItem = {
      etiqueta: item.bagTag,
      pnr: item.pnr,
      vooOrigem: item.flight,
      corTipo: item.corTipo,
      situacao: item.situacao || "PR",
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      observacoes: item.observacoes || ""
    };

    try {
      setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, loading: true } : pi));
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setPendingItems(prev => prev.filter(pi => pi.id !== item.id));
        await fetchSavedBags();
      } else {
        alert("Erro ao salvar bagagem.");
        setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, loading: false } : pi));
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar bagagem.");
      setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, loading: false } : pi));
    }
  };

  // Save all completed and valid items to the database
  const handleSaveAllToStash = async () => {
    const validItems = pendingItems.filter(p => !p.loading && !p.error && p.bagTag && p.pnr);
    if (validItems.length === 0) return;

    try {
      // Show screen spinner
      setLoading(true);
      const promises = validItems.map(async (item) => {
        const newItem = {
          etiqueta: item.bagTag,
          pnr: item.pnr,
          vooOrigem: item.flight,
          corTipo: item.corTipo,
          situacao: item.situacao || "PR",
          dataVoo: new Date().toLocaleDateString("pt-BR"),
          observacoes: item.observacoes || ""
        };

        const res = await apiFetch("/api/baggages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
        });
        return { id: item.id, ok: res.ok };
      });

      const results = await Promise.all(promises);
      const successfulIds = results.filter(r => r.ok).map(r => r.id);

      setPendingItems(prev => prev.filter(pi => !successfulIds.includes(pi.id)));
      await fetchSavedBags();
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar todas as bagagens.");
    } finally {
      setLoading(false);
    }
  };

  // Discard individual pending scanned card
  const handleDiscardPending = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  // Remove individual item from OCR queue
  const handleRemoveFromStash = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/baggages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true })
      });
      if (res.ok) {
        await fetchSavedBags();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Clear entire OCR stash
  const handleClearStash = async () => {
    try {
      setLoading(true);
      for (const item of savedLists) {
        await apiFetch(`/api/baggages/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleted: true })
        });
      }
      await fetchSavedBags();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VIEWPORT DA CÂMERA E CONTROLES (7 COLUMNS) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-[#003087]/5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#003087]" />
              <span className="font-bold text-slate-800 text-sm">Câmera em Tempo Real</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {apiKeyStatus.hasKey ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm" title={apiKeyStatus.source === "env" ? "Chave configurada nas variáveis de ambiente do Render/Servidor" : "Chave de fallback configurada no cache local"}>
                  <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                  OCR Real Ativo (Gemini Vision)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200" title="Nenhuma chave do Gemini foi encontrada. Usando OCR simulado de testes.">
                  <AlertTriangle className="w-3" />
                  OCR Simulado (Sem Chave)
                </span>
              )}

              {stream ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  Vídeo Ativo
                </span>
              ) : (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  Inativo
                </span>
              )}
            </div>
          </div>

          {/* VIEWPORT BOX */}
          <div className="relative bg-slate-950 aspect-[9/16] lg:aspect-video flex items-center justify-center overflow-hidden">
            {stream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-slate-400 max-w-sm">
                <div className="relative inline-block mb-3">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Câmera Pronta para Uso</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Para começar, ative o vídeo do dispositivo para capturar fotos em tempo real ou envie um arquivo de imagem da etiqueta.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                  <button 
                    onClick={() => startCamera()}
                    className="inline-flex items-center justify-center gap-1 bg-[#003087] hover:bg-blue-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Iniciar Câmera
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1 bg-[#E31837] hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3 h-3" /> Enviar Imagem
                  </button>
                </div>
              </div>
            )}

            {/* FLOATING STATUS MESSAGE */}
            {loading && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-center p-6 z-20">
                <RefreshCw className="w-10 h-10 text-[#E31837] animate-spin mb-4" />
                <p className="text-white font-bold text-base animate-pulse">
                  {statusMessage || "Processando etiqueta..."}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Isto pode levar alguns segundos, por favor aguarde.
                </p>
              </div>
            )}

            {/* SCANNING LINE OVERLAY */}
            {stream && !loading && (
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/80 shadow-[0_0_8px_#ef4444] animate-bounce z-10"></div>
            )}
          </div>

          {/* SYSTEM INTERACTIVE LIGHT BUTTONS */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              {stream ? (
                <>
                  <button
                    id="btn-trigger-capture"
                    onClick={captureFrame}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-[#E31837] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" /> Capturar Foto
                  </button>
                  <button
                    id="btn-stop-camera"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold px-3 py-2.5 rounded-lg"
                  >
                    <StopCircle className="w-4 h-4 text-slate-600" /> Parar
                  </button>
                </>
              ) : (
                <button
                  id="btn-restart-camera"
                  onClick={() => startCamera()}
                  className="inline-flex items-center gap-1.5 bg-[#003087] hover:bg-blue-800 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow"
                >
                  <RefreshCw className="w-4 h-4" /> Iniciar Câmera
                </button>
              )}
            </div>

            {/* SEPARATE DIRECT FILE UPLOAD */}
            <div className="w-full sm:w-auto text-right mt-3 sm:mt-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                id="btn-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-slate-500" /> Enviar Arquivo / Imagem
              </button>
            </div>
          </div>

          {/* ALWAYS AVAILABLE API KEY SETTINGS */}
          {isQuotaSimulated && (
            <div className="m-4 p-4.5 bg-slate-50 border border-slate-200 rounded-lg font-sans text-xs animate-fade-in animate-duration-300">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-[#003087] shrink-0 mt-0.5" />
                <div className="space-y-2 w-full">
                  <p className="font-bold text-slate-800 text-sm flex items-center justify-between flex-wrap gap-1">
                    <span>Chave de API do Gemini (Modo Autônomo)</span>
                    {apiKeyStatus.source === "localStorage" ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        Chave Própria Ativa
                      </span>
                    ) : apiKeyStatus.source === "env" ? (
                      <span className="text-[10px] bg-blue-100 text-[#003087] px-1.5 py-0.5 rounded font-bold">
                        Usando Chave Padrão
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                        Sem Chave (OCR Simulado)
                      </span>
                    )}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Para evitar limites de cota da chave padrão do servidor ou garantir 150% de velocidade e autonomia nas leituras por IA, você pode colar sua chave pessoal gratuita do <strong>Google AI Studio</strong> abaixo:
                  </p>
                  <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input
                      type="password"
                      placeholder="Cole sua chave AI Studio api_key aqui..."
                      value={localApiKey}
                      onChange={(e) => handleSaveLocalKey(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs focus:ring-1 focus:ring-[#003087] outline-none min-w-[200px]"
                    />
                    {localApiKey && (
                      <button
                        type="button"
                        onClick={() => handleSaveLocalKey("")}
                        className="text-xs text-red-600 hover:underline font-bold shrink-0 px-2 py-1.5 hover:text-red-800"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsQuotaSimulated(false)}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg shadow-sm transition cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" /> Salvar e Ocultar
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Sua chave é salva apenas localmente no localStorage do seu navegador e enviada diretamente para realizar OCR de alta precisão. Obtenha uma chave gratuita em <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">aistudio.google.com</a>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QUOTA SIMULATED WARNING BANNER */}
          {isQuotaSimulated && (
            <div className="m-4 p-4 bg-sky-50 border border-sky-200 rounded-lg flex gap-3 text-sky-900 shadow-sm animate-fade-in/10">
              <Sparkles className="w-5 h-5 shrink-0 text-amber-500 animate-pulse mt-0.5" />
              <div className="text-xs w-full leading-relaxed">
                <p className="font-extrabold text-[#003087]">Modo de Simulação Inteligente Ativo</p>
                <p className="mt-0.5 text-slate-700">
                  Como o limite de testes do servidor foi esgotado (Erro 429), o sistema <strong>gerou dados simulados válidos do aeroporto</strong> automaticamente para que você possa continuar testando todo o fluxo de ponta a ponta sem interrupções!
                </p>
                <p className="mt-2 text-[10px] text-[#003087] font-semibold">
                  Dica: Para digitalizar etiquetas e malas reais usando IA real sem limites, você pode criar uma chave gratuita em <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold hover:text-blue-800">aistudio.google.com</a> e colá-la no painel logo acima.
                </p>
              </div>
            </div>
          )}

          {/* EXPLICIT WORKER ERROR WARNINGS */}
          {error && (
            <div className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs w-full">
                <p className="font-bold">Aviso Operacional</p>
                <p className="mt-0.5">{error}</p>
                <p className="mt-2 text-[10px] text-amber-600 font-semibold leading-normal">
                  Dica: Se você implantou no Render como um site estático, todos os requests backend ao servidor retornarão 404, acionando o fallback local. Cole acima sua chave gratuita obter OCR real instantâneo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RESULTADO DA LEITURA ATUAL & FILA (5 COLUMNS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* LIST OF PENDING EXTRACTED ITEMS */}
          {pendingItems.length > 0 && (
            <div id="ocr-pending-results" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-[#003087] text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E31837]" /> Etiquetas Digitalizadas ({pendingItems.length})
                </h4>
                {pendingItems.filter(p => !p.loading && !p.error && p.bagTag && p.pnr).length > 1 && (
                  <button
                    onClick={handleSaveAllToStash}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Salvar Todas Válidas
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {pendingItems.map((item) => {
                  const valResult = checkValidation(item.bagTag, item.pnr);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="bg-white border-2 border-slate-200 hover:border-[#003087] rounded-xl p-4 shadow-sm relative overflow-hidden transition-colors"
                    >
                      {/* CARD HEADER */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.loading ? (
                            <RefreshCw className="w-3.5 h-3.5 text-[#E31837] animate-spin shrink-0" />
                          ) : item.error ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="font-bold text-xs text-slate-700 truncate block max-w-[200px]" title={item.fileName}>
                            {item.fileName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDiscardPending(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-50 transition"
                          title="Descartar este item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {item.loading ? (
                        <div className="py-6 text-center space-y-2">
                          <RefreshCw className="w-6 h-6 text-[#003087] animate-spin mx-auto" />
                          <p className="text-xs text-slate-500 font-semibold animate-pulse">Lendo etiqueta com IA...</p>
                        </div>
                      ) : item.error ? (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-800 text-[11px] text-left mb-2">
                          <p className="font-bold">Falha no Escaneamento</p>
                          <p className="mt-0.5 text-slate-600 leading-normal">{item.error}</p>
                        </div>
                      ) : null}

                      {/* CARD FORM */}
                      {!item.loading && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Número da Etiqueta (Bag Tag)*</label>
                            <input
                              type="text"
                              value={item.bagTag}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, bagTag: e.target.value } : pi))}
                              className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider text-[#003087] focus:ring-1 focus:ring-[#003087] outline-none"
                              placeholder="10 dígitos numéricos"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Código da Reserva (PNR)*</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={item.pnr}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, pnr: e.target.value.toUpperCase() } : pi))}
                              className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider text-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none"
                              placeholder="6 alfanuméricos"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Situação *</label>
                            <select
                              value={item.situacao || "PR"}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, situacao: e.target.value as SituacaoType } : pi))}
                              className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-1 focus:ring-[#003087] outline-none border-slate-300"
                            >
                              {Object.entries(SITUACOES).map(([code, config]) => (
                                <option key={code} value={code}>
                                  {config.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Voo</label>
                              <input
                                type="text"
                                value={item.flight}
                                onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, flight: e.target.value.toUpperCase() } : pi))}
                                className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono focus:ring-1 focus:ring-slate-400 outline-none"
                                placeholder="Ex: LA8070"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Cor / Tipo</label>
                              <input
                                type="text"
                                value={item.corTipo}
                                onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, corTipo: e.target.value } : pi))}
                                className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-slate-400 outline-none"
                                placeholder="Ex: Preta rodinha"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Observações</label>
                            <input
                              type="text"
                              value={item.observacoes || ""}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, observacoes: e.target.value } : pi))}
                              className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-slate-400 outline-none"
                              placeholder="Digite alguma observação..."
                            />
                          </div>

                          {/* VALIDATION MATCH BANNERS */}
                          {valResult?.found ? (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 space-y-1.5 text-left">
                              <div className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
                                <div>
                                  <p className="font-extrabold text-emerald-950 text-[11px]">✓ Já Cadastrado!</p>
                                  <p className="text-[10px] leading-relaxed text-emerald-700 mt-0.5">
                                    Encontrado em: <strong>{valResult.source === "baggages" ? "Bagagens Ativas" : `Processo Finalizado (ID: ${valResult.processId})`}</strong>.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Auto-fill button */}
                              {(valResult.item.vooOrigem !== item.flight || valResult.item.corTipo !== item.corTipo || valResult.item.etiqueta !== item.bagTag || valResult.item.pnr !== item.pnr || (valResult.item.observacoes || "") !== (item.observacoes || "")) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingItems(prev => prev.map(pi => pi.id === item.id ? {
                                      ...pi,
                                      bagTag: valResult.item.etiqueta || pi.bagTag,
                                      pnr: valResult.item.pnr || pi.pnr,
                                      flight: valResult.item.vooOrigem || pi.flight,
                                      corTipo: valResult.item.corTipo || pi.corTipo,
                                      observacoes: valResult.item.observacoes || ""
                                    } : pi));
                                  }}
                                  className="w-full text-center bg-white hover:bg-emerald-100/40 border border-emerald-200 text-emerald-800 font-bold text-[10px] py-1 rounded flex items-center justify-center gap-1 cursor-pointer transition"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" /> Auto-preencher
                                </button>
                              )}
                            </div>
                          ) : valResult?.found === false ? (
                            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 flex items-start gap-1.5 text-left text-[10px]">
                              <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-600 mt-0.5" />
                              <div>
                                <p className="font-bold text-blue-950">Novo Registro</p>
                                <p className="leading-relaxed text-blue-700 mt-0.5">Essa etiqueta não existe no banco de dados local.</p>
                              </div>
                            </div>
                          ) : null}

                          {/* ACTION BUTTON */}
                          <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                              onClick={() => handleSaveToStash(item)}
                              disabled={!item.bagTag || !item.pnr}
                              className="flex-1 inline-flex items-center justify-center gap-1 bg-[#003087] hover:bg-blue-800 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm disabled:opacity-50 transition cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Adicionar à Fila de Espera
                            </button>
                            <button
                              onClick={() => handleDiscardPending(item.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer"
                            >
                              Descartar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LOCAL ACCUMULATED QUEUE (FILA DE ETIQUETAS SALVAS) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#E31837]" />
                <h4 className="font-extrabold text-slate-800 text-sm">
                  Fila de Etiquetas Salvas ({savedLists.length})
                </h4>
              </div>
              {savedLists.length > 0 && (
                <button
                  id="btn-clear-ocr-stash"
                  onClick={handleClearStash}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar Fila
                </button>
              )}
            </div>

            {/* STASH LIST LOGS */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {savedLists.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Nenhuma etiqueta na fila no momento.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Escaneie um código ou envie um arquivo para acumular dados para o formulário.</p>
                </div>
              ) : (
                savedLists.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="font-mono space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-800">Tag:</span>
                        <span className="text-[#003087] font-bold tracking-widest">{item.etiqueta}</span>
                        {item.situacao && SITUACOES[item.situacao as SituacaoType] && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${SITUACOES[item.situacao as SituacaoType].bg}`}>
                            {SITUACOES[item.situacao as SituacaoType].label}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4">
                        <p><span className="text-slate-400 font-sans">Reserva (PNR):</span> <strong className="text-[#E31837] tracking-wider">{item.pnr}</strong></p>
                        <p><span className="text-slate-400 font-sans">Voo:</span> <strong>{item.vooOrigem || "-"}</strong></p>
                      </div>
                      {item.corTipo && (
                        <p className="text-[10px] text-slate-500 font-sans">
                          <span className="font-semibold">Mala:</span> {item.corTipo}
                        </p>
                      )}
                    </div>
                    <button
                      id={`btn-remove-stash-${item.id}`}
                      onClick={() => handleRemoveFromStash(item.id)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition"
                      title="Excluir desta fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {savedLists.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-lg border">
                <p className="text-[11px] text-slate-600 mb-2">
                  💡 <strong>Excelente!</strong> Estas etiquetas prontas serão carregadas no painel da aba <strong>Novo Processo</strong>. Você poderá adicioná-las juntas com apenas 1 clique!
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* CANVAS HELPER FOR SCREENSHOT GENERATION */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
