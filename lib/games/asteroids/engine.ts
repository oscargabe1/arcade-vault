// ===== engine.ts — Asteroids engine (ported from references/started-games/02-asteroids/game.js) =====
// Framework-agnostic: no document/window access outside createAsteroids().

import {
  Asteroid,
  Bullet,
  H,
  Keys,
  POINTS,
  Particle,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  PowerUp,
  Ship,
  W,
  dist,
  rand,
} from "./entities";

export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type AsteroidsGame = {
  setPaused: (paused: boolean) => void; // congela update; el último frame sigue visible
  destroy: () => void; // cancela rAF y quita listeners
};

type State = "playing" | "dead" | "gameover";

const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];

export function createAsteroids(
  canvas: HTMLCanvasElement,
  cb: AsteroidsCallbacks,
): AsteroidsGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setPaused: () => {}, destroy: () => {} };

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  let paused = false;
  let destroyed = false;

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function clearKeys() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  }

  const acceptsInput = () => !paused && state !== "gameover";

  function isFormTarget(t: EventTarget | null) {
    return (
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isFormTarget(e.target) || !acceptsInput()) return;
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let state: State;
  let deadTimer = 0;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;

  // Último valor emitido a los callbacks (solo se emite al cambiar)
  let emittedScore = -1;
  let emittedLives = -1;
  let emittedLevel = -1;
  let gameOverEmitted = false;

  function emit() {
    if (score !== emittedScore) {
      emittedScore = score;
      cb.onScore(score);
    }
    if (lives !== emittedLives) {
      emittedLives = lives;
      cb.onLives(lives);
    }
    if (level !== emittedLevel) {
      emittedLevel = level;
      cb.onLevel(level);
    }
    if (state === "gameover" && !gameOverEmitted) {
      gameOverEmitted = true;
      cb.onGameOver(score);
    }
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      clearKeys();
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    ctx!.save();
    ctx!.translate(x, y);
    ctx!.rotate(-Math.PI / 2);
    ctx!.strokeStyle = "#fff";
    ctx!.lineWidth = 1.2;
    ctx!.lineJoin = "round";
    ctx!.beginPath();
    ctx!.moveTo(9, 0);
    ctx!.lineTo(-6, -5);
    ctx!.lineTo(-3, 0);
    ctx!.lineTo(-6, 5);
    ctx!.closePath();
    ctx!.stroke();
    ctx!.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D) {
    c.fillStyle = "#fff";
    c.font = "15px monospace";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = "#0ff";
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function drawOverlay(
    c: CanvasRenderingContext2D,
    title: string,
    sub: string,
  ) {
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.font = "bold 46px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(c));
    asteroids.forEach((a) => a.draw(c));
    powerUps.forEach((p) => p.draw(c));
    bullets.forEach((b) => b.draw(c));
    ship.draw(c);

    drawHUD(c);

    if (state === "gameover") drawOverlay(c, "GAME OVER", `PUNTAJE: ${score}`);
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;

  function loop(ts: number) {
    if (destroyed) return;
    if (!paused) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
      draw(ctx!);
      emit();
    }
    rafId = requestAnimationFrame(loop);
  }

  function onBlur() {
    clearKeys();
  }

  initGame();
  emit(); // emisión inicial: 0 / 3 / 1
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(next: boolean) {
      if (next === paused) return;
      paused = next;
      clearKeys();
      if (!paused) lastTime = null; // evita pico de dt al reanudar
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
