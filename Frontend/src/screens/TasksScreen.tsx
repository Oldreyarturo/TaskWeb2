import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { tasksAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';


//Hola yuyu

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

interface User {
  idUsuario: number;
  nombreUsuario: string;
}

const TasksScreen = ({ navigation }: any) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Estados para el modal de eliminación
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  // Estados para la búsqueda de usuarios
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  
  const { 
    user, 
    loading: authLoading,
    isAdmin, 
    isSupervisor, 
    isUser, 
    canCreateTask, 
    canDeleteTasks, 
    canAssignTasks, 
    canSeeAllTasks 
  } = useAuth();
  
  // Estados del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [asignadoAId, setAsignadoAId] = useState<number | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  //  CORREGIDO: Solo cargar cuando el usuario esté disponible
  useEffect(() => {
    console.log('🔍 [TASKS] Estado auth:', { 
      user: user?.username, 
      authLoading 
    });
    
    if (!authLoading && user) {
      console.log(' [TASKS] Usuario listo, cargando datos...');
      loadData();
    } else if (!authLoading && !user) {
      console.log('❌ [TASKS] No hay usuario, mostrando error...');
      setError('No hay usuario autenticado');
      setLoading(false);
    }
  }, [authLoading, user]);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [TASKS] Cargando datos para usuario:', user?.username, 'Rol:', user?.role);
      
      // ✅ Cargar SOLO tareas primero
      console.log('📋 [TASKS] Llamando a tasksAPI.getAll()...');
      const tasksResponse = await tasksAPI.getAll();
      console.log('✅ [TASKS] Tareas cargadas:', {
        status: tasksResponse.status,
        dataLength: tasksResponse.data?.length || 0,
        data: tasksResponse.data
      });
      
      // ✅ Validar que sea un array y filtrar elementos inválidos
      const validTasks = Array.isArray(tasksResponse.data) 
        ? tasksResponse.data.filter(task => task && task.idTarea)
        : [];
      
      console.log('✅ [TASKS] Tareas válidas:', validTasks.length);
      setTasks(validTasks);
      
      // ✅ SOLO cargar usuarios si el usuario es Admin o Supervisor
      if (isAdmin() || isSupervisor()) {
        console.log('👥 [TASKS] Cargando usuarios...');
        try {
          const usersResponse = await tasksAPI.getUsers();
          console.log('✅ [TASKS] Usuarios cargados:', usersResponse.data?.length || 0);
          setUsers(usersResponse.data || []);
        } catch (usersError: any) {
          console.log('⚠️ [TASKS] Error cargando usuarios (esperado):', usersError.message);
          setUsers([]);
        }
      } else {
        console.log('🚫 [TASKS] Usuario normal - No carga usuarios');
        setUsers([]);
      }
      
    } catch (error: any) {
      console.error('❌ [TASKS] Error cargando datos:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });
      
      if (error.response?.status === 403) {
        console.log('⚠️ [TASKS] Error 403 esperado - Usuario sin permisos para esa ruta');
      } else {
        setError('No se pudieron cargar las tareas: ' + error.message);
      }
      
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para buscar usuarios
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      console.log('🔍 Buscando usuarios:', query);
      const response = await tasksAPI.searchUsers(query);
      console.log('✅ Resultados búsqueda:', response.data);
      setSearchResults(response.data);
    } catch (error: any) {
      console.error('❌ Error buscando usuarios:', error);
      // Fallback: filtrar usuarios locales
      const filteredUsers = users.filter(user => 
        user.nombreUsuario.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filteredUsers);
    } finally {
      setSearching(false);
    }
  };

  // Función para seleccionar usuario
  const selectUser = (user: User) => {
    setAsignadoAId(user.idUsuario);
    setSearchQuery(user.nombreUsuario);
    setSearchResults([]);
  };

  // Función para limpiar asignación
  const clearAssignment = () => {
    setAsignadoAId(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setAsignadoAId(null);
    setSearchQuery('');
    setSearchResults([]);
    setFechaVencimiento('');
    setEditingTask(null);
    setCalendarVisible(false);
  };

  const openCreateModal = () => {
    if (!canCreateTask()) {
      Alert.alert('Permiso Denegado', 'No tienes permisos para crear tareas');
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    if (!isAdmin() && !isSupervisor()) {
      Alert.alert('Permiso Denegado', 'Solo administradores y supervisores pueden editar tareas');
      return;
    }
    
    setTitulo(task.titulo);
    setDescripcion(task.descripcion || '');
    setAsignadoAId(task.asignadoAId);
    setSearchQuery(task.asignadoA || '');
    setFechaVencimiento(task.fechaVencimiento || '');
    setEditingTask(task);
    setModalVisible(true);
  };

  // Función para obtener la fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Manejar selección de fecha del calendario
  const handleDateSelect = (day: any) => {
    const selectedDate = new Date(day.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert('Fecha inválida', 'No puedes seleccionar una fecha anterior a hoy');
      return;
    }

    setFechaVencimiento(day.dateString);
    setCalendarVisible(false);
  };

  // Validar fecha manual ingresada
  const validateManualDate = (dateString: string) => {
    if (!dateString) return true;
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert('Fecha inválida', 'No puedes seleccionar una fecha anterior a hoy');
      setFechaVencimiento('');
      return false;
    }
    return true;
  };

  // ✅ CREAR TAREA
  const handleCreateTask = async () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (fechaVencimiento && !validateManualDate(fechaVencimiento)) {
      return;
    }

    try {
      const taskData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        asignadoAId,
        fechaVencimiento: fechaVencimiento || null
      };

      console.log('➕ Creando tarea:', taskData);
      await tasksAPI.create(taskData);
      await loadData();
      setModalVisible(false);
      resetForm();
      Alert.alert('✅ Éxito', 'Tarea creada correctamente');
    } catch (error: any) {
      console.error('❌ Error creando tarea:', error);
      Alert.alert('❌ Error', 'No se pudo crear la tarea: ' + error.message);
    }
  };

  // ✅ ACTUALIZAR TAREA
  const handleUpdateTask = async () => {
    if (!titulo.trim() || !editingTask) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }

    if (fechaVencimiento && !validateManualDate(fechaVencimiento)) {
      return;
    }

    try {
      const taskData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        asignadoAId,
        fechaVencimiento: fechaVencimiento || null,
        estado: editingTask.estado
      };

      console.log('✏️ Actualizando tarea:', editingTask.idTarea, taskData);
      await tasksAPI.update(editingTask.idTarea, taskData);
      await loadData();
      setModalVisible(false);
      resetForm();
      Alert.alert('✅ Éxito', 'Tarea actualizada correctamente');
    } catch (error: any) {
      console.error('❌ Error actualizando tarea:', error);
      Alert.alert('❌ Error', 'No se pudo actualizar la tarea: ' + error.message);
    }
  };

  // ✅ ACTUALIZAR ESTADO
  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      console.log('🔄 Cambiando estado:', taskId, 'a', newStatus);
      await tasksAPI.updateStatus(taskId, newStatus);
      await loadData();
      Alert.alert('✅ Éxito', 'Estado actualizado correctamente');
    } catch (error: any) {
      console.error('❌ Error actualizando estado:', error);
      Alert.alert('❌ Error', 'No se pudo actualizar el estado: ' + error.message);
    }
  };

  // 🗑️ ELIMINAR TAREA
  const handleDeleteTask = (task: Task) => {
    console.log('🔍 DEBUG handleDeleteTask llamado');
    console.log('🔍 Usuario:', user?.username, 'Rol:', user?.role);
    console.log('🔍 Tarea a eliminar:', task.idTarea, task.titulo);

    if (!canDeleteTasks()) {
      Alert.alert('Permiso Denegado', 'Solo administradores y supervisores pueden eliminar tareas');
      return;
    }

    setTaskToDelete(task);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    
    console.log('✅ Usuario confirmó eliminación');
    console.log('🚀 Ejecutando DELETE para:', taskToDelete.idTarea);
    
    try {
      setLoading(true);
      setDeleteModalVisible(false);
      
      await tasksAPI.delete(taskToDelete.idTarea);
      console.log('✅ DELETE exitoso');
      
      await loadData();
      setTaskToDelete(null);
      
      Alert.alert('✅ Éxito', 'Tarea eliminada correctamente');
    } catch (error: any) {
      console.error('❌ Error en DELETE:', error);
      Alert.alert('❌ Error', 'No se pudo eliminar la tarea: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    console.log('❌ Usuario canceló eliminación');
    setDeleteModalVisible(false);
    setTaskToDelete(null);
  };

  // ✅ CORREGIDO: Estados de carga y error
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando usuario...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No hay usuario logueado</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Ir al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando tareas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={loadData}>
          <Text style={styles.linkText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'completada': return '#10b981';
      case 'enProgreso': return '#f59e0b';
      case 'pendiente': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'completada': return 'Completada';
      case 'enProgreso': return 'En Progreso';
      case 'pendiente': return 'Pendiente';
      default: return estado;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      {/* Header con título y estado */}
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.titulo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{getStatusText(item.estado)}</Text>
        </View>
      </View>

      {/* Descripción */}
      {item.descripcion ? (
        <Text style={styles.taskDescription}>{item.descripcion}</Text>
      ) : null}

      {/* Detalles de la tarea */}
      <View style={styles.taskDetails}>
        <Text style={styles.detailText}>📝 Creado por: {item.creadorPor}</Text>
        <Text style={styles.detailText}>👤 Asignado a: {item.asignadoA || 'Sin asignar'}</Text>
        {item.fechaVencimiento && (
          <Text style={styles.detailText}>
            📅 Vence: {new Date(item.fechaVencimiento).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Acciones */}
      <View style={styles.taskActions}>
        
        {/* Botones de editar y eliminar - SOLO Admin y Supervisor */}
        {(isAdmin() || isSupervisor()) && (
          <View style={styles.mainActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <Text style={styles.actionButtonText}>✏️ Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteTask(item)}
            >
              <Text style={styles.actionButtonText}>🗑️ Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botones de estado - SOLO si está asignado al usuario o es Admin/Supervisor */}
        {(item.asignadoAId === user?.id || isAdmin() || isSupervisor()) && (
          <View style={styles.statusActions}>
            <Text style={styles.statusLabel}>Cambiar estado:</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity 
                style={[styles.statusButton, item.estado === 'pendiente' && styles.statusButtonActive]}
                onPress={() => handleUpdateStatus(item.idTarea, 'pendiente')}
              >
                <Text style={styles.statusButtonText}>⏳ Pendiente</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusButton, item.estado === 'enProgreso' && styles.statusButtonActive]}
                onPress={() => handleUpdateStatus(item.idTarea, 'enProgreso')}
              >
                <Text style={styles.statusButtonText}>🔄 En Progreso</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusButton, item.estado === 'completada' && styles.statusButtonActive]}
                onPress={() => handleUpdateStatus(item.idTarea, 'completada')}
              >
                <Text style={styles.statusButtonText}>✅ Completada</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗂️ Gestión de Tareas</Text>
        <Text style={styles.userRole}>Usuario: {user?.username} ({user?.role})</Text>
        
        {/* SOLO Admin y Supervisor pueden crear tareas */}
        {(isAdmin() || isSupervisor()) && (
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Text style={styles.addButtonText}>+ Nueva Tarea</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Tareas */}
      <FlatList
        data={tasks.filter(task => task && task.idTarea)}
        renderItem={renderTaskItem}
        keyExtractor={(item, index) => {
          if (item && item.idTarea) {
            return item.idTarea.toString();
          }
          return `task-${index}`;
        }}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay tareas disponibles</Text>
            <Text style={styles.emptySubtext}>
              {isAdmin() || isSupervisor() 
                ? 'Comienza creando tu primera tarea' 
                : 'No tienes tareas asignadas'}
            </Text>
          </View>
        }
      />

      {/* Modal para Crear/Editar Tarea */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </Text>

            <ScrollView style={styles.modalForm}>
              {/* Título */}
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Título de la tarea"
                value={titulo}
                onChangeText={setTitulo}
              />

              {/* Descripción */}
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción de la tarea"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
              />

              {/* Asignación - solo si puede asignar (Admin y Supervisor) */}
              {(isAdmin() || isSupervisor()) && (
                <>
                  <Text style={styles.label}>Asignar a</Text>
                  
                  {/* Input de búsqueda */}
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar usuario por nombre..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searching && (
                      <ActivityIndicator size="small" color="#6366f1" style={styles.searchLoader} />
                    )}
                  </View>

                  {/* Opción "Sin asignar" - siempre visible */}
                  <TouchableOpacity
                    style={[styles.userOption, !asignadoAId && styles.userOptionSelected]}
                    onPress={clearAssignment}
                  >
                    <Text style={styles.userOptionText}>👤 Sin asignar</Text>
                  </TouchableOpacity>

                  {/* Resultados de búsqueda */}
                  {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      <Text style={styles.searchResultsTitle}>Resultados:</Text>
                      {searchResults.map(user => (
                        <TouchableOpacity
                          key={user.idUsuario}
                          style={[
                            styles.userOption, 
                            asignadoAId === user.idUsuario && styles.userOptionSelected
                          ]}
                          onPress={() => selectUser(user)}
                        >
                          <Text style={styles.userOptionText}>👤 {user.nombreUsuario}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Mostrar usuario actualmente seleccionado */}
                  {asignadoAId && searchQuery === '' && (
                    <View style={styles.selectedUser}>
                      <Text style={styles.selectedUserText}>
                        👤 {users.find(u => u.idUsuario === asignadoAId)?.nombreUsuario}
                      </Text>
                      <TouchableOpacity onPress={clearAssignment}>
                        <Text style={styles.clearSelectionText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Mensaje cuando no hay resultados */}
                  {searchQuery.trim() !== '' && searchResults.length === 0 && !searching && (
                    <Text style={styles.noResultsText}>No se encontraron usuarios</Text>
                  )}
                </>
              )}

              {/* Fecha de vencimiento */}
              <Text style={styles.label}>Fecha de vencimiento</Text>
              
              {/* Input de fecha con botón de calendario */}
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="YYYY-MM-DD"
                  value={fechaVencimiento}
                  onChangeText={(text) => {
                    setFechaVencimiento(text);
                    if (text) validateManualDate(text);
                  }}
                />
                <TouchableOpacity 
                  style={styles.calendarButton}
                  onPress={() => setCalendarVisible(true)}
                >
                  <Text style={styles.calendarButtonText}>📅</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Selecciona una fecha igual o posterior a hoy</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={editingTask ? handleUpdateTask : handleCreateTask}
              >
                <Text style={styles.saveButtonText}>
                  {editingTask ? 'Actualizar' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del Calendario */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.calendarModalContainer}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.calendarTitle}>Seleccionar Fecha</Text>
            
            <Calendar
              minDate={getMinDate()}
              onDayPress={handleDateSelect}
              markedDates={{
                [fechaVencimiento]: {
                  selected: true,
                  selectedColor: '#6366f1',
                }
              }}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#6366f1',
                selectedDayBackgroundColor: '#6366f1',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#6366f1',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                arrowColor: '#6366f1',
                monthTextColor: '#6366f1',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14
              }}
            />
            
            <TouchableOpacity 
              style={styles.calendarCloseButton}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={styles.calendarCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Eliminar Tarea</Text>
            <Text style={styles.deleteModalText}>
              ¿Estás seguro de eliminar la tarea "{taskToDelete?.titulo}"?
            </Text>
            <Text style={styles.deleteModalWarning}>
              Esta acción no se puede deshacer.
            </Text>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity 
                style={styles.deleteCancelButton}
                onPress={cancelDelete}
              >
                <Text style={styles.deleteCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
  },
  linkText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userRole: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 10,
  },
  taskCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskDescription: {
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  taskActions: {
    gap: 12,
  },
  mainActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  statusActions: {
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e293b',
  },
  modalForm: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResults: {
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  userOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  userOptionSelected: {
    backgroundColor: '#6366f1',
  },
  userOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedUser: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 16,
  },
  selectedUserText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
  },
  clearSelectionText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noResultsText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
  },
  calendarButton: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  calendarButtonText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  calendarModalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1e293b',
  },
  calendarCloseButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  deleteModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#ef4444',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  deleteCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  deleteCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  deleteConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  deleteConfirmText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default TasksScreen;