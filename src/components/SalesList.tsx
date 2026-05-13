import React, { useState } from "react";
import { useAura } from "@/src/hooks/useAura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, CheckCircle2, MessageCircle, Plus, X, CreditCard, DollarSign } from "lucide-react";
import { BRANDS, PAYMENT_METHODS } from "@/src/constants";
import { format, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { cn, formatCurrency, parseNumber } from "@/lib/utils";

interface ProductInput {
  nome: string;
  marca: string;
  custo: string;
  valor: string;
}

export function SalesList({ aura }: { aura: ReturnType<typeof useAura> }) {
  const { sales, clients, installments, createSaleWithInstallments, toggleInstallmentStatus } = aura;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    cliente_id: "",
    qtd_parcelas: "1",
    primeiro_vencimento: format(new Date(), "yyyy-MM-dd"),
    metodo_pagamento: "PIX",
  });

  const [formProducts, setFormProducts] = useState<ProductInput[]>([
    { nome: "", marca: "O Boticário", custo: "", valor: "" }
  ]);

  const addProduct = () => {
    setFormProducts([...formProducts, { nome: "", marca: "O Boticário", custo: "", valor: "" }]);
  };

  const removeProduct = (index: number) => {
    if (formProducts.length > 1) {
      setFormProducts(formProducts.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof ProductInput, value: string) => {
    const updated = [...formProducts];
    updated[index][field] = value;
    setFormProducts(updated);
  };

  const totalVenda = formProducts.reduce((acc, p) => acc + (parseNumber(p.valor) || 0), 0);
  const totalCusto = formProducts.reduce((acc, p) => acc + (parseNumber(p.custo) || 0), 0);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || formProducts.some(p => !p.nome || !p.valor)) {
      toast.error("Preencha os campos obrigatórios e pelo menos um produto.");
      return;
    }

    const selectedClient = clients.find(c => c.id === Number(formData.cliente_id));

    await createSaleWithInstallments({
      cliente_id: Number(formData.cliente_id),
      cliente_nome: selectedClient?.nome || "Desconhecido",
      produtos: formProducts.map(p => ({
        nome: p.nome,
        marca: p.marca,
        custo: parseNumber(p.custo),
        valor: parseNumber(p.valor)
      })),
      qtd_parcelas: formData.qtd_parcelas,
      primeiro_vencimento: formData.primeiro_vencimento,
      metodo_pagamento: formData.metodo_pagamento
    });

    setIsDialogOpen(false);
    setFormData({ 
      cliente_id: "", 
      qtd_parcelas: "1",
      primeiro_vencimento: format(new Date(), "yyyy-MM-dd"),
      metodo_pagamento: "PIX"
    });
    setFormProducts([{ nome: "", marca: "O Boticário", custo: "", valor: "" }]);
  };

  const getSaleInstallments = (saleId: number) => {
    if (!installments) return [];
    return installments
      .filter((i) => i.venda_id === saleId)
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  };

  const getSaleProducts = (sale: any): any[] => {
    try {
      return JSON.parse(sale.produtos || "[]");
    } catch {
      return [];
    }
  };

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  const filteredSales = (sales || []).filter(sale => {
    const sInst = getSaleInstallments(sale.id);
    const isPaid = sInst.length > 0 && sInst.every(i => i.status === "Pago");
    const isOverdue = sInst.some(i => i.status !== 'Pago' && isBefore(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date())));
    
    if (filterStatus === "paid" && !isPaid) return false;
    if (filterStatus === "overdue" && !isOverdue) return false;
    if (filterStatus === "open" && (isPaid || isOverdue)) return false;
    if (filterClient !== "all" && sale.cliente_id !== Number(filterClient)) return false;
    
    return true;
  });

  const generateWhatsAppMessage = (sale: any) => {
    const saleInst = getSaleInstallments(sale.id);
    const client = clients.find(c => c.id === sale.cliente_id);
    const products = getSaleProducts(sale);
    
    let msg = products.map(p => `${p.nome} = ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n');
    msg += `\n\nTotal 🟰 ${parseNumber(sale.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    
    saleInst.forEach((inst, idx) => {
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
    toast.success("Cobrança copiada!");
    
    if (client) {
      setTimeout(() => {
        const phone = client.telefone.replace(/\D/g, "");
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="flex flex-col">
          <h1 className="text-xl font-light tracking-tight text-white">Minhas <span className="text-rose-300 font-medium italic">Vendas</span></h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Histórico de transações</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            nativeButton={true}
            render={
              <Button size="sm" className="rounded-2xl px-4 h-10 border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20 active:scale-95 transition-all">
                <ShoppingBag size={16} className="mr-2" /> Vender
              </Button>
            }
          />
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto p-0 border-none">
            <div className="p-6 bg-rose-500/10 border-b border-rose-500/10">
              <DialogHeader>
                <DialogTitle className="font-light text-2xl text-rose-300">Nova Venda</DialogTitle>
                <p className="text-zinc-500 text-xs">Preencha os detalhes dos produtos e parcelas</p>
              </DialogHeader>
            </div>
            
            <form onSubmit={handleCreateSale} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</label>
                <Select value={formData.cliente_id} onValueChange={(val) => setFormData({...formData, cliente_id: val})}>
                  <SelectTrigger className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6 shadow-sm">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                    {(clients || []).map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Produtos</label>
                  <Button type="button" variant="ghost" size="sm" onClick={addProduct} className="h-6 text-[10px] uppercase font-bold text-rose-300 gap-1 hover:bg-rose-300/10">
                    <Plus size={12} /> Adicionar
                  </Button>
                </div>
                
                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                  {formProducts.map((p, idx) => (
                    <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3 relative group">
                      {formProducts.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeProduct(idx)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="Produto" 
                          value={p.nome}
                          onChange={(e) => updateProduct(idx, "nome", e.target.value)}
                          className="rounded-xl border-zinc-800 bg-zinc-900 h-10 text-sm"
                        />
                         <Select value={p.marca} onValueChange={(val) => updateProduct(idx, "marca", val)}>
                          <SelectTrigger className="rounded-xl border-zinc-800 bg-zinc-900 h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            {BRANDS.map(b => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-bold">CUSTO</span>
                          <Input 
                            type="number"
                            placeholder="0,00"
                            value={p.custo}
                            onChange={(e) => updateProduct(idx, "custo", e.target.value)}
                            className="rounded-xl border-zinc-800 bg-zinc-900 h-10 pl-14 text-sm"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-rose-400 font-bold">VENDA</span>
                          <Input 
                            type="number"
                            placeholder="0,00"
                            value={p.valor}
                            onChange={(e) => updateProduct(idx, "valor", e.target.value)}
                            className="rounded-xl border-zinc-800 bg-zinc-900 h-10 pl-14 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800/50 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Resumo Financeiro</p>
                  <p className="text-sm font-medium text-emerald-400">Lucro: {formatCurrency(totalVenda - totalCusto)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Total</p>
                  <p className="text-xl font-light text-white">{formatCurrency(totalVenda)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Parcelas</label>
                  <Select value={formData.qtd_parcelas} onValueChange={(val) => setFormData({...formData, qtd_parcelas: val})}>
                    <SelectTrigger className="rounded-2xl border-zinc-800 bg-zinc-950 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {[1,2,3,4,5,6].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}x {totalVenda ? `de ${formatCurrency(totalVenda / n)}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pagamento</label>
                  <Select value={formData.metodo_pagamento} onValueChange={(val) => setFormData({...formData, metodo_pagamento: val})}>
                    <SelectTrigger className="rounded-2xl border-zinc-800 bg-zinc-950 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">1º Vencimento</label>
                <Input 
                  type="date"
                  value={formData.primeiro_vencimento}
                  onChange={(e) => setFormData({...formData, primeiro_vencimento: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 h-12"
                />
              </div>

              <Button type="submit" className="w-full rounded-2xl bg-rose-400 text-zinc-950 font-bold py-6 text-lg hover:bg-rose-300 shadow-lg active:scale-[0.98] transition-all">Finalizar Venda</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 overflow-x-auto px-1 pb-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 rounded-xl border-zinc-800 bg-zinc-900/50 text-[10px] font-bold uppercase flex-1 shrink-0 min-w-[120px]">
             <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="open">Em Aberto</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-9 rounded-xl border-zinc-800 bg-zinc-900/50 text-[10px] font-bold uppercase flex-1 shrink-0 min-w-[120px]">
             <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todos Clientes</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 px-1 pb-20">
        {filteredSales.sort((a,b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).map((sale) => {
          const sInst = getSaleInstallments(sale.id);
          const sProds = getSaleProducts(sale);
          const isOverdue = sInst.some(i => i.status !== 'Pago' && isBefore(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date())));
          const isPaid = sInst.length > 0 && sInst.every(i => i.status === "Pago");
          
          return (
            <div key={sale.id}>
              <Dialog onOpenChange={(open) => !open && setSelectedSale(null)}>
                <DialogTrigger
                  nativeButton={false}
                  render={
                    <Card 
                      className="border border-zinc-800/50 bg-zinc-900/40 rounded-3xl overflow-hidden cursor-pointer hover:bg-zinc-900 transition-all active:scale-[0.98] relative"
                      onClick={() => setSelectedSale(sale)}
                    />
                  }
                >
                  <CardContent className="p-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-zinc-900 shadow-md",
                        "bg-gradient-to-br from-rose-400 to-amber-300"
                      )}>
                        {sProds.length > 1 ? "📦" : sProds[0]?.nome?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-zinc-100 truncate max-w-[120px]">
                          {sProds.length > 1 ? `${sProds.length} Produtos` : sProds[0]?.nome || "Venda"}
                        </h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{sale.cliente_nome}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                         <p className="font-bold text-sm text-zinc-100">{formatCurrency(sale.valor_venda)}</p>
                      </div>
                      <div className="mt-1 flex justify-end gap-1">
                        {isPaid ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/10 text-emerald-400">Pago</span>
                        ) : (
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                            isOverdue ? "bg-rose-500/10 text-rose-400" : "bg-zinc-800 text-zinc-500"
                          )}>
                            {isOverdue ? "Atrasado" : "Pendente"}
                          </span>
                        )}
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-zinc-800 text-zinc-500">
                          {sale.metodo_pagamento || 'PIX'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto p-0 border-none">
                {selectedSale && (
                  <>
                    <div className="p-6 bg-rose-500/10 border-b border-rose-500/10 flex justify-between items-start">
                      <div>
                        <DialogHeader>
                          <DialogTitle className="font-light text-2xl text-rose-300">Resumo da Venda</DialogTitle>
                          <p className="text-zinc-500 text-xs">{selectedSale.cliente_nome} • {format(new Date(selectedSale.criado_em), "dd/MM/yyyy")}</p>
                        </DialogHeader>
                      </div>
                      <Button 
                        size="icon" 
                        onClick={() => generateWhatsAppMessage(selectedSale)}
                        className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 active:scale-95 transition-all shadow-lg"
                      >
                        <MessageCircle size={20} />
                      </Button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Produtos Comprados</h4>
                        <div className="space-y-2">
                          {getSaleProducts(selectedSale).map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800/50 rounded-2xl text-sm">
                              <div>
                                <p className="font-medium">{p.nome}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">{p.marca}</p>
                              </div>
                              <p className="font-light">{formatCurrency(p.valor)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
                          <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest text-emerald-400">Lucro Total</p>
                          <p className="text-sm font-medium">{formatCurrency(parseNumber(selectedSale.valor_venda) - parseNumber(selectedSale.custo))}</p>
                        </div>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
                          <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest text-rose-400">Pago</p>
                          <p className="text-sm font-medium">
                            {formatCurrency(getSaleInstallments(selectedSale.id).filter(i => i.status === "Pago").reduce((acc, i) => acc + parseNumber(i.valor_parcela), 0))}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fluxo de Pagamento</h4>
                          <span className="text-[10px] font-bold text-rose-300 uppercase">{selectedSale.metodo_pagamento || "PIX"}</span>
                        </div>
                        <div className="space-y-2">
                          {getSaleInstallments(selectedSale.id).map((inst, idx) => (
                            <button 
                              key={inst.id}
                              onClick={() => toggleInstallmentStatus(inst.id, inst.status)}
                              className={cn(
                                "w-full flex justify-between items-center p-4 bg-zinc-950 border transition-all rounded-2xl active:scale-[0.98]",
                                inst.status === "Pago" ? "border-emerald-500/20" : "border-zinc-800"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                  inst.status === "Pago" ? "bg-emerald-500 text-zinc-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "border border-zinc-700"
                                )}>
                                  {inst.status === "Pago" && <CheckCircle2 size={12} />}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-semibold">{idx + 1}ª Parcela</p>
                                  <p className={cn(
                                    "text-[10px] font-bold uppercase",
                                    inst.status === "Pago" ? "text-emerald-400" : 
                                    isBefore(new Date(inst.vencimento + 'T12:00:00'), startOfDay(new Date())) ? "text-rose-400" : "text-zinc-500"
                                  )}>
                                    {format(new Date(inst.vencimento + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <p className="font-medium text-sm text-zinc-100">{formatCurrency(inst.valor_parcela)}</p>
                            </button>
                          ))}
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
