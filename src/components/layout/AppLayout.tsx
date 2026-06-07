import React, { useState, useEffect } from "react";
import { 
  FileText, 
  LayoutDashboard, 
  History, 
  QrCode, 
  Plane, 
  HelpCircle,
  LogOut,
  Menu,
  X,
  Edit2,
  Check,
  UserCheck
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: { nome: string; matricula: string };
  onActiveUserChange: (user: { nome: string; matricula: string }) => void;
}

export default function AppLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  activeUser, 
  onActiveUserChange 
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNome, setEditNome] = useState(activeUser.nome);
  const [editMatricula, setEditMatricula] = useState(activeUser.matricula);

  // Sync edits when active user updates
  useEffect(() => {
    setEditNome(activeUser.nome);
    setEditMatricula(activeUser.matricula);
  }, [activeUser]);

  const handleSave = () => {
    if (!editNome.trim() || !editMatricula.trim()) {
      alert("Nome e Matrícula são obrigatórios!");
      return;
    }
    onActiveUserChange({
      nome: editNome.trim(),
      matricula: editMatricula.trim()
    });
    setIsEditing(false);
  };

  const menuItems = [
    { id: "novo", label: "Novo Processo", icon: FileText, desc: "Formulário PIR / Receita Federal" },
    { id: "ocr", label: "Ler Etiqueta (OCR)", icon: QrCode, desc: "Escaneamento de bagagens e tags" },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Acompanhamento e contadores" },
    { id: "historico", label: "Histórico & Lixeira", icon: History, desc: "Processos e lixeira de descarte" },
  ];

  return (
    <div id="latam-app" className="min-h-screen bg-[#f8f9fa] flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      {/* MOBILE BAR */}
      <header id="mobile-header" className="md:hidden bg-[#003087] text-white p-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center">
          <div className="bg-white px-3.5 py-1.5 rounded-lg flex items-center justify-center shadow-md">
            <img 
              src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
              alt="Logo LATAM" 
              className="h-4 object-contain"
            />
          </div>
        </div>
        <button 
          id="btn-mobile-menu"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 focus:outline-none hover:bg-blue-900 rounded transition"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside 
        id="sidebar" 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a255c] text-white flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen shadow-2xl shrink-0 md:relative overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* SIDEBAR LOGO */}
        <div className="p-6 border-b border-white/10 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center w-full justify-center md:justify-start">
              <div className="bg-white px-5 py-3 rounded-xl flex items-center justify-center shadow-xl border border-white/20 transition-transform duration-300 hover:scale-[1.03] w-full">
                <img 
                  src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
                  alt="Logo LATAM Airlines" 
                  className="h-6 w-auto object-contain select-none"
                />
              </div>
            </div>
            <button 
              id="btn-close-sidebar"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MENU ITEMS (OPERACIONAL) */}
        <nav 
          id="sidebar-nav" 
          className="flex-1 py-4 space-y-0.5 relative overflow-y-auto"
          style={{
            backgroundImage: "linear-gradient(to bottom, rgba(10, 37, 92, 0.55), rgba(5, 17, 41, 0.75)), url('https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/ade4ea0e9_image.jpg')",
            backgroundSize: "100% auto",
            backgroundRepeat: "repeat",
            backgroundPosition: "top center"
          }}
        >
          <div className="px-6 py-2 text-[10px] uppercase tracking-widest text-blue-300 font-extrabold mb-2 relative z-10">Operacional</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`relative z-10 w-full flex items-center gap-3 px-6 py-3 text-left text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-[#E31837] text-white font-bold shadow-md border-r-4 border-white/85"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5 opacity-90" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* BOTTOM PROFILE CARD - RESPONSIBLE SIGNATURE INSTANT EDIT */}
        <div className="p-5 bg-[#051129]/80 backdrop-blur-md border-t border-white/10 shrink-0 text-left relative z-10">
          {isEditing ? (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-orange-400 font-extrabold">Editar Funcionário Responsável:</div>
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] text-blue-300 uppercase block font-semibold">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editNome} 
                    onChange={(e) => setEditNome(e.target.value)} 
                    className="w-full bg-blue-900/40 border border-blue-700/60 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-red-500 font-medium"
                    placeholder="Nome do responsável"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-blue-300 uppercase block font-semibold">Matrícula GRU</label>
                  <input 
                    type="text" 
                    value={editMatricula} 
                    onChange={(e) => setEditMatricula(e.target.value)} 
                    className="w-full bg-blue-900/40 border border-blue-700/60 rounded px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-red-500 font-mono"
                    placeholder="GRU-XXXX"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase py-1 rounded shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" /> Salvar
                </button>
                <button 
                  onClick={() => {
                    setEditNome(activeUser.nome);
                    setEditMatricula(activeUser.matricula);
                    setIsEditing(false);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[10px] uppercase py-1 rounded cursor-pointer"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-blue-300 font-extrabold">Responsável Ativo (Filtro):</div>
                <div className="text-sm text-white font-bold mt-1 max-w-[130px] truncate" title={activeUser.nome}>
                  {activeUser.nome}
                </div>
                <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                  Matrícula: {activeUser.matricula}
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1 px-2 rounded bg-blue-900/50 hover:bg-blue-900 text-slate-200 hover:text-white transition duration-150 flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer"
                title="Trocar operador a qualquer momento"
              >
                <Edit2 className="w-3 h-3" /> Mudar
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* OVERLAY MAPS (MOBILE) */}
      {sidebarOpen && (
        <div 
          id="sidebar-overlay"
          className="fixed inset-0 bg-black/50 z-35 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main id="app-viewport" className="flex-1 flex flex-col min-w-0 overflow-y-auto md:h-screen pb-16 md:pb-0">
        {/* DESKTOP TOP BAR */}
        <header id="desktop-header" className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0 shadow-xs">
          <div>
            <h1 className="text-sm font-semibold text-[#003087] flex items-center gap-2">
              Conciliação de Bagagens Irregulares <span className="text-slate-300">|</span> <span className="text-slate-800 font-bold">{menuItems.find(i => i.id === activeTab)?.label}</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Responsável: {activeUser.nome}</span>
              <p className="text-[10px] font-mono text-slate-500">Matrícula: {activeUser.matricula}</p>
            </div>
            
            <div className="bg-slate-50 px-2 py-1.5 rounded border border-slate-200 flex items-center justify-center">
              <img 
                src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
                alt="Logo LATAM" 
                className="h-3.5 object-contain"
              />
            </div>
          </div>
        </header>

        {/* CONTAINER VIEWPORTS */}
        <div id="tab-holder" className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION - ABAS EM CAMADA (PREMIUM FLOATING FEEL) */}
      <nav id="mobile-bottom-tabs" className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a255c] border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] flex justify-around items-stretch z-45 h-16 pb-safe shrink-0 select-none overflow-hidden">
        {/* Subtle background image decoration matching the main sidebar */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center"
          style={{ 
            backgroundImage: "url('https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/ade4ea0e9_image.jpg')",
          }}
        />
        {/* Protection layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a255c]/90 to-[#051129]/95 pointer-events-none" />

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-tab-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer ${
                isActive 
                  ? "text-white scale-105" 
                  : "text-blue-100/70 hover:text-white"
              }`}
            >
              {/* Layer / Tab physical indicator */}
              {isActive && (
                <div className="absolute top-0 inset-x-2 h-1 bg-[#E31837] rounded-b-md shadow-[0_2px_10px_#E31837]" />
              )}
              
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? "bg-white/15 text-white transform -translate-y-0.5 shadow-md" 
                  : "hover:bg-white/5"
              }`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
              <span className={`text-[9px] tracking-tight mt-0.5 transition-all duration-300 ${
                isActive ? "font-extrabold text-white" : "font-medium text-blue-200"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
