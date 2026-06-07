import React, { useRef, useState, useEffect } from "react";
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extracted OCR fields
  const [extractedData, setExtractedData] = useState<{
    bagTag: string;
    pnr: string;
    flight: string;
    corTipo: string;
  } | null>(null);

  // Saved reads list loaded from database
  const [savedLists, setSavedLists] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSavedBags = async () => {
    try {
      const res = await fetch("/api/baggages");
      if (res.ok) {
        const data = await res.json();
        setSavedLists(data);
      }
    } catch (e) {
      console.error("Erro ao carregar bagagens:", e);
    }
  };

  // Load saved lists from database on mount
  useEffect(() => {
    fetchSavedBags();
  }, []);

  // Start Camera Stream
  const startCamera = async (currentFacing: "user" | "environment" = facingMode) => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: currentFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError("Não foi possível acessar a câmera. Certifique-se de que deu permissões ou utilize a opção de upload de arquivo.");
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Toggle Front/Rear Camera
  const toggleFacingMode = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (stream) {
      startCamera(newMode);
    }
  };

  // Start camera automatically if not already started
  useEffect(() => {
    startCamera();
    return () => {
      // Clean up stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Process selected or captured image
  const processImageBytes = async (base64String: string, mime: string) => {
    try {
      setLoading(true);
      setError(null);
      setExtractedData(null);

      // Phase 1 message
      setStatusMessage("Enviando imagem ao servidor...");
      
      const response = await fetch("/api/ocr", {
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
        corTipo: parsedOcr.cor_tipo || ""
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
      observacoes: "Adicionado via OCR automatizado"
    };

    try {
      setLoading(true);
      const res = await fetch("/api/baggages", {
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
    if (!window.confirm("Deseja realmente remover esta bagagem? Ela será movida para o Histórico e Lixeira.")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/baggages/${id}`, {
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
    if (window.confirm("Deseja realmente limpar toda a lista acumulada de leituras?")) {
      try {
        setLoading(true);
        for (const item of savedLists) {
          await fetch(`/api/baggages/${item.id}`, {
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
    }
  };

  return (
    <div className="space-y-8">
      {/* EXPLANATORY HEADER & INTRO */}
      <div id="ocr-instructions-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <div className="bg-[#003087]/10 p-3 rounded-lg text-[#003087] shrink-0">
          <Sparkles className="w-8 h-8 text-[#003087]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#003087]">Sistema de Captura OCR Multivolumes</h3>
          <p className="text-sm text-slate-600 mt-1">
            Utilize a webcam ou câmera traseira de seu smartphone corporativo para analisar as etiquetas de bagagem (Bag-tag).
            O sistema extrai automaticamente o **Bag-Tag de 10 dígitos**, o código da reserva **PNR de 6 caracteres**, e o **Voo**. 
            As leituras são acumuladas abaixo para que você gere um único lote consolidado no formulário.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VIEWPORT DA CÂMERA E CONTROLES (7 COLUMNS) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-[#003087]/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#003087]" />
              <span className="font-bold text-slate-800 text-sm">Câmera em Tempo Real</span>
            </div>
            
            <div className="flex items-center gap-2">
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
          <div className="relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
            {stream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
              />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm">A câmera está desativada</p>
                <button 
                  onClick={() => startCamera()}
                  className="mt-3 inline-flex items-center gap-1.5 bg-[#003087] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" /> Ativar Câmera
                </button>
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

              {stream && (
                <button
                  id="btn-switch-camera"
                  onClick={toggleFacingMode}
                  className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700"
                  title="Alternar Câmera (Frontal / Traseira)"
                >
                  <RefreshCw className="w-4 h-4" />
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

          {/* EXPLICIT WORKER ERROR WARNINGS */}
          {error && (
            <div className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Aviso Operacional</p>
                <p className="mt-0.5">{error}</p>
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
