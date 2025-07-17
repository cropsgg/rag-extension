# Webpage Chatbot Extension

A Chrome extension that provides a RAG-based chatbot to answer questions about the current webpage using Groq AI.

## Features

- 🤖 **AI-Powered**: Uses Groq's fast LLM API for intelligent responses
- 📖 **RAG-Based**: Retrieves relevant content from the current webpage
- 🎨 **Modern UI**: Clean, responsive design with light/dark themes
- ⚡ **Fast**: Optimized for quick responses and smooth user experience
- 🔧 **Configurable**: Easy setup with customizable settings

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/cropsgg/rag-extension.git
cd rag-extension
```

### 2. Configure API Keys

1. Copy the example configuration file:
   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` and add your Groq API key:
   ```javascript
   GROQ_API_KEY: 'your-actual-groq-api-key-here',
   ```

3. Get your Groq API key from: https://console.groq.com/keys

### 3. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the extension directory
4. The extension should now appear in your extensions list

### 4. Use the Extension

1. Navigate to any webpage with text content
2. Click the extension icon in the Chrome toolbar
3. Wait for the page content to be processed
4. Ask questions about the page content in the chat interface

## Configuration Options

The `config.js` file contains various settings you can customize:

- **GROQ_API_KEY**: Your Groq API key
- **GROQ_MODEL**: The AI model to use (default: llama-3.3-70b-versatile)
- **DEFAULT_CHUNK_SIZE**: Size of text chunks for processing (default: 500)
- **MAX_TOKENS**: Maximum tokens for AI responses (default: 1024)
- **TEMPERATURE**: AI creativity level (default: 0.3)
- **MAX_CHUNKS**: Maximum chunks to use for context (default: 3)

## File Structure

```
rag-extension/
├── manifest.json          # Extension manifest
├── popup.html             # Main popup UI
├── popup.js               # Full-featured popup script
├── popup-simple.js        # Simplified popup script
├── content.js             # Content script for webpage interaction
├── config.example.js      # Example configuration file
├── config.js              # Your actual configuration (gitignored)
├── icon.png               # Extension icon
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Security

- The `config.js` file is gitignored to prevent accidental API key exposure
- Use the `config.example.js` file as a template
- Never commit your actual API keys to version control

## Development

To modify the extension:

1. Make your changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension card
4. Test your changes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues or questions:
- Create an issue on GitHub
- Check the Groq documentation: https://console.groq.com/docs
- Ensure your API key is valid and has sufficient credits

## Troubleshooting

### Common Issues

1. **"Could not extract page content"**
   - Refresh the webpage and try again
   - Make sure the page has text content

2. **"API key error"**
   - Check that your API key is correctly set in `config.js`
   - Verify your API key is valid at https://console.groq.com/keys

3. **Extension not loading**
   - Make sure you've created the `config.js` file
   - Check the Chrome extensions page for error messages

### Debug Mode

Set `DEBUG_MODE: true` in your `config.js` to enable console logging for troubleshooting. 