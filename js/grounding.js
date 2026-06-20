// grounding.js
// Handles Somatic Grounding features: Haptic Pacing, Wellness Pomodoro, and Bilateral Visuals

export function initGrounding() {
  setupHapticPacing();
  setupWellnessPomodoro();
  setupBilateralVisuals();
}

function setupHapticPacing() {
  const startBtn = document.getElementById('haptic-start-btn');
  const visualizer = document.getElementById('haptic-visualizer');
  const circle = visualizer?.querySelector('.haptic-circle');
  const instruction = document.getElementById('haptic-instruction');

  if (!startBtn || !visualizer || !circle || !instruction) return;

  let isPacing = false;
  let pacingInterval;

  startBtn.addEventListener('click', () => {
    if (isPacing) {
      // Stop
      isPacing = false;
      startBtn.textContent = 'Start';
      visualizer.style.display = 'none';
      clearInterval(pacingInterval);
      if (navigator.vibrate) navigator.vibrate(0);
    } else {
      // Start 4-7-8 Breathing
      isPacing = true;
      startBtn.textContent = 'Stop';
      visualizer.style.display = 'flex';
      
      runBreathingCycle();
      pacingInterval = setInterval(runBreathingCycle, 19000); // 4 + 7 + 8 = 19 seconds
    }
  });

  function runBreathingCycle() {
    // Phase 1: Inhale (4s)
    instruction.textContent = 'Inhale...';
    circle.style.transition = 'transform 4s linear, box-shadow 4s linear';
    circle.style.transform = 'scale(1.5)';
    circle.style.boxShadow = '0 0 20px var(--accent-calm)';
    if (navigator.vibrate) navigator.vibrate([4000]); // Continuous vibration
    
    // Phase 2: Hold (7s)
    setTimeout(() => {
      if (!isPacing) return;
      instruction.textContent = 'Hold...';
      circle.style.transition = 'box-shadow 1s ease';
      circle.style.transform = 'scale(1.5)';
      circle.style.boxShadow = '0 0 5px var(--accent-calm)';
      
      // Heartbeat pattern for hold (7 seconds)
      if (navigator.vibrate) {
        // [vibrate, pause, vibrate, pause...]
        navigator.vibrate([100, 900, 100, 900, 100, 900, 100, 900, 100, 900, 100, 900, 100]);
      }
    }, 4000);

    // Phase 3: Exhale (8s)
    setTimeout(() => {
      if (!isPacing) return;
      instruction.textContent = 'Exhale...';
      circle.style.transition = 'transform 8s linear, box-shadow 8s linear';
      circle.style.transform = 'scale(1)';
      circle.style.boxShadow = '0 0 0px var(--accent-calm)';
      if (navigator.vibrate) navigator.vibrate([8000]); // Continuous vibration
    }, 11000);
  }
}

function setupWellnessPomodoro() {
  const toggleBtn = document.getElementById('pomodoro-toggle-btn');
  const timeDisplay = document.getElementById('pomodoro-time');
  const overlay = document.getElementById('somatic-reset-overlay');
  const dismissBtn = document.getElementById('somatic-dismiss-btn');
  const countdownDisplay = document.getElementById('somatic-countdown');

  if (!toggleBtn || !timeDisplay || !overlay) return;

  // Set default to 25 mins. Can be shortened for testing.
  let WORK_TIME = 25 * 60; 
  
  // Dev mode bypass: allow clicking on the time display to fast-forward to 3 seconds remaining
  timeDisplay.addEventListener('dblclick', () => {
    if (isRunning) {
      timeLeft = 3;
      updateDisplay();
    }
  });

  let timeLeft = WORK_TIME;
  let timerInterval = null;
  let isRunning = false;

  function updateDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    timeDisplay.textContent = `${m}:${s}`;
  }

  toggleBtn.addEventListener('click', () => {
    if (isRunning) {
      clearInterval(timerInterval);
      isRunning = false;
      toggleBtn.textContent = 'Start';
      toggleBtn.classList.remove('btn--danger');
      toggleBtn.classList.add('btn--primary');
    } else {
      isRunning = true;
      toggleBtn.textContent = 'Pause';
      toggleBtn.classList.remove('btn--primary');
      toggleBtn.classList.add('btn--danger');

      timerInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          isRunning = false;
          timeLeft = WORK_TIME;
          updateDisplay();
          toggleBtn.textContent = 'Start';
          toggleBtn.classList.remove('btn--danger');
          toggleBtn.classList.add('btn--primary');
          
          triggerSomaticReset();
        }
      }, 1000);
    }
  });

  function triggerSomaticReset() {
    overlay.classList.add('overlay-fullscreen--visible');
    dismissBtn.style.display = 'none';
    
    let resetTime = 30;
    countdownDisplay.textContent = resetTime;
    
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    const resetInterval = setInterval(() => {
      resetTime--;
      countdownDisplay.textContent = resetTime;
      if (resetTime <= 0) {
        clearInterval(resetInterval);
        dismissBtn.style.display = 'inline-flex';
        countdownDisplay.textContent = "Done";
      }
    }, 1000);
  }

  dismissBtn.addEventListener('click', () => {
    overlay.classList.remove('overlay-fullscreen--visible');
  });
}

function setupBilateralVisuals() {
  const toggle = document.getElementById('bilateral-toggle');
  const bar = document.getElementById('bilateral-bar');

  if (!toggle || !bar) return;

  const isEnabled = localStorage.getItem('mc_bilateral_enabled') === 'true';
  toggle.checked = isEnabled;
  if (isEnabled) {
    bar.classList.add('bilateral-bar--active');
  }

  toggle.addEventListener('change', (e) => {
    const checked = e.target.checked;
    localStorage.setItem('mc_bilateral_enabled', checked);
    if (checked) {
      bar.classList.add('bilateral-bar--active');
    } else {
      bar.classList.remove('bilateral-bar--active');
    }
  });
}
