const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthService = require('../services/authService');
const { validate, schemas, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { getCSRFToken } = require('../middleware/csrf');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply sanitization to all routes
router.use(sanitizeInput);

/**
 * GET /api/v1/auth/csrf-token
 * Get CSRF token for authentication requests
 */
router.get('/csrf-token', getCSRFToken);

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', 
  authLimiter,
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    const { email, password, name, preferredLanguage } = req.body;
    
    try {
      const user = await AuthService.register({
        email,
        password,
        name,
        preferredLanguage
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Registration failed',
          message: error.message
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post('/login',
  authLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const result = await AuthService.login(email, password);
      
      // Set HTTP-only cookies
      res.cookie('accessToken', result.accessToken, AuthService.getCookieOptions('accessToken'));
      res.cookie('refreshToken', result.refreshToken, AuthService.getCookieOptions('refreshToken'));
      
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user
      });
    } catch (error) {
      return res.status(401).json({
        error: 'Login failed',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required'
      });
    }
    
    try {
      const result = await AuthService.refreshToken(refreshToken);
      
      // Set new HTTP-only cookies
      res.cookie('accessToken', result.accessToken, AuthService.getCookieOptions('accessToken'));
      res.cookie('refreshToken', result.refreshToken, AuthService.getCookieOptions('refreshToken'));
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        user: result.user
      });
    } catch (error) {
      // Clear cookies on refresh failure
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      
      return res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
router.get('/me',
  asyncHandler(async (req, res) => {
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await AuthService.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        user
      });
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
  })
);

/**
 * POST /api/v1/auth/logout
 * Logout user
 */
router.post('/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

/**
 * POST /api/v1/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all',
  asyncHandler(async (req, res) => {
    const token = req.cookies.accessToken;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await AuthService.logoutAll(decoded.userId);
      } catch (error) {
        // Continue even if token is invalid
      }
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  })
);

module.exports = router;