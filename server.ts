import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aura_secret_key";
const BASEROW_BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://base.appbaserow.com.br";
const BASEROW_TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const BASEROW_API_URL = `${BASEROW_BASE_URL}/api/database/rows/table`;

if (!BASEROW_TOKEN) {
  console.error("FATAL: NEXT_PUBLIC_BASEROW_TOKEN is not defined in environment variables.");
}

app.use(express.json());

// Helper to get headers safely
const getBaserowHeaders = () => {
  const token = process.env.NEXT_PUBLIC_BASEROW_TOKEN || process.env.BASEROW_TOKEN;
  if (!token) {
    console.error('[API SETUP] BASEROW_TOKEN NÃO ENCONTRADO NAS VARIÁVEIS DE AMBIENTE');
    throw new Error("Configuração de API pendente (Token ausente). Verifique as variáveis de ambiente.");
  }
  return {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };
};

const sanitizePhone = (phone: string) => {
  return phone.replace(/[()\s*]/g, "");
};

const getWhatsappLink = (phone: string) => {
  const cleanPhone = sanitizePhone(phone);
  return `https://wa.me/55${cleanPhone}`;
};

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
};

// --- AUTH ENDPOINTS ---
app.post("/api/register", async (req, res) => {
  const { nome, email, senha, telefone } = req.body;
  console.log('[API] TENTATIVA DE REGISTRO:', { nome, email, telefone });

  try {
    const tableId = process.env.NEXT_PUBLIC_TABLE_USUARIOS || "954";
    const headers = getBaserowHeaders();
    const checkUrl = `${BASEROW_API_URL}/${tableId}/?user_field_names=true&filter__field_email__equal=${email}`;
    
    console.log(`[BASEROW] GET ${checkUrl}`);
    const checkUser = await axios.get(checkUrl, { headers });

    if (checkUser.data.results && checkUser.data.results.length > 0) {
      console.warn('[API] EMAIL JÁ EXISTE:', email);
      return res.status(400).json({ error: "E-mail já cadastrado" });
    }

    const hashedSenha = await bcrypt.hash(senha, 10);
    const cleanPhone = sanitizePhone(telefone);
    
    const newUser = {
      nome,
      email,
      senha: hashedSenha,
      telefone: cleanPhone
      // Removido whatsapp_link pois é um campo de formula (read-only) no Baserow
    };

    const postUrl = `${BASEROW_API_URL}/${tableId}/?user_field_names=true`;
    console.log(`[BASEROW] POST ${postUrl} - DATA:`, JSON.stringify(newUser));

    const response = await axios.post(postUrl, newUser, { headers });

    console.log('[API] SUCESSO NO REGISTRO');
    res.status(201).json({ message: "Usuário criado com sucesso" });
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error('[API] ERRO NO REGISTRO:', JSON.stringify(errorDetail));
    res.status(500).json({ error: "Erro ao criar conta no Baserow", details: errorDetail });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  console.log('[API] TENTATIVA DE LOGIN:', email);

  try {
    const tableId = process.env.NEXT_PUBLIC_TABLE_USUARIOS || "954";
    const loginUrl = `${BASEROW_API_URL}/${tableId}/?user_field_names=true&filter__field_email__equal=${email}`;
    
    const response = await axios.get(loginUrl, { headers: getBaserowHeaders() });

    const users = response.data.results;
    if (!users || users.length === 0) {
      console.warn('[API] USUÁRIO NÃO ENCONTRADO:', email);
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(senha, user.senha);

    if (!passwordMatch) {
      console.warn('[API] SENHA INCORRETA PARA:', email);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const { senha: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ user: userWithoutPassword, token });
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error('[API] ERRO NO LOGIN:', errorDetail);
    res.status(500).json({ error: "Erro no servidor durante login", details: errorDetail });
  }
});

// --- PROXY ENDPOINTS (PROTECTED) ---
app.get("/api/baserow/:tableId", authenticateToken, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const userId = req.user.id;
    
    // Append user_id filter automatically
    const url = `${BASEROW_API_URL}/${tableId}/?user_field_names=true&filter__field_user_id__equal=${userId}`;
    
    const response = await axios.get(url, { headers: getBaserowHeaders() });
    res.json(response.data);
  } catch (error: any) {
    console.error("GET Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

app.post("/api/baserow/:tableId", authenticateToken, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const userId = req.user.id;
    
    // Copy body and inject user_id as an array (Baserow Link field requirement)
    const data = { ...req.body };
    data.user_id = [userId];

    // Check for other common links and wrap them in arrays if they are single values
    if (data.cliente_id && !Array.isArray(data.cliente_id)) {
      data.cliente_id = [data.cliente_id];
    }
    if (data.venda_id && !Array.isArray(data.venda_id)) {
      data.venda_id = [data.venda_id];
    }
    
    // Sanitize phone if provided
    if (data.telefone) {
      const cleanPhone = sanitizePhone(data.telefone);
      data.telefone = cleanPhone;
      // Removido whatsapp_link manual pois costuma ser formula no Baserow
    }

    const response = await axios.post(`${BASEROW_API_URL}/${tableId}/?user_field_names=true`, data, {
      headers: getBaserowHeaders(),
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("POST Error:", JSON.stringify(error.response?.data || error.message));
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

app.patch("/api/baserow/:tableId/:rowId", authenticateToken, async (req: any, res) => {
  try {
    const { tableId, rowId } = req.params;
    const data = { ...req.body };

    // Wrap Link fields in arrays if they are present and not already arrays
    if (data.user_id && !Array.isArray(data.user_id)) {
      data.user_id = [data.user_id];
    }
    if (data.cliente_id && !Array.isArray(data.cliente_id)) {
      data.cliente_id = [data.cliente_id];
    }
    if (data.venda_id && !Array.isArray(data.venda_id)) {
      data.venda_id = [data.venda_id];
    }

    // Sanitize phone if provided
    if (data.telefone) {
      const cleanPhone = sanitizePhone(data.telefone);
      data.telefone = cleanPhone;
      // Removido whatsapp_link manual pois costuma ser formula no Baserow
    }

    const response = await axios.patch(`${BASEROW_API_URL}/${tableId}/${rowId}/?user_field_names=true`, data, {
      headers: getBaserowHeaders(),
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("PATCH Error:", JSON.stringify(error.response?.data || error.message));
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

app.delete("/api/baserow/:tableId/:rowId", authenticateToken, async (req, res) => {
  try {
    const { tableId, rowId } = req.params;
    await axios.delete(`${BASEROW_API_URL}/${tableId}/${rowId}/`, {
      headers: getBaserowHeaders(),
    });
    res.status(204).send();
  } catch (error: any) {
    console.error("DELETE Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
