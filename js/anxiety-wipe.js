/* ============================================
   MindCompanion — Anxiety Wipe Canvas
   Somatic interaction for scattering thoughts
   ============================================ */

export function initAnxietyWipe() {
  const container = document.getElementById('anxiety-wipe-container');
  const input = document.getElementById('anxiety-input');
  const wipeBtn = document.getElementById('wipe-btn');
  const canvas = document.getElementById('wipe-canvas');
  if (!container || !input || !wipeBtn || !canvas) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let particles = [];
  let isWiping = false;
  let animationId = null;

  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  wipeBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    
    // Hide input and show canvas
    input.style.display = 'none';
    wipeBtn.style.display = 'none';
    canvas.style.display = 'block';
    
    // Draw text to canvas to get pixels
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Simple text wrapping simulation for canvas
    wrapText(ctx, text, canvas.width/2, canvas.height/2, canvas.width - 40, 40);
    
    createParticles();
    isWiping = true;
    animate();
  });

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    let words = text.split(' ');
    let line = '';
    let startY = y - (words.length * lineHeight) / 4; // approximate vertical centering

    for(let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = context.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, startY);
        line = words[n] + ' ';
        startY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, startY);
  }

  function createParticles() {
    particles = [];
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 128) {
          particles.push({
            x: x,
            y: y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
            color: `rgba(${data[index]}, ${data[index+1]}, ${data[index+2]}, 1)`
          });
        }
      }
    }
  }

  // Mouse/Touch interaction
  let mouse = { x: -1000, y: -1000, radius: 40 };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  
  canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
    e.preventDefault();
  }, {passive: false});

  canvas.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });
  canvas.addEventListener('touchend', () => { mouse.x = -1000; mouse.y = -1000; });

  function animate() {
    if (!isWiping) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let activeParticles = 0;

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      let dx = mouse.x - p.x;
      let dy = mouse.y - p.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius) {
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let force = (mouse.radius - distance) / mouse.radius;
        let directionX = forceDirectionX * force * -10;
        let directionY = forceDirectionY * force * -10;
        
        p.vx += directionX;
        p.vy += directionY;
      }

      p.x += p.vx;
      p.y += p.vy;
      
      // Friction
      p.vx *= 0.95;
      p.vy *= 0.95;
      
      // Check if particle is still on screen or moving
      if (p.x > 0 && p.x < canvas.width && p.y > 0 && p.y < canvas.height && (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1)) {
        activeParticles++;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (activeParticles > 0 || mouse.x !== -1000) {
      animationId = requestAnimationFrame(animate);
    } else {
      // Done wiping
      isWiping = false;
      setTimeout(resetWipe, 1000);
    }
  }

  function resetWipe() {
    input.value = '';
    input.style.display = 'block';
    wipeBtn.style.display = 'block';
    canvas.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add positive reinforcement
    const successMsg = document.createElement('div');
    successMsg.textContent = 'Thought released.';
    successMsg.style.position = 'absolute';
    successMsg.style.color = 'var(--text-secondary)';
    successMsg.style.animation = 'fadeInOut 2s ease forwards';
    container.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 2000);
  }
}
