/* ============================================
   MindCompanion — AI Engine Module
   Gemini API integration for both analytical
   and conversational prompts
   ============================================ */

import { getApiKey } from './storage.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';

/* ---------- SYSTEM PROMPTS ---------- */

const ANALYTICAL_PROMPT = `You are a specialized emotional analysis engine for a student wellness application.
Your ONLY job is to analyze the student's journal entry and return structured data.
You are NOT a therapist. You are NOT diagnosing anything. You are extracting patterns.

ANALYZE the following journal entry and return ONLY a valid JSON object with this exact schema:

{
  "primary_emotion": "<one of: overwhelmed, determined, anxious, exhausted, hopeful, frustrated, lonely, calm, defeated, motivated>",
  "emotion_intensity": <1-10 integer>,
  "secondary_emotions": ["<up to 3 additional emotions detected>"],
  "stress_triggers": ["<explicit or implicit triggers mentioned, e.g., 'mock test scores', 'sleep deprivation', 'peer comparison', 'parental expectations', 'time pressure'>"],
  "burnout_risk_index": <1-10 integer, where 1=thriving, 5=at risk, 10=critical>,
  "burnout_factors": {
    "emotional_exhaustion": <1-10>,
    "academic_cynicism": <1-10>,
    "reduced_efficacy": <1-10>
  },
  "positive_signals": ["<any resilience markers, coping attempts, or positive framing detected>"],
  "recommended_intervention": "<one of: coping_strategy, micro_mindfulness, motivational_spark, crisis_support>"
}

RULES:
- Return ONLY the JSON object. No markdown, no explanation, no preamble, no code fences.
- If the entry mentions self-harm, suicide, or severe distress, set burnout_risk_index to 10 and recommended_intervention to "crisis_support".
- Be sensitive to Indian academic context: board exams, JEE/NEET prep, coaching institutes, parental pressure, rank obsession.
- Detect implicit stress: "I studied 14 hours" implies sleep deprivation. "Everyone else got selected" implies peer comparison.
- Always find at least one positive_signal, even if small (e.g., "the student chose to write about their feelings").`;

const COMPANION_PROMPT = `You are Mira, a digital companion in a student wellness app called MindCompanion.

YOUR IDENTITY:
- You feel like a wise, caring senior student — someone who's been through board exams, competitive prep, late-night study sessions, and come out the other side.
- You are warm, grounded, and deeply authentic. You never sound like a robot or a textbook.
- You use natural, peer-like language. You say things like "Hey, I hear you" and "That sounds really rough" — not "I understand your emotional distress."

YOUR PURPOSE:
- You are an emotional support companion, NOT a therapist, counselor, or medical professional.
- You help students feel heard, process their feelings, and find small, actionable steps forward.
- You ALWAYS acknowledge their feelings before offering any suggestion.
- Keep responses concise — 2-4 short paragraphs max. Students are busy.

CORE INTERVENTION BEHAVIORS:

1. COPING STRATEGY (when student reports acute stress/panic):
   - First: Validate. "Hey, that sounds really overwhelming. Let's take this one step at a time."
   - Then: Offer a specific, immediate technique grounded in their situation.
   - Example: For physics panic → "Okay, physics feels like a mountain right now. Here's what helped me: instead of looking at the whole syllabus, pick ONE concept you found interesting this week. Just one. Spend 20 minutes with it like you're explaining it to a friend. Not to score marks — just to understand it. The confidence comes back from there."

2. MICRO-MINDFULNESS (when student needs a mental reset):
   - Ask about their time constraints first or offer a quick one.
   - Offer a tailored exercise:
     - "Try this: Put your pen down. Close your eyes. Take 4 slow breaths — in for 4 counts, out for 6. With each exhale, imagine you're setting down one heavy textbook. Just 4 breaths. That's it."
     - "Here's a quick reset: Look around and find 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. It pulls your brain out of panic mode and back into the present."

3. MOTIVATIONAL SPARK (when student expresses self-doubt or hopelessness):
   - Never use generic platitudes like "You can do it!" or "Believe in yourself!"
   - Instead, address their SPECIFIC root cause:
     - For "I'm not smart enough": "The fact that you're still showing up, still studying, still writing here — that tells me something about you that no mock score ever could."
     - For "Everyone else is better": "Comparison is the thief of peace, especially in a batch system where you only see others' highlights."

SAFETY RULES:
- If you detect ANY mention of self-harm, suicide, or severe crisis → IMMEDIATELY:
  1. Express care: "I'm really glad you told me this. What you're feeling matters."
  2. State clearly: "I'm not equipped to help with this the way you deserve. Please reach out to someone who can."
  3. Provide helpline: "📞 iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345 | AASRA: 9820466726"
  4. Do NOT continue the conversation beyond providing these resources.
- NEVER diagnose conditions (depression, anxiety disorder, ADHD, etc.)
- NEVER prescribe medication or treatment
- NEVER minimize feelings with "it's just stress" or "everyone goes through this"
- NEVER use emojis excessively. One or two max per message.`;

/* ---------- API CALLS ---------- */

/**
 * Call Gemini API
 * @param {string} systemPrompt - System instruction
 * @param {string} userMessage - User's input
 * @returns {Promise<string>} - Model's response text
 */
async function callGemini(systemPrompt, userMessage) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `GEMINI_API_ERROR: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('GEMINI_EMPTY_RESPONSE');
  }

  return text;
}

/**
 * Analyze a journal entry — returns structured JSON
 * @param {string} journalText - The student's journal entry
 * @returns {Promise<object>} - Parsed analysis object
 */
export async function analyzeEntry(journalText) {
  const raw = await callGemini(ANALYTICAL_PROMPT, journalText);

  // Clean potential markdown code fences
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI analysis:', cleaned);
    // Return a fallback structure
    return {
      primary_emotion: 'calm',
      emotion_intensity: 5,
      secondary_emotions: [],
      stress_triggers: [],
      burnout_risk_index: 3,
      burnout_factors: {
        emotional_exhaustion: 3,
        academic_cynicism: 3,
        reduced_efficacy: 3,
      },
      positive_signals: ['Student is actively journaling'],
      recommended_intervention: 'micro_mindfulness',
    };
  }
}

/**
 * Get a conversational response from Mira
 * @param {string} userMessage - What the student said
 * @param {object} [analysisContext] - Optional analysis data for context
 * @returns {Promise<string>} - Mira's response
 */
export async function getMiraResponse(userMessage, analysisContext = null) {
  let contextPrefix = '';

  if (analysisContext) {
    contextPrefix = `[CONTEXT FOR YOUR AWARENESS — do not reference these directly, use them to inform your tone and suggestions]
Primary emotion detected: ${analysisContext.primary_emotion} (intensity: ${analysisContext.emotion_intensity}/10)
Stress triggers: ${analysisContext.stress_triggers?.join(', ') || 'none detected'}
Burnout risk: ${analysisContext.burnout_risk_index}/10
Recommended intervention: ${analysisContext.recommended_intervention}
Positive signals: ${analysisContext.positive_signals?.join(', ') || 'journaling'}

[STUDENT'S MESSAGE]:
`;
  }

  const fullMessage = contextPrefix + userMessage;
  return callGemini(COMPANION_PROMPT, fullMessage);
}

/**
 * Check if the API key is configured and valid
 */
export function isApiConfigured() {
  return !!getApiKey();
}

/**
 * Generate a demo/fallback response when no API key is available
 */
export function getDemoAnalysis(text) {
  const lower = text.toLowerCase();

  let emotion = 'calm';
  let intensity = 5;
  const triggers = [];

  if (lower.includes('exam') || lower.includes('test') || lower.includes('mock')) {
    triggers.push('exam pressure');
    emotion = 'anxious';
    intensity = 7;
  }
  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('exhausted')) {
    triggers.push('sleep deprivation');
    emotion = 'exhausted';
    intensity = 6;
  }
  if (lower.includes('parent') || lower.includes('family') || lower.includes('mom') || lower.includes('dad')) {
    triggers.push('parental expectations');
    intensity = Math.min(10, intensity + 1);
  }
  if (lower.includes('everyone') || lower.includes('others') || lower.includes('batch')) {
    triggers.push('peer comparison');
    emotion = 'overwhelmed';
    intensity = 7;
  }
  if (lower.includes('fail') || lower.includes('bombed') || lower.includes('bad score')) {
    triggers.push('academic setback');
    emotion = 'defeated';
    intensity = 8;
  }
  if (lower.includes('happy') || lower.includes('great') || lower.includes('good')) {
    emotion = 'hopeful';
    intensity = 3;
  }

  if (triggers.length === 0) triggers.push('general academic stress');

  const burnout = Math.min(10, Math.max(1, Math.floor(intensity * 0.8)));

  return {
    primary_emotion: emotion,
    emotion_intensity: intensity,
    secondary_emotions: ['determined'],
    stress_triggers: triggers,
    burnout_risk_index: burnout,
    burnout_factors: {
      emotional_exhaustion: Math.min(10, intensity),
      academic_cynicism: Math.max(1, intensity - 2),
      reduced_efficacy: Math.max(1, intensity - 1),
    },
    positive_signals: ['Student is actively journaling their feelings'],
    recommended_intervention: intensity >= 7 ? 'coping_strategy' : 'micro_mindfulness',
  };
}

export function getDemoMiraResponse(text, analysis) {
  const emotion = analysis?.primary_emotion || 'stressed';
  const triggers = analysis?.stress_triggers || [];
  const intervention = analysis?.recommended_intervention || 'coping_strategy';

  const responses = {
    coping_strategy: `Hey, I hear you. ${emotion === 'defeated' ? "That feeling of hitting a wall — it's really rough, and I'm not going to pretend it isn't." : "That sounds like a lot to carry right now."}

${triggers.includes('exam pressure') || triggers.includes('academic setback')
    ? "Here's something that helped me when I was drowning in prep: forget the full syllabus for a moment. Pick ONE topic — the one that bugs you the least — and spend just 20 minutes understanding it deeply. Not memorizing, understanding. Like you're explaining it to a curious friend. That tiny win? It shifts something."
    : "Let's try breaking this into something smaller. What's the ONE thing you could do in the next 20 minutes that would feel like a tiny step forward? It doesn't have to be big. Just one small thing."}

You've already done something brave by writing this down. That counts. 🌱`,

    micro_mindfulness: `Hey, sounds like your mind's been running at full speed. Let's slow it down for just a sec.

Try this right now — it takes about 60 seconds: Put everything down. Close your eyes. Take 4 slow breaths: breathe in for 4 counts, and out for 6. With each exhale, imagine you're setting down one heavy textbook from your shoulders. Just 4 breaths.

That's it. Nothing more. Your brain needs these micro-breaks to actually retain what you're studying. Think of it as charging your phone — you can't run on 2% forever. 🔋`,

    motivational_spark: `I want you to hear something — and I mean this genuinely.

${triggers.includes('peer comparison')
    ? "Comparison in a coaching batch is brutal because you only see everyone else's highlight reel. You don't see their 2am breakdowns, their confused faces during self-study, their own spirals. Your journey is yours, and it's valid."
    : "The fact that you're still here, still trying, still writing about how you feel — that tells me more about your strength than any score ever could. Aptitude isn't fixed. The people who crack these exams aren't the ones who never struggled. They're the ones who kept going anyway."}

One rough day doesn't define your trajectory. 🌿`,
  };

  return responses[intervention] || responses.coping_strategy;
}
