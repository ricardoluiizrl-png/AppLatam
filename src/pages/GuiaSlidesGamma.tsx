import React from "react";
import { Download, Presentation, Image as ImageIcon, CheckCircle, ExternalLink } from "lucide-react";

export default function GuiaSlidesGamma() {
  const slides = [
    {
      num: 1,
      titulo: "Aba 1: Login e Acesso Rápido",
      desc: "Autenticação por e-mail, usuário ou botão de atalho direto para NaumRamos (327689).",
      src: "/slides/slide1_login.jpg",
      fileName: "01_aba_login_aqui.jpg"
    },
    {
      num: 2,
      titulo: "Aba 2: Dashboard Operacional",
      desc: "Painel em tempo real com métricas, alertas de conexões rápidas e histórico de pátio.",
      src: "/slides/slide2_dashboard.jpg",
      fileName: "02_aba_dashboard.jpg"
    },
    {
      num: 3,
      titulo: "Aba 3: Novo Processo (Salvar e Conciliar)",
      desc: "Formulário de cadastro PIR com destaque para o botão de SALVAR PROCESSO no rodapé.",
      src: "/slides/slide3_novo_processo.jpg",
      fileName: "03_aba_novo_processo_salvar.jpg"
    },
    {
      num: 4,
      titulo: "Aba 4: Ler Etiqueta (Câmera OCR)",
      desc: "Escaneamento de bag tags por Inteligência Artificial com mira e resultado de conciliação.",
      src: "/slides/slide4_ler_etiqueta.jpg",
      fileName: "04_aba_ler_etiqueta_ocr.jpg"
    },
    {
      num: 5,
      titulo: "Aba 5: Histórico e Exportação CSV",
      desc: "Tabela completa de processos com destaque para o botão verde EXPORTAR CSV.",
      src: "/slides/slide5_historico.jpg",
      fileName: "05_aba_historico_exportar_csv.jpg"
    },
    {
      num: 6,
      titulo: "Aba 6: Estatísticas e Gerador de PDF/E-mail",
      desc: "Análises de desempenho e gerador do relatório em PDF e texto formatado para envio.",
      src: "/slides/slide6_estatisticas.jpg",
      fileName: "06_aba_estatisticas_pdf.jpg"
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#003087] via-[#001d54] to-[#001233] text-white p-6 rounded-2xl shadow-xl border border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#E31837] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1">
              <Presentation className="w-3.5 h-3.5" /> Gamma App Slides
            </span>
            <span className="text-xs text-blue-200 font-bold">6 Imagens Prontas com Anotações</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Imagens dos Slides para Apresentação
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-2xl">
            Abaixo estão todas as 6 imagens anotadas (com círculos vermelhos, setas e números de passos) prontas para você visualizar e baixar diretamente no seu dispositivo para montar seus slides no Gamma App.
          </p>
        </div>

        <a
          href="/slides/slide1_login.jpg"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 bg-white text-[#003087] hover:bg-blue-50 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md transition"
        >
          <ExternalLink className="w-4 h-4 text-[#E31837]" />
          <span>Abrir Galeria Completa</span>
        </a>
      </div>

      {/* GRID DE IMAGENS DOS SLIDES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slides.map((slide) => (
          <div
            key={slide.num}
            className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-all duration-200"
          >
            <div>
              {/* SLIDE CARD HEADER */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#E31837] text-white font-black text-xs flex items-center justify-center shadow-sm">
                    {slide.num}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {slide.titulo}
                  </h3>
                </div>
                <span className="text-[10px] font-bold bg-blue-100 text-[#003087] px-2 py-0.5 rounded-full">
                  Pronta para Slide
                </span>
              </div>

              {/* IMAGE DISPLAY CONTAINER */}
              <div className="p-3 bg-slate-900/5 relative group min-h-[220px] flex items-center justify-center">
                <img
                  src={slide.src}
                  alt={slide.titulo}
                  className="w-full h-auto max-h-[360px] object-contain rounded-lg shadow-sm border border-slate-200"
                  loading="lazy"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="p-4 text-xs text-slate-600 bg-white border-t border-slate-100">
                <p className="leading-relaxed font-medium">{slide.desc}</p>
              </div>
            </div>

            {/* DOWNLOAD BUTTON */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <a
                href={slide.src}
                download={slide.fileName}
                className="w-full py-2.5 px-4 bg-[#003087] hover:bg-blue-900 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-red-400" />
                <span>Baixar Imagem deste Slide ({slide.fileName})</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
