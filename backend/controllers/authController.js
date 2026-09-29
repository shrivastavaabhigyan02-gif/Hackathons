const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'folk_and_flame_jwt_ultra_secret_key_2026_987654321';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

const authController = {
  async register(req, res, next) {
    try {
      const { full_name, email, phone, password, role } = req.body;

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
          code: 'USER_EXISTS'
        });
      }

      // Default role customer unless explicit admin secret or test
      const assignedRole = (role === 'admin' || role === 'staff') ? role : 'customer';

      const user = await User.create({
        full_name,
        email,
        phone,
        password,
        role: assignedRole
      });

      const token = createToken(user);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully. Welcome to Folk & Flame!',
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar_url: user.avatar_url,
          preferences: user.preferences
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password combination.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const isMatch = await User.comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password combination.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const token = createToken(user);

      res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar_url: user.avatar_url,
          preferences: user.preferences
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      res.json({
        success: true,
        user
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const updated = await User.updateProfile(req.user.id, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: updated
      });
    } catch (err) {
      next(err);
    }
  },

  async getAddresses(req, res, next) {
    try {
      const addresses = await User.getAddresses(req.user.id);
      res.json({
        success: true,
        addresses
      });
    } catch (err) {
      next(err);
    }
  },

  async addAddress(req, res, next) {
    try {
      const address = await User.addAddress(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Address saved successfully.',
        address
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteAddress(req, res, next) {
    try {
      await User.deleteAddress(req.user.id, req.params.id);
      res.json({
        success: true,
        message: 'Address removed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
