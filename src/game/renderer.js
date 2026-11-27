// Pre-cached gradients and offscreen sprites for zero-allocation 60fps rendering

const envCache = {
  width: 0,
  height: 0,
  roadLeft: 0,
  roadWidth: 0,
  bgGrad: null,
  roadGrad: null,
};

let spritesReady = false;
let lampGlowSprite = null;
let treeSprite = null;
let nitroGlowSprite = null;
let coinGlowSprite = null;
let playerBeamSprite = null;
let oncomingBeamSprite = null;

function makeOffscreen(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  drawFn(g, w, h);
  return c;
}

function ensureSprites() {
  if (spritesReady || typeof document === 'undefined') return;
  spritesReady = true;

  lampGlowSprite = makeOffscreen(58, 58, (g) => {
    const grad = g.createRadialGradient(29, 29, 1, 29, 29, 28);
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(29, 29, 28, 0, Math.PI * 2);
    g.fill();
  });

  treeSprite = makeOffscreen(38, 38, (g) => {
    g.fillStyle = 'rgba(6, 78, 59, 0.72)';
    g.beginPath();
    g.arc(19, 19, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(16, 185, 129, 0.45)';
    g.beginPath();
    g.arc(15, 15, 11, 0, Math.PI * 2);
    g.fill();
  });

  nitroGlowSprite = makeOffscreen(50, 50, (g) => {
    const grad = g.createRadialGradient(25, 25, 2, 25, 25, 24);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(25, 25, 24, 0, Math.PI * 2);
    g.fill();
  });

  coinGlowSprite = makeOffscreen(46, 46, (g) => {
    const grad = g.createRadialGradient(23, 23, 2, 23, 23, 22);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(23, 23, 22, 0, Math.PI * 2);
    g.fill();
  });

  playerBeamSprite = makeOffscreen(110, 144, (g) => {
    const grad = g.createLinearGradient(0, 144, 0, 0);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(35, 144);
    g.lineTo(4, 0);
    g.lineTo(106, 0);
    g.lineTo(75, 144);
    g.closePath();
    g.fill();
  });

  oncomingBeamSprite = makeOffscreen(104, 118, (g) => {
    const grad = g.createLinearGradient(0, 118, 0, 0);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.32)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(33, 118);
    g.lineTo(4, 0);
    g.lineTo(100, 0);
    g.lineTo(71, 118);
    g.closePath();
    g.fill();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawEnvironment(ctx, state) {
  ensureSprites();
  const {
    width,
    height,
    roadLeft,
    roadWidth,
    laneCount,
    roadOffset,
    boosting,
    hardMode,
  } = state;
  const roadRight = roadLeft + roadWidth;

  if (
    envCache.width !== width ||
    envCache.height !== height ||
    envCache.roadLeft !== roadLeft ||
    envCache.roadWidth !== roadWidth
  ) {
    envCache.width = width;
    envCache.height = height;
    envCache.roadLeft = roadLeft;
    envCache.roadWidth = roadWidth;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#070b14');
    bgGrad.addColorStop(1, '#0c1322');
    envCache.bgGrad = bgGrad;

    const roadGrad = ctx.createLinearGradient(roadLeft, 0, roadRight, 0);
    roadGrad.addColorStop(0, '#141a26');
    roadGrad.addColorStop(0.5, '#1b2232');
    roadGrad.addColorStop(1, '#141a26');
    envCache.roadGrad = roadGrad;
  }

  // Shoulder / night terrain
  ctx.fillStyle = envCache.bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle roadside grass stripes scrolling
  const stripeH = 80;
  const offset = roadOffset % (stripeH * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.045)';
  for (let y = -stripeH * 2 + offset; y < height + stripeH; y += stripeH * 2) {
    ctx.fillRect(0, y, roadLeft, stripeH);
    ctx.fillRect(roadRight, y, width - roadRight, stripeH);
  }

  // Asphalt surface
  ctx.fillStyle = envCache.roadGrad;
  ctx.fillRect(roadLeft, 0, roadWidth, height);

  // Alternating red/white racing curbs (batched by color to minimize state switches)
  const curbW = 10;
  const curbSeg = 40;
  const curbOffset = roadOffset % (curbSeg * 2);
  const startY = -curbSeg * 2 + curbOffset;
  ctx.fillStyle = '#ef4444';
  for (let y = startY, idx = 0; y < height + curbSeg; y += curbSeg, idx++) {
    if (idx % 2 === 0) {
      ctx.fillRect(roadLeft - curbW, y, curbW, curbSeg + 0.5);
      ctx.fillRect(roadRight, y, curbW, curbSeg + 0.5);
    }
  }
  ctx.fillStyle = '#e2e8f0';
  for (let y = startY, idx = 0; y < height + curbSeg; y += curbSeg, idx++) {
    if (idx % 2 !== 0) {
      ctx.fillRect(roadLeft - curbW, y, curbW, curbSeg + 0.5);
      ctx.fillRect(roadRight, y, curbW, curbSeg + 0.5);
    }
  }

  // Road edge white lines
  ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
  ctx.fillRect(roadLeft + 4, 0, 3, height);
  ctx.fillRect(roadRight - 7, 0, 3, height);

  // Lane dividers
  const laneW = roadWidth / laneCount;
  const dashLen = 44;
  const gapLen = 44;
  const cycle = dashLen + gapLen;
  const dashOffset = roadOffset % cycle;
  const centerLane = Math.floor(laneCount / 2);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
  for (let lane = 1; lane < laneCount; lane++) {
    if (hardMode && lane === centerLane) continue;
    const lx = roadLeft + lane * laneW - 2;
    for (let y = -cycle + dashOffset; y < height + cycle; y += cycle) {
      ctx.fillRect(lx, y, 4, dashLen);
    }
  }

  if (hardMode) {
    const centerLineX = roadLeft + centerLane * laneW;
    ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.fillRect(centerLineX - 4, 0, 2.5, height);
    ctx.fillRect(centerLineX + 1.5, 0, 2.5, height);
  }

  // Roadside streetlights & trees using pre-rendered sprites
  const propSpacing = 170;
  const propOffset = roadOffset % propSpacing;
  const drawLeftLamp = roadLeft > 42;
  const drawRightLamp = width - roadRight > 42;
  const drawLeftTree = roadLeft > 95;
  const drawRightTree = width - roadRight > 95;

  if (drawLeftLamp || drawRightLamp) {
    ctx.fillStyle = '#475569';
    for (let y = -propSpacing + propOffset; y < height + propSpacing; y += propSpacing) {
      if (drawLeftLamp) {
        const lx = roadLeft - 28;
        ctx.fillRect(lx - 2, y - 1, 16, 2.5);
        ctx.drawImage(lampGlowSprite, lx + 15 - 29, y - 29);
      }
      if (drawRightLamp) {
        const rx = roadRight + 28;
        ctx.fillRect(rx - 14, y - 1, 16, 2.5);
        ctx.drawImage(lampGlowSprite, rx - 15 - 29, y - 29);
      }
      if (drawLeftTree) {
        ctx.drawImage(treeSprite, roadLeft - 78 - 19, y + 65 - 19);
      }
      if (drawRightTree) {
        ctx.drawImage(treeSprite, roadRight + 78 - 19, y + 25 - 19);
      }
    }
  }

  // Speed lines on sides when boosting
  if (boosting) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    const leftSpace = Math.max(20, roadLeft - 14);
    const rightSpace = Math.max(20, width - roadRight - 20);
    for (let i = 0; i < 8; i++) {
      const sx =
        i % 2 === 0
          ? (i * 37) % leftSpace
          : roadRight + 14 + ((i * 53) % rightSpace);
      const sy = ((roadOffset * 2.2 + i * 130) % (height + 120)) - 60;
      ctx.fillRect(sx, sy, 2, 55);
    }
  }
}

export function drawPickup(ctx, pickup, time) {
  ensureSprites();
  const pulse = 1 + Math.sin(time * 0.008 + pickup.x) * 0.1;
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.scale(pulse, pulse);

  if (pickup.type === 'nitro') {
    ctx.drawImage(nitroGlowSprite, -25, -25);

    ctx.fillStyle = '#0284c7';
    roundRect(ctx, -10, -14, 20, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    roundRect(ctx, -7, -11, 14, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, 1);
  } else {
    ctx.drawImage(coinGlowSprite, -23, -23);

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#713f12';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
  }

  ctx.restore();
}

export function drawPlayerCar(ctx, player, carStyle, boosting, time) {
  ensureSprites();
  const { x, y, width: w, height: h, tilt } = player;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Pre-rendered headlight cone
  ctx.drawImage(playerBeamSprite, -55, -h * 0.48 - 144);

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  roundRect(ctx, -w / 2 + 4, -h / 2 + 6, w, h, 13);
  ctx.fill();

  // Nitro flames
  if (boosting) {
    const flicker = 14 + Math.sin(time * 0.08) * 7;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-12, h / 2 - 2);
    ctx.lineTo(-6, h / 2 + 22 + flicker);
    ctx.lineTo(0, h / 2 + 6);
    ctx.lineTo(6, h / 2 + 22 + flicker);
    ctx.lineTo(12, h / 2 - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath();
    ctx.moveTo(-7, h / 2 - 2);
    ctx.lineTo(-3, h / 2 + 12 + flicker * 0.5);
    ctx.lineTo(3, h / 2 + 12 + flicker * 0.5);
    ctx.lineTo(7, h / 2 - 2);
    ctx.closePath();
    ctx.fill();
  }

  // Tires
  ctx.fillStyle = '#020617';
  const wheelW = 7;
  const wheelH = 18;
  roundRect(ctx, -w / 2 - 3, -h * 0.34, wheelW, wheelH, 3);
  ctx.fill();
  roundRect(ctx, w / 2 - 4, -h * 0.34, wheelW, wheelH, 3);
  ctx.fill();
  roundRect(ctx, -w / 2 - 3, h * 0.14, wheelW, wheelH, 3);
  ctx.fill();
  roundRect(ctx, w / 2 - 4, h * 0.14, wheelW, wheelH, 3);
  ctx.fill();

  // Main chassis
  ctx.fillStyle = carStyle.body;
  roundRect(ctx, -w / 2, -h / 2, w, h, 14);
  ctx.fill();

  // Shading side bevel
  ctx.fillStyle = carStyle.dark;
  roundRect(ctx, -w / 2, h * 0.32, w, h * 0.18, 8);
  ctx.fill();

  // Racing stripes
  ctx.fillStyle = carStyle.accent;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(-5, -h / 2 + 3, 4, h - 6);
  ctx.fillRect(1, -h / 2 + 3, 4, h - 6);
  ctx.globalAlpha = 1;

  // Windshield
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, -w * 0.36, -h * 0.22, w * 0.72, h * 0.23, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
  roundRect(ctx, -w * 0.3, -h * 0.19, w * 0.42, h * 0.12, 4);
  ctx.fill();

  // Rear window
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, -w * 0.32, h * 0.14, w * 0.64, h * 0.15, 5);
  ctx.fill();

  // Headlights
  ctx.fillStyle = '#fef08a';
  roundRect(ctx, -w * 0.38, -h / 2 + 2, 10, 5, 2);
  ctx.fill();
  roundRect(ctx, w * 0.38 - 10, -h / 2 + 2, 10, 5, 2);
  ctx.fill();

  // Taillights
  ctx.fillStyle = '#ff2e4c';
  roundRect(ctx, -w * 0.38, h / 2 - 6, 11, 4, 2);
  ctx.fill();
  roundRect(ctx, w * 0.38 - 11, h / 2 - 6, 11, 4, 2);
  ctx.fill();

  ctx.restore();
}

export function drawEnemyCar(ctx, enemy) {
  ensureSprites();
  const { x, y, width: w, height: h, color, kind, oncoming } = enemy;
  ctx.save();
  ctx.translate(x, y);
  if (oncoming) {
    ctx.rotate(Math.PI);
    ctx.drawImage(oncomingBeamSprite, -52, -h * 0.48 - 118);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, -w / 2 + 4, -h / 2 + 6, w, h, kind === 'truck' ? 8 : 12);
  ctx.fill();

  // Tires
  ctx.fillStyle = '#020617';
  roundRect(ctx, -w / 2 - 2, -h * 0.34, 6, 16, 2);
  ctx.fill();
  roundRect(ctx, w / 2 - 4, -h * 0.34, 6, 16, 2);
  ctx.fill();
  roundRect(ctx, -w / 2 - 2, h * 0.16, 6, 16, 2);
  ctx.fill();
  roundRect(ctx, w / 2 - 4, h * 0.16, 6, 16, 2);
  ctx.fill();

  if (kind === 'truck') {
    ctx.fillStyle = '#e2e8f0';
    roundRect(ctx, -w / 2 + 2, -h / 2, w - 4, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, -w * 0.38, -h / 2 + 6, w * 0.76, 14, 4);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, -w / 2, -h / 2 + 30, w, h - 30, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 5, -h / 2 + 36, w - 10, h - 44);
  } else {
    ctx.fillStyle = color;
    roundRect(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, -w * 0.35, -h * 0.24, w * 0.7, h * 0.22, 6);
    ctx.fill();
    roundRect(ctx, -w * 0.32, h * 0.12, w * 0.64, h * 0.16, 5);
    ctx.fill();

    if (kind === 'sport') {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(-3, -h / 2 + 3, 6, h - 6);
    }
  }

  if (oncoming) {
    ctx.fillStyle = '#fef08a';
    roundRect(ctx, -w * 0.38, -h / 2 + 2, 10, 5, 2);
    ctx.fill();
    roundRect(ctx, w * 0.38 - 10, -h / 2 + 2, 10, 5, 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ef4444';
  roundRect(ctx, -w * 0.38, h / 2 - 6, 10, 4, 2);
  ctx.fill();
  roundRect(ctx, w * 0.38 - 10, h / 2 - 6, 10, 4, 2);
  ctx.fill();

  ctx.restore();
}

export function drawParticles(ctx, particles) {
  if (particles.length === 0) return;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const alpha = p.life / p.maxLife;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloatingTexts(ctx, texts) {
  if (texts.length === 0) return;
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    const alpha = t.life / t.maxLife;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#020617';
    ctx.fillText(t.label, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.label, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
