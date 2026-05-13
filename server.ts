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
const BASEROW_API_URL = "https://base.appbaserow.com.br/api/database/rows/table";
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

app.use(express.json());

const baserowHeaders = {
  Authorization: `Token ${BASEROW_TOKEN}`,
  "Content-Type": "application/json",
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
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const tableId = process.env.TABLE_USUARIOS_ID || "954";
    const response = await axios.get(`${BASEROW_API_URL}/${tableId}/?user_field_names=true&filter__field_email__equal=${email}`, {
      headers: baserowHeaders,
    });

    const users = response.data.results;
    if (!users || users.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(senha, user.senha);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    // Don't send password back
    const { senha: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ user: userWithoutPassword, token });
  } catch (error: any) {
    console.error("Login Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// Helper to sanitize phone
const sanitizePhone = (phone: string) => {
  return phone.replace(/[()\s*]/g, "");
};

// --- PROXY ENDPOINTS (PROTECTED) ---
app.get("/api/baserow/:tableId", authenticateToken, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const userId = req.user.id;
    
    // Append user_id filter automatically
    const url = `${BASEROW_API_URL}/${tableId}/?user_field_names=true&filter__field_user_id__equal=${userId}`;
    
    const response = await axios.get(url, { headers: baserowHeaders });
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
    
    const data = { ...req.body, user_id: userId };
    
    // Sanitize phone if provided
    if (data.telefone) {
      data.telefone = sanitizePhone(data.telefone);
      data.whatsapp_link = `https://wa.me/+55${data.telefone}`;
    }

    const response = await axios.post(`${BASEROW_API_URL}/${tableId}/?user_field_names=true`, data, {
      headers: baserowHeaders,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("POST Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

app.patch("/api/baserow/:tableId/:rowId", authenticateToken, async (req: any, res) => {
  try {
    const { tableId, rowId } = req.params;
    const data = { ...req.body };

    // Sanitize phone if provided
    if (data.telefone) {
      data.telefone = sanitizePhone(data.telefone);
      data.whatsapp_link = `https://wa.me/+55${data.telefone}`;
    }

    const response = await axios.patch(`${BASEROW_API_URL}/${tableId}/${rowId}/?user_field_names=true`, data, {
      headers: baserowHeaders,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("PATCH Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

app.delete("/api/baserow/:tableId/:rowId", authenticateToken, async (req, res) => {
  try {
    const { tableId, rowId } = req.params;
    await axios.delete(`${BASEROW_API_URL}/${tableId}/${rowId}/`, {
      headers: baserowHeaders,
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
