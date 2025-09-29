// Chat interface implementation

class Chat {
  constructor() {
    this.currentSession = null;
    this.messages = [];
    this.isLoading = false;
  }

  static async init() {
    if (!Chat.instance) {
      Chat.instance = new Chat();
    }
    
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      await Chat.instance.initializeChat();
    }
    
    return Chat.instance;
  }

  async initializeChat() {
    try {
      // Ensure anonymous session if not logged in
      if (!Auth.isLoggedIn()) {
        await app.ensureAnonymousId();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Show consent modal for new sessions
      this.showConsentModal();
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      UI.showToast('Failed to start chat session', 'error');
    }
  }

  setupEventListeners() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
    
    if (chatInput) {
      // Auto-resize textarea
      chatInput.addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      });
      
      // Send on Enter (but allow Shift+Enter for newlines)
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  showConsentModal() {
    const modalContent = `
      <div class="consent-modal">
        <div class="mb-4">
          <h4 class="text-lg font-semibold mb-2" data-i18n="chat_consent_title">Save Conversation</h4>
          <p class="text-secondary" data-i18n="chat_consent_description">
            Would you like to save this conversation for future reference? 
            This helps us provide better support and allows you to review our discussion later.
          </p>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <h5 class="font-medium mb-2">Privacy Options:</h5>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• <strong>Save:</strong> Conversation stored securely, accessible in your history</li>
            <li>• <strong>Anonymous:</strong> No data stored, complete privacy</li>
            <li>• You can change this setting anytime during our conversation</li>
          </ul>
        </div>
      </div>
    `;

    const buttons = [
      {
        text: t('chat_consent_no') || 'Anonymous Session',
        class: 'btn-outline',
        onclick: () => {
          this.startSession(false);
          UI.hideModal();
        }
      },
      {
        text: t('chat_consent_yes') || 'Save Conversation',
        class: 'btn-primary',
        onclick: () => {
          this.startSession(true);
          UI.hideModal();
        }
      }
    ];

    UI.showModal(t('chat_consent_title') || 'Chat Privacy', modalContent, buttons);
  }

  async startSession(consentToSave = false) {
    try {
      UI.showLoading('Starting chat session...');
      
      const response = await api.createChatSession({ consentToSave });
      
      if (response.success) {
        this.currentSession = response.session;
        
        // Add welcome message
        if (response.welcomeMessage) {
          this.addMessage({
            id: 'welcome',
            sender: 'BOT',
            text: response.welcomeMessage.message,
            createdAt: new Date().toISOString(),
            quickReplies: response.welcomeMessage.quickReplies
          });
        }
      }
    } catch (error) {
      console.error('Failed to start chat session:', error);
      UI.showToast('Failed to start chat session', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  async sendMessage() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput || !this.currentSession) return;
    
    const text = chatInput.value.trim();
    if (!text) return;
    
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      
      // Clear input
      chatInput.value = '';
      chatInput.style.height = 'auto';
      
      // Add user message immediately
      const userMessage = {
        id: Date.now(),
        sender: 'USER',
        text,
        createdAt: new Date().toISOString()
      };
      this.addMessage(userMessage);
      
      // Send to server
      const response = await api.sendChatMessage(this.currentSession.id, text);
      
      if (response.success) {
        // Add bot response
        const botMessage = {
          id: response.botResponse.id,
          sender: 'BOT',
          text: response.botResponse.message,
          createdAt: response.botResponse.createdAt,
          quickReplies: response.botResponse.quickReplies,
          category: response.botResponse.category,
          severity: response.botResponse.severity
        };
        
        this.addMessage(botMessage);
        
        // Show crisis banner if needed
        if (response.botResponse.showCrisisBanner) {
          app.showCrisisBanner();
        }
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      UI.showToast('Failed to send message', 'error');
      
      // Add error message
      this.addMessage({
        id: Date.now(),
        sender: 'BOT',
        text: 'I apologize, but I\'m having trouble responding right now. Please try again or contact support if the problem persists.',
        createdAt: new Date().toISOString(),
        isError: true
      });
    } finally {
      this.isLoading = false;
    }
  }

  addMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    this.messages.push(message);
    
    const messageElement = this.createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Animate message appearance
    setTimeout(() => {
      messageElement.classList.add('message-appear');
    }, 10);
  }

  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.sender.toLowerCase()}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-message-avatar';
    avatar.textContent = message.sender === 'USER' ? 'U' : 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-message-content';
    
    const bubble = document.createElement('div');
    bubble.className = `chat-message-bubble ${message.isError ? 'error' : ''}`;
    bubble.textContent = message.text;
    
    const time = document.createElement('div');
    time.className = 'chat-message-time';
    time.textContent = UI.formatTime(message.createdAt);
    
    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);
    
    // Add quick replies for bot messages
    if (message.sender === 'BOT' && message.quickReplies && message.quickReplies.length > 0) {
      const quickRepliesDiv = document.createElement('div');
      quickRepliesDiv.className = 'chat-quick-replies';
      
      message.quickReplies.forEach(reply => {
        const replyBtn = document.createElement('button');
        replyBtn.className = 'chat-quick-reply';
        replyBtn.textContent = reply;
        replyBtn.addEventListener('click', () => {
          const chatInput = document.getElementById('chat-input');
          if (chatInput) {
            chatInput.value = reply;
            chatInput.focus();
          }
        });
        quickRepliesDiv.appendChild(replyBtn);
      });
      
      contentDiv.appendChild(quickRepliesDiv);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    return messageDiv;
  }

  async updateConsent(consentToSave) {
    if (!this.currentSession) return;
    
    try {
      await api.updateChatConsent(this.currentSession.id, consentToSave);
      this.currentSession.consentToSave = consentToSave;
      
      const message = consentToSave 
        ? 'Your conversation will now be saved for future reference.'
        : 'Your conversation will not be saved. This session is now anonymous.';
      
      UI.showToast(message, 'success');
    } catch (error) {
      console.error('Failed to update consent:', error);
      UI.showToast('Failed to update privacy settings', 'error');
    }
  }

  async endSession() {
    if (!this.currentSession) return;
    
    try {
      await api.endChatSession(this.currentSession.id);
      
      this.addMessage({
        id: Date.now(),
        sender: 'BOT',
        text: 'Thank you for using our first-aid chat service. Remember, help is always available if you need it. Take care!',
        createdAt: new Date().toISOString()
      });
      
      this.currentSession = null;
      
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  exportTranscript() {
    if (this.messages.length === 0) {
      UI.showToast('No messages to export', 'warning');
      return;
    }

    const transcript = this.messages.map(msg => {
      const time = UI.formatTime(msg.createdAt);
      const sender = msg.sender === 'USER' ? 'You' : 'Support Assistant';
      return `[${time}] ${sender}: ${msg.text}`;
    }).join('\n\n');

    const header = `Mental Health First-Aid Chat Transcript\nDate: ${UI.formatDate(new Date())}\n${'='.repeat(50)}\n\n`;
    const footer = `\n\n${'='.repeat(50)}\nDisclaimer: This conversation provides general support and is not a substitute for professional medical advice.\nIf you are in crisis, please contact emergency services immediately.`;
    
    const fullTranscript = header + transcript + footer;
    
    // Copy to clipboard
    UI.copyToClipboard(fullTranscript)
      .then(() => {
        UI.showToast('Transcript copied to clipboard', 'success');
      })
      .catch(() => {
        // Fallback: download as text file
        this.downloadTranscript(fullTranscript);
      });
  }

  downloadTranscript(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    UI.showToast('Transcript downloaded', 'success');
  }

  static getInstance() {
    return Chat.instance;
  }
}

window.Chat = Chat;