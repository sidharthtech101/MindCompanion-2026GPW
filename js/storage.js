/* ============================================
   MindCompanion — Storage Module
   IndexedDB + localStorage helpers
   ============================================ */

const DB_NAME = 'mindcompanion';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_MOODS = 'moods';

let db = null;

/**
 * Initialize IndexedDB
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Journal entries store
      if (!database.objectStoreNames.contains(STORE_ENTRIES)) {
        const entryStore = database.createObjectStore(STORE_ENTRIES, {
          keyPath: 'id',
          autoIncrement: true,
        });
        entryStore.createIndex('timestamp', 'timestamp', { unique: false });
        entryStore.createIndex('date', 'date', { unique: false });
      }

      // Quick mood logs store
      if (!database.objectStoreNames.contains(STORE_MOODS)) {
        const moodStore = database.createObjectStore(STORE_MOODS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        moodStore.createIndex('timestamp', 'timestamp', { unique: false });
        moodStore.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save a journal entry with its AI analysis
 */
export function saveEntry(entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);

    const data = {
      ...entry,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };

    const request = store.add(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a cognitive load study session
 */
export function saveStudySession(cognitiveLoad) {
  return saveEntry({ text: "Logged a study session.", cognitiveLoad, analysis: { primary_emotion: "exhausted", burnout_risk_index: Math.min(10, Math.max(1, cognitiveLoad)) } });
}

/**
 * Save a quick mood log
 */
export function saveMood(moodLevel, emoji) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MOODS, 'readwrite');
    const store = tx.objectStore(STORE_MOODS);

    const data = {
      moodLevel,
      emoji,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
    };

    const request = store.add(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get entries within a date range
 * @param {number} days - Number of past days to fetch
 */
export function getRecentEntries(days = 7) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const index = store.index('timestamp');

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const range = IDBKeyRange.lowerBound(cutoff);

    const request = index.openCursor(range);
    const results = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all mood logs within a date range
 */
export function getRecentMoods(days = 7) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MOODS, 'readonly');
    const store = tx.objectStore(STORE_MOODS);
    const index = store.index('timestamp');

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const range = IDBKeyRange.lowerBound(cutoff);

    const request = index.openCursor(range);
    const results = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all entries (for export)
 */
export function getAllEntries() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete all data
 */
export function clearAllData() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ENTRIES, STORE_MOODS], 'readwrite');
    tx.objectStore(STORE_ENTRIES).clear();
    tx.objectStore(STORE_MOODS).clear();
    tx.oncomplete = () => {
      localStorage.removeItem('mindcompanion_name');
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/* --- localStorage Helpers --- */

export function getUserName() {
  return localStorage.getItem('mindcompanion_name') || '';
}

export function setUserName(name) {
  localStorage.setItem('mindcompanion_name', name);
}

export function getApiKey() {
  return localStorage.getItem('mindcompanion_api_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('mindcompanion_api_key', key);
}

export function hasCompletedOnboarding() {
  return localStorage.getItem('mindcompanion_onboarded') === 'true';
}

export function setOnboarded() {
  localStorage.setItem('mindcompanion_onboarded', 'true');
}

export function getTheme() {
  return localStorage.getItem('mindcompanion_theme') || 'midnight';
}

export function setTheme(theme) {
  localStorage.setItem('mindcompanion_theme', theme);
}

/**
 * Generate sample data for demo mode
 */
export function generateSampleData() {
  const emotions = ['calm', 'anxious', 'determined', 'overwhelmed', 'hopeful', 'exhausted', 'frustrated', 'motivated'];
  const triggers = ['mock tests', 'sleep deprivation', 'peer comparison', 'parental expectations', 'time pressure', 'coaching schedule', 'syllabus backlog'];
  const positives = [
    'Kept journaling consistently',
    'Took a short break today',
    'Reached out to a friend',
    'Finished one chapter',
    'Tried a breathing exercise',
    'Slept 7 hours',
    'Solved a difficult problem',
  ];

  const entries = [];
  const now = Date.now();

  for (let i = 29; i >= 0; i--) {
    // ~70% chance of having an entry on any given day
    if (Math.random() > 0.7) continue;

    const dayOffset = i * 24 * 60 * 60 * 1000;
    const timestamp = now - dayOffset;
    const date = new Date(timestamp).toISOString().split('T')[0];

    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const intensity = Math.floor(Math.random() * 7) + 3; // 3-9
    const burnout = Math.max(1, Math.min(10, Math.floor(Math.random() * 6) + 2 + (intensity > 6 ? 2 : 0)));

    const numTriggers = Math.floor(Math.random() * 3) + 1;
    const entryTriggers = [];
    const usedIndices = new Set();
    for (let t = 0; t < numTriggers; t++) {
      let idx;
      do { idx = Math.floor(Math.random() * triggers.length); } while (usedIndices.has(idx));
      usedIndices.add(idx);
      entryTriggers.push(triggers[idx]);
    }

    entries.push({
      text: `Sample journal entry for ${date}`,
      timestamp,
      date,
      analysis: {
        primary_emotion: emotion,
        emotion_intensity: intensity,
        secondary_emotions: [emotions[Math.floor(Math.random() * emotions.length)]],
        stress_triggers: entryTriggers,
        burnout_risk_index: burnout,
        burnout_factors: {
          emotional_exhaustion: Math.floor(Math.random() * 6) + 3,
          academic_cynicism: Math.floor(Math.random() * 5) + 2,
          reduced_efficacy: Math.floor(Math.random() * 5) + 2,
        },
        positive_signals: [positives[Math.floor(Math.random() * positives.length)]],
        recommended_intervention: 'coping_strategy',
      },
    });
  }

  // Save to IndexedDB
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);

    entries.forEach((entry) => store.add(entry));

    tx.oncomplete = () => resolve(entries);
    tx.onerror = () => reject(tx.error);
  });
}
