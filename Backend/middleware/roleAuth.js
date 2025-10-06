const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('👮 Middleware Role - Verificando roles...');
    console.log('   Usuario:', req.user?.username);
    console.log('   Rol actual:', req.user?.role);
    console.log('   Roles permitidos:', allowedRoles);

    if (!req.user) {
      console.log('❌ Middleware Role: Usuario no autenticado');
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ Middleware Role: Rol no permitido');
      return res.status(403).json({ 
        success: false, 
        message: `No tienes permisos para esta acción. Rol requerido: ${allowedRoles.join(', ')}` 
      });
    }

    console.log('✅ Middleware Role: Rol autorizado');
    next();
  };
};

module.exports = { checkRole };