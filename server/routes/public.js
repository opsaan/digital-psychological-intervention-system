const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput } = require('../middleware/validation');
const AuthService = require('../services/authService');

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

/**
 * GET /api/v1/counsellors
 * Get list of active counsellors (public endpoint)
 */
router.get('/counsellors',
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const counsellors = await prisma.counsellor.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        department: true,
        officeHours: true,
        room: true,
        email: true,
        phone: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json({
      success: true,
      counsellors
    });
  })
);

/**
 * GET /api/v1/helplines
 * Get crisis helplines and resources
 */
router.get('/helplines',
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const helplines = await prisma.helpline.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        title: true,
        phone: true,
        campusOnly: true
      },
      orderBy: {
        campusOnly: 'desc' // Campus helplines first
      }
    });
    
    res.json({
      success: true,
      helplines
    });
  })
);

/**
 * POST /api/v1/anonymous-session
 * Create anonymous session ID for guest users
 */
router.post('/anonymous-session',
  asyncHandler(async (req, res) => {
    const anonymousId = AuthService.generateAnonymousId();
    
    // Set anonymous ID cookie
    res.cookie('anonymousId', anonymousId, AuthService.getCookieOptions('anonymousId'));
    
    res.json({
      success: true,
      anonymousId
    });
  })
);

/**
 * GET /api/v1/system-info
 * Get basic system information
 */
router.get('/system-info',
  asyncHandler(async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get basic statistics
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.chatSession.count(),
      prisma.screening.count(),
      prisma.resource.count({ where: { isActive: true } }),
      prisma.peerPost.count({ where: { status: 'PUBLISHED' } })
    ]);
    
    const [totalUsers, totalChats, totalScreenings, totalResources, totalPosts] = stats;
    
    res.json({
      success: true,
      system: {
        name: 'Digital Psychological Intervention System',
        version: '1.0.0',
        languages: ['en', 'hi'],
        features: [
          'first-aid-chat',
          'screening-tools',
          'booking-system',
          'resource-hub',
          'peer-support',
          'admin-panel'
        ],
        stats: {
          users: totalUsers,
          chatSessions: totalChats,
          screenings: totalScreenings,
          resources: totalResources,
          peerPosts: totalPosts
        }
      }
    });
  })
);

/**
 * GET /api/v1/languages
 * Get supported languages
 */
router.get('/languages',
  (req, res) => {
    const languages = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English'
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी'
      }
    ];
    
    res.json({
      success: true,
      languages
    });
  }
);

module.exports = router;
