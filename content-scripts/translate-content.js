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
    
    // Load conversation input from localStorage
    this.loadConversationInputFromLocalStorage();
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

    // Auto-save conversation input to localStorage
    document.getElementById('conversation-input').addEventListener('input', (e) => {
      this.saveFieldToLocalStorage(e.target);
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

    // Clear input and localStorage
    inputElement.value = '';
    this.saveFieldToLocalStorage(inputElement);

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
              <div class="info-controls">
                <button type="button" class="btn btn-secondary" id="export-my-info-modal">Export</button>
                <button type="button" class="btn btn-secondary" id="import-my-info-modal">Import</button>
                <button type="button" class="btn btn-danger" id="clear-my-info-modal">Clear</button>
              </div>
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
              <div class="info-controls">
                <button type="button" class="btn btn-secondary" id="export-other-info-modal">Export</button>
                <button type="button" class="btn btn-secondary" id="import-other-info-modal">Import</button>
                <button type="button" class="btn btn-danger" id="clear-other-info-modal">Clear</button>
              </div>
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
    // Load saved values from localStorage
    this.loadModalValuesFromLocalStorage(modal);
    
    // Auto-save form values to localStorage
    modal.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => {
        this.saveFieldToLocalStorage(field);
      });
      field.addEventListener('change', () => {
        this.saveFieldToLocalStorage(field);
      });
    });

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

    // My Information modal controls
    modal.querySelector('#export-my-info-modal').addEventListener('click', () => {
      this.exportMyInfoModal(modal);
    });

    modal.querySelector('#import-my-info-modal').addEventListener('click', () => {
      this.importMyInfoModal(modal);
    });

    modal.querySelector('#clear-my-info-modal').addEventListener('click', () => {
      this.clearMyInfoModal(modal);
    });

    // Other Party's Information modal controls
    modal.querySelector('#export-other-info-modal').addEventListener('click', () => {
      this.exportOtherInfoModal(modal);
    });

    modal.querySelector('#import-other-info-modal').addEventListener('click', () => {
      this.importOtherInfoModal(modal);
    });

    modal.querySelector('#clear-other-info-modal').addEventListener('click', () => {
      this.clearOtherInfoModal(modal);
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

  // localStorage methods for form persistence
  saveFieldToLocalStorage(field) {
    const fieldName = field.name || field.id;
    if (!fieldName) return;

    let value;
    if (field.type === 'checkbox') {
      value = field.checked;
    } else {
      value = field.value;
    }

    try {
      localStorage.setItem(`meet-counselor-${fieldName}`, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save field to localStorage:', error);
    }
  }

  loadFieldFromLocalStorage(fieldName) {
    try {
      const stored = localStorage.getItem(`meet-counselor-${fieldName}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load field from localStorage:', error);
      return null;
    }
  }

  loadModalValuesFromLocalStorage(modal) {
    const fields = modal.querySelectorAll('input, select, textarea');
    
    fields.forEach(field => {
      const fieldName = field.name || field.id;
      if (!fieldName) return;

      const storedValue = this.loadFieldFromLocalStorage(fieldName);
      if (storedValue !== null) {
        if (field.type === 'checkbox') {
          field.checked = storedValue;
        } else {
          field.value = storedValue;
        }
      }
    });
  }

  loadConversationInputFromLocalStorage() {
    const conversationInput = document.getElementById('conversation-input');
    if (!conversationInput) return;

    const storedValue = this.loadFieldFromLocalStorage('conversation-input');
    if (storedValue !== null && storedValue.trim() !== '') {
      conversationInput.value = storedValue;
    }
  }

  getFieldValue(fieldId) {
    const field = document.getElementById(fieldId);
    return field ? field.value : '';
  }

  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value || '';
    }
  }

  // Modal import/export methods
  exportMyInfoModal(modal) {
    try {
      const myInfoData = {
        name: modal.querySelector('#my-name').value,
        location: modal.querySelector('#my-location').value,
        age: modal.querySelector('#my-age').value,
        gender: modal.querySelector('#my-gender').value,
        profile: modal.querySelector('#my-profile').value,
        experience: modal.querySelector('#my-experience').value
      };

      const data = {
        type: 'My Information',
        data: myInfoData,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meet-counselor-my-info-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('My Information exported successfully');
    } catch (error) {
      console.error('Error exporting My Information:', error);
      this.showError('Failed to export My Information');
    }
  }

  importMyInfoModal(modal) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.type === 'My Information' && data.data) {
          // Import the data
          modal.querySelector('#my-name').value = data.data.name || '';
          modal.querySelector('#my-location').value = data.data.location || '';
          modal.querySelector('#my-age').value = data.data.age || '';
          modal.querySelector('#my-gender').value = data.data.gender || '';
          modal.querySelector('#my-profile').value = data.data.profile || '';
          modal.querySelector('#my-experience').value = data.data.experience || '';

          // Save to localStorage
          const fields = ['my-name', 'my-location', 'my-age', 'my-gender', 'my-profile', 'my-experience'];
          fields.forEach(fieldId => {
            const field = modal.querySelector(`#${fieldId}`);
            if (field) {
              this.saveFieldToLocalStorage(field);
            }
          });

          this.showSuccess('My Information imported successfully');
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        console.error('Error importing My Information:', error);
        this.showError('Failed to import My Information. Please check the file format.');
      }
    };
    
    input.click();
  }

  clearMyInfoModal(modal) {
    if (confirm('Are you sure you want to clear all My Information? This action cannot be undone.')) {
      try {
        const fields = ['my-name', 'my-location', 'my-age', 'my-gender', 'my-profile', 'my-experience'];
        
        fields.forEach(fieldId => {
          const field = modal.querySelector(`#${fieldId}`);
          if (field) {
            field.value = '';
            this.saveFieldToLocalStorage(field);
          }
        });

        this.showSuccess('My Information cleared successfully');
      } catch (error) {
        console.error('Error clearing My Information:', error);
        this.showError('Failed to clear My Information');
      }
    }
  }

  exportOtherInfoModal(modal) {
    try {
      const otherInfoData = {
        name: modal.querySelector('#other-name').value,
        location: modal.querySelector('#other-location').value,
        gender: modal.querySelector('#other-gender').value
      };

      const data = {
        type: 'Other Party Information',
        data: otherInfoData,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meet-counselor-other-info-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('Other Party Information exported successfully');
    } catch (error) {
      console.error('Error exporting Other Party Information:', error);
      this.showError('Failed to export Other Party Information');
    }
  }

  importOtherInfoModal(modal) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.type === 'Other Party Information' && data.data) {
          // Import the data
          modal.querySelector('#other-name').value = data.data.name || '';
          modal.querySelector('#other-location').value = data.data.location || '';
          modal.querySelector('#other-gender').value = data.data.gender || '';

          // Save to localStorage
          const fields = ['other-name', 'other-location', 'other-gender'];
          fields.forEach(fieldId => {
            const field = modal.querySelector(`#${fieldId}`);
            if (field) {
              this.saveFieldToLocalStorage(field);
            }
          });

          this.showSuccess('Other Party Information imported successfully');
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        console.error('Error importing Other Party Information:', error);
        this.showError('Failed to import Other Party Information. Please check the file format.');
      }
    };
    
    input.click();
  }

  clearOtherInfoModal(modal) {
    if (confirm('Are you sure you want to clear all Other Party Information? This action cannot be undone.')) {
      try {
        const fields = ['other-name', 'other-location', 'other-gender'];
        
        fields.forEach(fieldId => {
          const field = modal.querySelector(`#${fieldId}`);
          if (field) {
            field.value = '';
            this.saveFieldToLocalStorage(field);
          }
        });

        this.showSuccess('Other Party Information cleared successfully');
      } catch (error) {
        console.error('Error clearing Other Party Information:', error);
        this.showError('Failed to clear Other Party Information');
      }
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'SEND_TO_TRANSLATE':
        this.handleIncomingText(message.text);
        break;
      case 'TEXT_RECEIVED':
        this.handleIncomingText(message.text);
        break;
      case 'INSERT_TRANSLATE_CONTENT':
        this.insertContentToTranslate(message.content);
        break;
    }
  }

  insertContentToTranslate(content) {
    try {
      // Find the Google Translate input textarea
      const sourceTextarea = document.querySelector('[data-ved] textarea, [jsname="BJE2fc"], textarea[aria-label*="Source text"], textarea[aria-label*="텍스트 입력"]');
      
      if (sourceTextarea) {
        // Clear existing content
        sourceTextarea.value = '';
        
        // Set the new content
        sourceTextarea.value = content;
        
        // Trigger input events to make Google Translate recognize the content
        sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        sourceTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Focus the textarea to ensure it's active
        sourceTextarea.focus();
        
        console.log('Content inserted into Google Translate:', content);
      } else {
        console.error('Could not find Google Translate textarea');
        // Try alternative selectors
        const alternativeTextarea = document.querySelector('textarea[placeholder*="텍스트"], textarea[placeholder*="Text"]');
        if (alternativeTextarea) {
          alternativeTextarea.value = content;
          alternativeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          alternativeTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          alternativeTextarea.focus();
          console.log('Content inserted using alternative selector');
        }
      }
    } catch (error) {
      console.error('Error inserting content to Google Translate:', error);
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

