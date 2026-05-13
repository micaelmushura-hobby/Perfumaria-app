import { useState, useMemo } from "react";
import { useAura } from "@/src/hooks/useAura";
import { Navbar } from "@/src/components/Navbar";
import { Dashboard } from "@/src/components/Dashboard";
import { ClientsList } from "@/src/components/ClientsList";
import { SalesList } from "@/src/components/SalesList";
import { Login } from "@/src/components/Login";
import { Toaster } from "@/components/ui/sonner";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "clients" | "sales">("dashboard");
  const aura = useAura();

  if (!aura.user) {
    return (
      <>
        <Login aura={aura} />
        <Toaster position="top-center" theme="dark" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="container mx-auto px-4 pb-28 pt-8 max-w-lg">
        <header className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-light tracking-tight text-white">
              Essência <span className="text-rose-300 font-medium italic">Gestão</span>
            </h1>
            <p className="text-zinc-500 text-xs">Controle de Perfumaria Premium</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => aura.logout()}
              className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-300/60 hover:text-rose-300 hover:border-rose-300/30 transition-all shadow-sm group"
            >
              <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 flex items-center justify-center text-zinc-950 font-bold text-sm shadow-lg">
              {aura.user.nome.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {activeTab === "dashboard" && <Dashboard aura={aura} />}
        {activeTab === "clients" && <ClientsList aura={aura} />}
        {activeTab === "sales" && <SalesList aura={aura} />}
      </main>

      <Toaster position="top-center" theme="dark" />
    </div>
  );
}
