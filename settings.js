// Settings page script for Meet Counselor extension
class SettingsController {
  constructor() {
    this.currentTab = 'my-info';
    this.settings = {};
    this.conversationHistory = [];
    
    this.init();
  }

  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load form values from localStorage
    this.loadFormValuesFromLocalStorage();
    
    // Update UI with loaded data
    this.updateUI();
    
    // Load conversation history
    await this.loadConversationHistory();
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.switchTab(tabId);
      });
    });

    // Form submission
    document.getElementById('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });


    // History controls
    document.getElementById('clear-history').addEventListener('click', () => {
      this.clearHistory();
    });

    document.getElementById('export-history').addEventListener('click', () => {
      this.exportHistory();
    });

    document.getElementById('import-history').addEventListener('click', () => {
      this.importHistory();
    });

    document.getElementById('clear-localstorage').addEventListener('click', () => {
      this.clearLocalStorage();
    });

    // My Information controls
    document.getElementById('export-my-info').addEventListener('click', () => {
      this.exportMyInfo();
    });

    document.getElementById('import-my-info').addEventListener('click', () => {
      this.importMyInfo();
    });

    document.getElementById('clear-my-info').addEventListener('click', () => {
      this.clearMyInfo();
    });

    // Other Party's Information controls
    document.getElementById('export-other-info').addEventListener('click', () => {
      this.exportOtherInfo();
    });

    document.getElementById('import-other-info').addEventListener('click', () => {
      this.importOtherInfo();
    });

    document.getElementById('clear-other-info').addEventListener('click', () => {
      this.clearOtherInfo();
    });

    // All Settings controls
    document.getElementById('export-all-settings').addEventListener('click', () => {
      this.exportAllSettings();
    });

    document.getElementById('import-all-settings').addEventListener('click', () => {
      this.importAllSettings();
    });

    document.getElementById('reset-all-settings').addEventListener('click', () => {
      this.resetAllSettings();
    });

    // Auto-save on input changes
    document.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('change', () => {
        this.saveFieldToLocalStorage(input);
        this.autoSave();
      });
      
      // Also save on input for real-time saving
      input.addEventListener('input', () => {
        this.saveFieldToLocalStorage(input);
      });
    });

    // API key show/hide toggle
    document.getElementById('show-api-key').addEventListener('change', (e) => {
      const apiKeyInput = document.getElementById('openai-api-key');
      apiKeyInput.type = e.target.checked ? 'text' : 'password';
    });

    // API key validation
    document.getElementById('openai-api-key').addEventListener('input', () => {
      this.updateApiKeyStatus();
    });
  }

  switchTab(tabId) {
    // Update active tab in navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');

    this.currentTab = tabId;

    // Load tab-specific data
    if (tabId === 'conversation') {
      this.updateHistoryDisplay();
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['userSettings']);
      this.settings = result.userSettings || {};
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  async loadConversationHistory() {
    try {
      const result = await chrome.storage.local.get(['conversationHistory']);
      this.conversationHistory = result.conversationHistory || [];
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }

  updateUI() {
    // Populate form fields with loaded settings
    const form = document.getElementById('settings-form');
    const formData = new FormData(form);
    
    // My Information - prioritize localStorage over settings
    this.setFieldValue('my-name', this.getFieldValueFromStorage('my-name') || this.settings.myInfo?.name || '');
    this.setFieldValue('my-age', this.getFieldValueFromStorage('my-age') || this.settings.myInfo?.age || '');
    this.setFieldValue('my-location', this.getFieldValueFromStorage('my-location') || this.settings.myInfo?.location || '');
    this.setFieldValue('my-gender', this.getFieldValueFromStorage('my-gender') || this.settings.myInfo?.gender || '');
    this.setFieldValue('my-occupation', this.getFieldValueFromStorage('my-occupation') || this.settings.myInfo?.occupation || '');
    this.setFieldValue('my-profile', this.getFieldValueFromStorage('my-profile') || this.settings.myInfo?.profile || '');
    this.setFieldValue('my-experience', this.getFieldValueFromStorage('my-experience') || this.settings.myInfo?.experience || '');
    this.setFieldValue('my-communication-style', this.getFieldValueFromStorage('my-communication-style') || this.settings.myInfo?.communicationStyle || '');

    // Other Party's Information - prioritize localStorage over settings
    this.setFieldValue('other-name', this.getFieldValueFromStorage('other-name') || this.settings.otherInfo?.name || '');
    this.setFieldValue('other-location', this.getFieldValueFromStorage('other-location') || this.settings.otherInfo?.location || '');
    this.setFieldValue('other-gender', this.getFieldValueFromStorage('other-gender') || this.settings.otherInfo?.gender || '');
    this.setFieldValue('other-age-range', this.getFieldValueFromStorage('other-age-range') || this.settings.otherInfo?.ageRange || '');
    this.setFieldValue('other-relationship', this.getFieldValueFromStorage('other-relationship') || this.settings.otherInfo?.relationship || '');
    this.setFieldValue('other-context', this.getFieldValueFromStorage('other-context') || this.settings.otherInfo?.context || '');

    // Additional Settings - prioritize localStorage over settings
    const autoTranslateValue = this.getFieldValueFromStorage('auto-translate');
    this.setFieldValue('auto-translate', autoTranslateValue !== null ? autoTranslateValue : (this.settings.additional?.autoTranslate || false));
    
    const saveHistoryValue = this.getFieldValueFromStorage('save-history');
    this.setFieldValue('save-history', saveHistoryValue !== null ? saveHistoryValue : (this.settings.additional?.saveHistory !== false));
    
    const autoGenerateResponsesValue = this.getFieldValueFromStorage('auto-generate-responses');
    this.setFieldValue('auto-generate-responses', autoGenerateResponsesValue !== null ? autoGenerateResponsesValue : (this.settings.additional?.autoGenerateResponses || false));
    this.setFieldValue('target-language', this.getFieldValueFromStorage('target-language') || this.settings.additional?.targetLanguage || 'en');
    this.setFieldValue('response-style', this.getFieldValueFromStorage('response-style') || this.settings.additional?.responseStyle || 'balanced');
    this.setFieldValue('response-length', this.getFieldValueFromStorage('response-length') || this.settings.additional?.responseLength || 'medium');
    this.setFieldValue('conversation-context', this.getFieldValueFromStorage('conversation-context') || this.settings.additional?.conversationContext || 'general');

    // API Keys - prioritize localStorage over settings
    this.setFieldValue('openai-api-key', this.getFieldValueFromStorage('openai-api-key') || this.settings.apiKeys?.openai || '');
    this.updateApiKeyStatus();

    // Prompt Settings - prioritize localStorage over settings
    this.setFieldValue('custom-prompt', this.getFieldValueFromStorage('custom-prompt') || this.settings.prompt?.customPrompt || '');
    this.setFieldValue('response-examples', this.getFieldValueFromStorage('response-examples') || this.settings.prompt?.responseExamples || '');
    this.setFieldValue('conversation-goals', this.getFieldValueFromStorage('conversation-goals') || this.settings.prompt?.conversationGoals || '');
    this.setFieldValue('avoid-topics', this.getFieldValueFromStorage('avoid-topics') || this.settings.prompt?.avoidTopics || '');
  }

  setFieldValue(fieldName, value) {
    const field = document.getElementById(fieldName);
    if (!field) return;

    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = value || '';
    }
  }

  getFieldValue(fieldName) {
    const field = document.getElementById(fieldName);
    if (!field) return '';

    if (field.type === 'checkbox') {
      return field.checked;
    }
    return field.value;
  }

  async saveSettings() {
    try {
      // Collect form data
      const settings = {
      myInfo: {
        name: this.getFieldValue('my-name'),
        age: this.getFieldValue('my-age'),
        location: this.getFieldValue('my-location'),
        gender: this.getFieldValue('my-gender'),
        occupation: this.getFieldValue('my-occupation'),
        profile: this.getFieldValue('my-profile'),
        experience: this.getFieldValue('my-experience'),
        communicationStyle: this.getFieldValue('my-communication-style')
      },
      otherInfo: {
        name: this.getFieldValue('other-name'),
        location: this.getFieldValue('other-location'),
        gender: this.getFieldValue('other-gender'),
        ageRange: this.getFieldValue('other-age-range'),
        relationship: this.getFieldValue('other-relationship'),
        context: this.getFieldValue('other-context')
      },
        additional: {
          autoTranslate: this.getFieldValue('auto-translate'),
          saveHistory: this.getFieldValue('save-history'),
          autoGenerateResponses: this.getFieldValue('auto-generate-responses'),
          targetLanguage: this.getFieldValue('target-language'),
          responseStyle: this.getFieldValue('response-style'),
          responseLength: this.getFieldValue('response-length'),
          conversationContext: this.getFieldValue('conversation-context')
        },
        apiKeys: {
          openai: this.getFieldValue('openai-api-key')
        },
        prompt: {
          customPrompt: this.getFieldValue('custom-prompt'),
          responseExamples: this.getFieldValue('response-examples'),
          conversationGoals: this.getFieldValue('conversation-goals'),
          avoidTopics: this.getFieldValue('avoid-topics')
        },
        lastUpdated: Date.now()
      };

      // Save to storage
      await chrome.storage.local.set({ userSettings: settings });
      this.settings = settings;

      // Show success message
      this.showSuccess('Settings saved successfully!');

      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: settings
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showError('Failed to save settings');
    }
  }


  async clearHistory() {
    if (confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
      try {
        await chrome.storage.local.remove(['conversationHistory']);
        this.conversationHistory = [];
        this.updateHistoryDisplay();
        this.showSuccess('Conversation history cleared');
      } catch (error) {
        console.error('Error clearing history:', error);
        this.showError('Failed to clear history');
      }
    }
  }

  async exportHistory() {
    try {
      const data = {
        conversationHistory: this.conversationHistory,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meet-counselor-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('History exported successfully');
    } catch (error) {
      console.error('Error exporting history:', error);
      this.showError('Failed to export history');
    }
  }

  importHistory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.conversationHistory && Array.isArray(data.conversationHistory)) {
          await chrome.storage.local.set({ conversationHistory: data.conversationHistory });
          this.conversationHistory = data.conversationHistory;
          this.updateHistoryDisplay();
          this.showSuccess('History imported successfully');
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        console.error('Error importing history:', error);
        this.showError('Failed to import history. Please check the file format.');
      }
    };
    
    input.click();
  }

  updateHistoryDisplay() {
    // Update statistics
    document.getElementById('total-conversations').textContent = this.conversationHistory.length;
    
    const totalMessages = this.conversationHistory.reduce((sum, conv) => {
      return sum + (conv.messages ? conv.messages.length : 1);
    }, 0);
    document.getElementById('total-messages').textContent = totalMessages;

    const lastActivity = this.conversationHistory.length > 0 
      ? new Date(Math.max(...this.conversationHistory.map(conv => conv.timestamp || 0))).toLocaleString()
      : 'Never';
    document.getElementById('last-activity').textContent = lastActivity;

    // Update history list
    const historyList = document.getElementById('history-list');
    
    if (this.conversationHistory.length === 0) {
      historyList.innerHTML = '<div class="no-history">No conversation history available</div>';
      return;
    }

    historyList.innerHTML = '';
    
    // Show last 10 conversations
    const recentConversations = this.conversationHistory
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 10);

    recentConversations.forEach(conversation => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      const preview = conversation.messages && conversation.messages.length > 0
        ? conversation.messages[0].text
        : conversation.text || 'No preview available';
      
      item.innerHTML = `
        <div class="history-preview">${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}</div>
        <div class="history-meta">
          <span>${conversation.messages ? conversation.messages.length : 1} messages</span>
          <span>${new Date(conversation.timestamp || Date.now()).toLocaleString()}</span>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.viewConversation(conversation);
      });
      
      historyList.appendChild(item);
    });
  }

  viewConversation(conversation) {
    // Open conversation in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL(`conversation.html?id=${conversation.id || Date.now()}`)
    });
  }

  async autoSave() {
    // Auto-save settings after a delay
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 2000);
  }

  updateApiKeyStatus() {
    const apiKey = this.getFieldValue('openai-api-key');
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');
    
    if (!apiKey || apiKey.trim() === '') {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Not configured';
    } else if (this.isValidOpenAIKey(apiKey)) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Valid';
    } else {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Invalid format';
    }
  }

  isValidOpenAIKey(apiKey) {
    // Basic validation for OpenAI API key format
    return apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;
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

  getFieldValueFromStorage(fieldName) {
    return this.loadFieldFromLocalStorage(fieldName);
  }

  loadFormValuesFromLocalStorage() {
    // Get all form fields
    const form = document.getElementById('settings-form');
    if (!form) return;

    const fields = form.querySelectorAll('input, select, textarea');
    
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

  clearAllLocalStorage() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meet-counselor-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  clearLocalStorage() {
    if (confirm('Are you sure you want to clear all form data? This will reset all form fields to their default values. This action cannot be undone.')) {
      try {
        this.clearAllLocalStorage();
        
        // Reset form
        document.getElementById('settings-form').reset();
        
        // Update API key status
        this.updateApiKeyStatus();
        
        this.showSuccess('Form data cleared successfully');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
        this.showError('Failed to clear form data');
      }
    }
  }

  // My Information methods
  exportMyInfo() {
    try {
      const myInfoData = {
        name: this.getFieldValue('my-name'),
        age: this.getFieldValue('my-age'),
        location: this.getFieldValue('my-location'),
        gender: this.getFieldValue('my-gender'),
        occupation: this.getFieldValue('my-occupation'),
        profile: this.getFieldValue('my-profile'),
        experience: this.getFieldValue('my-experience'),
        communicationStyle: this.getFieldValue('my-communication-style')
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

  importMyInfo() {
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
          this.setFieldValue('my-name', data.data.name || '');
          this.setFieldValue('my-age', data.data.age || '');
          this.setFieldValue('my-location', data.data.location || '');
          this.setFieldValue('my-gender', data.data.gender || '');
          this.setFieldValue('my-occupation', data.data.occupation || '');
          this.setFieldValue('my-profile', data.data.profile || '');
          this.setFieldValue('my-experience', data.data.experience || '');
          this.setFieldValue('my-communication-style', data.data.communicationStyle || '');

          // Save to localStorage
          const fields = ['my-name', 'my-age', 'my-location', 'my-gender', 'my-occupation', 'my-profile', 'my-experience', 'my-communication-style'];
          fields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
              this.saveFieldToLocalStorage(field);
            }
          });

          // Save settings to Chrome storage as well
          await this.saveSettings();

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

  clearMyInfo() {
    if (confirm('Are you sure you want to clear all My Information? This action cannot be undone.')) {
      try {
        const fields = ['my-name', 'my-age', 'my-location', 'my-gender', 'my-occupation', 'my-profile', 'my-experience', 'my-communication-style'];
        
        fields.forEach(fieldName => {
          const field = document.getElementById(fieldName);
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

  // Other Party's Information methods
  exportOtherInfo() {
    try {
      const otherInfoData = {
        name: this.getFieldValue('other-name'),
        location: this.getFieldValue('other-location'),
        gender: this.getFieldValue('other-gender'),
        ageRange: this.getFieldValue('other-age-range'),
        relationship: this.getFieldValue('other-relationship'),
        context: this.getFieldValue('other-context')
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

  importOtherInfo() {
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
          this.setFieldValue('other-name', data.data.name || '');
          this.setFieldValue('other-location', data.data.location || '');
          this.setFieldValue('other-gender', data.data.gender || '');
          this.setFieldValue('other-age-range', data.data.ageRange || '');
          this.setFieldValue('other-relationship', data.data.relationship || '');
          this.setFieldValue('other-context', data.data.context || '');

          // Save to localStorage
          const fields = ['other-name', 'other-location', 'other-gender', 'other-age-range', 'other-relationship', 'other-context'];
          fields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
              this.saveFieldToLocalStorage(field);
            }
          });

          // Save settings to Chrome storage as well
          await this.saveSettings();

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

  clearOtherInfo() {
    if (confirm('Are you sure you want to clear all Other Party Information? This action cannot be undone.')) {
      try {
        const fields = ['other-name', 'other-location', 'other-gender', 'other-age-range', 'other-relationship', 'other-context'];
        
        fields.forEach(fieldName => {
          const field = document.getElementById(fieldName);
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

  // All Settings methods
  async exportAllSettings() {
    try {
      // Collect all current settings
      const allSettings = {
        myInfo: {
          name: this.getFieldValue('my-name'),
          age: this.getFieldValue('my-age'),
          location: this.getFieldValue('my-location'),
          gender: this.getFieldValue('my-gender'),
          occupation: this.getFieldValue('my-occupation'),
          profile: this.getFieldValue('my-profile'),
          experience: this.getFieldValue('my-experience'),
          communicationStyle: this.getFieldValue('my-communication-style')
        },
        otherInfo: {
          name: this.getFieldValue('other-name'),
          location: this.getFieldValue('other-location'),
          gender: this.getFieldValue('other-gender'),
          ageRange: this.getFieldValue('other-age-range'),
          relationship: this.getFieldValue('other-relationship'),
          context: this.getFieldValue('other-context')
        },
        additional: {
          autoTranslate: this.getFieldValue('auto-translate'),
          saveHistory: this.getFieldValue('save-history'),
          autoGenerateResponses: this.getFieldValue('auto-generate-responses'),
          targetLanguage: this.getFieldValue('target-language'),
          responseStyle: this.getFieldValue('response-style'),
          responseLength: this.getFieldValue('response-length'),
          conversationContext: this.getFieldValue('conversation-context')
        },
        apiKeys: {
          openai: this.getFieldValue('openai-api-key')
        },
        prompt: {
          customPrompt: this.getFieldValue('custom-prompt'),
          responseExamples: this.getFieldValue('response-examples'),
          conversationGoals: this.getFieldValue('conversation-goals'),
          avoidTopics: this.getFieldValue('avoid-topics')
        },
        conversationHistory: this.conversationHistory,
        localStorage: this.getAllLocalStorageData(),
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        type: 'All Settings'
      };

      const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meet-counselor-all-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccess('All settings exported successfully');
    } catch (error) {
      console.error('Error exporting all settings:', error);
      this.showError('Failed to export all settings');
    }
  }

  importAllSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.type === 'All Settings' && data.version) {
          // Import My Information
          if (data.myInfo) {
            this.setFieldValue('my-name', data.myInfo.name || '');
            this.setFieldValue('my-age', data.myInfo.age || '');
            this.setFieldValue('my-location', data.myInfo.location || '');
            this.setFieldValue('my-gender', data.myInfo.gender || '');
            this.setFieldValue('my-occupation', data.myInfo.occupation || '');
            this.setFieldValue('my-profile', data.myInfo.profile || '');
            this.setFieldValue('my-experience', data.myInfo.experience || '');
            this.setFieldValue('my-communication-style', data.myInfo.communicationStyle || '');
          }

          // Import Other Party's Information
          if (data.otherInfo) {
            this.setFieldValue('other-name', data.otherInfo.name || '');
            this.setFieldValue('other-location', data.otherInfo.location || '');
            this.setFieldValue('other-gender', data.otherInfo.gender || '');
            this.setFieldValue('other-age-range', data.otherInfo.ageRange || '');
            this.setFieldValue('other-relationship', data.otherInfo.relationship || '');
            this.setFieldValue('other-context', data.otherInfo.context || '');
          }

          // Import Additional Settings
          if (data.additional) {
            this.setFieldValue('auto-translate', data.additional.autoTranslate || false);
            this.setFieldValue('save-history', data.additional.saveHistory !== false);
            this.setFieldValue('auto-generate-responses', data.additional.autoGenerateResponses || false);
            this.setFieldValue('target-language', data.additional.targetLanguage || 'en');
            this.setFieldValue('response-style', data.additional.responseStyle || 'balanced');
            this.setFieldValue('response-length', data.additional.responseLength || 'medium');
            this.setFieldValue('conversation-context', data.additional.conversationContext || 'general');
          }

          // Import API Keys
          if (data.apiKeys) {
            this.setFieldValue('openai-api-key', data.apiKeys.openai || '');
          }

          // Import Prompt Settings
          if (data.prompt) {
            this.setFieldValue('custom-prompt', data.prompt.customPrompt || '');
            this.setFieldValue('response-examples', data.prompt.responseExamples || '');
            this.setFieldValue('conversation-goals', data.prompt.conversationGoals || '');
            this.setFieldValue('avoid-topics', data.prompt.avoidTopics || '');
          }

          // Import Conversation History
          if (data.conversationHistory && Array.isArray(data.conversationHistory)) {
            await chrome.storage.local.set({ conversationHistory: data.conversationHistory });
            this.conversationHistory = data.conversationHistory;
          }

          // Import localStorage data
          if (data.localStorage) {
            this.importLocalStorageData(data.localStorage);
          }

          // Save all form fields to localStorage
          this.saveAllFieldsToLocalStorage();

          // Save settings to Chrome storage as well
          await this.saveSettings();

          // Update API key status
          this.updateApiKeyStatus();

          // Update history display
          this.updateHistoryDisplay();

          this.showSuccess('All settings imported successfully');
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        console.error('Error importing all settings:', error);
        this.showError('Failed to import all settings. Please check the file format.');
      }
    };
    
    input.click();
  }

  resetAllSettings() {
    if (confirm('Are you sure you want to reset ALL settings to their default values? This will clear all personal information, preferences, API keys, and conversation history. This action cannot be undone.')) {
      try {
        // Clear all Chrome storage
        chrome.storage.local.clear();
        
        // Clear localStorage
        this.clearAllLocalStorage();
        
        // Reset form
        document.getElementById('settings-form').reset();
        
        // Reset conversation history
        this.conversationHistory = [];
        this.updateHistoryDisplay();
        
        // Update API key status
        this.updateApiKeyStatus();
        
        this.showSuccess('All settings reset to defaults');
      } catch (error) {
        console.error('Error resetting all settings:', error);
        this.showError('Failed to reset all settings');
      }
    }
  }

  getAllLocalStorageData() {
    const localStorageData = {};
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meet-counselor-')) {
          localStorageData[key] = localStorage.getItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to get localStorage data:', error);
    }
    return localStorageData;
  }

  importLocalStorageData(localStorageData) {
    try {
      Object.keys(localStorageData).forEach(key => {
        if (key.startsWith('meet-counselor-')) {
          localStorage.setItem(key, localStorageData[key]);
        }
      });
    } catch (error) {
      console.warn('Failed to import localStorage data:', error);
    }
  }

  saveAllFieldsToLocalStorage() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      this.saveFieldToLocalStorage(field);
    });
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    // Remove existing messages
    document.querySelectorAll('.success-message, .error-message').forEach(msg => {
      msg.remove();
    });

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;

    // Insert at the top of the main content
    const mainContent = document.querySelector('.settings-main');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});

