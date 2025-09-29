// API client with CSRF protection and error handling

class API {
  constructor() {
    this.baseURL = '/api/v1';
    this.csrfToken = null;
    this.init();
  }

  async init() {
    // Get CSRF token
    await this.getCSRFToken();
  }

  async getCSRFToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/csrf-token`);
      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrfToken;
      }
    } catch (error) {
      console.warn('Failed to get CSRF token:', error);
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method) && {
          'X-CSRF-Token': this.csrfToken
        })
      }
    };

    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error || 'Request failed', response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 0, error);
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async refreshToken() {
    return this.request('/auth/refresh', { method: 'POST' });
  }

  // Chat endpoints
  async createChatSession(data = {}) {
    return this.request('/chat/session', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async sendChatMessage(sessionId, text) {
    return this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, text })
    });
  }

  async getChatSession(sessionId) {
    return this.request(`/chat/session/${sessionId}`);
  }

  async updateChatConsent(sessionId, consentToSave) {
    return this.request(`/chat/session/${sessionId}/consent`, {
      method: 'PATCH',
      body: JSON.stringify({ consentToSave })
    });
  }

  // Screening endpoints
  async submitScreening(type, answers, consent = true) {
    return this.request(`/screenings/${type.toLowerCase()}`, {
      method: 'POST',
      body: JSON.stringify({ answers, consent })
    });
  }

  async getScreeningQuestions(type, language = 'en') {
    return this.request(`/screenings/questions/${type.toLowerCase()}?lang=${language}`);
  }

  async getMyScreenings(page = 1, type = null) {
    const params = new URLSearchParams({ page: page.toString() });
    if (type) params.append('type', type);
    return this.request(`/screenings/my?${params}`);
  }

  // Booking endpoints
  async getCounsellors() {
    return this.request('/counsellors');
  }

  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async getMyBookings(page = 1, status = null) {
    const params = new URLSearchParams({ page: page.toString() });
    if (status) params.append('status', status);
    return this.request(`/bookings/my?${params}`);
  }

  async updateBooking(bookingId, updates) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Resource endpoints
  async getResources(page = 1, filters = {}) {
    const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return this.request(`/resources?${params}`);
  }

  async getResource(resourceId) {
    return this.request(`/resources/${resourceId}`);
  }

  async engageWithResource(resourceId, type) {
    return this.request(`/resources/${resourceId}/engage`, {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  }

  // Peer support endpoints
  async getPeerPosts(page = 1, filters = {}) {
    const params = new URLSearchParams({ page: page.toString() });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return this.request(`/peer/posts?${params}`);
  }

  async createPeerPost(postData) {
    return this.request('/peer/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async getPeerPost(postId) {
    return this.request(`/peer/posts/${postId}`);
  }

  async addPeerComment(postId, content) {
    return this.request(`/peer/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  // Public endpoints
  async getHelplines() {
    return this.request('/helplines');
  }

  async getSystemInfo() {
    return this.request('/system-info');
  }

  async createAnonymousSession() {
    return this.request('/anonymous-session', { method: 'POST' });
  }
}

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Global API instance
const api = new API();
window.api = api;
window.APIError = APIError;