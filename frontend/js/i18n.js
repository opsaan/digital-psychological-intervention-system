// Internationalization (i18n) system

class I18n {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.fallbackLanguage = 'en';
    this.init();
  }

  async init() {
    // Load language from localStorage or detect from browser
    this.currentLanguage = localStorage.getItem('preferredLanguage') || 
                          navigator.language.split('-')[0] || 'en';
    
    // Ensure we support the language
    if (!['en', 'hi'].includes(this.currentLanguage)) {
      this.currentLanguage = 'en';
    }

    // Load translations
    await this.loadTranslations();
    
    // Set initial language in UI
    this.setLanguage(this.currentLanguage);
  }

  async loadTranslations() {
    // English translations
    this.translations.en = {
      // Navigation
      site_title: 'Mental Health Support',
      nav_home: 'Home',
      nav_chat: 'First-Aid Chat',
      nav_screenings: 'Screenings',
      nav_booking: 'Book Session',
      nav_resources: 'Resources',
      nav_peer_support: 'Peer Support',
      
      // Authentication
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      profile: 'Profile',
      history: 'My History',
      
      // Common
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      submit: 'Submit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      finish: 'Finish',
      
      // Hero section
      hero_title: 'Get the mental health support you need',
      hero_description: 'Access confidential mental health resources, take validated screenings, and connect with professional counsellors in a safe, supportive environment.',
      start_chat: 'Start First-Aid Chat',
      take_screening: 'Take Screening',
      
      // Features
      feature_chat_title: 'AI First-Aid Chat',
      feature_chat_desc: 'Get immediate support with our intelligent first-aid chat system.',
      feature_screening_title: 'Validated Screenings',
      feature_screening_desc: 'Take PHQ-9 and GAD-7 screenings to assess your mental health.',
      feature_counselling_title: 'Professional Counselling',
      feature_counselling_desc: 'Book confidential sessions with qualified counsellors.',
      feature_resources_title: 'Educational Resources',
      feature_resources_desc: 'Access guides, videos, and tools for mental health education.',
      feature_peer_title: 'Peer Support',
      feature_peer_desc: 'Connect with others in a moderated, supportive community.',
      feature_privacy_title: 'Privacy & Confidentiality',
      feature_privacy_desc: 'Your data is protected with the highest security standards.',
      
      // Crisis
      crisis_banner_text: 'If you are in immediate danger, please contact emergency services or a crisis helpline right away.',
      view_crisis_resources: 'View Crisis Resources',
      get_help_now: 'Get Help Now',
      
      // Footer
      footer_support_title: 'Support',
      footer_crisis_resources: 'Crisis Resources',
      footer_helplines: 'Helplines',
      footer_faq: 'FAQ',
      footer_about_title: 'About',
      footer_about: 'About Us',
      footer_privacy: 'Privacy Policy',
      footer_terms: 'Terms of Service',
      footer_contact_title: 'Contact',
      footer_email: 'Email Support',
      footer_feedback: 'Feedback',
      footer_disclaimer: 'This app does not provide medical diagnosis. If you are in immediate danger, seek emergency help.',
      
      // Chat
      chat_title: 'Mental Health First-Aid Chat',
      chat_description: 'Get immediate support and guidance for mental health concerns.',
      chat_disclaimer: 'This chat provides general support and is not a substitute for professional medical advice.',
      chat_consent_title: 'Save Conversation',
      chat_consent_description: 'Would you like to save this conversation for future reference?',
      chat_consent_yes: 'Yes, save conversation',
      chat_consent_no: 'No, keep anonymous',
      chat_input_placeholder: 'Type your message here...',
      chat_send: 'Send',
      
      // Screenings
      screening_phq9_title: 'PHQ-9 Depression Screening',
      screening_gad7_title: 'GAD-7 Anxiety Screening',
      screening_description: 'This screening helps assess your mental health symptoms.',
      screening_consent_title: 'Consent to Store Results',
      screening_consent_description: 'Your responses will be used to provide better support. You can opt out at any time.',
      screening_timeframe: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
      screening_option_0: 'Not at all',
      screening_option_1: 'Several days',
      screening_option_2: 'More than half the days',
      screening_option_3: 'Nearly every day',
      screening_results_title: 'Your Results',
      screening_recommendations_title: 'Recommendations',
      
      // Booking
      booking_title: 'Book a Counselling Session',
      booking_description: 'Schedule a confidential session with one of our qualified counsellors.',
      booking_counsellor: 'Select Counsellor',
      booking_date_time: 'Date & Time',
      booking_contact_preference: 'Contact Preference',
      booking_contact_email: 'Email',
      booking_contact_phone: 'Phone',
      booking_contact_in_app: 'In-app messaging',
      booking_anonymity: 'Anonymous Session',
      booking_anonymity_description: 'Your personal information will not be shared with the counsellor.',
      booking_notes: 'Additional Notes (Optional)',
      booking_submit: 'Book Session',
      booking_success: 'Session booked successfully!',
      
      // Resources
      resources_title: 'Mental Health Resources',
      resources_description: 'Access educational materials, guides, and tools for mental health support.',
      resources_filter_all: 'All Resources',
      resources_filter_video: 'Videos',
      resources_filter_audio: 'Audio',
      resources_filter_guide: 'Guides',
      resources_search_placeholder: 'Search resources...',
      
      // Peer Support
      peer_title: 'Peer Support Community',
      peer_description: 'Connect with others who understand your experiences in a safe, moderated environment.',
      peer_create_post: 'Create Post',
      peer_post_title: 'Share Your Thoughts',
      peer_post_content: 'What\'s on your mind?',
      peer_post_tags: 'Tags (optional)',
      peer_post_anonymous: 'Post Anonymously',
      peer_post_submit: 'Share Post',
      peer_like: 'Like',
      peer_comment: 'Comment',
      peer_report: 'Report',
      
      // Admin
      admin_title: 'Administration Panel',
      admin_analytics: 'Analytics',
      admin_users: 'Users',
      admin_content: 'Content Moderation',
      admin_settings: 'Settings',
      
      // Error messages
      error_network: 'Network error. Please check your connection.',
      error_server: 'Server error. Please try again later.',
      error_unauthorized: 'Please log in to access this feature.',
      error_forbidden: 'You don\'t have permission to access this.',
      error_not_found: 'The requested resource was not found.',
      error_validation: 'Please check your input and try again.',
      
      // Success messages
      success_saved: 'Changes saved successfully!',
      success_deleted: 'Item deleted successfully!',
      success_sent: 'Message sent successfully!',
      
      // Accessibility
      skip_to_main: 'Skip to main content'
    };

    // Hindi translations
    this.translations.hi = {
      // Navigation
      site_title: 'मानसिक स्वास्थ्य सहायता',
      nav_home: 'होम',
      nav_chat: 'प्राथमिक सहायता चैट',
      nav_screenings: 'स्क्रीनिंग',
      nav_booking: 'सत्र बुक करें',
      nav_resources: 'संसाधन',
      nav_peer_support: 'साथी सहायता',
      
      // Authentication
      login: 'लॉगिन',
      register: 'पंजीकरण',
      logout: 'लॉगआउट',
      profile: 'प्रोफाइल',
      history: 'मेरा इतिहास',
      
      // Common
      loading: 'लोड हो रहा है...',
      save: 'सेव करें',
      cancel: 'रद्द करें',
      delete: 'डिलीट करें',
      edit: 'संपादित करें',
      submit: 'जमा करें',
      close: 'बंद करें',
      back: 'वापस',
      next: 'अगला',
      previous: 'पिछला',
      finish: 'समाप्त',
      
      // Hero section
      hero_title: 'आपको जरूरी मानसिक स्वास्थ्य सहायता प्राप्त करें',
      hero_description: 'गोपनीय मानसिक स्वास्थ्य संसाधनों तक पहुंचें, मान्य स्क्रीनिंग लें, और एक सुरक्षित, सहायक वातावरण में पेशेवर काउंसलर से जुड़ें।',
      start_chat: 'प्राथमिक सहायता चैट शुरू करें',
      take_screening: 'स्क्रीनिंग लें',
      
      // Features
      feature_chat_title: 'AI प्राथमिक सहायता चैट',
      feature_chat_desc: 'हमारे बुद्धिमान प्राथमिक सहायता चैट सिस्टम के साथ तत्काल सहायता प्राप्त करें।',
      feature_screening_title: 'मान्य स्क्रीनिंग',
      feature_screening_desc: 'अपने मानसिक स्वास्थ्य का आकलन करने के लिए PHQ-9 और GAD-7 स्क्रीनिंग लें।',
      feature_counselling_title: 'पेशेवर काउंसलिंग',
      feature_counselling_desc: 'योग्य काउंसलर के साथ गोपनीय सत्र बुक करें।',
      feature_resources_title: 'शैक्षिक संसाधन',
      feature_resources_desc: 'मानसिक स्वास्थ्य शिक्षा के लिए गाइड, वीडियो और उपकरण तक पहुंचें।',
      feature_peer_title: 'साथी सहायता',
      feature_peer_desc: 'एक मॉडरेटेड, सहायक समुदाय में दूसरों से जुड़ें।',
      feature_privacy_title: 'गोपनीयता और गुप्तता',
      feature_privacy_desc: 'आपका डेटा उच्चतम सुरक्षा मानकों के साथ सुरक्षित है।',
      
      // Crisis
      crisis_banner_text: 'यदि आप तत्काल खतरे में हैं, तो कृपया तुरंत आपातकालीन सेवाओं या क्राइसिस हेल्पलाइन से संपर्क करें।',
      view_crisis_resources: 'क्राइसिस संसाधन देखें',
      get_help_now: 'अभी सहायता प्राप्त करें',
      
      // Chat
      chat_title: 'मानसिक स्वास्थ्य प्राथमिक सहायता चैट',
      chat_description: 'मानसिक स्वास्थ्य चिंताओं के लिए तत्काल सहायता और मार्गदर्शन प्राप्त करें।',
      chat_disclaimer: 'यह चैट सामान्य सहायता प्रदान करता है और पेशेवर चिकित्सा सलाह का विकल्प नहीं है।',
      chat_input_placeholder: 'यहाँ अपना संदेश टाइप करें...',
      chat_send: 'भेजें',
      
      // Error messages
      error_network: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
      error_server: 'सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।',
      error_unauthorized: 'कृपया इस सुविधा तक पहुंचने के लिए लॉगिन करें।',
      error_forbidden: 'आपको इसे एक्सेस करने की अनुमति नहीं है।',
      error_not_found: 'अनुरोधित संसाधन नहीं मिला।',
      error_validation: 'कृपया अपना इनपुट जांचें और पुनः प्रयास करें।',
      
      // Success messages
      success_saved: 'परिवर्तन सफलतापूर्वक सेव हो गए!',
      success_deleted: 'आइटम सफलतापूर्वक डिलीट हो गया!',
      success_sent: 'संदेश सफलतापूर्वक भेजा गया!',
      
      // Accessibility
      skip_to_main: 'मुख्य सामग्री पर जाएं'
    };
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key
   * @param {Object} variables - Variables to interpolate
   * @returns {string} Translated text
   */
  t(key, variables = {}) {
    const translation = this.translations[this.currentLanguage]?.[key] || 
                       this.translations[this.fallbackLanguage]?.[key] || 
                       key;
    
    // Simple variable interpolation
    return translation.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] || match;
    });
  }

  /**
   * Set current language
   * @param {string} language - Language code
   */
  async setLanguage(language) {
    if (!['en', 'hi'].includes(language)) {
      language = 'en';
    }

    this.currentLanguage = language;
    localStorage.setItem('preferredLanguage', language);
    
    // Update HTML lang attribute
    document.documentElement.lang = language;
    
    // Update language selector
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.value = language;
    }
    
    // Update all elements with data-i18n attribute
    this.updatePageTranslations();
    
    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language }
    }));
  }

  /**
   * Update all page translations
   */
  updatePageTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      // Update text content or placeholder based on element type
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.type === 'submit' || element.type === 'button') {
          element.value = translation;
        } else {
          element.placeholder = translation;
        }
      } else {
        element.textContent = translation;
      }
      
      // Update aria-label if present
      if (element.hasAttribute('aria-label')) {
        element.setAttribute('aria-label', translation);
      }
      
      // Update title if present
      if (element.hasAttribute('title')) {
        element.setAttribute('title', translation);
      }
    });
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   * @returns {Array} Array of language objects
   */
  getAvailableLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
    ];
  }

  /**
   * Check if language is RTL
   * @param {string} language - Language code
   * @returns {boolean} True if RTL
   */
  isRTL(language = this.currentLanguage) {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(language);
  }

  /**
   * Format number according to current locale
   * @param {number} number - Number to format
   * @param {Object} options - Intl.NumberFormat options
   * @returns {string} Formatted number
   */
  formatNumber(number, options = {}) {
    const locale = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
    return new Intl.NumberFormat(locale, options).format(number);
  }

  /**
   * Format date according to current locale
   * @param {Date} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  formatDate(date, options = {}) {
    const locale = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   * @param {Date} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    const locale = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    const now = new Date();
    const diffInSeconds = Math.floor((date - now) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (Math.abs(diffInDays) > 0) {
      return rtf.format(diffInDays, 'day');
    } else if (Math.abs(diffInHours) > 0) {
      return rtf.format(diffInHours, 'hour');
    } else if (Math.abs(diffInMinutes) > 0) {
      return rtf.format(diffInMinutes, 'minute');
    } else {
      return rtf.format(diffInSeconds, 'second');
    }
  }
}

// Create global i18n instance
const i18n = new I18n();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
} else {
  window.i18n = i18n;
}

// Global helper function
window.t = (key, variables) => i18n.t(key, variables);
