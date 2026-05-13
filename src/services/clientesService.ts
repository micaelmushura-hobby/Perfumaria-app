import { api } from "./api";
import { Client } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";

export const clientesService = {
  getAll: async () => {
    const res = await api.get<{ results: Client[] }>(`/baserow/${TABLE_IDS.CLIENTS}`);
    return res.data.results || [];
  },
  create: async (data: Omit<Client, "id" | "user_id" | "criado_em" | "whatsapp_link">) => {
    const res = await api.post<Client>(`/baserow/${TABLE_IDS.CLIENTS}`, data);
    return res.data;
  },
  update: async (id: number, data: Partial<Client>) => {
    const res = await api.patch<Client>(`/baserow/${TABLE_IDS.CLIENTS}/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/baserow/${TABLE_IDS.CLIENTS}/${id}`);
  },
};
