import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_BASEROW_URL}/api`,
  headers: {
    Authorization: `Token ${import.meta.env.VITE_BASEROW_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle internal app token if still needed for some logic, 
// though the user wants direct Baserow interaction. 
// We'll keep it for local user session persistence if needed, but the main auth is Baserow Token.

api.interceptors.request.use((config) => {
  console.log('REQUEST:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    data: config.data,
    params: config.params
  });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('RESPONSE:', response.data);
    return response;
  },
  (error) => {
    console.log('ERROR:', error.response?.data);
    
    // Baserow sometimes uses 401/403 for token issues
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Local session cleanup if needed
      // localStorage.removeItem("aura_token");
    }

    const data = error.response?.data;
    const message = data?.detail || data?.message || data?.error || error.message || 'Erro interno';
    
    // Ensure we don't return an object to the toast
    const finalMessage = typeof message === 'object' ? JSON.stringify(message) : message;

    return Promise.reject(finalMessage);
  }
);
