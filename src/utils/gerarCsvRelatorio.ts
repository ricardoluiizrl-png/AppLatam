import { ProcessoPIR } from "../types";

export function formatarDataParaCsv(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // If date is already in DD/MM/YYYY format, keep it
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function gerarCsvRelatorio(processo: ProcessoPIR, activeUser?: { nome: string; matricula: string }): string {
  // Exact column fields as requested:
  // DATA_LEITURA | SITUACAO | ETIQUETA | RESERVA | VOO_ORIGEM | DATA_VOO_ORIGE | COR_TIPO | OBSERVACAO
  const headers = [
    "DATA_LEITURA",
    "SITUACAO",
    "ETIQUETA",
    "RESERVA",
    "VOO_ORIGEM",
    "DATA_VOO_ORIGE",
    "COR_TIPO",
    "OBSERVACAO"
  ];

  const dataLeitura = formatarDataParaCsv(processo.createdAt);

  const rows = processo.bagagens.map((bag) => {
    return [
      dataLeitura,
      bag.situacao || "",
      bag.etiqueta || "",
      bag.pnr || "",
      bag.vooOrigem || "",
      formatarDataParaCsv(bag.dataVoo),
      bag.corTipo || "",
      bag.observacoes || ""
    ].map(value => {
      let valStr = String(value ?? "").trim();
      // Handle standard CSV escaping (wrap values with semicolons or quotes inside quotes)
      if (valStr.includes(";") || valStr.includes('"') || valStr.includes("\n") || valStr.includes("\r")) {
        valStr = '"' + valStr.replace(/"/g, '""') + '"';
      }
      return valStr;
    });
  });

  // Extract operator first name and registration number from activeUser parameter, process funcionarios, or fallback
  const userObj = activeUser || processo.funcionarios?.[0] || { nome: "OPERADOR", matricula: "0" };
  const nomeCompleto = userObj.nome || "OPERADOR";
  const matriculaVal = userObj.matricula || "0";
  const primeiroNome = nomeCompleto.trim().split(" ")[0].toUpperCase();
  const signatureString = `${primeiroNome} / ${matriculaVal}`;

  // Signature row matching Row 14 format: 
  // Col A: Data_Leitura, Col B: FC, Col C: 0, Col D: 0, Col E: 0, Col F: 0, Col G: 0, Col H (OBSERVACAO): Operator signature
  const signatureRow = [
    dataLeitura,
    "FC",
    "0",
    "0",
    "0",
    "0",
    "0",
    signatureString
  ].map(value => {
    let valStr = String(value ?? "").trim();
    if (valStr.includes(";") || valStr.includes('"') || valStr.includes("\n") || valStr.includes("\r")) {
      valStr = '"' + valStr.replace(/"/g, '""') + '"';
    }
    return valStr;
  });

  const allRows = [...rows, signatureRow];

  // Combine row elements with semicolons and lines with CRLF to be fully compatible with MS Excel/Sheets
  return [headers.join(";"), ...allRows.map(row => row.join(";"))].join("\r\n");
}

export function gerarNomeArquivoCsv(processo: ProcessoPIR): string {
  try {
    const d = processo.createdAt ? new Date(processo.createdAt) : new Date();
    // If the date is invalid, fallback
    if (isNaN(d.getTime())) {
      return "sobras_latam_relatorio-v1.csv";
    }
    const yyyymmdd = d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const hhmm = String(d.getHours()).padStart(2, "0") +
      String(d.getMinutes()).padStart(2, "0");
    return `sobras_latam_${yyyymmdd}_${hhmm}-v1.csv`;
  } catch {
    return "sobras_latam_relatorio-v1.csv";
  }
}
