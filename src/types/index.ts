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
  produto: string;
  marca: string;
  custo: number;
  valor_venda: number;
  lucro: number;
  qtd_parcelas: number;
  status: string;
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
  status: "Pendente" | "Pago";
  pago_em: string | null;
  criado_em: string;
}

export interface DashboardStats {
  totalSold: number;
  totalReceived: number;
  totalOpen: number;
  totalProfit: number;
  overdueInstallments: number;
  todayCollections: number;
}

export interface AuthContextType {
  user: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}
