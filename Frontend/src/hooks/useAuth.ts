// hooks/useAuth.ts - VERSIÓN CORREGIDA
import { useState, useEffect } from 'react';
import { authHelper } from '../services/api';

// En useAuth.ts, cambia la interfaz User:
export interface User {
  id: number;           
  username: string;
  nombreUsuario?: string;
  role: string;
  roleId: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🔍 Cargando usuario desde storage...');
        const { user: storedUser } = await authHelper.getAuthData();
        console.log('👤 Usuario recuperado:', storedUser);
        
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error('❌ Error cargando usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const getDisplayName = () => {
    if (!user) return 'Usuario';
    return user.nombreUsuario || user.username || 'Usuario';
  };

  const login = async (userData: User, token: string) => {
    try {
      console.log('🔐 useAuth.login() llamado:', userData);
      await authHelper.saveAuthData(token, userData);
      setUser(userData);
      console.log('✅ Usuario establecido en estado global');
    } catch (error) {
      console.error('❌ Error en useAuth.login:', error);
      throw error;
    }
  };

  // ✅ CORREGIDO: Función logout con await y manejo de errores
  const logout = async () => {
    try {
      console.log('🔄 useAuth.logout() iniciado');
      await authHelper.clearAuthData(); // ✅ AGREGADO AWAIT
      console.log('✅ AsyncStorage limpiado');
      setUser(null);
      console.log('✅ Estado de usuario limpiado');
    } catch (error) {
      console.error('❌ Error en useAuth.logout:', error);
      throw error;
    }
  };

  const isAdmin = () => user?.role === 'Administrador';
  const isSupervisor = () => user?.role === 'Supervisor';
  const isUser = () => user?.role === 'Usuario';

  // PERMISOS 
  const canCreateTask = () => isAdmin() || isSupervisor();
  const canEditTask = (taskCreatorId: number) => 
    isAdmin() || isSupervisor() || (isUser() && taskCreatorId === user?.id);
  const canDeleteTasks = () => isAdmin() || isSupervisor(); 
  const canAssignTasks = () => isAdmin() || isSupervisor();
  const canSeeAllTasks = () => isAdmin() || isSupervisor();
  const canChangeStatus = (task: any) => 
    isAdmin() || isSupervisor() || task.asignadoAId === user?.id;

  const updateUser = (userData: User | null) => {
    setUser(userData);
  };

  return {
    user,
    setUser: updateUser,
    login,
    logout,
    loading,
    getDisplayName,
    isAdmin,
    isSupervisor,
    isUser,
    canCreateTask,
    canEditTask,
    canDeleteTasks,
    canAssignTasks,
    canSeeAllTasks,
    canChangeStatus
  };
};