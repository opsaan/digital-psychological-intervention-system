// Authentication management

class Auth {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
  }

  static async checkAuthStatus() {
    try {
      const response = await api.getMe();
      if (response.success && response.user) {
        this.user = response.user;
        this.isAuthenticated = true;
        
        // Update language preference if set
        if (response.user.preferredLanguage) {
          await i18n.setLanguage(response.user.preferredLanguage);
        }
        
        this.dispatchAuthChange();
        return response.user;
      }
    } catch (error) {
      this.user = null;
      this.isAuthenticated = false;
      this.dispatchAuthChange();
    }
    return null;
  }

  static async login(email, password) {
    try {
      UI.showLoading('Signing in...');
      const response = await api.login(email, password);
      
      if (response.success) {
        this.user = response.user;
        this.isAuthenticated = true;
        
        // Update language if user has preference
        if (response.user.preferredLanguage) {
          await i18n.setLanguage(response.user.preferredLanguage);
        }
        
        this.dispatchAuthChange();
        UI.hideModal();
        UI.showToast(t('login_success') || 'Login successful!', 'success');
        
        // Redirect to appropriate page
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
          Router.navigate('/chat');
        }
        
        return response.user;
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = t('error_login') || 'Login failed';
      
      if (error.status === 401) {
        errorMessage = t('error_invalid_credentials') || 'Invalid email or password';
      } else if (error.status === 429) {
        errorMessage = t('error_too_many_attempts') || 'Too many login attempts. Please try again later.';
      }
      
      UI.showToast(errorMessage, 'error');
      throw error;
    } finally {
      UI.hideLoading();
    }
  }

  static async register(userData) {
    try {
      UI.showLoading('Creating account...');
      const response = await api.register(userData);
      
      if (response.success) {
        UI.hideModal();
        UI.showToast(t('register_success') || 'Account created successfully! Please log in.', 'success');
        
        // Show login modal after successful registration
        setTimeout(() => {
          this.showLoginModal();
        }, 1000);
        
        return response.user;
      }
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = t('error_registration') || 'Registration failed';
      
      if (error.status === 409) {
        errorMessage = t('error_email_exists') || 'An account with this email already exists';
      }
      
      UI.showToast(errorMessage, 'error');
      throw error;
    } finally {
      UI.hideLoading();
    }
  }

  static async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.user = null;
      this.isAuthenticated = false;
      this.dispatchAuthChange();
      
      UI.showToast(t('logout_success') || 'Logged out successfully', 'success');
      
      // Redirect to home page
      Router.navigate('/');
    }
  }

  static showLoginModal() {
    const modalContent = `
      <form id="login-form" class="space-y-4">
        <div class="form-group">
          <label for="login-email" class="form-label">${t('email')}</label>
          <input type="email" id="login-email" class="form-input" required 
                 placeholder="${t('email_placeholder') || 'Enter your email'}">
        </div>
        
        <div class="form-group">
          <label for="login-password" class="form-label">${t('password')}</label>
          <input type="password" id="login-password" class="form-input" required 
                 placeholder="${t('password_placeholder') || 'Enter your password'}">
        </div>
        
        <div class="form-group">
          <div class="form-check">
            <input type="checkbox" id="login-remember" class="form-check-input">
            <label for="login-remember" class="form-check-label">
              ${t('remember_me') || 'Remember me'}
            </label>
          </div>
        </div>
      </form>
    `;

    const buttons = [
      {
        text: t('cancel'),
        class: 'btn-secondary',
        onclick: () => UI.hideModal()
      },
      {
        text: t('login'),
        class: 'btn-primary',
        onclick: async () => {
          const email = document.getElementById('login-email').value;
          const password = document.getElementById('login-password').value;
          
          if (!email || !password) {
            UI.showToast(t('error_required_fields') || 'Please fill in all fields', 'error');
            return;
          }
          
          try {
            await this.login(email, password);
          } catch (error) {
            // Error already handled in login method
          }
        }
      }
    ];

    UI.showModal(t('login'), modalContent, buttons);

    // Focus on email field
    setTimeout(() => {
      const emailField = document.getElementById('login-email');
      if (emailField) emailField.focus();
    }, 100);
  }

  static showRegisterModal() {
    const modalContent = `
      <form id="register-form" class="space-y-4">
        <div class="form-group">
          <label for="register-name" class="form-label">${t('full_name')}</label>
          <input type="text" id="register-name" class="form-input" 
                 placeholder="${t('name_placeholder') || 'Enter your full name'}">
        </div>
        
        <div class="form-group">
          <label for="register-email" class="form-label">${t('email')}</label>
          <input type="email" id="register-email" class="form-input" required 
                 placeholder="${t('email_placeholder') || 'Enter your email'}">
        </div>
        
        <div class="form-group">
          <label for="register-password" class="form-label">${t('password')}</label>
          <input type="password" id="register-password" class="form-input" required 
                 placeholder="${t('password_placeholder') || 'Enter your password'}">
          <div class="form-help">
            ${t('password_requirements') || 'Minimum 8 characters required'}
          </div>
        </div>
        
        <div class="form-group">
          <label for="register-confirm-password" class="form-label">${t('confirm_password')}</label>
          <input type="password" id="register-confirm-password" class="form-input" required 
                 placeholder="${t('confirm_password_placeholder') || 'Confirm your password'}">
        </div>
        
        <div class="form-group">
          <label for="register-language" class="form-label">${t('preferred_language')}</label>
          <select id="register-language" class="form-select">
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        
        <div class="form-group">
          <div class="form-check">
            <input type="checkbox" id="register-terms" class="form-check-input" required>
            <label for="register-terms" class="form-check-label">
              ${t('accept_terms') || 'I agree to the Terms of Service and Privacy Policy'}
            </label>
          </div>
        </div>
      </form>
    `;

    const buttons = [
      {
        text: t('cancel'),
        class: 'btn-secondary',
        onclick: () => UI.hideModal()
      },
      {
        text: t('register'),
        class: 'btn-primary',
        onclick: async () => {
          const name = document.getElementById('register-name').value;
          const email = document.getElementById('register-email').value;
          const password = document.getElementById('register-password').value;
          const confirmPassword = document.getElementById('register-confirm-password').value;
          const preferredLanguage = document.getElementById('register-language').value;
          const acceptTerms = document.getElementById('register-terms').checked;
          
          // Validation
          if (!email || !password) {
            UI.showToast(t('error_required_fields') || 'Email and password are required', 'error');
            return;
          }
          
          if (password !== confirmPassword) {
            UI.showToast(t('error_password_mismatch') || 'Passwords do not match', 'error');
            return;
          }
          
          if (password.length < 8) {
            UI.showToast(t('error_password_length') || 'Password must be at least 8 characters', 'error');
            return;
          }
          
          if (!acceptTerms) {
            UI.showToast(t('error_accept_terms') || 'Please accept the terms and conditions', 'error');
            return;
          }
          
          try {
            await this.register({ name, email, password, preferredLanguage });
          } catch (error) {
            // Error already handled in register method
          }
        }
      }
    ];

    UI.showModal(t('register'), modalContent, buttons);

    // Focus on name field
    setTimeout(() => {
      const nameField = document.getElementById('register-name');
      if (nameField) nameField.focus();
    }, 100);
  }

  static dispatchAuthChange() {
    window.dispatchEvent(new CustomEvent('authStateChanged', {
      detail: { 
        user: this.user,
        isAuthenticated: this.isAuthenticated 
      }
    }));
  }

  static getCurrentUser() {
    return this.user;
  }

  static isLoggedIn() {
    return this.isAuthenticated;
  }

  static hasRole(role) {
    return this.user && this.user.role === role;
  }

  static hasAnyRole(roles) {
    return this.user && roles.includes(this.user.role);
  }

  static requireAuth(callback) {
    if (this.isAuthenticated) {
      return callback();
    } else {
      UI.showToast(t('error_login_required') || 'Please log in to access this feature', 'warning');
      this.showLoginModal();
    }
  }

  static requireRole(role, callback) {
    if (!this.isAuthenticated) {
      UI.showToast(t('error_login_required') || 'Please log in to access this feature', 'warning');
      this.showLoginModal();
      return;
    }
    
    if (!this.hasRole(role) && !this.hasAnyRole(['ADMIN'])) {
      UI.showToast(t('error_insufficient_permissions') || 'You do not have permission to access this feature', 'error');
      return;
    }
    
    return callback();
  }
}

// Initialize auth state check
document.addEventListener('DOMContentLoaded', () => {
  Auth.checkAuthStatus();
});

window.Auth = Auth;