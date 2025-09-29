const express = require('express');
const AuthService = require('../services/authService');
const { validate, schemas, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const Joi = require('joi');

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// All routes in this file require authentication (handled by middleware in main app)

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get('/me',
  asyncHandler(async (req, res) => {
    const user = await AuthService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  })
);

/**
 * PATCH /api/v1/users/me
 * Update user profile
 */
router.patch('/me',
  validate(schemas.updateUser),
  asyncHandler(async (req, res) => {
    const updates = req.body;
    
    try {
      const updatedUser = await AuthService.updateProfile(req.user.id, updates);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      if (error.message.includes('No valid fields')) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.message
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/v1/users/change-password
 * Change user password
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

router.post('/change-password',
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
      await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.'
      });
    } catch (error) {
      if (error.message.includes('incorrect')) {
        return res.status(400).json({
          error: 'Password change failed',
          message: error.message
        });
      }
      throw error;
    }
  })
);

/**
 * GET /api/v1/users/stats
 * Get user activity statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.user.id;
    
    // Get user statistics
    const stats = await Promise.all([
      // Chat sessions count
      prisma.chatSession.count({
        where: { userId }
      }),
      
      // Screenings count
      prisma.screening.count({
        where: { userId }
      }),
      
      // Bookings count
      prisma.booking.count({
        where: { userId }
      }),
      
      // Peer posts count
      prisma.peerPost.count({
        where: { userId }
      }),
      
      // Resource engagements count
      prisma.resourceEngagement.count({
        where: { userId }
      }),
      
      // Latest screening results
      prisma.screening.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          type: true,
          score: true,
          severityBand: true,
          createdAt: true
        }
      })
    ]);
    
    const [chatSessions, screenings, bookings, peerPosts, resourceEngagements, latestScreenings] = stats;
    
    res.json({
      success: true,
      stats: {
        chatSessions,
        screenings,
        bookings,
        peerPosts,
        resourceEngagements,
        latestScreenings
      }
    });
  })
);

/**
 * DELETE /api/v1/users/me
 * Delete user account (soft delete by anonymizing)
 */
router.delete('/me',
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.user.id;
    
    try {
      // Start transaction to anonymize user data
      await prisma.$transaction(async (tx) => {
        // Generate anonymous identifiers
        const anonymousId = AuthService.generateAnonymousId();
        const timestamp = new Date().toISOString().slice(0, 10);
        const anonymousEmail = `deleted-${anonymousId}@example.com`;
        
        // Update user record to anonymize
        await tx.user.update({
          where: { id: userId },
          data: {
            email: anonymousEmail,
            name: `Deleted User ${timestamp}`,
            passwordHash: 'DELETED',
            role: 'STUDENT'
          }
        });
        
        // Remove all refresh tokens
        await tx.refreshToken.deleteMany({
          where: { userId }
        });
        
        // Anonymize chat sessions (keep for research with consent)
        await tx.chatSession.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId
          }
        });
        
        // Anonymize screenings (keep for research with consent)
        await tx.screening.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId
          }
        });
        
        // Anonymize bookings
        await tx.booking.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId
          }
        });
        
        // Anonymize peer posts
        await tx.peerPost.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId,
            displayAlias: 'Anonymous User'
          }
        });
        
        // Anonymize peer comments
        await tx.peerComment.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId
          }
        });
        
        // Anonymize reports
        await tx.peerReport.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId
          }
        });
        
        // Anonymize analytics events
        await tx.analyticsEvent.updateMany({
          where: { userId },
          data: {
            userId: null,
            anonymousId: anonymousId
          }
        });
      });
      
      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      
      res.json({
        success: true,
        message: 'Account deleted successfully. Your data has been anonymized while preserving research contributions.'
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw new Error('Failed to delete account');
    }
  })
);

module.exports = router;