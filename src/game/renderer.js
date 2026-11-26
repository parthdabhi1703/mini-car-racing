function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawEnvironment(ctx, state) {
  const { width, height, roadLeft, roadWidth, laneCount, roadOffset, boosting } = state;
  const roadRight = roadLeft + roadWidth;

  // Shoulder / night terrain
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#070b14');
  bgGrad.addColorStop(1, '#0c1322');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle roadside grid/grass stripes scrolling
  const stripeH = 80;
  const offset = roadOffset % (stripeH * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.045)';
  for (let y = -stripeH * 2 + offset; y < height + stripeH; y += stripeH * 2) {
    ctx.fillRect(0, y, roadLeft, stripeH);
    ctx.fillRect(roadRight, y, width - roadRight, stripeH);
  }

  // Asphalt surface
  const roadGrad = ctx.createLinearGradient(roadLeft, 0, roadRight, 0);
  roadGrad.addColorStop(0, '#141a26');
  roadGrad.addColorStop(0.5, '#1b2232');
  roadGrad.addColorStop(1, '#141a26');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(roadLeft, 0, roadWidth, height);

  // Alternating red/white racing curbs
  const curbW = 10;
  const curbSeg = 40;
  const curbOffset = roadOffset % (curbSeg * 2);
  for (let y = -curbSeg * 2 + curbOffset; y < height + curbSeg; y += curbSeg) {
    const isRed = Math.floor((y - curbOffset) / curbSeg) % 2 === 0;
    ctx.fillStyle = isRed ? '#ef4444' : '#e2e8f0';
    ctx.fillRect(roadLeft - curbW, y, curbW, curbSeg + 0.5);
    ctx.fillRect(roadRight, y, curbW, curbSeg + 0.5);
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

  ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
  for (let lane = 1; lane < laneCount; lane++) {
    const lx = roadLeft + lane * laneW - 2;
    for (let y = -cycle + dashOffset; y < height + cycle; y += cycle) {
      ctx.fillRect(lx, y, 4, dashLen);
    }
  }

  // Roadside streetlights & trees
  const propSpacing = 170;
  const propOffset = roadOffset % propSpacing;
  for (let y = -propSpacing + propOffset; y < height + propSpacing; y += propSpacing) {
    // Left side lamp/tree
    if (roadLeft > 42) {
      drawRoadsideLamp(ctx, roadLeft - 28, y, true);
    }
    if (width - roadRight > 42) {
      drawRoadsideLamp(ctx, roadRight + 28, y, false);
    }
    if (roadLeft > 95) {
      drawTree(ctx, roadLeft - 78, y + 65);
    }
    if (width - roadRight > 95) {
      drawTree(ctx, roadRight + 78, y + 25);
    }
  }

  // Speed lines on sides when boosting or driving fast
  if (boosting) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const sx = i % 2 === 0 ? (i * 37) % Math.max(20, roadLeft - 14) : roadRight + 14 + ((i * 53) % Math.max(20, width - roadRight - 20));
      const sy = ((roadOffset * 2.2 + i * 130) % (height + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 55);
      ctx.stroke();
    }
  }
}

function drawRoadsideLamp(ctx, x, y, onLeft) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(x - 2, y - 2, 4, 4);
  const armDir = onLeft ? 1 : -1;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + armDir * 14, y);
  ctx.stroke();

  const glowX = x + armDir * 15;
  const grad = ctx.createRadialGradient(glowX, y, 1, glowX, y, 28);
  grad.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
  grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(glowX, y, 28, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(ctx, x, y) {
  ctx.fillStyle = 'rgba(6, 78, 59, 0.7)';
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, 11, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPickup(ctx, pickup, time) {
  const pulse = 1 + Math.sin(time * 0.008 + pickup.x) * 0.1;
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.scale(pulse, pulse);

  if (pickup.type === 'nitro') {
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // Nitro canister
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
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

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
  const { x, y, width: w, height: h, tilt } = player;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Headlight cones
  const coneGrad = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 - 140);
  coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
  coneGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.34, -h * 0.48);
  ctx.lineTo(-w * 0.9, -h * 0.5 - 140);
  ctx.lineTo(w * 0.9, -h * 0.5 - 140);
  ctx.lineTo(w * 0.34, -h * 0.48);
  ctx.closePath();
  ctx.fill();

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
  const { x, y, width: w, height: h, color, kind } = enemy;
  ctx.save();
  ctx.translate(x, y);

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
    // Cab
    ctx.fillStyle = '#e2e8f0';
    roundRect(ctx, -w / 2 + 2, -h / 2, w - 4, 34, 8);
    ctx.fill();
    // Windshield
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, -w * 0.38, -h / 2 + 6, w * 0.76, 14, 4);
    ctx.fill();
    // Cargo trailer
    ctx.fillStyle = color;
    roundRect(ctx, -w / 2, -h / 2 + 30, w, h - 30, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 5, -h / 2 + 36, w - 10, h - 44);
  } else {
    // Car chassis
    ctx.fillStyle = color;
    roundRect(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, -w * 0.35, -h * 0.24, w * 0.7, h * 0.22, 6);
    ctx.fill();

    // Rear window
    roundRect(ctx, -w * 0.32, h * 0.12, w * 0.64, h * 0.16, 5);
    ctx.fill();

    if (kind === 'sport') {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(-3, -h / 2 + 3, 6, h - 6);
    }
  }

  // Red taillights (traffic moving forward away from camera)
  ctx.fillStyle = '#ef4444';
  roundRect(ctx, -w * 0.38, h / 2 - 6, 10, 4, 2);
  ctx.fill();
  roundRect(ctx, w * 0.38 - 10, h / 2 - 6, 10, 4, 2);
  ctx.fill();

  ctx.restore();
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawFloatingTexts(ctx, texts) {
  for (const t of texts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#020617';
    ctx.fillText(t.label, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.label, t.x, t.y);
    ctx.restore();
  }
}
