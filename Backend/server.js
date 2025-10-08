const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// ✅ CONFIGURACIÓN CORS MEJORADA
app.use(cors({
  origin: true, // Permitir todos los orígenes en desarrollo
  credentials: true
}));

app.use(express.json());

// Importar conexión a MySQL
const db = require('./config/database');

// Importar rutas
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');

// Usar rutas
app.use('/api/tareas', taskRoutes);
app.use('/api/auth', authRoutes);

// Ruta de prueba MEJORADA
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Backend de TaskWeb funcionando!',
    database: 'MySQL conectado correctamente',
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

// Ruta para probar conexión a BD
app.get('/api/db-status', (req, res) => {
  db.query('SELECT 1 + 1 AS result', (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error en la base de datos'
      });
    }
    res.json({
      success: true,
      message: 'Conexión a MySQL exitosa',
      result: results[0].result
    });
  });
});

// ✅ CORREGIDO: Escuchar en todas las interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎯 Servidor Express ejecutándose:`);
  console.log(`📍 URL Local: http://localhost:${PORT}`);
  console.log(`📍 URL Red: http://${getLocalIP()}:${PORT}`);
  console.log(`🕐 Iniciado: ${new Date().toLocaleString()}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// Función para obtener IP local
function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}