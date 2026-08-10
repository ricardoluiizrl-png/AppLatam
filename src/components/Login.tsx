import React, { useState } from "react";
import { Lock, User, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, Plane } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      const cleanUser = username.trim();
      const cleanPass = password.trim();

      if (cleanUser.toLowerCase() === "naumramos" && cleanPass === "369258147") {
        setIsLoading(false);
        onLoginSuccess("NaumRamos");
      } else {
        setIsLoading(false);
        setError("Usuário ou senha incorretos. Verifique as credenciais.");
      }
    }, 400);
  };

  return (
    <div id="login-page" className="min-h-screen bg-[#0a255c] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* BACKGROUND IMAGE DECORATION WITH LATAM VIBE */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 bg-cover bg-center mix-blend-overlay"
        style={{
          backgroundImage: "url('https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/ade4ea0e9_image.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a255c] via-[#051129] to-[#010919] opacity-95 pointer-events-none" />

      {/* FLOATING LIGHT ACCENTS */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E31837]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* LOGO CONTAINER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white px-8 py-4 rounded-2xl shadow-2xl border border-white/20 mb-4 transform transition hover:scale-105 duration-300">
            <img 
              src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
              alt="LATAM Airlines" 
              className="h-9 w-auto object-contain select-none"
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            Sistema de Conciliação de Bagagens
          </h1>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">
            Acesso Restrito ao Pessoal Operacional
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
            <div className="flex items-center gap-2 text-[#003087]">
              <ShieldCheck className="w-5 h-5 text-[#E31837]" />
              <span className="font-extrabold text-sm uppercase tracking-wider">Identificação do Operador</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-[#003087] rounded-full border border-blue-100 uppercase">
              GRU Airport
            </span>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Usuário do Sistema
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome de usuário (ex: NaumRamos)"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-transparent transition-all"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Senha Privada
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-transparent transition-all font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? "Ocultar" : "Exibir"}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E31837] to-[#b31027] hover:from-[#d01430] hover:to-[#9e0d21] text-white font-bold rounded-xl shadow-lg shadow-red-900/20 text-sm tracking-wide transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              LATAM Airlines Group S.A. • Aeroporto Internacional de Guarulhos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
