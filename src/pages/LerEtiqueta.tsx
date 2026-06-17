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
  X,
  Settings,
  Key,
  Eye,
  EyeOff
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

const compressImage = (base64Str: string, maxDimension = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

export default function LerEtiqueta() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isQuotaSimulated, setIsQuotaSimulated] = useState(false);

  // List of pending scanned tags to be previewed/edited
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // NEW: Interactive Input & Text Copy-Pasting Methods for 100% precision from online sites
  const [activeTab, setActiveTab] = useState<"camera" | "paste" | "manual">("camera");
  const [pastedText, setPastedText] = useState("");
  const [extractedFields, setExtractedFields] = useState({
    bagTag: "",
    pnr: "",
    flight: "",
    corTipo: "",
    situacao: "PR" as SituacaoType,
    observacoes: ""
  });
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractTextError, setExtractTextError] = useState<string | null>(null);

  // Manual Form temporary state
  const [manualForm, setManualForm] = useState({
    bagTag: "",
    pnr: "",
    flight: "",
    corTipo: "",
    situacao: "PR" as SituacaoType,
    observacoes: ""
  });

  const [apiKeyStatus, setApiKeyStatus] = useState({
    hasKey: false,
    source: "none" as "localStorage" | "env" | "none",
    provider: "gemini" as "gemini",
    geminiKey: ""
  });

  const [manualKeyInput, setManualKeyInput] = useState("");
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testKeySuccess, setTestKeySuccess] = useState<string | null>(null);
  const [testKeyError, setTestKeyError] = useState<string | null>(null);

  // Saved reads list loaded from database
  const [savedLists, setSavedLists] = useState<any[]>([]);
  // Completed processes (histórico) from DB for validation and enrichment
  const [processes, setProcesses] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

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
    const status = getActiveGeminiKeyStatus();
    setApiKeyStatus(status);
    setManualKeyInput(status.geminiKey || "");
  }, []);

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

  // Handle API Key Management
  const handleSaveKey = () => {
    setTestKeySuccess(null);
    setTestKeyError(null);
    const key = manualKeyInput.trim();
    if (!key) {
      alert("Por favor, digite uma chave de API válida do Gemini.");
      return;
    }
    localStorage.setItem("client_gemini_api_key", key);
    const status = getActiveGeminiKeyStatus();
    setApiKeyStatus(status);
    alert("Chave do Gemini gravada com sucesso localmente!");
  };

  const handleClearKey = () => {
    setTestKeySuccess(null);
    setTestKeyError(null);
    localStorage.removeItem("client_gemini_api_key");
    setManualKeyInput("");
    const status = getActiveGeminiKeyStatus();
    setApiKeyStatus(status);
    alert("Chave manual removida!");
  };

  const handleTestKey = async () => {
    const key = manualKeyInput.trim();
    if (!key) {
      setTestKeyError("Digite uma chave para testar.");
      setTestKeySuccess(null);
      return;
    }

    setIsTestingKey(true);
    setTestKeySuccess(null);
    setTestKeyError(null);

    try {
      const response = await apiFetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestKeySuccess("Conexão efetuada com sucesso! Chave de API ativa e funcional.");
      } else {
        setTestKeyError(data.error || "Erro ao testar chave de API.");
      }
    } catch (err: any) {
      setTestKeyError(err.message || "Erro de conexão ao servidor de homologação da chave.");
    } finally {
      setIsTestingKey(false);
    }
  };

  // --- NEW WORKFLOW FUNCTIONS FOR ONLINE TEXT EXTRACTION & MANUAL SUBMISSION ---
  const parseTextRegex = (text: string) => {
    const fields = {
      bagTag: "",
      pnr: "",
      flight: "",
      corTipo: "",
      situacao: "PR" as SituacaoType,
      observacoes: ""
    };

    if (!text.trim()) {
      setExtractedFields(fields);
      return;
    }

    // 1. Número de Etiqueta (Bag Tag - 10 dígitos decimais sequenciais)
    const digitsOnlyMatch = text.match(/\b\d{10}\b/);
    if (digitsOnlyMatch) {
      fields.bagTag = digitsOnlyMatch[0];
    } else {
      // Caso o usuário tenha copiado 9 dígitos iniciando com 95 ou similar (comum em comprovantes da LATAM)
      const tagMatch9 = text.match(/\b\d{9}\b/);
      if (tagMatch9) {
        fields.bagTag = "0" + tagMatch9[0];
      } else {
        const complexMatch = text.match(/(bag|etiqueta|tag|mala|bagagem|vol)[^\d]*(\d{9,10})/i);
        if (complexMatch) {
          let tag = complexMatch[2];
          if (tag.length === 9) tag = "0" + tag;
          fields.bagTag = tag;
        }
      }
    }

    // 2. Localizador de Reserva PNR (exatamente 6 caracteres alfanuméricos)
    const pnrKeywords = /(pnr|reserva|localizador|locator|loc|record|bkg|booking)[^\w]*([A-Z0-9]{6})\b/i;
    const pnrMatch = text.match(pnrKeywords);
    if (pnrMatch && pnrMatch[2] && !/^(la|jj|g3|ad|ar|cm)/i.test(pnrMatch[2])) {
      fields.pnr = pnrMatch[2].toUpperCase();
    } else {
      const potentialPnrs = text.match(/\b[A-Z0-9]{6}\b/gi) || [];
      const validCandidate = potentialPnrs.find((candidate) => {
        const hasLetters = /[A-Z]/i.test(candidate);
        const hasDigits = /[0-9]/.test(candidate);
        const isFlightCode = /^(LA|JJ|G3|AD|AR|CM)/i.test(candidate);
        return hasLetters && hasDigits && !isFlightCode;
      });
      if (validCandidate) {
        fields.pnr = validCandidate.toUpperCase();
      }
    }

    // 3. Número do Voo
    const flightMatch = text.match(/\b(LA|JJ|G3|AD|AR|CM)\s*(\d{3,4})\b/i);
    if (flightMatch) {
      fields.flight = (flightMatch[1] + flightMatch[2]).toUpperCase();
    }

    // 4. Cor / Tipo de Mala
    const colors = ["preta", "preto", "azul", "vermelha", "vermelho", "rosa", "verde", "amarela", "amarelo", "cinza", "branca", "branco", "marrom", "rígida", "mochila", "sacola"];
    const foundWords: string[] = [];
    const lowerText = text.toLowerCase();
    colors.forEach(col => {
      if (lowerText.includes(col)) {
        foundWords.push(col);
      }
    });
    if (foundWords.length > 0) {
      fields.corTipo = foundWords.join(" / ");
    }

    setExtractedFields(fields);
  };

  const handleAITextExtraction = async () => {
    if (!pastedText.trim()) return;
    setIsExtractingText(true);
    setExtractTextError(null);

    try {
      const activeConf = getActiveGeminiKeyStatus();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-ai-provider": "gemini"
      };

      const activeKey = activeConf.geminiKey;
      if (activeKey) {
        headers["x-api-key"] = activeKey;
        headers["x-gemini-api-key"] = activeKey;
      }

      const response = await apiFetch("/api/ocr-text", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: pastedText })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Erro ao processar texto com IA.");
      }

      const parsed = await response.json();
      setExtractedFields({
        bagTag: parsed.bagTag || "",
        pnr: parsed.pnr || "",
        flight: parsed.flight || parsed.flightCode || "",
        corTipo: parsed.cor_tipo || parsed.corTipo || "",
        situacao: "PR",
        observacoes: ""
      });
    } catch (err: any) {
      console.error(err);
      setExtractTextError(err.message || "Erro na conexão com IA de texto.");
    } finally {
      setIsExtractingText(false);
    }
  };

  const saveExtractedToStash = async () => {
    if (!extractedFields.bagTag || !extractedFields.pnr) {
      alert("Por favor insira ao menos o número da etiqueta e o PNR.");
      return;
    }

    const newItem = {
      etiqueta: extractedFields.bagTag,
      pnr: extractedFields.pnr,
      vooOrigem: extractedFields.flight,
      corTipo: extractedFields.corTipo,
      situacao: extractedFields.situacao || "PR",
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      observacoes: extractedFields.observacoes || ""
    };

    try {
      setLoading(true);
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setPastedText("");
        setExtractedFields({
          bagTag: "",
          pnr: "",
          flight: "",
          corTipo: "",
          situacao: "PR",
          observacoes: ""
        });
        await fetchSavedBags();
      } else {
        alert("Erro ao salvar bagagem extraída.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar bagagem.");
    } finally {
      setLoading(false);
    }
  };

  const saveManualToStash = async () => {
    if (!manualForm.bagTag || !manualForm.pnr) {
      alert("Por favor preencha os campos obrigatórios (Etiqueta de Mala e Localizador PNR).");
      return;
    }

    const newItem = {
      etiqueta: manualForm.bagTag,
      pnr: manualForm.pnr,
      vooOrigem: manualForm.flight,
      corTipo: manualForm.corTipo,
      situacao: manualForm.situacao || "PR",
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      observacoes: manualForm.observacoes || ""
    };

    try {
      setLoading(true);
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setManualForm({
          bagTag: "",
          pnr: "",
          flight: "",
          corTipo: "",
          situacao: "PR",
          observacoes: ""
        });
        await fetchSavedBags();
      } else {
        alert("Erro ao salvar bagagem manual.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao salvar bagagem lançada manualmente.");
    } finally {
      setLoading(false);
    }
  };

  // Process selected or captured image
  const processSingleImage = async (tempId: string, base64String: string, mime: string) => {
    try {
      const activeConf = getActiveGeminiKeyStatus();
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "x-ai-provider": "gemini"
      };
      
      const activeKey = activeConf.geminiKey;
      if (activeKey) {
        headers["x-api-key"] = activeKey;
        headers["x-gemini-api-key"] = activeKey;
      }

      const response = await apiFetch("/api/ocr", {
        method: "POST",
        headers,
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

        reader.onloadend = async () => {
          if (typeof reader.result === "string") {
            try {
              const compressedBase64 = await compressImage(reader.result, 1200);
              processSingleImage(tempId, compressedBase64, "image/jpeg");
            } catch (err) {
              console.error("Erro de compressão, usando original:", err);
              processSingleImage(tempId, reader.result, file.type);
            }
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
        
        {/* VIEWPORT DINÂMICO MULTI-MÉTODO (7 COLUMNS) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          {/* SELETOR DE MODOS (TABS) */}
          <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black tracking-tight transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "camera"
                  ? "bg-[#003087] text-white shadow-md scale-[1.01]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>📷 Câmera / Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black tracking-tight transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "paste"
                  ? "bg-[#E31837] text-white shadow-md scale-[1.01]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <FileCheck className="w-4 h-4 shrink-0" />
              <span>📋 Copiar/Colar Site</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black tracking-tight transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "manual"
                  ? "bg-slate-950 text-white shadow-md scale-[1.01]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>✍️ Digitar Manual</span>
            </button>
          </div>

          {/* TAB 1: CÂMERA E INTEGRAÇÃO DE IMAGEM */}
          {activeTab === "camera" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all duration-200">
              <div className="p-4 border-b border-slate-100 bg-[#003087]/5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#003087]" />
                  <span className="font-bold text-slate-800 text-sm">Escaneamento por Câmera / Imagem</span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {apiKeyStatus.hasKey ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm" title={apiKeyStatus.source === "env" ? "Chave configurada nas variáveis de ambiente" : "Chave configurada localmente"}>
                      <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                      OCR Real Ativo (Gemini)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200" title="Nenhuma chave do Gemini foi encontrada. Usando OCR simulado de testes.">
                      <AlertTriangle className="w-3 h-3" />
                      OCR Simulado (Sem Chave)
                    </span>
                  )}

                  {stream ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      Câmera Transmitindo
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded" title="Sua câmera em tempo real não está transmitindo no momento. Use um dos botões abaixo para tirar foto ou ativar a webcam.">
                      Câmera Inativa
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
                  <div 
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 cursor-pointer hover:bg-slate-900/40 transition-colors group relative m-4 rounded-xl border border-dashed border-slate-700/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/20 pointer-events-none" />
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#003087]/10 text-[#003087] group-hover:bg-[#003087]/20 group-hover:scale-105 transition-all mb-4">
                      <Camera className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-base font-extrabold text-white group-hover:text-blue-400 transition-colors">Tirar Foto da Etiqueta</p>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed px-4">
                      Toque para abrir a <strong>Câmera Nativa do Celular</strong> (alta resolução e foco automático) ou selecione um arquivo.
                    </p>
                    
                    <span className="mt-5 inline-flex items-center gap-1.5 bg-[#E31837] hover:bg-[#c3132e] text-white font-extrabold text-xs px-5 py-2.5 rounded-full shadow-lg transition duration-200">
                      <Camera className="w-3.5 h-3.5" /> Tirar Foto Agora
                    </span>
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
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="w-full sm:w-auto flex flex-wrap gap-2.5">
                  {stream ? (
                    <>
                      <button
                        type="button"
                        id="btn-trigger-capture"
                        onClick={captureFrame}
                        disabled={loading}
                        className="inline-flex items-center gap-2 bg-[#E31837] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer animate-pulse"
                      >
                        <Camera className="w-4 h-4" /> Capturar Foto (Webcam)
                      </button>
                      <button
                        type="button"
                        id="btn-stop-camera"
                        onClick={stopCamera}
                        className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold px-3 py-2.5 rounded-lg cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4 text-slate-600" /> Desativar Webcam
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      id="btn-restart-camera"
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Ou usar Webcam do computador
                    </button>
                  )}
                </div>

                {/* HIDDEN INPUTS AND ACCESSIBILITY FILES */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={mobileCameraInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  
                  {!stream && (
                    <button
                      type="button"
                      id="btn-upload-trigger"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Carregar arquivo de imagem
                    </button>
                  )}
                </div>
              </div>

              {/* EXPLICIT WORKER ERROR WARNINGS */}
              {error && (
                <div className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-xs w-full">
                    <p className="font-bold">Aviso Operacional</p>
                    <p className="mt-0.5">{error}</p>
                    <p className="mt-2 text-[10px] text-amber-600 font-semibold leading-normal">
                      Dica: Se as requisições de OCR falharem ou retornarem erro de limite, configure sua chave de API do Gemini no formulário logo abaixo para ativar a inteligência artificial autônoma.
                    </p>
                  </div>
                </div>
              )}

              {/* BRAND NEW: CHAVE API GEMINI DIRECTLY BELOW CAMERA AS REQUESTED */}
              <div className="mx-4 mb-4 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#003087]" />
                    <span className="font-bold text-xs text-slate-700 uppercase tracking-widest">Chave de API do Gemini (OCR Real)</span>
                  </div>
                  {apiKeyStatus.hasKey ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" title={apiKeyStatus.source === "env" ? "Variável de ambiente" : "LocalStorage"}>
                      <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                      {apiKeyStatus.source === "env" ? "LATAM Ativa (Env)" : "Ativa (Local)"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      OCR Simulado (Sem Chave)
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Insira sua chave de API pessoal do <strong>Gemini</strong> abaixo para ativar o processamento em nuvem inteligente e precisão cirúrgica de dados de etiquetas LATAM.
                </p>

                <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <input
                      type={showKeyPassword ? "text" : "password"}
                      value={manualKeyInput}
                      onChange={(e) => setManualKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-1.5 text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-[#003087]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex gap-1 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveKey}
                      className="flex-1 sm:flex-initial bg-[#003087] hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Salvar
                    </button>
                    {apiKeyStatus.source === "localStorage" && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={isTestingKey}
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingKey ? "Testando..." : "Testar"}
                    </button>
                  </div>
                </div>

                {testKeySuccess && (
                  <p className="text-[10px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                    ✓ {testKeySuccess}
                  </p>
                )}
                {testKeyError && (
                  <p className="text-[10px] text-red-600 font-medium bg-red-50 border border-red-100 p-2 rounded-lg">
                    ✗ {testKeyError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COPIAR E COLAR DO SITE (EXTRATAÇÃO ONLINE 100% PRECISA) */}
          {activeTab === "paste" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col p-6 space-y-5 transition-all duration-200">
              <div className="flex items-start gap-3 border-b border-indigo-100 pb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-[#003087]">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Extrator por Texto (Cópia de E-mail / Site)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Copie as informações da bagagem ou localizador do site da companhia (LATAM), e-mail ou comprovante em PDF e cole abaixo. Nosso algoritmo inteligente fará a leitura e preenchimento garantindo 100% de exatidão!
                  </p>
                </div>
              </div>

              {/* TEXT AREA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Cole aqui o texto copiado:</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    parseTextRegex(e.target.value); // Realtime regex parsing
                  }}
                  rows={5}
                  placeholder="Cole aqui... Exemplo: 'Reserva confirmada: LOC: GYW8P2. Bagagem despachada número 0095948375 no voo LA8070...'"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs focus:ring-1 focus:ring-[#003087] focus:bg-white outline-none font-sans leading-relaxed"
                />
              </div>

              {/* IA REFINEMENT OPTION */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleAITextExtraction}
                  disabled={isExtractingText || !pastedText.trim()}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold text-xs px-4 py-2 rounded-lg shadow-sm transition cursor-pointer"
                >
                  {isExtractingText ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Refinar com Inteligência Artificial</span>
                    </>
                  )}
                </button>
              </div>

              {extractTextError && (
                <p className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-100 p-2 rounded-lg">
                  ⚠️ {extractTextError}
                </p>
              )}

              {/* DYNAMIC FIELD MATCHING CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 font-black" />
                  Dados Extraídos (Confirme e Edite se necessário):
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Etiqueta de Mala (Bag Tag)*</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={extractedFields.bagTag}
                      onChange={(e) => setExtractedFields(prev => ({ ...prev, bagTag: e.target.value.replace(/\D/g, "") }))}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider text-[#003087] bg-white outline-none"
                      placeholder="10 dígitos numéricos"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Localizador PNR*</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={extractedFields.pnr}
                      onChange={(e) => setExtractedFields(prev => ({ ...prev, pnr: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider text-[#E31837] bg-white outline-none"
                      placeholder="6 alfanuméricos"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Código do Voo</label>
                    <input
                      type="text"
                      value={extractedFields.flight}
                      onChange={(e) => setExtractedFields(prev => ({ ...prev, flight: e.target.value.toUpperCase() }))}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white outline-none font-mono"
                      placeholder="Ex: LA8070"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Cor / Tipo de Mala</label>
                    <input
                      type="text"
                      value={extractedFields.corTipo}
                      onChange={(e) => setExtractedFields(prev => ({ ...prev, corTipo: e.target.value }))}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white outline-none"
                      placeholder="Ex: Preta pequena"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Situação</label>
                    <select
                      value={extractedFields.situacao || "PR"}
                      onChange={(e) => setExtractedFields(prev => ({ ...prev, situacao: e.target.value as SituacaoType }))}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white outline-none font-bold text-slate-700"
                    >
                      {Object.entries(SITUACOES).map(([code, config]) => (
                        <option key={code} value={code}>{config.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Observações</label>
                    <input
                      type="text"
                      value={extractedFields.observacoes}
                      onChange={(e) => setExtractedFields(prev => ({ ...prev, observacoes: e.target.value }))}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs bg-white outline-none"
                      placeholder="Alguma nota importante"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={saveExtractedToStash}
                    disabled={!extractedFields.bagTag || !extractedFields.pnr || extractedFields.bagTag.length !== 10 || extractedFields.pnr.length !== 6 || loading}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-[#003087] hover:bg-blue-800 disabled:bg-slate-300 text-white font-black text-xs py-2 px-4 rounded-xl shadow-sm transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Adicionar à Fila de Espera</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIGITAR DADOS MANUALMENTE (100% DE PRECISÃO REAL) */}
          {activeTab === "manual" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col p-6 space-y-4 transition-all duration-200">
              <div className="flex items-start gap-3 border-b border-rose-100 pb-4">
                <div className="p-2 bg-rose-50 rounded-lg text-[#E31837]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Lançamento / Digitação Manual</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Opção direto e infalível. Insira os dados da etiqueta e do passageiro para registrar sem a necessidade de foto ou inteligência artificial.
                  </p>
                </div>
              </div>

              {/* MANUAL INPUT FORM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Número da Etiqueta (Bag Tag) *</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={manualForm.bagTag}
                    onChange={(e) => setManualForm(prev => ({ ...prev, bagTag: e.target.value.replace(/\D/g, "") }))}
                    placeholder="Ex: 0095123456 (10 dígitos)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#003087] outline-none focus:ring-1 focus:ring-[#003087] focus:bg-white"
                  />
                  {manualForm.bagTag && manualForm.bagTag.length !== 10 && (
                    <span className="text-[10px] text-amber-600 block pt-0.5">Faltam {10 - manualForm.bagTag.length} números</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Localizador de Reserva PNR *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={manualForm.pnr}
                    onChange={(e) => setManualForm(prev => ({ ...prev, pnr: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                    placeholder="Ex: XY7G8H (PNR de 6 letras)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#E31837] outline-none focus:ring-1 focus:ring-[#E31837] focus:bg-white"
                  />
                  {manualForm.pnr && manualForm.pnr.length !== 6 && (
                    <span className="text-[10px] text-amber-600 block pt-0.5">Falta {6 - manualForm.pnr.length} caracteres</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Número do Voo</label>
                  <input
                    type="text"
                    value={manualForm.flight}
                    onChange={(e) => setManualForm(prev => ({ ...prev, flight: e.target.value.toUpperCase() }))}
                    placeholder="Ex: LA3402"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
                  />
                </div>

                <div className="space-y-1 font-sans">
                  <label className="block text-xs font-bold text-slate-700">Cor / Tipo de Mala</label>
                  <input
                    type="text"
                    value={manualForm.corTipo}
                    onChange={(e) => setManualForm(prev => ({ ...prev, corTipo: e.target.value }))}
                    placeholder="Ex: Azul de tecido com fita"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Situação Atual *</label>
                  <select
                    value={manualForm.situacao || "PR"}
                    onChange={(e) => setManualForm(prev => ({ ...prev, situacao: e.target.value as SituacaoType }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white font-bold text-slate-700"
                  >
                    {Object.entries(SITUACOES).map(([code, config]) => (
                      <option key={code} value={code}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Observações Extras</label>
                  <input
                    type="text"
                    value={manualForm.observacoes}
                    onChange={(e) => setManualForm(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Ex: Danificada ou rasgada"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={saveManualToStash}
                  disabled={!manualForm.bagTag || !manualForm.pnr || manualForm.bagTag.length !== 10 || manualForm.pnr.length !== 6 || loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#003087] hover:bg-blue-800 disabled:bg-slate-200 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md disabled:shadow-none transition duration-150 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar e Lançar na Fila</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManualForm({ bagTag: "", pnr: "", flight: "", corTipo: "", situacao: "PR", observacoes: "" })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  Limpar
                </button>
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
