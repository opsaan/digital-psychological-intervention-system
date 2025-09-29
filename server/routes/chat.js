const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput, validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { classify, buildResponse, getRecentScreenings } = require('../services/chatClassifier');
const Joi = require('joi');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply sanitization and optional authentication to all routes
router.use(sanitizeInput);
router.use(optionalAuthMiddleware);

/**
 * POST /api/v1/chat/session
 * Create a new chat session
 */
const createSessionSchema = Joi.object({
  consentToSave: Joi.boolean().default(false)
});

router.post('/session',
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const { consentToSave } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required',
        message: 'Please enable cookies or log in to start a chat session'
      });
    }
    
    const session = await prisma.chatSession.create({
      data: {
        userId,
        anonymousId: userId ? null : anonymousId,
        consentToSave,
        startedAt: new Date()
      },
      select: {
        id: true,
        userId: true,
        anonymousId: true,
        consentToSave: true,
        startedAt: true
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'chat_session_started',
        payload: {
          sessionId: session.id,
          hasConsent: consentToSave
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error); // Don't fail the request if analytics fails
    
    res.json({
      success: true,
      session,
      welcomeMessage: {
        message: "Hello! I'm here to provide mental health first aid support. How are you feeling today?",
        quickReplies: [
          "I'm feeling anxious",
          "I'm feeling sad",
          "I'm stressed out",
          "I can't sleep",
          "I need help"
        ],
        showCrisisBanner: false
      }
    });
  })
);

/**
 * POST /api/v1/chat/message
 * Send a message and get bot response
 */
router.post('/message',
  validate(schemas.chatMessage),
  asyncHandler(async (req, res) => {
    const { text, sessionId } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { userId },
          { anonymousId }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Get last 10 messages for context
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }
    
    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'USER',
        text,
        createdAt: new Date()
      }
    });
    
    // Get recent screenings for context
    const recentScreenings = await getRecentScreenings(userId, anonymousId);
    
    // Classify the message
    const messageHistory = session.messages.map(msg => ({
      sender: msg.sender,
      text: msg.text,
      createdAt: msg.createdAt
    }));
    
    const classification = classify(text, messageHistory, recentScreenings);
    
    // Build response based on classification
    const language = req.user?.preferredLanguage || 'en';
    const response = buildResponse(classification, language);
    
    // Save bot response
    const botMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'BOT',
        text: response.message,
        category: classification.category,
        severity: classification.severity,
        createdAt: new Date()
      }
    });
    
    // Update session with last category and severity
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        lastCategory: classification.category,
        lastSeverity: classification.severity
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'chat_message_sent',
        payload: {
          sessionId,
          category: classification.category,
          severity: classification.severity,
          crisis: classification.crisis,
          messageLength: text.length
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      userMessage: {
        id: userMessage.id,
        text: userMessage.text,
        sender: 'USER',
        createdAt: userMessage.createdAt
      },
      botResponse: {
        id: botMessage.id,
        message: response.message,
        quickReplies: response.quickReplies,
        showCrisisBanner: response.showCrisisBanner,
        nextSteps: response.nextSteps,
        category: classification.category,
        severity: classification.severity,
        sender: 'BOT',
        createdAt: botMessage.createdAt
      }
    });
  })
);

/**
 * GET /api/v1/chat/session/:id
 * Get chat session with messages
 */
router.get('/session/:id',
  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { userId },
          { anonymousId }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            sender: true,
            text: true,
            category: true,
            severity: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        consentToSave: session.consentToSave,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        lastCategory: session.lastCategory,
        lastSeverity: session.lastSeverity,
        messages: session.messages
      }
    });
  })
);

/**
 * PATCH /api/v1/chat/session/:id/consent
 * Update consent for saving chat session
 */
const updateConsentSchema = Joi.object({
  consentToSave: Joi.boolean().required()
});

router.patch('/session/:id/consent',
  validate(updateConsentSchema),
  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const { consentToSave } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { userId },
          { anonymousId }
        ]
      }
    });
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }
    
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        consentToSave
      },
      select: {
        id: true,
        consentToSave: true,
        updatedAt: true
      }
    });
    
    res.json({
      success: true,
      message: `Consent ${consentToSave ? 'granted' : 'revoked'} successfully`,
      session: updatedSession
    });
  })
);

/**
 * POST /api/v1/chat/session/:id/end
 * End chat session
 */
router.post('/session/:id/end',
  asyncHandler(async (req, res) => {
    const sessionId = req.params.id;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { userId },
          { anonymousId }
        ]
      }
    });
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }
    
    const endedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date()
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'chat_session_ended',
        payload: {
          sessionId,
          duration: endedSession.endedAt - endedSession.startedAt,
          lastCategory: endedSession.lastCategory,
          lastSeverity: endedSession.lastSeverity
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: 'Chat session ended',
      session: {
        id: endedSession.id,
        endedAt: endedSession.endedAt
      }
    });
  })
);

/**
 * GET /api/v1/chat/sessions
 * Get user's chat sessions (authenticated users only)
 */
router.get('/sessions',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required to view chat history'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    
    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where: {
          userId: req.user.id,
          consentToSave: true // Only show sessions with consent
        },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          lastCategory: true,
          lastSeverity: true,
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.chatSession.count({
        where: {
          userId: req.user.id,
          consentToSave: true
        }
      })
    ]);
    
    res.json({
      success: true,
      sessions: sessions.map(session => ({
        ...session,
        messageCount: session._count.messages
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

module.exports = router;