import React from "react";
import { X, AlertTriangle, Luggage, CheckCircle2 } from "lucide-react";

export interface DuplicatePnrInfo {
  pnr: string;
  existingEtiqueta: string;
  newEtiqueta?: string;
  vooOrigem?: string;
  corTipo?: string;
  situacao?: string;
  sourceLabel?: string;
}

interface DuplicatePnrModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: DuplicatePnrInfo | null;
}

export const DuplicatePnrModal: React.FC<DuplicatePnrModalProps> = ({
  isOpen,
  onClose,
  info
}) => {
  if (!isOpen || !info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* TOP ACCENT BAR */}
        <div className="h-2 bg-gradient-to-r from-[#003087] via-amber-500 to-[#E31837]" />

        {/* HEADER WITH CLOSE 'X' BUTTON */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                Reserva Já Bipada!
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Reserva PNR: <span className="text-[#E31837] font-mono font-black">{info.pnr}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Fechar aviso (X)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="px-5 py-3 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Identificamos que a reserva <strong className="font-bold text-slate-800">{info.pnr}</strong> já possui uma etiqueta bipada e registrada em nosso sistema:
          </p>

          {/* HIGHLIGHT BOX WITH ETIQUETA NUMBER */}
          <div className="p-4 bg-blue-50/70 border-2 border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Luggage className="w-3.5 h-3.5 text-[#003087]" /> Número da Etiqueta Bipada
              </span>
              {info.sourceLabel && (
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-[#003087] rounded border border-blue-200">
                  {info.sourceLabel}
                </span>
              )}
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Etiqueta Bipada Anteriormente</p>
              <p className="text-2xl font-black font-mono text-[#003087] tracking-wider mt-0.5">
                {info.existingEtiqueta || "S/N (Sem Número)"}
              </p>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Reserva (PNR)</span>
                <span className="font-mono font-bold text-[#E31837]">{info.pnr}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Voo Origem</span>
                <span className="font-mono font-bold text-slate-700">{info.vooOrigem || "N/A"}</span>
              </div>
              {info.corTipo && (
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Cor / Tipo</span>
                  <span className="font-bold text-slate-700 truncate block">{info.corTipo}</span>
                </div>
              )}
              {info.situacao && (
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Situação</span>
                  <span className="font-extrabold text-[#003087]">{info.situacao}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER ACTION BUTTONS */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#003087] hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Entendi / Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
