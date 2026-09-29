const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'folk_and_flame_jwt_ultra_secret_key_2026_987654321';

async function authMiddleware(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No access token provided.',
        code: 'UNAUTHORIZED'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user profile from Supabase
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, preferences')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired user session.',
        code: 'INVALID_SESSION'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    logger.warn('Auth token verification failed:', { error: err.message });
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid token.',
      code: 'INVALID_TOKEN'
    });
  }
}

// Optional Auth: populates req.user if token is present, continues anyway
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const { data: user } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, avatar_url, preferences')
        .eq('id', decoded.id)
        .single();
      if (user) req.user = user;
    }
  } catch (e) {
    // proceed without user
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuth
};
