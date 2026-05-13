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
    const currentMonth = format(new Date(), "yyyy-MM");

    const totalSold = sArr.reduce((acc, s) => acc + parseNumber(s.valor_venda || 0), 0);
    const totalReceived = iArr
      .filter((i) => i.status === "Pago")
      .reduce((acc, i) => acc + parseNumber(i.valor_parcela || 0), 0);
    
    const overdue = iArr.filter(
      (i) => i.status !== "Pago" && isBefore(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date()))
    );

    const paidTotalCount = iArr.filter(i => i.status === "Pago").length;
    const openTotalCount = iArr.filter(i => i.status !== "Pago" && !isBefore(new Date(i.vencimento + 'T12:00:00'), startOfDay(new Date()))).length;

    return {
      totalSold,
      totalReceived,
      totalOpen: totalSold - totalReceived,
      totalProfit: sArr.reduce((acc, s) => acc + (parseNumber(s.valor_venda || 0) - parseNumber(s.custo || 0)), 0),
      overdueInstallments: overdue.length,
      overdueAmount: overdue.reduce((acc, i) => acc + parseNumber(i.valor_parcela), 0),
      paidInstallmentsCount: paidTotalCount,
      openInstallmentsCount: openTotalCount,
      todayCollections: iArr.filter(
        (i) => i.status !== "Pago" && i.vencimento === today
      ).length,
      monthSales: sArr.filter(s => s.criado_em.startsWith(currentMonth)).length,
      debtorClientsCount: new Set(overdue.map(i => i.cliente_nome)).size
    };
  }, [sales, installments]);

  const createSaleWithInstallments = async (saleData: any) => {
    try {
      const produtos = saleData.produtos || [];
      const valorVenda = produtos.reduce((acc: number, p: any) => acc + parseNumber(p.valor), 0);
      const custoTotal = produtos.reduce((acc: number, p: any) => acc + parseNumber(p.custo), 0);
      const qtdParcelas = Number(saleData.qtd_parcelas);
      const primeiroVencimento = saleData.primeiro_vencimento ? new Date(saleData.primeiro_vencimento) : new Date();

      // 1. Create Sale
      const newSale = await vendasService.create({
        cliente_id: saleData.cliente_id,
        cliente_nome: saleData.cliente_nome,
        produtos: JSON.stringify(produtos),
        produto: produtos.length === 1 ? produtos[0].nome : `${produtos.length} Produtos`,
        marca: produtos.length === 1 ? produtos[0].marca : 'Mix',
        custo: custoTotal,
        valor_venda: valorVenda,
        lucro: parseNumber(valorVenda - custoTotal),
        qtd_parcelas: qtdParcelas,
        metodo_pagamento: saleData.metodo_pagamento,
        status: "Em Aberto"
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
            status: "Em Aberto"
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
      let newStatus: string;
      let pagoEm: string | null = null;
      
      if (currentStatus === "Pago") {
        newStatus = "Em Aberto";
        pagoEm = null;
      } else {
        newStatus = "Pago";
        pagoEm = format(new Date(), "yyyy-MM-dd");
      }
      
      // Update the installment status and paid_at date
      await parcelasService.updateStatus(id, newStatus as any, pagoEm);
      
      toast.success(newStatus === "Pago" ? "Parcela marcada como paga! ✅" : "Parcela reaberta! ⏳");
      await fetchData();
    } catch (error) {
      toast.error(`Erro ao atualizar status: ${String(error)}`);
    }
  };

  const updateSale = async (id: number, data: any) => {
    try {
      if (data.produtos) {
        const produtos = Array.isArray(data.produtos) ? data.produtos : JSON.parse(data.produtos);
        data.custo = produtos.reduce((acc: number, p: any) => acc + parseNumber(p.custo), 0);
        data.valor_venda = produtos.reduce((acc: number, p: any) => acc + parseNumber(p.valor), 0);
        data.lucro = parseNumber(data.valor_venda - data.custo);
        data.produto = produtos.length === 1 ? produtos[0].nome : `${produtos.length} Produtos`;
        data.marca = produtos.length === 1 ? produtos[0].marca : 'Mix';
      }
      await vendasService.update(id, data);
      toast.success("Venda atualizada!");
      await fetchData();
    } catch (error) {
      toast.error(`Erro ao atualizar venda: ${String(error)}`);
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
    updateSale,
    toggleInstallmentStatus,
    login,
    logout,
    register,
  };
}
