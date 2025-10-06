const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

// 🔐 LOGIN
router.post('/login', async (req, res) => {
  const { nombreUsuario, contrasena } = req.body;

  console.log('🔑 Solicitud de login recibida para usuario:', nombreUsuario);

  if (!nombreUsuario || !contrasena) {
    console.log('❌ Login fallido: Campos vacíos');
    return res.status(400).json({ 
      success: false, 
      message: 'Usuario y contraseña son requeridos' 
    });
  }

  try {
    const query = `
      SELECT u.*, r.nombreRol 
      FROM usuarios u 
      INNER JOIN roles r ON u.roleId = r.idRol 
      WHERE BINARY u.nombreUsuario = ?
    `;
    
    db.query(query, [nombreUsuario], async (err, results) => {
      if (err) {
        console.error('❌ Error en consulta login:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error del servidor' 
        });
      }

      if (results.length === 0) {
        console.log(`❌ Usuario no encontrado: ${nombreUsuario}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Usuario o contraseña incorrectos' 
        });
      }

      const user = results[0];
      console.log(`✅ Usuario encontrado: ${user.nombreUsuario} (ID: ${user.idUsuario})`);
      
      // Verificar contraseña (texto plano)
      const isPasswordValid = contrasena === user.contrasena;
      
      if (!isPasswordValid) {
        console.log(`❌ Contraseña incorrecta para: ${nombreUsuario}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Usuario o contraseña incorrectos' 
        });
      }

      // Configuración del token
      const jwtSecret = process.env.JWT_SECRET || 'taskweb_secret';
      const tokenPayload = { 
        id: user.idUsuario, 
        username: user.nombreUsuario,
        role: user.nombreRol 
      };

      console.log('🔧 Configurando token JWT:');
      console.log('   Secret:', jwtSecret === 'taskweb_secret' ? 'DEFAULT' : 'CUSTOM');
      console.log('   Payload:', tokenPayload);

      // Generar token
      const token = jwt.sign(
        tokenPayload,
        jwtSecret,
        { expiresIn: '24h' }
      );

      console.log(`✅ Login exitoso. Token generado para: ${user.nombreUsuario}`);
      console.log(`   Token: ${token.substring(0, 50)}...`);

      res.json({
        success: true,
        message: 'Login exitoso',
        user: {
          id: user.idUsuario,
          username: user.nombreUsuario,
          role: user.nombreRol,
          roleId: user.roleId
        },
        token
      });
    });

  } catch (error) {
    console.error('❌ Error interno en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// 📋 VERIFICAR TOKEN (para debug)
router.get('/verify-token', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  console.log('🔍 Endpoint verify-token llamado');
  console.log('   Token recibido:', token ? `SÍ (${token.substring(0, 30)}...)` : 'NO');
  console.log('   Headers:', req.headers);

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token requerido' 
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'taskweb_secret';
    console.log('   Usando JWT Secret:', jwtSecret === 'taskweb_secret' ? 'DEFAULT' : 'CUSTOM');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Token válido. Decoded:', decoded);
    
    res.json({ 
      success: true, 
      message: 'Token válido',
      user: decoded 
    });
  } catch (error) {
    console.log('❌ Error verificando token:', error.message);
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido: ' + error.message 
    });
  }
});

// 🔄 RENOVAR TOKEN
router.post('/refresh-token', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token requerido' 
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'taskweb_secret';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Generar nuevo token
    const newToken = jwt.sign(
      { 
        id: decoded.id, 
        username: decoded.username,
        role: decoded.role 
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log(`🔄 Token renovado para: ${decoded.username}`);
    
    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      token: newToken
    });
    
  } catch (error) {
    console.log('❌ Error al renovar token:', error.message);
    res.status(401).json({ 
      success: false, 
      message: 'No se pudo renovar el token' 
    });
  }
});

// ℹ️ INFORMACIÓN DEL SERVICIO AUTH
router.get('/info', (req, res) => {
  const jwtSecret = process.env.JWT_SECRET || 'taskweb_secret';
  
  res.json({
    service: 'Sistema de Autenticación TaskWeb',
    version: '1.0.0',
    jwt: {
      secret: jwtSecret === 'taskweb_secret' ? 'USANDO DEFAULT' : 'USANDO CUSTOM',
      expiresIn: '24 horas'
    },
    endpoints: {
      login: 'POST /api/auth/login',
      verifyToken: 'GET /api/auth/verify-token',
      refreshToken: 'POST /api/auth/refresh-token'
    }
  });
});

module.exports = router;