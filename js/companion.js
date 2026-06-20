/* ============================================
   MindCompanion — Companion Chat Module
   Mira conversational UI logic
   ============================================ */

import { getMiraResponse, getDemoMiraResponse, isApiConfigured } from './ai-engine.js';
import { detectCrisis, showCrisisOverlay, getCrisisResponse } from './safety.js';

let chatHistory = [];
let isProcessing = false;

/**
 * Initialize the chat UI
 */
export function initChat() {
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatContainer = document.getElementById('chat-messages');

  if (!chatInput || !chatSendBtn || !chatContainer) return;

  chatSendBtn.addEventListener('click', () => handleSend());

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  // Show welcome message
  if (chatHistory.length === 0) {
    addSystemMessage("Mira is your study companion — warm, real, and here to listen. She's not a therapist, but she's got your back. 💚");

    setTimeout(() => {
      addMiraMessage("Hey! 👋 I'm Mira. Think of me as that senior who's been through the exam grind and lived to tell the tale. How are you doing today? No filters needed — this is a judgment-free zone.");
    }, 500);
  }
}

/**
 * Handle send button click or Enter key
 */
async function handleSend() {
  const chatInput = document.getElementById('chat-input');
  const text = chatInput.value.trim();

  if (!text || isProcessing) return;

  // Add user message
  addUserMessage(text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Check for crisis
  if (detectCrisis(text)) {
    showCrisisOverlay();
    addMiraMessage(getCrisisResponse());
    return;
  }

  // Show typing indicator
  isProcessing = true;
  showTypingIndicator();

  try {
    let response;

    if (isApiConfigured()) {
      // Use real Gemini API
      response = await getMiraResponse(text);
    } else {
      // Use demo response
      await simulateDelay(1200);
      response = getDemoMiraResponse(text, null);
    }

    hideTypingIndicator();
    addMiraMessage(response);
  } catch (error) {
    hideTypingIndicator();
    console.error('Chat error:', error);

    if (error.message === 'API_KEY_MISSING') {
      addSystemMessage("Mira needs a Gemini API key to respond. You can add one in Settings, or she'll use her built-in responses. 🔧");
      const fallback = getDemoMiraResponse(text, null);
      addMiraMessage(fallback);
    } else {
      addSystemMessage("Hmm, I had trouble connecting. Let me try with what I know...");
      const fallback = getDemoMiraResponse(text, null);
      addMiraMessage(fallback);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Send a pre-composed message to Mira (called from journal analysis)
 */
export async function sendToMira(message, analysisContext) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  // Ensure chat view is ready
  addUserMessage(message);

  showTypingIndicator();
  isProcessing = true;

  try {
    let response;
    if (isApiConfigured()) {
      response = await getMiraResponse(message, analysisContext);
    } else {
      await simulateDelay(1500);
      response = getDemoMiraResponse(message, analysisContext);
    }

    hideTypingIndicator();
    addMiraMessage(response);
  } catch (error) {
    hideTypingIndicator();
    const fallback = getDemoMiraResponse(message, analysisContext);
    addMiraMessage(fallback);
  } finally {
    isProcessing = false;
  }
}

/* ---- DOM Helpers ---- */

function addUserMessage(text) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  msg.className = 'chat-message chat-message--user';
  msg.textContent = text;
  container.appendChild(msg);
  chatHistory.push({ role: 'user', text });
  scrollToBottom(container);
}

function addMiraMessage(text) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  msg.className = 'chat-message chat-message--mira';

  // Format markdown-like bold
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  msg.innerHTML = `
    <div class="mira-label">✨ Mira</div>
    <div>${formatted}</div>
  `;

  container.appendChild(msg);
  chatHistory.push({ role: 'mira', text });
  scrollToBottom(container);
  
  speakResponse(text);
}

function speakResponse(text) {
  const toggle = document.getElementById('voice-toggle');
  if (toggle && !toggle.checked) return;
  
  if ('speechSynthesis' in window) {
    // Strip markdown for speech
    const cleanText = text.replace(/\*\*/g, '').replace(/[^\w\s.,?!']/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // slightly slower, calming
    utterance.pitch = 1.1; // slightly higher pitch, friendly
    
    // Try to find a good female voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Female'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
}

function addSystemMessage(text) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  msg.className = 'chat-message chat-message--system';
  msg.innerHTML = text;
  container.appendChild(msg);
  scrollToBottom(container);
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const existing = container.querySelector('.typing-msg');
  if (existing) return;

  const msg = document.createElement('div');
  msg.className = 'chat-message chat-message--mira typing-msg';
  msg.innerHTML = `
    <div class="mira-label">✨ Mira</div>
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(msg);
  scrollToBottom(container);
}

function hideTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const typing = container.querySelector('.typing-msg');
  if (typing) typing.remove();
}

function scrollToBottom(el) {
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight;
  });
}

function simulateDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
