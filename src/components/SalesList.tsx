import React, { useState } from "react";
import { useAura } from "@/src/hooks/useAura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, ChevronRight, Copy, MessageCircle, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { BRANDS } from "@/src/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

export function SalesList({ aura }: { aura: ReturnType<typeof useAura> }) {
  const { sales, clients, installments, createSaleWithInstallments, toggleInstallmentStatus } = aura;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [formData, setFormData] = useState({
    cliente_id: "",
    produto: "",
    marca: "",
    custo: "",
    valor_venda: "",
    qtd_parcelas: "1",
  });

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.produto || !formData.valor_venda) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const selectedClient = clients.find(c => c.id === Number(formData.cliente_id));

    await createSaleWithInstallments({
      cliente_id: Number(formData.cliente_id),
      cliente_nome: selectedClient?.nome || "Desconhecido",
      produto: formData.produto,
      marca: formData.marca,
      custo: Number(formData.custo),
      valor_venda: Number(formData.valor_venda),
      qtd_parcelas: Number(formData.qtd_parcelas),
    });

    setIsDialogOpen(false);
    setFormData({ cliente_id: "", produto: "", marca: "", custo: "", valor_venda: "", qtd_parcelas: "1" });
  };

  const getClientName = (sale: any) => {
    return sale.cliente_nome || "Desconhecido";
  };

  const getSaleInstallments = (saleId: number) => {
    return installments
      .filter((i) => i.venda_id === saleId)
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  };

  const generateWhatsAppMessage = (sale: any) => {
    const saleInst = getSaleInstallments(sale.id);
    const client = clients.find(c => c.id === sale.cliente_id);
    
    let msg = `🛍️ *Aura Perfumaria - Resumo de Compra*\n\n`;
    msg += `📦 *Produto:* ${sale.produto}\n`;
    msg += `🏷️ *Marca:* ${sale.marca}\n`;
    msg += `💰 *Total:* ${formatCurrency(sale.valor_venda)}\n\n`;
    msg += `💳 *Parcelamento:*\n`;
    
    saleInst.forEach((inst, idx) => {
      const date = format(new Date(inst.vencimento), "dd/MM/yy");
      const statusLabel = inst.status === "Paid" ? "✅" : "⏳";
      msg += `${idx + 1}. ${date} - ${formatCurrency(inst.valor_parcela)} ${statusLabel}\n`;
    });

    msg += `\nMuito obrigado pela preferência! ✨`;

    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada!");
    
    if (client) {
      setTimeout(() => {
        window.open(`https://wa.me/55${client.telefone}?text=${encodeURIComponent(msg)}`, "_blank");
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-light tracking-tight">Minhas <span className="text-rose-300 font-medium italic">Vendas</span></h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="rounded-full px-4 border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20">
                <ShoppingBag size={16} className="mr-2" /> Vender
              </Button>
            }
          />
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-light">Nova Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSale} className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</label>
                <Select value={formData.cliente_id} onValueChange={(val) => setFormData({...formData, cliente_id: val})}>
                  <SelectTrigger className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Produto</label>
                  <Input 
                    placeholder="Ex: Kaiak" 
                    value={formData.produto}
                    onChange={(e) => setFormData({...formData, produto: e.target.value})}
                    className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Marca</label>
                  <Select value={formData.marca} onValueChange={(val) => setFormData({...formData, marca: val})}>
                    <SelectTrigger className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6">
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {BRANDS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Custo</label>
                  <Input 
                    type="number"
                    step="0.01" 
                    placeholder="0.00"
                    value={formData.custo}
                    onChange={(e) => setFormData({...formData, custo: e.target.value})}
                    className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Valor</label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.valor_venda}
                    onChange={(e) => setFormData({...formData, valor_venda: e.target.value})}
                    className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Parcelas</label>
                <Select value={formData.qtd_parcelas} onValueChange={(val) => setFormData({...formData, qtd_parcelas: val})}>
                  <SelectTrigger className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {[1,2,3,4,5,6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}x {formData.valor_venda ? `de ${formatCurrency(Number(formData.valor_venda) / n)}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full rounded-2xl bg-rose-400 text-zinc-950 font-bold py-6 text-lg hover:bg-rose-300">Gerar Venda</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {sales.sort((a,b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).map((sale) => {
          const isOverdue = getSaleInstallments(sale.id).some(i => i.status === 'Pending' && new Date(i.vencimento) < new Date());
          return (
          <div key={sale.id}>
          <Dialog onOpenChange={(open) => !open && setSelectedSale(null)}>
            <DialogTrigger
              render={
                <Card 
                  className="border border-zinc-800/50 bg-zinc-900/50 rounded-3xl overflow-hidden cursor-pointer hover:bg-zinc-900 transition-all active:scale-95"
                  onClick={() => setSelectedSale(sale)}
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-zinc-900 shadow-lg",
                        sale.marca === "O Boticário" ? "bg-gradient-to-br from-emerald-400 to-teal-500" :
                        sale.marca === "Natura" ? "bg-gradient-to-br from-orange-400 to-amber-500" :
                        "bg-gradient-to-br from-rose-400 to-purple-500"
                      )}>
                        {sale.produto.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-zinc-100">{sale.produto}</h3>
                        <p className="text-xs text-zinc-500">{getClientName(sale)} • {sale.marca}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-zinc-100">{formatCurrency(sale.valor_venda)}</p>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        isOverdue ? "bg-rose-500/10 text-rose-400" : "bg-zinc-800 text-zinc-400"
                      )}>
                        {isOverdue ? "Atrasada" : `${sale.qtd_parcelas}x`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              }
            />
            <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-light">Detalhes da Venda</DialogTitle>
              </DialogHeader>
              {selectedSale && (
                <div className="space-y-6 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-light text-white">{selectedSale.produto}</h2>
                      <p className="text-sm text-zinc-500">{selectedSale.marca} • {getClientName(selectedSale)}</p>
                    </div>
                    <Button 
                      size="icon" 
                      onClick={() => generateWhatsAppMessage(selectedSale)}
                      className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
                    >
                      <MessageCircle size={20} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Valor Total</p>
                      <p className="text-lg font-light">{formatCurrency(selectedSale.valor_venda)}</p>
                    </div>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Lucro</p>
                      <p className="text-lg font-light text-emerald-400">{formatCurrency(selectedSale.valor_venda - selectedSale.custo)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Plano de Pagamento</h4>
                    <div className="space-y-2 text-zinc-100">
                        {getSaleInstallments(selectedSale.id).map((inst, idx) => (
                        <div 
                            key={inst.id}
                            className="flex justify-between items-center p-4 bg-zinc-950 border border-zinc-800/50 rounded-2xl"
                        >
                            <div className="flex items-center gap-4">
                            <button 
                                onClick={() => toggleInstallmentStatus(inst.id, inst.status)}
                                className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                inst.status === "Paid" ? "bg-emerald-500 text-zinc-950" : "border border-zinc-700"
                                )}
                            >
                                {inst.status === "Paid" && <CheckCircle2 size={12} />}
                            </button>
                            <div>
                                <p className="text-xs font-medium text-zinc-200">{idx + 1}ª Parcela</p>
                                <p className="text-[10px] text-zinc-500">{format(new Date(inst.vencimento), "dd 'de' MMMM", { locale: ptBR })}</p>
                            </div>
                            </div>
                            <p className="font-light text-sm text-zinc-100">{formatCurrency(inst.valor_parcela)}</p>
                        </div>
                        ))}
                    </div>
                  </div>
                </div>
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
