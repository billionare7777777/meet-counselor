// Popup script for Meet Counselor extension
class PopupController {
  constructor() {
    this.isRecording = false;
    this.sessionStartTime = null;
    this.messageCount = 0;
    this.conversationHistory = [];
    
    this.init();
  }

  async init() {
    // Load saved data
    await this.loadData();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
    
    // Start session timer
    this.startSessionTimer();
  }

  setupEventListeners() {
    // Toggle recording button
    document.getElementById('toggle-recording').addEventListener('click', () => {
      this.toggleRecording();
    });

    // Settings button
    document.getElementById('open-settings').addEventListener('click', () => {
      this.openSettings();
    });

    // Conversation generation buttons
    document.getElementById('create-answer').addEventListener('click', () => {
      this.createAnswer();
    });

    document.getElementById('create-chat').addEventListener('click', () => {
      this.createChat();
    });

    document.getElementById('create-beginning-questions').addEventListener('click', () => {
      this.createQuestions('beginning');
    });

    document.getElementById('create-during-questions').addEventListener('click', () => {
      this.createQuestions('during');
    });

    document.getElementById('create-end-questions').addEventListener('click', () => {
      this.createQuestions('ending');
    });

    // Display panel actions
    document.getElementById('copy-generated').addEventListener('click', () => {
      this.copyGeneratedContent();
    });

    document.getElementById('use-generated').addEventListener('click', () => {
      this.useGeneratedContent();
    });

    document.getElementById('copy-translation').addEventListener('click', () => {
      this.copyTranslation();
    });

    document.getElementById('translate-content').addEventListener('click', () => {
      this.translateContent();
    });

    // Quick tools
    document.getElementById('view-history').addEventListener('click', () => {
      this.viewHistory();
    });

    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    // Help link
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  async loadData() {
    try {
      // Load settings
      const settingsResult = await chrome.storage.local.get(['userSettings']);
      this.userSettings = settingsResult.userSettings || {};

      // Load conversation history
      const historyResult = await chrome.storage.local.get(['conversationHistory']);
      this.conversationHistory = historyResult.conversationHistory || [];

      // Sync conversation history with background script
      await this.syncConversationHistory();

      // Load session data
      const sessionResult = await chrome.storage.local.get(['currentSession']);
      if (sessionResult.currentSession) {
        this.isRecording = sessionResult.currentSession.isRecording || false;
        this.sessionStartTime = sessionResult.currentSession.startTime || null;
        this.messageCount = sessionResult.currentSession.messageCount || 0;
      }

      // Load configuration values from localStorage (prioritized over Chrome storage)
      this.loadConfigurationFromLocalStorage();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async syncConversationHistory() {
    try {
      console.log('🔄 Syncing conversation history with background script...');
      
      // Get conversation history from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CONVERSATION_HISTORY'
      });
      
      if (response && response.history) {
        console.log('📚 Background script conversation history length:', response.history.length);
        console.log('📚 Popup conversation history length:', this.conversationHistory.length);
        
        // Merge conversation histories, avoiding duplicates
        const mergedHistory = this.mergeConversationHistories(this.conversationHistory, response.history);
        
        if (mergedHistory.length !== this.conversationHistory.length) {
          console.log('🔄 Conversation history updated:', mergedHistory.length, 'total conversations');
          this.conversationHistory = mergedHistory;
          
          // Update message count for current session
          this.updateMessageCount();
          
          // Save updated history to storage
          await chrome.storage.local.set({
            conversationHistory: this.conversationHistory
          });
          
          console.log('💾 Updated conversation history saved to storage');
        } else {
          console.log('✅ Conversation history already up to date');
        }
      }
    } catch (error) {
      console.error('Error syncing conversation history:', error);
    }
  }

  mergeConversationHistories(popupHistory, backgroundHistory) {
    // Create a map to track unique conversations by timestamp and text
    const conversationMap = new Map();
    
    // Add popup history first
    popupHistory.forEach(conv => {
      const key = `${conv.timestamp}_${conv.text}`;
      conversationMap.set(key, conv);
    });
    
    // Add background history, avoiding duplicates
    backgroundHistory.forEach(conv => {
      const key = `${conv.timestamp}_${conv.text}`;
      if (!conversationMap.has(key)) {
        conversationMap.set(key, conv);
      }
    });
    
    // Convert back to array and sort by timestamp
    return Array.from(conversationMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  updateMessageCount() {
    if (this.isRecording && this.sessionStartTime) {
      // Count messages from current session
      const currentSessionMessages = this.conversationHistory.filter(conv => 
        conv.timestamp && conv.timestamp >= this.sessionStartTime
      );
      this.messageCount = currentSessionMessages.length;
      console.log('📊 Updated message count for current session:', this.messageCount);
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({
        currentSession: {
          isRecording: this.isRecording,
          startTime: this.sessionStartTime,
          messageCount: this.messageCount
        }
      });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async toggleRecording() {
    try {
      if (this.isRecording) {
        // Stop recording
        const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
        console.log('Stop recording response:', response);
        if (response && response.success) {
          this.isRecording = false;
          this.sessionStartTime = null;
          this.showSuccess('Recording stopped successfully');
        } else {
          throw new Error('Failed to stop recording');
        }
      } else {
        // Start recording
        console.log('🔄 Starting recording...');
        const response = await chrome.runtime.sendMessage({ type: 'START_RECORDING' });
        console.log('Start recording response:', response);
        
        // Check if response exists and has success property
        if (response && typeof response === 'object' && response.success === true) {
          this.isRecording = true;
          this.sessionStartTime = Date.now();
          this.messageCount = 0;
          console.log('✅ Recording started successfully');
          this.showSuccess('Recording started successfully');
        } else {
          // Log the actual response for debugging
          console.error('Unexpected response format:', response);
          
          // Check if there's a specific error message from the background script
          if (response && response.error) {
            throw new Error(response.error);
          } else {
            throw new Error('Failed to start recording - unexpected response format');
          }
        }
      }
      
      await this.saveData();
      this.updateUI();
    } catch (error) {
      console.error('Error toggling recording:', error);
      let errorMessage = 'Failed to toggle recording: ' + error.message;
      
      // Provide more helpful error messages for common issues
      if (error.message.includes('Content script not available')) {
        errorMessage = 'Please refresh the Google Meet page and try again.';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'Microphone permission denied. Please click the microphone icon in your browser address bar and allow access for Google Meet, then try again.';
      } else if (error.message.includes('No microphone found')) {
        errorMessage = 'No microphone detected. Please check your microphone connection.';
      } else if (error.message.includes('unexpected response format')) {
        errorMessage = 'Recording service not responding correctly. Please refresh the page and try again.';
      }
      
      this.showError(errorMessage);
    }
  }

  async openSettings() {
    try {
      // Open settings in a new tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL('settings.html')
      });
    } catch (error) {
      console.error('Error opening settings:', error);
      this.showError('Failed to open settings');
    }
  }

  async createAnswer() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_CONVERSATION',
        context: {
          type: 'answer',
          conversationHistory: this.conversationHistory.slice(-15),
          userSettings: this.configValues
        }
      });

      if (response.conversation) {
        await this.pasteToGoogleTranslate(response.conversation, 'Answer');
        await this.archiveConversation(response.conversation, 'answer');
      }
    } catch (error) {
      console.error('Error creating answer:', error);
      this.showError('Failed to create answer');
    }
  }

  async createChat() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_CONVERSATION',
        context: {
          type: 'chat',
          conversationHistory: this.conversationHistory.slice(-15),
          userSettings: this.configValues
        }
      });

      if (response.conversation) {
        await this.pasteToGoogleTranslate(response.conversation, 'Chat');
        await this.archiveConversation(response.conversation, 'chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      this.showError('Failed to create chat');
    }
  }

  async createQuestions(questionType) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_CONVERSATION',
        context: {
          type: 'questions',
          questionType: questionType,
          conversationHistory: this.conversationHistory.slice(-15),
          userSettings: this.configValues
        }
      });

      if (response.conversation) {
        await this.pasteToGoogleTranslate(response.conversation, `${questionType.charAt(0).toUpperCase() + questionType.slice(1)} Questions`);
        await this.archiveConversation(response.conversation, 'questions');
      }
    } catch (error) {
      console.error('Error creating questions:', error);
      this.showError('Failed to create questions');
    }
  }

  async viewHistory() {
    try {
      // Open history in a new tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL('history.html')
      });
    } catch (error) {
      console.error('Error opening history:', error);
      this.showError('Failed to open history');
    }
  }

  async exportData() {
    try {
      const data = {
        settings: this.userSettings,
        conversationHistory: this.conversationHistory,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meet-counselor-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  showHelp() {
    // Create help modal
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Meet Counselor Help</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <h3>Getting Started</h3>
          <p>1. Open Google Meet and start a call</p>
          <p>2. Open Google Translate in another tab</p>
          <p>3. Click "Start Recording" to begin capturing audio</p>
          <p>4. Use the extension panel in Google Translate to manage conversations</p>
          
          <h3>Features</h3>
          <ul>
            <li><strong>Real-time Transcription:</strong> Captures speech from Google Meet</li>
            <li><strong>AI Responses:</strong> Generate contextual responses to questions</li>
            <li><strong>Question Generation:</strong> Create questions for different conversation phases</li>
            <li><strong>Translation Integration:</strong> Works seamlessly with Google Translate</li>
            <li><strong>Conversation History:</strong> Archive and review past conversations</li>
          </ul>
          
          <h3>Settings</h3>
          <p>Configure your personal information, conversation preferences, and AI prompts in the Settings panel.</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set up modal event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  showGeneratedContent(title, content) {
    // Create content display modal
    const modal = document.createElement('div');
    modal.className = 'content-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="generated-content">${content}</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="copy-content">Copy</button>
            <button class="btn btn-primary" id="use-content">Use</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Set up modal event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#copy-content').addEventListener('click', () => {
      navigator.clipboard.writeText(content);
      this.showSuccess('Content copied to clipboard');
    });

    modal.querySelector('#use-content').addEventListener('click', () => {
      // Send content to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'INSERT_CONTENT',
            content: content
          });
        }
      });
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  updateUI() {
    // Update status indicator
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const toggleBtn = document.getElementById('toggle-recording');
    const toggleBtnText = toggleBtn.querySelector('span');

    if (this.isRecording) {
      statusDot.className = 'status-dot recording';
      statusText.textContent = 'Recording';
      toggleBtn.className = 'action-btn recording';
      toggleBtnText.textContent = 'Stop Recording';
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Inactive';
      toggleBtn.className = 'action-btn';
      toggleBtnText.textContent = 'Start Recording';
    }

    // Update session info
    document.getElementById('session-status').textContent = 
      this.isRecording ? 'Connected' : 'Not connected';
    
    // Update message count based on conversation history from current session
    const currentSessionMessages = this.conversationHistory.filter(conv => 
      conv.timestamp && this.sessionStartTime && conv.timestamp >= this.sessionStartTime
    );
    const displayMessageCount = this.isRecording ? currentSessionMessages.length : this.messageCount;
    document.getElementById('message-count').textContent = displayMessageCount.toString();

    // Update configuration display
    this.updateConfigurationDisplay();

    // Update message count
    this.updateMessageCount();

    // Sync conversation history to get latest conversations
    this.syncConversationHistory();

    // Update conversation list
    this.updateConversationList();
  }

  updateConversationList() {
    const conversationList = document.getElementById('conversation-list');
    
    if (this.conversationHistory.length === 0) {
      conversationList.innerHTML = '<div class="no-conversations">No recent conversations</div>';
      return;
    }

    const recentConversations = this.conversationHistory.slice(-5).reverse();
    conversationList.innerHTML = '';

    recentConversations.forEach(conversation => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.innerHTML = `
        <div class="conversation-preview">${conversation.text.substring(0, 100)}...</div>
        <div class="conversation-time">${new Date(conversation.timestamp).toLocaleString()}</div>
      `;
      
      item.addEventListener('click', () => {
        this.viewConversation(conversation);
      });
      
      conversationList.appendChild(item);
    });
  }

  viewConversation(conversation) {
    // Open conversation in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL(`conversation.html?id=${conversation.id}`)
    });
  }

  loadConfigurationFromLocalStorage() {
    // Load configuration values from localStorage, prioritizing over Chrome storage
    this.configValues = {};
    
    const fields = [
      'my-name', 'my-location', 'my-age', 'my-gender', 'my-occupation', 'my-profile', 'my-experience', 'my-communication-style',
      'other-name', 'other-location', 'other-gender', 'other-age-range', 'other-relationship', 'other-context',
      'job-title', 'budget-type', 'budget-amount', 'budget-currency', 'job-description', 'my-proposal', 'chat-history', 'timeline-start', 'timeline-end', 'timeline-details',
      'auto-translate', 'save-history', 'auto-generate-responses', 'target-language', 'response-style', 'response-length', 'conversation-context',
      'openai-api-key', 'custom-prompt', 'response-examples', 'conversation-goals', 'avoid-topics'
    ];

    fields.forEach(fieldName => {
      const storedValue = this.getFieldValueFromLocalStorage(fieldName);
      if (storedValue !== null) {
        this.configValues[fieldName] = storedValue;
      } else if (this.userSettings) {
        // Fallback to Chrome storage if localStorage doesn't have the value
        const fieldPath = this.getFieldPathFromSettings(fieldName);
        if (fieldPath) {
          this.configValues[fieldName] = this.getNestedValue(this.userSettings, fieldPath);
        }
      }
    });
  }

  getFieldValueFromLocalStorage(fieldName) {
    try {
      const stored = localStorage.getItem(`meet-counselor-${fieldName}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load field from localStorage:', error);
      return null;
    }
  }

  getFieldPathFromSettings(fieldName) {
    // Map field names to their paths in the settings object
    const fieldMap = {
      'my-name': 'myInfo.name',
      'my-age': 'myInfo.age',
      'my-location': 'myInfo.location',
      'my-gender': 'myInfo.gender',
      'my-occupation': 'myInfo.occupation',
      'my-profile': 'myInfo.profile',
      'my-experience': 'myInfo.experience',
      'my-communication-style': 'myInfo.communicationStyle',
      'other-name': 'otherInfo.name',
      'other-location': 'otherInfo.location',
      'other-gender': 'otherInfo.gender',
      'other-age-range': 'otherInfo.ageRange',
      'other-relationship': 'otherInfo.relationship',
      'other-context': 'otherInfo.context',
      'job-title': 'jobInfo.jobTitle',
      'budget-type': 'jobInfo.budgetType',
      'budget-amount': 'jobInfo.budgetAmount',
      'budget-currency': 'jobInfo.budgetCurrency',
      'job-description': 'jobInfo.jobDescription',
      'my-proposal': 'jobInfo.myProposal',
      'chat-history': 'jobInfo.chatHistory',
      'timeline-start': 'jobInfo.timelineStart',
      'timeline-end': 'jobInfo.timelineEnd',
      'timeline-details': 'jobInfo.timelineDetails',
      'auto-translate': 'additional.autoTranslate',
      'save-history': 'additional.saveHistory',
      'auto-generate-responses': 'additional.autoGenerateResponses',
      'target-language': 'additional.targetLanguage',
      'response-style': 'additional.responseStyle',
      'response-length': 'additional.responseLength',
      'conversation-context': 'additional.conversationContext',
      'openai-api-key': 'apiKeys.openai',
      'custom-prompt': 'prompt.customPrompt',
      'response-examples': 'prompt.responseExamples',
      'conversation-goals': 'prompt.conversationGoals',
      'avoid-topics': 'prompt.avoidTopics'
    };
    
    return fieldMap[fieldName] || null;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  updateConfigurationDisplay() {
    // Update configuration display in the popup
    const name = this.configValues['my-name'] || 'Not set';
    const location = this.configValues['my-location'] || 'Not set';
    const apiKey = this.configValues['openai-api-key'] || '';
    const autoTranslate = this.configValues['auto-translate'] || false;

    document.getElementById('config-name').textContent = name;
    document.getElementById('config-location').textContent = location;
    document.getElementById('config-api-key').textContent = apiKey ? 'Configured' : 'Not configured';
    document.getElementById('config-auto-translate').textContent = autoTranslate ? 'Enabled' : 'Disabled';
  }

  async pasteToGoogleTranslate(conversation, title) {
    try {
      console.log('📝 Pasting conversation to Google Translate:', title);
      console.log('💬 Conversation content:', conversation);
      
      // Extract text content from the conversation
      let content;
      if (Array.isArray(conversation)) {
        // For questions, join them with line breaks
        if (title.includes('Questions')) {
          content = conversation.map(msg => {
            const text = msg.content || msg.text || String(msg);
            return text.trim();
          }).join('\n');
        } else {
          // For conversations, format as dialogue
          content = conversation.map(msg => {
            const text = msg.content || msg.text || String(msg);
            const sender = msg.sender === 'user' || msg.sender === 'me' ? 'You' : 'Assistant';
            return `${sender}: ${text}`;
          }).join('\n');
        }
      } else if (conversation && typeof conversation === 'object') {
        content = conversation.content || conversation.text || JSON.stringify(conversation, null, 2);
      } else {
        content = String(conversation || 'No content generated');
      }

      // Find Google Translate tab
      const tabs = await chrome.tabs.query({});
      const translateTab = tabs.find(tab => tab.url && tab.url.includes('translate.google.com'));
      
      if (translateTab) {
        // Send content to Google Translate tab
        await chrome.tabs.sendMessage(translateTab.id, {
          type: 'INSERT_TRANSLATE_CONTENT',
          content: content.trim()
        });
        
        // Switch to the Google Translate tab
        await chrome.tabs.update(translateTab.id, { active: true });
        
        // Store current content for archiving
        this.currentGeneratedContent = conversation;
        
        this.showSuccess(`Content pasted to Google Translate`);
      } else {
        // If Google Translate is not open, open it and then send content
        const newTab = await chrome.tabs.create({
          url: 'https://translate.google.com/'
        });
        
        // Wait a moment for the tab to load, then send content
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(newTab.id, {
              type: 'INSERT_TRANSLATE_CONTENT',
              content: content.trim()
            });
            this.showSuccess(`Google Translate opened and content pasted`);
          } catch (error) {
            console.error('Error sending content to new translate tab:', error);
            this.showError('Failed to paste content to Google Translate');
          }
        }, 2000);
        
        // Store current content for archiving
        this.currentGeneratedContent = conversation;
        console.log('✅ Content pasted to Google Translate successfully');
      }
    } catch (error) {
      console.error('Error pasting to Google Translate:', error);
      this.showError('Failed to paste content to Google Translate');
    }
  }

  displayGeneratedConversation(conversation, title) {
    const contentPanel = document.getElementById('generated-content');
    
    if (Array.isArray(conversation)) {
      // Format as conversation messages - simple list format
      contentPanel.innerHTML = conversation.map((message, index) => {
        const content = message.content || message.text || String(message);
        return `
          <div class="message-item">
            <strong>${message.sender === 'user' || message.sender === 'me' ? 'You' : 'Assistant'}:</strong> ${content}
          </div>
        `;
      }).join('');
    } else if (conversation && typeof conversation === 'object') {
      // Handle object responses - extract content property
      const content = conversation.content || conversation.text || JSON.stringify(conversation, null, 2);
      contentPanel.innerHTML = `
        <div class="message-item">
          <strong>${title}:</strong> ${content}
        </div>
      `;
    } else {
      // Format as single content - direct text
      contentPanel.innerHTML = `
        <div class="message-item">
          <strong>${title}:</strong> ${conversation || 'No content generated'}
        </div>
      `;
    }

    // Store current content for copying/translation
    this.currentGeneratedContent = conversation;
  }

  async archiveConversation(conversation, type) {
    try {
      console.log('📚 Archiving conversation:', type);
      console.log('💬 Conversation to archive:', conversation);
      
      const archivedConversation = {
        id: Date.now(),
        type: type,
        content: conversation,
        timestamp: Date.now(),
        userSettings: this.configValues
      };

      // Add to conversation history
      this.conversationHistory.push(archivedConversation);
      console.log('📊 Total archived conversations:', this.conversationHistory.length);

      // Save to storage
      await chrome.storage.local.set({
        conversationHistory: this.conversationHistory
      });

      // Update conversation list display
      this.updateConversationList();
      
      console.log('✅ Conversation archived successfully');
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  }

  copyGeneratedContent() {
    if (this.currentGeneratedContent) {
      let content;
      if (Array.isArray(this.currentGeneratedContent)) {
        content = this.currentGeneratedContent.map(msg => {
          const text = msg.content || msg.text || String(msg);
          return `${msg.sender || 'Assistant'}: ${text}`;
        }).join('\n');
      } else if (typeof this.currentGeneratedContent === 'object') {
        content = this.currentGeneratedContent.content || this.currentGeneratedContent.text || JSON.stringify(this.currentGeneratedContent, null, 2);
      } else {
        content = String(this.currentGeneratedContent);
      }
      
      navigator.clipboard.writeText(content);
      this.showSuccess('Content copied to clipboard');
    }
  }

  useGeneratedContent() {
    if (this.currentGeneratedContent) {
      console.log('🚀 Using generated content in active tab');
      console.log('📄 Content being sent:', this.currentGeneratedContent);
      
      // Send content to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          console.log('📤 Sending content to tab:', tabs[0].url);
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'INSERT_CONTENT',
            content: this.currentGeneratedContent
          });
          console.log('✅ Content sent to active tab successfully');
        }
      });
      this.showSuccess('Content sent to active tab');
    }
  }

  copyTranslation() {
    const translationPanel = document.getElementById('translation-content');
    const content = translationPanel.textContent;
    
    if (content && !content.includes('Translation will appear here')) {
      navigator.clipboard.writeText(content);
      this.showSuccess('Translation copied to clipboard');
    }
  }

  async translateContent() {
    if (!this.currentGeneratedContent) {
      this.showError('No content to translate');
      return;
    }

    try {
      let content;
      if (Array.isArray(this.currentGeneratedContent)) {
        content = this.currentGeneratedContent.map(msg => msg.content || msg.text || String(msg)).join('\n');
      } else if (typeof this.currentGeneratedContent === 'object') {
        content = this.currentGeneratedContent.content || this.currentGeneratedContent.text || JSON.stringify(this.currentGeneratedContent, null, 2);
      } else {
        content = String(this.currentGeneratedContent);
      }

      const targetLanguage = this.configValues['target-language'] || 'en';
      
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_CONTENT',
        content: content,
        targetLanguage: targetLanguage
      });

      if (response.translation) {
        const translationPanel = document.getElementById('translation-content');
        translationPanel.innerHTML = `
          <div class="message-item">
            <strong>Translation (${targetLanguage}):</strong> ${response.translation}
          </div>
        `;
      }
    } catch (error) {
      console.error('Error translating content:', error);
      this.showError('Failed to translate content');
    }
  }

  startSessionTimer() {
    setInterval(() => {
      if (this.isRecording && this.sessionStartTime) {
        const duration = Date.now() - this.sessionStartTime;
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        document.getElementById('session-duration').textContent = 
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        // Reset duration when not recording
        document.getElementById('session-duration').textContent = '00:00:00';
      }
    }, 1000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Add modal styles
const modalStyles = `
  .help-modal, .content-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #5f6368;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .generated-content {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: #1a73e8;
    color: white;
  }

  .btn-primary:hover {
    background: #1557b0;
  }

  .btn-secondary {
    background: #f8f9fa;
    color: #5f6368;
    border: 1px solid #dadce0;
  }

  .btn-secondary:hover {
    background: #f1f3f4;
  }

  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    animation: slideIn 0.3s ease;
  }

  .notification.success {
    background: #34a853;
  }

  .notification.error {
    background: #ea4335;
  }

  .notification.info {
    background: #1a73e8;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = modalStyles;
document.head.appendChild(styleSheet);

