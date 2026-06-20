/* ============================================
   MindCompanion — Ambient Soundscape Engine
   Procedural generation of focus/relaxation audio
   ============================================ */

let audioCtx = null;
let isPlaying = false;
let oscillators = [];
let noiseNode = null;
let gainNode = null;

export function toggleAudio(type = 'focus') {
  if (isPlaying) {
    stopAudio();
    return false; // isPlaying = false
  } else {
    startAudio(type);
    return true; // isPlaying = true
  }
}

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function startAudio(type) {
  initAudioContext();
  
  // Master gain
  gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 2); // fade in

  if (type === 'focus') {
    // 40Hz Gamma Binaural Beats (e.g., 200Hz left, 240Hz right)
    createBinauralBeat(200, 240);
    // Add subtle pink noise
    createPinkNoise(0.05);
  } else if (type === 'relax') {
    // 6Hz Theta Binaural Beats (e.g., 200Hz left, 206Hz right)
    createBinauralBeat(200, 206);
    createPinkNoise(0.08); // Slightly louder noise for relaxation like rain
  }

  isPlaying = true;
}

function stopAudio() {
  if (!isPlaying || !gainNode) return;
  
  // Fade out
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
  
  setTimeout(() => {
    oscillators.forEach(osc => osc.stop());
    oscillators = [];
    if (noiseNode) {
      noiseNode.stop();
      noiseNode.disconnect();
      noiseNode = null;
    }
    gainNode.disconnect();
    gainNode = null;
    isPlaying = false;
  }, 1600);
}

function createBinauralBeat(freqLeft, freqRight) {
  const merger = audioCtx.createChannelMerger(2);
  
  const oscLeft = audioCtx.createOscillator();
  oscLeft.type = 'sine';
  oscLeft.frequency.value = freqLeft;
  
  const oscRight = audioCtx.createOscillator();
  oscRight.type = 'sine';
  oscRight.frequency.value = freqRight;
  
  oscLeft.connect(merger, 0, 0); // Connect to left channel
  oscRight.connect(merger, 0, 1); // Connect to right channel
  
  merger.connect(gainNode);
  
  oscLeft.start();
  oscRight.start();
  
  oscillators.push(oscLeft, oscRight);
}

function createPinkNoise(volume) {
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11; // compensation
    b6 = white * 0.115926;
  }
  
  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = volume;
  
  noiseNode.connect(noiseGain);
  noiseGain.connect(gainNode);
  
  noiseNode.start();
}
