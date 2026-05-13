import { api } from "./api";
import { Installment } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";
import { usuariosService } from "./usuariosService";
import { parseNumber } from "@/lib/utils";

export const parcelasService = {
  getAll: async () => {
    const user = usuariosService.getCurrentUser();
    if (!user) return [];
    
    const res = await api.get<{ results: any[] }>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/?user_field_names=true&filter__field_user_id__equal=${user.id}`
    );
    
    // Normalize Baserow objects (Single Select) to strings
    const normalized = (res.data.results || []).map(inst => ({
      ...inst,
      status: typeof inst.status === 'object' && inst.status !== null ? inst.status.value : inst.status,
    }));

    return normalized;
  },
  getByVenda: async (vendaId: number) => {
    const res = await api.get<{ results: any[] }>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/?user_field_names=true&filter__field_venda_id__equal=${vendaId}`
    );
    
    // Normalize Baserow objects (Single Select) to strings
    const normalized = (res.data.results || []).map(inst => ({
      ...inst,
      status: typeof inst.status === 'object' && inst.status !== null ? inst.status.value : inst.status,
    }));

    return normalized;
  },
  updateStatus: async (id: number, status: "Pendente" | "Pago" | "Vencido" | "Em Aberto") => {
    const data: any = { status };
    if (status === "Pago") {
      data.pago_em = new Date().toISOString();
    } else {
      data.pago_em = null;
    }
    
    const res = await api.patch<Installment>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/${id}/?user_field_names=true`,
      data
    );
    return res.data;
  },
  create: async (data: any) => {
    const user = usuariosService.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    const payload = {
      ...data,
      user_id: Number(user.id),
      venda_id: Number(Array.isArray(data.venda_id) ? data.venda_id[0] : data.venda_id),
      valor_parcela: parseNumber(data.valor_parcela),
      valor: parseNumber(data.valor), // support old/common field
      valor_pago: parseNumber(data.valor_pago),
      numero_parcela: Number(data.numero_parcela),
      status: data.status || 'Pendente'
    };

    const res = await api.post<Installment>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/?user_field_names=true`,
      payload
    );
    return res.data;
  },
};
