// Content script for Google Meet integration
class MeetIntegration {
  constructor() {
    this.isActive = false;
    this.audioStream = null;
    this.speechRecognition = null;
    this.lastTranscript = '';
    this.transcriptBuffer = [];
    
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
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.speechRecognition = new SpeechRecognition();
    
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';

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

      if (finalTranscript) {
        this.handleTranscript(finalTranscript);
      }
    };

    this.speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };
  }

  handleTranscript(transcript) {
    // Clean up transcript
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript || cleanTranscript === this.lastTranscript) return;

    this.lastTranscript = cleanTranscript;
    this.transcriptBuffer.push({
      text: cleanTranscript,
      timestamp: Date.now(),
      speaker: 'other' // Assuming it's the other party speaking
    });

    // Send transcript to background script
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPT_RECEIVED',
      transcript: cleanTranscript,
      timestamp: Date.now()
    });

    // Send to Google Translate if active
    this.sendToTranslate(cleanTranscript);
  }

  sendToTranslate(transcript) {
    // Send message to translate content script
    chrome.runtime.sendMessage({
      type: 'SEND_TO_TRANSLATE',
      text: transcript
    });
  }

  toggleCounselor() {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      this.startListening();
    } else {
      this.stopListening();
    }

    // Update button state
    const button = document.querySelector('.meet-counselor-button');
    if (button) {
      button.classList.toggle('active', this.isActive);
    }
  }

  startListening() {
    if (this.speechRecognition) {
      this.speechRecognition.start();
      console.log('Started listening for speech');
    }
  }

  stopListening() {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
      console.log('Stopped listening for speech');
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'AUDIO_DATA':
        // Process audio data if needed
        break;
      case 'START_RECORDING':
        this.startListening();
        sendResponse({ success: true });
        break;
      case 'STOP_RECORDING':
        this.stopListening();
        sendResponse({ success: true });
        break;
    }
  }
}

// Initialize Meet integration
new MeetIntegration();

