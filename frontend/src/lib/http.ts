import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';

// URL base del backend (cambia por entorno vía VITE_API_URL)
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

// Cliente Axios singleton con interceptors
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: añade Authorization Bearer si hay token
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: maneja 401 (sesión expirada) globalmente
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Sesión expirada: limpiar auth y redirigir a login
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  },
);

// Helpers tipados para los verbos comunes
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    http.get(url, { params }).then((r) => r.data as T),
  post: <T>(url: string, body?: unknown, config?: Record<string, unknown>) =>
    http.post(url, body, config).then((r) => r.data as T),
  patch: <T>(url: string, body?: unknown, config?: Record<string, unknown>) =>
    http.patch(url, body, config).then((r) => r.data as T),
  delete: <T>(url: string) => http.delete(url).then((r) => r.data as T),
};
