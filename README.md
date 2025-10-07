# Meet Counselor

An AI-powered Chrome extension that enhances Google Meet conversations with real-time transcription, translation, and intelligent response generation.

## Features

### 🎯 Core Functionality
- **Real-time Speech Recognition**: Captures and transcribes speech from Google Meet calls
- **Google Translate Integration**: Automatically sends transcriptions to Google Translate for real-time translation
- **AI Response Generation**: Generates contextual responses and conversation suggestions
- **Conversation Management**: Archive and manage conversation history

### 🛠️ Extension Interface
- **Settings Panel**: Comprehensive configuration for personal information and preferences
- **Quick Actions**: Easy access to common functions from the extension popup
- **Conversation Tools**: Generate responses, create questions, and manage conversations
- **History Management**: View, export, and import conversation archives

### 🎨 User Experience
- **Seamless Integration**: Works directly within Google Meet and Google Translate
- **American Chat Style**: Generates conversations in natural, American-style communication
- **Customizable Prompts**: Configure AI behavior with custom prompts and examples
- **Multi-language Support**: Translate conversations to multiple languages

## Installation

### Prerequisites
- Google Chrome browser
- Node.js (for development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/meet-counselor.git
   cd meet-counselor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env file and add your OpenAI API key
   ```

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

### Production Installation

1. Download the latest release from the [Releases page](https://github.com/your-username/meet-counselor/releases)
2. Extract the ZIP file
3. Follow the Chrome extension loading steps above

## Usage

### Getting Started

1. **Open Google Meet**: Start or join a meeting at [meet.google.com](https://meet.google.com)
2. **Open Google Translate**: Navigate to [translate.google.com](https://translate.google.com) in another tab
3. **Activate Extension**: Click the Meet Counselor button in the Meet interface
4. **Configure Settings**: Use the extension popup to set up your personal information and preferences

### Key Features

#### Real-time Transcription
- Click the Meet Counselor button in Google Meet to start recording
- Speech is automatically transcribed and sent to Google Translate
- View real-time transcriptions in the extension panel

#### AI Response Generation
- **Create Answer**: Generate responses to questions from other participants
- **Create Chat**: Generate casual conversation topics
- **Create Questions**: Generate questions for different conversation phases:
  - Beginning questions (ice breakers)
  - During conversation (engagement questions)
  - Ending questions (wrap-up questions)

#### Settings Configuration
- **My Information**: Personal details, communication style, and experience
- **Other Party's Information**: Details about conversation partners
- **Conversation History**: Manage and export conversation archives
- **Additional Settings**: Language preferences, response styles, and automation
- **Prompt Settings**: Customize AI behavior with custom prompts

### Extension Interface

#### Popup Controls
- **Start/Stop Recording**: Toggle audio capture
- **Settings**: Open comprehensive settings page
- **Quick Tools**: Generate responses, create questions, view history, export data

#### Google Translate Integration
- Extension panel appears on the right side of Google Translate
- Real-time conversation display with translation
- Quick access to conversation tools and settings

## Configuration

### Personal Information
Configure your details to generate more personalized responses:
- Name, age, location, gender
- Occupation and professional background
- Communication style preferences
- Experience and expertise areas

### AI Behavior
Customize how the AI generates responses:
- Response style (formal, casual, friendly, professional)
- Response length (short, medium, long)
- Conversation context (business, casual, educational)
- Custom prompts and examples

### Form Persistence
- **Auto-save**: All form inputs are automatically saved to localStorage
- **Page Reload**: Form values persist across page reloads and browser sessions
- **Real-time Saving**: Changes are saved as you type
- **Cross-tab Sync**: Settings are shared across extension tabs
- **Data Management**: Clear form data or reset to defaults anytime

### Translation Settings
- Target language selection
- Auto-translation preferences
- Language-specific conversation styles

### API Key Configuration
- **OpenAI API Key**: Required for AI response generation
- Secure storage in extension settings
- Real-time validation and status indicators
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

## Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Content Scripts**: Integration with Google Meet and Google Translate
- **Background Script**: Audio processing and message handling
- **Storage API**: Local data persistence
- **Web Speech API**: Real-time speech recognition

### File Structure
```
meet-counselor/
├── manifest.json              # Extension manifest
├── background.js              # Background service worker
├── popup.html                 # Extension popup interface
├── popup.css                  # Popup styles
├── popup.js                   # Popup functionality
├── settings.html              # Settings page
├── settings.css               # Settings styles
├── settings.js                # Settings functionality
├── content-scripts/
│   ├── meet-content.js        # Google Meet integration
│   ├── meet-styles.css        # Meet integration styles
│   ├── translate-content.js   # Google Translate integration
│   └── translate-styles.css   # Translate integration styles
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

### APIs Used
- **Chrome Extensions API**: Extension functionality
- **Web Speech API**: Speech recognition
- **Chrome Storage API**: Data persistence
- **Chrome Tabs API**: Tab management
- **Chrome Runtime API**: Message passing
- **OpenAI GPT-3.5 Turbo API**: AI response generation

## Development

### Building
```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Package for distribution
npm run package
```

### Testing
```bash
# Run tests
npm test

# Lint code
npm run lint
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Privacy & Security

### Data Handling
- All data is stored locally in your browser
- AI responses are generated using OpenAI's GPT-3.5 Turbo API
- Conversation history is stored locally and can be exported
- You can export or delete your data at any time
- OpenAI API key is stored securely in extension settings (not embedded in code)
- API keys are never shared or transmitted to external servers except OpenAI

### Permissions
- **activeTab**: Access to current tab for Meet/Translate integration
- **storage**: Local data storage for settings and history
- **scripting**: Content script injection
- **tabs**: Tab management for extension functionality
- **background**: Background processing for audio capture

## Troubleshooting

### Common Issues

#### Speech Recognition Not Working
- Ensure microphone permissions are granted
- Check that you're using a supported browser
- Verify that the page is served over HTTPS

#### Extension Not Appearing
- Refresh the Google Meet or Google Translate page
- Check that the extension is enabled in Chrome
- Verify that you're on the correct domains

#### Translation Not Working
- Ensure Google Translate is open in a separate tab
- Check that the extension panel is visible
- Verify internet connection

### Support
- Check the [Issues page](https://github.com/your-username/meet-counselor/issues) for known problems
- Create a new issue for bugs or feature requests
- Review the troubleshooting section above

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google Meet and Google Translate for providing the platforms
- Web Speech API for speech recognition capabilities
- Chrome Extensions team for the extension framework
- Open source community for inspiration and tools

## Roadmap

### Upcoming Features
- [ ] Multi-language speech recognition
- [ ] Advanced AI conversation analysis
- [ ] Integration with other video conferencing platforms
- [ ] Mobile app companion
- [ ] Team collaboration features
- [ ] Advanced analytics and insights

### Version History
- **v1.0.0**: Initial release with core functionality
  - Real-time speech recognition
  - Google Translate integration
  - AI response generation
  - Conversation management
  - Comprehensive settings

---

**Note**: This extension is designed to enhance your Google Meet experience with AI-powered conversation assistance. It respects your privacy and stores all data locally in your browser.

