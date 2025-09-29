// Main application initialization

class App {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      // Wait for i18n to initialize
      await this.waitForI18n();
      
      // Initialize components
      this.initializeEventListeners();
      this.initializeTheme();
      this.initializeAuth();
      this.initializeRouter();
      this.initializeCrisisHelpers();
      
      // Check authentication status
      await this.checkAuthStatus();
      
      // Initialize current page
      this.handleRouteChange();
      
      this.isInitialized = true;
      
      // Dispatch app ready event
      window.dispatchEvent(new CustomEvent('appReady'));
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      UI.showToast('Failed to initialize application', 'error');
    }
  }

  async waitForI18n() {
    return new Promise((resolve) => {
      if (window.i18n && window.i18n.currentLanguage) {
        resolve();
      } else {
        const checkI18n = () => {
          if (window.i18n && window.i18n.currentLanguage) {
            resolve();
          } else {
            setTimeout(checkI18n, 10);
          }
        };
        checkI18n();
      }
    });
  }

  initializeEventListeners() {
    // Language selector
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value);
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }

    // Auth buttons
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        Auth.showLoginModal();
      });
    }

    if (registerBtn) {
      registerBtn.addEventListener('click', () => {
        Auth.showRegisterModal();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
      });
    }

    // Profile menu
    const profileMenuBtn = document.getElementById('profile-menu-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileMenuBtn && profileDropdown) {
      profileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = profileMenuBtn.getAttribute('aria-expanded') === 'true';
        profileMenuBtn.setAttribute('aria-expanded', !isExpanded);
        profileDropdown.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        profileMenuBtn.setAttribute('aria-expanded', 'false');
        profileDropdown.classList.add('hidden');
      });
    }

    // Hero action buttons
    const startChatBtn = document.getElementById('start-chat-btn');
    const takeScreeningBtn = document.getElementById('take-screening-btn');

    if (startChatBtn) {
      startChatBtn.addEventListener('click', () => {
        Router.navigate('/chat');
      });
    }

    if (takeScreeningBtn) {
      takeScreeningBtn.addEventListener('click', () => {
        Router.navigate('/screenings');
      });
    }

    // Get help button
    const getHelpBtn = document.getElementById('get-help-btn');
    if (getHelpBtn) {
      getHelpBtn.addEventListener('click', () => {
        this.showCrisisResources();
      });
    }

    // Crisis banner close
    const closeCrisisBanner = document.getElementById('close-crisis-banner');
    if (closeCrisisBanner) {
      closeCrisisBanner.addEventListener('click', () => {
        this.hideCrisisBanner();
      });
    }

    // Crisis resources button
    const crisisResourcesBtn = document.getElementById('crisis-resources-btn');
    if (crisisResourcesBtn) {
      crisisResourcesBtn.addEventListener('click', () => {
        this.showCrisisResources();
      });
    }

    // Modal close events
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          UI.hideModal();
        }
      });
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => {
        UI.hideModal();
      });
    }

    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.hideModal();
      }
    });

    // Window events
    window.addEventListener('popstate', () => {
      this.handleRouteChange();
    });

    window.addEventListener('online', () => {
      UI.showToast('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      UI.showToast('Connection lost. Some features may not work.', 'warning');
    });
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
  }

  initializeAuth() {
    // Listen for auth state changes
    window.addEventListener('authStateChanged', (e) => {
      this.currentUser = e.detail.user;
      this.updateAuthUI();
    });
  }

  initializeRouter() {
    // Initialize router
    if (typeof Router !== 'undefined') {
      Router.init();
    }
  }

  initializeCrisisHelpers() {
    // Check if crisis banner should be shown
    const showCrisisBanner = sessionStorage.getItem('showCrisisBanner');
    if (showCrisisBanner === 'true') {
      this.showCrisisBanner();
    }
  }

  async checkAuthStatus() {
    try {
      const response = await api.getMe();
      if (response.success && response.user) {
        this.currentUser = response.user;
        // Set language preference
        if (response.user.preferredLanguage) {
          await i18n.setLanguage(response.user.preferredLanguage);
        }
      }
    } catch (error) {
      // User not authenticated, which is fine
      this.currentUser = null;
    }
    
    this.updateAuthUI();
  }

  updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (this.currentUser) {
      // User is authenticated
      if (authButtons) authButtons.classList.add('hidden');
      if (userProfile) userProfile.classList.remove('hidden');
      if (userName) userName.textContent = this.currentUser.name || this.currentUser.email;
    } else {
      // User is not authenticated
      if (authButtons) authButtons.classList.remove('hidden');
      if (userProfile) userProfile.classList.add('hidden');
    }
  }

  toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    const lightTheme = document.getElementById('theme-light');
    const darkTheme = document.getElementById('theme-dark');
    const themeToggle = document.getElementById('theme-toggle');
    const lightIcon = themeToggle?.querySelector('.light-icon');
    const darkIcon = themeToggle?.querySelector('.dark-icon');

    if (theme === 'dark') {
      if (lightTheme) lightTheme.disabled = true;
      if (darkTheme) darkTheme.disabled = false;
      if (lightIcon) lightIcon.classList.add('hidden');
      if (darkIcon) darkIcon.classList.remove('hidden');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      if (lightTheme) lightTheme.disabled = false;
      if (darkTheme) darkTheme.disabled = true;
      if (lightIcon) lightIcon.classList.remove('hidden');
      if (darkIcon) darkIcon.classList.add('hidden');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    localStorage.setItem('theme', theme);
  }

  toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    
    if (navMenu && mobileMenuToggle) {
      const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
      mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('mobile-open');
    }
  }

  showCrisisBanner() {
    const crisisBanner = document.getElementById('crisis-banner');
    if (crisisBanner) {
      crisisBanner.classList.remove('hidden');
      sessionStorage.setItem('showCrisisBanner', 'true');
    }
  }

  hideCrisisBanner() {
    const crisisBanner = document.getElementById('crisis-banner');
    if (crisisBanner) {
      crisisBanner.classList.add('hidden');
      sessionStorage.removeItem('showCrisisBanner');
    }
  }

  async showCrisisResources() {
    try {
      const response = await api.getHelplines();
      const helplines = response.helplines || [];
      
      const modalContent = `
        <div class="crisis-resources">
          <div class="alert alert-error mb-6">
            <h4 class="font-semibold mb-2">${t('crisis_immediate_help')}</h4>
            <p>${t('crisis_emergency_text')}</p>
            <div class="mt-4">
              <a href="tel:911" class="btn btn-danger mr-3">📞 911 (Emergency)</a>
              <a href="tel:988" class="btn btn-warning">📞 988 (Crisis Lifeline)</a>
            </div>
          </div>
          
          <h4 class="text-lg font-semibold mb-4">${t('crisis_helplines_title')}</h4>
          <div class="space-y-3">
            ${helplines.map(helpline => `
              <div class="bg-gray-50 p-4 rounded-lg border">
                <h5 class="font-medium">${helpline.title}</h5>
                <p class="text-gray-600 text-sm mb-2">
                  ${helpline.campusOnly ? t('crisis_campus_only') : t('crisis_general_access')}
                </p>
                <a href="tel:${helpline.phone}" class="btn btn-sm btn-primary">
                  📞 ${helpline.phone}
                </a>
              </div>
            `).join('')}
          </div>
          
          <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 class="font-medium text-blue-900 mb-2">${t('crisis_online_resources_title')}</h5>
            <ul class="text-sm text-blue-800 space-y-1">
              <li>• ${t('crisis_online_chat')}</li>
              <li>• ${t('crisis_text_support')}</li>
              <li>• ${t('crisis_safety_planning')}</li>
            </ul>
          </div>
        </div>
      `;
      
      UI.showModal(t('crisis_resources_title'), modalContent, [
        {
          text: t('close'),
          class: 'btn-secondary',
          onclick: () => UI.hideModal()
        }
      ]);
    } catch (error) {
      console.error('Failed to load crisis resources:', error);
      UI.showToast(t('error_loading_resources'), 'error');
    }
  }

  handleRouteChange() {
    const path = window.location.pathname;
    const page = path.split('/')[1] || 'home';
    
    this.currentPage = page;
    this.updateActiveNavLink();
    
    // Update page title
    this.updatePageTitle(page);
  }

  updateActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === window.location.pathname || 
          (href === '/' && window.location.pathname === '/')) {
        link.classList.add('active');
      }
    });
  }

  updatePageTitle(page) {
    const titles = {
      home: t('site_title'),
      chat: t('nav_chat'),
      screenings: t('nav_screenings'),
      booking: t('nav_booking'),
      resources: t('nav_resources'),
      'peer-support': t('nav_peer_support'),
      admin: t('admin_title')
    };
    
    const title = titles[page] || t('site_title');
    document.title = `${title} - ${t('site_title')}`;
  }

  // Utility methods
  showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  async ensureAnonymousId() {
    if (!document.cookie.includes('anonymousId')) {
      try {
        await api.createAnonymousSession();
      } catch (error) {
        console.warn('Failed to create anonymous session:', error);
      }
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'ADMIN';
  }

  isModerator() {
    return this.currentUser && ['MODERATOR', 'ADMIN'].includes(this.currentUser.role);
  }

  isCounsellor() {
    return this.currentUser && ['COUNSELLOR', 'MODERATOR', 'ADMIN'].includes(this.currentUser.role);
  }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
  });
} else {
  window.app = new App();
}

// Handle uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  if (window.UI) {
    UI.showToast('An unexpected error occurred', 'error');
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (window.UI) {
    UI.showToast('An unexpected error occurred', 'error');
  }
});