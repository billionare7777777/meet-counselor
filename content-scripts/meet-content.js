// Content script for Google Meet integration
// Prevent multiple initializations using a more robust approach
(function() {
  // Check if already initialized
  if (window.meetCounselorMeetIntegration) {
    console.log('Meet integration already initialized, skipping...');
    return;
  }
  
  // Mark as initialized
  window.meetCounselorMeetIntegration = true;

class MeetIntegration {
  constructor() {
    this.isActive = false;
    this.audioStream = null;
    this.speechRecognition = null;
    this.lastTranscript = '';
    this.transcriptBuffer = [];
    this.lastPermissionAttempt = 0;
    this.permissionCooldown = 5000; // 5 seconds cooldown between permission requests
    this.retryCount = 0;
    this.maxRetries = 3;
    this.isListening = false; // Track if speech recognition is currently running
    
    this.init();
  }

  init() {
    // Wait for Meet to load
    this.waitForMeetLoad();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  waitForMeetLoad() {
    const checkInterval = setInterval(() => {
      if (document.querySelector('[data-is-muted]') || document.querySelector('[jsname="BOHaEe"]')) {
        clearInterval(checkInterval);
        this.setupMeetIntegration();
      }
    }, 1000);
  }

  setupMeetIntegration() {
    // Add Meet Counselor button to Meet interface
    this.addMeetCounselorButton();
    
    // Set up speech recognition
    this.setupSpeechRecognition();
    
    console.log('Meet Counselor integration active');
  }

  addMeetCounselorButton() {
    // Find the Meet toolbar
    const toolbar = document.querySelector('[jsname="BOHaEe"]') || 
                   document.querySelector('[data-is-muted]')?.closest('[role="toolbar"]');
    
    if (!toolbar) return;

    // Create Meet Counselor button
    const counselorButton = document.createElement('div');
    counselorButton.className = 'meet-counselor-button';
    counselorButton.innerHTML = `
      <div class="counselor-icon" title="Meet Counselor">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    `;

    // Add click handler
    counselorButton.addEventListener('click', () => {
      this.toggleCounselor();
    });

    // Insert button into toolbar
    toolbar.appendChild(counselorButton);
  }

  setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.speechRecognition = new SpeechRecognition();
    
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';
      this.speechRecognition.maxAlternatives = 1;

    this.speechRecognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

        // Log interim transcript for real-time feedback
        if (interimTranscript) {
          console.log('🎤 Interim transcript:', interimTranscript);
        }

        // Log final transcript when complete
      if (finalTranscript) {
          console.log('🗣️ Final transcript:', finalTranscript);
          console.log('📝 Conversation logged:', {
            timestamp: new Date().toISOString(),
            text: finalTranscript,
            length: finalTranscript.length
          });
        this.handleTranscript(finalTranscript);
      }
    };

    this.speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
        
        // Handle specific error types
        switch (event.error) {
          case 'not-allowed':
            console.error('Microphone permission denied. Please allow microphone access for this site.');
            chrome.runtime.sendMessage({
              type: 'RECORDING_ERROR',
              error: 'Permission denied. Please allow microphone access for this site.'
            });
            break;
          case 'no-speech':
            console.warn('No speech detected - this is normal, continuing to listen...');
            // Don't treat no-speech as an error, just continue listening
            return;
          case 'audio-capture':
            console.error('No microphone found');
            chrome.runtime.sendMessage({
              type: 'RECORDING_ERROR',
              error: 'No microphone found'
            });
            break;
          case 'network':
            console.error('Network error during speech recognition');
            chrome.runtime.sendMessage({
              type: 'RECORDING_ERROR',
              error: 'Network error during speech recognition'
            });
            break;
          case 'aborted':
            console.log('Speech recognition aborted');
            break;
          case 'language-not-supported':
            console.error('Language not supported');
            chrome.runtime.sendMessage({
              type: 'RECORDING_ERROR',
              error: 'Language not supported'
            });
            break;
          default:
            console.error('Speech recognition error:', event.error);
            chrome.runtime.sendMessage({
              type: 'RECORDING_ERROR',
              error: `Speech recognition error: ${event.error}`
            });
        }
        
        // Stop listening on critical errors
        if (event.error === 'not-allowed' || event.error === 'audio-capture' || event.error === 'network') {
          console.log(`❌ Critical error detected: ${event.error}, stopping speech recognition`);
          this.isListening = false;
          this.stopListening();
        }
      };

      this.speechRecognition.onstart = () => {
        console.log('Speech recognition started');
        this.isListening = true;
      };

      this.speechRecognition.onend = () => {
        console.log('🔄 Speech recognition ended (this is normal behavior)');
        console.log('📊 Current state - isActive:', this.isActive, 'isListening:', this.isListening);
        this.isListening = false;
        
        // Auto-restart if we're supposed to be listening (continuous mode)
        if (this.isActive) {
          console.log('🔄 Auto-restarting speech recognition for continuous listening...');
          setTimeout(() => {
            if (this.isActive && !this.isListening) {
              console.log('🔄 Restarting speech recognition...');
              this.startListening();
            } else {
              console.log('⚠️ Skipping restart - isActive:', this.isActive, 'isListening:', this.isListening);
            }
          }, 500); // Shorter delay for faster restart
        } else {
          console.log('✅ Speech recognition ended and not active, not restarting (user stopped)');
        }
      };

      console.log('Speech recognition setup completed');
    } catch (error) {
      console.error('Failed to setup speech recognition:', error);
      this.speechRecognition = null;
    }
  }

  handleTranscript(transcript) {
    // Clean up transcript
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript || cleanTranscript === this.lastTranscript) return;

    console.log('🔄 Processing transcript:', cleanTranscript);

    // Improve sentence recognition and add punctuation
    const improvedTranscript = this.improveSentenceRecognition(cleanTranscript);
    console.log('📝 Improved transcript with punctuation:', improvedTranscript);

    this.lastTranscript = improvedTranscript;
    this.transcriptBuffer.push({
      text: improvedTranscript,
      timestamp: Date.now(),
      speaker: 'other' // Assuming it's the other party speaking
    });

    console.log('📊 Transcript buffer size:', this.transcriptBuffer.length);
    console.log('📋 All conversations in buffer:', this.transcriptBuffer.map(t => ({
      text: t.text,
      timestamp: new Date(t.timestamp).toLocaleTimeString(),
      speaker: t.speaker
    })));

    // Send transcript to background script
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPT_RECEIVED',
      transcript: improvedTranscript,
      timestamp: Date.now()
    });

    // IMMEDIATELY send to Google Translate - this is the main requirement
    this.sendToTranslateImmediately(improvedTranscript);

    // Also send ALL conversations from buffer to show complete history
    this.sendAllConversationsToTranslate();

    console.log('✅ Transcript sent to background script and Google Translate');
  }

  improveSentenceRecognition(text) {
    console.log('🧠 Improving sentence recognition for:', text);
    
    // Clean up the text first
    let improvedText = text.trim();
    
    // Remove extra spaces
    improvedText = improvedText.replace(/\s+/g, ' ');
    
    // Question detection patterns
    const questionWords = ['what', 'where', 'when', 'why', 'how', 'who', 'which', 'whose', 'whom'];
    const questionPhrases = ['can you', 'could you', 'would you', 'do you', 'are you', 'is it', 'will you', 'have you', 'did you'];
    
    // Check if it's a question
    const isQuestion = this.detectQuestion(improvedText, questionWords, questionPhrases);
    
    // Add appropriate punctuation
    if (isQuestion) {
      if (!improvedText.endsWith('?')) {
        improvedText += '?';
      }
    } else {
      // Check if it needs a period
      if (!improvedText.endsWith('.') && !improvedText.endsWith('!') && !improvedText.endsWith('?')) {
        improvedText += '.';
      }
    }
    
    // Add commas for natural pauses and conjunctions
    improvedText = this.addCommas(improvedText);
    
    // Capitalize first letter
    improvedText = this.capitalizeFirstLetter(improvedText);
    
    console.log('✅ Sentence recognition improved:', improvedText);
    return improvedText;
  }

  detectQuestion(text, questionWords, questionPhrases) {
    const lowerText = text.toLowerCase();
    
    // Check for question words at the beginning
    for (const word of questionWords) {
      if (lowerText.startsWith(word + ' ')) {
        return true;
      }
    }
    
    // Check for question phrases
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

  addCommas(text) {
    // Add commas before conjunctions (but not if already has comma)
    const conjunctions = ['and', 'but', 'or', 'so', 'yet', 'for', 'nor'];
    
    for (const conjunction of conjunctions) {
      // Only add comma if there isn't already one before the conjunction
      const regex = new RegExp(`(?!,\\s)\\s+${conjunction}\\s+`, 'gi');
      text = text.replace(regex, `, ${conjunction} `);
    }
    
    // Add commas after introductory phrases (but not if already has comma)
    const introPhrases = [
      'first', 'second', 'third', 'finally', 'however', 'therefore', 'moreover', 
      'furthermore', 'meanwhile', 'consequently', 'additionally', 'specifically',
      'in addition', 'on the other hand', 'for example', 'as a result'
    ];
    
    for (const phrase of introPhrases) {
      // Only add comma if phrase is at start or after period/question/exclamation
      const regex = new RegExp(`(^|[.!?]\\s+)${phrase}\\s+`, 'gi');
      text = text.replace(regex, `$1${phrase}, `);
    }
    
    // Add commas around relative clauses (but be careful not to over-punctuate)
    const relativeClauses = ['which', 'who', 'whom', 'whose'];
    for (const clause of relativeClauses) {
      // Only add comma if it's not already there and it's in the middle of a sentence
      const regex = new RegExp(`(?!,\\s)\\s+${clause}\\s+`, 'gi');
      text = text.replace(regex, `, ${clause} `);
    }
    
    // Add commas in lists (detect patterns like "A and B and C")
    text = this.addCommasInLists(text);
    
    return text;
  }

  addCommasInLists(text) {
    // Detect list patterns and add commas
    // Pattern: "A and B and C" -> "A, B, and C"
    const listPattern = /\b(\w+)\s+and\s+(\w+)\s+and\s+(\w+)\b/gi;
    text = text.replace(listPattern, '$1, $2, and $3');
    
    // Pattern: "A B and C" -> "A, B, and C" (for longer phrases)
    const longListPattern = /\b([^,]+?)\s+and\s+([^,]+?)\s+and\s+([^,]+?)\b/gi;
    text = text.replace(longListPattern, '$1, $2, and $3');
    
    return text;
  }

  capitalizeFirstLetter(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  sendToTranslateImmediately(transcript) {
    console.log('🌐 IMMEDIATELY sending to Google Translate via background script:', transcript);
    
    // Send to background script to handle tab communication
    chrome.runtime.sendMessage({
      type: 'SEND_TO_TRANSLATE_IMMEDIATELY',
      content: transcript
    });
    
    console.log('📤 Translation request sent to background script');
  }

  sendAllConversationsToTranslate() {
    if (this.transcriptBuffer.length === 0) {
      console.log('📝 No conversations in buffer to send');
      return;
    }

    console.log('📚 Sending ALL conversations from buffer to Google Translate');
    
    // Format all conversations with timestamps
    const allConversations = this.transcriptBuffer.map(t => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      return `[${time}] ${t.text}`;
    }).join('\n\n');

    console.log('📋 Formatted all conversations:', allConversations);

    // Send to background script to handle tab communication
    chrome.runtime.sendMessage({
      type: 'SEND_ALL_CONVERSATIONS_TO_TRANSLATE',
      content: allConversations,
      conversationCount: this.transcriptBuffer.length
    });
    
    console.log('📤 All conversations sent to background script');
  }

  sendToTranslate(transcript) {
    console.log('🌐 Sending to Google Translate:', transcript);
    
    // Send message to translate content script
    chrome.runtime.sendMessage({
      type: 'SEND_TO_TRANSLATE',
      text: transcript
    });
    
    console.log('📤 Translation request sent');
  }

  async toggleCounselor() {
    const previousState = this.isActive;
    this.isActive = !this.isActive;
    console.log(`🔄 Toggle: isActive changed from ${previousState} to ${this.isActive}`);
    
    if (this.isActive) {
      console.log('🔄 Starting speech recognition...');
      // Don't wait for startListening to complete - let it handle retries in the background
      this.startListening().then(success => {
        if (!success) {
          console.log('⚠️ Initial start failed, but retry mechanism will handle it');
        }
      });
    } else {
      console.log('🛑 Stopping speech recognition...');
      this.stopListening();
    }

    // Update button state
    const button = document.querySelector('.meet-counselor-button');
    if (button) {
      button.classList.toggle('active', this.isActive);
    }
  }

  async startListening() {
    if (!this.speechRecognition) {
      console.warn('Speech recognition not available');
      return false;
    }

    try {
      // Request microphone permission first
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        console.error('Microphone permission denied');
        chrome.runtime.sendMessage({
          type: 'RECORDING_ERROR',
          error: 'Microphone permission denied. Please allow microphone access for this site.'
        });
        return false;
      }

      // Add a small delay to ensure microphone is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if speech recognition is already running
      if (this.isListening) {
        console.log('Speech recognition already running');
        return true;
      }
      
      this.speechRecognition.start();
      console.log('🎤 Started listening for speech (continuous mode)');
      this.retryCount = 0; // Reset retry count on success
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      
      // For continuous mode, keep trying to restart if we're still active
      if (this.isActive && !this.isListening) {
        this.retryCount++;
        console.log(`Retrying speech recognition (attempt ${this.retryCount})...`);
        
        // Wait before retrying with exponential backoff, but cap at 5 seconds
        const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.startListening();
      } else if (this.isListening) {
        console.log('Speech recognition is already running, skipping retry');
        return true;
      }
      
      // Send error to background script only if we're not in continuous mode
      if (!this.isActive) {
        chrome.runtime.sendMessage({
          type: 'RECORDING_ERROR',
          error: `Failed to start speech recognition: ${error.message}`
        });
      }
      
      return false;
    }
  }

  async requestMicrophonePermission() {
    const now = Date.now();
    
    // Check cooldown to prevent repeated permission requests
    if (now - this.lastPermissionAttempt < this.permissionCooldown) {
      console.log('Permission request on cooldown, skipping...');
      return true; // Assume permission is available during cooldown
    }
    
    this.lastPermissionAttempt = now;
    
    try {
      // Always request microphone access using getUserMedia as the definitive test
      console.log('Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Permission granted, close the stream immediately
      stream.getTracks().forEach(track => track.stop());
      console.log('Microphone access confirmed');
      return true;
      
    } catch (error) {
      console.error('Microphone access denied:', error);
      
      // Send specific error messages based on error type
      let errorMessage = 'Microphone access denied';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access for this site.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      }
      
      chrome.runtime.sendMessage({
        type: 'RECORDING_ERROR',
        error: errorMessage
      });
      
      return false;
    }
  }

  stopListening() {
    console.log('🛑 Stopping speech recognition...');
    console.log(`🔄 Setting isActive from ${this.isActive} to false`);
    this.isActive = false; // Set to inactive to prevent auto-restart
    
    if (this.speechRecognition && this.isListening) {
      try {
        this.speechRecognition.stop();
        this.isListening = false;
        console.log('✅ Stopped listening for speech');
        return true;
      } catch (error) {
        console.error('❌ Failed to stop speech recognition:', error);
        return false;
      }
    } else {
      console.log('ℹ️ Speech recognition not available or not listening');
      this.isListening = false; // Ensure flag is set
      return true; // Consider it successful if already stopped
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message.type, 'from:', sender);
    
    switch (message.type) {
      case 'AUDIO_DATA':
        // Process audio data if needed
        break;
      case 'START_RECORDING':
        console.log('Processing START_RECORDING message...');
        this.isActive = true; // Set active flag for continuous mode
        console.log(`🔄 Setting isActive to true for START_RECORDING`);
        const startResult = await this.startListening();
        console.log('START_RECORDING result:', startResult);
        const response = { success: startResult };
        console.log('Sending response:', response);
        sendResponse(response);
        break;
      case 'STOP_RECORDING':
        console.log('Processing STOP_RECORDING message...');
        const stopResult = this.stopListening();
        console.log('STOP_RECORDING result:', stopResult);
        sendResponse({ success: stopResult });
        break;
    }
    
    return true; // Indicate that we will send a response asynchronously
  }
}

// Initialize Meet integration
const meetIntegration = new MeetIntegration();

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Chrome runtime message received:', message.type);
  return meetIntegration.handleMessage(message, sender, sendResponse);
});

})(); // End of IIFE

