import { api } from "./api";
import { Installment } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";

export const parcelasService = {
  getAll: async () => {
    const res = await api.get<{ results: Installment[] }>(`/baserow/${TABLE_IDS.INSTALLMENTS}`);
    return res.data.results || [];
  },
  getByVenda: async (vendaId: number) => {
    const all = await parcelasService.getAll();
    return all.filter(p => p.venda_id === vendaId);
  },
  updateStatus: async (id: number, status: "Pending" | "Paid") => {
    const data: any = { status };
    if (status === "Paid") {
      data.pago_em = new Date().toISOString();
    } else {
      data.pago_em = null;
    }
    const res = await api.patch<Installment>(`/baserow/${TABLE_IDS.INSTALLMENTS}/${id}`, data);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post<Installment>(`/baserow/${TABLE_IDS.INSTALLMENTS}`, data);
    return res.data;
  },
};
