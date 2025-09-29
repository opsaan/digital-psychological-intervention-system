// Screening scoring service for PHQ-9 and GAD-7
// Implements standard clinical scoring algorithms

/**
 * PHQ-9 Depression Screening Scorer
 * Scores: 0-4 (minimal), 5-9 (mild), 10-14 (moderate), 15-19 (moderate-severe), 20-27 (severe)
 */
const scorePHQ9 = (answers) => {
  if (!Array.isArray(answers) || answers.length !== 9) {
    throw new Error('PHQ-9 requires exactly 9 answers');
  }
  
  const validAnswers = answers.every(answer => 
    Number.isInteger(answer) && answer >= 0 && answer <= 3
  );
  
  if (!validAnswers) {
    throw new Error('PHQ-9 answers must be integers between 0 and 3');
  }
  
  const totalScore = answers.reduce((sum, answer) => sum + answer, 0);
  
  let severityBand;
  if (totalScore <= 4) {
    severityBand = 'minimal';
  } else if (totalScore <= 9) {
    severityBand = 'mild';
  } else if (totalScore <= 14) {
    severityBand = 'moderate';
  } else if (totalScore <= 19) {
    severityBand = 'moderate-severe';
  } else {
    severityBand = 'severe';
  }
  
  return {
    score: totalScore,
    maxScore: 27,
    severityBand,
    interpretation: getPHQ9Interpretation(severityBand)
  };
};

/**
 * GAD-7 Anxiety Screening Scorer
 * Scores: 0-4 (minimal), 5-9 (mild), 10-14 (moderate), 15-21 (severe)
 */
const scoreGAD7 = (answers) => {
  if (!Array.isArray(answers) || answers.length !== 7) {
    throw new Error('GAD-7 requires exactly 7 answers');
  }
  
  const validAnswers = answers.every(answer => 
    Number.isInteger(answer) && answer >= 0 && answer <= 3
  );
  
  if (!validAnswers) {
    throw new Error('GAD-7 answers must be integers between 0 and 3');
  }
  
  const totalScore = answers.reduce((sum, answer) => sum + answer, 0);
  
  let severityBand;
  if (totalScore <= 4) {
    severityBand = 'minimal';
  } else if (totalScore <= 9) {
    severityBand = 'mild';
  } else if (totalScore <= 14) {
    severityBand = 'moderate';
  } else {
    severityBand = 'severe';
  }
  
  return {
    score: totalScore,
    maxScore: 21,
    severityBand,
    interpretation: getGAD7Interpretation(severityBand)
  };
};

/**
 * Get PHQ-9 interpretation text
 */
const getPHQ9Interpretation = (severityBand) => {
  const interpretations = {
    minimal: {
      en: "Minimal depression symptoms. Your responses suggest you may have few or no symptoms of depression.",
      hi: "न्यूनतम अवसाद के लक्षण। आपके उत्तर सुझाते हैं कि आपमें अवसाद के कम या कोई लक्षण नहीं हैं।"
    },
    mild: {
      en: "Mild depression symptoms. You may be experiencing some symptoms that could benefit from attention and self-care.",
      hi: "हल्के अवसाद के लक्षण। आप कुछ ऐसे लक्षण अनुभव कर रहे हों जिनमें देखभाल और ध्यान की आवश्यकता हो।"
    },
    moderate: {
      en: "Moderate depression symptoms. Consider speaking with a mental health professional about your symptoms.",
      hi: "मध्यम अवसाद के लक्षण। अपने लक्षणों के बारे में किसी मानसिक स्वास्थ्य पेशेवर से बात करने पर विचार करें।"
    },
    'moderate-severe': {
      en: "Moderate to severe depression symptoms. It's recommended to seek professional help to address these symptoms.",
      hi: "मध्यम से गंभीर अवसाद के लक्षण। इन लक्षणों के लिए पेशेवर सहायता लेने की सिफारिश की जाती है।"
    },
    severe: {
      en: "Severe depression symptoms. Please consider seeking immediate professional help. These symptoms can significantly impact your daily life.",
      hi: "गंभीर अवसाद के लक्षण। कृपया तत्काल पेशेवर सहायता लेने पर विचार करें। ये लक्षण आपके दैनिक जीवन को महत्वपूर्ण रूप से प्रभावित कर सकते हैं।"
    }
  };
  
  return interpretations[severityBand] || interpretations.minimal;
};

/**
 * Get GAD-7 interpretation text
 */
const getGAD7Interpretation = (severityBand) => {
  const interpretations = {
    minimal: {
      en: "Minimal anxiety symptoms. Your responses suggest you may have few or no symptoms of anxiety.",
      hi: "न्यूनतम चिंता के लक्षण। आपके उत्तर सुझाते हैं कि आपमें चिंता के कम या कोई लक्षण नहीं हैं।"
    },
    mild: {
      en: "Mild anxiety symptoms. You may be experiencing some anxiety that could benefit from relaxation techniques and self-care.",
      hi: "हल्की चिंता के लक्षण। आप कुछ चिंता अनुभव कर रहे हों जिसमें आराम की तकनीक और स्वयं की देखभाल से फायदा हो सकता है।"
    },
    moderate: {
      en: "Moderate anxiety symptoms. Consider learning anxiety management techniques or speaking with a counsellor.",
      hi: "मध्यम चिंता के लक्षण। चिंता प्रबंधन तकनीक सीखने या काउंसलर से बात करने पर विचार करें।"
    },
    severe: {
      en: "Severe anxiety symptoms. It's recommended to seek professional help. These symptoms may be significantly impacting your daily functioning.",
      hi: "गंभीर चिंता के लक्षण। पेशेवर सहायता लेने की सिफारिश की जाती है। ये लक्षण आपके दैनिक कार्यकलाप को महत्वपूर्ण रूप से प्रभावित कर सकते हैं।"
    }
  };
  
  return interpretations[severityBand] || interpretations.minimal;
};

/**
 * Get screening recommendations based on score
 */
const getRecommendations = (type, severityBand, language = 'en') => {
  const recommendations = {
    PHQ9: {
      minimal: {
        en: [
          "Continue maintaining good mental health practices",
          "Stay connected with friends and family",
          "Engage in regular physical activity",
          "Practice stress management techniques"
        ],
        hi: [
          "अच्छी मानसिक स्वास्थ्य प्रथाओं को बनाए रखना जारी रखें",
          "दोस्तों और परिवार के साथ जुड़े रहें",
          "नियमित शारीरिक गतिविधि में भाग लें"
        ]
      },
      mild: {
        en: [
          "Monitor your mood and symptoms",
          "Practice self-care and relaxation techniques",
          "Maintain social connections",
          "Consider lifestyle changes like regular exercise"
        ]
      },
      moderate: {
        en: [
          "Consider speaking with a mental health professional",
          "Explore counselling or therapy options",
          "Practice daily mood tracking",
          "Build a support network"
        ]
      },
      'moderate-severe': {
        en: [
          "Seek professional mental health support",
          "Consider therapy or counselling",
          "Reach out to trusted friends or family",
          "Explore treatment options with a healthcare provider"
        ]
      },
      severe: {
        en: [
          "Seek immediate professional help",
          "Contact a mental health crisis line if needed",
          "Don't hesitate to reach out for support",
          "Consider speaking with your healthcare provider about treatment options"
        ]
      }
    },
    GAD7: {
      minimal: {
        en: [
          "Continue current stress management practices",
          "Maintain healthy lifestyle habits",
          "Stay socially connected",
          "Practice mindfulness or relaxation when stressed"
        ]
      },
      mild: {
        en: [
          "Learn and practice anxiety management techniques",
          "Try deep breathing and relaxation exercises",
          "Monitor anxiety triggers",
          "Maintain regular sleep and exercise routines"
        ]
      },
      moderate: {
        en: [
          "Consider learning cognitive-behavioral techniques",
          "Speak with a counsellor about anxiety management",
          "Practice regular relaxation exercises",
          "Consider joining a support group"
        ]
      },
      severe: {
        en: [
          "Seek professional help for anxiety management",
          "Consider therapy or counselling",
          "Learn about anxiety disorders and treatment options",
          "Build a strong support network"
        ]
      }
    }
  };
  
  const typeRecommendations = recommendations[type] || recommendations.PHQ9;
  const severityRecommendations = typeRecommendations[severityBand] || typeRecommendations.minimal;
  
  return severityRecommendations[language] || severityRecommendations.en || [];
};

module.exports = {
  scorePHQ9,
  scoreGAD7,
  getPHQ9Interpretation,
  getGAD7Interpretation,
  getRecommendations
};