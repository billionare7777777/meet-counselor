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
          try {
            await this.startRecording(sender.tab);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Error in START_RECORDING handler:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        case 'STOP_RECORDING':
          try {
            await this.stopRecording(sender.tab);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Error in STOP_RECORDING handler:', error);
            sendResponse({ success: false, error: error.message });
          }
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
          
        case 'SEND_TO_TRANSLATE_IMMEDIATELY':
          await this.sendToTranslateImmediately(message.content);
          sendResponse({ success: true });
          break;
          
        case 'SEND_ALL_CONVERSATIONS_TO_TRANSLATE':
          await this.sendAllConversationsToTranslate(message.content, message.conversationCount);
          sendResponse({ success: true });
          break;
          
        case 'RECORDING_ERROR':
          console.error('Recording error from content script:', message.error);
          // Stop recording if there's an error
          this.isRecording = false;
          break;
          
        case 'TRANSCRIPT_RECEIVED':
          console.log('🎙️ Transcript received in background script:', message.transcript);
          console.log('📅 Timestamp:', new Date(message.timestamp).toLocaleString());
          
          // Store transcript in conversation history
          this.conversationHistory.push({
            text: message.transcript,
            timestamp: message.timestamp,
            speaker: 'other',
            source: 'speech_recognition'
          });
          
          // Save conversation history to storage
          await chrome.storage.local.set({ conversationHistory: this.conversationHistory });
          
          console.log('💾 Transcript stored in conversation history and saved to storage');
          console.log('📚 Total conversation history length:', this.conversationHistory.length);
          break;
          
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
    
    return true; // Indicate that we will send a response asynchronously
  }

  async startRecording(tab) {
    try {
      if (!tab) {
        // Get active tab if not provided
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = activeTab;
        console.log('No tab provided, using active tab:', tab?.url);
      }
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      console.log('Attempting to start recording on tab:', tab.url);
      console.log('Tab ID:', tab.id);
      
      // Check if content script is available
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
        console.log('Content script response:', response);
        console.log('Response type:', typeof response);
        console.log('Response success:', response?.success);
        
        if (response && response.success === true) {
          this.isRecording = true;
          console.log('Recording started via content script');
        } else {
          console.error('Content script response was not successful:', response);
          throw new Error('Content script did not confirm recording start');
        }
      } catch (messageError) {
        console.error('Failed to communicate with content script:', messageError);
        throw new Error('Content script not available. Please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(tab) {
    try {
      if (!tab) {
        // Get active tab if not provided
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = activeTab;
      }
      
      if (tab) {
        console.log('Attempting to stop recording on tab:', tab.url);
        
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });
          console.log('Stop recording response:', response);
        } catch (messageError) {
          console.error('Failed to communicate with content script for stop:', messageError);
        }
      }
      
      this.isRecording = false;
      console.log('Recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      // Still set recording to false even if content script fails
      this.isRecording = false;
    }
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
    return context.conversationHistory.slice(-15)
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

  async sendToTranslateImmediately(content) {
    try {
      console.log('🌐 Background script: Sending to Google Translate immediately:', content);
      
      // Find Google Translate tab
      const tabs = await chrome.tabs.query({});
      const translateTab = tabs.find(tab => tab.url && tab.url.includes('translate.google.com'));
      
      if (translateTab) {
        console.log('📤 Found Google Translate tab, sending content:', translateTab.id);
        await chrome.tabs.sendMessage(translateTab.id, {
          type: 'INSERT_TRANSLATE_CONTENT',
          content: content
        });
        console.log('✅ Content sent to existing Google Translate tab');
      } else {
        console.log('⚠️ No Google Translate tab found, opening new one...');
        // Open Google Translate and send content
        const newTab = await chrome.tabs.create({
          url: 'https://translate.google.com/'
        });
        
        // Wait for tab to load, then send content
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(newTab.id, {
              type: 'INSERT_TRANSLATE_CONTENT',
              content: content
            });
            console.log('✅ Content sent to new Google Translate tab');
          } catch (error) {
            console.error('Error sending to new translate tab:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error in sendToTranslateImmediately:', error);
      throw error;
    }
  }

  async sendAllConversationsToTranslate(content, conversationCount) {
    try {
      console.log('📚 Background script: Sending ALL conversations to Google Translate');
      console.log('📊 Conversation count:', conversationCount);
      console.log('📋 Full conversation content:', content);
      
      // Find Google Translate tab
      const tabs = await chrome.tabs.query({});
      const translateTab = tabs.find(tab => tab.url && tab.url.includes('translate.google.com'));
      
      if (translateTab) {
        console.log('📤 Found Google Translate tab, sending ALL conversations:', translateTab.id);
        await chrome.tabs.sendMessage(translateTab.id, {
          type: 'REPLACE_ALL_CONVERSATIONS',
          content: content,
          conversationCount: conversationCount
        });
        console.log('✅ All conversations sent to existing Google Translate tab');
      } else {
        console.log('⚠️ No Google Translate tab found, opening new one...');
        // Open Google Translate and send content
        const newTab = await chrome.tabs.create({
          url: 'https://translate.google.com/'
        });
        
        // Wait for tab to load, then send content
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(newTab.id, {
              type: 'REPLACE_ALL_CONVERSATIONS',
              content: content,
              conversationCount: conversationCount
            });
            console.log('✅ All conversations sent to new Google Translate tab');
          } catch (error) {
            console.error('Error sending all conversations to new translate tab:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error in sendAllConversationsToTranslate:', error);
      throw error;
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
      if (settings.myInfo.location) {
        prompt += ` from ${settings.myInfo.location}`;
      }
      if (settings.myInfo.experience) {
        prompt += ` with ${settings.myInfo.experience} experience`;
      }
      if (settings.myInfo.profile) {
        prompt += `. Profile: ${settings.myInfo.profile}`;
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
      if (settings.otherInfo.location) {
        prompt += ` from ${settings.otherInfo.location}`;
      }
      if (settings.otherInfo.context) {
        prompt += `. Context: ${settings.otherInfo.context}`;
      }
      prompt += ". ";
    }
    
    // Add job information
    if (settings.jobInfo) {
      if (settings.jobInfo.jobTitle) {
        prompt += `This conversation is related to a ${settings.jobInfo.jobTitle} position. `;
      }
      if (settings.jobInfo.jobDescription) {
        prompt += `Job Description: ${settings.jobInfo.jobDescription}. `;
      }
      if (settings.jobInfo.myProposal) {
        prompt += `Your Proposal: ${settings.jobInfo.myProposal}. `;
      }
      if (settings.jobInfo.budgetType && settings.jobInfo.budgetAmount && settings.jobInfo.budgetCurrency) {
        prompt += `Budget: ${settings.jobInfo.budgetAmount} ${settings.jobInfo.budgetCurrency} (${settings.jobInfo.budgetType}). `;
      }
      if (settings.jobInfo.timelineStart && settings.jobInfo.timelineEnd) {
        prompt += `Project Timeline: ${settings.jobInfo.timelineStart} to ${settings.jobInfo.timelineEnd}. `;
      }
      if (settings.jobInfo.timelineDetails) {
        prompt += `Timeline Details: ${settings.jobInfo.timelineDetails}. `;
      }
      if (settings.jobInfo.chatHistory) {
        prompt += `Previous Discussion: ${settings.jobInfo.chatHistory}. `;
      }
    }
    
    // Add conversation context
    if (settings.additional?.conversationContext) {
      prompt += `This is a ${settings.additional.conversationContext} conversation. `;
    }
    
    // Add response style preferences
    if (settings.additional?.responseStyle) {
      prompt += `Response style should be ${settings.additional.responseStyle}. `;
    }
    
    if (settings.additional?.responseLength) {
      prompt += `Keep responses ${settings.additional.responseLength} length. `;
    }
    
    // Add conversation goals
    if (settings.prompt?.conversationGoals) {
      prompt += `Conversation Goals: ${settings.prompt.conversationGoals}. `;
    }
    
    // Add topics to avoid
    if (settings.prompt?.avoidTopics) {
      prompt += `Avoid discussing: ${settings.prompt.avoidTopics}. `;
    }
    
    // Add response examples
    if (settings.prompt?.responseExamples) {
      prompt += `Example responses to follow: ${settings.prompt.responseExamples}. `;
    }
    
    // Add custom prompt if available
    if (settings.prompt?.customPrompt) {
      prompt += settings.prompt.customPrompt + " ";
    }
    
    // Add context-specific instructions
    if (context.type === 'answer') {
      prompt += "You are generating a specific answer to respond to the other person's question or statement. ";
      prompt += "Analyze the conversation context carefully to understand what the other person is asking or saying. ";
      prompt += "Provide a direct, relevant, and helpful response that addresses their specific question or statement. ";
      prompt += "If they asked a question, answer it directly and thoroughly. ";
      prompt += "If they made a statement, acknowledge it and provide a relevant response. ";
      prompt += "Use the conversation history to understand the context and provide a coherent response. ";
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

  buildAnswerPrompt(basePrompt, context) {
    // Analyze conversation history to identify the other person's question
    const conversationHistory = context.conversationHistory || [];
    const otherPersonMessages = conversationHistory.filter(msg => msg.speaker === 'other');
    
    if (otherPersonMessages.length === 0) {
      return basePrompt + "Generate a natural response that I (the user) would say to continue the conversation. Write only what I would say, not a full conversation. Make it sound like authentic American English.";
    }
    
    // Get the most recent message from the other person
    const lastOtherMessage = otherPersonMessages[otherPersonMessages.length - 1];
    const lastMessageText = lastOtherMessage.text || '';
    
    // Get conversation context (last few messages for better understanding)
    const recentMessages = conversationHistory.slice(-3);
    const conversationContext = recentMessages.map(msg => 
      `${msg.speaker === 'other' ? 'Other person' : 'Me'}: ${msg.text}`
    ).join('\n');
    
    // Analyze if it's a question
    const isQuestion = this.isQuestion(lastMessageText);
    
    if (isQuestion) {
      return basePrompt + `CONVERSATION CONTEXT:\n${conversationContext}\n\nThe other person just asked: "${lastMessageText}"\n\nGenerate a natural, helpful answer that I (the user) would say to respond to this specific question. Consider the conversation context to provide a relevant and coherent response. Make it sound like authentic American English. Write only what I would say, not a full conversation.`;
    } else {
      // It's a statement, so generate an appropriate response
      return basePrompt + `CONVERSATION CONTEXT:\n${conversationContext}\n\nThe other person just said: "${lastMessageText}"\n\nGenerate a natural response that I (the user) would say to acknowledge and respond to this statement. Consider the conversation context to provide a relevant and coherent response. Make it sound like authentic American English. Write only what I would say, not a full conversation.`;
    }
  }

  isQuestion(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase().trim();
    
    // Check for question words at the beginning
    const questionWords = ['what', 'where', 'when', 'why', 'how', 'who', 'which', 'whose', 'whom'];
    for (const word of questionWords) {
      if (lowerText.startsWith(word + ' ')) {
        return true;
      }
    }
    
    // Check for question phrases
    const questionPhrases = ['can you', 'could you', 'would you', 'do you', 'are you', 'is it', 'will you', 'have you', 'did you', 'does it'];
    for (const phrase of questionPhrases) {
      if (lowerText.includes(phrase)) {
        return true;
      }
    }
    
    // Check for question patterns
    const questionPatterns = [
      /^(can|could|would|will|do|does|did|are|is|was|were|have|has|had)\s/i,
      /^(what|where|when|why|how|who|which|whose|whom)\s/i,
      /\?\s*$/,
      /\b(please|could you|can you|would you)\b/i
    ];
    
    for (const pattern of questionPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    
    return false;
  }

  buildConversationUserPrompt(context) {
    const settings = context.userSettings;
    let basePrompt = "";
    
    // Add job context if available
    if (settings?.jobInfo?.jobTitle) {
      basePrompt = `This is a conversation about a ${settings.jobInfo.jobTitle} position. `;
      if (settings.jobInfo.jobDescription) {
        basePrompt += `The job involves: ${settings.jobInfo.jobDescription}. `;
      }
    }
    
    switch (context.type) {
      case 'answer':
        return this.buildAnswerPrompt(basePrompt, context);
      case 'chat':
        if (settings?.jobInfo?.jobTitle) {
          return basePrompt + "Generate a professional yet friendly statement or question that I (the user) would say to start a conversation related to the job opportunity. Keep it business-appropriate but warm. Write only what I would say, not a full conversation.";
        } else {
          return basePrompt + "Generate a casual, friendly statement or question that I (the user) would say to start a non-business conversation. Think of things Americans might chat about - hobbies, interests, weekend plans, etc. Write only what I would say, not a full conversation.";
        }
      case 'questions':
        const questionType = context.questionType;
        if (settings?.jobInfo?.jobTitle) {
          switch (questionType) {
            case 'beginning':
              return basePrompt + "Generate 3-5 professional conversation starter questions that I (the user) would ask to begin a job-related conversation. Each question must be exactly one sentence. Make them warm and engaging while staying professional. Write only the questions I would ask.";
            case 'during':
              return basePrompt + "Generate 3-5 follow-up questions that I (the user) would ask during a job-related conversation to keep it flowing naturally. Each question must be exactly one sentence. Write only the questions I would ask.";
            case 'ending':
              return basePrompt + "Generate 3-5 polite conversation closing questions or statements that I (the user) would say to wrap up a job-related conversation gracefully. Each question must be exactly one sentence. Write only what I would say.";
            default:
              return basePrompt + `Generate ${questionType} questions that I (the user) would ask for this job-related conversation. Each question must be exactly one sentence. Write only what I would say.`;
          }
        } else {
          switch (questionType) {
            case 'beginning':
              return basePrompt + "Generate 3-5 natural conversation starter questions that I (the user) would ask to begin a conversation. Each question must be exactly one sentence. Make them warm and engaging. Write only the questions I would ask.";
            case 'during':
              return basePrompt + "Generate 3-5 follow-up questions that I (the user) would ask during a conversation to keep it flowing naturally. Each question must be exactly one sentence. Write only the questions I would ask.";
            case 'ending':
              return basePrompt + "Generate 3-5 polite conversation closing questions or statements that I (the user) would say to wrap up a conversation gracefully. Each question must be exactly one sentence. Write only what I would say.";
            default:
              return basePrompt + `Generate ${questionType} questions that I (the user) would ask for this conversation. Each question must be exactly one sentence. Write only what I would say.`;
          }
        }
      default:
        return basePrompt + "Generate a natural response that I (the user) would say based on the context. Write only what I would say, not a full conversation.";
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
    const result = await chrome.storage.local.get(['userSettings', 'conversationHistory']);
    this.userSettings = result.userSettings || {};
    this.conversationHistory = result.conversationHistory || [];
    console.log('📚 Loaded conversation history from storage:', this.conversationHistory.length, 'conversations');
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

