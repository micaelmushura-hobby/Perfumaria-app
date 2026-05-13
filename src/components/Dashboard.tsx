import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { useAura } from "@/src/hooks/useAura";
import { formatCurrency } from "@/lib/utils";

export function Dashboard({ aura }: { aura: ReturnType<typeof useAura> }) {
  const { stats, loading } = aura;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const cards = [
    { title: "Total Vendido", value: stats.totalSold, icon: TrendingUp, color: "text-zinc-500" },
    { title: "Lucro Estimado", value: stats.totalProfit, icon: DollarSign, color: "text-emerald-400" },
    { title: "Recebido", value: stats.totalReceived, icon: Wallet, color: "text-white", progress: (stats.totalReceived / (stats.totalSold || 1)) * 100 },
    { title: "Em Aberto", value: stats.totalOpen, icon: DollarSign, color: "text-rose-300" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.overdueInstallments > 0 && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-300">
            <AlertCircle size={20} />
            <div>
              <p className="text-sm font-bold">Atenção!</p>
              <p className="text-xs">{stats.overdueInstallments} parcelas estão vencidas.</p>
            </div>
          </div>
        )}
        
        {stats.todayCollections > 0 && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400">
            <DollarSign size={20} />
            <div>
              <p className="text-sm font-bold">Cobranças do Dia</p>
              <p className="text-xs">{stats.todayCollections} recebimentos previstos para hoje!</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex flex-col gap-1 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10">
              <card.icon size={32} />
            </div>
            <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">{card.title}</span>
            <span className={`text-xl font-light ${card.color || 'text-white'}`}>{formatCurrency(card.value)}</span>
            {card.progress !== undefined && (
              <div className="w-full bg-zinc-800 h-1 mt-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min(card.progress, 100)}%` }}
                />
              </div>
            )}
            {card.title === "Em Aberto" && stats.overdueInstallments > 0 && (
              <span className="text-[9px] text-rose-400 mt-1">Atenção às vencidas</span>
            )}
          </div>
        ))}
      </div>

      <Card className="border-zinc-800 bg-zinc-900 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-zinc-800/50 pb-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Resumo Operacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Total de Vendas</span>
            <span className="font-bold">{aura.sales.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Clientes Cadastrados</span>
            <span className="font-bold">{aura.clients.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Parcelas Pendentes</span>
            <span className="font-bold">{aura.installments.filter(i => i.status === 'Pendente').length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
