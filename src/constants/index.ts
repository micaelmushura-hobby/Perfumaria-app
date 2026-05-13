export const TABLE_IDS = {
  USUARIOS: import.meta.env.VITE_TABLE_USUARIOS || "954",
  CLIENTS: import.meta.env.VITE_TABLE_CLIENTES || "955",
  SALES: import.meta.env.VITE_TABLE_VENDAS || "956",
  INSTALLMENTS: import.meta.env.VITE_TABLE_PARCELAS || "957",
};

export const BRANDS = ["O Boticário", "Natura", "Eudora", "Avon", "Hinode", "Mary Kay", "Outros"];

export const SALES_STATUS = [
  'Pendente',
  'Pago',
  'Parcial',
  'Em Aberto'
];

export const INSTALLMENT_STATUS = [
  'Pendente',
  'Pago',
  'Vencido',
  'Em Aberto'
];
