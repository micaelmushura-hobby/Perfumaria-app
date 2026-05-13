import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { useAura } from "@/src/hooks/useAura";
import { cn, formatCurrency } from "@/lib/utils";
import { format, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    { title: "Faturamento Total", value: stats.totalSold, icon: TrendingUp, color: "text-white" },
    { title: "Margem de Lucro", value: stats.totalProfit, icon: DollarSign, color: "text-emerald-400" },
    { title: "Total Recebido", value: stats.totalReceived, icon: Wallet, color: "text-white", progress: (stats.totalReceived / (stats.totalSold || 1)) * 100 },
    { title: "Saldo a Receber", value: stats.totalOpen, icon: DollarSign, color: "text-rose-300" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3">
        {stats.overdueInstallments > 0 && (
          <div className="flex items-center gap-4 p-5 bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)] transition-all">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">Pendências Financeiras</p>
              <p className="text-xs text-rose-400/80 mt-0.5">{stats.overdueInstallments} {stats.overdueInstallments === 1 ? 'parcela vencida' : 'parcelas vencidas'} somando {formatCurrency(stats.overdueAmount)}.</p>
            </div>
          </div>
        )}
        
        {stats.todayCollections > 0 && (
          <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">Recebimentos Disponíveis</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">{stats.todayCollections} {stats.todayCollections === 1 ? 'recebimento previsto' : 'recebimentos previstos'} para hoje.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] flex flex-col gap-1 relative overflow-hidden group hover:border-zinc-700 transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <card.icon size={48} />
            </div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{card.title}</span><span className={`text-2xl font-light tracking-tighter ${card.color || 'text-white'}`}>{formatCurrency(card.value)}</span>
            {card.progress !== undefined && (
              <div className="w-full bg-zinc-800 h-1 mt-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 transition-all duration-1000" 
                  style={{ width: `${Math.min(card.progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Card className="border border-zinc-800/50 bg-zinc-900/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500">Próximos Recebimentos</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {(aura.installments || [])
            .filter(i => i.status !== 'Pago' && isAfter(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date())))
            .sort((a,b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
            .slice(0, 5)
            .map(inst => (
              <div key={inst.id} className="flex justify-between items-center p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl">
                <div>
                  <p className="text-xs font-semibold text-zinc-100">{inst.cliente_nome}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">{format(new Date(inst.vencimento + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(inst.valor_parcela)}</p>
              </div>
            ))
          }
          {(aura.installments || []).filter(i => i.status !== 'Pago' && isAfter(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date()))).length === 0 && (
            <p className="text-xs text-zinc-600 italic text-center py-4">Nenhum vencimento futuro registrado.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-zinc-800/50 bg-zinc-900/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500">Resumo Operacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Vendas do Mês</span>
            <span className="font-bold">{(stats.monthSales || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Clientes Ativos</span>
            <span className="font-bold">{(aura.clients || []).length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Inadimplentes</span>
            <span className={cn("font-bold", stats.debtorClientsCount > 0 ? "text-rose-400" : "text-emerald-400")}>
              {stats.debtorClientsCount} {stats.debtorClientsCount === 1 ? 'Cliente' : 'Clientes'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Parcelas Pendentes</span>
            <span className="font-bold">{(aura.installments || []).filter(i => i.status !== 'Pago').length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
