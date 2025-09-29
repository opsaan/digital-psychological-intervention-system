const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput, validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware, requireModerator } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply sanitization and optional authentication to all routes
router.use(sanitizeInput);
router.use(optionalAuthMiddleware);

/**
 * GET /api/v1/peer/posts
 * Get peer support posts
 */
router.get('/posts',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const tag = req.query.tag; // Filter by tag
    const search = req.query.search; // Search in content
    const offset = (page - 1) * limit;
    
    const where = {
      status: 'PUBLISHED'
    };
    
    if (tag) {
      where.tags = {
        array_contains: tag
      };
    }
    
    if (search) {
      where.content = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    const [posts, total] = await Promise.all([
      prisma.peerPost.findMany({
        where,
        select: {
          id: true,
          displayAlias: true,
          content: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              comments: {
                where: {
                  status: 'PUBLISHED'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.peerPost.count({ where })
    ]);
    
    res.json({
      success: true,
      posts: posts.map(post => ({
        ...post,
        commentCount: post._count.comments,
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
 * POST /api/v1/peer/posts
 * Create new peer support post
 */
router.post('/posts',
  validate(schemas.peerPost),
  asyncHandler(async (req, res) => {
    const { content, tags, displayAlias } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required',
        message: 'Please enable cookies or log in to create posts'
      });
    }
    
    // Basic profanity/PII filter (simple implementation)
    const flaggedWords = ['fuck', 'shit', 'damn', 'suicide', 'kill myself', 'end it all'];
    const hasInappropriateContent = flaggedWords.some(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    
    const post = await prisma.peerPost.create({
      data: {
        userId,
        anonymousId: userId ? null : anonymousId,
        displayAlias: displayAlias || (userId ? null : 'Anonymous User'),
        content,
        tags: tags || [],
        status: hasInappropriateContent ? 'FLAGGED' : 'PUBLISHED'
      },
      select: {
        id: true,
        displayAlias: true,
        content: true,
        tags: true,
        status: true,
        createdAt: true
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'peer_post_created',
        payload: {
          postId: post.id,
          hasInappropriateContent,
          tagCount: tags?.length || 0,
          contentLength: content.length
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    const message = hasInappropriateContent 
      ? 'Post created but flagged for review due to potentially inappropriate content.'
      : 'Post created successfully!';
    
    res.status(201).json({
      success: true,
      message,
      post
    });
  })
);

/**
 * GET /api/v1/peer/posts/:id
 * Get specific post with comments
 */
router.get('/posts/:id',
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    
    const post = await prisma.peerPost.findFirst({
      where: {
        id: postId,
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        displayAlias: true,
        content: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        comments: {
          where: {
            status: 'PUBLISHED'
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      post
    });
  })
);

/**
 * POST /api/v1/peer/posts/:id/comments
 * Add comment to post
 */
router.post('/posts/:id/comments',
  validate(schemas.peerComment),
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required',
        message: 'Please enable cookies or log in to comment'
      });
    }
    
    // Verify post exists and is published
    const post = await prisma.peerPost.findFirst({
      where: {
        id: postId,
        status: 'PUBLISHED'
      }
    });
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    
    // Basic profanity/PII filter
    const flaggedWords = ['fuck', 'shit', 'damn', 'suicide', 'kill myself'];
    const hasInappropriateContent = flaggedWords.some(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    
    const comment = await prisma.peerComment.create({
      data: {
        postId,
        userId,
        anonymousId: userId ? null : anonymousId,
        content,
        status: hasInappropriateContent ? 'FLAGGED' : 'PUBLISHED'
      },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'peer_comment_created',
        payload: {
          postId,
          commentId: comment.id,
          hasInappropriateContent,
          contentLength: content.length
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    const message = hasInappropriateContent 
      ? 'Comment created but flagged for review due to potentially inappropriate content.'
      : 'Comment added successfully!';
    
    res.status(201).json({
      success: true,
      message,
      comment
    });
  })
);

/**
 * POST /api/v1/peer/posts/:id/like
 * Like/unlike a post
 */
router.post('/posts/:id/like',
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required'
      });
    }
    
    // Verify post exists
    const post = await prisma.peerPost.findFirst({
      where: {
        id: postId,
        status: 'PUBLISHED'
      }
    });
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    
    // For simplicity, we'll log this as an analytics event
    // In a full implementation, you might want a separate likes table
    await prisma.analyticsEvent.create({
      data: {
        type: 'peer_post_liked',
        payload: {
          postId
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Post liked successfully'
    });
  })
);

/**
 * POST /api/v1/peer/posts/:id/report
 * Report inappropriate post
 */
router.post('/posts/:id/report',
  validate(schemas.report),
  asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { reason } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Verify post exists
    const post = await prisma.peerPost.findFirst({
      where: {
        id: postId,
        status: 'PUBLISHED'
      }
    });
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }
    
    const report = await prisma.peerReport.create({
      data: {
        targetType: 'POST',
        targetId: postId,
        reason,
        userId,
        anonymousId: userId ? null : anonymousId,
        status: 'OPEN'
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'peer_post_reported',
        payload: {
          postId,
          reason,
          reportId: report.id
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Post reported successfully. Thank you for helping maintain our community standards.'
    });
  })
);

/**
 * POST /api/v1/peer/comments/:id/report
 * Report inappropriate comment
 */
router.post('/comments/:id/report',
  validate(schemas.report),
  asyncHandler(async (req, res) => {
    const commentId = req.params.id;
    const { reason } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Verify comment exists
    const comment = await prisma.peerComment.findFirst({
      where: {
        id: commentId,
        status: 'PUBLISHED'
      }
    });
    
    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found'
      });
    }
    
    const report = await prisma.peerReport.create({
      data: {
        targetType: 'COMMENT',
        targetId: commentId,
        reason,
        userId,
        anonymousId: userId ? null : anonymousId,
        status: 'OPEN'
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'peer_comment_reported',
        payload: {
          commentId,
          reason,
          reportId: report.id
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Comment reported successfully. Thank you for helping maintain our community standards.'
    });
  })
);

/**
 * GET /api/v1/peer/my-posts
 * Get user's own posts (authenticated users only)
 */
router.get('/my-posts',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required to view your posts'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    
    const [posts, total] = await Promise.all([
      prisma.peerPost.findMany({
        where: {
          userId: req.user.id
        },
        select: {
          id: true,
          displayAlias: true,
          content: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              comments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.peerPost.count({
        where: {
          userId: req.user.id
        }
      })
    ]);
    
    res.json({
      success: true,
      posts: posts.map(post => ({
        ...post,
        commentCount: post._count.comments,
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
 * GET /api/v1/peer/tags
 * Get popular tags
 */
router.get('/tags',
  asyncHandler(async (req, res) => {
    // This is a simplified implementation
    // In a real app, you might want to aggregate tags from all posts
    const commonTags = [
      'anxiety',
      'depression',
      'stress',
      'academic-pressure',
      'relationships',
      'social-anxiety',
      'sleep-issues',
      'self-care',
      'motivation',
      'support',
      'recovery',
      'coping-strategies'
    ];
    
    res.json({
      success: true,
      tags: commonTags
    });
  })
);

module.exports = router;