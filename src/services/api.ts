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
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("aura_token");
      localStorage.removeItem("aura_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
