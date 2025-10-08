import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Importar todas las pantallas
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TasksScreen from './src/screens/TasksScreen';

// Definir tipos para las pantallas
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Tasks: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { 
              backgroundColor: '#6366f1' 
            },
            headerTintColor: '#fff',
            headerTitleStyle: { 
              fontWeight: 'bold',
              fontSize: 18
            },
            headerBackTitle: 'Atrás',
            cardStyle: { backgroundColor: '#f8fafc' }
          }}
        >
          {/* Pantalla de Login - Sin header */}
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              headerShown: false,
              title: 'Iniciar Sesión'
            }}
          />
          
          {/* Pantalla Principal - Dashboard */}
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{ 
              title: 'Dashboard',
              headerLeft: () => null, // Elimina el botón de volver
              gestureEnabled: false // Desactiva el gesto de volver
            }}
          />
          
          {/* Pantalla de Gestión de Tareas */}
          <Stack.Screen 
            name="Tasks" 
            component={TasksScreen}
            options={{ 
              title: 'Gestión de Tareas',
              headerBackTitle: 'Dashboard'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}