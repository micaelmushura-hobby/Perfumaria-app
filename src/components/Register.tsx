import React, { useState } from "react";
import { useAura } from "@/src/hooks/useAura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, User, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function Register({ aura }: { aura: ReturnType<typeof useAura> }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha || !telefone) {
      toast.error("Preencha todos os campos.");
      return;
    }

    try {
      setLoading(true);
      await aura.register({ nome, email, senha, telefone });
      toast.success("Conta criada! Agora faça seu login.");
      (window as any).toggleAuthMode?.(); // Go to login after registration
    } catch (error: any) {
      console.log('REGISTER ERROR:', error);
      const displayError = typeof error === 'object' ? JSON.stringify(error) : String(error);
      toast.error(displayError || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="text-center pt-10">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-400 to-amber-300 flex items-center justify-center text-zinc-950 font-bold text-2xl shadow-lg mb-6">
            E
          </div>
          <CardTitle className="text-2xl font-light tracking-tight text-white">
            Crie sua <span className="text-rose-300 font-medium italic">Conta</span>
          </CardTitle>
          <CardDescription className="text-zinc-500 text-sm mt-2">
            Comece a gerenciar suas vendas de forma premium
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <User size={12} /> Nome Completo
              </label>
              <Input 
                placeholder="Seu nome" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)}
                className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6 text-zinc-100 placeholder:text-zinc-700"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Mail size={12} /> E-mail
              </label>
              <Input 
                type="email"
                placeholder="seu@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6 text-zinc-100 placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Phone size={12} /> Telefone
              </label>
              <Input 
                placeholder="84 99999 9999" 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)}
                className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6 text-zinc-100 placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Lock size={12} /> Senha
              </label>
              <Input 
                type="password"
                placeholder="••••••••" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                className="rounded-2xl border-zinc-800 bg-zinc-950 px-4 py-6 text-zinc-100 placeholder:text-zinc-700"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-2xl bg-rose-300 text-zinc-950 font-bold py-6 text-lg hover:bg-rose-400 shadow-lg shadow-rose-500/20 active:scale-95 transition-all mt-4"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : "Criar Minha Conta"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button 
              onClick={() => (window as any).toggleAuthMode?.()} 
              className="text-xs text-rose-300 hover:text-rose-400 font-medium transition-colors"
            >
              Já tem uma conta? Entre aqui
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-600 mt-8 uppercase tracking-widest font-bold">
            © 2026 Essência Gestão Premium
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
