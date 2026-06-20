/* ============================================
   MindCompanion — Safety Module
   Crisis detection + guardrail overlay
   ============================================ */

const CRISIS_KEYWORDS = [
  'kill myself', 'end it all', 'want to die', 'suicide',
  'self-harm', 'self harm', 'cutting myself', 'not worth living',
  'no point in living', 'better off dead', 'can\'t go on',
  'end my life', 'hurt myself', 'take my life', 'don\'t want to live',
  'don\'t want to exist', 'wish i was dead', 'wish i were dead',
  'nothing matters anymore', 'give up on life', 'no reason to live',
  'overdose', 'jump off', 'hang myself',
];

const HELPLINES = [
  {
    name: 'iCall',
    number: '9152987821',
    hours: 'Mon-Sat, 8am-10pm',
    tel: 'tel:9152987821',
  },
  {
    name: 'Vandrevala Foundation',
    number: '1860-2662-345',
    hours: '24/7',
    tel: 'tel:18602662345',
  },
  {
    name: 'AASRA',
    number: '9820466726',
    hours: '24/7',
    tel: 'tel:9820466726',
  },
  {
    name: 'Snehi',
    number: '044-24640050',
    hours: '24/7',
    tel: 'tel:04424640050',
  },
];

/**
 * Check if text contains crisis indicators
 * @param {string} text - User input to scan
 * @returns {boolean}
 */
export function detectCrisis(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Show the crisis overlay
 */
export function showCrisisOverlay() {
  const overlay = document.getElementById('crisis-overlay');
  if (overlay) {
    overlay.classList.add('crisis-overlay--active');
    document.body.style.overflow = 'hidden';

    // Focus management for accessibility
    const firstLink = overlay.querySelector('.helpline-item');
    if (firstLink) {
      setTimeout(() => firstLink.focus(), 300);
    }
  }
}

/**
 * Hide the crisis overlay
 */
export function hideCrisisOverlay() {
  const overlay = document.getElementById('crisis-overlay');
  if (overlay) {
    overlay.classList.remove('crisis-overlay--active');
    document.body.style.overflow = '';
  }
}

/**
 * Build the crisis overlay DOM
 */
export function renderCrisisOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'crisis-overlay';
  overlay.className = 'crisis-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Crisis support resources');

  const helplineHTML = HELPLINES.map(
    (h) => `
    <a href="${h.tel}" class="helpline-item" aria-label="Call ${h.name} at ${h.number}">
      <div>
        <div class="helpline-item__name">${h.name}</div>
        <div class="helpline-item__hours">${h.hours}</div>
      </div>
      <div class="helpline-item__number">📞 ${h.number}</div>
    </a>
  `
  ).join('');

  overlay.innerHTML = `
    <div class="crisis-overlay__content">
      <div class="crisis-overlay__icon">💚</div>
      <h2 class="crisis-overlay__title">You matter. You're not alone.</h2>
      <p class="crisis-overlay__text">
        I'm really glad you're here. What you're feeling is important, and you deserve support from someone who can truly help. 
        Please reach out to one of these trained professionals — they're here for you.
      </p>
      <div class="crisis-overlay__helplines">
        ${helplineHTML}
      </div>
      <button class="btn btn--ghost" id="crisis-dismiss-btn" aria-label="Close and return to app">
        I understand, take me back
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Dismiss handler
  document.getElementById('crisis-dismiss-btn').addEventListener('click', hideCrisisOverlay);

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('crisis-overlay--active')) {
      hideCrisisOverlay();
    }
  });
}

/**
 * Get the crisis-safe AI response (used when crisis is detected)
 */
export function getCrisisResponse() {
  return `Hey, I want you to know something — the fact that you're sharing this means a lot. What you're feeling right now is real and it matters.

I'm not equipped to give you the support you truly deserve for this. But there are people who are — trained, caring professionals who want to help.

📞 **iCall**: 9152987821 (Mon-Sat, 8am-10pm)
📞 **Vandrevala Foundation**: 1860-2662-345 (24/7)  
📞 **AASRA**: 9820466726 (24/7)

Please reach out to them. You don't have to go through this alone. 💚`;
}
