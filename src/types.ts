export interface Funcionario {
  id: string;
  nome: string;
  matricula: string;
}

export type SituacaoType =
  | 'PR' // PR - Processo PIR
  | '73' // 73 - Abandonada
  | 'SE' // SE - Sem Etiqueta
  | 'LI' // LI - Liberação
  | 'CI' // CI - Conexão Internacional
  | 'RT' // RT - Retirada
  | 'RP' // RP - Achados e Perdidos
  | 'NE' // NE - Não Embarcado
  | 'OT'; // OT - Outra Situação

export interface Bagagem {
  id: string;
  situacao: SituacaoType;
  etiqueta: string;
  pnr: string;
  vooOrigem: string;
  dataVoo: string;
  corTipo: string;
  observacoes: string;
}

export interface ProcessoPIR {
  id: string;
  companhiaAerea: string;
  funcionarios: Funcionario[];
  bagagens: Bagagem[];
  htmlGerado?: string;
  createdAt: string;
  deleted: boolean;
}

export const SITUACOES: Record<SituacaoType, { label: string; bg: string; text: string }> = {
  PR: { label: 'PR - Processo PIR', bg: 'bg-blue-100 text-blue-800 border-blue-200', text: 'text-blue-800' },
  73: { label: '73 - Abandonada', bg: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-800' },
  SE: { label: 'SE - Sem Etiqueta', bg: 'bg-purple-100 text-purple-800 border-purple-200', text: 'text-purple-800' },
  LI: { label: 'LI - Liberação', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'text-emerald-800' },
  CI: { label: 'CI - Conexão Internacional', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: 'text-indigo-800' },
  RT: { label: 'RT - Retirada', bg: 'bg-teal-100 text-teal-800 border-teal-200', text: 'text-teal-800' },
  RP: { label: 'RP - Achados e Perdidos', bg: 'bg-rose-100 text-rose-800 border-rose-200', text: 'text-rose-800' },
  NE: { label: 'NE - Não Embarcado', bg: 'bg-red-100 text-red-800 border-red-200', text: 'text-red-800 font-semibold' },
  OT: { label: 'OT - Outra Situação', bg: 'bg-slate-100 text-slate-800 border-slate-200', text: 'text-slate-800' },
};
