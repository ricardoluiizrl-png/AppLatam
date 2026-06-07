// Helper to determine if we are on a static host (like Netlify, Vercel, GitHub Pages)
const isStaticHost = 
  window.location.hostname.includes("netlify.app") || 
  window.location.hostname.includes("vercel.app") || 
  window.location.hostname.includes("github.io") || 
  window.location.hostname.includes("amplifyapp.com") || 
  window.location.hostname.includes("firebaseapp.com") ||
  (!window.location.hostname.includes("localhost") && 
   !window.location.hostname.includes("127.0.0.1") && 
   !window.location.hostname.includes("run.app"));

// Check if localStorage has these; populate with defaults if empty
if (!localStorage.getItem("processes")) {
  localStorage.setItem("processes", JSON.stringify([]));
}
if (!localStorage.getItem("baggages")) {
  localStorage.setItem("baggages", JSON.stringify([]));
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
    const idx = list.findIndex((p: any) => p.id === id);
    
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
      const filtered = list.filter((p: any) => p.id !== id);
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
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      const activeBags = allBags.filter((b: any) => {
        const createdTime = new Date(b.createdAt || b.timestamp).getTime();
        const isNew = (now - createdTime) <= ONE_DAY_MS;
        return !b.deleted && isNew;
      });
      
      activeBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
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
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      const expiredBags = allBags.filter((b: any) => {
        const createdTime = new Date(b.createdAt || b.timestamp).getTime();
        const isOlder = (now - createdTime) > ONE_DAY_MS;
        return b.deleted || isOlder;
      });
      
      expiredBags.sort((a: any, b: any) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
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
    const idx = allBags.findIndex((b: any) => b.id === id);
    
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
      const filtered = allBags.filter((b: any) => b.id !== id);
      saveBaggages(filtered);
      return new Response(JSON.stringify({ success: true, message: "Bagagem removida permanentemente do banco." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // --- /api/ocr ---
  if (path === "/api/ocr") {
    if (method === "POST") {
      // Simulate Gemini reading a bag tag label
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const randPNR = Math.random().toString(36).substring(2, 8).toUpperCase();
      const randFlightNum = Math.floor(3000 + Math.random() * 5000);
      
      const colors = ["Vermelha de tecido", "Mala rígida preta", "Bolsa de viagem azul", "Mochila cinza escolar", "Mala preta de rodinhas"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const ocrResult = {
        bagTag: `0095${randomSuffix}`,
        pnr: randPNR,
        flight: `LA${randFlightNum}`,
        cor_tipo: randomColor
      };
      
      // Artificial short delay to make the OCR scan feel realistic
      await new Promise(r => setTimeout(r, 1200));

      return new Response(JSON.stringify(ocrResult), {
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

// Intercept window.fetch
const originalFetch = window.fetch;
window.fetch = async function(input, init) {
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
      return response;
    } catch (err) {
      console.warn(`[MOCK API] Connection failed for ${url}. Falling back to LocalStorage...`, err);
      return handleLocalApi(url, init);
    }
  }
  
  return originalFetch(input, init);
};
