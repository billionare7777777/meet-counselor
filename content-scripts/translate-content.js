// Content script for Google Translate integration
class TranslateIntegration {
  constructor() {
    this.isActive = false;
    this.conversationHistory = [];
    this.extensionPanel = null;
    
    this.init();
  }

  init() {
    // Wait for Translate to load
    this.waitForTranslateLoad();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  waitForTranslateLoad() {
    const checkInterval = setInterval(() => {
      const sourceTextarea = document.querySelector('[data-ved] textarea, [jsname="BJE2fc"]');
      if (sourceTextarea) {
        clearInterval(checkInterval);
        this.setupTranslateIntegration();
      }
    }, 1000);
  }

  setupTranslateIntegration() {
    // Create extension panel
    this.createExtensionPanel();
    
    // Set up text input monitoring
    this.setupTextMonitoring();
    
    console.log('Translate integration active');
  }

  createExtensionPanel() {
    // Find the translate container
    const translateContainer = document.querySelector('[data-ved]') || 
                              document.querySelector('[jsname="V67aGc"]') ||
                              document.body;

    // Create extension panel
    this.extensionPanel = document.createElement('div');
    this.extensionPanel.id = 'meet-counselor-panel';
    this.extensionPanel.innerHTML = `
      <div class="counselor-header">
        <h3>Meet Counselor</h3>
        <div class="counselor-status" id="counselor-status">Inactive</div>
      </div>
      
      <div class="counselor-controls">
        <button id="settings-btn" class="counselor-btn">Settings</button>
        <button id="create-conversation-btn" class="counselor-btn">Create Conversation</button>
        <button id="create-question-btn" class="counselor-btn">Create Question</button>
      </div>
      
      <div class="counselor-conversation" id="conversation-display">
        <div class="conversation-history" id="conversation-history"></div>
        <div class="conversation-input">
          <textarea id="conversation-input" placeholder="Type your response here..."></textarea>
          <button id="send-response">Send</button>
        </div>
      </div>
      
      <div class="counselor-translation" id="translation-display">
        <div class="translation-text" id="translation-text"></div>
      </div>
    `;

    // Insert panel into translate page
    translateContainer.appendChild(this.extensionPanel);

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.openSettingsModal();
    });

    // Create Conversation button
    document.getElementById('create-conversation-btn').addEventListener('click', () => {
      this.openConversationModal();
    });

    // Create Question button
    document.getElementById('create-question-btn').addEventListener('click', () => {
      this.openQuestionModal();
    });

    // Send response button
    document.getElementById('send-response').addEventListener('click', () => {
      this.sendResponse();
    });

    // Enter key for sending response
    document.getElementById('conversation-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendResponse();
      }
    });
  }

  setupTextMonitoring() {
    // Monitor the source textarea for changes
    const sourceTextarea = document.querySelector('[data-ved] textarea, [jsname="BJE2fc"]');
    if (sourceTextarea) {
      let lastValue = '';
      
      const observer = new MutationObserver(() => {
        const currentValue = sourceTextarea.value;
        if (currentValue !== lastValue && currentValue.trim()) {
          this.handleTextInput(currentValue);
          lastValue = currentValue;
        }
      });

      observer.observe(sourceTextarea, { 
        attributes: true, 
        childList: true, 
        subtree: true 
      });

      // Also listen for input events
      sourceTextarea.addEventListener('input', (e) => {
        if (e.target.value !== lastValue && e.target.value.trim()) {
          this.handleTextInput(e.target.value);
          lastValue = e.target.value;
        }
      });
    }
  }

  handleTextInput(text) {
    // Add to conversation history
    this.conversationHistory.push({
      text: text,
      timestamp: Date.now(),
      speaker: 'other',
      type: 'input'
    });

    // Update conversation display
    this.updateConversationDisplay();

    // Send to background script for processing
    chrome.runtime.sendMessage({
      type: 'TEXT_RECEIVED',
      text: text,
      timestamp: Date.now()
    });
  }

  updateConversationDisplay() {
    const historyElement = document.getElementById('conversation-history');
    historyElement.innerHTML = '';

    this.conversationHistory.forEach((item, index) => {
      const messageElement = document.createElement('div');
      messageElement.className = `conversation-message ${item.speaker}`;
      messageElement.innerHTML = `
        <div class="message-content">${item.text}</div>
        <div class="message-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
      `;
      historyElement.appendChild(messageElement);
    });

    // Scroll to bottom
    historyElement.scrollTop = historyElement.scrollHeight;
  }

  sendResponse() {
    const inputElement = document.getElementById('conversation-input');
    const responseText = inputElement.value.trim();
    
    if (!responseText) return;

    // Add to conversation history
    this.conversationHistory.push({
      text: responseText,
      timestamp: Date.now(),
      speaker: 'me',
      type: 'response'
    });

    // Update conversation display
    this.updateConversationDisplay();

    // Clear input
    inputElement.value = '';

    // Send to background script
    chrome.runtime.sendMessage({
      type: 'RESPONSE_SENT',
      text: responseText,
      timestamp: Date.now()
    });
  }

  openSettingsModal() {
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'counselor-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="settings-tabs">
            <button class="tab-btn active" data-tab="my-info">My Information</button>
            <button class="tab-btn" data-tab="other-info">Other Party's Information</button>
            <button class="tab-btn" data-tab="history">Conversation History</button>
            <button class="tab-btn" data-tab="additional">Additional Settings</button>
            <button class="tab-btn" data-tab="prompt">Prompt</button>
          </div>
          
          <div class="settings-content">
            <div id="my-info" class="tab-content active">
              <h3>My Information</h3>
              <div class="form-group">
                <label>Name:</label>
                <input type="text" id="my-name" placeholder="Enter your name">
              </div>
              <div class="form-group">
                <label>Location:</label>
                <input type="text" id="my-location" placeholder="Enter your location">
              </div>
              <div class="form-group">
                <label>Age:</label>
                <input type="number" id="my-age" placeholder="Enter your age">
              </div>
              <div class="form-group">
                <label>Gender:</label>
                <select id="my-gender">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Profile:</label>
                <textarea id="my-profile" placeholder="Enter your profile information"></textarea>
              </div>
              <div class="form-group">
                <label>Experience:</label>
                <textarea id="my-experience" placeholder="Enter your experience"></textarea>
              </div>
            </div>
            
            <div id="other-info" class="tab-content">
              <h3>Other Party's Information</h3>
              <div class="form-group">
                <label>Name:</label>
                <input type="text" id="other-name" placeholder="Enter other party's name">
              </div>
              <div class="form-group">
                <label>Location:</label>
                <input type="text" id="other-location" placeholder="Enter other party's location">
              </div>
              <div class="form-group">
                <label>Gender:</label>
                <select id="other-gender">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div id="history" class="tab-content">
              <h3>Conversation History</h3>
              <div class="history-list" id="history-list"></div>
            </div>
            
            <div id="additional" class="tab-content">
              <h3>Additional Settings</h3>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="auto-translate"> Auto-translate conversations
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="save-history"> Save conversation history
                </label>
              </div>
              <div class="form-group">
                <label>Language:</label>
                <select id="target-language">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>
            
            <div id="prompt" class="tab-content">
              <h3>Prompt Settings</h3>
              <div class="form-group">
                <label>Custom Prompt:</label>
                <textarea id="custom-prompt" placeholder="Enter custom prompt for AI responses"></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-settings">Cancel</button>
          <button class="btn btn-primary" id="save-settings">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set up modal event listeners
    this.setupModalEventListeners(modal);
  }

  setupModalEventListeners(modal) {
    // Tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        // Update active tab
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        modal.querySelector(`#${tabId}`).classList.add('active');
      });
    });

    // Close modal
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#cancel-settings').addEventListener('click', () => {
      modal.remove();
    });

    // Save settings
    modal.querySelector('#save-settings').addEventListener('click', () => {
      this.saveSettings(modal);
      modal.remove();
    });
  }

  saveSettings(modal) {
    const settings = {
      myInfo: {
        name: modal.querySelector('#my-name').value,
        location: modal.querySelector('#my-location').value,
        age: modal.querySelector('#my-age').value,
        gender: modal.querySelector('#my-gender').value,
        profile: modal.querySelector('#my-profile').value,
        experience: modal.querySelector('#my-experience').value
      },
      otherInfo: {
        name: modal.querySelector('#other-name').value,
        location: modal.querySelector('#other-location').value,
        gender: modal.querySelector('#other-gender').value
      },
      additional: {
        autoTranslate: modal.querySelector('#auto-translate').checked,
        saveHistory: modal.querySelector('#save-history').checked,
        targetLanguage: modal.querySelector('#target-language').value
      },
      prompt: {
        customPrompt: modal.querySelector('#custom-prompt').value
      }
    };

    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: settings
    });
  }

  openConversationModal() {
    // Create conversation modal
    const modal = document.createElement('div');
    modal.className = 'counselor-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create Conversation</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="conversation-options">
            <button class="conversation-btn" id="create-answer">
              <h3>Create Answer</h3>
              <p>Generate responses to the other party's questions</p>
            </button>
            <button class="conversation-btn" id="create-chat">
              <h3>Create Chat</h3>
              <p>Generate private conversation topics unrelated to business</p>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set up event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#create-answer').addEventListener('click', () => {
      this.generateAnswer();
      modal.remove();
    });

    modal.querySelector('#create-chat').addEventListener('click', () => {
      this.generateChat();
      modal.remove();
    });
  }

  openQuestionModal() {
    // Create question modal
    const modal = document.createElement('div');
    modal.className = 'counselor-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create Question</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="question-options">
            <button class="question-btn" id="beginning-questions">
              <h3>Beginning Questions</h3>
              <p>Questions to ask at the start of a conversation</p>
            </button>
            <button class="question-btn" id="during-questions">
              <h3>During Conversation</h3>
              <p>Questions to ask during the conversation</p>
            </button>
            <button class="question-btn" id="ending-questions">
              <h3>Ending Questions</h3>
              <p>Questions to ask at the end of a conversation</p>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set up event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#beginning-questions').addEventListener('click', () => {
      this.generateQuestions('beginning');
      modal.remove();
    });

    modal.querySelector('#during-questions').addEventListener('click', () => {
      this.generateQuestions('during');
      modal.remove();
    });

    modal.querySelector('#ending-questions').addEventListener('click', () => {
      this.generateQuestions('ending');
      modal.remove();
    });
  }

  generateAnswer() {
    // Generate AI response based on conversation context
    chrome.runtime.sendMessage({
      type: 'GENERATE_RESPONSE',
      context: {
        type: 'answer',
        conversationHistory: this.conversationHistory,
        lastMessage: this.conversationHistory[this.conversationHistory.length - 1]
      }
    }, (response) => {
      if (response.response) {
        this.displayGeneratedContent(response.response, 'AI Generated Answer');
        // Auto-insert into translate input if available
        this.insertIntoTranslateInput(response.response);
      } else if (response.error) {
        this.showError('Failed to generate response: ' + response.error);
      }
    });
  }

  generateChat() {
    // Generate chat topic
    chrome.runtime.sendMessage({
      type: 'GENERATE_RESPONSE',
      context: {
        type: 'chat',
        conversationHistory: this.conversationHistory
      }
    }, (response) => {
      if (response.response) {
        this.displayGeneratedContent(response.response, 'AI Generated Chat Topic');
        // Auto-insert into translate input if available
        this.insertIntoTranslateInput(response.response);
      } else if (response.error) {
        this.showError('Failed to generate chat topic: ' + response.error);
      }
    });
  }

  generateQuestions(type) {
    // Generate questions based on type
    chrome.runtime.sendMessage({
      type: 'GENERATE_RESPONSE',
      context: {
        type: 'questions',
        questionType: type,
        conversationHistory: this.conversationHistory
      }
    }, (response) => {
      if (response.response) {
        this.displayGeneratedContent(response.response, `AI Generated ${type.charAt(0).toUpperCase() + type.slice(1)} Questions`);
        // Auto-insert into translate input if available
        this.insertIntoTranslateInput(response.response);
      } else if (response.error) {
        this.showError('Failed to generate questions: ' + response.error);
      }
    });
  }

  displayGeneratedContent(content, title) {
    // Display generated content in the conversation area
    const conversationHistory = document.getElementById('conversation-history');
    const messageElement = document.createElement('div');
    messageElement.className = 'conversation-message generated';
    messageElement.innerHTML = `
      <div class="message-header">${title}</div>
      <div class="message-content">${content}</div>
      <div class="message-time">${new Date().toLocaleTimeString()}</div>
    `;
    conversationHistory.appendChild(messageElement);
    conversationHistory.scrollTop = conversationHistory.scrollHeight;
  }

  insertIntoTranslateInput(content) {
    // Find the source textarea in Google Translate
    const sourceTextarea = document.querySelector('[data-ved] textarea, [jsname="BJE2fc"]');
    if (sourceTextarea) {
      sourceTextarea.value = content;
      sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      sourceTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Show success message
      this.showSuccess('Content inserted into Google Translate');
    } else {
      this.showError('Could not find Google Translate input field');
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.counselor-notification').forEach(notification => {
      notification.remove();
    });

    // Create notification
    const notification = document.createElement('div');
    notification.className = `counselor-notification ${type}`;
    notification.textContent = message;
    
    // Add to extension panel
    const panel = document.getElementById('meet-counselor-panel');
    if (panel) {
      panel.appendChild(notification);
    } else {
      document.body.appendChild(notification);
    }
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'SEND_TO_TRANSLATE':
        this.handleIncomingText(message.text);
        break;
      case 'TEXT_RECEIVED':
        this.handleIncomingText(message.text);
        break;
    }
  }

  handleIncomingText(text) {
    // Add to conversation history
    this.conversationHistory.push({
      text: text,
      timestamp: Date.now(),
      speaker: 'other',
      type: 'incoming'
    });

    // Update conversation display
    this.updateConversationDisplay();

    // Update status
    const statusElement = document.getElementById('counselor-status');
    if (statusElement) {
      statusElement.textContent = 'Active';
      statusElement.className = 'counselor-status active';
    }
  }
}

// Initialize Translate integration
new TranslateIntegration();

