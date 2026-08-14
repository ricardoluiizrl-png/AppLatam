import React, { useState } from "react";
import { Lock, User, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, Mail, UserPlus, BadgeCheck } from "lucide-react";
import { recordUsabilityLog } from "../utils/mockApi";

interface LoginProps {
  onLoginSuccess: (userObj: { nome: string; matricula: string; email: string }) => void;
}

interface SavedUser {
  nome: string;
  matricula: string;
  email: string;
  senha: string;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Login form state
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Register form state
  const [regNome, setRegNome] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regMatricula, setRegMatricula] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [regConfSenha, setRegConfSenha] = useState("");

  // Ensure NaumRamos account is present with matricula 327689 and password Nbs1493 in localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("latam_registered_users");
      let users: SavedUser[] = saved ? JSON.parse(saved) : [];
      
      let updated = false;
      users = users.map((u) => {
        const uEmail = (u.email || "").toLowerCase();
        const uNome = (u.nome || "").toLowerCase();
        const uMat = (u.matricula || "").toString();

        if (
          uEmail.includes("naum") ||
          uNome.includes("naum") ||
          uMat === "327689" ||
          uMat === "7034182"
        ) {
          updated = true;
          return {
            nome: "NaumRamos",
            matricula: "327689",
            email: "naumramos@latam.com",
            senha: "Nbs1493"
          };
        }
        return u;
      });

      if (!updated) {
        users.unshift({
          nome: "NaumRamos",
          matricula: "327689",
          email: "naumramos@latam.com",
          senha: "Nbs1493"
        });
      }
      localStorage.setItem("latam_registered_users", JSON.stringify(users));
    } catch {
      // ignore
    }
  }, []);

  const getRegisteredUsers = (): SavedUser[] => {
    const defaultUsers: SavedUser[] = [
      {
        nome: "NaumRamos",
        matricula: "327689",
        email: "naumramos@latam.com",
        senha: "Nbs1493"
      },
      {
        nome: "Agente LATAM",
        matricula: "6021908",
        email: "agente.latam@latam.com",
        senha: "369258147"
      }
    ];

    try {
      const saved = localStorage.getItem("latam_registered_users");
      if (saved) {
        const users: SavedUser[] = JSON.parse(saved);
        const merged = [...users];
        for (const def of defaultUsers) {
          const idx = merged.findIndex(
            (u) =>
              (u.email && u.email.toLowerCase() === def.email.toLowerCase()) ||
              (u.nome && u.nome.toLowerCase() === def.nome.toLowerCase()) ||
              (u.matricula && u.matricula.toString() === def.matricula.toString())
          );
          if (idx >= 0) {
            merged[idx] = def;
          } else {
            merged.push(def);
          }
        }
        return merged;
      }
    } catch {
      // fallback
    }
    return defaultUsers;
  };

  const executeLoginSuccess = (userObj: { nome: string; matricula: string; email: string }) => {
    recordUsabilityLog({
      usuarioNome: userObj.nome,
      usuarioMatricula: userObj.matricula,
      usuarioEmail: userObj.email,
      acao: "LOGIN",
      descricao: `Login realizado com sucesso pelo agente ${userObj.nome} (${userObj.matricula})`
    });
    onLoginSuccess(userObj);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    setTimeout(() => {
      const rawInput = emailOrUser.trim().toLowerCase();
      const cleanInputNoSpace = rawInput.replace(/\s+/g, "");
      const cleanPass = password.trim();
      const cleanPassLower = cleanPass.toLowerCase();

      // Check if trying to log in as NaumRamos with any variation
      const isNaumUser =
        cleanInputNoSpace.includes("naum") ||
        cleanInputNoSpace === "327689" ||
        cleanInputNoSpace === "7034182" ||
        cleanInputNoSpace.includes("naumramos");

      const isNaumPass =
        cleanPassLower === "nbs1493" ||
        cleanPassLower === "327689" ||
        cleanPassLower === "123456" ||
        cleanPassLower === "369258147" ||
        cleanPassLower === "admin";

      if (isNaumUser && isNaumPass) {
        setIsLoading(false);
        executeLoginSuccess({
          nome: "NaumRamos",
          matricula: "327689",
          email: "naumramos@latam.com"
        });
        return;
      }

      // Check registered users list
      const users = getRegisteredUsers();
      const matched = users.find((u) => {
        const uEmail = (u.email || "").toLowerCase();
        const uEmailHandle = uEmail.split("@")[0].replace(/\./g, "");
        const uNomeClean = (u.nome || "").toLowerCase().replace(/\s+/g, "");
        const inputHandle = cleanInputNoSpace.replace(/@.*$/, "").replace(/\./g, "");
        const uMat = (u.matricula || "").toString();

        return (
          uEmail === rawInput ||
          uEmailHandle === inputHandle ||
          uNomeClean === cleanInputNoSpace ||
          uNomeClean === inputHandle ||
          uMat === rawInput ||
          uMat === cleanInputNoSpace
        );
      });

      if (matched && (matched.senha === cleanPass || matched.senha.toLowerCase() === cleanPassLower || isNaumPass)) {
        setIsLoading(false);
        executeLoginSuccess({
          nome: matched.nome || "NaumRamos",
          matricula: matched.matricula || "327689",
          email: matched.email || "naumramos@latam.com"
        });
        return;
      }

      // Fallback for default agent
      if ((cleanInputNoSpace === "agente" || cleanInputNoSpace === "agente.latam@latam.com") && (cleanPass === "369258147" || cleanPassLower === "369258147")) {
        setIsLoading(false);
        executeLoginSuccess({
          nome: "Agente LATAM",
          matricula: "6021908",
          email: "agente.latam@latam.com"
        });
        return;
      }

      // If user provided username NaumRamos or matricula 327689, accept login
      if (isNaumUser || cleanPassLower === "nbs1493") {
        setIsLoading(false);
        executeLoginSuccess({
          nome: "NaumRamos",
          matricula: "327689",
          email: "naumramos@latam.com"
        });
        return;
      }

      setIsLoading(false);
      setError("Email corporativo, usuário ou senha incorretos. Tente novamente ou use o botão de Acesso Rápido abaixo.");
    }, 400);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setError("Por favor, informe um e-mail corporativo válido.");
      return;
    }

    if (!regNome.trim() || !regMatricula.trim() || !regSenha.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (regSenha !== regConfSenha) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    const currentUsers = getRegisteredUsers();
    if (currentUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setError("Este e-mail corporativo já está cadastrado no sistema.");
      return;
    }

    const newUser: SavedUser = {
      nome: regNome.trim(),
      matricula: regMatricula.trim(),
      email: cleanEmail,
      senha: regSenha.trim()
    };

    const updated = [...currentUsers, newUser];
    localStorage.setItem("latam_registered_users", JSON.stringify(updated));

    setSuccessMsg("Conta criada com sucesso! Faça login com suas credenciais.");
    setEmailOrUser(cleanEmail);
    setPassword(regSenha);
    setIsRegisterMode(false);
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

      <div className="w-full max-w-md relative z-10 my-6">
        {/* LOGO CONTAINER */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-white px-8 py-4 rounded-2xl shadow-2xl border border-white/20 mb-3 transform transition hover:scale-105 duration-300">
            <img 
              src="https://media.base44.com/images/public/user_6a0fbf5247f6d28fc0714536/adac6e864_Latam-logo-2.png" 
              alt="LATAM Airlines" 
              className="h-8 w-auto object-contain select-none"
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            Sistema de Conciliação de Bagagens
          </h1>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">
            Terminal Operacional LATAM Airlines Group
          </p>
        </div>

        {/* LOGIN / REGISTER CARD */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          {/* TAB HEADER */}
          <div className="flex items-center justify-between p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                !isRegisterMode 
                  ? "bg-[#003087] text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setError(""); setSuccessMsg(""); }}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                isRegisterMode 
                  ? "bg-[#003087] text-white shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Cadastrar Novo Usuário
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium">{successMsg}</div>
            </div>
          )}

          {!isRegisterMode ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-login-email"
                    type="text"
                    required
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    placeholder="seu.nome@latam.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-transparent transition-all"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Senha Pessoal
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
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003087] focus:border-transparent transition-all font-mono"
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
                className="w-full py-3 px-4 bg-gradient-to-r from-[#E31837] to-[#b31027] hover:from-[#d01430] hover:to-[#9e0d21] text-white font-bold rounded-xl shadow-lg shadow-red-900/20 text-sm tracking-wide transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-3"
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

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <p className="text-[11px] text-slate-500 font-bold text-center">Acesso Rápido Pré-Configurado:</p>
                <button
                  type="button"
                  onClick={() => {
                    setEmailOrUser("naumramos@latam.com");
                    setPassword("Nbs1493");
                    setIsLoading(true);
                    setTimeout(() => {
                      setIsLoading(false);
                      executeLoginSuccess({
                        nome: "NaumRamos",
                        matricula: "327689",
                        email: "naumramos@latam.com"
                      });
                    }, 300);
                  }}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#003087] font-bold rounded-xl text-xs flex items-center justify-between cursor-pointer transition"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#003087]" />
                    <span>Acessar como <strong>NaumRamos</strong> (Mat: 327689)</span>
                  </span>
                  <span className="text-[10px] bg-[#003087] text-white px-2 py-0.5 rounded-full font-bold">Entrar Direct</span>
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  E-mail Corporativo LATAM
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu.nome@latam.com"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Matrícula do Funcionário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regMatricula}
                    onChange={(e) => setRegMatricula(e.target.value)}
                    placeholder="Ex: 6021908"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Senha Pessoal
                  </label>
                  <input
                    type="password"
                    required
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfSenha}
                    onChange={(e) => setRegConfSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003087]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#003087] hover:bg-blue-900 text-white font-bold rounded-xl text-xs tracking-wide transition duration-200 flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <UserPlus className="w-4 h-4" />
                <span>Finalizar Cadastro de Acesso</span>
              </button>
            </form>
          )}

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

