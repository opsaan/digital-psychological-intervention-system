const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput, validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware, requireCounsellor } = require('../middleware/auth');
const { uploadResource, serveFile } = require('../middleware/upload');
const Joi = require('joi');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply sanitization and optional authentication to all routes
router.use(sanitizeInput);
router.use(optionalAuthMiddleware);

/**
 * GET /api/v1/resources
 * Get list of active resources (public endpoint)
 */
router.get('/',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const type = req.query.type; // Filter by resource type
    const language = req.query.language || req.user?.preferredLanguage || 'en';
    const search = req.query.search; // Search in title and description
    const offset = (page - 1) * limit;
    
    const where = {
      isActive: true,
      language
    };
    
    if (type && ['VIDEO', 'AUDIO', 'GUIDE'].includes(type)) {
      where.type = type;
    }
    
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          language: true,
          filePath: true,
          embedUrl: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true,
              role: true
            }
          },
          _count: {
            select: {
              engagements: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.resource.count({ where })
    ]);
    
    res.json({
      success: true,
      resources: resources.map(resource => ({
        ...resource,
        engagementCount: resource._count.engagements,
        _count: undefined
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        types: ['VIDEO', 'AUDIO', 'GUIDE'],
        languages: ['en', 'hi']
      }
    });
  })
);

/**
 * GET /api/v1/resources/:id
 * Get specific resource details
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const resourceId = req.params.id;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        isActive: true
      },
      include: {
        createdBy: {
          select: {
            name: true,
            role: true
          }
        },
        _count: {
          select: {
            engagements: true
          }
        }
      }
    });
    
    if (!resource) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    // Log view engagement
    await prisma.resourceEngagement.create({
      data: {
        resourceId,
        userId,
        anonymousId: userId ? null : anonymousId,
        type: 'VIEW'
      }
    }).catch(console.error); // Don't fail the request if logging fails
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'resource_viewed',
        payload: {
          resourceId,
          resourceType: resource.type,
          resourceTitle: resource.title
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        type: resource.type,
        language: resource.language,
        filePath: resource.filePath,
        embedUrl: resource.embedUrl,
        createdAt: resource.createdAt,
        createdBy: resource.createdBy,
        engagementCount: resource._count.engagements
      }
    });
  })
);

/**
 * POST /api/v1/resources
 * Create new resource (counsellors and above only)
 */
router.post('/',
  requireCounsellor,
  validate(schemas.resource),
  asyncHandler(async (req, res) => {
    const { title, description, language, type, embedUrl } = req.body;
    
    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        language: language || 'en',
        type,
        embedUrl,
        createdByUserId: req.user.id,
        isActive: true
      },
      include: {
        createdBy: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'resource_created',
        payload: {
          resourceId: resource.id,
          resourceType: type,
          resourceTitle: title
        },
        userId: req.user.id
      }
    }).catch(console.error);
    
    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      resource
    });
  })
);

/**
 * POST /api/v1/resources/upload
 * Upload resource file (counsellors and above only)
 */
router.post('/upload',
  requireCounsellor,
  (req, res, next) => {
    uploadResource(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: 'File upload failed',
          message: err.message
        });
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }
    
    const { title, description, language, type } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({
        error: 'Title and type are required'
      });
    }
    
    const resource = await prisma.resource.create({
      data: {
        title,
        description: description || '',
        language: language || 'en',
        type,
        filePath: req.file.filename,
        createdByUserId: req.user.id,
        isActive: true
      },
      include: {
        createdBy: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'resource_uploaded',
        payload: {
          resourceId: resource.id,
          resourceType: type,
          resourceTitle: title,
          fileName: req.file.filename,
          fileSize: req.file.size
        },
        userId: req.user.id
      }
    }).catch(console.error);
    
    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully',
      resource
    });
  })
);

/**
 * POST /api/v1/resources/:id/engage
 * Log resource engagement (download, play)
 */
const engageSchema = Joi.object({
  type: Joi.string().valid('DOWNLOAD', 'PLAY').required()
});

router.post('/:id/engage',
  validate(engageSchema),
  asyncHandler(async (req, res) => {
    const resourceId = req.params.id;
    const { type } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Verify resource exists
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        isActive: true
      }
    });
    
    if (!resource) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    // Log engagement
    await prisma.resourceEngagement.create({
      data: {
        resourceId,
        userId,
        anonymousId: userId ? null : anonymousId,
        type
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'resource_engagement',
        payload: {
          resourceId,
          resourceType: resource.type,
          engagementType: type
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: `${type.toLowerCase()} recorded successfully`
    });
  })
);

/**
 * POST /api/v1/resources/:id/report
 * Report inappropriate resource
 */
router.post('/:id/report',
  validate(schemas.report),
  asyncHandler(async (req, res) => {
    const resourceId = req.params.id;
    const { reason } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Verify resource exists
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        isActive: true
      }
    });
    
    if (!resource) {
      return res.status(404).json({
        error: 'Resource not found'
      });
    }
    
    // Create report (using peer report model for consistency)
    const report = await prisma.peerReport.create({
      data: {
        targetType: 'COMMENT', // Using existing enum, treating as generic report
        targetId: resourceId,
        reason,
        userId,
        anonymousId: userId ? null : anonymousId,
        status: 'OPEN'
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'resource_reported',
        payload: {
          resourceId,
          reason,
          reportId: report.id
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Resource reported successfully. Thank you for helping maintain our community standards.'
    });
  })
);

/**
 * GET /api/v1/resources/files/:fileName
 * Serve resource files
 */
router.get('/files/:fileName', serveFile);

/**
 * PATCH /api/v1/resources/:id
 * Update resource (counsellors and above only)
 */
const updateResourceSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(1000),
  isActive: Joi.boolean()
});

router.patch('/:id',
  requireCounsellor,
  validate(updateResourceSchema),
  asyncHandler(async (req, res) => {
    const resourceId = req.params.id;
    const updates = req.body;
    
    // Check if resource exists and user has permission
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        OR: [
          { createdByUserId: req.user.id }, // Resource creator
          { createdBy: { role: { in: ['ADMIN', 'MODERATOR'] } } } // Admin/Moderator can edit any
        ]
      }
    });
    
    if (!resource && !['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(404).json({
        error: 'Resource not found or insufficient permissions'
      });
    }
    
    const updatedResource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Resource updated successfully',
      resource: updatedResource
    });
  })
);

/**
 * DELETE /api/v1/resources/:id
 * Delete resource (soft delete - mark as inactive)
 */
router.delete('/:id',
  requireCounsellor,
  asyncHandler(async (req, res) => {
    const resourceId = req.params.id;
    
    // Check if resource exists and user has permission
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        OR: [
          { createdByUserId: req.user.id }, // Resource creator
          { createdBy: { role: { in: ['ADMIN', 'MODERATOR'] } } } // Admin/Moderator can delete any
        ]
      }
    });
    
    if (!resource && !['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(404).json({
        error: 'Resource not found or insufficient permissions'
      });
    }
    
    // Soft delete by marking as inactive
    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  })
);

module.exports = router;