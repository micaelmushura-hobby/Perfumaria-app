import React, { useState } from "react";
import { useAura } from "@/src/hooks/useAura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, UserPlus, Phone, Copy, MessageCircle } from "lucide-react";
import { clientesService } from "@/src/services/clientesService";
import { toast } from "sonner";

export function ClientsList({ aura }: { aura: ReturnType<typeof useAura> }) {
  const { clients, fetchData } = aura;
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({ nome: "", telefone: "", observacao: "" });

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    return d;
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nome || !newClient.telefone) return;
    
    try {
      await clientesService.create({
        nome: newClient.nome,
        telefone: formatPhone(newClient.telefone),
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-light tracking-tight">Meus <span className="text-rose-300 font-medium italic">Clientes</span></h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="rounded-full px-4 border border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/20">
                <UserPlus size={16} className="mr-2" /> Novo
              </Button>
            }
          />
          <DialogContent className="max-w-[90vw] rounded-3xl bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="font-light">Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nome Completo</label>
                <Input 
                  placeholder="Ex: Maria Silva" 
                  value={newClient.nome} 
                  onChange={(e) => setNewClient({...newClient, nome: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Telefone</label>
                <Input 
                  placeholder="84 99999 9999" 
                  value={newClient.telefone} 
                  onChange={(e) => setNewClient({...newClient, telefone: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Observação</label>
                <Input 
                  placeholder="Ex: Prefere pagar no sábado" 
                  value={newClient.observacao} 
                  onChange={(e) => setNewClient({...newClient, observacao: e.target.value})}
                  className="rounded-2xl border-zinc-800 bg-zinc-950 text-zinc-100"
                />
              </div>
              <Button type="submit" className="w-full rounded-2xl bg-rose-400 text-zinc-950 font-bold hover:bg-rose-300">Salvar Cliente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input 
        placeholder="Buscar clientes..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="rounded-3xl border-zinc-800 bg-zinc-900 py-6 px-6 text-zinc-100 placeholder:text-zinc-600 focus:ring-rose-300/20"
      />

      <div className="space-y-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="border border-zinc-800/50 bg-zinc-900/50 rounded-3xl overflow-hidden hover:bg-zinc-900 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 flex items-center justify-center font-bold text-zinc-900 shadow-lg">
                  {client.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-zinc-100">{client.nome}</h3>
                  <p className="text-xs text-zinc-500">{client.telefone}</p>
                  {client.observacao && <p className="text-[10px] text-rose-300/60 leading-tight mt-1">{client.observacao}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => openWhatsApp(client.telefone)}
                  className="rounded-full bg-zinc-800/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <MessageCircle size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
