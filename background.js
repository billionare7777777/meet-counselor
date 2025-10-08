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
          
        case 'GENERATE_CONVERSATION':
          const conversation = await this.generateConversation(message.context);
          sendResponse({ conversation });
          break;
          
        case 'TRANSLATE_CONTENT':
          const translation = await this.translateContent(message.content, message.targetLanguage);
          sendResponse({ translation });
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
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI Response API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid OpenAI response:', data);
        throw new Error('Invalid response from OpenAI API');
      }
      
      const content = data.choices[0].message.content;
      if (!content || typeof content !== 'string') {
        console.error('Invalid content in OpenAI response:', data);
        throw new Error('No valid content in OpenAI response');
      }
      
      return content.trim();
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
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
    return context.conversationHistory.slice(-10)
      .filter(msg => msg && msg.text && typeof msg.text === 'string' && msg.text.trim().length > 0)
      .map(msg => ({
        role: msg.speaker === 'me' ? 'assistant' : 'user',
        content: String(msg.text).trim()
      }));
  }

  async generateConversation(context) {
    try {
      const openaiApiKey = await this.getOpenAIApiKey();
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured. Please add your API key in the extension settings.');
      }
      
      // Get user settings for context
      const settings = await this.getSettings();
      
      // Build system prompt based on settings and context
      let systemPrompt = this.buildConversationSystemPrompt(settings, context);
      if (!systemPrompt || typeof systemPrompt !== 'string' || systemPrompt.trim().length === 0) {
        throw new Error('Invalid system prompt generated');
      }
      
      // Build conversation history for context
      let conversationHistory = this.buildConversationHistory(context);
      
      // Build user prompt
      let userPrompt = this.buildConversationUserPrompt(context);
      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
        throw new Error('Invalid user prompt generated');
      }
      
      // Validate API key format
      if (!openaiApiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }
      
      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt.trim() },
          ...conversationHistory,
          { role: 'user', content: userPrompt.trim() }
        ],
        max_tokens: 500,
        temperature: 0.8,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };
      
      console.log('OpenAI API Request:', {
        model: requestBody.model,
        messageCount: requestBody.messages.length,
        maxTokens: requestBody.max_tokens
      });
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid OpenAI API response:', data);
        throw new Error('Invalid response from OpenAI API');
      }
      
      const content = data.choices[0].message.content;
      if (!content || typeof content !== 'string') {
        console.error('Invalid content in OpenAI response:', data);
        throw new Error('No valid content in OpenAI response');
      }
      
      // Format the response based on conversation type
      return this.formatConversationResponse(content.trim(), context);
      
    } catch (error) {
      console.error('Error generating conversation:', error);
      throw new Error(`Failed to generate conversation: ${error.message}`);
    }
  }

  async translateContent(content, targetLanguage) {
    try {
      const openaiApiKey = await this.getOpenAIApiKey();
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured.');
      }
      
      const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'hi': 'Hindi'
      };
      
      const targetLanguageName = languageNames[targetLanguage] || targetLanguage;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `You are a professional translator. Translate the following text to ${targetLanguageName}. Maintain the original tone, style, and formatting. If the text contains conversation messages, preserve the conversational structure.` 
            },
            { role: 'user', content: content }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI Translation API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid OpenAI translation response:', data);
        throw new Error('Invalid response from OpenAI API');
      }
      
      const translation = data.choices[0].message.content;
      if (!translation || typeof translation !== 'string') {
        console.error('Invalid translation in OpenAI response:', data);
        throw new Error('No valid translation in OpenAI response');
      }
      
      return translation.trim();
      
    } catch (error) {
      console.error('Error translating content:', error);
      throw new Error(`Failed to translate content: ${error.message}`);
    }
  }

  buildConversationSystemPrompt(settings, context) {
    let prompt = "You are Meet Counselor, an AI assistant that helps create natural, engaging responses for Google Meet calls. ";
    
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
      if (settings.otherInfo.ageRange) {
        prompt += `, age range ${settings.otherInfo.ageRange}`;
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
    
    // Add American conversation style instructions
    prompt += "Generate responses that sound natural and authentic to American English speakers. ";
    prompt += "Use common American expressions, idioms, and conversational patterns. ";
    prompt += "Make the response feel genuine, warm, and engaging. ";
    prompt += "Avoid overly formal language unless the context specifically requires it. ";
    prompt += "IMPORTANT: Generate only what the user would say, not a full conversation or dialogue. ";
    prompt += "Do not include responses from the other party or create back-and-forth conversations. ";
    
    return prompt;
  }

  buildConversationUserPrompt(context) {
    switch (context.type) {
      case 'answer':
        return "Generate a natural response that I (the user) would say to answer the other party's question or address their statement. Write only what I would say, not a full conversation. Make it sound like authentic American English.";
      case 'chat':
        return "Generate a casual, friendly statement or question that I (the user) would say to start a non-business conversation. Think of things Americans might chat about - hobbies, interests, weekend plans, etc. Write only what I would say, not a full conversation.";
      case 'questions':
        const questionType = context.questionType;
        switch (questionType) {
          case 'beginning':
            return "Generate 3-5 natural conversation starter questions that I (the user) would ask to begin a conversation. Each question must be exactly one sentence. Make them warm and engaging. Write only the questions I would ask.";
          case 'during':
            return "Generate 3-5 follow-up questions that I (the user) would ask during a conversation to keep it flowing naturally. Each question must be exactly one sentence. Write only the questions I would ask.";
          case 'ending':
            return "Generate 3-5 polite conversation closing questions or statements that I (the user) would say to wrap up a conversation gracefully. Each question must be exactly one sentence. Write only what I would say.";
          default:
            return `Generate ${questionType} questions that I (the user) would ask for this conversation. Each question must be exactly one sentence. Write only what I would say.`;
        }
      default:
        return "Generate a natural response that I (the user) would say based on the context. Write only what I would say, not a full conversation.";
    }
  }

  formatConversationResponse(content, context) {
    // Format the response based on conversation type
    if (context.type === 'questions') {
      // Format as a list of questions, ensuring each is a single sentence
      const questions = content.split('\n').filter(line => line.trim()).map(line => {
        let cleanLine = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
        
        // Ensure the question ends with a question mark if it's a question
        if (!cleanLine.endsWith('?') && !cleanLine.endsWith('.') && !cleanLine.endsWith('!')) {
          cleanLine += '?';
        }
        
        // Split on sentence boundaries and take only the first sentence
        const sentences = cleanLine.split(/[.!?]+/);
        if (sentences.length > 1) {
          cleanLine = sentences[0].trim();
          // Add back the appropriate punctuation
          if (cleanLine.toLowerCase().includes('what') || cleanLine.toLowerCase().includes('how') || 
              cleanLine.toLowerCase().includes('when') || cleanLine.toLowerCase().includes('where') || 
              cleanLine.toLowerCase().includes('why') || cleanLine.toLowerCase().includes('who') ||
              cleanLine.toLowerCase().includes('do') || cleanLine.toLowerCase().includes('can') ||
              cleanLine.toLowerCase().includes('would') || cleanLine.toLowerCase().includes('could') ||
              cleanLine.toLowerCase().includes('should') || cleanLine.toLowerCase().includes('will')) {
            cleanLine += '?';
          } else {
            cleanLine += '.';
          }
        }
        
        return {
          sender: 'user',
          content: cleanLine
        };
      });
      return questions;
    } else {
      // Format as a single response from the user (not a conversation)
      return {
        sender: 'user',
        content: content.trim()
      };
    }
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

