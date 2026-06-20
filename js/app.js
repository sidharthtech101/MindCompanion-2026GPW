/* ============================================
   MindCompanion — Main App Controller
   Routing, initialization, event binding
   ============================================ */

import {
  initDB, saveEntry, saveMood, getRecentEntries,
  getUserName, setUserName, getApiKey, setApiKey,
  hasCompletedOnboarding, setOnboarded, clearAllData,
  generateSampleData, getTheme, setTheme, saveStudySession
} from './storage.js';
import {
  analyzeEntry, getDemoAnalysis, isApiConfigured,
} from './ai-engine.js';
import { initBiomarkers } from './biomarkers.js';
import { initGrounding } from './grounding.js';
import { detectCrisis, showCrisisOverlay, renderCrisisOverlay } from './safety.js';
import {
  renderMoodWave, renderTriggerBubbles, renderBurnoutMeter,
  renderHeatmap, calculateStats, renderCognitiveChart
} from './charts.js';
import { initChat, sendToMira } from './companion.js';
import { toggleAudio } from './audio-engine.js';
import { initAnxietyWipe } from './anxiety-wipe.js';

/* ---- State ---- */
let currentView = 'home';
let recentEntries = [];
let currentPeriod = 7;

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
  } catch (e) {
    console.error('Failed to init DB:', e);
  }

  renderCrisisOverlay();
  setupNavigation();
  setupOnboarding();
  setupJournal();
  setupMoodSelector();
  setupSettings();
  initChat();
  updateGreeting();
  applyTheme(getTheme());

  // Load data and render dashboard
  await refreshData();

  // Show onboarding if first time
  if (!hasCompletedOnboarding()) {
    showOnboarding();
  }

  // Init biomarkers for background monitoring
  initBiomarkers((interventionType) => {
    if (interventionType === 'tab_thrashing') {
      showToast('You seem to be switching tasks rapidly. Try a quick breather. 🌱');
      sendToMira('I noticed you are switching tabs very quickly. It looks like you might be studying hard, but taking a tiny 2-minute stretch break could actually help your focus. Try rolling your shoulders once for me?');
    } else if (interventionType === 'typing_fatigue') {
      showToast('Your typing pattern suggests fatigue. Consider resting your eyes.');
      sendToMira('You seem really tired. Your typing has slowed down and got a bit erratic. Please rest your eyes for a few minutes, even just looking out the window.');
    }
  });

  // Init cognitive slider
  setupCognitiveSlider();

  // Init somatic grounding tools
  initGrounding();
  
  // Init Anxiety Wipe Canvas
  initAnxietyWipe();
  
  // Setup Audio Toggle
  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isPlaying = toggleAudio('focus');
      audioBtn.textContent = isPlaying ? 'Stop' : 'Play';
      audioBtn.classList.toggle('btn--primary', !isPlaying);
      audioBtn.classList.toggle('btn--danger', isPlaying);
    });
  }
});

/* ============================================
   NAVIGATION
   ============================================ */

function setupNavigation() {
  const tabs = document.querySelectorAll('.bottom-nav__tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      switchView(view);
    });
  });
}

function switchView(viewName) {
  currentView = viewName;

  // Update tabs
  document.querySelectorAll('.bottom-nav__tab').forEach((tab) => {
    tab.classList.toggle('bottom-nav__tab--active', tab.dataset.view === viewName);
  });

  // Update views
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.remove('view--active');
  });

  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.add('view--active');

    // Refresh charts when switching to insights
    if (viewName === 'insights') {
      renderInsights();
    }
  }
}

/* ============================================
   ONBOARDING
   ============================================ */

function setupOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  const nameInput = document.getElementById('onboarding-name');
  const apiInput = document.getElementById('onboarding-api-key');
  const startBtn = document.getElementById('onboarding-start-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');
  const demoBtn = document.getElementById('onboarding-demo-btn');

  if (!startBtn) return;

  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) setUserName(name);

    const apiKey = apiInput.value.trim();
    if (apiKey) setApiKey(apiKey);

    setOnboarded();
    hideOnboarding();
    updateGreeting();
  });

  skipBtn.addEventListener('click', () => {
    setOnboarded();
    hideOnboarding();
  });

  demoBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim() || 'Student';
    setUserName(name);
    setOnboarded();
    hideOnboarding();
    updateGreeting();

    // Generate sample data
    showToast('Loading demo data...');
    try {
      await generateSampleData();
      await refreshData();
      showToast('✨ Demo data loaded! Explore your dashboard.');
    } catch (e) {
      console.error('Failed to generate sample data:', e);
    }
  });
}

function showOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.classList.add('crisis-overlay--active');
}

function hideOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.classList.remove('crisis-overlay--active');
}

/* ============================================
   GREETING
   ============================================ */

function updateGreeting() {
  const el = document.getElementById('greeting-name');
  const timeEl = document.getElementById('greeting-time');

  const name = getUserName() || 'there';
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  if (el) el.textContent = `${greeting}, ${name} 👋`;

  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleDateString('en', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  }
}

/* ============================================
   MOOD SELECTOR
   ============================================ */

function setupMoodSelector() {
  const buttons = document.querySelectorAll('.mood-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      // Clear previous selection
      buttons.forEach((b) => b.classList.remove('mood-btn--active'));
      btn.classList.add('mood-btn--active');

      const level = parseInt(btn.dataset.level);
      const emoji = btn.dataset.emoji;

      try {
        await saveMood(level, emoji);
        showToast(`Mood logged: ${emoji}`);
      } catch (e) {
        console.error('Failed to save mood:', e);
      }
    });
  });
}

/* ============================================
   COGNITIVE SLIDER
   ============================================ */

function setupCognitiveSlider() {
  const cognitiveBtn = document.getElementById('log-cognitive-btn');
  const cognitiveSlider = document.getElementById('cognitive-slider');
  if (cognitiveBtn && cognitiveSlider) {
    cognitiveBtn.addEventListener('click', async () => {
      const val = parseInt(cognitiveSlider.value);
      try {
        await saveStudySession(val);
        showToast(`Study session logged! Cognitive load: ${val}/10`);
        await refreshData();
        cognitiveSlider.value = 5;
      } catch (e) {
        console.error('Failed to log study session:', e);
      }
    });
  }
}

/* ============================================
   JOURNAL ENTRY
   ============================================ */

function setupJournal() {
  const journalTextarea = document.getElementById('journal-textarea');
  const submitBtn = document.getElementById('journal-submit-btn');
  const talkBtn = document.getElementById('journal-talk-btn');
  const charCount = document.getElementById('journal-char-count');

  if (!journalTextarea || !submitBtn) return;

  journalTextarea.addEventListener('input', () => {
    const len = journalTextarea.value.length;
    if (charCount) charCount.textContent = `${len} chars`;
  });

  submitBtn.addEventListener('click', () => handleJournalSubmit());

  journalTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleJournalSubmit();
    }
  });

  if (talkBtn) {
    talkBtn.addEventListener('click', () => {
      const text = journalTextarea.value.trim();
      if (text) {
        switchView('home');
        // Switch to chat section
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.scrollIntoView({ behavior: 'smooth' });
        sendToMira(text);
      } else {
        switchView('home');
        const chatSection = document.getElementById('chat-section');
        if (chatSection) chatSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Audio Dump
  const audioBtn = document.getElementById('audio-dump-btn');
  if (audioBtn) {
    let recognition = null;
    let isRecording = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        
        if (finalTranscript) {
          journalTextarea.value += (journalTextarea.value ? ' ' : '') + finalTranscript.trim();
          journalTextarea.dispatchEvent(new Event('input'));
        }
      };
      
      recognition.onend = () => {
        if (isRecording) stopRecording();
      };
    }

    const stopRecording = () => {
      if (!isRecording) return;
      isRecording = false;
      audioBtn.classList.remove('mic-btn--recording');
      if (recognition) recognition.stop();
      showToast('Audio dump completed. Worries securely filed.');
      
      journalTextarea.style.transition = 'all 0.3s ease';
      journalTextarea.style.transform = 'scale(0.95)';
      journalTextarea.style.opacity = '0.5';
      setTimeout(() => {
        journalTextarea.style.transform = 'scale(1)';
        journalTextarea.style.opacity = '1';
      }, 300);
    };

    audioBtn.addEventListener('click', () => {
      if (!SpeechRecognition) {
        showToast('Speech recognition is not supported in this browser.');
        return;
      }
      
      if (isRecording) {
        stopRecording();
      } else {
        isRecording = true;
        audioBtn.classList.add('mic-btn--recording');
        recognition.start();
        showToast('Listening... (Up to 60s)');
        
        setTimeout(() => {
          if (isRecording) stopRecording();
        }, 60000);
      }
    });
  }
}

async function handleJournalSubmit() {
  const textarea = document.getElementById('journal-textarea');
  const submitBtn = document.getElementById('journal-submit-btn');
  const text = textarea.value.trim();

  if (!text) {
    showToast('Write something first — even just a sentence 🌱');
    return;
  }

  // Crisis check FIRST
  if (detectCrisis(text)) {
    showCrisisOverlay();
    return; // Do NOT save crisis entries
  }

  // Show loading
  submitBtn.classList.add('btn--loading');
  submitBtn.disabled = true;

  try {
    let analysis;

    if (isApiConfigured()) {
      analysis = await analyzeEntry(text);
    } else {
      // Demo mode
      await new Promise((r) => setTimeout(r, 800));
      analysis = getDemoAnalysis(text);
    }

    // Save entry
    await saveEntry({ text, analysis });

    // Show result
    showAnalysisResult(analysis);
    textarea.value = '';
    const charCount = document.getElementById('journal-char-count');
    if (charCount) charCount.textContent = '0 chars';

    showToast('✨ Entry saved & analyzed');

    // Refresh data
    await refreshData();

    // Offer to talk to Mira
    setTimeout(() => {
      sendToMira(text, analysis);
    }, 1000);

  } catch (error) {
    console.error('Journal submit error:', error);
    showToast('Something went wrong. Try again?');
  } finally {
    submitBtn.classList.remove('btn--loading');
    submitBtn.disabled = false;
  }
}

function showAnalysisResult(analysis) {
  const resultEl = document.getElementById('analysis-result');
  if (!resultEl) return;

  const emotionColor = getEmotionColor(analysis.primary_emotion);

  resultEl.innerHTML = `
    <div class="glass-card glass-card--compact stagger-children" style="margin-top: var(--space-md);">
      <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md);">
        <span style="width:10px; height:10px; border-radius:50%; background:${emotionColor};"></span>
        <strong style="text-transform: capitalize; color: ${emotionColor};">${analysis.primary_emotion}</strong>
        <span style="color: var(--text-tertiary); font-size: var(--text-xs);">intensity ${analysis.emotion_intensity}/10</span>
      </div>
      
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-md);">
        ${analysis.stress_triggers.map((t) => `<span class="chip chip--stress">${t}</span>`).join('')}
      </div>
      
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-bottom: var(--space-md);">
        ${analysis.positive_signals.map((s) => `<span class="chip chip--calm">✨ ${s}</span>`).join('')}
      </div>
      
      <div style="font-size: var(--text-xs); color: var(--text-tertiary);">
        Burnout index: ${analysis.burnout_risk_index}/10 · Mira is thinking...
      </div>
    </div>
  `;

  resultEl.style.display = 'block';
}

function getEmotionColor(emotion) {
  const colors = {
    overwhelmed: '#f87171', determined: '#fbbf24', anxious: '#fb923c',
    exhausted: '#94a3b8', hopeful: '#6ee7b7', frustrated: '#ef4444',
    lonely: '#818cf8', calm: '#34d399', defeated: '#9ca3af', motivated: '#a3e635',
  };
  return colors[emotion] || '#a78bfa';
}

/* ============================================
   INSIGHTS / DASHBOARD
   ============================================ */

async function refreshData() {
  try {
    recentEntries = await getRecentEntries(30);
    renderInsights();
  } catch (e) {
    console.error('Failed to refresh data:', e);
  }
}

function renderInsights() {
  const periodEntries = recentEntries.filter((e) => {
    const cutoff = Date.now() - currentPeriod * 24 * 60 * 60 * 1000;
    return e.timestamp >= cutoff;
  });

  // Mood Wave
  const waveContainer = document.getElementById('mood-wave-chart');
  if (waveContainer) {
    renderMoodWave(waveContainer, periodEntries, currentPeriod);
  }

  // Trigger Bubbles
  const bubblesContainer = document.getElementById('trigger-bubbles');
  if (bubblesContainer) {
    renderTriggerBubbles(bubblesContainer, periodEntries);
  }

  // Burnout Meter
  const burnoutContainer = document.getElementById('burnout-meter');
  if (burnoutContainer) {
    const burnouts = periodEntries
      .map((e) => e.analysis?.burnout_risk_index)
      .filter((b) => b != null);
    const avg = burnouts.length
      ? burnouts.reduce((a, b) => a + b, 0) / burnouts.length
      : 0;
    renderBurnoutMeter(burnoutContainer, avg, periodEntries);
  }

  // Cognitive Chart
  const cognitiveContainer = document.getElementById('cognitive-chart');
  if (cognitiveContainer) {
    renderCognitiveChart(cognitiveContainer, periodEntries);
  }

  // Heatmap (always 30-day)
  const heatmapContainer = document.getElementById('heatmap');
  if (heatmapContainer) {
    renderHeatmap(heatmapContainer, recentEntries);
  }

  // Stats
  const stats = calculateStats(periodEntries);
  const avgBurnoutEl = document.getElementById('stat-avg-burnout');
  const totalEl = document.getElementById('stat-total-entries');
  const streakEl = document.getElementById('stat-streak');

  if (avgBurnoutEl) avgBurnoutEl.textContent = stats.avgBurnout || '—';
  if (totalEl) totalEl.textContent = stats.totalEntries;
  if (streakEl) streakEl.textContent = `${stats.streakDays}d`;

  // Recent entries list
  renderRecentEntries(periodEntries);
}

function renderRecentEntries(entries) {
  const container = document.getElementById('recent-entries');
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📓</div>
        <h4 class="empty-state__title">No entries yet</h4>
        <p class="empty-state__text">Start journaling to see your patterns here</p>
      </div>
    `;
    return;
  }

  // Show last 5 entries
  const recent = entries.slice(-5).reverse();
  container.innerHTML = recent.map((e) => {
    const color = getEmotionColor(e.analysis?.primary_emotion);
    const date = new Date(e.timestamp).toLocaleDateString('en', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const snippet = e.text?.substring(0, 80) + (e.text?.length > 80 ? '...' : '');

    return `
      <div class="glass-card glass-card--compact journal-entry-preview">
        <div class="journal-entry-preview__date">${date}</div>
        <div class="journal-entry-preview__emotion">
          <span class="journal-entry-preview__emotion-dot" style="background: ${color}"></span>
          <span class="journal-entry-preview__emotion-text">${e.analysis?.primary_emotion || 'logged'}</span>
          <span style="margin-left: auto; font-size: var(--text-xs); color: var(--text-tertiary);">${e.analysis?.burnout_risk_index || '?'}/10</span>
        </div>
        <div class="journal-entry-preview__snippet">${snippet}</div>
      </div>
    `;
  }).join('');
}

/* ============================================
   PERIOD TOGGLE
   ============================================ */

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('period-toggle__btn')) {
    const period = parseInt(e.target.dataset.period);
    currentPeriod = period;

    document.querySelectorAll('.period-toggle__btn').forEach((btn) => {
      btn.classList.toggle('period-toggle__btn--active', parseInt(btn.dataset.period) === period);
    });

    renderInsights();
  }
});

/* ============================================
   SETTINGS
   ============================================ */

function setupSettings() {
  const nameInput = document.getElementById('settings-name');
  const apiInput = document.getElementById('settings-api-key');
  const saveBtn = document.getElementById('settings-save-btn');
  const deleteBtn = document.getElementById('settings-delete-btn');
  const exportBtn = document.getElementById('settings-export-btn');
  const themeBtns = document.querySelectorAll('.theme-btn');

  if (nameInput) nameInput.value = getUserName();
  if (apiInput) apiInput.value = getApiKey();
  
  // Set active theme button
  const currentTheme = getTheme();
  themeBtns.forEach(btn => {
    btn.classList.toggle('theme-btn--active', btn.dataset.themeVal === currentTheme);
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeVal;
      applyTheme(theme);
      setTheme(theme);
      themeBtns.forEach(b => b.classList.toggle('theme-btn--active', b === btn));
    });
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (nameInput) setUserName(nameInput.value.trim());
      if (apiInput) setApiKey(apiInput.value.trim());
      updateGreeting();
      showToast('Settings saved ✓');
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('This will delete ALL your journal entries and mood data. This cannot be undone. Are you sure?')) {
        await clearAllData();
        recentEntries = [];
        renderInsights();
        showToast('All data deleted');
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const { getAllEntries } = await import('./storage.js');
      const allEntries = await getAllEntries();
      const blob = new Blob([JSON.stringify(allEntries, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindcompanion-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported ✓');
    });
  }
}

/* ============================================
   THEME APPLICATION
   ============================================ */

function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  
  // Update meta theme color based on theme
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const colors = {
      midnight: '#0a0e1a',
      daylight: '#f5f7fa',
      sakura: '#fdf2f8',
      ocean: '#0c1929',
      forest: '#0f1a12',
      aurora: '#0f0720'
    };
    metaThemeColor.setAttribute('content', colors[themeName] || '#0a0e1a');
  }
  
  // Also force redraw charts if on insights tab
  if (currentView === 'insights') {
    renderInsights();
  }
}

/* ============================================
   TOAST
   ============================================ */

function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('toast--visible');

  setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 2500);
}

/* ============================================
   SETTINGS NAV BUTTON
   ============================================ */

document.addEventListener('click', (e) => {
  if (e.target.closest('#settings-nav-btn')) {
    switchView('settings');
  }
});
