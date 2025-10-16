const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

// Middleware to check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Middleware to check if user can access client data
const authorizeClientAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Admins can access any client data
  if (req.user.role === 'admin') {
    return next();
  }

  // Clients can only access their own data
  const clientId = req.params.clientId || req.params.id || req.body.clientId;
  
  if (clientId && clientId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data.'
    });
  }

  next();
};

// Middleware to validate client ID parameter
const validateClientId = (req, res, next) => {
  const clientId = req.params.clientId || req.params.id;
  
  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'Client ID is required.'
    });
  }

  // Validate ObjectId format
  if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid client ID format.'
    });
  }

  next();
};

// Middleware to check account lock status
const checkAccountLock = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const user = await User.findById(req.user._id);
    
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
        lockUntil: user.lockUntil
      });
    }

    next();
  } catch (error) {
    logger.error('Account lock check error:', error);
    next();
  }
};

// Middleware to update last login
const updateLastLogin = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      await User.findByIdAndUpdate(req.user._id, { 
        lastLogin: new Date(),
        loginAttempts: 0,
        lockUntil: undefined
      });
    }
    next();
  } catch (error) {
    logger.error('Update last login error:', error);
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizeClientAccess,
  validateClientId,
  checkAccountLock,
  updateLastLogin
};
