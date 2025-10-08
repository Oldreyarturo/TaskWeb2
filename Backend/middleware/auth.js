const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  console.log('🛡️ Middleware Auth - Verificando token...');
  console.log('   URL:', req.method, req.url);
  console.log('   Token:', token ? `PRESENTE (${token.substring(0, 30)}...)` : 'AUSENTE');

  if (!token) {
    console.log('❌ Middleware: No hay token en la request');
    return res.status(401).json({ 
      success: false, 
      message: 'Token de autenticación requerido' 
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'taskweb_secret';
    console.log('   Usando JWT Secret:', jwtSecret === 'taskweb_secret' ? 'DEFAULT' : 'CUSTOM');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Middleware: Token válido. Usuario:', decoded.username);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Middleware: Error verificando token:', error.message);
    
    let errorMessage = 'Token inválido';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expirado';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Token malformado';
    }
    
    res.status(401).json({ 
      success: false, 
      message: errorMessage + ': ' + error.message 
    });
  }
};

module.exports = { verifyToken };