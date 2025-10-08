import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { authHelper } from '../services/api';
import { tasksAPI } from '../services/api';

//  USAR LAS MISMAS INTERFACES QUE TU TASKSCREEN
interface Task {
  idTarea: number;
  titulo: string;
  descripcion: string;
  estado: 'pendiente' | 'enProgreso' | 'completada';
  creadoPorId: number;
  creadorPor: string;
  asignadoAId: number | null;
  asignadoA: string | null;
  fechaVencimiento: string;
}

interface Stats {
  total: number;
  pendientes: number;
  completadas: number;
  asignadas: number;
}

const DashboardScreen = ({ navigation }: any) => {
  const { user, logout, loading: authLoading, getDisplayName } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pendientes: 0,
    completadas: 0,
    asignadas: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // ✅ Para forzar actualizaciones

  // ✅ Función para cargar estadísticas
  const loadStats = async () => {
    if (!user) return;
    
    try {
      console.log('📊 Cargando estadísticas de tareas...');
      setLoadingStats(true);
      
      const response = await tasksAPI.getAll();
      const tasks: Task[] = response.data || [];
      
      console.log(`📋 Total de tareas recibidas: ${tasks.length}`);
      
      // ✅ CALCULAR ESTADÍSTICAS CON TIPOS CORRECTOS
      const total = tasks.length;
      const pendientes = tasks.filter((task: Task) => task.estado === 'pendiente').length;
      const completadas = tasks.filter((task: Task) => task.estado === 'completada').length;
      const asignadas = tasks.filter((task: Task) => task.asignadoAId === user.id).length;
      
      setStats({
        total,
        pendientes,
        completadas,
        asignadas
      });
      
      console.log('📊 Estadísticas actualizadas:', { total, pendientes, completadas, asignadas });
      
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // ✅ Cargar estadísticas al montar el componente
  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, refreshKey]); // ✅ Se ejecuta cuando user cambia o refreshKey cambia

  // ✅ ACTUALIZAR AUTOMÁTICAMENTE AL REGRESAR AL DASHBOARD
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Dashboard enfocado - actualizando estadísticas...');
      loadStats();
    }, [user])
  );

  // ✅ Función para forzar actualización manual
  const refreshStats = () => {
    console.log('🔄 Actualización manual de estadísticas');
    setRefreshKey(prev => prev + 1);
  };

  // ✅ LOGOUT DIRECTO
  const handleLogout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      setLoggingOut(true);
      
      await authHelper.clearAuthData();
      logout();
      navigation.replace('Login');
      
    } catch (error) {
      console.error('❌ Error en logout:', error);
      navigation.replace('Login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>No hay usuario autenticado</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.buttonText}>Ir al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola, {getDisplayName()}!</Text>
          <Text style={styles.role}>{user.role}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Botón para actualizar estadísticas */}
          <TouchableOpacity 
            onPress={refreshStats}
            style={styles.refreshButton}
            disabled={loadingStats}
          >
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>

          {/* Botón de logout */}
          <TouchableOpacity 
            onPress={handleLogout} 
            style={[
              styles.logoutBtn,
              loggingOut && styles.logoutBtnDisabled
            ]}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.logoutText}>🚪 Salir</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Información del Usuario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Usuario</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}><Text style={styles.bold}>Nombre:</Text> {getDisplayName()}</Text>
            <Text style={styles.infoText}><Text style={styles.bold}>Rol:</Text> {user.role}</Text>
            <Text style={styles.infoText}><Text style={styles.bold}>ID:</Text> {user.id}</Text>
          </View>
        </View>

        {/* Estadísticas de Tareas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumen de Tareas</Text>
            <TouchableOpacity onPress={refreshStats} disabled={loadingStats}>
              <Text style={styles.refreshLink}>
                {loadingStats ? 'Actualizando...' : 'Actualizar'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {loadingStats ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.loadingText}>Cargando estadísticas...</Text>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {/* Total de Tareas */}
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total de Tareas</Text>
              </View>

              {/* Tareas Pendientes */}
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, styles.statPending]}>{stats.pendientes}</Text>
                <Text style={styles.statLabel}>Pendientes</Text>
              </View>

              {/* Tareas Completadas */}
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, styles.statCompleted]}>{stats.completadas}</Text>
                <Text style={styles.statLabel}>Completadas</Text>
              </View>

              {/* Tareas Asignadas a Mí */}
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, styles.statAssigned]}>{stats.asignadas}</Text>
                <Text style={styles.statLabel}>Asignadas a Mí</Text>
              </View>
            </View>
          )}
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Text style={styles.actionText}>📋 Ver Todas las Tareas ({stats.total})</Text>
          </TouchableOpacity>

          {(user.role === 'Administrador' || user.role === 'Supervisor') && (
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Tasks')}
            >
              <Text style={styles.actionText}>➕ Crear Nueva Tarea</Text>
            </TouchableOpacity>
          )}

          {/* Botón para ver solo mis tareas asignadas */}
          {stats.asignadas > 0 && (
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Tasks')}
            >
              <Text style={styles.actionText}>👤 Ver Mis Tareas ({stats.asignadas})</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  role: {
    fontSize: 14,
    color: 'gray',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  refreshText: {
    fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  logoutBtnDisabled: {
    backgroundColor: '#6c757d',
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshLink: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  // Estadísticas
  loadingStats: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6c757d',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  statPending: {
    color: '#fd7e14',
  },
  statCompleted: {
    color: '#28a745',
  },
  statAssigned: {
    color: '#6f42c1',
  },
  statLabel: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Acciones
  actionBtn: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  spacer: {
    height: 50,
  },
});

export default DashboardScreen;