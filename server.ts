import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "20mb" }));

// Initialize local DB path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "processes.json");
const BAG_DB_PATH = path.join(DATA_DIR, "baggages.json");

// Ensure DB exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), "utf-8");
}
if (!fs.existsSync(BAG_DB_PATH)) {
  fs.writeFileSync(BAG_DB_PATH, JSON.stringify([], null, 2), "utf-8");
}

// DB Helpers
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler DB:", err);
    return [];
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao gravar no DB:", err);
  }
}

function readBagDB() {
  try {
    const data = fs.readFileSync(BAG_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler bagagens DB:", err);
    return [];
  }
}

function writeBagDB(data: any) {
  try {
    fs.writeFileSync(BAG_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao gravar bagagens no DB:", err);
  }
}

// 1. API: Get all processes
app.get("/api/processes", (req, res) => {
  const includeDeleted = req.query.includeDeleted === "true";
  const all = readDB();
  
  // By default, only return active processes (deleted === false)
  const filtered = all.filter((p: any) => {
    if (includeDeleted) return p.deleted === true;
    return !p.deleted;
  });
  
  // Sort by date descending
  filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(filtered);
});

// 2. API: Create process
app.post("/api/processes", (req, res) => {
  const { companhiaAerea, funcionarios, bagagens, htmlGerado } = req.body;
  
  if (!companhiaAerea || !bagagens || !Array.isArray(bagagens)) {
    return res.status(400).json({ error: "Companhia aérea e bagagens são obrigatórios." });
  }

  const newProcess = {
    id: "pir_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    companhiaAerea,
    funcionarios: funcionarios || [],
    bagagens,
    htmlGerado,
    createdAt: new Date().toISOString(),
    deleted: false
  };

  const db = readDB();
  db.push(newProcess);
  writeDB(db);

  // Update central baggages DB to mark them as generated
  try {
    const allBags = readBagDB();
    const bagIdsToMark = bagagens.map((b: any) => b.id?.toString());
    let changed = false;
    allBags.forEach((b: any) => {
      if (bagIdsToMark.includes(b.id?.toString())) {
        b.generated = true;
        changed = true;
      }
    });
    if (changed) {
      writeBagDB(allBags);
    }
  } catch (err) {
    console.error("Erro ao atualizar bagagens para geradas:", err);
  }

  res.status(201).json(newProcess);
});

// 3. API: Toggle Soft Delete (Move to Lixeira / Restaurar)
app.put("/api/processes/:id", (req, res) => {
  const { id } = req.params;
  const { deleted } = req.body;

  if (typeof deleted !== "boolean") {
    return res.status(400).json({ error: "Campo 'deleted' deve ser booleano." });
  }

  const db = readDB();
  const processIndex = db.findIndex((p: any) => p.id?.toString() === id?.toString());

  if (processIndex === -1) {
    return res.status(404).json({ error: "Processo não encontrado." });
  }

  db[processIndex].deleted = deleted;
  writeDB(db);

  res.json(db[processIndex]);
});

// 4. API: Delete Permanently
app.delete("/api/processes/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const filtered = db.filter((p: any) => p.id?.toString() !== id?.toString());

  if (db.length === filtered.length) {
    return res.status(404).json({ error: "Processo não encontrado." });
  }

  writeDB(filtered);
  res.json({ success: true, message: "Processo excluído permanentemente." });
});

// Baggage API 1: Get active baggages (all baggages in queue that are not deleted)
app.get("/api/baggages", (req, res) => {
  const allBags = readBagDB();
  // Active means NOT deleted
  const activeBags = allBags.filter((b: any) => !b.deleted);

  // Sort descending
  activeBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
  res.json(activeBags);
});

// Baggage API 2: Get expired or deleted baggages (trash bin)
app.get("/api/baggages/expired", (req, res) => {
  const allBags = readBagDB();
  // Expired means explicitly deleted items
  const expiredBags = allBags.filter((b: any) => b.deleted === true);

  expiredBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
  res.json(expiredBags);
});

// Baggage API 3: Create single or multiple baggages (e.g. from OCR or manual)
app.post("/api/baggages", (req, res) => {
  const { baggages } = req.body; // accepts single baggage or list of baggages in { baggages: [...] } or single object
  
  const allBags = readBagDB();
  const nowStr = new Date().toISOString();

  if (Array.isArray(baggages)) {
    const added: any[] = [];
    baggages.forEach((item: any) => {
      const newBag = {
        id: item.id || "bag_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        situacao: item.situacao || "PR",
        etiqueta: item.etiqueta || "",
        pnr: item.pnr || "",
        vooOrigem: item.vooOrigem || "",
        dataVoo: item.dataVoo || new Date().toLocaleDateString("pt-BR"),
        corTipo: item.corTipo || "",
        observacoes: item.observacoes || "",
        createdAt: item.createdAt || nowStr,
        timestamp: item.timestamp || nowStr,
        deleted: false
      };
      allBags.push(newBag);
      added.push(newBag);
    });
    writeBagDB(allBags);
    return res.status(201).json(added);
  } else {
    const item = req.body;
    const newBag = {
      id: item.id || "bag_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      situacao: item.situacao || "PR",
      etiqueta: item.etiqueta || "",
      pnr: item.pnr || "",
      vooOrigem: item.vooOrigem || "",
      dataVoo: item.dataVoo || new Date().toLocaleDateString("pt-BR"),
      corTipo: item.corTipo || "",
      observacoes: item.observacoes || "",
      createdAt: item.createdAt || nowStr,
      timestamp: item.timestamp || nowStr,
      deleted: false
    };
    allBags.push(newBag);
    writeBagDB(allBags);
    return res.status(201).json(newBag);
  }
});

// Baggage API 4: Update single baggage (edit field, delete, or restore)
app.put("/api/baggages/:id", (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const allBags = readBagDB();
  const idx = allBags.findIndex((b: any) => b.id?.toString() === id?.toString());

  if (idx === -1) {
    return res.status(404).json({ error: "Bagagem não encontrada." });
  }

  // If restoring, reset time to keep it alive for another 24 hours on the table
  if (updateData.restore === true) {
    allBags[idx].deleted = false;
    allBags[idx].createdAt = new Date().toISOString();
    allBags[idx].timestamp = new Date().toISOString();
  } else {
    // Merge updates
    allBags[idx] = {
      ...allBags[idx],
      ...updateData
    };
  }

  writeBagDB(allBags);
  res.json(allBags[idx]);
});

// Baggage API 5: Delete baggage permanently
app.delete("/api/baggages/:id", (req, res) => {
  const { id } = req.params;
  const allBags = readBagDB();
  const filtered = allBags.filter((b: any) => b.id?.toString() !== id?.toString());

  if (allBags.length === filtered.length) {
    return res.status(404).json({ error: "Bagagem não encontrada." });
  }

  writeBagDB(filtered);
  res.json({ success: true, message: "Bagagem removida permanentemente do banco." });
});

// API: test-key proxy to verify Gemini without CORS
app.post("/api/test-key", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: "Chave de API do Gemini é obrigatória." });
  }

  try {
    // Default: Gemini 3.6
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "OK" }] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Erro na API Gemini: status ${response.status} (${errorText})` });
    }

    return res.json({ success: true, message: "Conexão com a API do Gemini efetuada com sucesso!" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro de conexão ao servidor de IA." });
  }
});

// Helper to robustly extract and parse JSON from a response string that may contain markdown or extra text
function robustParseJSON(text: string): any {
  let cleanText = text.trim();
  
  // If it starts/ends with markdown code block backticks
  if (cleanText.includes("```")) {
    const lines = cleanText.split("\n");
    let jsonLines: string[] = [];
    let insideBlock = false;
    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        insideBlock = !insideBlock;
        continue;
      }
      if (insideBlock || jsonLines.length > 0) {
        jsonLines.push(line);
      }
    }
    if (jsonLines.length > 0) {
      cleanText = jsonLines.join("\n").trim();
    } else {
      cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();
    }
  }
  
  // Extract only the bracketed JSON object if extra text exists
  const startIdx = cleanText.indexOf("{");
  const endIdx = cleanText.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanText = cleanText.substring(startIdx, endIdx + 1);
  }
  
  return JSON.parse(cleanText);
}

// 4.5. API: Text Parsing via Gemini SDK
app.post("/api/ocr-text", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "O texto para análise é obrigatório." });
  }

  const clientApiKey = (req.headers["x-api-key"] || req.headers["x-gemini-api-key"]) as string | undefined;

  const promptText = `
    Você é um assistente especializado e de extrema precisão em rastreamento e conciliação de bagagens aeroportuárias (especialmente LATAM Airlines).
    Analise o texto a seguir (que foi copiado de um e-mail de reserva, site de companhia aérea, chat ou recibos de despacho em PDF) e extraia com máxima fidelidade e fidelidade os seguintes dados estruturados para a etiqueta e voo:

    1. Número da Etiqueta de Bagagem (bagTag):
       - Geralmente é um número de 10 dígitos decimais (ex: 0095123456 ou 0957812345), mas novas etiquetas da LATAM podem conter LETRAS e NÚMEROS juntos (código alfanumérico, ex: LA123456 ou 0095A6B7).
       - Se houver caracteres com letras e números misturados na etiqueta, extraia a sequência alfanumérica correspondente, removendo apenas hifens ou espaços (geralmente de 8 a 12 caracteres).
       - Se houver apenas 9 dígitos puramente numéricos começando com 9, formate adicionando o algarismo 0 no início para completar 10 dígitos (ex: "09...").
       - Se não encontrar nenhum código de etiqueta válido, deixe a string vazia "".
    2. Código de Reserva PNR / Localizador (pnr):
       - Procure um código de exatamente 6 caracteres alfanuméricos em letras maiúsculas (ex: "XY7G8H", "QB33WR").
       - Mantenha estrito e evite confundir com códigos de voo ou horas.
       - Se não encontrar, deixe a string vazia "".
    3. Número do Voo (flight):
       - Procure um código de voo que começa com 2 letras de companhia (geralmente LA, JJ, G3, AD, AR, CM) conhecido ou não, seguido por 3 a 4 dígitos numéricos (ex: LA8070, AD2450).
       - Se não encontrar, deixe a string vazia "".
    4. Cor ou tipo visual de mala (cor_tipo):
       - Procure cores (preto, azul, vermelho, rosa, verde, amarela, cinza, branca, marrom) ou descrições (mochila, rígida, rodinhas, sacola). Se não houver, deixe a string vazia "".

    Texto para análise:
    """
    ${text}
    """

    Retorne obrigatoriamente apenas um objeto JSON válido com as seguintes chaves exatas: "bagTag" (string), "pnr" (string), "flight" (string), "cor_tipo" (string). Não inclua crases, comentários ou markdown fora do JSON.
  `;

  try {
    // GEMINI DEFAULT
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ 
        error: "Chave de API do Gemini ausente para análise de texto. Por favor adicione sua chave própria nas configurações."
      });
    }

    console.log("[SERVER TEXT OCR] Analisando texto via Gemini 3.6...");
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bagTag: { type: Type.STRING },
            pnr: { type: Type.STRING },
            flight: { type: Type.STRING },
            cor_tipo: { type: Type.STRING }
          }
        },
        temperature: 0.1,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Resposta do Gemini vazia para parsing de texto");

    const parsed = robustParseJSON(resultText);
    return res.json(parsed);
  } catch (error: any) {
    const errorStr = String(error.message || error).toLowerCase();
    const isExpiredError = errorStr.includes("expired") || errorStr.includes("renew the api key") || errorStr.includes("invalid_argument") || errorStr.includes("api_key_invalid");
    const isQuotaError = errorStr.includes("quota") || errorStr.includes("429") || errorStr.includes("exhausted") || errorStr.includes("exceeded");

    if (isExpiredError) {
      return res.status(401).json({
        error: "A chave de API do Gemini expirou ou é inválida. Por favor, insira ou atualize sua própria chave de API do Gemini no painel de configurações abaixo da câmera."
      });
    }
    if (isQuotaError) {
      return res.status(429).json({
        error: "Cota limite atingida do Gemini. Por favor, insira sua própria chave de API do Gemini nas configurações abaixo da câmera para continuar de graça."
      });
    }

    console.error("Erro no processamento de texto OCR:", error);
    res.status(500).json({ error: "Falha ao analisar texto com IA: " + (error.message || error) });
  }
});

// 5. API: OCR via Gemini SDK
app.post("/api/ocr", async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "A imagem em base64 é obrigatória." });
  }

  const clientApiKey = (req.headers["x-api-key"] || req.headers["x-gemini-api-key"]) as string | undefined;

  const promptText = `
    Você é um assistente especializado e de altíssima precisão em leitura de etiquetas de bagagem (especialmente LATAM Airlines).
    Análise esta imagem de etiqueta de bagagem e extraia com máxima fidelidade os campos:

    1. Número da Etiqueta de Bagagem (bagTag):
       - Código alfanumérico ou numérico impresso na etiqueta (entre 1 e 12 caracteres, ex: "0095123456", "M1XNSX", "LA095123").
       - Se houver apenas 9 dígitos numéricos começando com 9, adicione o 0 no início ("09...").
       - Se não encontrar, retorne "".

    2. Código de Reserva PNR / Localizador (pnr):
       - Código de 6 caracteres alfanuméricos em maiúsculas (ex: "M1XNSX", "XY7G8H").
       - Geralmente impresso próximo a "PNR", "RESERVA" ou "LOCATOR".
       - Se não encontrar com certeza, retorne "".

    3. Número do Voo (flight):
       - Código do voo com 2 letras da cia aérea + 3 a 4 números (ex: LA8070, LA3333).
       - Se não encontrar, retorne "".

    4. Cor/Tipo de Mala (cor_tipo):
       - Se a mala for visível na foto, descreva em poucas palavras (ex: "Mala preta", "Bolsa azul").
       - Se não for visível, retorne "".

    Retorne apenas o JSON com as chaves: bagTag, pnr, flight, cor_tipo.
  `;

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // DEFAULT TO GEMINI 3.6
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ 
        error: "Chave de API do Gemini ausente ou expirada. Por favor, adicione sua própria chave de API do Gemini nas configurações abaixo da câmera."
      });
    }

    console.log("[SERVER OCR] Realizando OCR via Gemini 3.6...");
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64,
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bagTag: { type: Type.STRING, description: "Código da etiqueta de bagagem (1 a 12 caracteres)." },
            pnr: { type: Type.STRING, description: "PNR de 6 caracteres." },
            flight: { type: Type.STRING, description: "Número do voo (ex: LA8070)." },
            cor_tipo: { type: Type.STRING, description: "Cor ou tipo da mala." }
          },
          required: []
        },
        temperature: 0.1,
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Resposta do Gemini vazia");
    }

    const parsed = robustParseJSON(resultText);
    res.json(parsed);

  } catch (error: any) {
    const errorStr = String(error.message || error).toLowerCase();
    const isExpiredError = errorStr.includes("expired") || errorStr.includes("renew the api key") || errorStr.includes("invalid_argument") || errorStr.includes("api_key_invalid");
    const isQuotaError = errorStr.includes("quota") || errorStr.includes("429") || errorStr.includes("exhausted") || errorStr.includes("exceeded");

    if (isExpiredError) {
      return res.status(401).json({
        error: "A chave de API global padrão do Gemini expirou ou é inválida. Por favor, insira ou atualize sua própria chave de API do Gemini 3.5 no painel de configurações abaixo da câmera."
      });
    }

    if (isQuotaError) {
      console.warn("[SERVER OCR API] API key quota limit reached or 429.");
      return res.status(429).json({
        error: "Cota limite atingida do Gemini. Para continuar processando com precisão máxima, adicione sua própria chave de API do Gemini 3.5 no painel abaixo da câmera.",
        quotaExceeded: true
      });
    }

    console.error("Erro no processamento de OCR:", error);
    res.status(500).json({ 
      error: "Falha ao analisar imagem com IA: " + (error.message || error) 
    });
  }
});

// Helper to locate static files in public, dist, or root directories
function getStaticFilePath(filename: string): string | null {
  const cleanFilename = filename.replace(/^\//, "");
  const candidate1 = path.join(process.cwd(), "public", cleanFilename);
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.join(process.cwd(), "dist", cleanFilename);
  if (fs.existsSync(candidate2)) return candidate2;
  const candidate3 = path.join(process.cwd(), cleanFilename);
  if (fs.existsSync(candidate3)) return candidate3;
  return null;
}

// Explicit handler for static icons & images to ensure exact Content-Type & CORS for PWABuilder / TWA
app.get(["/icon-192.png", "/icon-512.png"], (req, res) => {
  if (req.path.includes("192")) {
    return res.redirect(301, "https://iili.io/CPBDZeR.png");
  }
  return res.redirect(301, "https://iili.io/CPBDQ5v.png");
});

app.get(["/screenshot-desktop.jpg", "/screenshot-mobile.jpg"], (req, res) => {
  const filePath = getStaticFilePath(req.path);
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg"
    };
    res.setHeader("Content-Type", mimeTypes[ext] || "image/png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(filePath);
  }
  res.status(404).setHeader("Content-Type", "text/plain").send("Icon Not Found");
});

app.get("/manifest.json", (req, res) => {
  const filePath = getStaticFilePath("manifest.json");
  if (filePath) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.sendFile(filePath);
  }
  res.status(404).setHeader("Content-Type", "text/plain").send("Manifest Not Found");
});

app.get("/sw.js", (req, res) => {
  const filePath = getStaticFilePath("sw.js");
  if (filePath) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(filePath);
  }
  res.status(404).setHeader("Content-Type", "text/plain").send("Service Worker Not Found");
});

app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.static(path.join(process.cwd(), "dist")));

// Setup Vite Dev server / production static files
async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LatamTrack Pro Server] Running on http://0.0.0.0:${PORT}`);
  });
}

serveApp();
