import { api } from "./api";
import { Client } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";
import { usuariosService } from "./usuariosService";

export const clientesService = {
  getAll: async () => {
    const user = usuariosService.getCurrentUser();
    if (!user) return [];
    
    const res = await api.get<{ results: Client[] }>(
      `/database/rows/table/${TABLE_IDS.CLIENTS}/?user_field_names=true&filter__field_user_id__equal=${user.id}`
    );
    return res.data.results || [];
  },
  create: async (data: Omit<Client, "id" | "user_id" | "criado_em" | "whatsapp_link">) => {
    const user = usuariosService.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Phone sanitization and link generation
    const cleanPhone = data.telefone.replace(/[()\s*-]/g, "");
    const whatsapp_link = `https://wa.me/55${cleanPhone}`;

    const payload = {
      ...data,
      telefone: cleanPhone,
      whatsapp_link,
      user_id: [user.id] // Link fields must be arrays
    };

    const res = await api.post<Client>(`/database/rows/table/${TABLE_IDS.CLIENTS}/?user_field_names=true`, payload);
    return res.data;
  },
  update: async (id: number, data: Partial<Client>) => {
    const payload: any = { ...data };
    
    if (payload.telefone) {
      const cleanPhone = payload.telefone.replace(/[()\s*-]/g, "");
      payload.telefone = cleanPhone;
      payload.whatsapp_link = `https://wa.me/55${cleanPhone}`;
    }

    if (payload.user_id && !Array.isArray(payload.user_id)) {
      payload.user_id = [payload.user_id];
    }

    const res = await api.patch<Client>(`/database/rows/table/${TABLE_IDS.CLIENTS}/${id}/?user_field_names=true`, payload);
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/database/rows/table/${TABLE_IDS.CLIENTS}/${id}/`);
  },
};
