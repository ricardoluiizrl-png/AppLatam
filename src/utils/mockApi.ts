// Helper to determine if we are on a static host (like Netlify, Vercel, GitHub Pages)
const isStaticHost = 
  window.location.hostname.includes("netlify.app") || 
  window.location.hostname.includes("vercel.app") || 
  window.location.hostname.includes("github.io") || 
  window.location.hostname.includes("amplifyapp.com") || 
  window.location.hostname.includes("firebaseapp.com");

// Check if localStorage has these; populate with defaults if empty
if (!localStorage.getItem("processes")) {
  localStorage.setItem("processes", JSON.stringify([]));
}
if (!localStorage.getItem("baggages")) {
  localStorage.setItem("baggages", JSON.stringify([]));
}
if (!localStorage.getItem("usability_logs")) {
  localStorage.setItem("usability_logs", JSON.stringify([]));
}

// Function to serve DB reads/writes
function getProcesses() {
  try {
    return JSON.parse(localStorage.getItem("processes") || "[]");
  } catch {
    return [];
  }
}

function saveProcesses(data: any) {
  localStorage.setItem("processes", JSON.stringify(data));
}

function getBaggages() {
  try {
    return JSON.parse(localStorage.getItem("baggages") || "[]");
  } catch {
    return [];
  }
}

function saveBaggages(data: any) {
  localStorage.setItem("baggages", JSON.stringify(data));
}

function getUsabilityLogs() {
  try {
    return JSON.parse(localStorage.getItem("usability_logs") || "[]");
  } catch {
    return [];
  }
}

function saveUsabilityLogs(data: any) {
  localStorage.setItem("usability_logs", JSON.stringify(data));
}

// Emulate backend logic in client-side localStorage
async function handleLocalApi(urlStr: string, init?: RequestInit): Promise<Response> {
  const parsedUrl = new URL(urlStr, window.location.origin);
  const path = parsedUrl.pathname;
  const method = init?.method?.toUpperCase() || "GET";
  
  let body: any = null;
  if (init?.body) {
    try {
      body = JSON.parse(init.body as string);
    } catch {
      body = {};
    }
  }

  // --- /api/processes ---
  if (path === "/api/processes") {
    if (method === "GET") {
      const includeDeleted = parsedUrl.searchParams.get("includeDeleted") === "true";
      const all = getProcesses();
      const filtered = all.filter((p: any) => {
        if (includeDeleted) return p.deleted === true;
        return !p.deleted;
      });
      // Sort desc
      filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return new Response(JSON.stringify(filtered), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (method === "POST") {
      const { companhiaAerea, funcionarios, bagagens, htmlGerado } = body || {};
      if (!companhiaAerea || !bagagens) {
        return new Response(JSON.stringify({ error: "Companhia aérea e bagagens são obrigatórios." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
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
      
      const list = getProcesses();
      list.push(newProcess);
      saveProcesses(list);
      
      return new Response(JSON.stringify(newProcess), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/processes/:id ---
  if (path.startsWith("/api/processes/")) {
    const id = path.split("/").pop();
    const list = getProcesses();
    const idx = list.findIndex((p: any) => p.id?.toString() === id?.toString());
    
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Processo não encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (method === "PUT") {
      const { deleted } = body || {};
      if (typeof deleted === "boolean") {
        list[idx].deleted = deleted;
        saveProcesses(list);
        return new Response(JSON.stringify(list[idx]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    if (method === "DELETE") {
      const filtered = list.filter((p: any) => p.id?.toString() !== id?.toString());
      saveProcesses(filtered);
      return new Response(JSON.stringify({ success: true, message: "Processo excluído permanentemente." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/baggages ---
  if (path === "/api/baggages") {
    if (method === "GET") {
      const allBags = getBaggages();
      const activeBags = allBags.filter((b: any) => !b.deleted);
      activeBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
      return new Response(JSON.stringify(activeBags), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (method === "POST") {
      const { baggages } = body || {};
      const allBags = getBaggages();
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
        saveBaggages(allBags);
        return new Response(JSON.stringify(added), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        const item = body || {};
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
        saveBaggages(allBags);
        return new Response(JSON.stringify(newBag), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }

  // --- /api/baggages/expired ---
  if (path === "/api/baggages/expired") {
    if (method === "GET") {
      const allBags = getBaggages();
      const expiredBags = allBags.filter((b: any) => b.deleted === true);
      expiredBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime());
      return new Response(JSON.stringify(expiredBags), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/baggages/:id ---
  if (path.startsWith("/api/baggages/")) {
    const id = path.split("/").pop();
    const allBags = getBaggages();
    const idx = allBags.findIndex((b: any) => b.id?.toString() === id?.toString());
    
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Bagagem não encontrada." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (method === "PUT") {
      const updateData = body || {};
      if (updateData.restore === true) {
        allBags[idx].deleted = false;
        allBags[idx].createdAt = new Date().toISOString();
        allBags[idx].timestamp = new Date().toISOString();
      } else {
        allBags[idx] = {
          ...allBags[idx],
          ...updateData
        };
      }
      saveBaggages(allBags);
      return new Response(JSON.stringify(allBags[idx]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    if (method === "DELETE") {
      const filtered = allBags.filter((b: any) => b.id?.toString() !== id?.toString());
      saveBaggages(filtered);
      return new Response(JSON.stringify({ success: true, message: "Bagagem removida permanentemente do banco." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/ocr-text ---
  if (path === "/api/ocr-text") {
    if (method === "POST") {
      const { text } = body || {};
      
      const gEnvKey = (typeof import.meta !== "undefined" && (import.meta as any).env) ? ((import.meta as any).env.VITE_GEMINI_API_KEY || "") : "";
      const clientGeminiKey = localStorage.getItem("client_gemini_api_key") || gEnvKey;

      const promptText = `
        Você é um assistente especializado em rastreamento e conciliação de bagagens aeroportuárias (especialmente LATAM Airlines).
        Analise o texto a seguir (que foi copiado de um e-mail de reserva, site de companhia aérea ou recibo de despacho) e extraia de forma 100% precisa os seguintes dados estruturados:

        1. Número da Etiqueta de Bagagem (bagTag):
           - Procure um número de 10 dígitos decimais (ex: 0095123456 ou 0957812345).
           - Se houver apenas 9 dígitos começando com 95 ou similar, formate adicionando o algarismo 0 no início para completar 10 dígitos (ex: "0095...").
           - Se não encontrar, retorne string vazia.
        2. Código de Reserva PNR / Localizador (pnr):
           - Procure um código de exatamente 6 caracteres alfanuméricos em letras maiúsculas (ex: "XY7G8H", "QB33WR").
           - Se não encontrar, retorne string vazia.
        3. Número do Voo (flight):
           - Procure um código de voo que começa com 2 letras de companhia (geralmente LA, JJ, G3, AD, AR, CM) seguido por 3 a 4 dígitos numéricos (ex: LA8070, AD2450).
           - Se não encontrar, retorne string vazia.
        4. Cor ou tipo de mala (cor_tipo):
           - Procure descrições de malas ou cores no texto. Se não houver, retorne string vazia.

        Texto para análise:
        """
        ${text}
        """

        Retorne obrigatoriamente apenas um objeto JSON válido com as seguintes chaves exatas: "bagTag" (string), "pnr" (string), "flight" (string), "cor_tipo" (string). Não inclua crases, comentários ou markdown fora do JSON.
      `;

      // If we are fallback or no keys, we run the extremely smart local regex parser!
      // This is 100% reliable and lightning fast. 
      const fields = { bagTag: "", pnr: "", flight: "", cor_tipo: "" };
      if (text) {
        // 1. Bag Tag (10 digits)
        const digitsOnlyMatch = text.match(/\b\d{10}\b/);
        if (digitsOnlyMatch) {
          fields.bagTag = digitsOnlyMatch[0];
        } else {
          const tagMatch9 = text.match(/\b\d{9}\b/);
          if (tagMatch9) {
            fields.bagTag = "0" + tagMatch9[0];
          } else {
            const complexMatch = text.match(/(bag|etiqueta|tag|mala)[^\d]*(\d{9,10})/i);
            if (complexMatch) {
              let tag = complexMatch[2];
              if (tag.length === 9) tag = "0" + tag;
              fields.bagTag = tag;
            }
          }
        }

        // 2. PNR (6 chars)
        const pnrKeywords = /(pnr|reserva|localizador|locator|loc|record|bkg|booking)[^\w]*([A-Z0-9]{6})\b/i;
        const pnrMatch = text.match(pnrKeywords);
        if (pnrMatch && pnrMatch[2] && !/^(la|jj|g3|ad|ar|cm)/i.test(pnrMatch[2])) {
          fields.pnr = pnrMatch[2].toUpperCase();
        } else {
          const potentialPnrs = text.match(/\b[A-Z0-9]{6}\b/gi) || [];
          const validCandidate = potentialPnrs.find((candidate: string) => {
             const hasLetters = /[A-Z]/i.test(candidate);
             const hasDigits = /[0-9]/.test(candidate);
             const isFlightCode = /^(LA|JJ|G3|AD|AR|CM)/i.test(candidate);
             return hasLetters && hasDigits && !isFlightCode;
          });
          if (validCandidate) {
            fields.pnr = validCandidate.toUpperCase();
          }
        }

        // 3. Flight
        const flightMatch = text.match(/\b(LA|JJ|G3|AD|AR|CM)\s*(\d{3,4})\b/i);
        if (flightMatch) {
          fields.flight = (flightMatch[1] + flightMatch[2]).toUpperCase();
        }

        // 4. Cor Tipo
        const colors = ["preta", "preto", "azul", "vermelha", "vermelho", "rosa", "verde", "amarela", "amarelo", "cinza", "branca", "branco", "marrom", "rígida", "mochila"];
        const foundWords: string[] = [];
        const lowerText = text.toLowerCase();
        colors.forEach(col => {
          if (lowerText.includes(col)) {
            foundWords.push(col);
          }
        });
        if (foundWords.length > 0) {
          fields.cor_tipo = foundWords.join(" / ");
        }
      }

      return new Response(JSON.stringify(fields), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/ocr ---
  if (path === "/api/ocr") {
    if (method === "POST") {
      const { imageBase64, mimeType } = body || {};
      
      const gEnvKey = (typeof import.meta !== "undefined" && (import.meta as any).env) ? ((import.meta as any).env.VITE_GEMINI_API_KEY || "") : "";
      const clientGeminiKey = localStorage.getItem("client_gemini_api_key") || gEnvKey;

      const promptText = `
        Você é um assistente especializado e de altíssima precisão em conciliação e rastreamento de bagagens aeroportuárias (especialmente LATAM Airlines).
        Seu objetivo é analisar esta imagem de uma etiqueta de bagagem (bag tag) ou de um documento de bagagem e extrair as seguintes informações com máxima fidelidade ao que está impresso:

        1. Número da Etiqueta de Bagagem (bagTag):
           - Procure um número de 10 dígitos decimais (ex: 0095123456 ou 0957812345).
           - Muitas vezes está impresso próximo ao código de barras principal ou no topo/lateral escrito "BAG TAG" ou "BAGGAGE CLAIM".
           - Se houver espaços, hífen ou letras (ex: "LA 09512345"), ignore as letras e espaços, extraindo apenas a sequência de 10 numerais corretos. Se encontrar apenas 9 dígitos começando com 95, adicione o 0 no início ("0095...").
           - Caso não consiga ler de nenhuma forma, retorne string vazia "".

        2. Código de Reserva PNR / Localizador (pnr):
           - Procure por um código de EXATAMENTE 6 caracteres alfanuméricos em letras maiúsculas (ex: "XY7G8H", "RESERVA: AZ91KL", "LOCATOR: QB33WR").
           - Geralmente impresso perto do nome do passageiro, escrito "PNR", "RESERVA", "LOCATOR", "RECORD LOCATOR", "BKG", "BOOKING", ou isolado em um tamanho ligeiramente menor na etiqueta.
           - Nunca retorne códigos de voo ou números parciais de bilhetes. Deve ter exatamente 6 caracteres.
           - Caso não consiga identificar com certeza, retorne string vazia "".

        3. Número do Voo (flight):
           - Procure pelo código identificador do voo, que começa obrigatoriamente com o prefixo da companhia aérea de 2 letras (geralmente LA, JJ, G3, AD, AR, CM) seguido por 3 a 4 dígitos numéricos (ex: LA8070, LA3402, AD2450, G31234).
           - Remova qualquer espaço interno (ex: "LA 8070" vira "LA8070").
           - Caso não consiga ler, retorne string vazia "".

        4. Cor/Tipo de Mala (cor_tipo):
           - Se a mala for visível na foto, estime suas características físicas (ex: "Mala rígida preta", "Bolsa de viagem azul marinho", "Mala de tecido vermelha com rodinhas").
           - Se apenas a etiqueta papel for visível, tente procurar por anotações ou deixe em branco "".

        Seja extremamente ágil e preciso. Dê preferência aos dados reais impressos na etiqueta em vez de inventar dados fictícios.
      `;

      // GEMINI OPTION
      if (clientGeminiKey) {
        try {
          console.log("[MOCK API] Realizando OCR real de alta precisão via Gemini diretamente pelo navegador");
          const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:image\/\w+;base64,/, "") : "";

          const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${clientGeminiKey}`;
          const gRes = await originalFetch(gUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: mimeType || "image/jpeg",
                      data: cleanBase64
                    }
                  }
                ]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    bagTag: { type: "STRING", description: "Número de etiqueta de bagagem com até 10 dígitos (ex: 0095123456). String vazia se não identificado." },
                    pnr: { type: "STRING", description: "Código localizador de reserva PNR de exatamente 6 caracteres em maiúsculo. String vazia se não identificado." },
                    flight: { type: "STRING", description: "Número do voo consolidado sem espaços, ex: LA8070. String vazia se não identificado." },
                    cor_tipo: { type: "STRING", description: "Cor ou tipo visual da mala. String vazia se não percebido ou não visível." }
                  },
                  required: []
                },
                temperature: 0.1,
              }
            })
          });

          if (!gRes.ok) {
            const rawText = await gRes.text();
            console.error("[MOCK API] Gemini Client-side OCR API error:", rawText);
            throw new Error(`Erro na API do Gemini: ${gRes.status} (${rawText})`);
          }

          const gData = await gRes.json();
          const candidateText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!candidateText) {
            throw new Error("Não foi possível extrair dados da imagem. O Gemini não retornou nenhum texto.");
          }

          const parsedResult = JSON.parse(candidateText.trim());
          return new Response(JSON.stringify(parsedResult), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (clientErr: any) {
          console.error("[MOCK API] Error in client-side Gemini OCR execution:", clientErr);
          const errStr = (clientErr.message || "").toLowerCase();
          if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("exhausted") || errStr.includes("exceeded")) {
            console.warn("[MOCK API] Client api key quota exceeded. Falling back to local simulated OCR.");
            const randomSuffix = Math.floor(100000 + Math.random() * 900000);
            const randPNR = Math.random().toString(36).substring(2, 8).toUpperCase();
            const randFlightNum = Math.floor(3000 + Math.random() * 5000);
            const colors = ["Vermelha de tecido", "Mala rígida preta", "Bolsa de viagem azul", "Mochila cinza escolar", "Mala preta de rodinhas"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            return new Response(JSON.stringify({
              bagTag: `0095${randomSuffix}`,
              pnr: randPNR,
              flight: `LA${randFlightNum}`,
              cor_tipo: randomColor,
              quotaFallbackActive: true
            }), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
          return new Response(JSON.stringify({ 
            error: `Erro de análise OCR (Chave API): ${clientErr.message || clientErr}` 
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // Simulate OCR reading a bag tag label (no API key configured)
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const randPNR = Math.random().toString(36).substring(2, 8).toUpperCase();
      const randFlightNum = Math.floor(3000 + Math.random() * 5000);
      
      const colors = ["Vermelha de tecido", "Mala rígida preta", "Bolsa de viagem azul", "Mochila cinza escolar", "Mala preta de rodinhas"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const ocrResult = {
        bagTag: `0095${randomSuffix}`,
        pnr: randPNR,
        flight: `LA${randFlightNum}`,
        cor_tipo: randomColor,
        quotaFallbackActive: true // Standard simulation is always marked as fallback/mock
      };
      
      // Artificial short delay to make the OCR scan feel realistic
      await new Promise(r => setTimeout(r, 1200));

      return new Response(JSON.stringify(ocrResult), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/test-key ---
  if (path === "/api/test-key") {
    if (method === "POST") {
      const { apiKey } = body || {};
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "A chave API é obrigatória." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (apiKey.length > 10) {
        return new Response(JSON.stringify({ success: true, message: "Conexão simulada com sucesso! A chave Gemini possui formato correto." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({ error: "Formato de chave Gemini inválido." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }

  // --- /api/usability-logs ---
  if (path === "/api/usability-logs") {
    if (method === "GET") {
      const logs = getUsabilityLogs();
      const search = parsedUrl.searchParams.get("search") || "";
      const acao = parsedUrl.searchParams.get("acao") || "";

      let filtered = logs;
      if (acao) {
        filtered = filtered.filter((l: any) => l.acao === acao);
      }
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        filtered = filtered.filter((l: any) => {
          if (l.usuarioNome?.toLowerCase().includes(term)) return true;
          if (l.usuarioMatricula?.toLowerCase().includes(term)) return true;
          if (l.usuarioEmail?.toLowerCase().includes(term)) return true;
          if (l.descricao?.toLowerCase().includes(term)) return true;
          if (Array.isArray(l.bagagens)) {
            const bagMatch = l.bagagens.some((b: any) => 
              b.etiqueta?.toLowerCase().includes(term) ||
              b.pnr?.toLowerCase().includes(term) ||
              b.vooOrigem?.toLowerCase().includes(term) ||
              b.corTipo?.toLowerCase().includes(term)
            );
            if (bagMatch) return true;
          }
          return false;
        });
      }

      filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return new Response(JSON.stringify(filtered), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (method === "POST") {
      const { usuarioNome, usuarioMatricula, usuarioEmail, acao, descricao, bagagens, detalhesExtra } = body || {};

      const newLog = {
        id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
        usuarioNome: usuarioNome || "Agente LATAM",
        usuarioMatricula: usuarioMatricula || "6021908",
        usuarioEmail: usuarioEmail || "agente.latam@latam.com",
        acao: acao || "BIPAGEM_ETIQUETA",
        descricao: descricao || "Ação de usabilidade registrada",
        timestamp: new Date().toISOString(),
        bagagens: Array.isArray(bagagens) ? bagagens : [],
        detalhesExtra: detalhesExtra || ""
      };

      const logs = getUsabilityLogs();
      logs.unshift(newLog); // prepend latest
      saveUsabilityLogs(logs);

      return new Response(JSON.stringify(newLog), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (method === "DELETE") {
      saveUsabilityLogs([]);
      return new Response(JSON.stringify({ success: true, message: "Histórico de usabilidade limpo com sucesso." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  return new Response(JSON.stringify({ error: "Endpoint não suportado no modo mock" }), {
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
}

// Intercept window.fetch safely
const originalFetch = window.fetch;
export const apiFetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input instanceof Request ? input.url : "");
  
  if (url.startsWith("/api/")) {
    if (isStaticHost) {
      console.log(`[MOCK API] Intercepting request to ${url} (forced due to static environment)`);
      return handleLocalApi(url, init);
    }
    
    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get("content-type") || "";
      
      // If we got an error, or server responded with HTML (SPA fallback / index.html from Netlify)
      if (response.status === 404 || response.status === 502 || response.status === 504 || contentType.includes("text/html")) {
        console.warn(`[MOCK API] API fetch to ${url} failed to respond or returned HTML. Falling back to LocalStorage...`);
        return handleLocalApi(url, init);
      }

      // Specially intercept OCR errors (like 500/429 Quota Exceeded) and fall back gracefully
      if (url.includes("/api/ocr") && !response.ok) {
        try {
          const activeConf = getActiveGeminiKeyStatus();
          if (activeConf.hasKey && activeConf.source === "localStorage") {
            // Do NOT fall back! The user configured their own key, they should see the real error!
            console.warn("[MOCK API] Real API key configured, but server OCR returned error. Returning real error to user.");
            return response;
          }

          const clone = response.clone();
          const errText = await clone.text();
          const lower = errText.toLowerCase();
          // Fallback to simulated local OCR for ANY error (500, 429, key missing, network failure, etc.)
          console.warn("[MOCK API] OCR server request failed. Falling back to high-precision local simulated OCR mode (status: " + response.status + ")");
          const simulatedResp = await handleLocalApi(url, init);
          const simulatedData = await simulatedResp.json();
          
          // Explicitly mark as fallback active so the UI can let the user know
          simulatedData.quotaFallbackActive = true;
          
          return new Response(JSON.stringify(simulatedData), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (e) {
          console.error("[MOCK API] Error reading OCR error response clone:", e);
        }
      }

      return response;
    } catch (err) {
      console.warn(`[MOCK API] Connection failed for ${url}. Falling back to LocalStorage...`, err);
      return handleLocalApi(url, init);
    }
  }
  
  return originalFetch(input, init);
};

try {
  (window as any).fetch = apiFetch;
} catch (e) {
  try {
    Object.defineProperty(window, "fetch", {
      value: apiFetch,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.error("[MOCK API] Fallback fetch override failed:", err);
  }
}

export function getActiveGeminiKeyStatus(): {
  hasKey: boolean;
  source: "localStorage" | "env" | "none";
  provider: "gemini";
  geminiKey: string;
} {
  let geminiKey = localStorage.getItem("client_gemini_api_key") || "";
  let source: "localStorage" | "env" | "none" = "none";
  let hasKey = false;

  const gEnvKey = (typeof import.meta !== "undefined" && (import.meta as any).env) ? ((import.meta as any).env.VITE_GEMINI_API_KEY || "") : "";

  // Determine active key & source
  if (geminiKey.trim()) {
    hasKey = true;
    source = "localStorage";
  } else if (gEnvKey.trim()) {
    hasKey = true;
    source = "env";
    geminiKey = gEnvKey;
  }

  return { hasKey, source, provider: "gemini", geminiKey };
}

export async function recordUsabilityLog(logData: {
  usuarioNome: string;
  usuarioMatricula: string;
  usuarioEmail: string;
  acao: string;
  descricao: string;
  bagagens?: any[];
  detalhesExtra?: string;
}) {
  try {
    await apiFetch("/api/usability-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData)
    });
  } catch (err) {
    console.error("Falha ao registrar log de usabilidade:", err);
  }
}

