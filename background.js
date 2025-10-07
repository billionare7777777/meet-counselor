// Background script for Meet Counselor extension
class MeetCounselorBackground {
  constructor() {
    this.isRecording = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.conversationHistory = [];
    this.userSettings = {};
    
    this.init();
  }

  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Set up tab update listeners
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.handleTabUpdate(tabId, tab);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'START_RECORDING':
          await this.startRecording();
          sendResponse({ success: true });
          break;
          
        case 'STOP_RECORDING':
          await this.stopRecording();
          sendResponse({ success: true });
          break;
          
        case 'SAVE_SETTINGS':
          await this.saveSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'GET_SETTINGS':
          sendResponse({ settings: this.userSettings });
          break;
          
        case 'SAVE_CONVERSATION':
          await this.saveConversation(message.conversation);
          sendResponse({ success: true });
          break;
          
        case 'GET_CONVERSATION_HISTORY':
          sendResponse({ history: this.conversationHistory });
          break;
          
        case 'GENERATE_RESPONSE':
          const response = await this.generateResponse(message.context);
          sendResponse({ response });
          break;
          
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  async startRecording() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // Set up audio processing
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        this.processAudioData(event.inputBuffer);
      };
      
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isRecording = false;
    console.log('Recording stopped');
  }

  processAudioData(audioBuffer) {
    // Convert audio to text using Web Speech API or send to external service
    // This is a simplified implementation - in production, you'd use a proper speech-to-text service
    const audioData = audioBuffer.getChannelData(0);
    
    // Send audio data to content script for processing
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'AUDIO_DATA',
          audioData: Array.from(audioData)
        });
      }
    });
  }

  async generateResponse(context) {
    try {
      const openaiApiKey = await this.getOpenAIApiKey();
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please add your API key in the extension settings.');
      }
      
      // Get user settings for context
      const settings = await this.getSettings();
      
      // Build system prompt based on settings and context
      let systemPrompt = this.buildSystemPrompt(settings, context);
      
      // Build conversation history for context
      let conversationHistory = this.buildConversationHistory(context);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: this.buildUserPrompt(context) }
          ],
          max_tokens: 200,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback to contextual responses
      return this.getFallbackResponse(context);
    }
  }

  buildSystemPrompt(settings, context) {
    let prompt = "You are Meet Counselor, an AI assistant that helps with conversations during Google Meet calls. ";
    
    // Add user information
    if (settings.myInfo) {
      prompt += `You are helping ${settings.myInfo.name || 'the user'}`;
      if (settings.myInfo.communicationStyle) {
        prompt += ` who prefers ${settings.myInfo.communicationStyle} communication style`;
      }
      if (settings.myInfo.occupation) {
        prompt += ` and works as a ${settings.myInfo.occupation}`;
      }
      prompt += ". ";
    }
    
    // Add other party information
    if (settings.otherInfo) {
      prompt += `The other party is ${settings.otherInfo.name || 'unknown'}`;
      if (settings.otherInfo.relationship) {
        prompt += ` (${settings.otherInfo.relationship})`;
      }
      prompt += ". ";
    }
    
    // Add conversation context
    if (settings.additional?.conversationContext) {
      prompt += `This is a ${settings.additional.conversationContext} conversation. `;
    }
    
    // Add custom prompt if available
    if (settings.prompt?.customPrompt) {
      prompt += settings.prompt.customPrompt + " ";
    }
    
    // Add response style instructions
    const responseStyle = settings.additional?.responseStyle || 'balanced';
    const responseLength = settings.additional?.responseLength || 'medium';
    
    prompt += `Generate responses that are ${responseStyle} in tone and ${responseLength} in length. `;
    prompt += "Use natural, conversational American English. ";
    prompt += "Be helpful, engaging, and appropriate for the conversation context.";
    
    return prompt;
  }

  buildConversationHistory(context) {
    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return [];
    }
    
    // Convert conversation history to OpenAI format
    return context.conversationHistory.slice(-10).map(msg => ({
      role: msg.speaker === 'me' ? 'assistant' : 'user',
      content: msg.text
    }));
  }

  buildUserPrompt(context) {
    switch (context.type) {
      case 'answer':
        return "Generate a helpful response to the other party's question or statement.";
      case 'chat':
        return "Generate a casual conversation topic or question that's not business-related.";
      case 'questions':
        return `Generate ${context.questionType} questions for this conversation.`;
      case 'response':
        return "Generate a natural response based on the conversation context.";
      default:
        return "Generate a helpful response for this conversation.";
    }
  }

  getFallbackResponse(context) {
    const responses = {
      answer: [
        "That's an interesting point. Could you tell me more about that?",
        "I understand what you're saying. What do you think about...",
        "That makes sense. Have you considered...",
        "I see. From my experience, I would suggest...",
        "That's a great question. Let me think about that..."
      ],
      chat: [
        "How has your day been going?",
        "What do you like to do in your free time?",
        "Have you seen any good movies or shows lately?",
        "What's your favorite type of cuisine?",
        "Do you have any hobbies you're passionate about?"
      ],
      questions: {
        beginning: [
          "How are you doing today?",
          "What brings you to this meeting?",
          "Have we met before?",
          "What's your role in this project?",
          "How long have you been working on this?"
        ],
        during: [
          "What are your thoughts on this approach?",
          "Have you encountered this situation before?",
          "What would you recommend?",
          "How do you usually handle this?",
          "What's your experience with this?"
        ],
        ending: [
          "Is there anything else you'd like to discuss?",
          "What are the next steps?",
          "When should we follow up?",
          "Do you have any questions?",
          "Is there anything I can help you with?"
        ]
      }
    };

    if (context.type === 'questions') {
      const questionType = context.questionType || 'beginning';
      const questionList = responses.questions[questionType] || responses.questions.beginning;
      return questionList[Math.floor(Math.random() * questionList.length)];
    }

    const responseList = responses[context.type] || responses.answer;
    return responseList[Math.floor(Math.random() * responseList.length)];
  }

  async getSettings() {
    const result = await chrome.storage.local.get(['userSettings']);
    return result.userSettings || {};
  }

  async getOpenAIApiKey() {
    // Get from extension settings
    const settings = await this.getSettings();
    if (settings.apiKeys && settings.apiKeys.openai) {
      return settings.apiKeys.openai;
    }

    // No fallback - user must configure API key in settings
    return null;
  }

  async saveSettings(settings) {
    this.userSettings = { ...this.userSettings, ...settings };
    await chrome.storage.local.set({ userSettings: this.userSettings });
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['userSettings']);
    this.userSettings = result.userSettings || {};
  }

  async saveConversation(conversation) {
    this.conversationHistory.push({
      ...conversation,
      timestamp: Date.now()
    });
    await chrome.storage.local.set({ conversationHistory: this.conversationHistory });
  }

  handleTabUpdate(tabId, tab) {
    // Inject content scripts when user navigates to Meet or Translate
    if (tab.url.includes('meet.google.com')) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/meet-content.js']
      });
    } else if (tab.url.includes('translate.google.com')) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/translate-content.js']
      });
    }
  }
}

// Initialize the background script
new MeetCounselorBackground();

