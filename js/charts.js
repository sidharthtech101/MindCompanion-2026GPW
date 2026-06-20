/* ============================================
   MindCompanion — Charts Module
   SVG/Canvas chart renderers
   ============================================ */

/* ---- Emotion Color Map ---- */
const EMOTION_COLORS = {
  overwhelmed: '#f87171',
  determined: '#fbbf24',
  anxious: '#fb923c',
  exhausted: '#94a3b8',
  hopeful: '#6ee7b7',
  frustrated: '#ef4444',
  lonely: '#818cf8',
  calm: '#34d399',
  defeated: '#9ca3af',
  motivated: '#a3e635',
};

function getEmotionColor(emotion) {
  return EMOTION_COLORS[emotion] || '#a78bfa';
}

/* ---- Burnout Color ---- */
function getBurnoutColor(value) {
  if (value <= 3) return '#6ee7b7';
  if (value <= 5) return '#fbbf24';
  if (value <= 7) return '#fb923c';
  return '#f87171';
}

function getBurnoutGlow(value) {
  if (value <= 3) return 'rgba(110,231,183,0.3)';
  if (value <= 5) return 'rgba(251,191,36,0.3)';
  if (value <= 7) return 'rgba(251,146,60,0.3)';
  return 'rgba(248,113,113,0.3)';
}

/* ============================================
   MOOD WAVE CHART (SVG-based)
   ============================================ */

/**
 * Render the mood wave chart
 * @param {HTMLElement} container - The container element
 * @param {Array} entries - Array of journal entries with analysis
 * @param {number} days - Number of days to show (7 or 30)
 */
export function renderMoodWave(container, entries, days = 7) {
  container.innerHTML = '';

  const width = container.clientWidth || 400;
  const height = 160;
  const padding = { top: 20, right: 16, bottom: 30, left: 16 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Create data points mapped to days
  const now = new Date();
  const dayLabels = [];
  const dataPoints = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = days <= 7
      ? date.toLocaleDateString('en', { weekday: 'short' })
      : date.getDate().toString();
    dayLabels.push(dayName);

    // Find entry for this date
    const entry = entries.find((e) => e.date === dateStr);
    dataPoints.push({
      date: dateStr,
      label: dayName,
      value: entry ? entry.analysis?.emotion_intensity || 5 : null,
      emotion: entry ? entry.analysis?.primary_emotion || 'calm' : null,
      burnout: entry ? entry.analysis?.burnout_risk_index || 3 : null,
    });
  }

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.display = 'block';

  // Defs for gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  // Area fill gradient
  const areaGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  areaGrad.setAttribute('id', 'moodAreaGrad');
  areaGrad.setAttribute('x1', '0'); areaGrad.setAttribute('y1', '0');
  areaGrad.setAttribute('x2', '0'); areaGrad.setAttribute('y2', '1');
  areaGrad.innerHTML = `
    <stop offset="0%" stop-color="#6ee7b7" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#6ee7b7" stop-opacity="0.01"/>
  `;
  defs.appendChild(areaGrad);

  // Glow filter
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', 'glow');
  filter.innerHTML = `<feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>`;
  defs.appendChild(filter);

  svg.appendChild(defs);

  // Filter to valid points for the line
  const validPoints = dataPoints
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.value !== null);

  if (validPoints.length === 0) {
    // Empty state
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', width / 2);
    text.setAttribute('y', height / 2);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'rgba(255,255,255,0.3)');
    text.setAttribute('font-size', '13');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.textContent = 'Journal entries will appear here';
    svg.appendChild(text);
    container.appendChild(svg);
    return;
  }

  // Map points to coordinates
  const xStep = chartWidth / (dataPoints.length - 1 || 1);
  const coords = validPoints.map((p) => ({
    x: padding.left + p.index * xStep,
    y: padding.top + chartHeight - (p.value / 10) * chartHeight,
    ...p,
  }));

  // Draw grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width - padding.right);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.04)');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }

  // Build smooth curve path (Catmull-Rom to Bezier)
  function catmullRomToBezier(points) {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    const tension = 0.3;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return d;
  }

  const linePath = catmullRomToBezier(coords);

  // Area path (close to bottom)
  if (coords.length >= 2) {
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const bottomY = padding.top + chartHeight;
    areaPath.setAttribute(
      'd',
      `${linePath} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`
    );
    areaPath.setAttribute('fill', 'url(#moodAreaGrad)');
    svg.appendChild(areaPath);
  }

  // Line path
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', linePath);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#6ee7b7');
  line.setAttribute('stroke-width', '2.5');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('filter', 'url(#glow)');

  // Animate the line drawing
  const pathLength = line.getTotalLength ? 1000 : 1000;
  line.setAttribute('stroke-dasharray', pathLength);
  line.setAttribute('stroke-dashoffset', pathLength);
  line.style.animation = 'waveDraw 1.5s cubic-bezier(0.16,1,0.3,1) forwards';

  svg.appendChild(line);

  // Data points (circles)
  coords.forEach((p, idx) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'pointer';
    group.setAttribute('data-index', idx);

    // Glow circle
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', p.x);
    glow.setAttribute('cy', p.y);
    glow.setAttribute('r', '8');
    glow.setAttribute('fill', getEmotionColor(p.emotion));
    glow.setAttribute('opacity', '0');
    glow.style.transition = 'opacity 0.2s ease';
    group.appendChild(glow);

    // Main dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x);
    dot.setAttribute('cy', p.y);
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', getEmotionColor(p.emotion));
    dot.setAttribute('stroke', '#0a0e1a');
    dot.setAttribute('stroke-width', '2');
    dot.style.transition = 'r 0.2s ease';
    group.appendChild(dot);

    // Hover interactions
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitArea.setAttribute('cx', p.x);
    hitArea.setAttribute('cy', p.y);
    hitArea.setAttribute('r', '16');
    hitArea.setAttribute('fill', 'transparent');
    hitArea.style.cursor = 'pointer';

    hitArea.addEventListener('mouseenter', () => {
      glow.setAttribute('opacity', '0.25');
      dot.setAttribute('r', '6');
      showTooltip(container, p);
    });

    hitArea.addEventListener('mouseleave', () => {
      glow.setAttribute('opacity', '0');
      dot.setAttribute('r', '4');
      hideTooltip(container);
    });

    group.appendChild(hitArea);
    svg.appendChild(group);
  });

  // Day labels along bottom
  dataPoints.forEach((p, i) => {
    // Show labels only for a subset if 30-day view
    if (days > 7 && i % 5 !== 0 && i !== dataPoints.length - 1) return;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', padding.left + i * xStep);
    text.setAttribute('y', height - 6);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'rgba(255,255,255,0.35)');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.textContent = p.label;
    svg.appendChild(text);
  });

  container.appendChild(svg);

  // Create tooltip element
  let tooltip = container.querySelector('.mood-wave-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'mood-wave-tooltip';
    container.appendChild(tooltip);
  }
}

function showTooltip(container, point) {
  let tooltip = container.querySelector('.mood-wave-tooltip');
  if (!tooltip) return;

  tooltip.innerHTML = `
    <div class="mood-wave-tooltip__emotion" style="color: ${getEmotionColor(point.emotion)}">${point.emotion}</div>
    <div class="mood-wave-tooltip__score">Intensity: ${point.value}/10 · Burnout: ${point.burnout}/10</div>
  `;

  const rect = container.getBoundingClientRect();
  tooltip.style.left = `${point.x - 50}px`;
  tooltip.style.top = `${point.y - 55}px`;
  tooltip.classList.add('mood-wave-tooltip--visible');
}

function hideTooltip(container) {
  const tooltip = container.querySelector('.mood-wave-tooltip');
  if (tooltip) {
    tooltip.classList.remove('mood-wave-tooltip--visible');
  }
}

/* ============================================
   TRIGGER BUBBLES
   ============================================ */

/**
 * Render floating trigger bubbles
 * @param {HTMLElement} container
 * @param {Array} entries - Entries with analysis.stress_triggers
 */
export function renderTriggerBubbles(container, entries) {
  container.innerHTML = '';

  // Aggregate triggers
  const triggerCounts = {};
  entries.forEach((e) => {
    const triggers = e.analysis?.stress_triggers || [];
    triggers.forEach((t) => {
      const key = t.toLowerCase().trim();
      triggerCounts[key] = (triggerCounts[key] || 0) + 1;
    });
  });

  const sorted = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Top 8 triggers

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state__text" style="padding: 32px 0;">Triggers will appear as you journal</p></div>';
    return;
  }

  const maxCount = sorted[0][1];
  const containerWidth = container.clientWidth || 300;
  const containerHeight = 200;

  // Color palette for bubbles
  const colors = [
    'rgba(248,113,113,0.15)', 'rgba(251,191,36,0.15)',
    'rgba(167,139,250,0.15)', 'rgba(96,165,250,0.15)',
    'rgba(244,114,182,0.15)', 'rgba(110,231,183,0.15)',
    'rgba(251,146,60,0.15)', 'rgba(129,140,248,0.15)',
  ];

  const borderColors = [
    'rgba(248,113,113,0.3)', 'rgba(251,191,36,0.3)',
    'rgba(167,139,250,0.3)', 'rgba(96,165,250,0.3)',
    'rgba(244,114,182,0.3)', 'rgba(110,231,183,0.3)',
    'rgba(251,146,60,0.3)', 'rgba(129,140,248,0.3)',
  ];

  // Layout bubbles with simple packing
  const bubbles = sorted.map(([trigger, count], i) => {
    const ratio = count / maxCount;
    const size = Math.max(48, Math.min(90, 48 + ratio * 42));
    return { trigger, count, size, color: colors[i % colors.length], borderColor: borderColors[i % borderColors.length], index: i };
  });

  // Simple layout: position bubbles in a flow
  const positions = layoutBubbles(bubbles, containerWidth, containerHeight);

  positions.forEach((b) => {
    const bubble = document.createElement('div');
    bubble.className = `trigger-bubble float-anim float-anim--delay-${b.index % 4 + 1}`;
    bubble.style.cssText = `
      width: ${b.size}px;
      height: ${b.size}px;
      left: ${b.x}px;
      top: ${b.y}px;
      background: ${b.color};
      border-color: ${b.borderColor};
    `;

    bubble.innerHTML = `
      <span class="trigger-bubble__label">${b.trigger}</span>
      <span class="trigger-bubble__count">${b.count}×</span>
    `;

    bubble.title = `"${b.trigger}" appeared ${b.count} time${b.count > 1 ? 's' : ''}`;
    container.appendChild(bubble);
  });
}

function layoutBubbles(bubbles, width, height) {
  const placed = [];

  bubbles.forEach((b) => {
    let bestX = width / 2 - b.size / 2;
    let bestY = height / 2 - b.size / 2;
    let found = false;

    // Try to place without overlap using spiral approach
    for (let angle = 0; angle < Math.PI * 8; angle += 0.3) {
      const radius = 10 + angle * 8;
      const x = width / 2 + Math.cos(angle) * radius - b.size / 2;
      const y = height / 2 + Math.sin(angle) * radius * 0.6 - b.size / 2;

      if (x < 0 || x + b.size > width || y < 0 || y + b.size > height) continue;

      const overlaps = placed.some((p) => {
        const dx = (x + b.size / 2) - (p.x + p.size / 2);
        const dy = (y + b.size / 2) - (p.y + p.size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (b.size / 2 + p.size / 2) + 4;
      });

      if (!overlaps) {
        bestX = x;
        bestY = y;
        found = true;
        break;
      }
    }

    placed.push({ ...b, x: bestX, y: bestY });
  });

  return placed;
}

/* ============================================
   BURNOUT METER (Radial Ring)
   ============================================ */

/**
 * Render the burnout meter ring
 * @param {HTMLElement} container
 * @param {number} value - Burnout index (1-10)
 * @param {Array} entries - Recent entries for insight
 */
export function renderBurnoutMeter(container, value, entries) {
  const circumference = 2 * Math.PI * 54; // r=54
  const offset = circumference - (value / 10) * circumference;
  const color = getBurnoutColor(value);
  const glow = getBurnoutGlow(value);

  // Generate insight text
  const insight = getBurnoutInsight(value, entries);

  container.innerHTML = `
    <div class="burnout-ring glow-pulse" style="--glow-color: ${glow}">
      <svg viewBox="0 0 120 120">
        <circle class="burnout-ring__bg" cx="60" cy="60" r="54"/>
        <circle class="burnout-ring__fill" cx="60" cy="60" r="54"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          style="filter: drop-shadow(0 0 6px ${glow})"
        />
      </svg>
      <div class="burnout-ring__value">
        <span class="burnout-ring__number" style="color: ${color}">${value.toFixed(1)}</span>
        <span class="burnout-ring__label">/ 10</span>
      </div>
    </div>
    <p class="burnout-insight">${insight}</p>
  `;
}

function getBurnoutInsight(value, entries) {
  if (value <= 2) return "You're doing <strong>really well</strong> — keep listening to yourself like this.";
  if (value <= 4) return "You're <strong>holding steady</strong>. Those small breaks you're taking? They're working.";
  if (value <= 6) return "You're in the <strong>watch zone</strong>. Consider scaling back just a little — even 30 mins less can help.";
  if (value <= 8) return "Your mind's been running <strong>on overdrive</strong>. A proper break isn't laziness — it's strategy.";
  return "You're in the <strong>red zone</strong>. Please be gentle with yourself. Consider talking to someone you trust.";
}

/* ============================================
   30-DAY HEATMAP
   ============================================ */

/**
 * Render a 30-day mood heatmap calendar
 * @param {HTMLElement} container
 * @param {Array} entries
 */
export function renderHeatmap(container, entries) {
  container.innerHTML = '';

  // Day labels header
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  dayNames.forEach((d) => {
    const label = document.createElement('div');
    label.className = 'heatmap__day-label';
    label.textContent = d;
    container.appendChild(label);
  });

  // Build 35 cells (5 weeks) going back from today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find the start of the calendar (go back to fill complete weeks)
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 34); // 35 days ago

  // Align to start of week (Sunday)
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  // Map entries by date
  const entryMap = {};
  entries.forEach((e) => {
    if (e.date) {
      entryMap[e.date] = e;
    }
  });

  const current = new Date(startDate);
  while (current <= endDate || current.getDay() !== 0) {
    if (current > endDate && current.getDay() === 0) break;

    const dateStr = current.toISOString().split('T')[0];
    const cell = document.createElement('div');
    cell.className = 'heatmap__cell';

    if (current > today) {
      cell.classList.add('heatmap__cell--empty');
    } else {
      const entry = entryMap[dateStr];
      if (entry) {
        const intensity = entry.analysis?.emotion_intensity || 5;
        // Map 1-10 intensity to 1-6 level (1 = calm/good, 6 = high stress)
        const level = Math.min(6, Math.max(1, Math.ceil(intensity / 1.7)));
        cell.setAttribute('data-level', level);
        cell.title = `${dateStr}: ${entry.analysis?.primary_emotion || 'logged'} (${intensity}/10)`;
      }
    }

    container.appendChild(cell);
    current.setDate(current.getDate() + 1);
  }
}

/* ============================================
   STATS ROW
   ============================================ */

/**
 * Calculate summary stats from entries
 * @param {Array} entries
 * @returns {object}
 */
export function calculateStats(entries) {
  if (!entries.length) {
    return { avgBurnout: 0, totalEntries: 0, streakDays: 0 };
  }

  const burnouts = entries
    .map((e) => e.analysis?.burnout_risk_index)
    .filter((b) => b != null);
  const avgBurnout = burnouts.length
    ? (burnouts.reduce((a, b) => a + b, 0) / burnouts.length).toFixed(1)
    : 0;

  // Calculate streak
  const dates = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];

    if (dates.includes(expectedStr)) {
      streak++;
    } else {
      break;
    }
  }

  return {
    avgBurnout,
    totalEntries: entries.length,
    streakDays: streak,
  };
}

/* ============================================
   COGNITIVE LOAD CHART
   ============================================ */

/**
 * Render the cognitive fatigue chart
 * @param {HTMLElement} container
 * @param {Array} entries
 */
export function renderCognitiveChart(container, entries) {
  if (!container) return;
  container.innerHTML = '';

  // Filter entries to only those with cognitiveLoad
  const studySessions = entries.filter(e => e.cognitiveLoad !== undefined).sort((a, b) => a.timestamp - b.timestamp);

  if (studySessions.length === 0) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state__text" style="padding: 24px 0;">Log a study session to see your cognitive fatigue curve.</p></div>';
    return;
  }

  const width = container.clientWidth || 400;
  const height = 140;
  // Increase right padding to leave room for forecast
  const padding = { top: 20, right: 60, bottom: 20, left: 16 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.display = 'block';

  // Map to points
  const points = studySessions.map((session, i) => {
    return {
      x: padding.left + (studySessions.length > 1 ? (i / (studySessions.length - 1)) * chartWidth : chartWidth / 2),
      y: padding.top + chartHeight - (session.cognitiveLoad / 10) * chartHeight,
      value: session.cognitiveLoad,
      date: new Date(session.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
  });

  // Draw Line
  if (points.length > 1) {
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', d);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#fbbf24'); // Energy color
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
    
    // --- PREDICTIVE FORECAST LOGIC ---
    // Calculate simple linear regression of last 3 points
    if (points.length >= 2) {
      const recentPoints = points.slice(-3);
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      const n = recentPoints.length;
      
      recentPoints.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
      });
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
      
      const lastPoint = points[points.length - 1];
      const forecastX = lastPoint.x + 40; // extend right
      const forecastY = Math.max(padding.top, Math.min(padding.top + chartHeight, lastPoint.y + slope * 40));
      
      const forecastLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      forecastLine.setAttribute('d', `M ${lastPoint.x} ${lastPoint.y} L ${forecastX} ${forecastY}`);
      forecastLine.setAttribute('fill', 'none');
      forecastLine.setAttribute('stroke', '#a78bfa'); // Purple forecast
      forecastLine.setAttribute('stroke-width', '2');
      forecastLine.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(forecastLine);
      
      // Forecast Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', forecastX);
      text.setAttribute('y', forecastY - 10);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#a78bfa');
      text.setAttribute('font-size', '9');
      text.setAttribute('font-weight', 'bold');
      text.textContent = 'FORECAST';
      svg.appendChild(text);
    }
  }

  // Draw Points
  points.forEach(p => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', p.x);
    dot.setAttribute('cy', p.y);
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', '#0a0e1a');
    dot.setAttribute('stroke', p.value >= 8 ? '#ef4444' : '#fbbf24');
    dot.setAttribute('stroke-width', '2');
    group.appendChild(dot);
    
    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', p.x);
    text.setAttribute('y', p.y - 12);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'rgba(255,255,255,0.6)');
    text.setAttribute('font-size', '10');
    text.textContent = p.value;
    group.appendChild(text);

    svg.appendChild(group);
  });

  container.appendChild(svg);
}
