import { LayoutDashboard, Users, ShoppingBag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  activeTab: "dashboard" | "clients" | "sales";
  setActiveTab: (tab: "dashboard" | "clients" | "sales") => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const navItems = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "sales", label: "Vendas", icon: ShoppingBag },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-8 py-4 rounded-full flex gap-10 shadow-2xl z-50 w-max max-w-[90vw]">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id as any)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-all",
            activeTab === item.id 
              ? "text-rose-300 scale-110" 
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
