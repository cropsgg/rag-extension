const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // Replace with your Groq API key from https://console.groq.com/keys
const GENERATION_MODEL = 'llama-3.3-70b-versatile'; // Groq chat model (fast and powerful)

// Global variables
let chunks = [];
let isProcessing = false;
let currentTheme = 'light';

// UI Elements
let chatDiv, input, sendBtn, statusDiv, loadingDiv, typingDiv, themeToggle, settingsBtn, charCount;

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

// Function to show/hide loading
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
          { role: 'system', content: 'You are a helpful assistant that answers questions based only on the provided context. Be concise but informative.' },
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

// Function to handle user query
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
  } finally {
    isProcessing = false;
    setButtonState(true);
    input.focus();
  }
}

// Function to initialize the page context
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
  
  // Initialize theme
  initializeTheme();
  
  // Load settings (basic version for simple popup)
  chrome.storage.sync.get(['theme'], (result) => {
    if (result.theme) {
      currentTheme = result.theme;
      applyTheme(currentTheme);
    }
  });
  
  // Handle theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Handle settings button (placeholder)
  settingsBtn.addEventListener('click', () => {
    addMessage('', 'Settings panel coming soon! 🚧', 'system');
  });
  
  // Handle send button click
  sendBtn.addEventListener('click', handleQuery);
  
  // Handle input events
  input.addEventListener('input', handleInputChange);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow line break with Shift+Enter
        return;
      } else {
        // Send message with Enter
        e.preventDefault();
        handleQuery();
      }
    }
  });
  
  // Initialize character count
  updateCharacterCount();

  // Initialize page context
  await initializePageContext();
}); 