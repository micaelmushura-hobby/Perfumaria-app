import { api } from "./api";
import { Usuario } from "@/src/types";
import bcrypt from "bcryptjs";

const TABLE_USER = import.meta.env.VITE_TABLE_USUARIOS || "954";

export const usuariosService = {
  register: async (data: { nome: string; email: string; senha: string; telefone: string }) => {
    // Sanitization
    const cleanPhone = data.telefone.replace(/[()\s*-]/g, "");
    
    // Hash password
    const hashedSenha = await bcrypt.hash(data.senha, 10);

    const payload = {
      nome: data.nome,
      email: data.email,
      senha: hashedSenha,
      telefone: cleanPhone
    };

    const res = await api.post(`/database/rows/table/${TABLE_USER}/?user_field_names=true`, payload);
    return res.data;
  },
  login: async (email: string, senha: string) => {
    const res = await api.get<{ results: Usuario[] }>(
      `/database/rows/table/${TABLE_USER}/?user_field_names=true&filter__field_email__equal=${email}`
    );

    const users = res.data.results;
    if (!users || users.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    const user = users[0];
    
    // Check password
    const passwordMatch = await bcrypt.compare(senha, user.senha);
    if (!passwordMatch) {
      throw new Error("Senha incorreta");
    }

    // Prepare session
    const { senha: _, ...userWithoutPassword } = user;
    
    // Note: Since we are client-side, we don't have a JWT secret here safely. 
    // We'll just use the user object as a "token" or simple flag for now, 
    // as the user requested removing process.env (JWT logic was on server).
    localStorage.setItem("aura_token", "logged_in_" + user.id);
    localStorage.setItem("aura_user", JSON.stringify(userWithoutPassword));
    
    return { user: userWithoutPassword, token: "logged_in_" + user.id };
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
