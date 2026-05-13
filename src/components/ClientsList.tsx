import React, { useState } from "react";
import { useAura } from "@/src/hooks/useAura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, MessageCircle, ShoppingBag, DollarSign, Wallet, History, AlertCircle } from "lucide-react";
import { clientesService } from "@/src/services/clientesService";
import { toast } from "sonner";
import { cn, formatCurrency, parseNumber } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";

export function ClientsList({ aura }: { aura: ReturnType<typeof useAura> }) {
  const { clients, sales, installments, fetchData } = aura;
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({ nome: "", telefone: "", observacao: "" });
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nome || !newClient.telefone) return;
    
    try {
      await clientesService.create({
        nome: newClient.nome,
        telefone: newClient.telefone.replace(/\D/g, ""),
        observacao: newClient.observacao,
      });
      toast.success("Cliente cadastrado!");
      setNewClient({ nome: "", telefone: "", observacao: "" });
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(`Erro ao cadastrar cliente: ${String(error)}`);
    }
  };

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.telefone.includes(searchTerm)
  );

  const getClientStats = (clientId: number) => {
    const clientSales = (sales || []).filter(s => s.cliente_id === clientId);
    const clientInstallments = (installments || []).filter(i => clientSales.some(s => s.id === i.venda_id));
    
    const totalComprado = clientSales.reduce((acc, s) => acc + parseNumber(s.valor_venda), 0);
    const totalPago = clientInstallments.filter(i => i.status === "Pago").reduce((acc, i) => acc + parseNumber(i.valor_parcela), 0);
    const totalPendente = clientInstallments.filter(i => i.status !== "Pago").reduce((acc, i) => acc + parseNumber(i.valor_parcela), 0);
    const lucroGerado = clientSales.reduce((acc, s) => acc + (parseNumber(s.valor_venda) - parseNumber(s.custo)), 0);
    const parcelasVencidas = clientInstallments.filter(i => i.status !== "Pago" && isBefore(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date())));
    const parcelasPagas = clientInstallments.filter(i => i.status === "Pago");
    const parcelasAbertas = clientInstallments.filter(i => i.status !== "Pago" && !isBefore(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date())));

    return {
      totalComprado,
      totalPago,
      totalPendente,
      lucroGerado,
      qtdVendas: clientSales.length,
      parcelasVencidasCount: parcelasVencidas.length,
      parcelasPagasCount: parcelasPagas.length,
      parcelasAbertasCount: parcelasAbertas.length,
      vendas: clientSales,
      parcelas: clientInstallments
    };
  };

  const generateWhatsAppBilling = (client: any, stats: any) => {
    const pendingInstallments = stats.parcelas.filter((i: any) => i.status !== "Pago");
    if (pendingInstallments.length === 0) {
      toast.info("Não há parcelas pendentes para este cliente.");
      return;
    }

    // Group sales and their products
    let msg = "";
    const clientSales = stats.vendas;
    
    clientSales.forEach((sale: any) => {
      const products = JSON.parse(sale.produtos || "[]");
      products.forEach((p: any) => {
        msg += `${p.nome} ${p.marca ? `(${p.marca})` : ''} = ${parseNumber(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
    });

    const totalVenda = stats.totalComprado;
    msg += `Total 🟰 ${totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

    stats.parcelas.sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()).forEach((inst: any, idx: number) => {
      const date = format(new Date(inst.vencimento + 'T12:00:00'), "dd/MM/yy");
      let statusEmoji = "";
      if (inst.status === "Pago") {
        statusEmoji = " ✅";
      } else if (isBefore(new Date(inst.vencimento + 'T12:00:00'), startOfDay(new Date()))) {
        statusEmoji = " ⚠️";
      }
      
      msg += `${idx + 1}. ${date} = ${parseNumber(inst.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${statusEmoji}\n`;
    });

    navigator.clipboard.writeText(msg);
    toast.success("Resumo financeiro copiado!");
    
    if (client.telefone) {
      const d = client.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/55${d}?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <h1 className="text-xl font-light tracking-tight text-white">Meus <span className="text-rose-300 font-medium italic">Clientes</span></h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Base de compradores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            nativeButton={true}
            render={
              <Button size="sm" className="rounded-2xl px-4 h-10 border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20 active:scale-95 transition-all">
                <UserPlus size={16} className="mr-2" /> Novo
              </Button>
            }
          />
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100 p-6 border-none">
            <DialogHeader>
              <DialogTitle className="font-light text-2xl text-rose-300">Novo Cliente</DialogTitle>
              <p className="text-zinc-500 text-xs">Dados básicos para vendas e cobranças</p>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nome Completo</label>
                <Input 
                  placeholder="Ex: Maria Silva" 
                  value={newClient.nome} 
                  onChange={(e) => setNewClient({...newClient, nome: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Telefone</label>
                <Input 
                  placeholder="Ex: 84999999999" 
                  value={newClient.telefone} 
                  onChange={(e) => setNewClient({...newClient, telefone: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Observação</label>
                <Input 
                  placeholder="Ex: Prefere pagar no sábado" 
                  value={newClient.observacao} 
                  onChange={(e) => setNewClient({...newClient, observacao: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 h-12"
                />
              </div>
              <Button type="submit" className="w-full rounded-2xl bg-rose-400 text-zinc-950 font-bold py-6 hover:bg-rose-300 shadow-lg active:scale-95 transition-all">Salvar Cliente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-1">
        <Input 
          placeholder="Buscar pelo nome..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-2xl border-zinc-800 bg-zinc-900/50 py-7 px-6 text-zinc-100 placeholder:text-zinc-600 focus:ring-rose-300/20"
        />
      </div>

      <div className="space-y-4 px-1 pb-20">
        {filteredClients.map((client) => {
          const stats = getClientStats(client.id);
          return (
            <div key={client.id}>
              <Dialog onOpenChange={(open) => !open && setSelectedClient(null)}>
                <DialogTrigger
                  nativeButton={false}
                  render={
                    <Card 
                      className={cn(
                        "border border-zinc-800/50 bg-zinc-900/40 rounded-3xl overflow-hidden cursor-pointer hover:bg-zinc-900/60 transition-all active:scale-[0.98]",
                        stats.parcelasVencidasCount > 0 ? "border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]" : ""
                      )}
                      onClick={() => setSelectedClient(client)}
                    />
                  }
                >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-zinc-950 shadow-md",
                          stats.parcelasVencidasCount > 0 ? "bg-rose-500 text-white" : "bg-gradient-to-br from-rose-400 to-amber-300"
                        )}>
                          {client.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-medium text-sm text-zinc-100">{client.nome}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                              {stats.qtdVendas} {stats.qtdVendas === 1 ? 'Compra' : 'Compras'}
                            </span>
                            {stats.parcelasVencidasCount > 0 ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold uppercase ring-1 ring-rose-500/20">
                                {stats.parcelasVencidasCount} Vencida{stats.parcelasVencidasCount > 1 ? 's' : ''}
                              </span>
                            ) : stats.totalPendente > 0 ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold uppercase ring-1 ring-amber-500/20">
                                Em Dia
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Pendente</p>
                        <p className={cn(
                          "text-sm font-bold",
                          stats.totalPendente > 0 ? "text-rose-300" : "text-emerald-400"
                        )}>
                          {formatCurrency(stats.totalPendente)}
                        </p>
                      </div>
                    </CardContent>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100 p-0 overflow-hidden max-h-[90vh] flex flex-col border-none">
                  {selectedClient && (
                    <>
                      <div className="p-6 bg-rose-500/10 border-b border-rose-500/10 flex justify-between items-center shrink-0">
                        <div>
                          <DialogHeader>
                            <DialogTitle className="font-light text-2xl text-rose-300">{selectedClient.nome}</DialogTitle>
                            <p className="text-zinc-500 text-xs">{selectedClient.telefone}</p>
                          </DialogHeader>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => generateWhatsAppBilling(selectedClient, stats)}
                            className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-4 shadow-lg active:scale-95 transition-all gap-2"
                          >
                            <MessageCircle size={18} />
                            <span className="text-xs">Cobrar</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-3xl group">
                            <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest flex items-center gap-1 mb-1"><ShoppingBag size={10} /> Total Gasto</p>
                            <p className="text-lg font-light text-white tracking-tighter">{formatCurrency(stats.totalComprado)}</p>
                          </div>
                          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-3xl">
                            <p className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest flex items-center gap-1 mb-1"><DollarSign size={10} /> Lucro Total</p>
                            <p className="text-lg font-light text-emerald-400 tracking-tighter">{formatCurrency(stats.lucroGerado)}</p>
                          </div>
                          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                            <p className="text-[9px] uppercase font-bold text-emerald-500/40 tracking-widest flex items-center gap-1 mb-1"><Wallet size={10} /> Total Pago</p>
                            <p className="text-lg font-light text-emerald-500 tracking-tighter">{formatCurrency(stats.totalPago)}</p>
                          </div>
                          <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                            <p className="text-[9px] uppercase font-bold text-rose-500/40 tracking-widest flex items-center gap-1 mb-1"><AlertCircle size={10} /> Pendente</p>
                            <p className={cn("text-lg font-light tracking-tighter", stats.totalPendente > 0 ? "text-rose-400" : "text-emerald-400")}>
                              {formatCurrency(stats.totalPendente)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                             <span className="text-zinc-500 text-[8px] font-bold uppercase">Compras</span>
                             <span className="text-sm font-light text-zinc-100">{stats.qtdVendas}</span>
                          </div>
                          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                             <span className="text-zinc-500 text-[8px] font-bold uppercase">Pagas</span>
                             <span className="text-sm font-light text-emerald-400">{stats.parcelasPagasCount}</span>
                          </div>
                          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                             <span className="text-zinc-500 text-[8px] font-bold uppercase">Abertas</span>
                             <span className="text-sm font-light text-amber-400">{stats.parcelasAbertasCount}</span>
                          </div>
                          <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                             <span className="text-zinc-500 text-[8px] font-bold uppercase">Vencidas</span>
                             <span className="text-sm font-light text-rose-400">{stats.parcelasVencidasCount}</span>
                          </div>
                        </div>

                        {selectedClient.observacao && (
                          <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                              <AlertCircle size={32} className="text-rose-400" />
                            </div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-400/60 mb-1">Notas de Perfil</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed italic">"{selectedClient.observacao}"</p>
                          </div>
                        )}

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <DollarSign size={14} className="text-zinc-500" />
                               <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Gestão de Parcelas</h4>
                             </div>
                             <div className="flex gap-2">
                               <p className="text-[9px] text-zinc-600 font-bold uppercase">
                                 {stats.parcelas.filter(i => i.status === "Pago").length} / {stats.parcelas.length} Pagas
                               </p>
                             </div>
                           </div>
                           <div className="space-y-2">
                             {stats.parcelas.length === 0 ? (
                               <p className="text-xs text-zinc-600 italic text-center py-8">Sem faturas pendentes.</p>
                             ) : (
                               stats.parcelas.sort((a,b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()).map(inst => (
                                 <button 
                                   key={inst.id} 
                                   onClick={() => aura.toggleInstallmentStatus(inst.id, inst.status)}
                                   className={cn(
                                     "w-full flex justify-between items-center p-4 bg-zinc-950/50 border rounded-2xl active:scale-[0.98] transition-all",
                                     inst.status === "Pago" ? "border-emerald-500/20" : 
                                     isBefore(new Date(inst.vencimento + 'T12:00:00'), startOfDay(new Date())) ? "border-rose-500/20 animate-pulse" : "border-zinc-800"
                                   )}
                                 >
                                   <div className="flex items-center gap-4">
                                     <div className={cn(
                                       "w-3 h-3 rounded-full shadow-sm",
                                       inst.status === "Pago" ? "bg-emerald-500" : 
                                       isBefore(new Date(inst.vencimento + 'T12:00:00'), startOfDay(new Date())) ? "bg-rose-500" : "bg-zinc-700"
                                     )} />
                                     <div className="text-left">
                                       <p className="text-xs font-bold text-zinc-100">{inst.numero_parcela}ª Parcela</p>
                                       <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{format(new Date(inst.vencimento + 'T12:00:00'), "dd 'de' MMM")}</p>
                                     </div>
                                   </div>
                                   <div className="text-right">
                                     <p className="text-xs font-black text-zinc-100 tracking-tight">{formatCurrency(inst.valor_parcela)}</p>
                                     <p className={cn(
                                       "text-[8px] font-black uppercase tracking-tighter",
                                       inst.status === "Pago" ? "text-emerald-400" : 
                                       isBefore(new Date(inst.vencimento + 'T12:00:00'), startOfDay(new Date())) ? "text-rose-400" : "text-zinc-600"
                                     )}>
                                       {inst.status === "Pago" ? "Confirmado ✅" : isBefore(new Date(inst.vencimento + 'T12:00:00'), startOfDay(new Date())) ? "Vencido ⚠️" : "Pendente ⏳"}
                                     </p>
                                   </div>
                                 </button>
                               ))
                             )}
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                             <History size={14} className="text-zinc-500" />
                             <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Histórico Comercial</h4>
                           </div>
                           <div className="space-y-4">
                             {stats.vendas.length === 0 ? (
                               <p className="text-xs text-zinc-600 italic text-center py-8">Nenhum histórico comercial.</p>
                             ) : (
                               stats.vendas.sort((a,b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).map(v => {
                                 const products = JSON.parse(v.produtos || "[]");
                                 return (
                                   <div key={v.id} className="p-5 bg-zinc-950/30 border border-zinc-800/50 rounded-3xl space-y-4">
                                         <div className="flex justify-between items-start">
                                           <div className="space-y-1">
                                             <p className="text-xs font-bold text-zinc-100">Compra de {format(new Date(v.criado_em), "dd/MM/yy")}</p>
                                             <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{v.qtd_parcelas} parcelas • {v.marca || 'Mix'}</p>
                                           </div>
                                           <div className="text-right flex items-start gap-4">
                                              <div className="text-right">
                                                <p className="text-sm font-bold text-white">{formatCurrency(v.valor_venda)}</p>
                                                <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">Lucro: {formatCurrency(v.lucro)}</p>
                                              </div>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => {
                                                  toast.info("Para editar os detalhes desta venda, acesse a aba 'Vendas'");
                                                }}
                                                className="h-8 w-8 p-0 rounded-full text-zinc-600 hover:text-white"
                                              >
                                                <ShoppingBag size={14} />
                                              </Button>
                                           </div>
                                         </div>
                                     <div className="flex flex-wrap gap-2">
                                        {products.map((p: any, i: number) => (
                                          <div key={i} className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                                            <ShoppingBag size={10} className="text-rose-300" />
                                            <span className="text-[10px] text-zinc-300 font-medium">
                                              {p.nome}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                   </div>
                                 );
                               })
                             )}
                           </div>
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}
