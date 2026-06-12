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
  Play
} from "lucide-react";
import { Bagagem } from "../types";

export default function LerEtiqueta() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extracted OCR fields
  const [extractedData, setExtractedData] = useState<{
    bagTag: string;
    pnr: string;
    flight: string;
    corTipo: string;
    observacoes: string;
  } | null>(null);

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

  // Validation state
  const [validationResult, setValidationResult] = useState<{
    found: boolean;
    source: "baggages" | "processes" | "none";
    item?: any;
    processId?: string;
  } | null>(null);

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

  // Validation effect matching either tag code or reservation PNR against active bags and process history
  useEffect(() => {
    if (!extractedData) {
      setValidationResult(null);
      return;
    }
    const cleanTag = (extractedData.bagTag || "").replace(/\D/g, "").trim();
    const cleanPnr = (extractedData.pnr || "").trim().toUpperCase();

    if (!cleanTag && !cleanPnr) {
      setValidationResult(null);
      return;
    }

    // 1. Check in currently active bags
    const activeMatch = savedLists.find((b: any) => {
      const bTag = (b.etiqueta || "").replace(/\D/g, "").trim();
      const bPnr = (b.pnr || "").trim().toUpperCase();
      return (cleanTag && bTag === cleanTag) || (cleanPnr && bPnr === cleanPnr);
    });

    if (activeMatch) {
      setValidationResult({
        found: true,
        source: "baggages",
        item: activeMatch
      });
      return;
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
          setValidationResult({
            found: true,
            source: "processes",
            item: match,
            processId: proc.id
          });
          return;
        }
      }
    }

    setValidationResult({
      found: false,
      source: "none"
    });
  }, [extractedData?.bagTag, extractedData?.pnr, savedLists, processes]);

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

  // Start camera automatically if not already started
  useEffect(() => {
    startCamera();
  }, []);

  // Process selected or captured image
  const processImageBytes = async (base64String: string, mime: string) => {
    try {
      setLoading(true);
      setError(null);
      setExtractedData(null);

      // Phase 1 message
      setStatusMessage("Enviando imagem ao servidor...");
      
      const response = await apiFetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64String,
          mimeType: mime
        })
      });

      // Phase 2 message
      setStatusMessage("Analisando etiqueta com Inteligência Artificial...");

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro ao processar imagem.");
      }

      const parsedOcr = await response.json();

      setExtractedData({
        bagTag: parsedOcr.bagTag || "",
        pnr: parsedOcr.pnr || "",
        flight: parsedOcr.flight || "",
        corTipo: parsedOcr.cor_tipo || "",
        observacoes: ""
      });
      
      setStatusMessage("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao processar OCR.");
    } finally {
      setLoading(false);
    }
  };

  // Frame Capture from Live Stream
  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Match aspect ratios
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Draw current frame on canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Extract base64 jpeg
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        processImageBytes(dataUrl, "image/jpeg");
      }
    }
  };

  // File Upload Helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          processImageBytes(reader.result, file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Current Extracted Data to Saved List
  const handleSaveToStash = async () => {
    if (!extractedData) return;

    const newItem = {
      etiqueta: extractedData.bagTag,
      pnr: extractedData.pnr,
      vooOrigem: extractedData.flight,
      corTipo: extractedData.corTipo,
      situacao: "PR", // default standard
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      observacoes: extractedData.observacoes || ""
    };

    try {
      setLoading(true);
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setExtractedData(null);
        await fetchSavedBags();
        alert("Bagagem salva com sucesso e integrada à tabela principal de bagagens!");
      } else {
        alert("Erro ao salvar bagagem no servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar bagagem.");
    } finally {
      setLoading(false);
    }
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

          {/* DYNAMIC BACKUP API KEY INLINE SETTINGS */}
          {!apiKeyStatus.hasKey && (
            <div className="m-4 p-4.5 bg-slate-50 border border-slate-200 rounded-lg font-sans text-xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-2 w-full">
                  <p className="font-bold text-slate-800 text-sm">Inserir Chave do Gemini (Modo Navegador)</p>
                  <p className="text-slate-600 leading-relaxed">
                    Nenhuma chave de API foi detectada no painel de ambiente do servidor do Render (variável <code>GEMINI_API_KEY</code>). 
                    Para ler fotos reais e extrair etiquetas sem custos, insira sua chave do Google AI Studio abaixo:
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="password"
                      placeholder="Cole sua chave AI Studio api_key aqui..."
                      value={localApiKey}
                      onChange={(e) => handleSaveLocalKey(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs focus:ring-1 focus:ring-[#003087] outline-none"
                    />
                    {localApiKey && (
                      <button
                        onClick={() => handleSaveLocalKey("")}
                        className="text-xs text-red-600 hover:underline font-bold shrink-0 px-1"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Sua chave é salva apenas localmente no localStorage do seu próprio navegador e usada para fazer requests diretos de OCR de alta fidelidade à API livre do Gemini 3.5.
                  </p>
                </div>
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
          
          {/* PAINEL DE EDIÇÃO OCR ATUAL */}
          {extractedData && (
            <div id="ocr-current-result" className="bg-white border-2 border-[#003087] rounded-xl p-5 shadow-lg relative overflow-hidden animate-fade-in animate-duration-300">
              <div className="absolute right-0 top-0 bg-[#003087] text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-lg">
                Leitura Confirmada
              </div>

              <h4 className="font-extrabold text-[#003087] text-base mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E31837]" /> Revisar Dados Extraídos
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Número da Etiqueta (Bag Tag)*</label>
                  <input
                    type="text"
                    value={extractedData.bagTag}
                    onChange={(e) => setExtractedData({ ...extractedData, bagTag: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-widest text-[#003087] focus:ring-1 focus:ring-[#003087] outline-none"
                    placeholder="10 dígitos numéricos"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Normalmente de 10 dígitos (Ex: 0095123456)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Código da Reserva (PNR)*</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={extractedData.pnr}
                    onChange={(e) => setExtractedData({ ...extractedData, pnr: e.target.value.toUpperCase() })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-widest text-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none"
                    placeholder="6 alfanuméricos"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Voo</label>
                    <input
                      type="text"
                      value={extractedData.flight}
                      onChange={(e) => setExtractedData({ ...extractedData, flight: e.target.value.toUpperCase() })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-1 focus:ring-slate-400 outline-none"
                      placeholder="Ex: LA8070"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Cor / Tipo</label>
                    <input
                      type="text"
                      value={extractedData.corTipo}
                      onChange={(e) => setExtractedData({ ...extractedData, corTipo: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-slate-400 outline-none"
                      placeholder="Ex: Preta rodinha"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Observações</label>
                  <input
                    type="text"
                    value={extractedData.observacoes || ""}
                    onChange={(e) => setExtractedData({ ...extractedData, observacoes: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-slate-400 outline-none"
                    placeholder="Deixe em branco ou digite alguma informação..."
                  />
                </div>

                {/* VALIDATION MATCH BANNERS */}
                {validationResult?.found ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 space-y-1.5 animate-fade-in/10">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div className="text-left">
                        <p className="font-extrabold text-emerald-950 text-xs">✓ Etiqueta Encontrada no Banco Local!</p>
                        <p className="text-[11px] leading-relaxed mt-0.5 text-emerald-700">
                          Essa bagagem já está cadastrada no sistema em{" "}
                          <strong>
                            {validationResult.source === "baggages"
                              ? "Aberto (Tabela de Bagagens)"
                              : `Processo Finalizado (ID: ${validationResult.processId})`}
                          </strong>
                          .
                        </p>
                      </div>
                    </div>
                    
                    {/* Auto-fill button if values diverge */}
                    {(validationResult.item.vooOrigem !== extractedData.flight || validationResult.item.corTipo !== extractedData.corTipo || validationResult.item.etiqueta !== extractedData.bagTag || validationResult.item.pnr !== extractedData.pnr || (validationResult.item.observacoes || "") !== (extractedData.observacoes || "")) && (
                      <button
                        type="button"
                        onClick={() => {
                          setExtractedData({
                            bagTag: validationResult.item.etiqueta || extractedData.bagTag,
                            pnr: validationResult.item.pnr || extractedData.pnr,
                            flight: validationResult.item.vooOrigem || extractedData.flight,
                            corTipo: validationResult.item.corTipo || extractedData.corTipo,
                            observacoes: validationResult.item.observacoes || ""
                          });
                        }}
                        className="w-full text-center bg-white hover:bg-emerald-100/55 border border-emerald-300 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin animate-duration-3000" /> Auto-preencher com Dados do Banco
                      </button>
                    )}
                  </div>
                ) : validationResult?.found === false ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-start gap-2 animate-fade-in text-[11px]">
                    <Sparkles className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <p className="font-bold text-blue-950">Novo Registro Operacional</p>
                      <p className="mt-0.5 leading-relaxed text-blue-700">
                        Esta etiqueta de bagagem não foi cadastrada previamente no banco de dados local. Ao adicioná-la à fila, um novo registro será criado para controle de PIR.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* ACTION SUBMITS */}
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    id="btn-save-ocr-to-stash"
                    onClick={handleSaveToStash}
                    disabled={!extractedData.bagTag || !extractedData.pnr}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#003087] hover:bg-blue-800 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Adicionar à Fila
                  </button>
                  <button
                    id="btn-discard-ocr"
                    onClick={() => setExtractedData(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-lg"
                  >
                    Descartar
                  </button>
                </div>
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
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">Tag:</span>
                        <span className="text-[#003087] font-bold tracking-widest">{item.etiqueta}</span>
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
