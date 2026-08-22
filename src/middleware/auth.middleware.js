import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'default-fallback-secret-key-change-me';

/**
 * Middleware to authenticate requests using Bearer JWT token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
};

/**
 * Middleware factory to restrict access to specific roles (e.g. requireRoles('ADMIN', 'TENANT'))
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
};

/**
 * Convenient role middleware presets
 */
export const requireAdmin = requireRoles('ADMIN');
export const requireTenant = requireRoles('TENANT');

/**
 * Programmatic helper function for services & controllers
 */
export const hasRole = (user, ...roles) => {
  return Boolean(user && roles.includes(user.role));
};
