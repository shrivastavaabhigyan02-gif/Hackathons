/**
 * Role-Based Access Control Middleware
 * Roles: customer, staff, manager, admin
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] permissions. Current role: ${req.user.role}`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireAdmin: requireRole('admin'),
  requireStaffOrAdmin: requireRole('staff', 'manager', 'admin')
};
