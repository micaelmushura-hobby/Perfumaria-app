import { api } from "./api";
import { Usuario } from "@/src/types";

export const usuariosService = {
  register: async (data: { nome: string; email: string; senha: string; telefone: string }) => {
    const res = await api.post("/register", data);
    return res.data;
  },
  login: async (email: string, senha: string) => {
    const res = await api.post<{ user: Usuario; token: string }>("/login", { email, senha });
    localStorage.setItem("aura_token", res.data.token);
    localStorage.setItem("aura_user", JSON.stringify(res.data.user));
    return res.data;
  },
  logout: () => {
    localStorage.removeItem("aura_token");
    localStorage.removeItem("aura_user");
  },
  getCurrentUser: () => {
    const user = localStorage.getItem("aura_user");
    return user ? JSON.parse(user) : null;
  }
};
