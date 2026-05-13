import { useState, useEffect, useMemo } from "react";
import { clientesService } from "@/src/services/clientesService";
import { vendasService } from "@/src/services/vendasService";
import { parcelasService } from "@/src/services/parcelasService";
import { usuariosService } from "@/src/services/usuariosService";
import { Client, Sale, Installment, DashboardStats, Usuario } from "@/src/types";
import { toast } from "sonner";
import { addMonths, format, isAfter, isBefore, startOfDay } from "date-fns";

export function useAura() {
  const [user, setUser] = useState<Usuario | null>(usuariosService.getCurrentUser());
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [c, s, i] = await Promise.all([
        clientesService.getAll(),
        vendasService.getAll(),
        parcelasService.getAll(),
      ]);
      setClients(c);
      setSales(s);
      setInstallments(i);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const stats: DashboardStats = useMemo(() => {
    const sArr = sales || [];
    const iArr = installments || [];

    return {
      totalSold: sArr.reduce((acc, s) => acc + Number(s.valor_venda || 0), 0),
      totalReceived: iArr
        .filter((i) => i.status === "Paid")
        .reduce((acc, i) => acc + Number(i.valor_parcela || 0), 0),
      totalOpen: iArr
        .filter((i) => i.status === "Pending")
        .reduce((acc, i) => acc + Number(i.valor_parcela || 0), 0),
      totalProfit: sArr.reduce((acc, s) => acc + (Number(s.valor_venda || 0) - Number(s.custo || 0)), 0),
      overdueInstallments: iArr.filter(
        (i) => i.status === "Pending" && isBefore(new Date(i.vencimento), startOfDay(new Date()))
      ).length,
    };
  }, [sales, installments]);

  const createSaleWithInstallments = async (saleData: any) => {
    try {
      // 1. Create Sale
      const newSale = await vendasService.create({
        cliente_id: saleData.cliente_id,
        cliente_nome: saleData.cliente_nome,
        produto: saleData.produto,
        marca: saleData.marca,
        custo: Number(saleData.custo),
        valor_venda: Number(saleData.valor_venda),
        lucro: Number(saleData.valor_venda) - Number(saleData.custo),
        qtd_parcelas: Number(saleData.qtd_parcelas),
        status: "Pending",
        criado_em: new Date().toISOString(),
      });

      // 2. Generate Installments
      const installmentValue = Number(saleData.valor_venda) / Number(saleData.qtd_parcelas);
      const installmentPromises = [];

      for (let j = 0; j < Number(saleData.qtd_parcelas); j++) {
        const dueDate = addMonths(new Date(), j);
        installmentPromises.push(
          parcelasService.create({
            venda_id: newSale.id,
            cliente_nome: saleData.cliente_nome,
            numero_parcela: j + 1,
            valor_parcela: Number(installmentValue.toFixed(2)),
            vencimento: format(dueDate, "yyyy-MM-dd"),
            status: "Pending",
            criado_em: new Date().toISOString(),
          })
        );
      }

      await Promise.all(installmentPromises);
      toast.success("Venda e parcelas geradas com sucesso!");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar venda.");
    }
  };

  const toggleInstallmentStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Paid" ? "Pending" : "Paid";
      await parcelasService.updateStatus(id, newStatus as any);
      toast.success("Status atualizado!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const login = async (email: string, senha: string) => {
    const data = await usuariosService.login(email, senha);
    setUser(data.user);
  };

  const logout = () => {
    usuariosService.logout();
    setUser(null);
  };

  return {
    user,
    clients,
    sales,
    installments,
    loading,
    stats,
    fetchData,
    createSaleWithInstallments,
    toggleInstallmentStatus,
    login,
    logout,
  };
}
