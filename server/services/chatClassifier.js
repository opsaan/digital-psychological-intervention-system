// Deterministic chat classification service
// Provides consistent, trigger-based AI First-Aid responses

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Keyword triggers for each category (case-insensitive)
const CATEGORY_TRIGGERS = {
  ANXIETY: [
    'anxious', 'nervous', 'panic', 'racing heart', 'short of breath', 'worry',
    'restless', 'tense', 'fear', 'phobia', 'overwhelmed', 'stressed out',
    'can\'t calm down', 'butterflies', 'sweating', 'trembling', 'dread'
  ],
  DEPRESSION: [
    'sad', 'depressed', 'hopeless', 'worthless', 'empty', 'lonely',
    'no energy', 'tired all the time', 'can\'t sleep', 'no motivation',
    'nothing matters', 'give up', 'pointless', 'numb', 'crying',
    'no interest', 'isolated', 'darkness'
  ],
  STRESS_BURNOUT: [
    'stressed', 'burnout', 'exhausted', 'overwhelmed', 'pressure',
    'too much work', 'can\'t cope', 'breaking point', 'workload',
    'deadline stress', 'performance anxiety', 'juggling too much'
  ],
  SLEEP: [
    'can\'t sleep', 'insomnia', 'nightmares', 'tired', 'fatigue',
    'staying up late', 'tossing and turning', 'sleep problems',
    'waking up early', 'restless sleep', 'no rest'
  ],
  ACADEMIC_STRESS: [
    'exam stress', 'failing', 'grades', 'study pressure', 'academic pressure',
    'can\'t focus', 'procrastination', 'behind in studies', 'test anxiety',
    'assignment stress', 'performance pressure', 'academic failure'
  ],
  SOCIAL_ISOLATION: [
    'alone', 'lonely', 'no friends', 'isolated', 'social anxiety',
    'can\'t connect', 'withdrawn', 'nobody understands', 'left out',
    'social pressure', 'awkward', 'shy'
  ],
  CRISIS: [
    'suicidal', 'end it all', 'harm myself', 'self-harm', 'kill myself',
    'life not worth living', 'want to die', 'suicide', 'cut myself',
    'overdose', 'jump', 'hanging', 'razor', 'pills', 'end my life',
    'better off dead', 'no point living', 'can\'t go on'
  ]
};

// Severity levels
const SEVERITY_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRISIS: 'crisis'
};

// Response templates with i18n keys
const RESPONSE_TEMPLATES = {
  en: {
    ANXIETY: {
      validation: "I understand you're feeling anxious right now. That's a very real and valid experience.",
      strategies: [
        "Try the 4-7-8 breathing technique: Breathe in for 4, hold for 7, exhale for 8.",
        "Ground yourself using the 5-4-3-2-1 technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
        "Progressive muscle relaxation can help: Tense and release each muscle group from your toes to your head."
      ],
      psychoeducation: "Anxiety is your body's natural response to stress. While uncomfortable, these feelings are temporary and manageable.",
      next_steps: "Consider taking our anxiety screening (GAD-7) or booking a session with a counsellor for ongoing support."
    },
    DEPRESSION: {
      validation: "I hear that you're going through a difficult time. These feelings of sadness and emptiness are real.",
      strategies: [
        "Try to maintain a daily routine, even a simple one.",
        "Engage in small, achievable activities that used to bring you joy.",
        "Consider reaching out to a trusted friend or family member."
      ],
      psychoeducation: "Depression affects how you think, feel, and act. It's a medical condition that can be treated effectively.",
      next_steps: "Taking our depression screening (PHQ-9) can help assess your symptoms. Professional support is available."
    },
    STRESS_BURNOUT: {
      validation: "Feeling overwhelmed by stress and responsibilities is more common than you might think.",
      strategies: [
        "Break large tasks into smaller, manageable steps.",
        "Practice saying 'no' to additional commitments when possible.",
        "Schedule regular breaks and self-care activities."
      ],
      psychoeducation: "Chronic stress can lead to burnout, affecting your physical and mental health. Recovery is possible with proper support.",
      next_steps: "Consider stress management techniques and speaking with a counsellor about workload management."
    },
    SLEEP: {
      validation: "Sleep difficulties can be frustrating and impact many areas of your life.",
      strategies: [
        "Maintain a consistent sleep schedule, even on weekends.",
        "Create a relaxing bedtime routine without screens.",
        "Keep your bedroom cool, dark, and quiet."
      ],
      psychoeducation: "Good sleep hygiene is essential for mental health. Sleep problems often improve with consistent practices.",
      next_steps: "If sleep problems persist, consider discussing them with a healthcare provider or counsellor."
    },
    ACADEMIC_STRESS: {
      validation: "Academic pressure can feel overwhelming, especially when you want to do well.",
      strategies: [
        "Break study sessions into focused 25-minute blocks with short breaks.",
        "Create a realistic study schedule that includes time for rest.",
        "Reach out to teachers or academic advisors when you need help."
      ],
      psychoeducation: "Academic stress is common among students. Learning effective study strategies can reduce anxiety and improve performance.",
      next_steps: "Our counsellors can help with study strategies and managing academic pressure."
    },
    SOCIAL_ISOLATION: {
      validation: "Feeling disconnected from others can be lonely and painful.",
      strategies: [
        "Start with small social interactions, like greeting classmates or colleagues.",
        "Join clubs or activities aligned with your interests.",
        "Consider online communities related to your hobbies or concerns."
      ],
      psychoeducation: "Social connections are vital for mental health. Building relationships takes time and practice.",
      next_steps: "Our peer support forum might be a good place to start connecting with others who understand."
    },
    CRISIS: {
      immediate_safety: "I'm very concerned about what you've shared. Your life has value, and help is available right now.",
      crisis_resources: "Please reach out immediately to a crisis helpline or emergency services if you're in immediate danger.",
      support_available: "You don't have to go through this alone. Professional help and support are available.",
      next_steps: "Please consider speaking with a mental health professional as soon as possible."
    }
  },
  hi: {
    ANXIETY: {
      validation: "मैं समझ सकता हूँ कि आप अभी चिंतित महसूस कर रहे हैं। यह एक वास्तविक और मान्य अनुभव है।",
      strategies: [
        "4-7-8 श्वास तकनीक आज़माएं: 4 की गिनती में सांस लें, 7 तक रोकें, 8 में छोड़ें।",
        "5-4-3-2-1 तकनीक से खुद को स्थिर करें: 5 चीजें देखें, 4 को छुएं, 3 सुनें, 2 सूंघें, 1 चखें।"
      ],
      psychoeducation: "चिंता तनाव के लिए आपके शरीर की प्राकृतिक प्रतिक्रिया है। असहज होने पर भी, ये भावनाएं अस्थायी हैं।",
      next_steps: "हमारी चिंता जांच (GAD-7) लेने या काउंसलर के साथ सत्र बुक करने पर विचार करें।"
    }
    // Add more Hindi translations as needed
  }
};

/**
 * Classify user input and determine response
 * Pure function for deterministic behavior
 * @param {string} text - User input text
 * @param {Array} history - Previous messages in session
 * @param {Array} screenings - Recent screening results
 * @returns {Object} Classification result
 */
function classify(text, history = [], screenings = []) {
  const normalizedText = text.toLowerCase();
  
  // Check for crisis keywords first (short-circuit)
  const crisisKeywords = CATEGORY_TRIGGERS.CRISIS;
  const hasCrisisKeywords = crisisKeywords.some(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  );
  
  if (hasCrisisKeywords) {
    return {
      category: 'CRISIS',
      severity: SEVERITY_LEVELS.CRISIS,
      crisis: true,
      confidence: 1.0
    };
  }
  
  // Score each category based on keyword matches
  const categoryScores = {};
  
  Object.entries(CATEGORY_TRIGGERS).forEach(([category, keywords]) => {
    if (category === 'CRISIS') return; // Already handled
    
    const matches = keywords.filter(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    ).length;
    
    categoryScores[category] = matches / keywords.length;
  });
  
  // Find best matching category
  const bestCategory = Object.entries(categoryScores)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (!bestCategory || bestCategory[1] === 0) {
    return {
      category: 'GENERAL',
      severity: SEVERITY_LEVELS.LOW,
      crisis: false,
      confidence: 0.0
    };
  }
  
  const [category, confidence] = bestCategory;
  
  // Determine severity based on keyword density and recent screenings
  let severity = SEVERITY_LEVELS.LOW;
  
  if (confidence > 0.3) {
    severity = SEVERITY_LEVELS.MODERATE;
  }
  if (confidence > 0.6) {
    severity = SEVERITY_LEVELS.HIGH;
  }
  
  // Augment severity from recent screenings (within 60 days)
  const recentScreenings = screenings.filter(s => {
    const daysDiff = (Date.now() - new Date(s.createdAt)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 60;
  });
  
  if (recentScreenings.length > 0) {
    const latestScreening = recentScreenings.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    
    if (latestScreening.severityBand === 'severe' || latestScreening.severityBand === 'moderate-severe') {
      severity = SEVERITY_LEVELS.HIGH;
    } else if (latestScreening.severityBand === 'moderate' && severity === SEVERITY_LEVELS.LOW) {
      severity = SEVERITY_LEVELS.MODERATE;
    }
  }
  
  return {
    category,
    severity,
    crisis: false,
    confidence
  };
}

/**
 * Build response based on classification
 * @param {Object} classification - Result from classify function
 * @param {string} language - User's preferred language
 * @returns {Object} Response with message and quick replies
 */
function buildResponse(classification, language = 'en') {
  const { category, severity, crisis } = classification;
  const templates = RESPONSE_TEMPLATES[language] || RESPONSE_TEMPLATES.en;
  
  if (crisis) {
    const template = templates.CRISIS;
    return {
      message: `${template.immediate_safety} ${template.crisis_resources} ${template.support_available}`,
      quickReplies: [
        'Show crisis resources',
        'Connect with counsellor',
        'Find helplines'
      ],
      showCrisisBanner: true,
      nextSteps: template.next_steps
    };
  }
  
  const template = templates[category];
  if (!template) {
    return {
      message: "I'm here to listen and support you. Can you tell me more about what's on your mind?",
      quickReplies: [
        'Take screening test',
        'Book counselling',
        'Browse resources'
      ],
      showCrisisBanner: false
    };
  }
  
  const strategies = template.strategies.slice(0, 2); // Limit to 2 strategies
  const message = `${template.validation} ${strategies.join(' ')} ${template.psychoeducation}`;
  
  const quickReplies = [
    'Tell me more',
    'Take screening',
    'Book session',
    'Browse resources'
  ];
  
  return {
    message,
    quickReplies,
    showCrisisBanner: false,
    nextSteps: template.next_steps,
    category,
    severity
  };
}

/**
 * Get recent screenings for user
 * @param {string} userId - User ID
 * @param {string} anonymousId - Anonymous session ID
 * @returns {Array} Recent screening results
 */
async function getRecentScreenings(userId, anonymousId) {
  const where = {};
  if (userId) {
    where.userId = userId;
  } else if (anonymousId) {
    where.anonymousId = anonymousId;
  } else {
    return [];
  }
  
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  
  return await prisma.screening.findMany({
    where: {
      ...where,
      createdAt: {
        gte: sixtyDaysAgo
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

module.exports = {
  classify,
  buildResponse,
  getRecentScreenings,
  CATEGORY_TRIGGERS,
  SEVERITY_LEVELS,
  RESPONSE_TEMPLATES
};