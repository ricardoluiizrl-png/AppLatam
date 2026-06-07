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

// Baggage API 1: Get active baggages (< 24 hours and not deleted)
app.get("/api/baggages", (req, res) => {
  const allBags = readBagDB();
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Active means NOT deleted AND created within the last 24 hours
  const activeBags = allBags.filter((b: any) => {
    const createdTime = new Date(b.createdAt || b.timestamp).getTime();
    const isNew = (now - createdTime) <= ONE_DAY_MS;
    return !b.deleted && isNew;
  });

  // Sort descending
  activeBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
  res.json(activeBags);
});

// Baggage API 2: Get expired or deleted baggages (trash bin / history of items > 24 hours or deleted)
app.get("/api/baggages/expired", (req, res) => {
  const allBags = readBagDB();
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Expired means deleted OR created > 24 hours ago
  const expiredBags = allBags.filter((b: any) => {
    const createdTime = new Date(b.createdAt || b.timestamp).getTime();
    const isOlder = (now - createdTime) > ONE_DAY_MS;
    return b.deleted || isOlder;
  });

  expiredBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
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

// 5. API: OCR via Gemini SDK
app.post("/api/ocr", async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "A imagem em base64 é obrigatória." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(500).json({ 
      error: "Sua chave de API do Gemini não está configurada. Por favor, adicione GEMINI_API_KEY no painel de Secrets no canto superior direito do Google AI Studio."
    });
  }

  try {
    // Lazy-load and initialize modern Gemini SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64,
      }
    };

    const promptText = `
      Você é um assistente especializado em conciliação e rastreamento de bagagens aeroportuárias para a LATAM Airlines.
      Analise esta imagem de etiqueta de bagagem (bag tag) ou formulário.
      Extraia os seguintes três elementos obrigatórios descritos nestas regras:
      1. Código de barras / Número da etiqueta (bagTag): Um código de 10 dígitos (geralmente começa com o código da companhia aérea, por exemplo, '0095' para LATAM). Se houver quebras de linha ou caracteres, limpe deixando apenas os 10 dígitos numéricos.
      2. Código da reserva (pnr): Um código de 6 caracteres alfanuméricos da reserva.
      3. Número do voo (flight): O voo impresso na etiqueta (Ex: LA8070, LA3402, AD2450).
      
      Se algum destes houver incerteza, faça a melhor leitura mecânica possível baseada no OCR visual do aeroporto.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bagTag: { type: Type.STRING, description: "Número de etiqueta de bagagem com exatamente 10 dígitos decimais." },
            pnr: { type: Type.STRING, description: "Código da reserva PNR com exatamente 6 caracteres alfanuméricos em caixa alta." },
            flight: { type: Type.STRING, description: "Número de voo com prefixo de 2 letras seguido de números, ex: LA8070." },
            cor_tipo: { type: Type.STRING, description: "Sugestão de cor ou tipo de mala se perceptível (ex: preta, azul, etc). Senão deixe vazio." }
          },
          required: ["bagTag", "pnr"]
        },
        temperature: 0.1,
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Resposta do Gemini vazia");
    }

    const parsed = JSON.parse(resultText.trim());
    res.json(parsed);

  } catch (error: any) {
    console.error("Erro no processamento de OCR:", error);
    res.status(500).json({ 
      error: "Falha ao analisar imagem com IA: " + (error.message || error) 
    });
  }
});

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
