// Client-side routing

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.init();
  }

  static init() {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  constructor() {
    if (Router.instance) {
      return Router.instance;
    }
    
    this.routes = new Map();
    this.currentRoute = null;
    this.setupRoutes();
    this.setupEventListeners();
    Router.instance = this;
  }

  setupRoutes() {
    // Define all routes
    this.routes.set('/', () => this.showHomePage());
    this.routes.set('/chat', () => this.showChatPage());
    this.routes.set('/screenings', () => this.showScreeningsPage());
    this.routes.set('/booking', () => this.showBookingPage());
    this.routes.set('/resources', () => this.showResourcesPage());
    this.routes.set('/peer-support', () => this.showPeerSupportPage());
    this.routes.set('/profile', () => this.showProfilePage());
    this.routes.set('/history', () => this.showHistoryPage());
    this.routes.set('/admin', () => this.showAdminPage());
    this.routes.set('/crisis-resources', () => this.showCrisisResourcesPage());
    
    // Handle initial route
    this.handleRoute();
  }

  setupEventListeners() {
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    // Handle navigation clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link && !link.hasAttribute('target')) {
        e.preventDefault();
        const href = link.getAttribute('href');
        this.navigate(href);
      }
    });
  }

  handleRoute() {
    const path = window.location.pathname;
    const route = this.routes.get(path) || this.routes.get('/');
    
    if (route) {
      this.currentRoute = path;
      route();
      this.updateActiveNavLinks();
    }
  }

  updateActiveNavLinks() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === this.currentRoute || (href === '/' && this.currentRoute === '/')) {
        link.classList.add('active');
      }
    });
  }

  static navigate(path, pushState = true) {
    if (pushState) {
      window.history.pushState(null, '', path);
    }
    Router.instance.handleRoute();
  }

  showHomePage() {
    this.showPage('home-page');
    document.title = `${t('site_title')} - ${t('nav_home')}`;
  }

  showChatPage() {
    this.showPage('chat-page');
    document.title = `${t('nav_chat')} - ${t('site_title')}`;
    
    // Initialize chat if not already done
    if (typeof Chat !== 'undefined') {
      Chat.init();
    }
  }

  showScreeningsPage() {
    this.showPage('screenings-page');
    document.title = `${t('nav_screenings')} - ${t('site_title')}`;
    
    // Initialize screenings if not already done
    if (typeof Screenings !== 'undefined') {
      Screenings.init();
    }
  }

  showBookingPage() {
    this.showPage('booking-page');
    document.title = `${t('nav_booking')} - ${t('site_title')}`;
    
    // Initialize booking if not already done
    if (typeof Booking !== 'undefined') {
      Booking.init();
    }
  }

  showResourcesPage() {
    this.showPage('resources-page');
    document.title = `${t('nav_resources')} - ${t('site_title')}`;
    
    // Initialize resources if not already done
    if (typeof Resources !== 'undefined') {
      Resources.init();
    }
  }

  showPeerSupportPage() {
    this.showPage('peer-support-page');
    document.title = `${t('nav_peer_support')} - ${t('site_title')}`;
    
    // Initialize peer support if not already done
    if (typeof PeerSupport !== 'undefined') {
      PeerSupport.init();
    }
  }

  showProfilePage() {
    if (!Auth.isLoggedIn()) {
      Auth.requireAuth(() => this.showProfilePage());
      return;
    }
    
    this.showPage('profile-page');
    document.title = `${t('profile')} - ${t('site_title')}`;
    
    // Initialize profile if not already done
    if (typeof Profile !== 'undefined') {
      Profile.init();
    }
  }

  showHistoryPage() {
    if (!Auth.isLoggedIn()) {
      Auth.requireAuth(() => this.showHistoryPage());
      return;
    }
    
    this.showPage('history-page');
    document.title = `${t('history')} - ${t('site_title')}`;
    
    // Initialize history if not already done
    if (typeof History !== 'undefined') {
      History.init();
    }
  }

  showAdminPage() {
    // Check admin access
    if (!Auth.isLoggedIn()) {
      UI.showToast(t('error_login_required') || 'Please log in to access admin panel', 'error');
      Auth.showLoginModal();
      return;
    }
    
    if (!Auth.hasRole('ADMIN')) {
      UI.showToast(t('error_admin_required') || 'Admin access required', 'error');
      this.navigate('/');
      return;
    }
    
    this.showPage('admin-page');
    document.title = `${t('admin_title')} - ${t('site_title')}`;
    
    // Initialize admin if not already done
    if (typeof Admin !== 'undefined') {
      Admin.init();
    }
  }

  showCrisisResourcesPage() {
    this.showPage('crisis-resources-page');
    document.title = `${t('crisis_resources')} - ${t('site_title')}`;
    
    // Show crisis resources in modal instead
    if (typeof app !== 'undefined') {
      app.showCrisisResources();
    }
  }

  showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      if (page.id !== pageId) {
        page.classList.add('hidden');
      }
    });

    // Show target page
    let targetPage = document.getElementById(pageId);
    
    if (!targetPage) {
      // Create page if it doesn't exist
      targetPage = this.createPage(pageId);
    }
    
    if (targetPage) {
      targetPage.classList.remove('hidden');
    }

    // Scroll to top
    UI.scrollToTop();
  }

  createPage(pageId) {
    const dynamicContent = document.getElementById('dynamic-content');
    if (!dynamicContent) return null;

    const page = document.createElement('section');
    page.id = pageId;
    page.className = 'page';

    // Add page-specific content based on pageId
    switch (pageId) {
      case 'chat-page':
        page.innerHTML = this.getChatPageContent();
        break;
      case 'screenings-page':
        page.innerHTML = this.getScreeningsPageContent();
        break;
      case 'booking-page':
        page.innerHTML = this.getBookingPageContent();
        break;
      case 'resources-page':
        page.innerHTML = this.getResourcesPageContent();
        break;
      case 'peer-support-page':
        page.innerHTML = this.getPeerSupportPageContent();
        break;
      case 'admin-page':
        page.innerHTML = this.getAdminPageContent();
        break;
      default:
        page.innerHTML = '<div class="text-center"><h2>Page Not Found</h2><p>The requested page could not be found.</p></div>';
    }

    dynamicContent.appendChild(page);
    return page;
  }

  getChatPageContent() {
    return `
      <div class="page-header text-center mb-8">
        <h2 class="text-3xl font-bold mb-4" data-i18n="chat_title">Mental Health First-Aid Chat</h2>
        <p class="text-lg text-secondary" data-i18n="chat_description">Get immediate support and guidance for mental health concerns.</p>
        <div class="alert alert-info mt-4" data-i18n="chat_disclaimer">This chat provides general support and is not a substitute for professional medical advice.</div>
      </div>
      
      <div id="chat-container" class="chat-container">
        <div class="chat-header">
          <h3>First-Aid Support Chat</h3>
          <div class="chat-status">Online</div>
        </div>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-input-container">
          <form id="chat-form" class="chat-input-form">
            <textarea id="chat-input" class="chat-input" 
                      placeholder="Type your message here..." 
                      rows="1" maxlength="1000"></textarea>
            <button type="submit" class="btn btn-primary chat-send-btn">
              Send
            </button>
          </form>
        </div>
      </div>
    `;
  }

  getScreeningsPageContent() {
    return `
      <div class="page-header text-center mb-8">
        <h2 class="text-3xl font-bold mb-4" data-i18n="nav_screenings">Mental Health Screenings</h2>
        <p class="text-lg text-secondary">Take validated assessments to better understand your mental health.</p>
      </div>
      
      <div class="screening-options">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="card cursor-pointer" data-screening="phq9">
            <div class="card-body">
              <h3 class="text-xl font-semibold mb-3">PHQ-9 Depression Screening</h3>
              <p class="text-secondary mb-4">Assess symptoms of depression over the past 2 weeks.</p>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted">9 questions • 2-3 minutes</span>
                <button class="btn btn-primary">Start Assessment</button>
              </div>
            </div>
          </div>
          
          <div class="card cursor-pointer" data-screening="gad7">
            <div class="card-body">
              <h3 class="text-xl font-semibold mb-3">GAD-7 Anxiety Screening</h3>
              <p class="text-secondary mb-4">Evaluate anxiety symptoms and their impact.</p>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted">7 questions • 1-2 minutes</span>
                <button class="btn btn-primary">Start Assessment</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div id="screening-content"></div>
    `;
  }

  getBookingPageContent() {
    return `
      <div class="page-header text-center mb-8">
        <h2 class="text-3xl font-bold mb-4" data-i18n="booking_title">Book a Counselling Session</h2>
        <p class="text-lg text-secondary" data-i18n="booking_description">Schedule a confidential session with one of our qualified counsellors.</p>
      </div>
      
      <div id="booking-content">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading counsellors...</p>
        </div>
      </div>
    `;
  }

  getResourcesPageContent() {
    return `
      <div class="page-header text-center mb-8">
        <h2 class="text-3xl font-bold mb-4" data-i18n="resources_title">Mental Health Resources</h2>
        <p class="text-lg text-secondary" data-i18n="resources_description">Access educational materials, guides, and tools for mental health support.</p>
      </div>
      
      <div class="resource-filters mb-6">
        <div class="flex flex-wrap gap-4 justify-center">
          <button class="btn btn-outline filter-btn active" data-filter="all">All Resources</button>
          <button class="btn btn-outline filter-btn" data-filter="VIDEO">Videos</button>
          <button class="btn btn-outline filter-btn" data-filter="AUDIO">Audio</button>
          <button class="btn btn-outline filter-btn" data-filter="GUIDE">Guides</button>
        </div>
        
        <div class="mt-4">
          <input type="text" id="resource-search" class="form-input" 
                 placeholder="Search resources...">
        </div>
      </div>
      
      <div id="resources-content">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading resources...</p>
        </div>
      </div>
    `;
  }

  getPeerSupportPageContent() {
    return `
      <div class="page-header text-center mb-8">
        <h2 class="text-3xl font-bold mb-4" data-i18n="peer_title">Peer Support Community</h2>
        <p class="text-lg text-secondary" data-i18n="peer_description">Connect with others who understand your experiences in a safe, moderated environment.</p>
      </div>
      
      <div class="peer-actions mb-6">
        <button id="create-post-btn" class="btn btn-primary" data-i18n="peer_create_post">Create Post</button>
      </div>
      
      <div id="peer-content">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading community posts...</p>
        </div>
      </div>
    `;
  }

  getAdminPageContent() {
    return `
      <div class="page-header mb-8">
        <h2 class="text-3xl font-bold mb-4" data-i18n="admin_title">Administration Panel</h2>
        <div class="alert alert-warning">
          ⚠️ Admin access only. All actions are logged and monitored.
        </div>
      </div>
      
      <div class="admin-nav mb-8">
        <div class="flex flex-wrap gap-4">
          <button class="btn btn-outline admin-nav-btn active" data-section="analytics">Analytics</button>
          <button class="btn btn-outline admin-nav-btn" data-section="moderation">Content Moderation</button>
          <button class="btn btn-outline admin-nav-btn" data-section="counsellors">Counsellors</button>
          <button class="btn btn-outline admin-nav-btn" data-section="settings">Settings</button>
        </div>
      </div>
      
      <div id="admin-content">
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    `;
  }

  showPage(pageId) {
    // Hide home page
    const homePage = document.getElementById('home-page');
    if (homePage) {
      homePage.classList.add('hidden');
    }

    // Hide all dynamic pages
    const dynamicContent = document.getElementById('dynamic-content');
    if (dynamicContent) {
      const pages = dynamicContent.querySelectorAll('.page');
      pages.forEach(page => page.classList.add('hidden'));
    }

    // Show target page
    if (pageId === 'home-page') {
      if (homePage) {
        homePage.classList.remove('hidden');
      }
    } else {
      let targetPage = document.getElementById(pageId);
      
      if (!targetPage && dynamicContent) {
        targetPage = this.createPage(pageId);
      }
      
      if (targetPage) {
        targetPage.classList.remove('hidden');
      }
    }

    // Update translations for new content
    if (typeof i18n !== 'undefined') {
      i18n.updatePageTranslations();
    }

    // Scroll to top
    UI.scrollToTop();
  }

  static getCurrentRoute() {
    return Router.instance?.currentRoute || window.location.pathname;
  }

  static redirect(path) {
    window.location.href = path;
  }

  static reload() {
    window.location.reload();
  }
}

// Initialize router
Router.init();
window.Router = Router;
