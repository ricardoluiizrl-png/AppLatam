import React, { useRef, useState, useEffect } from "react";
import { apiFetch, getActiveGeminiKeyStatus, recordUsabilityLog } from "../utils/mockApi";
import { notifyBaggagesChanged, subscribeBaggagesChanged } from "../utils/syncEvents";
import { DuplicatePnrModal, DuplicatePnrInfo } from "../components/DuplicatePnrModal";
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
  EyeOff,
  Zap,
  ExternalLink,
  Scan,
  Plane,
  ShieldCheck,
  ArrowRight,
  Bot,
  Luggage
} from "lucide-react";
import { Bagagem, SITUACOES, SituacaoType } from "../types";
import { addNotification } from "../utils/notifications";

export interface LerEtiquetaProps {
  activeUser?: {
    nome: string;
    matricula: string;
    email?: string;
  };
}

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
  imageDataUrl?: string;
  imageMime?: string;
  validationWarning?: string | null;
}

// Check if a baggage tag is valid (1 to 12 alphanumeric characters)
export const isIataTagValid = (tag: string): boolean => {
  if (!tag) return false;
  const cleanTag = tag.trim();
  return /^[A-Za-z0-9]{1,12}$/.test(cleanTag);
};

// Check if a reservation locator (PNR) is consistent (exactly 6 alphanumeric characters)
export const isPnrValid = (pnr: string): boolean => {
  const cleanPnr = pnr.toUpperCase().replace(/[^A-Za-z0-9]/g, "").trim();
  return /^[A-Z0-9]{6}$/.test(cleanPnr);
};

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
        resolve(canvas.toDataURL("image/jpeg", 0.88));
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

export default function LerEtiqueta({ activeUser }: LerEtiquetaProps = {}) {
  const getUserInfo = () => {
    if (activeUser && activeUser.nome) {
      return {
        nome: activeUser.nome,
        matricula: activeUser.matricula || "6021908",
        email: activeUser.email || "agente.latam@latam.com"
      };
    }
    const saved = localStorage.getItem("latam_active_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          nome: parsed.nome || "Agente LATAM",
          matricula: parsed.matricula || "6021908",
          email: parsed.email || "agente.latam@latam.com"
        };
      } catch {}
    }
    return { nome: "Agente LATAM", matricula: "6021908", email: "agente.latam@latam.com" };
  };

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isQuotaSimulated, setIsQuotaSimulated] = useState(false);

  // List of pending scanned tags to be previewed/edited
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // NEW: Interactive Input Methods for 100% precision from online sites
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");

  // Manual Form temporary state
  const [manualForm, setManualForm] = useState({
    bagTag: "",
    pnr: "",
    flight: "",
    corTipo: "",
    situacao: "PR" as SituacaoType,
    observacoes: ""
  });

  const [apiKeyStatus, setApiKeyStatus] = useState<{
    hasKey: boolean;
    source: "localStorage" | "env" | "none";
    provider: "gemini";
    geminiKey: string;
  }>({
    hasKey: false,
    source: "none",
    provider: "gemini",
    geminiKey: ""
  });

  const [manualKeyInput, setManualKeyInput] = useState("");
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testKeySuccess, setTestKeySuccess] = useState<string | null>(null);
  const [testKeyError, setTestKeyError] = useState<string | null>(null);

  // Saved reads list loaded from database
  const [savedLists, setSavedLists] = useState<any[]>([]);
  // Toast notification for instant action confirmation
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  // Completed processes (histórico) from DB for validation and enrichment
  const [processes, setProcesses] = useState<any[]>([]);

  // Duplicate PNR popup modal state
  const [duplicatePnrModalOpen, setDuplicatePnrModalOpen] = useState(false);
  const [duplicatePnrInfo, setDuplicatePnrInfo] = useState<DuplicatePnrInfo | null>(null);

  const checkForDuplicatePnr = (pnrToTest: string, currentTagToTest?: string, excludeItemId?: string): DuplicatePnrInfo | null => {
    const cleanPnr = (pnrToTest || "").trim().toUpperCase();
    const cleanTag = (currentTagToTest || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
    if (!cleanPnr || cleanPnr.length < 3) return null;

    // 1. Check in saved active baggages database (only match if exact same tag, or if no tag passed)
    const savedMatch = savedLists.find((b: any) => {
      const bPnr = (b.pnr || "").trim().toUpperCase();
      const bTag = (b.etiqueta || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
      if (bPnr !== cleanPnr) return false;
      if (cleanTag && bTag && bTag !== cleanTag) return false; // Different tags = multi-bag passenger (valid)
      return true;
    });
    if (savedMatch) {
      return {
        pnr: cleanPnr,
        existingEtiqueta: savedMatch.etiqueta,
        newEtiqueta: currentTagToTest,
        vooOrigem: savedMatch.vooOrigem,
        corTipo: savedMatch.corTipo,
        situacao: savedMatch.situacao ? (SITUACOES[savedMatch.situacao as SituacaoType]?.label || savedMatch.situacao) : undefined,
        sourceLabel: "Fila de Trabalho Ativa"
      };
    }

    // 2. Check in pending scanned queue
    const pendingMatch = pendingItems.find((p: PendingItem) => {
      if (excludeItemId && p.id === excludeItemId) return false;
      const pPnr = (p.pnr || "").trim().toUpperCase();
      const pTag = (p.bagTag || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
      if (pPnr !== cleanPnr) return false;
      if (cleanTag && pTag && pTag !== cleanTag) return false;
      return true;
    });
    if (pendingMatch) {
      return {
        pnr: cleanPnr,
        existingEtiqueta: pendingMatch.bagTag,
        newEtiqueta: currentTagToTest,
        vooOrigem: pendingMatch.flight,
        corTipo: pendingMatch.corTipo,
        situacao: pendingMatch.situacao ? (SITUACOES[pendingMatch.situacao as SituacaoType]?.label || pendingMatch.situacao) : undefined,
        sourceLabel: "Fila de Leitura Atual"
      };
    }

    // 3. Check in completed historical processes
    for (const proc of processes) {
      if (Array.isArray(proc.bagagens)) {
        const matchProc = proc.bagagens.find((b: any) => {
          const bPnr = (b.pnr || "").trim().toUpperCase();
          const bTag = (b.etiqueta || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
          if (bPnr !== cleanPnr) return false;
          if (cleanTag && bTag && bTag !== cleanTag) return false;
          return true;
        });
        if (matchProc) {
          return {
            pnr: cleanPnr,
            existingEtiqueta: matchProc.etiqueta,
            newEtiqueta: currentTagToTest,
            vooOrigem: matchProc.vooOrigem,
            corTipo: matchProc.corTipo,
            situacao: matchProc.situacao ? (SITUACOES[matchProc.situacao as SituacaoType]?.label || matchProc.situacao) : undefined,
            sourceLabel: "Histórico PIR Registrado"
          };
        }
      }
    }

    return null;
  };

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

  // Load saved lists and processes from database on mount, check API key status & real-time sync
  useEffect(() => {
    fetchSavedBags();
    fetchProcesses();
    const status = getActiveGeminiKeyStatus();
    setApiKeyStatus(status);
    setManualKeyInput(status.geminiKey || "");

    const unsubscribe = subscribeBaggagesChanged(() => {
      fetchSavedBags();
    }, 2500);

    return () => unsubscribe();
  }, []);

  // High-precision automatic validation function per scanned or pasted item (dynamically checked)
  const checkValidation = (bagTag?: string, pnr?: string, excludeItemId?: string) => {
    const cleanTag = (bagTag || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
    const cleanPnr = (pnr || "").trim().toUpperCase();

    if (!cleanTag && !cleanPnr) {
      return null;
    }

    // 1. Check in currently active bags in DB
    const activeMatch = savedLists.find((b: any) => {
      const bTag = (b.etiqueta || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
      const bPnr = (b.pnr || "").trim().toUpperCase();
      const matchTag = cleanTag && bTag === cleanTag;
      const matchPnr = cleanPnr && bPnr === cleanPnr;
      return matchTag || matchPnr;
    });

    if (activeMatch) {
      const bTag = (activeMatch.etiqueta || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
      const bPnr = (activeMatch.pnr || "").trim().toUpperCase();
      const matchedField = (cleanTag && bTag === cleanTag && cleanPnr && bPnr === cleanPnr)
        ? "both"
        : (cleanPnr && bPnr === cleanPnr) ? "pnr" : "etiqueta";

      return {
        found: true,
        source: "baggages" as const,
        item: activeMatch,
        matchedField
      };
    }

    // 2. Check in pending queue items
    const pendingMatch = pendingItems.find((p: PendingItem) => {
      if (excludeItemId && p.id === excludeItemId) return false;
      const pTag = (p.bagTag || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
      const pPnr = (p.pnr || "").trim().toUpperCase();
      const matchTag = cleanTag && pTag === cleanTag;
      const matchPnr = cleanPnr && pPnr === cleanPnr;
      return matchTag || matchPnr;
    });

    if (pendingMatch) {
      const pTag = (pendingMatch.bagTag || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
      const pPnr = (pendingMatch.pnr || "").trim().toUpperCase();
      const matchedField = (cleanTag && pTag === cleanTag && cleanPnr && pPnr === cleanPnr)
        ? "both"
        : (cleanPnr && pPnr === cleanPnr) ? "pnr" : "etiqueta";

      return {
        found: true,
        source: "pending" as const,
        item: pendingMatch,
        matchedField
      };
    }

    // 3. Check in historical completed processes
    for (const proc of processes) {
      if (Array.isArray(proc.bagagens)) {
        const match = proc.bagagens.find((b: any) => {
          const bTag = (b.etiqueta || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
          const bPnr = (b.pnr || "").trim().toUpperCase();
          const matchTag = cleanTag && bTag === cleanTag;
          const matchPnr = cleanPnr && bPnr === cleanPnr;
          return matchTag || matchPnr;
        });

        if (match) {
          const bTag = (match.etiqueta || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().trim();
          const bPnr = (match.pnr || "").trim().toUpperCase();
          const matchedField = (cleanTag && bTag === cleanTag && cleanPnr && bPnr === cleanPnr)
            ? "both"
            : (cleanPnr && bPnr === cleanPnr) ? "pnr" : "etiqueta";

          return {
            found: true,
            source: "processes" as const,
            item: match,
            processId: proc.id,
            matchedField
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
      const errMsg = err.message || "Não foi possível acessar a câmera do dispositivo.";
      setError(
        errMsg + " Certifique-se de que o site utiliza conexão segura (HTTPS), concedeu permissões para a câmera nas configurações do navegador ou use a opção 'Enviar Arquivo / Imagem' logo abaixo."
      );
      addNotification({
        type: "tag_read_error",
        title: "Erro de Acesso à Câmera",
        message: errMsg,
        linkTab: "ocr"
      });
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

  // Colocar a camera sempre ativa (100% ativa) assim que entrar na aba de ler etiquetas
  useEffect(() => {
    setIsQuotaSimulated(false);
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Handle API Key Management
  const handleSaveKey = () => {
    setTestKeySuccess(null);
    setTestKeyError(null);
    const key = manualKeyInput.trim();
    if (!key) {
      alert("Por favor, digite uma chave de API válida para o Gemini 3.5.");
      return;
    }
    localStorage.setItem("client_gemini_api_key", key);
    const status = getActiveGeminiKeyStatus();
    setApiKeyStatus(status);
    alert("Chave do Gemini 3.5 gravada com sucesso localmente!");
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
        setTestKeySuccess("Conexão efetuada com sucesso! Chave de API do Gemini 3.5 ativa e funcional.");
      } else {
        setTestKeyError(data.error || "Erro ao testar chave de API do Gemini 3.5.");
      }
    } catch (err: any) {
      setTestKeyError(err.message || "Erro de conexão ao servidor de homologação da chave.");
    } finally {
      setIsTestingKey(false);
    }
  };



  const saveManualToStash = async () => {
    const cleanTag = (manualForm.bagTag || "").trim().toUpperCase();
    const cleanPnr = (manualForm.pnr || "").trim().toUpperCase();

    if (!cleanTag || !cleanPnr) {
      alert("Por favor preencha os campos obrigatórios (Etiqueta de Mala e Localizador PNR).");
      return;
    }

    const newItem = {
      etiqueta: cleanTag,
      pnr: cleanPnr,
      vooOrigem: (manualForm.flight || "").trim().toUpperCase(),
      corTipo: (manualForm.corTipo || "").trim(),
      situacao: manualForm.situacao || "PR",
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      observacoes: (manualForm.observacoes || "").trim()
    };

    try {
      setLoading(true);
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });

      if (res.ok) {
        let createdBag: any = null;
        try {
          createdBag = await res.json();
        } catch (e) {
          console.warn("Nenhum JSON retornado na criação da bagagem:", e);
        }

        const savedBag = {
          id: createdBag?.id || "bag_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          ...newItem,
          createdAt: createdBag?.createdAt || new Date().toISOString(),
          timestamp: createdBag?.timestamp || new Date().toISOString()
        };

        // Instant Optimistic Update for 0ms visual delay:
        setSavedLists(prev => [savedBag, ...prev.filter(b => b.id !== savedBag.id)]);
        notifyBaggagesChanged();

        // Instant Toast feedback notification
        setSaveSuccessMessage(`✅ Etiqueta "${savedBag.etiqueta}" (PNR ${savedBag.pnr}) cadastrada e lançada na fila com sucesso!`);
        setTimeout(() => setSaveSuccessMessage(null), 5000);

        // Check if there was an exact duplicate tag repeated
        const duplicate = checkForDuplicatePnr(newItem.pnr, newItem.etiqueta);
        if (duplicate && duplicate.existingEtiqueta === newItem.etiqueta) {
          setDuplicatePnrInfo(duplicate);
          setDuplicatePnrModalOpen(true);
        }

        // Clear manual form immediately
        setManualForm({
          bagTag: "",
          pnr: "",
          flight: "",
          corTipo: "",
          situacao: "PR",
          observacoes: ""
        });

        // Non-blocking background operations
        const uInfo = getUserInfo();
        recordUsabilityLog({
          usuarioNome: uInfo.nome,
          usuarioMatricula: uInfo.matricula,
          usuarioEmail: uInfo.email,
          acao: "CADASTRO_MANUAL",
          descricao: `Cadastro manual de bagagem - Tag: ${newItem.etiqueta}, PNR: ${newItem.pnr}, Voo: ${newItem.vooOrigem || 'S/N'}`,
          bagagens: [{
            etiqueta: newItem.etiqueta,
            pnr: newItem.pnr,
            vooOrigem: newItem.vooOrigem,
            corTipo: newItem.corTipo,
            situacao: newItem.situacao,
            observacoes: newItem.observacoes,
            scanned: false
          }]
        });

        fetchSavedBags();
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
    // Proactively save image data in state for retry upon failures
    setPendingItems(prev => prev.map(item => {
      if (item.id === tempId) {
        return {
          ...item,
          imageDataUrl: base64String,
          imageMime: mime
        };
      }
      return item;
    }));

    try {
      const activeConf = getActiveGeminiKeyStatus();
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "x-ai-provider": "gemini"
      };
      
      if (activeConf.geminiKey) {
        headers["x-api-key"] = activeConf.geminiKey;
        headers["x-gemini-api-key"] = activeConf.geminiKey;
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

      const rawTag = parsedOcr.bagTag || "";
      const rawPnr = parsedOcr.pnr || "";
      
      const tagValid = isIataTagValid(rawTag);
      const pnrVal = isPnrValid(rawPnr);

      let validationWarningMsg: string | null = null;
      if (!tagValid || !pnrVal) {
        const issues: string[] = [];
        if (!tagValid) {
          issues.push(`Número de Etiqueta ("${rawTag || 'não lido'}") fora do limite de 1 a 12 caracteres alfanuméricos`);
        }
        if (!pnrVal) {
          issues.push(`Localizador PNR ("${rawPnr || 'não lido'}") fora do padrão de 6 caracteres alfanuméricos`);
        }
        validationWarningMsg = issues.join(". ");
        
        addNotification({
          type: "tag_read_error",
          title: "Inconsistência na Leitura de Etiqueta (OCR)",
          message: `A leitura da etiqueta foi concluída com divergência das normas IATA: ${validationWarningMsg}`,
          linkTab: "ocr"
        });
      }

      setPendingItems(prev => prev.map(item => {
        if (item.id === tempId) {
          return {
            ...item,
            loading: false,
            bagTag: rawTag,
            pnr: rawPnr,
            flight: parsedOcr.flight || parsedOcr.flightCode || "",
            corTipo: parsedOcr.cor_tipo || parsedOcr.corTipo || "",
            situacao: parsedOcr.situacao || "PR",
            isQuotaSimulated: parsedOcr.quotaFallbackActive || false,
            imageDataUrl: base64String,
            imageMime: mime,
            error: null,
            validationWarning: validationWarningMsg
          };
        }
        return item;
      }));

      const uInfo = getUserInfo();
      recordUsabilityLog({
        usuarioNome: uInfo.nome,
        usuarioMatricula: uInfo.matricula,
        usuarioEmail: uInfo.email,
        acao: "BIPAGEM_ETIQUETA",
        descricao: `Bipagem de etiqueta processada - Tag: ${rawTag || 'Não identificada'}, PNR: ${rawPnr || 'Não identificado'}, Voo: ${parsedOcr.flight || parsedOcr.flightCode || 'S/N'}`,
        bagagens: [{
          etiqueta: rawTag,
          pnr: rawPnr,
          vooOrigem: parsedOcr.flight || parsedOcr.flightCode || "",
          corTipo: parsedOcr.cor_tipo || parsedOcr.corTipo || "",
          situacao: parsedOcr.situacao || "PR",
          scanned: true
        }]
      });

      if (parsedOcr.quotaFallbackActive) {
        setIsQuotaSimulated(true);
      }

      // Check if there was already another baggage with this same PNR
      if (rawPnr) {
        const duplicate = checkForDuplicatePnr(rawPnr, rawTag, tempId);
        if (duplicate) {
          setDuplicatePnrInfo(duplicate);
          setDuplicatePnrModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      const errStr = (err.message || "").toLowerCase();
      let customErr = err.message || "Erro desconhecido ao processar OCR.";
      if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("resource_exhausted") || errStr.includes("exceeded")) {
        customErr = "Cota Excedida. Ative sua chave do Gemini para digitalização real.";
        setIsQuotaSimulated(true);
      }

      addNotification({
        type: "tag_read_error",
        title: "Erro no Processamento de Etiqueta (OCR)",
        message: customErr,
        linkTab: "ocr"
      });

      setPendingItems(prev => prev.map(item => {
        if (item.id === tempId) {
          return {
            ...item,
            loading: false,
            imageDataUrl: base64String,
            imageMime: mime,
            error: customErr
          };
        }
        return item;
      }));
    }
  };

  // Handle Retrying the Gemini OCR for a specific pending card
  const handleRetryOCR = async (item: PendingItem) => {
    if (!item.imageDataUrl || !item.imageMime) return;
    
    // Set loading to true and clear error
    setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, loading: true, error: null } : pi));
    
    // Call processSingleImage
    await processSingleImage(item.id, item.imageDataUrl, item.imageMime);
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

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
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

        // Process the live captured image through the high-contrast grayscale pre-processor!
        compressImage(dataUrl, 1200)
          .then((preprocessedDataUrl) => {
            processSingleImage(tempId, preprocessedDataUrl, "image/jpeg");
          })
          .catch((err) => {
            console.error("Erro ao aplicar pré-processamento na captura:", err);
            processSingleImage(tempId, dataUrl, "image/jpeg");
          });
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

    const isTagOk = isIataTagValid(item.bagTag);
    const isPnrOk = isPnrValid(item.pnr);
    
    if (!isTagOk || !isPnrOk) {
      if (typeof window !== "undefined") {
        const confirmSave = window.confirm(
          "⚠️ Os dados inseridos apresentam inconsistência de formato!\n\n" +
          "• Etiqueta: " + (isTagOk ? "Válida (1 a 12 caracteres alfanuméricos) ✓" : `Inválida ("${item.bagTag}" deve possuir de 1 a 12 caracteres alfanuméricos) ✗`) + "\n" +
          "• Reserva PNR: " + (isPnrOk ? "Válida (6 alfanuméricos) ✓" : `Inválida ("${item.pnr}" deve possuir 6 alfanuméricos) ✗`) + "\n\n" +
          "Deseja salvar na fila mesmo assim com estes valores?"
        );
        if (!confirmSave) return;
      }
    }

    const newItem = {
      etiqueta: item.bagTag,
      pnr: item.pnr,
      vooOrigem: item.flight,
      corTipo: item.corTipo,
      situacao: item.situacao || "PR",
      dataVoo: new Date().toLocaleDateString("pt-BR"),
      observacoes: item.observacoes || "",
      scanned: true
    };

    try {
      setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, loading: true } : pi));
      const res = await apiFetch("/api/baggages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });

      if (res.ok) {
        let createdBag: any = null;
        try {
          createdBag = await res.json();
        } catch (e) {
          console.warn("Nenhum JSON retornado:", e);
        }

        const savedBag = {
          id: createdBag?.id || "bag_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          ...newItem,
          createdAt: createdBag?.createdAt || new Date().toISOString(),
          timestamp: createdBag?.timestamp || new Date().toISOString()
        };

        // Instant Optimistic Update:
        setSavedLists(prev => [savedBag, ...prev.filter(b => b.id !== savedBag.id)]);
        notifyBaggagesChanged();
        setPendingItems(prev => prev.filter(pi => pi.id !== item.id));

        setSaveSuccessMessage(`✅ Etiqueta "${savedBag.etiqueta}" lançada na fila de trabalho com sucesso!`);
        setTimeout(() => setSaveSuccessMessage(null), 5000);

        const uInfo = getUserInfo();
        recordUsabilityLog({
          usuarioNome: uInfo.nome,
          usuarioMatricula: uInfo.matricula,
          usuarioEmail: uInfo.email,
          acao: "SALVAMENTO_LOTE",
          descricao: `Bagagem confirmada e salva na fila de trabalho - Tag: ${newItem.etiqueta}, PNR: ${newItem.pnr}`,
          bagagens: [{
            etiqueta: newItem.etiqueta,
            pnr: newItem.pnr,
            vooOrigem: newItem.vooOrigem,
            corTipo: newItem.corTipo,
            situacao: newItem.situacao,
            observacoes: newItem.observacoes,
            scanned: true
          }]
        });

        fetchSavedBags();
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

    const hasInconsistentField = validItems.some(p => !isIataTagValid(p.bagTag) || !isPnrValid(p.pnr));
    if (hasInconsistentField) {
      if (typeof window !== "undefined") {
        const confirmBatch = window.confirm(
          "⚠️ Algumas das etiquetas da fila apresentam formatos de etiqueta ou PNR fora do padrão esperado.\n\n" +
          "Deseja salvar todas de uma vez mesmo assim?"
        );
        if (!confirmBatch) return;
      }
    }

    try {
      setLoading(true);
      const promises = validItems.map(async (item) => {
        const newItem = {
          etiqueta: item.bagTag,
          pnr: item.pnr,
          vooOrigem: item.flight,
          corTipo: item.corTipo,
          situacao: item.situacao || "PR",
          dataVoo: new Date().toLocaleDateString("pt-BR"),
          observacoes: item.observacoes || "",
          scanned: true
        };

        const res = await apiFetch("/api/baggages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
        });

        if (res.ok) {
          let created: any = null;
          try {
            created = await res.json();
          } catch (e) {}
          return {
            id: item.id,
            ok: true,
            created: {
              id: created?.id || "bag_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
              ...newItem,
              createdAt: created?.createdAt || new Date().toISOString(),
              timestamp: created?.timestamp || new Date().toISOString()
            }
          };
        }
        return { id: item.id, ok: false, created: null };
      });

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.ok && r.created);
      const successfulIds = successful.map(r => r.id);
      const createdBags = successful.map(r => r.created);

      if (createdBags.length > 0) {
        setSavedLists(prev => [...createdBags, ...prev]);
        notifyBaggagesChanged();
        setSaveSuccessMessage(`✅ Lote de ${createdBags.length} etiquetas salvas na fila com sucesso!`);
        setTimeout(() => setSaveSuccessMessage(null), 5000);

        const uInfo = getUserInfo();
        const savedValidItems = validItems.filter(vi => successfulIds.includes(vi.id));
        recordUsabilityLog({
          usuarioNome: uInfo.nome,
          usuarioMatricula: uInfo.matricula,
          usuarioEmail: uInfo.email,
          acao: "SALVAMENTO_LOTE",
          descricao: `Lote de ${savedValidItems.length} bagagens salvas na fila de trabalho`,
          bagagens: savedValidItems.map(vi => ({
            etiqueta: vi.bagTag,
            pnr: vi.pnr,
            vooOrigem: vi.flight,
            corTipo: vi.corTipo,
            situacao: vi.situacao || "PR",
            observacoes: vi.observacoes,
            scanned: true
          }))
        });
      }

      setPendingItems(prev => prev.filter(pi => !successfulIds.includes(pi.id)));
      fetchSavedBags();
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
    // Instant optimistic update
    setSavedLists(prev => prev.filter(item => item.id !== id));
    notifyBaggagesChanged();
    try {
      await apiFetch(`/api/baggages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true })
      });
      fetchSavedBags();
      notifyBaggagesChanged();
    } catch (e) {
      console.error(e);
    }
  };

  // Clear entire OCR stash
  const handleClearStash = async () => {
    const itemsToRemove = [...savedLists];
    // Instant optimistic update
    setSavedLists([]);
    notifyBaggagesChanged();
    try {
      for (const item of itemsToRemove) {
        await apiFetch(`/api/baggages/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleted: true })
        });
      }
      fetchSavedBags();
      notifyBaggagesChanged();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* SEÇÃO HERO CABEÇALHO - LEITURA DE ETIQUETAS COM IA */}
      <div className="relative overflow-hidden rounded-3xl bg-[#003087] text-white shadow-xl border border-blue-900/40">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity scale-105"
          style={{ backgroundImage: `url('/src/assets/images/latam_agent_service_1786420041107.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#003087] via-[#003087]/90 to-[#001d54]/95" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="bg-white px-3 py-1.5 rounded-xl shadow-xs">
                <img 
                  src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
                  alt="LATAM Airlines" 
                  className="h-4" 
                />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              Leitura & Escaneamento de Etiquetas
            </h2>
            <p className="text-xs text-blue-100/90 font-medium leading-relaxed">
              Fotografe a etiqueta de bagagem com seu dispositivo ou faça o upload de fotos para extrair automaticamente o Bag Tag IATA, o código PNR e os dados do voo com inteligência artificial.
            </p>
          </div>
        </div>
      </div>

      {/* TOAST DE NOTIFICAÇÃO DE SUCESSO INSTANTÂNEO */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-950 font-black text-xs sm:text-sm flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold shrink-0 shadow-xs">
              ✓
            </div>
            <span>{saveSuccessMessage}</span>
          </div>
          <button 
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded-lg hover:bg-emerald-200/50 transition-colors font-extrabold cursor-pointer text-xs"
          >
            ✕ Fechar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VIEWPORT DINÂMICO MULTI-MÉTODO (7 COLUMNS) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col">
          
          {/* SELETOR DE MODOS (TABS PREDOMINANTES) */}
          <div className="bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300/80 flex gap-2 w-full shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "camera"
                  ? "bg-[#003087] text-white shadow-lg scale-[1.01] border border-blue-900/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>📷 Câmera / Digitalização IA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "manual"
                  ? "bg-slate-900 text-white shadow-lg scale-[1.01] border border-slate-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>✍️ Digitar Manualmente</span>
            </button>
          </div>

          {/* TAB 1: CÂMERA E INTEGRAÇÃO DE IMAGEM */}
          {activeTab === "camera" && (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col transition-all duration-200">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-[#003087] rounded-xl border border-blue-100">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-800 text-xs uppercase tracking-wider block">Escaneamento por Câmera / Arquivo</span>
                    <span className="text-[10px] text-slate-500 font-medium">Reconhecimento IATA via IA</span>
                  </div>
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
                    className="w-full h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 cursor-pointer hover:bg-slate-900/60 transition-all group relative m-4 rounded-2xl border-2 border-dashed border-slate-700/60"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#003087]/10 to-slate-950/40 pointer-events-none rounded-2xl" />
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#003087]/20 text-[#003087] group-hover:bg-[#003087] group-hover:text-white group-hover:scale-110 transition-all mb-4 border border-blue-500/30 shadow-lg">
                      <Camera className="w-8 h-8 text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-base font-black text-white group-hover:text-blue-300 transition-colors">Tirar Foto da Etiqueta</p>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed px-4 font-medium">
                      Toque para abrir a <strong>Câmera do Celular</strong> (alta resolução e foco automático) ou selecione arquivos de imagem.
                    </p>
                    
                    <span className="mt-5 inline-flex items-center gap-2 bg-[#E31837] hover:bg-[#c3132e] text-white font-black text-xs px-6 py-3 rounded-2xl shadow-xl transition duration-200 active:scale-95 cursor-pointer">
                      <Camera className="w-4 h-4" /> Capturar Foto Agora
                    </span>
                  </div>
                )}

                {/* FLOATING STATUS MESSAGE */}
                {loading && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20">
                    <RefreshCw className="w-10 h-10 text-[#E31837] animate-spin mb-4" />
                    <p className="text-white font-black text-base animate-pulse">
                      {statusMessage || "Analisando etiqueta com IA..."}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Aguarde enquanto o Gemini lê a bag tag e o localizador PNR.
                    </p>
                  </div>
                )}

                {/* SCANNING LINE OVERLAY */}
                {stream && !loading && (
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500/90 shadow-[0_0_12px_#ef4444] animate-bounce z-10" />
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
                        className="inline-flex items-center gap-2 bg-[#E31837] hover:bg-red-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition duration-150 active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
                      >
                        <Camera className="w-4 h-4" /> Capturar Foto
                      </button>
                      <button
                        type="button"
                        id="btn-stop-camera"
                        onClick={stopCamera}
                        className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-extrabold px-3.5 py-2.5 rounded-xl cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4 text-slate-600" /> Desativar Webcam
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      id="btn-restart-camera"
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 font-extrabold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#003087]" /> Usar Webcam do Computador
                    </button>
                  )}
                </div>

                {/* HIDDEN INPUTS AND FILE UPLOADER */}
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
                      className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-[#003087] font-bold bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload de Imagens
                    </button>
                  )}
                </div>
              </div>

              {/* EXPLICIT WORKER ERROR WARNINGS */}
              {error && (
                <div className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <div className="text-xs w-full">
                    <p className="font-black text-amber-950">Aviso Operacional de OCR</p>
                    <p className="mt-0.5 font-medium">{error}</p>
                    <p className="mt-2 text-[10px] text-amber-700 font-semibold leading-normal">
                      Dica: Se as requisições de OCR falharem ou retornarem erro de limite, insira sua chave da API do Gemini no formulário abaixo.
                    </p>
                  </div>
                </div>
              )}

              {/* CONFIGURAÇÃO DE IA AUTÔNOMA (GEMINI 3.5) */}
              <div className="m-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#003087]" />
                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Chave API do Google Gemini</span>
                  </div>
                  {apiKeyStatus.hasKey ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200" title={apiKeyStatus.source === "env" ? "Variável de ambiente (.env)" : "LocalStorage do navegador"}>
                      <Sparkles className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                      {apiKeyStatus.source === "env" ? "Ativa via Env" : "Ativa via Chave Salva"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Modo Simulação
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Insira sua chave do <strong>Google Gemini</strong> para habilitar OCR real diretamente no navegador com alta precisão para etiquetas IATA.
                </p>

                <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <input
                      type={showKeyPassword ? "text" : "password"}
                      value={manualKeyInput}
                      onChange={(e) => setManualKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-[#003087]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none cursor-pointer"
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveKey}
                      className="flex-1 sm:flex-initial bg-[#003087] hover:bg-blue-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                    >
                      Salvar
                    </button>
                    {(apiKeyStatus.geminiKey && apiKeyStatus.source === "localStorage") && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={isTestingKey}
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingKey ? "Testando..." : "Testar"}
                    </button>
                  </div>
                </div>

                {testKeySuccess && (
                  <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                    ✓ {testKeySuccess}
                  </p>
                )}
                {testKeyError && (
                  <p className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 p-2 rounded-xl">
                    ✗ {testKeyError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DIGITAR DADOS MANUALMENTE */}
          {activeTab === "manual" && (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col p-6 space-y-5 transition-all duration-200">
              <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-blue-50 rounded-2xl text-[#003087]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">Lançamento & Digitação Manual</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Cadastre a etiqueta diretamente para adicionar à fila de espera sem necessidade de imagem.
                  </p>
                </div>
              </div>

              {/* MANUAL INPUT FORM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Número da Etiqueta (Bag Tag) *</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={manualForm.bagTag}
                    onChange={(e) => setManualForm(prev => ({ ...prev, bagTag: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                    placeholder="Ex: LA009512347"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-extrabold text-[#003087] outline-none focus:ring-2 focus:ring-[#003087] focus:bg-white"
                  />
                  {manualForm.bagTag && manualForm.bagTag.length > 12 && (
                    <span className="text-[10px] text-amber-600 block pt-0.5 font-bold">Máximo de 12 caracteres alfanuméricos</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Localizador PNR *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={manualForm.pnr}
                    onChange={(e) => setManualForm(prev => ({ ...prev, pnr: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                    placeholder="Ex: XY7G8H (6 caracteres)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-extrabold text-[#E31837] outline-none focus:ring-2 focus:ring-[#E31837] focus:bg-white"
                  />
                  {manualForm.pnr && manualForm.pnr.length !== 6 && (
                    <span className="text-[10px] text-amber-600 block pt-0.5 font-bold">Faltam {6 - manualForm.pnr.length} caracteres</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Número do Voo</label>
                  <input
                    type="text"
                    value={manualForm.flight}
                    onChange={(e) => setManualForm(prev => ({ ...prev, flight: e.target.value.toUpperCase() }))}
                    placeholder="Ex: LA3402"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Cor / Tipo de Mala</label>
                  <input
                    type="text"
                    value={manualForm.corTipo}
                    onChange={(e) => setManualForm(prev => ({ ...prev, corTipo: e.target.value }))}
                    placeholder="Ex: Azul de tecido com fita"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Situação Atual *</label>
                  <select
                    value={manualForm.situacao || "PR"}
                    onChange={(e) => setManualForm(prev => ({ ...prev, situacao: e.target.value as SituacaoType }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-[#003087]"
                  >
                    {Object.entries(SITUACOES).map(([code, config]) => (
                      <option key={code} value={code}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Observações Extras</label>
                  <input
                    type="text"
                    value={manualForm.observacoes}
                    onChange={(e) => setManualForm(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Ex: Danificada ou rasgada"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* LIVE DUPLICATE WARNING BANNER FOR MANUAL FORM */}
              {(() => {
                const manualVal = checkValidation(manualForm.bagTag, manualForm.pnr);
                if (manualVal?.found) {
                  if (manualVal.matchedField === "pnr") {
                    return (
                      <div className="mt-3 p-4 bg-blue-50/90 border border-blue-300 rounded-2xl flex items-start gap-3 text-blue-950 shadow-2xs">
                        <Luggage className="w-5 h-5 text-[#003087] shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1.5 w-full">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-extrabold text-[#003087]">
                              ℹ️ PNR Existente — Múltiplas Bagagens para este Passageiro
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-200/80 px-2 py-0.5 rounded-full text-[#003087]">
                              Volume Adicional
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-[11px]">
                            O localizador <strong className="font-bold text-slate-900">PNR "{manualForm.pnr.toUpperCase()}"</strong> já possui uma etiqueta cadastrada em sistema ({
                              manualVal.source === "baggages" ? "em Bagagens Ativas" : 
                              manualVal.source === "processes" ? `no Processo ID: ${manualVal.processId}` :
                              "na Fila Atual"
                            }). A nova etiqueta <strong className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">"{manualForm.bagTag.toUpperCase() || 'NOVA'}"</strong> será cadastrada normalmente como volume adicional para o mesmo passageiro.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-950 shadow-2xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1.5 w-full">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-extrabold text-amber-950">
                            ⚠️ Etiqueta Repetida Já Cadastrada!
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-900">
                            Aviso de Sincronismo
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          A etiqueta <strong className="font-mono font-extrabold text-[#003087] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">"{manualForm.bagTag.toUpperCase()}"</strong> já consta registrada ({
                            manualVal.source === "baggages" ? "em Bagagens Ativas" : 
                            manualVal.source === "processes" ? `no Processo ID: ${manualVal.processId}` :
                            "na Fila Atual"
                          }).
                        </p>
                        <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-200">
                            ✓ Você pode cadastrar mesmo assim se for um lançamento intencional.
                          </span>
                          {manualVal.item && (
                            <button
                              type="button"
                              onClick={() => {
                                setManualForm(prev => ({
                                  ...prev,
                                  bagTag: manualVal.item.etiqueta || prev.bagTag,
                                  pnr: manualVal.item.pnr || prev.pnr,
                                  flight: manualVal.item.vooOrigem || prev.flight,
                                  corTipo: manualVal.item.corTipo || prev.corTipo,
                                  observacoes: manualVal.item.observacoes || prev.observacoes
                                }));
                              }}
                              className="text-[10px] font-extrabold text-[#003087] hover:underline cursor-pointer"
                            >
                              Sincronizar com registro existente
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={saveManualToStash}
                  disabled={!manualForm.bagTag.trim() || !manualForm.pnr.trim() || loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#003087] hover:bg-blue-800 disabled:bg-slate-200 text-white font-black text-xs py-3 px-5 rounded-2xl shadow-md disabled:shadow-none transition duration-150 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar e Lançar na Fila</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManualForm({ bagTag: "", pnr: "", flight: "", corTipo: "", situacao: "PR", observacoes: "" })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-5 rounded-2xl transition cursor-pointer"
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
                <h4 className="font-black text-[#003087] text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E31837]" /> Etiquetas Digitalizadas ({pendingItems.length})
                </h4>
                {pendingItems.filter(p => !p.loading && !p.error && p.bagTag && p.pnr).length > 1 && (
                  <button
                    onClick={handleSaveAllToStash}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Salvar Todas Válidas
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {pendingItems.map((item) => {
                  const valResult = checkValidation(item.bagTag, item.pnr, item.id);
                  const isTagOk = isIataTagValid(item.bagTag);
                  const isPnrOk = isPnrValid(item.pnr);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="bg-white border-2 border-slate-200 hover:border-[#003087] rounded-3xl p-4 shadow-sm relative overflow-hidden transition-all duration-200"
                    >
                      {/* CARD HEADER */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.loading ? (
                            <RefreshCw className="w-4 h-4 text-[#E31837] animate-spin shrink-0" />
                          ) : item.error ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span className="font-extrabold text-xs text-slate-800 truncate block max-w-[200px]" title={item.fileName}>
                            {item.fileName}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDiscardPending(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
                          title="Descartar este item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {item.loading ? (
                        <div className="py-6 text-center space-y-2">
                          <RefreshCw className="w-7 h-7 text-[#003087] animate-spin mx-auto" />
                          <p className="text-xs text-slate-600 font-extrabold animate-pulse">Lendo dados da etiqueta com Gemini...</p>
                        </div>
                      ) : item.error ? (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-left mb-3 space-y-2.5">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#E31837] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-xs text-red-900">Falha na Leitura com Gemini</p>
                              <p className="mt-0.5 text-[11px] text-red-700 leading-normal font-medium">{item.error}</p>
                            </div>
                          </div>
                          
                          {item.imageDataUrl && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200/50">
                              <button
                                type="button"
                                onClick={() => handleRetryOCR(item)}
                                className="inline-flex items-center gap-1.5 bg-[#E31837] hover:bg-black text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3 animate-none" />
                                Reenviar Foto Novamente
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* CARD FORM */}
                      {!item.loading && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Número da Etiqueta (Bag Tag)*</label>
                            <input
                              type="text"
                              maxLength={12}
                              value={item.bagTag}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, bagTag: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") } : pi))}
                              className={`mt-1 w-full border rounded-xl px-3 py-2 text-xs font-mono font-extrabold tracking-wider outline-none transition-colors ${
                                item.bagTag 
                                  ? (isTagOk ? "border-emerald-400 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-emerald-950" : "border-amber-400 focus:ring-2 focus:ring-amber-500 bg-amber-50/20 text-amber-950")
                                  : "border-slate-300 focus:ring-2 focus:ring-[#003087] text-slate-900 bg-slate-50"
                              }`}
                              placeholder="1 a 12 caracteres (ex: M1XNSX ou LA123456)"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Código da Reserva (PNR)*</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={item.pnr}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, pnr: e.target.value.toUpperCase() } : pi))}
                              className={`mt-1 w-full border rounded-xl px-3 py-2 text-xs font-mono font-extrabold tracking-wider outline-none transition-colors ${
                                item.pnr 
                                  ? (isPnrOk ? "border-emerald-400 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-emerald-950" : "border-amber-400 focus:ring-2 focus:ring-amber-500 bg-amber-50/20 text-amber-950")
                                  : "border-slate-300 focus:ring-2 focus:ring-[#003087] text-slate-900 bg-slate-50"
                              }`}
                              placeholder="6 alfanuméricos"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Situação *</label>
                            <select
                              value={item.situacao || "PR"}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, situacao: e.target.value as SituacaoType } : pi))}
                              className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 bg-white focus:ring-2 focus:ring-[#003087] outline-none"
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
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Voo</label>
                              <input
                                type="text"
                                value={item.flight}
                                onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, flight: e.target.value.toUpperCase() } : pi))}
                                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-slate-400 outline-none"
                                placeholder="Ex: LA8070"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Cor / Tipo</label>
                              <input
                                type="text"
                                value={item.corTipo}
                                onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, corTipo: e.target.value } : pi))}
                                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-slate-400 outline-none"
                                placeholder="Ex: Preta rodinha"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Observações</label>
                            <input
                              type="text"
                              value={item.observacoes || ""}
                              onChange={(e) => setPendingItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, observacoes: e.target.value } : pi))}
                              className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-slate-400 outline-none"
                              placeholder="Observações da bagagem..."
                            />
                          </div>

                          {/* VALIDATION MATCH BANNERS */}
                          {valResult?.found ? (
                            valResult.matchedField === "pnr" ? (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 space-y-1.5 text-left">
                                <div className="flex items-start gap-2">
                                  <Luggage className="w-4 h-4 shrink-0 text-[#003087] mt-0.5" />
                                  <div className="space-y-1 w-full text-xs">
                                    <div className="flex items-center justify-between">
                                      <p className="font-extrabold text-[#003087] text-xs">
                                        ℹ️ PNR Existente em Sistema (Volume Adicional)
                                      </p>
                                      <span className="text-[9px] font-black uppercase tracking-wider bg-blue-200/80 px-2 py-0.5 rounded-full text-[#003087]">
                                        Múltiplas Malas
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-slate-700">
                                      O PNR <strong className="font-bold text-slate-900">"{item.pnr.toUpperCase()}"</strong> já possui a etiqueta <strong className="font-mono font-extrabold text-[#003087] bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">"{valResult.item?.etiqueta || valResult.item?.bagTag || 'S/N'}"</strong> em sistema. Esta nova etiqueta <strong className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">"{item.bagTag.toUpperCase() || 'NOVA'}"</strong> será cadastrada como volume adicional e todas constarão individualmente no arquivo final.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 space-y-1.5 text-left">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                  <div className="space-y-1 w-full text-xs">
                                    <div className="flex items-center justify-between">
                                      <p className="font-black text-amber-950 text-xs">
                                        ⚠️ Etiqueta Repetida Já Cadastrada!
                                      </p>
                                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-900">
                                        Aviso
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-slate-700">
                                      A etiqueta <strong className="font-mono font-extrabold text-[#003087] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">"{item.bagTag.toUpperCase()}"</strong> já consta registrada ({
                                        valResult.source === "baggages" ? "Bagagens Ativas" :
                                        valResult.source === "processes" ? `Processo (ID: ${valResult.processId})` :
                                        "Outra etiqueta na fila"
                                      }).
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : valResult?.found === false ? (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2 text-left text-[10px]">
                              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                              <div>
                                <p className="font-extrabold text-emerald-950">Novo Registro Validade</p>
                                <p className="leading-relaxed text-emerald-800 mt-0.5">Etiqueta inédita pronta para inclusão.</p>
                              </div>
                            </div>
                          ) : null}

                          {/* ACTION BUTTON */}
                          <div className="pt-2 border-t border-slate-100 flex gap-2">
                            <button
                              onClick={() => handleSaveToStash(item)}
                              disabled={!item.bagTag || !item.pnr}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#003087] hover:bg-blue-800 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" /> Lançar na Fila de Espera
                            </button>
                            <button
                              onClick={() => handleDiscardPending(item.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col flex-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-[#E31837] rounded-xl border border-red-100">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                      Fila de Etiquetas Salvas ({savedLists.length})
                    </h4>
                    <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                      {savedLists.filter(b => !b.generated).length} Pendentes
                    </span>
                    {savedLists.some(b => b.generated) && (
                      <span className="text-[9px] font-black bg-blue-100 text-[#003087] border border-blue-200 px-2 py-0.5 rounded-full">
                        {savedLists.filter(b => b.generated).length} Geradas
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Sincronizado em tempo real com o servidor</p>
                </div>
              </div>
              {savedLists.length > 0 && (
                <button
                  id="btn-clear-ocr-stash"
                  onClick={handleClearStash}
                  className="text-xs text-red-600 hover:text-red-700 font-extrabold flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar Fila
                </button>
              )}
            </div>

            {/* STASH LIST LOGS */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
              {savedLists.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#003087]" />
                  <p className="text-xs font-extrabold text-slate-600">Nenhuma etiqueta na fila no momento.</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Escaneie uma foto ou digite manualmente para acumular dados para o formulário PIR.
                  </p>
                </div>
              ) : (
                savedLists.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200/90 rounded-2xl flex items-start justify-between gap-3 text-xs transition duration-150"
                  >
                    <div className="font-mono space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-500 text-[10px] uppercase font-sans">Tag:</span>
                        <span className="text-[#003087] font-black text-sm tracking-wider">{item.etiqueta}</span>
                        {item.situacao && SITUACOES[item.situacao as SituacaoType] && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${SITUACOES[item.situacao as SituacaoType].bg}`}>
                            {SITUACOES[item.situacao as SituacaoType].label}
                          </span>
                        )}
                        {item.generated ? (
                          <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-sans uppercase">
                            ✓ Em Processo
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-sans uppercase">
                            ⏱️ Pendente
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                        <p><span className="text-slate-400 font-sans text-[10px] uppercase font-semibold">Reserva (PNR):</span> <strong className="text-[#E31837] tracking-wider">{item.pnr}</strong></p>
                        <p><span className="text-slate-400 font-sans text-[10px] uppercase font-semibold">Voo:</span> <strong className="text-slate-800">{item.vooOrigem || "-"}</strong></p>
                      </div>
                      {item.corTipo && (
                        <p className="text-[11px] text-slate-600 font-sans font-medium">
                          <span className="font-bold text-slate-500">Mala:</span> {item.corTipo}
                        </p>
                      )}
                    </div>
                    <button
                      id={`btn-remove-stash-${item.id}`}
                      onClick={() => handleRemoveFromStash(item.id)}
                      className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-xl transition cursor-pointer"
                      title="Excluir desta fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {savedLists.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 bg-blue-50/60 p-3 rounded-2xl border border-blue-100/80 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#003087] shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-950 font-medium leading-relaxed">
                  <strong>Ótimo trabalho!</strong> As <strong>{savedLists.length} etiquetas</strong> da fila acima serão importadas automaticamente no formulário da aba <strong>Novo Processo</strong>.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* CANVAS HELPER FOR SCREENSHOT GENERATION */}
      <canvas ref={canvasRef} className="hidden" />

      {/* POPUP MODAL PARA AVISO DE ETIQUETA / RESERVA JÁ BIPADA */}
      <DuplicatePnrModal 
        isOpen={duplicatePnrModalOpen} 
        onClose={() => setDuplicatePnrModalOpen(false)} 
        info={duplicatePnrInfo} 
      />
    </div>
  );
}
