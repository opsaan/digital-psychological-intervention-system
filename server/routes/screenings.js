const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput, validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { scorePHQ9, scoreGAD7, getRecommendations } = require('../services/screeningScorer');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply sanitization and optional authentication to all routes
router.use(sanitizeInput);
router.use(optionalAuthMiddleware);

/**
 * POST /api/v1/screenings/phq9
 * Submit PHQ-9 depression screening
 */
router.post('/phq9',
  validate(schemas.screening),
  asyncHandler(async (req, res) => {
    const { answers, consent } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required',
        message: 'Please enable cookies or log in to take screenings'
      });
    }
    
    try {
      // Score the PHQ-9
      const scoringResult = scorePHQ9(answers);
      
      // Save screening result
      const screening = await prisma.screening.create({
        data: {
          userId,
          anonymousId: userId ? null : anonymousId,
          type: 'PHQ9',
          answers,
          score: scoringResult.score,
          severityBand: scoringResult.severityBand,
          consent
        },
        select: {
          id: true,
          type: true,
          score: true,
          severityBand: true,
          createdAt: true
        }
      });
      
      // Get recommendations
      const language = req.user?.preferredLanguage || 'en';
      const recommendations = getRecommendations('PHQ9', scoringResult.severityBand, language);
      
      // Log analytics event
      await prisma.analyticsEvent.create({
        data: {
          type: 'screening_completed',
          payload: {
            screeningType: 'PHQ9',
            score: scoringResult.score,
            severityBand: scoringResult.severityBand,
            hasConsent: consent
          },
          userId,
          anonymousId: userId ? null : anonymousId
        }
      }).catch(console.error);
      
      res.json({
        success: true,
        screening,
        results: {
          score: scoringResult.score,
          maxScore: scoringResult.maxScore,
          severityBand: scoringResult.severityBand,
          interpretation: scoringResult.interpretation[language] || scoringResult.interpretation.en,
          recommendations
        }
      });
    } catch (error) {
      if (error.message.includes('requires exactly') || error.message.includes('must be integers')) {
        return res.status(400).json({
          error: 'Invalid screening data',
          message: error.message
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/v1/screenings/gad7
 * Submit GAD-7 anxiety screening
 */
router.post('/gad7',
  validate(schemas.screening),
  asyncHandler(async (req, res) => {
    const { answers, consent } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required',
        message: 'Please enable cookies or log in to take screenings'
      });
    }
    
    try {
      // Score the GAD-7
      const scoringResult = scoreGAD7(answers);
      
      // Save screening result
      const screening = await prisma.screening.create({
        data: {
          userId,
          anonymousId: userId ? null : anonymousId,
          type: 'GAD7',
          answers,
          score: scoringResult.score,
          severityBand: scoringResult.severityBand,
          consent
        },
        select: {
          id: true,
          type: true,
          score: true,
          severityBand: true,
          createdAt: true
        }
      });
      
      // Get recommendations
      const language = req.user?.preferredLanguage || 'en';
      const recommendations = getRecommendations('GAD7', scoringResult.severityBand, language);
      
      // Log analytics event
      await prisma.analyticsEvent.create({
        data: {
          type: 'screening_completed',
          payload: {
            screeningType: 'GAD7',
            score: scoringResult.score,
            severityBand: scoringResult.severityBand,
            hasConsent: consent
          },
          userId,
          anonymousId: userId ? null : anonymousId
        }
      }).catch(console.error);
      
      res.json({
        success: true,
        screening,
        results: {
          score: scoringResult.score,
          maxScore: scoringResult.maxScore,
          severityBand: scoringResult.severityBand,
          interpretation: scoringResult.interpretation[language] || scoringResult.interpretation.en,
          recommendations
        }
      });
    } catch (error) {
      if (error.message.includes('requires exactly') || error.message.includes('must be integers')) {
        return res.status(400).json({
          error: 'Invalid screening data',
          message: error.message
        });
      }
      throw error;
    }
  })
);

/**
 * GET /api/v1/screenings/my
 * Get user's screening history (authenticated users only)
 */
router.get('/my',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required to view screening history'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const type = req.query.type; // Optional filter by PHQ9 or GAD7
    const offset = (page - 1) * limit;
    
    const where = {
      userId: req.user.id,
      consent: true // Only show screenings with consent
    };
    
    if (type && ['PHQ9', 'GAD7'].includes(type)) {
      where.type = type;
    }
    
    const [screenings, total] = await Promise.all([
      prisma.screening.findMany({
        where,
        select: {
          id: true,
          type: true,
          score: true,
          severityBand: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.screening.count({ where })
    ]);
    
    res.json({
      success: true,
      screenings,
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
 * GET /api/v1/screenings/:id
 * Get specific screening result
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const screeningId = req.params.id;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    const screening = await prisma.screening.findFirst({
      where: {
        id: screeningId,
        OR: [
          { userId },
          { anonymousId }
        ]
      },
      select: {
        id: true,
        type: true,
        answers: true,
        score: true,
        severityBand: true,
        createdAt: true
      }
    });
    
    if (!screening) {
      return res.status(404).json({
        error: 'Screening not found or access denied'
      });
    }
    
    // Regenerate interpretation and recommendations
    const language = req.user?.preferredLanguage || 'en';
    const scoringFunction = screening.type === 'PHQ9' ? scorePHQ9 : scoreGAD7;
    const scoringResult = scoringFunction(screening.answers);
    const recommendations = getRecommendations(screening.type, screening.severityBand, language);
    
    res.json({
      success: true,
      screening: {
        ...screening,
        results: {
          score: screening.score,
          maxScore: scoringResult.maxScore,
          severityBand: screening.severityBand,
          interpretation: scoringResult.interpretation[language] || scoringResult.interpretation.en,
          recommendations
        }
      }
    });
  })
);

/**
 * GET /api/v1/screenings/questions/phq9
 * Get PHQ-9 questions
 */
router.get('/questions/phq9', (req, res) => {
  const language = req.query.lang || 'en';
  
  const questions = {
    en: [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much",
      "Feeling tired or having little energy",
      "Poor appetite or overeating",
      "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
      "Trouble concentrating on things, such as reading the newspaper or watching television",
      "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
      "Thoughts that you would be better off dead, or of hurting yourself"
    ],
    hi: [
      "कामों में कम रुचि या खुशी महसूस करना",
      "उदास, अवसादग्रस्त, या निराश महसूस करना",
      "सोने में परेशानी, या बहुत ज्यादा सोना",
      "थकान महसूस करना या ऊर्जा कम होना",
      "भूख कम लगना या ज्यादा खाना"
    ]
  };
  
  const responseOptions = {
    en: [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day"
    ],
    hi: [
      "बिल्कुल नहीं",
      "कई दिन",
      "आधे से ज्यादा दिन",
      "लगभग हर दिन"
    ]
  };
  
  res.json({
    success: true,
    screening: {
      type: 'PHQ9',
      title: language === 'hi' ? 'PHQ-9 अवसाद स्क्रीनिंग' : 'PHQ-9 Depression Screening',
      description: language === 'hi' ? 
        'यह स्क्रीनिंग अवसाद के लक्षणों का मूल्यांकन करने में मदद करती है।' :
        'This screening helps assess symptoms of depression.',
      timeframe: language === 'hi' ? 'पिछले 2 सप्ताह में' : 'Over the last 2 weeks',
      questions: questions[language] || questions.en,
      options: responseOptions[language] || responseOptions.en
    }
  });
});

/**
 * GET /api/v1/screenings/questions/gad7
 * Get GAD-7 questions
 */
router.get('/questions/gad7', (req, res) => {
  const language = req.query.lang || 'en';
  
  const questions = {
    en: [
      "Feeling nervous, anxious, or on edge",
      "Not being able to stop or control worrying",
      "Worrying too much about different things",
      "Trouble relaxing",
      "Being so restless that it is hard to sit still",
      "Becoming easily annoyed or irritable",
      "Feeling afraid, as if something awful might happen"
    ],
    hi: [
      "घबराहट, चिंतित, या बेचैन महसूस करना",
      "चिंता को रोकने या नियंत्रित करने में असमर्थ होना",
      "विभिन्न बातों के बारे में बहुत ज्यादा चिंता करना",
      "आराम करने में परेशानी"
    ]
  };
  
  const responseOptions = {
    en: [
      "Not at all",
      "Several days",
      "More than half the days",
      "Nearly every day"
    ],
    hi: [
      "बिल्कुल नहीं",
      "कई दिन",
      "आधे से ज्यादा दिन",
      "लगभग हर दिन"
    ]
  };
  
  res.json({
    success: true,
    screening: {
      type: 'GAD7',
      title: language === 'hi' ? 'GAD-7 चिंता स्क्रीनिंग' : 'GAD-7 Anxiety Screening',
      description: language === 'hi' ? 
        'यह स्क्रीनिंग चिंता के लक्षणों का मूल्यांकन करने में मदद करती है।' :
        'This screening helps assess symptoms of anxiety.',
      timeframe: language === 'hi' ? 'पिछले 2 सप्ताह में' : 'Over the last 2 weeks',
      questions: questions[language] || questions.en,
      options: responseOptions[language] || responseOptions.en
    }
  });
});

module.exports = router;