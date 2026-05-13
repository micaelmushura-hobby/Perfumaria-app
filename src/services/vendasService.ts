import { api } from "./api";
import { Sale } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";
import { usuariosService } from "./usuariosService";

export const vendasService = {
  getAll: async () => {
    const user = usuariosService.getCurrentUser();
    if (!user) return [];
    
    const res = await api.get<{ results: Sale[] }>(
      `/database/rows/table/${TABLE_IDS.SALES}/?user_field_names=true&filter__field_user_id__equal=${user.id}`
    );
    return res.data.results || [];
  },
  create: async (data: any) => {
    const user = usuariosService.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    const payload = {
      ...data,
      user_id: [user.id],
      cliente_id: Array.isArray(data.cliente_id) ? data.cliente_id : [data.cliente_id]
    };

    const res = await api.post<Sale>(
      `/database/rows/table/${TABLE_IDS.SALES}/?user_field_names=true`,
      payload
    );
    return res.data;
  },
  update: async (id: number, data: any) => {
    const payload = { ...data };
    
    // Remove read-only or system fields
    delete payload.id;
    delete payload.criado_em;
    
    if (payload.user_id && !Array.isArray(payload.user_id)) {
      payload.user_id = [payload.user_id];
    }
    if (payload.cliente_id && !Array.isArray(payload.cliente_id)) {
      payload.cliente_id = [payload.cliente_id];
    }

    const res = await api.patch<Sale>(
      `/database/rows/table/${TABLE_IDS.SALES}/${id}/?user_field_names=true`,
      payload
    );
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/database/rows/table/${TABLE_IDS.SALES}/${id}/`);
  },
};
