// Frontend/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://superwealthy-numerously-collin.ngrok-free.dev/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', 
  },
  timeout: 10000,
});

// ✅ INTERCEPTOR CORREGIDO - Con mejor manejo de async/await
api.interceptors.request.use(
  async (config) => {
    try {
      console.log('🚀 Preparando request a:', `${config.baseURL}${config.url}`);
      
      // Asegurar que el header de ngrok siempre esté presente
      if (!config.headers['ngrok-skip-browser-warning']) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
      }
      
      // ✅ CORREGIDO: Obtener token de forma segura
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔐 Token disponible:', token ? `SÍ (${token.substring(0, 20)}...)` : 'NO');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Token añadido a headers');
      } else {
        console.log('⚠️  No se encontró token, enviando request sin autenticación');
      }
    } catch (error) {
      console.error('❌ Error obteniendo token en interceptor:', error);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ Response exitoso:', {
      status: response.status,
      url: response.config.url,
      dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
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
      console.log('🔐 Sesión expirada - Limpiando datos de autenticación');
      AsyncStorage.multiRemove(['authToken', 'userData']);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials: { nombreUsuario: string; contrasena: string }) => 
    api.post('/auth/login', credentials),
};

export const tasksAPI = {
  getAll: () => {
    console.log('📋 tasksAPI.getAll() llamado');
    return api.get('/tareas');
  },
  create: (taskData: any) => {
    console.log('➕ Creando tarea:', taskData);
    return api.post('/tareas', taskData);
  },
  update: (id: number, taskData: any) => {
    console.log('✏️ Actualizando tarea:', id);
    return api.put(`/tareas/${id}`, taskData);
  },
  updateStatus: (id: number, estado: string) => {
    console.log('🔄 Cambiando estado:', id, estado);
    return api.patch(`/tareas/${id}/estado`, { estado });
  },
  delete: (id: number) => {
    console.log('🗑️ Eliminando tarea:', id);
    return api.delete(`/tareas/${id}`);
  },
  
  // Búsqueda y usuarios
  searchUsers: (query: string) => {
    console.log('🔍 Buscando usuarios:', query);
    return api.get(`/tareas/users/search?query=${encodeURIComponent(query)}`);
  },
  getUsers: () => {
    console.log('👥 Obteniendo usuarios');
    return api.get('/tareas/users');
  },
  getStats: () => {
    console.log('📊 Obteniendo estadísticas');
    return api.get('/tareas/stats');
  },
};

// Helper functions para autenticación - CORREGIDO
export const authHelper = {
  // ✅ NUEVO: Guardar datos con AsyncStorage (async)
  saveAuthData: async (token: string, user: any) => {
    try {
      console.log('💾 Guardando auth data...');
      await AsyncStorage.multiSet([
        ['authToken', token],
        ['userData', JSON.stringify(user)]
      ]);
      console.log('✅ Auth data guardado correctamente');
    } catch (error) {
      console.error('❌ Error guardando auth data:', error);
      throw error;
    }
  },

  // ✅ NUEVO: Obtener datos de autenticación (async)
  getAuthData: async () => {
    try {
      const [token, user] = await AsyncStorage.multiGet(['authToken', 'userData']);
      console.log('🔍 Token recuperado:', token[1] ? 'SÍ' : 'NO');
      console.log('🔍 User data recuperado:', user[1] ? 'SÍ' : 'NO');
      
      return {
        token: token[1],
        user: user[1] ? JSON.parse(user[1]) : null
      };
    } catch (error) {
      console.error('❌ Error obteniendo auth data:', error);
      return { token: null, user: null };
    }
  },

  // ✅ NUEVO: Limpiar datos de autenticación (async)
  clearAuthData: async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      console.log('✅ Auth data limpiado correctamente');
    } catch (error) {
      console.error('❌ Error limpiando auth data:', error);
    }
  },

  // ✅ CORREGIDO: Funciones legacy ahora también async
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  getToken: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔑 Token obtenido:', token ? 'SÍ' : 'NO');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
};

export default api;