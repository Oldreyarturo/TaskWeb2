// Frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🚀 Enviando request a:', `${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Error en request:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ Response exitoso:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Error en response:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('Sesión expirada');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials: { nombreUsuario: string; contrasena: string }) => 
    api.post('/auth/login', credentials),
};

export const tasksAPI = {
  // ✅ RUTAS CORREGIDAS - Todas empiezan con /api
  getAll: () => api.get('/tareas'),
  create: (taskData: any) => api.post('/tareas', taskData),
  update: (id: number, taskData: any) => api.put(`/tareas/${id}`, taskData),
  updateStatus: (id: number, estado: string) => api.patch(`/tareas/${id}/estado`, { estado }),
  delete: (id: number) => api.delete(`/tareas/${id}`),
  
  // Búsqueda y usuarios
  searchUsers: (query: string) => api.get(`/tareas/users/search?query=${encodeURIComponent(query)}`),
  getUsers: () => api.get('/tareas/users'),
  getStats: () => api.get('/tareas/stats'),
};

// Helper functions para autenticación
export const authHelper = {
  saveAuthData: (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  clearAuthData: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  }
};

export default api;