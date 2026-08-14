import React, { useState, useEffect } from "react";
import AppLayout from "./components/layout/AppLayout";
import Login from "./components/Login";
import SplashScreen from "./components/SplashScreen";
import NovoProcesso from "./pages/NovoProcesso";
import LerEtiqueta from "./pages/LerEtiqueta";
import Dashboard from "./pages/Dashboard";
import Historico from "./pages/Historico";
import Estatisticas from "./pages/Estatisticas";
import GuiaSlidesGamma from "./pages/GuiaSlidesGamma";

const CURRENT_AUTH_VERSION = "v2_369258147";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedVersion = localStorage.getItem("latam_auth_version");
    if (savedVersion !== CURRENT_AUTH_VERSION) {
      localStorage.removeItem("latam_auth_logged_in");
      return false;
    }
    return localStorage.getItem("latam_auth_logged_in") === "true";
  });

  const [showSplash, setShowSplash] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("novo");
  const [activeUser, setActiveUser] = useState(() => {
    const saved = localStorage.getItem("latam_active_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao analisar usuário ativo salvo:", e);
      }
    }
    return { nome: "Agente LATAM", matricula: "6021908", email: "agente.latam@latam.com" };
  });

  const handleLoginSuccess = (userParam: string | { nome: string; matricula: string; email: string }) => {
    setIsAuthenticated(true);
    setShowSplash(true);
    localStorage.setItem("latam_auth_logged_in", "true");
    localStorage.setItem("latam_auth_version", CURRENT_AUTH_VERSION);

    let updatedUser = { nome: "Agente LATAM", matricula: "6021908", email: "agente.latam@latam.com" };
    if (typeof userParam === "object") {
      updatedUser = {
        nome: userParam.nome || "Agente LATAM",
        matricula: userParam.matricula || "6021908",
        email: userParam.email || "agente.latam@latam.com"
      };
    }
    setActiveUser(updatedUser);
    localStorage.setItem("latam_active_user", JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowSplash(false);
    localStorage.removeItem("latam_auth_logged_in");
  };

  const handleUserChange = (newUser: { nome: string; matricula: string }) => {
    setActiveUser(newUser);
    localStorage.setItem("latam_active_user", JSON.stringify(newUser));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "novo":
        return <NovoProcesso activeUser={activeUser} onActiveUserChange={handleUserChange} />;
      case "ocr":
        return <LerEtiqueta activeUser={activeUser} />;
      case "dashboard":
        return <Dashboard />;
      case "estatisticas":
        return <Estatisticas />;
      case "historico":
        return <Historico activeUser={activeUser} />;
      case "slides":
        return <GuiaSlidesGamma />;
      default:
        return <NovoProcesso activeUser={activeUser} onActiveUserChange={handleUserChange} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} userName={activeUser.nome} />;
  }

  return (
    <AppLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      activeUser={activeUser} 
      onActiveUserChange={handleUserChange}
      onLogout={handleLogout}
      onReplaySplash={() => setShowSplash(true)}
    >
      {renderContent()}
    </AppLayout>
  );
}

