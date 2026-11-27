import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PLAYER_CARS, ENEMY_TYPES, STORAGE_KEYS } from '../game/constants';
import {
  drawEnvironment,
  drawPickup,
  drawPlayerCar,
  drawEnemyCar,
  drawParticles,
  drawFloatingTexts,
} from '../game/renderer';
import { soundEngine } from '../audio/soundEngine';
import { useFullscreen } from '../hooks/useFullscreen';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useGyroscope } from '../hooks/useGyroscope';

const LOGICAL_HEIGHT = 800;
const LANE_COUNT = 4;

function readStorageNumber(key, fallback = 0) {
  try {
    const val = Number(localStorage.getItem(key));
    return Number.isFinite(val) ? val : fallback;
  } catch {
    return fallback;
  }
}

function readStorageString(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function RacingGame() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'paused' | 'gameover'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    readStorageNumber(STORAGE_KEYS.HIGH_SCORE, 0)
  );
  const [speedKmh, setSpeedKmh] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [selectedCarId, setSelectedCarId] = useState(() =>
    readStorageString(STORAGE_KEYS.CAR_ID, PLAYER_CARS[0].id)
  );
  const [muted, setMuted] = useState(() =>
    readStorageString(STORAGE_KEYS.MUTED, 'false') === 'true'
  );
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [gyroEnabled, setGyroEnabled] = useState(() =>
    readStorageString(STORAGE_KEYS.GYRO_ENABLED, 'false') === 'true'
  );
  const [gyroNotice, setGyroNotice] = useState('');

  const { isFullscreen, isSupported: fsSupported, toggleFullscreen } =
    useFullscreen(containerRef);
  const { canInstall, isInstalled, isIos, promptInstall } = usePwaInstall();
  const {
    isSupported: gyroSupported,
    needsPermission: gyroNeedsPermission,
    permission: gyroPermission,
    steerRef: gyroSteerRef,
    requestAccess: requestGyroAccess,
    recalibrate: recalibrateGyro,
  } = useGyroscope(gyroEnabled);

  const gyroEnabledRef = useRef(gyroEnabled);
  gyroEnabledRef.current = gyroEnabled;

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const selectedCarRef = useRef(
    PLAYER_CARS.find((c) => c.id === selectedCarId) || PLAYER_CARS[0]
  );
  selectedCarRef.current =
    PLAYER_CARS.find((c) => c.id === selectedCarId) || PLAYER_CARS[0];

  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  // Input flags stored in ref for zero-latency 60fps reading
  const inputRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    dragPointerId: null,
    dragTargetX: null,
    dragStartX: 0,
    carStartX: 0,
  });

  const isTouchRef = useRef(false);
  isTouchRef.current = isTouchDevice;

  // Mutable simulation state inside ref
  const simRef = useRef({
    width: 480,
    height: LOGICAL_HEIGHT,
    roadLeft: 50,
    roadWidth: 380,
    roadOffset: 0,
    baseSpeed: 360,
    speed: 360,
    score: 0,
    nitro: 100,
    boosting: false,
    spawnTimer: 0,
    pickupTimer: 1.5,
    player: {
      x: 240,
      y: LOGICAL_HEIGHT - 130,
      vx: 0,
      width: 46,
      height: 88,
      tilt: 0,
    },
    enemies: [],
    pickups: [],
    particles: [],
    texts: [],
    shake: 0,
  });

  // Sync mute state
  useEffect(() => {
    soundEngine.setMuted(muted);
    try {
      localStorage.setItem(STORAGE_KEYS.MUTED, String(muted));
    } catch {
      // ignore storage errors
    }
  }, [muted]);

  // Persist selected car
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAR_ID, selectedCarId);
    } catch {
      // ignore
    }
  }, [selectedCarId]);

  // Persist gyro preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GYRO_ENABLED, String(gyroEnabled));
    } catch {
      // ignore
    }
  }, [gyroEnabled]);

  // Detect touch device (initial + dynamic on first touch)
  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
    }
    const onTouchPointer = (e) => {
      if (e.pointerType === 'touch') {
        setIsTouchDevice(true);
      }
    };
    window.addEventListener('pointerdown', onTouchPointer, { passive: true });
    return () => window.removeEventListener('pointerdown', onTouchPointer);
  }, []);

  const computeLayout = useCallback((clientW, clientH) => {
    const aspect = Math.max(0.42, clientW / Math.max(1, clientH));
    const vHeight = LOGICAL_HEIGHT;
    const vWidth = Math.max(360, Math.round(vHeight * aspect));
    const roadWidth = Math.min(400, Math.max(296, Math.round(vWidth * 0.82)));
    const roadLeft = Math.round((vWidth - roadWidth) / 2);

    const sim = simRef.current;
    const prevRoadLeft = sim.roadLeft;
    const prevRoadWidth = sim.roadWidth;

    sim.width = vWidth;
    sim.height = vHeight;
    sim.roadLeft = roadLeft;
    sim.roadWidth = roadWidth;

    // Keep player proportionally placed inside the road when resizing/rotating
    if (prevRoadWidth > 0) {
      const ratio = (sim.player.x - prevRoadLeft) / prevRoadWidth;
      sim.player.x = roadLeft + Math.min(0.92, Math.max(0.08, ratio)) * roadWidth;
    } else {
      sim.player.x = vWidth / 2;
    }

    for (const e of sim.enemies) {
      if (e.lane !== undefined) {
        const laneW = roadWidth / LANE_COUNT;
        e.x = roadLeft + laneW * (e.lane + 0.5);
      }
    }
    for (const p of sim.pickups) {
      if (p.lane !== undefined) {
        const laneW = roadWidth / LANE_COUNT;
        p.x = roadLeft + laneW * (p.lane + 0.5);
      }
    }
  }, []);

  const resetSimulation = useCallback(() => {
    const sim = simRef.current;
    const laneW = sim.roadWidth / LANE_COUNT;
    sim.roadOffset = 0;
    sim.baseSpeed = 370;
    sim.speed = 370;
    sim.score = 0;
    sim.nitro = 100;
    sim.boosting = false;
    sim.spawnTimer = 0.5;
    sim.pickupTimer = 1.6;
    sim.enemies = [];
    sim.pickups = [];
    sim.particles = [];
    sim.texts = [];
    sim.shake = 0;
    sim.player.x = sim.roadLeft + laneW * 1.5;
    sim.player.y = LOGICAL_HEIGHT - (isTouchRef.current ? 162 : 138);
    sim.player.vx = 0;
    sim.player.tilt = 0;
    inputRef.current.dragPointerId = null;
    inputRef.current.dragTargetX = null;

    setScore(0);
    setNitro(100);
    setSpeedKmh(120);
  }, []);

  const setGyroMode = useCallback(
    async (enable) => {
      setGyroNotice('');
      if (!enable) {
        setGyroEnabled(false);
        return;
      }
      if (!gyroSupported) {
        setGyroNotice('Gyroscope is not supported on this device.');
        return;
      }
      const granted = await requestGyroAccess();
      if (granted) {
        setGyroEnabled(true);
        recalibrateGyro();
      } else {
        setGyroEnabled(false);
        setGyroNotice('Motion sensor permission denied. Enable it in browser settings.');
      }
    },
    [gyroSupported, recalibrateGyro, requestGyroAccess]
  );

  const startGame = useCallback(async () => {
    if (gyroEnabledRef.current && gyroNeedsPermission && gyroPermission !== 'granted') {
      const granted = await requestGyroAccess();
      if (!granted) {
        setGyroEnabled(false);
        setGyroNotice('Motion sensor permission denied — switched to Touch controls.');
      }
    }
    if (gyroEnabledRef.current) {
      recalibrateGyro();
    }
    resetSimulation();
    setGameState('playing');
    soundEngine.startEngine();
  }, [gyroNeedsPermission, gyroPermission, recalibrateGyro, requestGyroAccess, resetSimulation]);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'playing') {
        soundEngine.stopEngine();
        return 'paused';
      }
      if (prev === 'paused') {
        soundEngine.startEngine();
        return 'playing';
      }
      return prev;
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') inputRef.current.left = true;
      if (code === 'ArrowRight' || code === 'KeyD') inputRef.current.right = true;
      if (code === 'ArrowUp' || code === 'KeyW') inputRef.current.up = true;
      if (code === 'ArrowDown' || code === 'KeyS') inputRef.current.down = true;
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
        inputRef.current.boost = true;
        if (gameStateRef.current === 'playing') e.preventDefault();
      }
      if (code === 'KeyP' || code === 'Escape') {
        if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
          togglePause();
        }
      }
      if (code === 'KeyF') {
        toggleFullscreen();
      }
      if (code === 'Enter' && (gameStateRef.current === 'menu' || gameStateRef.current === 'gameover')) {
        startGame();
      }
    };

    const onKeyUp = (e) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') inputRef.current.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') inputRef.current.right = false;
      if (code === 'ArrowUp' || code === 'KeyW') inputRef.current.up = false;
      if (code === 'ArrowDown' || code === 'KeyS') inputRef.current.down = false;
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
        inputRef.current.boost = false;
      }
    };

    const pauseOnBackground = () => {
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.up = false;
      inputRef.current.down = false;
      inputRef.current.boost = false;
      inputRef.current.dragPointerId = null;
      inputRef.current.dragTargetX = null;
      if (gameStateRef.current === 'playing') {
        soundEngine.stopEngine();
        setGameState('paused');
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) pauseOnBackground();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', pauseOnBackground);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', pauseOnBackground);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      soundEngine.stopEngine();
    };
  }, [startGame, toggleFullscreen, togglePause]);

  // Resize observer to keep canvas sharp at native DPR
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      computeLayout(rect.width, rect.height);
      const sim = simRef.current;
      canvas.width = Math.round(sim.width * dpr);
      canvas.height = Math.round(sim.height * dpr);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [computeLayout]);

  // Main 60fps simulation & render loop
  useEffect(() => {
    let rafId;
    let lastTime = performance.now();
    let hudSyncAcc = 0;

    const spawnEnemy = (sim) => {
      const laneW = sim.roadWidth / LANE_COUNT;
      // Pick a lane that doesn't immediately overlap another newly spawned enemy
      const busyLanes = new Set(
        sim.enemies.filter((e) => e.y < 140).map((e) => e.lane)
      );
      const freeLanes = [];
      for (let i = 0; i < LANE_COUNT; i++) {
        if (!busyLanes.has(i)) freeLanes.push(i);
      }
      if (freeLanes.length === 0) return;

      // Ensure at least one lane remains passable across the top band
      const topOccupied = sim.enemies.filter((e) => e.y < 210).length;
      if (topOccupied >= LANE_COUNT - 1) return;

      const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
      const color = type.colors[Math.floor(Math.random() * type.colors.length)];

      sim.enemies.push({
        lane,
        x: sim.roadLeft + laneW * (lane + 0.5),
        y: -type.height,
        width: type.width,
        height: type.height,
        kind: type.kind,
        color,
        speedFactor: type.speedFactor,
        nearMissed: false,
      });
    };

    const spawnPickup = (sim) => {
      const laneW = sim.roadWidth / LANE_COUNT;
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const x = sim.roadLeft + laneW * (lane + 0.5);
      // Avoid spawning inside an enemy car
      const blocked = sim.enemies.some(
        (e) => e.lane === lane && e.y < 90
      );
      if (blocked) return;

      sim.pickups.push({
        lane,
        x,
        y: -30,
        type: Math.random() < 0.28 ? 'nitro' : 'coin',
        radius: 16,
      });
    };

    const addBurst = (sim, x, y, color, count = 14) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const mag = 60 + Math.random() * 240;
        sim.particles.push({
          x,
          y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
          size: 2.5 + Math.random() * 4.5,
          color,
          life: 0.45 + Math.random() * 0.35,
          maxLife: 0.8,
        });
      }
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      const state = gameStateRef.current;

      if (state === 'menu') {
        // Gentle idle attract-mode road scroll
        sim.roadOffset += 220 * dt;
      } else if (state === 'playing') {
        const input = inputRef.current;

        // Progressive difficulty
        sim.baseSpeed = Math.min(760, sim.baseSpeed + dt * 6.5);

        // Nitro handling
        const wantsBoost = input.boost && sim.nitro > 4;
        sim.boosting = wantsBoost;
        if (wantsBoost) {
          sim.nitro = Math.max(0, sim.nitro - dt * 34);
        } else {
          sim.nitro = Math.min(100, sim.nitro + dt * 7);
        }

        let targetSpeed = sim.baseSpeed;
        if (input.up) targetSpeed *= 1.18;
        if (input.down) targetSpeed *= 0.65;
        if (sim.boosting) targetSpeed *= 1.48;

        sim.speed += (targetSpeed - sim.speed) * Math.min(1, dt * 6);
        sim.roadOffset += sim.speed * dt;
        sim.score += (sim.speed * dt) / 14;

        // Steering physics (drag, keyboard/buttons, or mobile gyroscope tilt)
        const maxLateral = 460;
        if (input.dragPointerId !== null && input.dragTargetX !== null) {
          const diff = input.dragTargetX - sim.player.x;
          const prevX = sim.player.x;
          const step = Math.max(-680 * dt, Math.min(680 * dt, diff * Math.min(1, dt * 18)));
          sim.player.x += step;
          sim.player.vx = dt > 0 ? (sim.player.x - prevX) / dt : 0;
          sim.player.tilt = Math.max(-0.22, Math.min(0.22, (sim.player.vx / maxLateral) * 0.16));
        } else {
          const digitalSteer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          const steerInput =
            digitalSteer !== 0
              ? digitalSteer
              : gyroEnabledRef.current
                ? gyroSteerRef.current
                : 0;
          const targetVx = steerInput * maxLateral;
          sim.player.vx += (targetVx - sim.player.vx) * Math.min(1, dt * 14);
          sim.player.x += sim.player.vx * dt;
          sim.player.tilt = (sim.player.vx / maxLateral) * 0.18;
        }

        // Clamp within road curbs
        const minX = sim.roadLeft + sim.player.width / 2 + 8;
        const maxX = sim.roadLeft + sim.roadWidth - sim.player.width / 2 - 8;
        if (sim.player.x < minX) {
          sim.player.x = minX;
          sim.player.vx = 0;
        } else if (sim.player.x > maxX) {
          sim.player.x = maxX;
          sim.player.vx = 0;
        }

        // Nitro exhaust particles
        if (sim.boosting && Math.random() < 0.75) {
          sim.particles.push({
            x: sim.player.x + (Math.random() - 0.5) * 16,
            y: sim.player.y + sim.player.height / 2 + 8,
            vx: (Math.random() - 0.5) * 40,
            vy: sim.speed * 0.45,
            size: 3 + Math.random() * 3,
            color: Math.random() < 0.5 ? '#38bdf8' : '#e0f2fe',
            life: 0.25,
            maxLife: 0.25,
          });
        }

        // Spawn enemies
        sim.spawnTimer -= dt;
        if (sim.spawnTimer <= 0) {
          spawnEnemy(sim);
          const minInterval = Math.max(0.38, 1.05 - (sim.baseSpeed - 370) / 700);
          sim.spawnTimer = minInterval + Math.random() * 0.45;
        }

        // Spawn pickups
        sim.pickupTimer -= dt;
        if (sim.pickupTimer <= 0) {
          spawnPickup(sim);
          sim.pickupTimer = 1.6 + Math.random() * 1.8;
        }

        // Move & collide pickups
        for (let i = sim.pickups.length - 1; i >= 0; i--) {
          const p = sim.pickups[i];
          p.y += sim.speed * dt;
          const dx = p.x - sim.player.x;
          const dy = p.y - sim.player.y;
          if (Math.abs(dx) < sim.player.width * 0.58 && Math.abs(dy) < sim.player.height * 0.54) {
            if (p.type === 'nitro') {
              sim.nitro = Math.min(100, sim.nitro + 40);
              sim.score += 35;
              soundEngine.playPickup('nitro');
              addBurst(sim, p.x, p.y, '#38bdf8', 12);
              sim.texts.push({
                x: p.x,
                y: p.y - 20,
                label: 'NITRO +40%',
                color: '#38bdf8',
                life: 0.9,
                maxLife: 0.9,
              });
            } else {
              sim.score += 25;
              soundEngine.playPickup('coin');
              addBurst(sim, p.x, p.y, '#facc15', 10);
              sim.texts.push({
                x: p.x,
                y: p.y - 20,
                label: '+25',
                color: '#fde047',
                life: 0.75,
                maxLife: 0.75,
              });
            }
            sim.pickups.splice(i, 1);
            continue;
          }
          if (p.y > sim.height + 50) {
            sim.pickups.splice(i, 1);
          }
        }

        // Move enemies & check collision / near miss
        let crashed = false;
        for (let i = sim.enemies.length - 1; i >= 0; i--) {
          const e = sim.enemies[i];
          const relSpeed = sim.speed - sim.baseSpeed * e.speedFactor;
          e.y += Math.max(140, relSpeed) * dt;

          const dx = Math.abs(e.x - sim.player.x);
          const dy = Math.abs(e.y - sim.player.y);
          const hitW = (e.width + sim.player.width) * 0.42;
          const hitH = (e.height + sim.player.height) * 0.44;

          if (dx < hitW && dy < hitH) {
            crashed = true;
            addBurst(sim, (e.x + sim.player.x) / 2, (e.y + sim.player.y) / 2, '#f97316', 28);
            addBurst(sim, (e.x + sim.player.x) / 2, (e.y + sim.player.y) / 2, '#fef08a', 14);
            sim.shake = 14;
            break;
          }

          // Near-miss bonus
          if (!e.nearMissed && e.y > sim.player.y && dx < hitW + 24 && dy < hitH + 18) {
            e.nearMissed = true;
            sim.score += 50;
            soundEngine.playNearMiss();
            sim.texts.push({
              x: sim.player.x,
              y: sim.player.y - 58,
              label: 'NEAR MISS +50!',
              color: '#4ade80',
              life: 0.95,
              maxLife: 0.95,
            });
          }

          if (e.y > sim.height + 150) {
            sim.enemies.splice(i, 1);
          }
        }

        soundEngine.updateEngine((sim.speed - 250) / 750, sim.boosting);

        if (crashed) {
          soundEngine.playCrash();
          const finalScore = Math.floor(sim.score);
          setScore(finalScore);
          if (finalScore > highScoreRef.current) {
            setHighScore(finalScore);
            try {
              localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(finalScore));
            } catch {
              // ignore
            }
          }
          setGameState('gameover');
        }

        // Sync React HUD at ~15fps so DOM stays light
        hudSyncAcc += dt;
        if (hudSyncAcc >= 0.065) {
          hudSyncAcc = 0;
          setScore(Math.floor(sim.score));
          setNitro(Math.round(sim.nitro));
          setSpeedKmh(Math.round(sim.speed * 0.34));
        }
      }

      // Update particles & floating texts even right after crash
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) sim.particles.splice(i, 1);
      }
      for (let i = sim.texts.length - 1; i >= 0; i--) {
        const t = sim.texts[i];
        t.y -= 45 * dt;
        t.life -= dt;
        if (t.life <= 0) sim.texts.splice(i, 1);
      }
      if (sim.shake > 0) {
        sim.shake = Math.max(0, sim.shake - dt * 32);
      }

      // Render canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const scale = canvas.width / sim.width;
        ctx.save();
        ctx.scale(scale, scale);

        if (sim.shake > 0) {
          ctx.translate(
            (Math.random() - 0.5) * sim.shake,
            (Math.random() - 0.5) * sim.shake
          );
        }

        drawEnvironment(ctx, {
          width: sim.width,
          height: sim.height,
          roadLeft: sim.roadLeft,
          roadWidth: sim.roadWidth,
          laneCount: LANE_COUNT,
          roadOffset: sim.roadOffset,
          boosting: sim.boosting && state === 'playing',
        });

        for (const p of sim.pickups) {
          drawPickup(ctx, p, now);
        }
        for (const e of sim.enemies) {
          drawEnemyCar(ctx, e);
        }
        drawPlayerCar(
          ctx,
          sim.player,
          selectedCarRef.current,
          sim.boosting && state === 'playing',
          now
        );
        drawParticles(ctx, sim.particles);
        drawFloatingTexts(ctx, sim.texts);

        ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIos) {
      setShowIosHelp(true);
    }
  };

  const setControl = (key, active) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (active && e.currentTarget?.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore unsupported pointer capture
      }
    }
    inputRef.current[key] = active;
  };

  const clientToLogicalX = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / Math.max(1, rect.width)) * simRef.current.width;
  };

  const handleCanvasPointerDown = (e) => {
    if (gameStateRef.current !== 'playing') return;
    if (e.pointerType === 'touch') setIsTouchDevice(true);
    const input = inputRef.current;
    if (input.dragPointerId !== null) return;
    input.dragPointerId = e.pointerId;
    input.dragStartX = clientToLogicalX(e.clientX);
    input.carStartX = simRef.current.player.x;
    input.dragTargetX = simRef.current.player.x;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleCanvasPointerMove = (e) => {
    const input = inputRef.current;
    if (gameStateRef.current !== 'playing') return;
    if (input.dragPointerId !== e.pointerId) return;
    const deltaX = clientToLogicalX(e.clientX) - input.dragStartX;
    input.dragTargetX = input.carStartX + deltaX;
  };

  const handleCanvasPointerEnd = (e) => {
    const input = inputRef.current;
    if (input.dragPointerId === e.pointerId) {
      input.dragPointerId = null;
      input.dragTargetX = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="game-shell"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerEnd}
        onPointerCancel={handleCanvasPointerEnd}
      />

      {/* Top HUD */}
      <header className="hud-top">
        <div className="hud-stats">
          <div className="stat-pill">
            <span className="stat-label">SCORE</span>
            <span className="stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">BEST</span>
            <span className="stat-value accent-gold">{highScore.toLocaleString()}</span>
          </div>
          {gameState === 'playing' && (
            <div className="stat-pill hide-xs">
              <span className="stat-label">SPEED</span>
              <span className="stat-value">{speedKmh} km/h</span>
            </div>
          )}
        </div>

        <div className="hud-actions">
          {(canInstall || isIos) && !isInstalled && (
            <button
              type="button"
              className="icon-btn install-btn"
              onClick={handleInstallClick}
              title="Install as App"
            >
              <span>⬇</span>
              <span className="btn-text">Install</span>
            </button>
          )}

          {isTouchDevice && gyroSupported && (
            <button
              type="button"
              className={`icon-btn ${gyroEnabled ? 'gyro-active-btn' : ''}`}
              onClick={() => setGyroMode(!gyroEnabled)}
              title={gyroEnabled ? 'Gyro Mode On (tap to switch to Touch)' : 'Enable Gyro Tilt Mode'}
              aria-label="Toggle Gyro Mode"
            >
              <span>📱</span>
              <span className="btn-text">{gyroEnabled ? 'Gyro' : 'Touch'}</span>
            </button>
          )}

          {isTouchDevice && gyroEnabled && gameState === 'playing' && (
            <button
              type="button"
              className="icon-btn"
              onClick={recalibrateGyro}
              title="Center / Zero Gyro Tilt"
              aria-label="Center Gyro Tilt"
            >
              🎯
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={() => setMuted((m) => !m)}
            title={muted ? 'Unmute sound' : 'Mute sound'}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? '🔇' : '🔊'}
          </button>

          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              type="button"
              className="icon-btn"
              onClick={togglePause}
              title={gameState === 'paused' ? 'Resume (P)' : 'Pause (P)'}
              aria-label="Pause or resume"
            >
              {gameState === 'paused' ? '▶' : '⏸'}
            </button>
          )}

          {fsSupported && (
            <button
              type="button"
              className="icon-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Play Fullscreen (F)'}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? '⤓' : '⛶'}
            </button>
          )}
        </div>
      </header>

      {/* Nitro Bar when playing */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="nitro-hud">
          <span className="nitro-label">NITRO</span>
          <div className="nitro-track">
            <div className="nitro-fill" style={{ width: `${nitro}%` }} />
          </div>
        </div>
      )}

      {/* Touch / Gyro Controls for mobile/tablet during gameplay */}
      {gameState === 'playing' && isTouchDevice && (
        <div className="touch-controls">
          {!gyroEnabled ? (
            <div className="touch-steer-group">
              <button
                type="button"
                className="touch-btn"
                onPointerDown={setControl('left', true)}
                onPointerUp={setControl('left', false)}
                onPointerLeave={setControl('left', false)}
                onPointerCancel={setControl('left', false)}
                aria-label="Steer Left"
              >
                ◀
              </button>
              <button
                type="button"
                className="touch-btn"
                onPointerDown={setControl('right', true)}
                onPointerUp={setControl('right', false)}
                onPointerLeave={setControl('right', false)}
                onPointerCancel={setControl('right', false)}
                aria-label="Steer Right"
              >
                ▶
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="gyro-pill-hint"
              onClick={recalibrateGyro}
              title="Tap to zero current phone angle"
            >
              📱 GYRO • 🎯 ZERO
            </button>
          )}

          <button
            type="button"
            className="touch-btn slow-touch-btn"
            onPointerDown={setControl('down', true)}
            onPointerUp={setControl('down', false)}
            onPointerLeave={setControl('down', false)}
            onPointerCancel={setControl('down', false)}
            aria-label="Slow Down"
          >
            ▼
          </button>
          <button
            type="button"
            className="touch-btn nitro-touch-btn"
            onPointerDown={setControl('boost', true)}
            onPointerUp={setControl('boost', false)}
            onPointerLeave={setControl('boost', false)}
            onPointerCancel={setControl('boost', false)}
            aria-label="Nitro Boost"
          >
            ⚡ NITRO
          </button>
        </div>
      )}

      {/* Start Menu Overlay */}
      {gameState === 'menu' && (
        <div className="overlay-backdrop">
          <div className="modal-card">
            <div className="badge-row">
              <span className="badge">ARCADE PWA</span>
              {isInstalled && <span className="badge badge-green">INSTALLED APP</span>}
            </div>
            <h1 className="game-title">APEX RUSH</h1>
            <p className="game-subtitle">
              Dodge highway traffic, weave for near-miss bonuses, and hit Nitro!
            </p>

            <div className="car-picker">
              <div className="picker-label">SELECT YOUR RIDE</div>
              <div className="car-grid">
                {PLAYER_CARS.map((car) => (
                  <button
                    key={car.id}
                    type="button"
                    className={`car-option ${selectedCarId === car.id ? 'active' : ''}`}
                    onClick={() => setSelectedCarId(car.id)}
                  >
                    <span
                      className="car-swatch"
                      style={{ backgroundColor: car.body, boxShadow: `0 0 12px ${car.glow}` }}
                    />
                    <span className="car-name">{car.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {isTouchDevice && gyroSupported && (
              <div className="steer-mode-picker">
                <div className="picker-label">MOBILE STEERING</div>
                <div className="steer-mode-grid">
                  <button
                    type="button"
                    className={`car-option ${!gyroEnabled ? 'active' : ''}`}
                    onClick={() => setGyroMode(false)}
                  >
                    <span>👆</span>
                    <span className="car-name">Touch Buttons</span>
                  </button>
                  <button
                    type="button"
                    className={`car-option ${gyroEnabled ? 'active' : ''}`}
                    onClick={() => setGyroMode(true)}
                  >
                    <span>📱</span>
                    <span className="car-name">Gyro Tilt</span>
                  </button>
                </div>
                {gyroNotice && <div className="gyro-notice">{gyroNotice}</div>}
              </div>
            )}

            <div className="cta-stack">
              <button type="button" className="primary-btn" onClick={startGame}>
                START RACE
              </button>
              <div className="secondary-row">
                {fsSupported && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
                  </button>
                )}
                {(canInstall || isIos) && !isInstalled && (
                  <button
                    type="button"
                    className="secondary-btn install-secondary"
                    onClick={handleInstallClick}
                  >
                    ⬇ Install App
                  </button>
                )}
              </div>
            </div>

            <div className="controls-hint">
              {isTouchDevice ? (
                gyroEnabled ? (
                  <>
                    <span><strong>Steer:</strong> Tilt phone left / right</span>
                    <span><strong>Slow:</strong> Hold ▼</span>
                    <span><strong>Nitro:</strong> Hold ⚡ NITRO</span>
                  </>
                ) : (
                  <>
                    <span><strong>Steer:</strong> Drag road or tap ◀ ▶</span>
                    <span><strong>Slow:</strong> Hold ▼</span>
                    <span><strong>Nitro:</strong> Hold ⚡ NITRO</span>
                  </>
                )
              ) : (
                <>
                  <span><strong>Move:</strong> ← → / A D</span>
                  <span><strong>Nitro:</strong> Space / Shift</span>
                  <span><strong>Fullscreen:</strong> F</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {gameState === 'paused' && (
        <div className="overlay-backdrop">
          <div className="modal-card compact">
            <h2 className="modal-title">PAUSED</h2>
            <div className="cta-stack">
              <button type="button" className="primary-btn" onClick={togglePause}>
                RESUME
              </button>
              <button type="button" className="secondary-btn" onClick={startGame}>
                RESTART
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  soundEngine.stopEngine();
                  setGameState('menu');
                }}
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <div className="overlay-backdrop">
          <div className="modal-card compact">
            <div className="crash-tag">CRASHED!</div>
            <h2 className="modal-title">RACE OVER</h2>
            <div className="results-box">
              <div className="result-item">
                <span>FINAL SCORE</span>
                <strong>{score.toLocaleString()}</strong>
              </div>
              <div className="result-item">
                <span>HIGH SCORE</span>
                <strong className="accent-gold">{highScore.toLocaleString()}</strong>
              </div>
            </div>
            <div className="cta-stack">
              <button type="button" className="primary-btn" onClick={startGame}>
                PLAY AGAIN
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setGameState('menu')}
              >
                CHANGE CAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Install Instructions Modal */}
      {showIosHelp && (
        <div className="overlay-backdrop" onClick={() => setShowIosHelp(false)}>
          <div className="modal-card compact" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Install on iPhone / iPad</h2>
            <p className="game-subtitle">
              Tap the <strong>Share</strong> button in Safari, then choose{' '}
              <strong>Add to Home Screen</strong> to launch Apex Rush in full-screen app mode!
            </p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowIosHelp(false)}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      <div
        className={`credit-badge ${
          gameState === 'playing' && isTouchDevice ? 'credit-badge--compact' : ''
        }`}
      >
        Made with <span className="credit-heart">❤</span> by Parth Dabhi
      </div>
    </div>
  );
}
