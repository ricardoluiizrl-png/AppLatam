import React, { useState, useEffect } from "react";
import AppLayout from "./components/layout/AppLayout";
import NovoProcesso from "./pages/NovoProcesso";
import LerEtiqueta from "./pages/LerEtiqueta";
import Dashboard from "./pages/Dashboard";
import Historico from "./pages/Historico";
import Estatisticas from "./pages/Estatisticas";

export default function App() {
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
    return { nome: "Ricardo Luiz", matricula: "GRU-0564" };
  });

  const handleUserChange = (newUser: { nome: string; matricula: string }) => {
    setActiveUser(newUser);
    localStorage.setItem("latam_active_user", JSON.stringify(newUser));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "novo":
        return <NovoProcesso activeUser={activeUser} onActiveUserChange={handleUserChange} />;
      case "ocr":
        return <LerEtiqueta />;
      case "dashboard":
        return <Dashboard />;
      case "estatisticas":
        return <Estatisticas />;
      case "historico":
        return <Historico />;
      default:
        return <NovoProcesso activeUser={activeUser} onActiveUserChange={handleUserChange} />;
    }
  };

  return (
    <AppLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      activeUser={activeUser} 
      onActiveUserChange={handleUserChange}
    >
      {renderContent()}
    </AppLayout>
  );
}

