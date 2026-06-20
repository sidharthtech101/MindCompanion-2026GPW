/* ============================================
   MindCompanion — Study Session Biomarkers
   Passive behavior tracking
   ============================================ */

export function initBiomarkers(onInterventionNeeded) {
  setupTabThrashingMonitor(onInterventionNeeded);
  setupTypingCadenceMonitor(onInterventionNeeded);
}

function setupTabThrashingMonitor(onInterventionNeeded) {
  let switchTimestamps = [];
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const now = Date.now();
      switchTimestamps.push(now);
      
      // Keep only last 5 minutes
      const fiveMinsAgo = now - 5 * 60 * 1000;
      switchTimestamps = switchTimestamps.filter(t => t > fiveMinsAgo);
      
      // If > 5 switches in 5 mins, trigger intervention
      if (switchTimestamps.length > 5) {
        onInterventionNeeded("tab_thrashing");
        switchTimestamps = []; // reset after trigger
      }
    }
  });
}

function setupTypingCadenceMonitor(onInterventionNeeded) {
  const textarea = document.getElementById('journal-textarea');
  if (!textarea) return;

  let lastKeyTime = 0;
  let intervals = [];
  let isTyping = false;
  let typingTimer;

  textarea.addEventListener('keydown', (e) => {
    // Ignore non-character keys
    if (e.key.length !== 1) return;

    const now = Date.now();
    
    if (isTyping && lastKeyTime) {
      const interval = now - lastKeyTime;
      if (interval < 2000) { // only count reasonable gaps
        intervals.push(interval);
        if (intervals.length > 20) intervals.shift();
      }
    }
    
    lastKeyTime = now;
    isTyping = true;
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping = false;
      // Analyze variance
      if (intervals.length === 20) {
        const mean = intervals.reduce((a, b) => a + b, 0) / 20;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        
        // If typing is very erratic (high variance) and slow (high mean)
        // Values tweaked for reasonable human detection
        if (variance > 40000 && mean > 300) {
          onInterventionNeeded("typing_fatigue");
          intervals = []; // reset
        }
      }
    }, 2000);
  });
}
