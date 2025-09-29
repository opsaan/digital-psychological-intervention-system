const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput, validate } = require('../middleware/validation');
const { requireAdmin, requireModerator } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply sanitization to all routes
router.use(sanitizeInput);

// All routes in this file require at least moderator role
// Admin-specific routes will have additional requireAdmin middleware

/**
 * GET /api/v1/admin/analytics/summary
 * Get analytics summary (admin only)
 */
router.get('/analytics/summary',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Parallel queries for better performance
    const [totalStats, monthlyStats, weeklyStats, severityStats] = await Promise.all([
      // Total counts
      Promise.all([
        prisma.user.count(),
        prisma.chatSession.count(),
        prisma.screening.count(),
        prisma.booking.count(),
        prisma.resource.count({ where: { isActive: true } }),
        prisma.peerPost.count({ where: { status: 'PUBLISHED' } })
      ]),
      
      // Monthly stats
      Promise.all([
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.chatSession.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
        prisma.screening.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
      ]),
      
      // Weekly stats
      Promise.all([
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.chatSession.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
        prisma.screening.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.booking.count({ where: { createdAt: { gte: sevenDaysAgo } } })
      ]),
      
      // Severity distribution from recent screenings
      prisma.screening.groupBy({
        by: ['severityBand'],
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: {
          severityBand: true
        }
      })
    ]);
    
    const [totalUsers, totalChats, totalScreenings, totalBookings, totalResources, totalPosts] = totalStats;
    const [monthlyUsers, monthlyChats, monthlyScreenings, monthlyBookings] = monthlyStats;
    const [weeklyUsers, weeklyChats, weeklyScreenings, weeklyBookings] = weeklyStats;
    
    res.json({
      success: true,
      summary: {
        totals: {
          users: totalUsers,
          chatSessions: totalChats,
          screenings: totalScreenings,
          bookings: totalBookings,
          resources: totalResources,
          peerPosts: totalPosts
        },
        monthly: {
          users: monthlyUsers,
          chatSessions: monthlyChats,
          screenings: monthlyScreenings,
          bookings: monthlyBookings
        },
        weekly: {
          users: weeklyUsers,
          chatSessions: weeklyChats,
          screenings: weeklyScreenings,
          bookings: weeklyBookings
        },
        severityDistribution: severityStats.reduce((acc, item) => {
          acc[item.severityBand] = item._count.severityBand;
          return acc;
        }, {})
      }
    });
  })
);

/**
 * GET /api/v1/admin/analytics/time-series
 * Get time series analytics data (admin only)
 */
router.get('/analytics/time-series',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get daily analytics events
    const analyticsEvents = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        type: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group events by date and type
    const groupedData = {};
    analyticsEvents.forEach(event => {
      const date = event.createdAt.toISOString().split('T')[0];
      if (!groupedData[date]) {
        groupedData[date] = {};
      }
      groupedData[date][event.type] = (groupedData[date][event.type] || 0) + 1;
    });
    
    // Convert to time series format
    const timeSeries = Object.entries(groupedData).map(([date, events]) => ({
      date,
      ...events
    }));
    
    res.json({
      success: true,
      timeSeries,
      period: `${days} days`
    });
  })
);

/**
 * GET /api/v1/admin/analytics/screenings
 * Get detailed screening analytics (admin only)
 */
router.get('/analytics/screenings',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [phq9Stats, gad7Stats, severityTrends] = await Promise.all([
      // PHQ-9 statistics
      prisma.screening.groupBy({
        by: ['severityBand'],
        where: {
          type: 'PHQ9',
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: { severityBand: true },
        _avg: { score: true }
      }),
      
      // GAD-7 statistics
      prisma.screening.groupBy({
        by: ['severityBand'],
        where: {
          type: 'GAD7',
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: { severityBand: true },
        _avg: { score: true }
      }),
      
      // Severity trends over time
      prisma.screening.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          type: true,
          severityBand: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);
    
    res.json({
      success: true,
      analytics: {
        phq9: {
          distribution: phq9Stats.reduce((acc, item) => {
            acc[item.severityBand] = {
              count: item._count.severityBand,
              averageScore: Math.round(item._avg.score * 10) / 10
            };
            return acc;
          }, {})
        },
        gad7: {
          distribution: gad7Stats.reduce((acc, item) => {
            acc[item.severityBand] = {
              count: item._count.severityBand,
              averageScore: Math.round(item._avg.score * 10) / 10
            };
            return acc;
          }, {})
        },
        trends: severityTrends
      }
    });
  })
);

/**
 * GET /api/v1/admin/analytics/resources
 * Get resource engagement analytics (admin only)
 */
router.get('/analytics/resources',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [topResources, engagementStats] = await Promise.all([
      // Top resources by engagement
      prisma.resource.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          type: true,
          language: true,
          _count: {
            select: {
              engagements: true
            }
          }
        },
        orderBy: {
          engagements: {
            _count: 'desc'
          }
        },
        take: 10
      }),
      
      // Engagement type distribution
      prisma.resourceEngagement.groupBy({
        by: ['type'],
        _count: { type: true }
      })
    ]);
    
    res.json({
      success: true,
      analytics: {
        topResources: topResources.map(resource => ({
          ...resource,
          engagementCount: resource._count.engagements,
          _count: undefined
        })),
        engagementTypes: engagementStats.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {})
      }
    });
  })
);

/**
 * GET /api/v1/admin/peer/reports
 * Get peer support reports (moderators and above)
 */
router.get('/peer/reports',
  requireModerator,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const status = req.query.status || 'OPEN';
    const offset = (page - 1) * limit;
    
    const where = { status };
    
    const [reports, total] = await Promise.all([
      prisma.peerReport.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          post: {
            select: {
              id: true,
              content: true,
              displayAlias: true
            }
          },
          comment: {
            select: {
              id: true,
              content: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.peerReport.count({ where })
    ]);
    
    res.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * PATCH /api/v1/admin/peer/posts/:id
 * Update post status (moderators and above)
 */
const updatePostStatusSchema = Joi.object({
  status: Joi.string().valid('PUBLISHED', 'HIDDEN', 'FLAGGED').required()
});

router.patch('/peer/posts/:id',
  requireModerator,
  validate(updatePostStatusSchema),
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { status } = req.body;
    
    const post = await prisma.peerPost.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    
    const updatedPost = await prisma.peerPost.update({
      where: { id: postId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
    
    // Log moderation action
    await prisma.analyticsEvent.create({
      data: {
        type: 'moderation_action',
        payload: {
          action: 'post_status_updated',
          postId,
          oldStatus: post.status,
          newStatus: status,
          moderatorId: req.user.id
        },
        userId: req.user.id
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Post status updated successfully',
      post: {
        id: updatedPost.id,
        status: updatedPost.status,
        updatedAt: updatedPost.updatedAt
      }
    });
  })
);

/**
 * PATCH /api/v1/admin/peer/reports/:id
 * Update report status (moderators and above)
 */
const updateReportStatusSchema = Joi.object({
  status: Joi.string().valid('REVIEWED', 'DISMISSED').required()
});

router.patch('/peer/reports/:id',
  requireModerator,
  validate(updateReportStatusSchema),
  asyncHandler(async (req, res) => {
    const reportId = req.params.id;
    const { status } = req.body;
    
    const report = await prisma.peerReport.findUnique({
      where: { id: reportId }
    });
    
    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }
    
    const updatedReport = await prisma.peerReport.update({
      where: { id: reportId },
      data: { status }
    });
    
    // Log moderation action
    await prisma.analyticsEvent.create({
      data: {
        type: 'moderation_action',
        payload: {
          action: 'report_reviewed',
          reportId,
          newStatus: status,
          moderatorId: req.user.id
        },
        userId: req.user.id
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Report updated successfully',
      report: {
        id: updatedReport.id,
        status: updatedReport.status
      }
    });
  })
);

/**
 * GET /api/v1/admin/counsellors
 * Get counsellors list (admin only)
 */
router.get('/counsellors',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    
    const [counsellors, total] = await Promise.all([
      prisma.counsellor.findMany({
        include: {
          _count: {
            select: {
              bookings: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        skip: offset,
        take: limit
      }),
      prisma.counsellor.count()
    ]);
    
    res.json({
      success: true,
      counsellors: counsellors.map(counsellor => ({
        ...counsellor,
        bookingCount: counsellor._count.bookings,
        _count: undefined
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * POST /api/v1/admin/counsellors
 * Create new counsellor (admin only)
 */
const createCounsellorSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  department: Joi.string().max(100),
  officeHours: Joi.string().max(200),
  room: Joi.string().max(50),
  email: Joi.string().email(),
  phone: Joi.string().max(20),
  isActive: Joi.boolean().default(true)
});

router.post('/counsellors',
  requireAdmin,
  validate(createCounsellorSchema),
  asyncHandler(async (req, res) => {
    const counsellorData = req.body;
    
    const counsellor = await prisma.counsellor.create({
      data: counsellorData
    });
    
    res.status(201).json({
      success: true,
      message: 'Counsellor created successfully',
      counsellor
    });
  })
);

/**
 * PATCH /api/v1/admin/counsellors/:id
 * Update counsellor (admin only)
 */
router.patch('/counsellors/:id',
  requireAdmin,
  validate(createCounsellorSchema.fork(['name'], (schema) => schema.optional())),
  asyncHandler(async (req, res) => {
    const counsellorId = req.params.id;
    const updates = req.body;
    
    const counsellor = await prisma.counsellor.findUnique({
      where: { id: counsellorId }
    });
    
    if (!counsellor) {
      return res.status(404).json({
        error: 'Counsellor not found'
      });
    }
    
    const updatedCounsellor = await prisma.counsellor.update({
      where: { id: counsellorId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Counsellor updated successfully',
      counsellor: updatedCounsellor
    });
  })
);

/**
 * GET /api/v1/admin/config
 * Get system configuration (admin only)
 */
router.get('/config',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const configs = await prisma.config.findMany();
    
    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});
    
    res.json({
      success: true,
      config: configMap
    });
  })
);

/**
 * PATCH /api/v1/admin/config
 * Update system configuration (admin only)
 */
const updateConfigSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object(),
    Joi.array()
  )
);

router.patch('/config',
  requireAdmin,
  validate(updateConfigSchema),
  asyncHandler(async (req, res) => {
    const updates = req.body;
    
    // Update each configuration key
    const updatedConfigs = [];
    for (const [key, value] of Object.entries(updates)) {
      const config = await prisma.config.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      updatedConfigs.push(config);
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      updatedKeys: Object.keys(updates)
    });
  })
);

module.exports = router;
