import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const DashboardScreen = ({ navigation }: any) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.welcome}>Hola, {user.username}</Text>
      </View>

      {/* SOLO EL BOTÓN DE TAREAS */}
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => navigation.navigate('Tasks')}
      >
        <Text style={styles.menuButtonText}>📋 Ir a Tareas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 30,
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  welcome: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: '600',
  },
  menuButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 18,
    color: '#212529',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DashboardScreen;