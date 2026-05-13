import { api } from "./api";
import { Sale } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";

export const vendasService = {
  getAll: async () => {
    const res = await api.get<{ results: Sale[] }>(`/baserow/${TABLE_IDS.SALES}`);
    return res.data.results || [];
  },
  create: async (data: any) => {
    // Backend handles user_id
    const res = await api.post<Sale>(`/baserow/${TABLE_IDS.SALES}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/baserow/${TABLE_IDS.SALES}/${id}`);
  },
};
