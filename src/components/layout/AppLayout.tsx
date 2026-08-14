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
  UserCheck,
  BarChart3,
  Settings,
  Search,
  Bell,
  User,
  Home,
  Luggage,
  Briefcase,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  ExternalLink
} from "lucide-react";
import { 
  AppNotification, 
  getNotifications, 
  subscribeNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications 
} from "../../utils/notifications";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: { nome: string; matricula: string; email?: string };
  onActiveUserChange: (user: { nome: string; matricula: string; email?: string }) => void;
  onLogout?: () => void;
  onReplaySplash?: () => void;
}

export default function AppLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  activeUser, 
  onActiveUserChange,
  onLogout,
  onReplaySplash
}: AppLayoutProps) {
  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop expandable sidebar state (default collapsed like Image 2, expands on 3-lines menu click)
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editNome, setEditNome] = useState(activeUser.nome);
  const [editMatricula, setEditMatricula] = useState(activeUser.matricula);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Load and subscribe to notifications
  useEffect(() => {
    setNotifications(getNotifications());
    const unsubscribe = subscribeNotifications(() => {
      setNotifications(getNotifications());
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

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
    { id: "novo", label: "Novo Processo", mobileLabel: "Novo Processo", icon: Luggage, desc: "Formulário PIR / Receita Federal" },
    { id: "ocr", label: "Ler Etiqueta (OCR)", mobileLabel: "Ler OCR", icon: QrCode, desc: "Escaneamento por Câmera" },
    { id: "dashboard", label: "Dashboard", mobileLabel: "Dashboard", icon: Home, desc: "Acompanhamento e contadores" },
    { id: "estatisticas", label: "Estatísticas & Relatórios", mobileLabel: "Estatísticas", icon: BarChart3, desc: "Análise mensal e relatórios" },
    { id: "historico", label: "Histórico & Lixeira", mobileLabel: "Histórico", icon: Briefcase, desc: "Processos e lixeira de descarte" }
  ];

  const isExpanded = sidebarExpanded || sidebarOpen;

  return (
    <div id="latam-app" className="min-h-screen bg-[#f4f6fa] flex flex-col font-sans text-slate-800 antialiased selection:bg-[#E31837] selection:text-white">
      
      {/* ==================== 1. TOP HEADER BAR (IMAGEM 1) ==================== */}
      <header id="top-header" className="h-14 bg-[#050b28] text-white flex items-center justify-between px-4 md:px-6 shadow-md z-50 shrink-0 border-b border-blue-900/60">
        
        {/* LEFT: LATAM BRANDING (IMAGEM 1 ESQUERDA) */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle button */}
          <button
            id="btn-mobile-menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Abrir Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* LATAM LOGO WITH WHITE DISPLAY TEXT */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={onReplaySplash}>
            <div className="flex items-center justify-center">
              <img 
                src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
                alt="Logo LATAM" 
                className="h-5 w-auto object-contain brightness-0 invert"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-widest text-white font-sans uppercase">LATAM</span>
              <span className="hidden sm:inline-block text-[10px] font-extrabold bg-[#E31837] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                SigBag Pro
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: TOP BAR ICONS (IMAGEM 1 DIREITA: Pesquisa | Notificações | Configurações | Ajuda | Perfil) */}
        <div className="flex items-center gap-2 sm:gap-3 text-blue-100">
          {/* Search Button */}
          <button 
            id="btn-header-search"
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition cursor-pointer" 
            title="Pesquisar bagagem..."
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button 
              id="btn-header-bell"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition cursor-pointer relative" 
              title={`${unreadCount} notificações não lidas`}
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-[#E31837] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#050b28] animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : notifications.length > 0 ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-[#050b28]" />
              ) : null}
            </button>

            {/* NOTIFICATION DROPDOWN MODAL PANEL */}
            {showNotifDropdown && (
              <div 
                id="notif-dropdown-panel"
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {/* PANEL HEADER */}
                <div className="bg-[#050b28] text-white p-4 flex items-center justify-between border-b border-blue-900">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-400" />
                    <h3 className="font-extrabold text-sm tracking-tight">Central de Notificações</h3>
                    {unreadCount > 0 && (
                      <span className="bg-[#E31837] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowNotifDropdown(false)}
                    className="text-blue-200 hover:text-white p-1 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ACTION BAR */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <button 
                      onClick={() => markAllNotificationsAsRead()}
                      className="hover:text-[#003087] transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Marcar lidas</span>
                    </button>
                    <button 
                      onClick={() => clearAllNotifications()}
                      className="hover:text-red-600 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Limpar histórico</span>
                    </button>
                  </div>
                )}

                {/* NOTIFICATIONS LIST */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#003087]" />
                      <p className="text-xs font-bold text-slate-600">Nenhuma notificação no momento</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Notificações de arquivos CSV gerados e erros de leitura de etiqueta aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isCsv = notif.type === "csv_generated";
                      const isError = notif.type === "tag_read_error";

                      return (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (notif.linkTab) {
                              setActiveTab(notif.linkTab);
                              setShowNotifDropdown(false);
                            }
                          }}
                          className={`p-3.5 transition cursor-pointer flex gap-3 items-start ${
                            notif.read ? "bg-white hover:bg-slate-50" : "bg-blue-50/60 hover:bg-blue-50 border-l-4 border-l-[#E31837]"
                          }`}
                        >
                          {/* ICON */}
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            isCsv 
                              ? "bg-emerald-100 text-emerald-700" 
                              : isError 
                              ? "bg-red-100 text-red-700" 
                              : "bg-blue-100 text-[#003087]"
                          }`}>
                            {isCsv ? (
                              <FileSpreadsheet className="w-4 h-4" />
                            ) : isError ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </div>

                          {/* CONTENT */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <h4 className={`text-xs font-extrabold truncate ${
                                isError ? "text-red-900" : isCsv ? "text-emerald-950" : "text-slate-800"
                              }`}>
                                {notif.title}
                              </h4>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-[#E31837] shrink-0" />
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 leading-snug break-words">
                              {notif.message}
                            </p>

                            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(notif.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {notif.linkTab && (
                                <span className="text-[#003087] font-bold flex items-center gap-0.5 hover:underline">
                                  <span>Ir para aba</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <button 
            id="btn-header-settings"
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition cursor-pointer" 
            title="Configurações do Usuário"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>

          {/* Help Circle */}
          <button 
            id="btn-header-help"
            onClick={onReplaySplash}
            className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition cursor-pointer" 
            title="Ajuda e Apresentação"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>

          <div className="h-4 w-px bg-white/20 mx-0.5" />

          {/* User Profile Avatar Circle (Imagem 1 Extrema Direita) */}
          <div className="flex items-center gap-2 pl-1">
            <button
              id="btn-avatar-profile"
              onClick={() => setIsEditing(!isEditing)}
              className="w-8 h-8 rounded-full bg-slate-200 text-[#003087] font-black text-xs flex items-center justify-center shadow-inner cursor-pointer hover:ring-2 hover:ring-white/50 transition border border-white/20"
              title={`${activeUser.nome} (Mat: ${activeUser.matricula}) - Clique para editar`}
            >
              {activeUser.nome ? activeUser.nome.substring(0, 1).toUpperCase() : <User className="w-4 h-4" />}
            </button>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <div className="font-extrabold text-white truncate max-w-[120px]">
                {activeUser.nome}
              </div>
              <div className="text-[10px] text-blue-300 font-mono">
                {activeUser.matricula}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== MAIN BODY: SIDEBAR (IMAGEM 2) + CONTENT ==================== */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ==================== 2. LEFT SIDEBAR (IMAGEM 2) ==================== */}
        <aside 
          id="sidebar" 
          className={`bg-[#050b28] text-white flex flex-col transition-all duration-300 ease-in-out z-40 border-r border-blue-900/40 relative shadow-xl ${
            // Mobile overlay handling
            sidebarOpen ? "fixed inset-y-0 left-0 w-64 z-50" : "hidden md:flex"
          } ${
            // Desktop width expand/collapse
            sidebarExpanded ? "md:w-64" : "md:w-16"
          }`}
        >
          {/* TOP BUTTON: 3 HORIZONTAL LINES (HAMBURGER MENU) TO EXTEND/COLLAPSE SIDEBAR */}
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <button
              id="btn-sidebar-toggle-lines"
              onClick={() => {
                setSidebarExpanded(!sidebarExpanded);
                if (sidebarOpen) setSidebarOpen(false);
              }}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white flex items-center justify-center transition cursor-pointer mx-auto group shadow-xs"
              title={sidebarExpanded ? "Recolher Menu Lateral" : "Expandir Informações das Abas (Clique nas 3 linhas)"}
            >
              <Menu className="w-5 h-5 group-hover:scale-110 transition-transform text-white" />
            </button>

            {/* When expanded, show title */}
            {isExpanded && (
              <div className="flex-1 ml-3 truncate animate-fade-in">
                <span className="text-xs font-black uppercase tracking-wider text-white">Módulos</span>
                <span className="block text-[9px] text-blue-300 font-medium">SigBag Solo</span>
              </div>
            )}

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/70 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SIDEBAR NAVIGATION ITEMS (MATCHING IMAGE 2 RAIL LAYOUT) */}
          <nav id="sidebar-nav" className="flex-1 py-4 px-2 space-y-2 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (sidebarOpen) setSidebarOpen(false);
                  }}
                  className={`relative w-full flex items-center transition-all duration-200 cursor-pointer group rounded-xl ${
                    isExpanded ? "px-3 py-2.5" : "p-2.5 justify-center"
                  } ${
                    isActive
                      ? "bg-white/15 text-white font-bold shadow-md shadow-black/20 ring-1 ring-white/20"
                      : "text-blue-200/80 hover:bg-white/10 hover:text-white"
                  }`}
                  title={`${item.label} - ${item.desc}`}
                >
                  {/* Active Indicator Highlight matching Image 2 */}
                  {isActive && !isExpanded && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#E31837] rounded-r-full" />
                  )}

                  {/* Icon Box */}
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive ? "text-white bg-[#E31837]" : "group-hover:text-white"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Text Label & Description (Visible when expanded) */}
                  {isExpanded && (
                    <div className="ml-3 text-left min-w-0 flex-1 animate-fade-in">
                      <div className="text-xs font-bold truncate leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-blue-300/80 truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* BOTTOM ACTIONS (SETTINGS / LOGOUT) */}
          <div className="p-2 border-t border-white/10 space-y-1 bg-[#03071c]/50">
            {/* Quick Profile/Settings Icon */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`w-full flex items-center transition cursor-pointer rounded-xl ${
                isExpanded ? "px-3 py-2 text-left" : "p-2.5 justify-center"
              } text-blue-200 hover:bg-white/10 hover:text-white`}
              title="Configurações do Operador"
            >
              <Settings className="w-5 h-5 text-blue-300 shrink-0" />
              {isExpanded && (
                <span className="ml-3 text-xs font-semibold truncate animate-fade-in">
                  Configurações
                </span>
              )}
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                id="btn-logout-sidebar"
                onClick={onLogout}
                className={`w-full flex items-center transition cursor-pointer rounded-xl ${
                  isExpanded ? "px-3 py-2 text-left" : "p-2.5 justify-center"
                } text-red-300 hover:bg-red-600/30 hover:text-white`}
                title="Sair do Sistema"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {isExpanded && (
                  <span className="ml-3 text-xs font-bold truncate animate-fade-in">
                    Sair do Sistema
                  </span>
                )}
              </button>
            )}
          </div>
        </aside>

        {/* MOBILE OVERLAY */}
        {sidebarOpen && (
          <div 
            id="sidebar-overlay"
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ==================== MAIN CONTENT VIEWPORT ==================== */}
        <main id="app-viewport" className="flex-1 flex flex-col min-w-0 overflow-y-auto h-[calc(100vh-3.5rem)] pb-16 md:pb-0">
          
          {/* USER PROFILE INLINE DRAWER (WHEN CLICKED SETTINGS/AVATAR) */}
          {isEditing && (
            <div className="m-4 p-4 bg-white border border-blue-200 rounded-2xl shadow-lg animate-fade-in max-w-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#003087]" />
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Editar Dados do Operador Responsável
                  </h3>
                </div>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3">
                <div>
                  <label className="text-xs text-slate-600 font-bold block mb-1">Nome do Agente</label>
                  <input 
                    type="text" 
                    value={editNome} 
                    onChange={(e) => setEditNome(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-bold block mb-1">Matrícula Corporativa</label>
                  <input 
                    type="text" 
                    value={editMatricula} 
                    onChange={(e) => setEditMatricula(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-5 py-2 bg-[#003087] hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE TAB CONTENT */}
          <div id="tab-holder" className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ==================== MOBILE BOTTOM TABS ==================== */}
      <nav id="mobile-bottom-tabs" className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050b28] border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] flex justify-around items-stretch z-45 h-16 pb-safe shrink-0 select-none">
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
                isActive ? "text-white scale-105" : "text-blue-200/60 hover:text-white"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 inset-x-2 h-1 bg-[#E31837] rounded-b-md shadow-[0_2px_10px_#E31837]" />
              )}
              
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive ? "bg-white/15 text-white shadow-md" : ""
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[9px] tracking-tight mt-0.5 text-center px-0.5 ${
                isActive ? "font-extrabold text-white" : "font-medium text-blue-200"
              }`}>
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
