# Meet Counselor - Installation Guide

## Quick Start

### 1. Download the Extension
- Download or clone this repository
- Extract the files to a folder on your computer

### 2. Load in Chrome
1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder containing the extension files
6. The extension should now appear in your extensions list

### 3. Grant Permissions
When you first load the extension, Chrome will ask for permissions:
- **Access to meet.google.com** - For speech recognition and Meet integration
- **Access to translate.google.com** - For translation integration
- **Access to api.openai.com** - For AI response generation
- **Storage** - For saving settings and conversation history
- **Microphone** - For speech recognition (grant when prompted)

### 4. Set Up Your Profile
1. Click the Meet Counselor extension icon in your Chrome toolbar
2. Click "Settings" to open the settings page
3. Fill in your personal information:
   - **My Information**: Name, age, location, occupation, communication style
   - **Other Party's Information**: Details about people you typically talk to
   - **Additional Settings**: Language preferences, response styles
   - **Prompt Settings**: Customize how the AI responds

### 5. Start Using
1. Open Google Meet and join a call
2. Open Google Translate in another tab
3. Click the Meet Counselor button in Google Meet to start recording
4. Use the extension panel in Google Translate to generate responses

## Features Overview

### Real-time Speech Recognition
- Captures speech from Google Meet participants
- Automatically transcribes and sends to Google Translate
- Works with multiple languages

### AI-Powered Responses
- **Create Answer**: Generate responses to questions
- **Create Chat**: Generate casual conversation topics
- **Create Questions**: Generate questions for different conversation phases

### Google Translate Integration
- Real-time translation of conversations
- Automatic insertion of AI-generated responses
- Multi-language support

### Conversation Management
- Save and archive all conversations
- Export conversation history
- View conversation statistics

## Troubleshooting

### Extension Not Working
- Refresh the Google Meet or Google Translate page
- Check that the extension is enabled in Chrome
- Verify you're on the correct domains (meet.google.com, translate.google.com)

### Speech Recognition Issues
- Ensure microphone permissions are granted
- Check that you're using a supported browser (Chrome)
- Verify the page is served over HTTPS

### AI Responses Not Generating
- Check your internet connection
- Verify the OpenAI API key is valid
- Check the browser console for error messages

### Translation Not Working
- Ensure Google Translate is open in a separate tab
- Check that the extension panel is visible
- Verify internet connection

## Security & Privacy

### Data Storage
- All data is stored locally in your browser
- No data is sent to external servers except OpenAI for AI responses
- You can export or delete your data at any time

### API Key
- The OpenAI API key is embedded in the extension
- API calls are made directly from your browser to OpenAI
- No intermediate servers store your API key

### Permissions
- **activeTab**: Access to current tab for Meet/Translate integration
- **storage**: Local data storage for settings and history
- **scripting**: Content script injection
- **tabs**: Tab management for extension functionality
- **background**: Background processing for audio capture

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure all permissions are granted
4. Try refreshing the pages and reloading the extension

## Updates

To update the extension:
1. Download the latest version
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Meet Counselor extension
4. Or remove and reload the extension with the new files

---

**Note**: This extension requires an active internet connection for AI response generation and Google Translate functionality.
