export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha?: string;
  telefone: string;
  whatsapp_link: string;
  criado_em: string;
}

export interface Client {
  id: number;
  user_id: number;
  nome: string;
  telefone: string;
  whatsapp_link: string;
  observacao: string;
  criado_em: string;
}

export interface Sale {
  id: number;
  user_id: number;
  cliente_id: number;
  cliente_nome: string;
  produtos: string; // JSON string format: Array<{nome: string, marca: string, custo: number, valor: number}>
  valor_venda: number;
  lucro: number;
  qtd_parcelas: number;
  status: "Pendente" | "Pago" | "Parcial" | "Em Aberto" | "Atrasado";
  metodo_pagamento?: string;
  criado_em: string;
}

export interface Installment {
  id: number;
  user_id: number;
  venda_id: number;
  cliente_nome: string;
  numero_parcela: number;
  valor_parcela: number;
  vencimento: string;
  status: "Pendente" | "Pago" | "Vencido" | "Em Aberto" | "Atrasado";
  pago_em: string | null;
  criado_em: string;
}

export interface DashboardStats {
  totalSold: number;
  totalReceived: number;
  totalOpen: number;
  totalProfit: number;
  overdueInstallments: number;
  overdueAmount: number;
  todayCollections: number;
  monthSales: number;
  debtorClientsCount: number;
}

export interface AuthContextType {
  user: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}
