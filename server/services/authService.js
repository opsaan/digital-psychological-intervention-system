const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS) || 7;
const SESSION_TIMEOUT_HOURS = parseInt(process.env.SESSION_TIMEOUT_HOURS) || 24;

class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(userId, role) {
    return jwt.sign(
      { userId, role },
      JWT_SECRET,
      { expiresIn: `${SESSION_TIMEOUT_HOURS}h` }
    );
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Generate anonymous session ID
   */
  static generateAnonymousId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Register new user
   */
  static async register(userData) {
    const { email, password, name, preferredLanguage = 'en' } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        preferredLanguage,
        role: 'STUDENT' // Default role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferredLanguage: true,
        createdAt: true
      }
    });

    return user;
  }

  /**
   * Login user
   */
  static async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    // Clean up expired refresh tokens
    await this.cleanupExpiredTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredLanguage: user.preferredLanguage
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken) {
    // Find refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            preferredLanguage: true
          }
        }
      }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Clean up expired token
      if (storedToken) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id }
        });
      }
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(storedToken.user.id, storedToken.user.role);
    const newRefreshToken = this.generateRefreshToken();

    // Update refresh token (rotation)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        token: newRefreshToken,
        expiresAt
      }
    });

    return {
      user: storedToken.user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  static async logout(refreshToken) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }
  }

  /**
   * Logout from all devices (invalidate all refresh tokens)
   */
  static async logoutAll(userId) {
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  /**
   * Clean up expired refresh tokens
   */
  static async cleanupExpiredTokens(userId = null) {
    const where = {
      expiresAt: {
        lt: new Date()
      }
    };

    if (userId) {
      where.userId = userId;
    }

    await prisma.refreshToken.deleteMany({ where });
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    const allowedFields = ['name', 'preferredLanguage'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...filteredUpdates,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferredLanguage: true,
        updatedAt: true
      }
    });

    return updatedUser;
  }

  /**
   * Change password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    });

    // Logout from all devices for security
    await this.logoutAll(userId);

    return true;
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Set cookie options based on environment
   */
  static getCookieOptions(name) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/'
    };

    if (name === 'accessToken') {
      return {
        ...baseOptions,
        maxAge: SESSION_TIMEOUT_HOURS * 60 * 60 * 1000 // Convert hours to milliseconds
      };
    }

    if (name === 'refreshToken') {
      return {
        ...baseOptions,
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000 // Convert days to milliseconds
      };
    }

    if (name === 'anonymousId') {
      return {
        ...baseOptions,
        httpOnly: false, // Allow client-side access for anonymous sessions
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      };
    }

    return baseOptions;
  }
}

module.exports = AuthService;
