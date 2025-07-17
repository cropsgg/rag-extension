// Configuration file for Webpage Chatbot Extension
// Copy this file to config.js and add your actual API keys

const CONFIG = {
  // Groq API Configuration
  GROQ_API_KEY: 'YOUR_GROQ_API_KEY_HERE', // Get from https://console.groq.com/keys
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile',

  // Application Settings
  APP_NAME: 'Webpage Chatbot Extension',
  APP_VERSION: '1.0.0',
  DEFAULT_THEME: 'light',
  DEFAULT_CHUNK_SIZE: 500,
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.3,
  MAX_CHUNKS: 3,

  // Chrome Extension Settings
  EXTENSION_ID: 'webpage-chatbot-extension',
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 600,

  // Development Settings
  DEBUG_MODE: false,
  LOG_LEVEL: 'info',

  // UI Messages
  MESSAGES: {
    LOADING: 'Processing...',
    PAGE_LOADED: '✅ Page context loaded!',
    READY: 'Ready! Ask questions about this page.',
    ERROR_NO_CONTENT: 'Could not extract page content. Try refreshing the page.',
    ERROR_SHORT_CONTENT: 'Page content is too short. Make sure you\'re on a page with text content.',
    ERROR_NO_RELEVANT: 'No relevant content found for your query.',
    HELP_HINT: '💡 Ask me anything about this page - I\'ll find relevant information to answer your questions.',
    API_KEY_LINK: 'Get your Groq API key from: https://console.groq.com/keys'
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
} 