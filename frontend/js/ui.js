// UI utility functions and components

class UI {
  static showModal(title, content, buttons = []) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    if (!modalOverlay) return;

    // Set modal content
    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    // Clear and set footer buttons
    modalFooter.innerHTML = '';
    buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.textContent = button.text;
      btn.className = `btn ${button.class || 'btn-primary'}`;
      if (button.onclick) {
        btn.addEventListener('click', button.onclick);
      }
      modalFooter.appendChild(btn);
    });

    // Show modal
    modalOverlay.classList.remove('hidden');
    modalOverlay.setAttribute('aria-hidden', 'false');
    
    // Focus management
    setTimeout(() => {
      modalOverlay.classList.add('show');
      const firstButton = modalFooter.querySelector('button');
      if (firstButton) firstButton.focus();
    }, 10);
  }

  static hideModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;

    modalOverlay.classList.remove('show');
    modalOverlay.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
      modalOverlay.classList.add('hidden');
    }, 250);
  }

  static showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;

    // Add event listeners
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    // Add to container
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }
  }

  static removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }

  static showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    if (loading) {
      const text = loading.querySelector('p');
      if (text) text.textContent = message;
      loading.classList.remove('hidden');
    }
  }

  static hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  static createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    if (options.onclick) {
      element.addEventListener('click', options.onclick);
    }
    
    return element;
  }

  static formatDate(date, options = {}) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString(i18n.getCurrentLanguage() === 'hi' ? 'hi-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  }

  static formatTime(date, options = {}) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString(i18n.getCurrentLanguage() === 'hi' ? 'hi-IN' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      ...options
    });
  }

  static formatRelativeTime(date) {
    if (!date) return '';
    return i18n.formatRelativeTime(new Date(date));
  }

  static sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  static debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static scrollToTop(smooth = true) {
    if (smooth) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }

  static copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve();
    }
  }

  static isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  static observeIntersection(elements, callback, options = {}) {
    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '0px',
      ...options
    });

    elements.forEach(el => observer.observe(el));
    return observer;
  }

  static animateNumber(element, start, end, duration = 1000) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      element.textContent = current;
      
      if (current === end) {
        clearInterval(timer);
      }
    }, stepTime);
  }
}

// Make UI available globally
window.UI = UI;