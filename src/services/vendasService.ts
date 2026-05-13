import { api } from "./api";
import { Sale } from "@/src/types";
import { TABLE_IDS } from "@/src/constants";
import { usuariosService } from "./usuariosService";
import { parseNumber } from "@/lib/utils";

export const vendasService = {
  getAll: async () => {
    const user = usuariosService.getCurrentUser();
    if (!user) return [];
    
    const res = await api.get<{ results: any[] }>(
      `/database/rows/table/${TABLE_IDS.SALES}/?user_field_names=true&filter__field_user_id__equal=${user.id}`
    );
    
    // Normalize Baserow objects (Single Select) to strings
    const normalized = (res.data.results || []).map(sale => ({
      ...sale,
      status: typeof sale.status === 'object' && sale.status !== null ? sale.status.value : sale.status,
      marca: typeof sale.marca === 'object' && sale.marca !== null ? sale.marca.value : sale.marca,
    }));

    return normalized;
  },
  create: async (data: any) => {
    const user = usuariosService.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    const payload = {
      ...data,
      user_id: Number(user.id),
      cliente_id: Number(Array.isArray(data.cliente_id) ? data.cliente_id[0] : data.cliente_id),
      custo: parseNumber(data.custo),
      valor_venda: parseNumber(data.valor_venda),
      lucro: parseNumber(data.lucro),
      produto: data.produto || "",
      marca: data.marca || "",
      qtd_parcelas: Number(data.qtd_parcelas),
      status: data.status || 'Pendente'
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
    
    if (payload.user_id) {
      payload.user_id = Number(Array.isArray(payload.user_id) ? payload.user_id[0] : payload.user_id);
    }
    if (payload.cliente_id) {
      payload.cliente_id = Number(Array.isArray(payload.cliente_id) ? payload.cliente_id[0] : payload.cliente_id);
    }
    
    if (payload.custo !== undefined) payload.custo = parseNumber(payload.custo);
    if (payload.valor_venda !== undefined) payload.valor_venda = parseNumber(payload.valor_venda);
    if (payload.lucro !== undefined) payload.lucro = parseNumber(payload.lucro);
    if (payload.qtd_parcelas !== undefined) payload.qtd_parcelas = Number(payload.qtd_parcelas);
    if (payload.produtos && typeof payload.produtos !== 'string') payload.produtos = JSON.stringify(payload.produtos);

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
