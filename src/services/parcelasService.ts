import { api } from "./api";
import { Installment } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";
import { usuariosService } from "./usuariosService";

export const parcelasService = {
  getAll: async () => {
    const user = usuariosService.getCurrentUser();
    if (!user) return [];
    
    const res = await api.get<{ results: Installment[] }>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/?user_field_names=true&filter__field_user_id__equal=${user.id}`
    );
    return res.data.results || [];
  },
  getByVenda: async (vendaId: number) => {
    const res = await api.get<{ results: Installment[] }>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/?user_field_names=true&filter__field_venda_id__equal=${vendaId}`
    );
    return res.data.results || [];
  },
  updateStatus: async (id: number, status: "Pending" | "Paid") => {
    const data: any = { status };
    if (status === "Paid") {
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
      valor: Number(data.valor),
      valor_pago: data.valor_pago ? Number(data.valor_pago) : 0,
      numero_parcela: Number(data.numero_parcela)
    };

    const res = await api.post<Installment>(
      `/database/rows/table/${TABLE_IDS.INSTALLMENTS}/?user_field_names=true`,
      payload
    );
    return res.data;
  },
};
