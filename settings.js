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

    // Save button
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Reset button
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
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
    this.setFieldValue('myName', this.getFieldValueFromStorage('myName') || this.settings.myInfo?.name || '');
    this.setFieldValue('myAge', this.getFieldValueFromStorage('myAge') || this.settings.myInfo?.age || '');
    this.setFieldValue('myLocation', this.getFieldValueFromStorage('myLocation') || this.settings.myInfo?.location || '');
    this.setFieldValue('myGender', this.getFieldValueFromStorage('myGender') || this.settings.myInfo?.gender || '');
    this.setFieldValue('myOccupation', this.getFieldValueFromStorage('myOccupation') || this.settings.myInfo?.occupation || '');
    this.setFieldValue('myProfile', this.getFieldValueFromStorage('myProfile') || this.settings.myInfo?.profile || '');
    this.setFieldValue('myExperience', this.getFieldValueFromStorage('myExperience') || this.settings.myInfo?.experience || '');
    this.setFieldValue('myCommunicationStyle', this.getFieldValueFromStorage('myCommunicationStyle') || this.settings.myInfo?.communicationStyle || '');

    // Other Party's Information - prioritize localStorage over settings
    this.setFieldValue('otherName', this.getFieldValueFromStorage('otherName') || this.settings.otherInfo?.name || '');
    this.setFieldValue('otherLocation', this.getFieldValueFromStorage('otherLocation') || this.settings.otherInfo?.location || '');
    this.setFieldValue('otherGender', this.getFieldValueFromStorage('otherGender') || this.settings.otherInfo?.gender || '');
    this.setFieldValue('otherAgeRange', this.getFieldValueFromStorage('otherAgeRange') || this.settings.otherInfo?.ageRange || '');
    this.setFieldValue('otherRelationship', this.getFieldValueFromStorage('otherRelationship') || this.settings.otherInfo?.relationship || '');
    this.setFieldValue('otherContext', this.getFieldValueFromStorage('otherContext') || this.settings.otherInfo?.context || '');

    // Additional Settings - prioritize localStorage over settings
    this.setFieldValue('autoTranslate', this.getFieldValueFromStorage('autoTranslate') !== null ? this.getFieldValueFromStorage('autoTranslate') : (this.settings.additional?.autoTranslate || false));
    this.setFieldValue('saveHistory', this.getFieldValueFromStorage('saveHistory') !== null ? this.getFieldValueFromStorage('saveHistory') : (this.settings.additional?.saveHistory !== false));
    this.setFieldValue('autoGenerateResponses', this.getFieldValueFromStorage('autoGenerateResponses') !== null ? this.getFieldValueFromStorage('autoGenerateResponses') : (this.settings.additional?.autoGenerateResponses || false));
    this.setFieldValue('targetLanguage', this.getFieldValueFromStorage('targetLanguage') || this.settings.additional?.targetLanguage || 'en');
    this.setFieldValue('responseStyle', this.getFieldValueFromStorage('responseStyle') || this.settings.additional?.responseStyle || 'balanced');
    this.setFieldValue('responseLength', this.getFieldValueFromStorage('responseLength') || this.settings.additional?.responseLength || 'medium');
    this.setFieldValue('conversationContext', this.getFieldValueFromStorage('conversationContext') || this.settings.additional?.conversationContext || 'general');

    // API Keys - prioritize localStorage over settings
    this.setFieldValue('openaiApiKey', this.getFieldValueFromStorage('openaiApiKey') || this.settings.apiKeys?.openai || '');
    this.updateApiKeyStatus();

    // Prompt Settings - prioritize localStorage over settings
    this.setFieldValue('customPrompt', this.getFieldValueFromStorage('customPrompt') || this.settings.prompt?.customPrompt || '');
    this.setFieldValue('responseExamples', this.getFieldValueFromStorage('responseExamples') || this.settings.prompt?.responseExamples || '');
    this.setFieldValue('conversationGoals', this.getFieldValueFromStorage('conversationGoals') || this.settings.prompt?.conversationGoals || '');
    this.setFieldValue('avoidTopics', this.getFieldValueFromStorage('avoidTopics') || this.settings.prompt?.avoidTopics || '');
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
          name: this.getFieldValue('myName'),
          age: this.getFieldValue('myAge'),
          location: this.getFieldValue('myLocation'),
          gender: this.getFieldValue('myGender'),
          occupation: this.getFieldValue('myOccupation'),
          profile: this.getFieldValue('myProfile'),
          experience: this.getFieldValue('myExperience'),
          communicationStyle: this.getFieldValue('myCommunicationStyle')
        },
        otherInfo: {
          name: this.getFieldValue('otherName'),
          location: this.getFieldValue('otherLocation'),
          gender: this.getFieldValue('otherGender'),
          ageRange: this.getFieldValue('otherAgeRange'),
          relationship: this.getFieldValue('otherRelationship'),
          context: this.getFieldValue('otherContext')
        },
        additional: {
          autoTranslate: this.getFieldValue('autoTranslate'),
          saveHistory: this.getFieldValue('saveHistory'),
          autoGenerateResponses: this.getFieldValue('autoGenerateResponses'),
          targetLanguage: this.getFieldValue('targetLanguage'),
          responseStyle: this.getFieldValue('responseStyle'),
          responseLength: this.getFieldValue('responseLength'),
          conversationContext: this.getFieldValue('conversationContext')
        },
        apiKeys: {
          openai: this.getFieldValue('openaiApiKey')
        },
        prompt: {
          customPrompt: this.getFieldValue('customPrompt'),
          responseExamples: this.getFieldValue('responseExamples'),
          conversationGoals: this.getFieldValue('conversationGoals'),
          avoidTopics: this.getFieldValue('avoidTopics')
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

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      try {
        // Clear all settings
        await chrome.storage.local.remove(['userSettings']);
        this.settings = {};
        
        // Clear localStorage
        this.clearAllLocalStorage();
        
        // Reset form
        document.getElementById('settings-form').reset();
        
        // Update API key status
        this.updateApiKeyStatus();
        
        this.showSuccess('Settings reset to defaults');
      } catch (error) {
        console.error('Error resetting settings:', error);
        this.showError('Failed to reset settings');
      }
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
    const apiKey = this.getFieldValue('openaiApiKey');
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
        name: this.getFieldValue('myName'),
        age: this.getFieldValue('myAge'),
        location: this.getFieldValue('myLocation'),
        gender: this.getFieldValue('myGender'),
        occupation: this.getFieldValue('myOccupation'),
        profile: this.getFieldValue('myProfile'),
        experience: this.getFieldValue('myExperience'),
        communicationStyle: this.getFieldValue('myCommunicationStyle')
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
          this.setFieldValue('myName', data.data.name || '');
          this.setFieldValue('myAge', data.data.age || '');
          this.setFieldValue('myLocation', data.data.location || '');
          this.setFieldValue('myGender', data.data.gender || '');
          this.setFieldValue('myOccupation', data.data.occupation || '');
          this.setFieldValue('myProfile', data.data.profile || '');
          this.setFieldValue('myExperience', data.data.experience || '');
          this.setFieldValue('myCommunicationStyle', data.data.communicationStyle || '');

          // Save to localStorage
          const fields = ['myName', 'myAge', 'myLocation', 'myGender', 'myOccupation', 'myProfile', 'myExperience', 'myCommunicationStyle'];
          fields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
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

  clearMyInfo() {
    if (confirm('Are you sure you want to clear all My Information? This action cannot be undone.')) {
      try {
        const fields = ['myName', 'myAge', 'myLocation', 'myGender', 'myOccupation', 'myProfile', 'myExperience', 'myCommunicationStyle'];
        
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
        name: this.getFieldValue('otherName'),
        location: this.getFieldValue('otherLocation'),
        gender: this.getFieldValue('otherGender'),
        ageRange: this.getFieldValue('otherAgeRange'),
        relationship: this.getFieldValue('otherRelationship'),
        context: this.getFieldValue('otherContext')
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
          this.setFieldValue('otherName', data.data.name || '');
          this.setFieldValue('otherLocation', data.data.location || '');
          this.setFieldValue('otherGender', data.data.gender || '');
          this.setFieldValue('otherAgeRange', data.data.ageRange || '');
          this.setFieldValue('otherRelationship', data.data.relationship || '');
          this.setFieldValue('otherContext', data.data.context || '');

          // Save to localStorage
          const fields = ['otherName', 'otherLocation', 'otherGender', 'otherAgeRange', 'otherRelationship', 'otherContext'];
          fields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
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

  clearOtherInfo() {
    if (confirm('Are you sure you want to clear all Other Party Information? This action cannot be undone.')) {
      try {
        const fields = ['otherName', 'otherLocation', 'otherGender', 'otherAgeRange', 'otherRelationship', 'otherContext'];
        
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

