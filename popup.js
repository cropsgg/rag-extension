const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // Replace with your Groq API key from https://console.groq.com/keys
const GENERATION_MODEL = 'llama-3.3-70b-versatile'; // Groq chat model (fast and powerful)

// Global variables
let chunks = [];
let isProcessing = false;
let currentTheme = 'light';
let isFirstVisit = true;

// UI Elements
let chatDiv, input, sendBtn, statusDiv, loadingDiv, typingDiv, themeToggle, settingsBtn, charCount;
let welcomeOverlay, suggestionsPanel, welcomeStart, welcomeSkip, welcomeClose, helpHint;
let settingsPanel, settingsClose, fontSizeSlider, fontSizeValue;

// Settings Management
let userSettings = {
  theme: 'light',
  fontSize: 14,
  autoSuggestions: true,
  welcomeMessages: true,
  keyboardShortcuts: true
};

function loadSettings() {
  chrome.storage.sync.get(['userSettings'], (result) => {
    if (result.userSettings) {
      userSettings = { ...userSettings, ...result.userSettings };
    }
    applySettings();
  });
}

function saveSettings() {
  chrome.storage.sync.set({ userSettings: userSettings });
}

function applySettings() {
  // Apply theme
  applyTheme(userSettings.theme);
  
  // Apply font size
  document.documentElement.style.setProperty('--font-size-sm', userSettings.fontSize + 'px');
  document.documentElement.style.setProperty('--font-size-md', (userSettings.fontSize + 2) + 'px');
  document.documentElement.style.setProperty('--font-size-lg', (userSettings.fontSize + 4) + 'px');
  
  // Update UI elements
  updateSettingsUI();
}

function updateSettingsUI() {
  // Update theme radio buttons
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === userSettings.theme;
  });
  
  // Update font size slider
  if (fontSizeSlider) {
    fontSizeSlider.value = userSettings.fontSize;
    fontSizeValue.textContent = userSettings.fontSize + 'px';
  }
  
  // Update checkboxes
  const autoSuggestionsCheckbox = document.getElementById('auto-suggestions');
  const welcomeMessagesCheckbox = document.getElementById('welcome-messages');
  const keyboardShortcutsCheckbox = document.getElementById('keyboard-shortcuts');
  
  if (autoSuggestionsCheckbox) autoSuggestionsCheckbox.checked = userSettings.autoSuggestions;
  if (welcomeMessagesCheckbox) welcomeMessagesCheckbox.checked = userSettings.welcomeMessages;
  if (keyboardShortcutsCheckbox) keyboardShortcutsCheckbox.checked = userSettings.keyboardShortcuts;
}

function showSettings() {
  if (settingsPanel) {
    settingsPanel.classList.add('visible');
    updateSettingsUI();
  }
}

function hideSettings() {
  if (settingsPanel) {
    settingsPanel.classList.remove('visible');
  }
}

function handleSettingsClick() {
  showSettings();
}

function resetSettings() {
  userSettings = {
    theme: 'light',
    fontSize: 14,
    autoSuggestions: true,
    welcomeMessages: true,
    keyboardShortcuts: true
  };
  
  saveSettings();
  applySettings();
  addMessage('', 'Settings reset to default values! 🔄', 'system');
}

function exportSettings() {
  const dataStr = JSON.stringify(userSettings, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = 'webpage-assistant-settings.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  addMessage('', 'Settings exported successfully! 📤', 'system');
}

// Theme Management
function initializeTheme() {
  // Load saved theme from storage
  chrome.storage.sync.get(['theme'], (result) => {
    currentTheme = result.theme || 'light';
    applyTheme(currentTheme);
  });
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  currentTheme = theme;
  
  // Update theme toggle icon
  if (themeToggle) {
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }
  
  // Save theme preference
  chrome.storage.sync.set({ theme: theme });
}

function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

// Auto-expanding textarea functionality
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Character count update
function updateCharacterCount() {
  const current = input.value.length;
  const max = 500;
  const percentage = (current / max) * 100;
  
  charCount.textContent = `${current}/${max}`;
  
  // Update styling based on character count
  charCount.className = 'character-count';
  if (percentage >= 90) {
    charCount.classList.add('error');
  } else if (percentage >= 75) {
    charCount.classList.add('warning');
  }
}

// Enhanced input handling
function handleInputChange() {
  autoResizeTextarea(input);
  updateCharacterCount();
}

// Function to split text into chunks (for RAG)
function splitIntoChunks(text, chunkSize = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Function to add message to chat with enhanced styling
function addMessage(sender, message, type = 'normal') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}-message`;
  
  if (type === 'error') {
    messageDiv.innerHTML = `<strong>❌ Error:</strong> ${message}`;
  } else if (type === 'system') {
    messageDiv.innerHTML = `<strong>🔧 System:</strong> ${message}`;
  } else if (sender === 'You') {
    messageDiv.innerHTML = `<strong>👤 You:</strong> ${message}`;
  } else {
    messageDiv.innerHTML = `<strong>🤖 Assistant:</strong> ${message}`;
  }
  
  chatDiv.appendChild(messageDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
  
  // Hide help hint when messages are added
  hideHelpHint();
  
  // Add animation class for smooth appearance
  messageDiv.style.opacity = '0';
  messageDiv.style.transform = 'translateY(10px)';
  
  requestAnimationFrame(() => {
    messageDiv.style.opacity = '1';
    messageDiv.style.transform = 'translateY(0)';
  });
}

// Function to update status with enhanced styling
function updateStatus(message, type = 'normal') {
  statusDiv.textContent = message;
  statusDiv.className = 'status';
  
  if (type === 'error') {
    statusDiv.classList.add('error');
  } else if (type === 'success') {
    statusDiv.classList.add('success');
  }
}

// Function to show/hide loading with enhanced messaging
function setLoading(show, message = 'Processing...') {
  if (show) {
    loadingDiv.style.display = 'block';
    loadingDiv.querySelector('span:last-child').textContent = message;
  } else {
    loadingDiv.style.display = 'none';
  }
}

// Function to show/hide typing indicator with smooth animation
function setTyping(show) {
  if (show) {
    typingDiv.style.display = 'flex';
    typingDiv.style.opacity = '0';
    requestAnimationFrame(() => {
      typingDiv.style.opacity = '1';
    });
  } else {
    typingDiv.style.opacity = '0';
    setTimeout(() => {
      typingDiv.style.display = 'none';
    }, 200);
  }
}

// Function to set button state with enhanced visual feedback
function setButtonState(enabled, text = 'Send') {
  sendBtn.disabled = !enabled;
  sendBtn.querySelector('#send-text').textContent = text;
  
  if (!enabled) {
    sendBtn.style.transform = 'none';
    sendBtn.style.boxShadow = 'none';
  }
}

// Enhanced keyboard handling with navigation support
function handleKeyPress(e) {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // Allow line break with Shift+Enter
      return;
    } else {
      // Send message with Enter
      e.preventDefault();
      handleQuery();
    }
  } else if (e.key === 'Escape') {
    // Close overlays with Escape
    if (welcomeOverlay && !welcomeOverlay.classList.contains('hidden')) {
      hideWelcomeOverlay();
    } else if (suggestionsPanel && suggestionsPanel.classList.contains('visible')) {
      hideSuggestions();
    }
  } else if (e.key === 'Tab') {
    // Handle tab navigation
    handleTabNavigation(e);
  }
}

// Global keyboard shortcuts
function handleGlobalKeyPress(e) {
  if (!userSettings.keyboardShortcuts) return;
  
  // Alt + S to show/hide suggestions
  if (e.altKey && e.key === 's') {
    e.preventDefault();
    if (suggestionsPanel && suggestionsPanel.classList.contains('visible')) {
      hideSuggestions();
    } else {
      showSuggestions();
    }
  }
  
  // Alt + T to toggle theme
  if (e.altKey && e.key === 't') {
    e.preventDefault();
    toggleTheme();
  }
  
  // Alt + C to clear chat
  if (e.altKey && e.key === 'c') {
    e.preventDefault();
    clearChat();
  }
  
  // Alt + H to show help
  if (e.altKey && e.key === 'h') {
    e.preventDefault();
    showHelp();
  }
  
  // Alt + O to open settings
  if (e.altKey && e.key === 'o') {
    e.preventDefault();
    showSettings();
  }
}

// Tab navigation management
function handleTabNavigation(e) {
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const focusableArray = Array.from(focusableElements);
  const currentIndex = focusableArray.indexOf(document.activeElement);
  
  if (e.shiftKey) {
    // Shift + Tab (backward)
    const prevIndex = currentIndex <= 0 ? focusableArray.length - 1 : currentIndex - 1;
    focusableArray[prevIndex].focus();
  } else {
    // Tab (forward)
    const nextIndex = currentIndex >= focusableArray.length - 1 ? 0 : currentIndex + 1;
    focusableArray[nextIndex].focus();
  }
  
  e.preventDefault();
}

// Focus management
function manageFocus() {
  // Set initial focus to input
  if (input) {
    input.focus();
  }
  
  // Add focus indicators
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
}

// Utility functions for keyboard shortcuts
function clearChat() {
  if (chatDiv) {
    chatDiv.innerHTML = '';
    addMessage('', 'Chat cleared! 🧹', 'system');
  }
}

function showHelp() {
  const helpMessage = `
    <strong>🚀 Webpage Assistant Help</strong><br><br>
    <strong>What I can do:</strong><br>
    • Analyze and understand webpage content<br>
    • Answer questions about the current page<br>
    • Summarize key information<br>
    • Find specific details you're looking for<br><br>
    <strong>Keyboard Shortcuts:</strong><br>
    • <kbd>Alt + S</kbd> - Show/hide suggestions<br>
    • <kbd>Alt + T</kbd> - Toggle theme<br>
    • <kbd>Alt + C</kbd> - Clear chat<br>
    • <kbd>Alt + H</kbd> - Show this help<br>
    • <kbd>Enter</kbd> - Send message<br>
    • <kbd>Shift + Enter</kbd> - New line<br>
    • <kbd>Escape</kbd> - Close overlays<br><br>
    <strong>Tips:</strong><br>
    • Be specific in your questions<br>
    • Try the suggested questions to get started<br>
    • Use the theme toggle for comfortable viewing
  `;
  
  addMessage('', helpMessage, 'system');
  hideHelpHint();
}

// Simple keyword-based search (no embeddings needed)
function findRelevantChunks(query, chunks, maxChunks = 3) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  const scoredChunks = chunks.map((chunk, idx) => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    
    // Score based on keyword matches
    queryWords.forEach(word => {
      const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    });
    
    // Bonus for exact phrase matches
    if (chunkLower.includes(query.toLowerCase())) {
      score += 5;
    }
    
    return { idx, score, chunk };
  });
  
  // Sort by score and return top chunks
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(item => item.chunk);
}

// Function to generate answer from Groq API with retrieved context
async function generateAnswer(query, relevantChunks) {
  try {
    const context = relevantChunks.join('\n\n');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GENERATION_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers questions based only on the provided context. Be concise but informative. Format your responses clearly with proper structure.' },
          { role: 'user', content: `Context: ${context}\n\nQuestion: ${query}` }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API Error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Generation error:', error);
    throw error;
  }
}

// Function to handle user query with enhanced feedback
async function handleQuery() {
  if (isProcessing) return;
  
  const query = input.value.trim();
  if (!query) return;
  
  if (chunks.length === 0) {
    addMessage('', 'Please wait for the page content to be processed first.', 'error');
    return;
  }
  
  isProcessing = true;
  setButtonState(false, 'Processing...');
  
  // Add user message
  addMessage('You', query);
  input.value = '';
  updateCharacterCount();
  autoResizeTextarea(input);
  
  // Show typing indicator
  setTyping(true);
  
  try {
    // Find relevant chunks using keyword search (no embeddings)
    const relevantChunks = findRelevantChunks(query, chunks);
    
    if (relevantChunks.length === 0) {
      throw new Error('No relevant content found for your query.');
    }
    
    // Generate answer
    const answer = await generateAnswer(query, relevantChunks);
    
    // Hide typing and add response
    setTyping(false);
    addMessage('Assistant', answer);
    
  } catch (error) {
    setTyping(false);
    addMessage('', `Failed to process your question: ${error.message}`, 'error');
    console.error('Query processing error:', error);
  } finally {
    isProcessing = false;
    setButtonState(true);
    input.focus();
  }
}

// Function to initialize the page context with enhanced feedback
async function initializePageContext() {
  try {
    updateStatus('Extracting page content...');
    setLoading(true, 'Reading page content...');
    
    // Get current tab and extract page text
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
    
    if (!response || !response.text) {
      throw new Error('Could not extract page content. Try refreshing the page.');
    }
    
    const pageText = response.text.trim();
    
    if (pageText.length < 50) {
      throw new Error('Page content is too short. Make sure you\'re on a page with text content.');
    }
    
    updateStatus('Processing content...');
    setLoading(true, 'Creating text chunks...');
    
    // Split page into chunks (no embeddings needed)
    chunks = splitIntoChunks(pageText);
    
    setLoading(false);
    updateStatus('Ready! Ask questions about this page.', 'success');
    addMessage('', `✅ Page context loaded! Found ${chunks.length} chunks of content.`, 'system');
    addMessage('', '💡 Ask me anything about this page - I\'ll find relevant information to answer your questions.', 'system');
    
    // Show help hint for first-time users
    if (isFirstVisit) {
      setTimeout(() => {
        showHelpHint();
      }, 2000);
    }
    
    // Focus on input
    input.focus();
    
  } catch (error) {
    console.error('Initialization error:', error);
    setLoading(false);
    updateStatus('Error occurred', 'error');
    addMessage('', error.message, 'error');
    
    if (error.message.includes('API key')) {
      addMessage('', 'Get your Groq API key from: https://console.groq.com/keys', 'system');
    }
  }
}

// Onboarding Management
function initializeOnboarding() {
  // Check if this is the first visit
  chrome.storage.sync.get(['hasSeenWelcome'], (result) => {
    isFirstVisit = !result.hasSeenWelcome;
    
    if (isFirstVisit && userSettings.welcomeMessages) {
      showWelcomeOverlay();
    } else if (userSettings.autoSuggestions) {
      // Show suggestions panel for returning users
      setTimeout(() => {
        showSuggestions();
      }, 1000);
    }
  });
}

function showWelcomeOverlay() {
  if (welcomeOverlay) {
    welcomeOverlay.classList.remove('hidden');
  }
}

function hideWelcomeOverlay() {
  if (welcomeOverlay) {
    welcomeOverlay.classList.add('hidden');
    // Mark as seen
    chrome.storage.sync.set({ hasSeenWelcome: true });
  }
}

function showSuggestions() {
  if (suggestionsPanel && chunks.length > 0) {
    suggestionsPanel.classList.add('visible');
    
    // Generate dynamic suggestions based on page content
    updateSuggestions();
  }
}

function hideSuggestions() {
  if (suggestionsPanel) {
    suggestionsPanel.classList.remove('visible');
  }
}

function updateSuggestions() {
  const suggestionsList = document.getElementById('suggestions-list');
  if (!suggestionsList) return;
  
  // Dynamic suggestions based on page content
  const dynamicSuggestions = [
    { icon: '📋', text: 'What is this page about?', question: 'What is this page about?' },
    { icon: '📝', text: 'Summarize the main points', question: 'Can you summarize the main points of this page?' },
    { icon: '🔍', text: 'Find key information', question: 'What are the most important details on this page?' },
    { icon: '💡', text: 'Explain the content', question: 'Can you explain what this page is trying to communicate?' }
  ];
  
  // Clear existing suggestions
  suggestionsList.innerHTML = '';
  
  // Add dynamic suggestions
  dynamicSuggestions.forEach(suggestion => {
    const button = document.createElement('button');
    button.className = 'suggestion-item';
    button.setAttribute('data-question', suggestion.question);
    button.innerHTML = `
      <span class="suggestion-icon">${suggestion.icon}</span>
      <span>${suggestion.text}</span>
    `;
    
    button.addEventListener('click', () => {
      handleSuggestionClick(suggestion.question);
    });
    
    suggestionsList.appendChild(button);
  });
}

function handleSuggestionClick(question) {
  // Fill the input with the suggested question
  input.value = question;
  updateCharacterCount();
  autoResizeTextarea(input);
  
  // Hide suggestions
  hideSuggestions();
  
  // Focus on input and prepare for submission
  input.focus();
  
  // Auto-submit the question after a short delay
  setTimeout(() => {
    if (input.value.trim() === question) {
      handleQuery();
    }
  }, 500);
}

// Contextual Help Management
function showHelpHint() {
  const helpHintElement = document.getElementById('help-hint');
  if (helpHintElement && chatDiv && chatDiv.children.length === 0) {
    helpHintElement.classList.add('visible');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideHelpHint();
    }, 5000);
  }
}

function hideHelpHint() {
  const helpHintElement = document.getElementById('help-hint');
  if (helpHintElement) {
    helpHintElement.classList.remove('visible');
  }
}

// Main logic on popup load
document.addEventListener('DOMContentLoaded', async () => {
  // Get UI elements
  chatDiv = document.getElementById('chat');
  input = document.getElementById('input');
  sendBtn = document.getElementById('send');
  statusDiv = document.getElementById('status');
  loadingDiv = document.getElementById('loading');
  typingDiv = document.getElementById('typing');
  themeToggle = document.getElementById('theme-toggle');
  settingsBtn = document.getElementById('settings-button');
  charCount = document.getElementById('char-count');
  welcomeOverlay = document.getElementById('welcome-overlay');
  suggestionsPanel = document.getElementById('suggestions-panel');
  welcomeStart = document.getElementById('welcome-start');
  welcomeSkip = document.getElementById('welcome-skip');
  welcomeClose = document.getElementById('welcome-close');
  helpHint = document.getElementById('help-hint'); // Initialize helpHint
  settingsPanel = document.getElementById('settings-panel');
  settingsClose = document.getElementById('settings-close');
  fontSizeSlider = document.getElementById('font-size');
  fontSizeValue = document.getElementById('font-size-value');
  
  // Initialize theme
  initializeTheme();
  loadSettings(); // Load settings on popup load
  
  // Handle theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Handle settings button
  settingsBtn.addEventListener('click', handleSettingsClick);
  
  // Handle settings panel close button
  if (settingsClose) {
    settingsClose.addEventListener('click', hideSettings);
  }
  
  // Handle settings panel theme radio buttons
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      userSettings.theme = radio.value;
      saveSettings();
      applySettings();
      addMessage('', 'Theme changed! 🎨', 'system');
    });
  });
  
  // Handle settings panel font size slider
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', () => {
      userSettings.fontSize = fontSizeSlider.value;
      saveSettings();
      applySettings();
      addMessage('', 'Font size changed! 📏', 'system');
    });
  }
  
  // Handle settings panel checkboxes
  const autoSuggestionsCheckbox = document.getElementById('auto-suggestions');
  const welcomeMessagesCheckbox = document.getElementById('welcome-messages');
  const keyboardShortcutsCheckbox = document.getElementById('keyboard-shortcuts');
  
  if (autoSuggestionsCheckbox) {
    autoSuggestionsCheckbox.addEventListener('change', () => {
      userSettings.autoSuggestions = autoSuggestionsCheckbox.checked;
      saveSettings();
      addMessage('', 'Auto-suggestions ' + (autoSuggestionsCheckbox.checked ? 'enabled' : 'disabled') + '! 💡', 'system');
    });
  }
  
  if (welcomeMessagesCheckbox) {
    welcomeMessagesCheckbox.addEventListener('change', () => {
      userSettings.welcomeMessages = welcomeMessagesCheckbox.checked;
      saveSettings();
      addMessage('', 'Welcome messages ' + (welcomeMessagesCheckbox.checked ? 'enabled' : 'disabled') + '! 🎉', 'system');
    });
  }
  
  if (keyboardShortcutsCheckbox) {
    keyboardShortcutsCheckbox.addEventListener('change', () => {
      userSettings.keyboardShortcuts = keyboardShortcutsCheckbox.checked;
      saveSettings();
      addMessage('', 'Keyboard shortcuts ' + (keyboardShortcutsCheckbox.checked ? 'enabled' : 'disabled') + '! ⚙️', 'system');
    });
  }
  
  // Handle settings panel buttons
  const exportSettingsBtn = document.getElementById('export-settings');
  const resetSettingsBtn = document.getElementById('reset-settings');
  
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', exportSettings);
  }
  
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings to default?')) {
        resetSettings();
      }
    });
  }
  
  // Handle onboarding elements
  if (welcomeStart) {
    welcomeStart.addEventListener('click', () => {
      hideWelcomeOverlay();
      showSuggestions();
    });
  }
  
  if (welcomeSkip) {
    welcomeSkip.addEventListener('click', () => {
      hideWelcomeOverlay();
    });
  }
  
  if (welcomeClose) {
    welcomeClose.addEventListener('click', () => {
      hideWelcomeOverlay();
    });
  }
  
  // Handle suggestions panel
  const suggestionsClose = document.getElementById('suggestions-close');
  if (suggestionsClose) {
    suggestionsClose.addEventListener('click', hideSuggestions);
  }
  
  // Handle send button click
  sendBtn.addEventListener('click', handleQuery);
  
  // Handle input events
  input.addEventListener('input', handleInputChange);
  input.addEventListener('keypress', handleKeyPress);
  
  // Initialize character count
  updateCharacterCount();
  
  // Initialize page context
  await initializePageContext();
  
  // Initialize onboarding
  initializeOnboarding();
  
  // Manage focus
  manageFocus();
  
  // Add global keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeyPress);
}); 