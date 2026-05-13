import { useState, useEffect, useMemo } from "react";
import { clientesService } from "@/src/services/clientesService";
import { vendasService } from "@/src/services/vendasService";
import { parcelasService } from "@/src/services/parcelasService";
import { usuariosService } from "@/src/services/usuariosService";
import { Client, Sale, Installment, DashboardStats, Usuario } from "@/src/types";
import { toast } from "sonner";
import { addMonths, format, isAfter, isBefore, startOfDay } from "date-fns";
import { parseNumber } from "@/lib/utils";

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
      setClients(c || []);
      setSales(s || []);
      setInstallments(i || []);
    } catch (error) {
      console.error(error);
      toast.error(`Erro ao carregar dados: ${String(error)}`);
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
    const today = format(new Date(), "yyyy-MM-dd");

    return {
      totalSold: sArr.reduce((acc, s) => acc + parseNumber(s.valor_venda || 0), 0),
      totalReceived: iArr
        .filter((i) => i.status === "Pago")
        .reduce((acc, i) => acc + parseNumber(i.valor_parcela || 0), 0),
      totalOpen: iArr
        .filter((i) => i.status !== "Pago")
        .reduce((acc, i) => acc + parseNumber(i.valor_parcela || 0), 0),
      totalProfit: sArr.reduce((acc, s) => acc + (parseNumber(s.valor_venda || 0) - parseNumber(s.custo || 0)), 0),
      overdueInstallments: iArr.filter(
        (i) => i.status !== "Pago" && isBefore(new Date(i.vencimento), startOfDay(new Date()))
      ).length,
      todayCollections: iArr.filter(
        (i) => i.status !== "Pago" && i.vencimento === today
      ).length,
    };
  }, [sales, installments]);

  const createSaleWithInstallments = async (saleData: any) => {
    try {
      const valorVenda = parseNumber(saleData.valor_venda);
      const qtdParcelas = Number(saleData.qtd_parcelas);
      const custo = parseNumber(saleData.custo);
      const primeiroVencimento = saleData.primeiro_vencimento ? new Date(saleData.primeiro_vencimento) : new Date();

      // 1. Create Sale
      const newSale = await vendasService.create({
        cliente_id: saleData.cliente_id,
        cliente_nome: saleData.cliente_nome,
        produto: saleData.produto,
        marca: saleData.marca,
        custo: custo,
        valor_venda: valorVenda,
        lucro: parseNumber(valorVenda - custo),
        qtd_parcelas: qtdParcelas,
        status: "Pendente"
      });

      // 2. Generate Installments
      const baseValue = Math.floor((valorVenda / qtdParcelas) * 100) / 100;
      const totalAllocated = baseValue * qtdParcelas;
      const diff = Math.round((valorVenda - totalAllocated) * 100) / 100;

      const installmentPromises = [];

      for (let j = 0; j < qtdParcelas; j++) {
        const dueDate = addMonths(primeiroVencimento, j);
        const isLast = j === qtdParcelas - 1;
        const finalValue = isLast ? parseNumber(baseValue + diff) : baseValue;

        installmentPromises.push(
          parcelasService.create({
            venda_id: newSale.id,
            cliente_nome: saleData.cliente_nome,
            numero_parcela: j + 1,
            valor_parcela: finalValue,
            vencimento: format(dueDate, "yyyy-MM-dd"),
            status: "Pendente"
          })
        );
      }

      await Promise.all(installmentPromises);
      toast.success("Venda e parcelas geradas com sucesso!");
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error(`Erro ao criar venda: ${String(error)}`);
    }
  };

  const toggleInstallmentStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Pago" ? "Pendente" : "Pago";
      await parcelasService.updateStatus(id, newStatus as any);
      toast.success("Status atualizado!");
      await fetchData();
    } catch (error) {
      toast.error(`Erro ao atualizar status: ${String(error)}`);
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

  const register = async (data: any) => {
    await usuariosService.register(data);
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
    register,
  };
}
