const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');
const db = require('../config/database');

// GET /api/tareas - Filtrado por rol (RUTA PRINCIPAL QUE FALTABA)
router.get('/', verifyToken, (req, res) => {
  console.log('📋 Obteniendo tareas para usuario:', req.user.username, 'Rol:', req.user.role);
  
  let query = `
    SELECT t.*, u1.nombreUsuario as creadorPor, u2.nombreUsuario as asignadoA 
    FROM tareas t 
    LEFT JOIN usuarios u1 ON t.creadoPorId = u1.idUsuario 
    LEFT JOIN usuarios u2 ON t.asignadoAId = u2.idUsuario
  `;
  
  // Si no es admin/supervisor, solo ver sus tareas
  if (!['Administrador', 'Supervisor'].includes(req.user.role)) {
    console.log('🔍 Filtrando tareas: solo las del usuario');
    query += ' WHERE t.creadoPorId = ? OR t.asignadoAId = ?';
    
    console.log('   Ejecutando query:', query);
    console.log('   Con parámetros:', [req.user.id, req.user.id]);
    
    db.query(query, [req.user.id, req.user.id], (err, results) => {
      if (err) {
        console.error('❌ Error obteniendo tareas:', err);
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      console.log(`✅ ${results.length} tareas obtenidas para usuario`);
      res.json(results);
    });
  } else {
    console.log('👁️ Mostrando TODAS las tareas (rol admin/supervisor)');
    
    console.log('   Ejecutando query:', query);
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('❌ Error obteniendo tareas:', err);
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      console.log(`✅ ${results.length} tareas obtenidas (todas)`);
      res.json(results);
    });
  }
});

// GET /api/tareas/users/search - Búsqueda de usuarios para asignar
router.get('/users/search', verifyToken, checkRole(['Administrador', 'Supervisor']), (req, res) => {
  const { query } = req.query;
  console.log('🔍 Buscando usuarios con query:', query);
  
  if (!query || query.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Query de búsqueda requerida'
    });
  }

  const searchQuery = `
    SELECT idUsuario, nombreUsuario 
    FROM usuarios 
    WHERE nombreUsuario LIKE ? AND roleId != 1  -- Excluir administradores
    LIMIT 10
  `;
  
  const searchParam = `%${query}%`;
  
  console.log('   Ejecutando query:', searchQuery);
  console.log('   Con parámetro:', [searchParam]);
  
  db.query(searchQuery, [searchParam], (err, results) => {
    if (err) {
      console.error('❌ Error buscando usuarios:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    
    console.log(`✅ Usuarios encontrados: ${results.length}`);
    res.json(results);
  });
});

// POST /api/tareas - Solo Admin y Supervisor pueden crear
router.post('/', verifyToken, checkRole(['Administrador', 'Supervisor']), (req, res) => {
  console.log('➕ Creando tarea para usuario:', req.user.username, 'Rol:', req.user.role);
  console.log('   Datos recibidos:', req.body);
  
  const { titulo, descripcion, asignadoAId, fechaVencimiento } = req.body;
  
  // Validaciones básicas
  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'El título es requerido'
    });
  }

  const query = `
    INSERT INTO tareas (titulo, descripcion, estado, creadoPorId, asignadoAId, fechaVencimiento) 
    VALUES (?, ?, 'pendiente', ?, ?, ?)
  `;
  
  const params = [
    titulo.trim(), 
    descripcion ? descripcion.trim() : null, 
    req.user.id, 
    asignadoAId || null, 
    fechaVencimiento || null
  ];
  
  console.log('   Ejecutando query:', query);
  console.log('   Con parámetros:', params);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Error creando tarea:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message,
        details: 'Error al insertar en la base de datos'
      });
    }
    console.log('✅ Tarea creada exitosamente. ID:', results.insertId);
    res.json({ 
      success: true,
      message: 'Tarea creada exitosamente', 
      id: results.insertId 
    });
  });
});

// PUT /api/tareas/:id - Solo Admin y Supervisor pueden editar
router.put('/:id', verifyToken, checkRole(['Administrador', 'Supervisor']), (req, res) => {
  const taskId = req.params.id;
  console.log('✏️ Editando tarea:', taskId, 'Usuario:', req.user.username, 'Rol:', req.user.role);
  console.log('   Datos recibidos:', req.body);
  
  // Primero verificar si la tarea existe
  const checkQuery = 'SELECT * FROM tareas WHERE idTarea = ?';
  
  console.log('   Verificando tarea con query:', checkQuery);
  console.log('   Con parámetro:', [taskId]);
  
  db.query(checkQuery, [taskId], (err, results) => {
    if (err) {
      console.error('❌ Error verificando tarea:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    
    if (results.length === 0) {
      console.log('❌ Tarea no encontrada');
      return res.status(404).json({ 
        success: false,
        error: 'Tarea no encontrada' 
      });
    }
    
    // Validar datos requeridos
    const { titulo, descripcion, asignadoAId, fechaVencimiento, estado } = req.body;
    
    if (!titulo || titulo.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El título es requerido'
      });
    }
    
    // Proceder con la actualización (Admin y Supervisor pueden editar cualquier tarea)
    const updateQuery = `
      UPDATE tareas 
      SET titulo = ?, descripcion = ?, asignadoAId = ?, fechaVencimiento = ?, estado = ?
      WHERE idTarea = ?
    `;
    
    const params = [
      titulo.trim(),
      descripcion ? descripcion.trim() : null,
      asignadoAId || null,
      fechaVencimiento || null,
      estado || 'pendiente',
      taskId
    ];
    
    console.log('   Ejecutando update query:', updateQuery);
    console.log('   Con parámetros:', params);
    
    db.query(updateQuery, params, (err, results) => {
      if (err) {
        console.error('❌ Error actualizando tarea:', err);
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      
      if (results.affectedRows === 0) {
        console.log('❌ Tarea no encontrada para actualizar');
        return res.status(404).json({ 
          success: false,
          error: 'Tarea no encontrada' 
        });
      }
      
      console.log('✅ Tarea actualizada exitosamente');
      res.json({ 
        success: true,
        message: 'Tarea actualizada exitosamente' 
      });
    });
  });
});

// DELETE /api/tareas/:id - Solo Admin y Supervisor pueden eliminar (CON DEBUGGING COMPLETO)
router.delete('/:id', verifyToken, checkRole(['Administrador', 'Supervisor']), (req, res) => {
  const taskId = req.params.id;
  console.log('=== 🗑️ INICIANDO ELIMINACIÓN ===');
  console.log('📌 Task ID recibido:', taskId);
  console.log('👤 Usuario:', req.user.username, 'Rol:', req.user.role);
  console.log('🔍 Tipo de taskId:', typeof taskId);
  
  // Verificar que la tarea existe ANTES de eliminar
  const checkQuery = 'SELECT * FROM tareas WHERE idTarea = ?';
  console.log('🔍 Verificando existencia con query:', checkQuery);
  
  db.query(checkQuery, [taskId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('❌ Error verificando tarea:', checkErr);
      return res.status(500).json({ 
        success: false,
        error: 'Error verificando tarea: ' + checkErr.message
      });
    }
    
    console.log('🔍 Tareas encontradas:', checkResults.length);
    if (checkResults.length > 0) {
      console.log('✅ Tarea EXISTE:', checkResults[0]);
    } else {
      console.log('❌ Tarea NO EXISTE con id:', taskId);
      return res.status(404).json({ 
        success: false,
        error: `Tarea con ID ${taskId} no encontrada`
      });
    }
    
    // Si existe, proceder con la eliminación
    const deleteQuery = 'DELETE FROM tareas WHERE idTarea = ?';
    console.log('🗑️ Ejecutando DELETE query:', deleteQuery);
    console.log('📌 Con parámetro:', [taskId]);
    
    db.query(deleteQuery, [taskId], (deleteErr, deleteResults) => {
      if (deleteErr) {
        console.error('❌ Error en DELETE:', deleteErr);
        console.error('❌ Código de error:', deleteErr.code);
        console.error('❌ Número de error:', deleteErr.errno);
        return res.status(500).json({ 
          success: false,
          error: 'Error eliminando tarea: ' + deleteErr.message,
          code: deleteErr.code
        });
      }
      
      console.log('✅ Resultados DELETE:', deleteResults);
      console.log('✅ Filas afectadas:', deleteResults.affectedRows);
      console.log('=== ✅ ELIMINACIÓN COMPLETADA ===');
      
      if (deleteResults.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'No se pudo eliminar la tarea (0 filas afectadas)'
        });
      }
      
      res.json({ 
        success: true,
        message: 'Tarea eliminada exitosamente',
        affectedRows: deleteResults.affectedRows
      });
    });
  });
});

// GET /api/tareas/users - Solo Admin y Supervisor pueden ver usuarios para asignar
router.get('/users', verifyToken, checkRole(['Administrador', 'Supervisor']), (req, res) => {
  console.log('👥 Obteniendo usuarios para asignación. Usuario:', req.user.username, 'Rol:', req.user.role);
  
  const query = 'SELECT idUsuario, nombreUsuario FROM usuarios';
  
  console.log('   Ejecutando query:', query);
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo usuarios:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    console.log(`✅ Usuarios obtenidos: ${results.length}`);
    res.json(results);
  });
});

// PATCH /api/tareas/:id/estado - Cualquier usuario puede cambiar estado de tareas asignadas a él
router.patch('/:id/estado', verifyToken, (req, res) => {
  const taskId = req.params.id;
  const { estado } = req.body;
  
  console.log('🔄 Cambiando estado de tarea:', taskId, 'a', estado, 'Usuario:', req.user.username, 'Rol:', req.user.role);
  
  // Validar estado
  const estadosValidos = ['pendiente', 'enProgreso', 'completada'];
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({
      success: false,
      error: 'Estado inválido. Debe ser: pendiente, enProgreso o completada'
    });
  }
  
  // Verificar si el usuario puede cambiar el estado
  const checkQuery = 'SELECT creadoPorId, asignadoAId FROM tareas WHERE idTarea = ?';
  
  console.log('   Verificando permisos con query:', checkQuery);
  console.log('   Con parámetro:', [taskId]);
  
  db.query(checkQuery, [taskId], (err, results) => {
    if (err) {
      console.error('❌ Error verificando tarea:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    
    if (results.length === 0) {
      console.log('❌ Tarea no encontrada');
      return res.status(404).json({ 
        success: false,
        error: 'Tarea no encontrada' 
      });
    }
    
    const task = results[0];
    const isAssigned = task.asignadoAId === req.user.id;
    const canChangeAll = ['Administrador', 'Supervisor'].includes(req.user.role);
    
    console.log('   Está asignado?:', isAssigned);
    console.log('   Puede cambiar todo?:', canChangeAll);
    
    // CORREGIDO: Usuario solo puede cambiar estado si está asignado a él
    // Admin y Supervisor pueden cambiar cualquier estado
    if (!isAssigned && !canChangeAll) {
      console.log('❌ No tiene permisos para cambiar estado de esta tarea');
      return res.status(403).json({ 
        success: false,
        error: 'No tienes permisos para cambiar el estado de esta tarea' 
      });
    }
    
    // Proceder con el cambio de estado
    const updateQuery = 'UPDATE tareas SET estado = ? WHERE idTarea = ?';
    
    console.log('   Ejecutando update query:', updateQuery);
    console.log('   Con parámetros:', [estado, taskId]);
    
    db.query(updateQuery, [estado, taskId], (err, results) => {
      if (err) {
        console.error('❌ Error cambiando estado:', err);
        return res.status(500).json({ 
          success: false,
          error: err.message 
        });
      }
      
      if (results.affectedRows === 0) {
        console.log('❌ Tarea no encontrada para actualizar estado');
        return res.status(404).json({ 
          success: false,
          error: 'Tarea no encontrada' 
        });
      }
      
      console.log('✅ Estado actualizado exitosamente');
      res.json({ 
        success: true,
        message: 'Estado actualizado exitosamente' 
      });
    });
  });
});

// GET /api/tareas/stats - Estadísticas de tareas
router.get('/stats', verifyToken, (req, res) => {
  console.log('📊 Obteniendo estadísticas para usuario:', req.user.username, 'Rol:', req.user.role);
  
  let query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN estado = 'enProgreso' THEN 1 ELSE 0 END) as enProgreso,
      SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas
    FROM tareas
  `;
  
  let params = [];
  
  // Si no es admin/supervisor, solo contar sus tareas
  if (!['Administrador', 'Supervisor'].includes(req.user.role)) {
    query += ' WHERE creadoPorId = ? OR asignadoAId = ?';
    params = [req.user.id, req.user.id];
  }
  
  console.log('   Ejecutando query:', query);
  console.log('   Con parámetros:', params);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Error obteniendo estadísticas:', err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
    
    console.log('✅ Estadísticas obtenidas:', results[0]);
    res.json(results[0]);
  });
});

// Ruta de prueba para verificar que el router funciona
router.get('/test', verifyToken, (req, res) => {
  console.log('🧪 Test route - Usuario:', req.user.username, 'Rol:', req.user.role);
  res.json({ 
    success: true,
    message: 'Ruta de tareas funcionando correctamente',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;