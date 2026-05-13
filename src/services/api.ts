import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

// Interceptor to add and handle tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aura_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API SUCCESS] ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API ERROR]:', error.response?.data || error.message);
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("aura_token");
      localStorage.removeItem("aura_user");
      if (typeof window !== 'undefined' && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Extract the message from Baserow or Axios error
    let message = 'Erro interno no servidor';
    
    if (error.response?.data) {
      const data = error.response.data;
      message = data.message || data.error || (typeof data === 'string' ? data : JSON.stringify(data));
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(String(message));
  }
);
