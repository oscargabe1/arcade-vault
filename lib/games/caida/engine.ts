// ===== engine.ts — Caída engine (ported from references/started-games/03-tetris/game.js) =====
// Framework-agnostic: no document/window access outside createCaida().

import {
  BLOCK,
  BOARD_X,
  COLORS,
  COLS,
  H,
  LINE_SCORES,
  MAX_SCORE,
  ROWS,
  W,
  collide,
  createBoard,
  randomPiece,
  rotateCW,
  type Board,
  type Piece,
} from "./pieces";
import type { GameFactory } from "../types";

const GAME_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyX",
  "Space",
];
const KICKS = [0, -1, 1, -2, 2];
const MAX_DT = 50; // ms

// Paleta (tema oscuro del reference)
const BG = "#0f0f17";
const CANVAS_BG = "#1a1a25";
const BORDER = "#2a2a3a";
const GRID = "#22222e";
const LABEL = "#555570";
const VALUE = "#7aa2f7";
const CONTROLS_TEXT = "#888";
const KBD_BG = "#22223a";
const KBD_BORDER = "#3a3a5a";
const KBD_TEXT = "#aaa";
const SANS = "system-ui, -apple-system, sans-serif";
const MONO = "'Courier New', Courier, monospace";

const CONTROLS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→"], label: "mover" },
  { keys: ["↑", "/", "X"], label: "rotar" },
  { keys: ["↓"], label: "bajar" },
  { keys: ["ESPACIO"], label: "caída" },
];

const fmt = (n: number) => n.toLocaleString("es-ES");

export const createCaida: GameFactory = (canvas, cb) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setPaused: () => {}, destroy: () => {} };
  const c: CanvasRenderingContext2D = ctx;

  // ── Estado del juego ────────────────────────────────────────────────────────
  const board: Board = createBoard();
  let current: Piece;
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let lastTime: number | null = null;
  let dropAccum = 0;
  let dropInterval = 1000;
  let rafId = 0;
  let destroyed = false;

  // Último valor emitido a los callbacks (solo se emite al cambiar)
  let emittedScore = -1;
  let emittedLevel = -1;
  let gameOverEmitted = false;

  function emit() {
    if (score !== emittedScore) {
      emittedScore = score;
      cb.onScore(score);
    }
    if (level !== emittedLevel) {
      emittedLevel = level;
      cb.onLevel?.(level);
    }
    if (gameOver && !gameOverEmitted) {
      gameOverEmitted = true;
      cb.onGameOver(score);
    }
  }

  function addScore(n: number) {
    score = Math.min(score + n, MAX_SCORE);
  }

  // ── Lógica ──────────────────────────────────────────────────────────────────
  const hits = (shape: number[][], ox: number, oy: number) =>
    collide(board, shape, ox, oy);

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!hits(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        if (current.shape[r][col])
          board[current.y + r][current.x + col] = current.shape[r][col];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      addScore((LINE_SCORES[cleared] || 0) * level);
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY() {
    let gy = current.y;
    while (!hits(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    addScore((gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!hits(current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(1);
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (hits(current.shape, current.x, current.y)) gameOver = true;
  }

  function update(dt: number) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!hits(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawBlock(
    ox: number,
    oy: number,
    x: number,
    y: number,
    colorIndex: number,
    alpha = 1,
  ) {
    if (!colorIndex) return;
    const px = ox + x * BLOCK;
    const py = oy + y * BLOCK;
    c.globalAlpha = alpha;
    c.fillStyle = COLORS[colorIndex]!;
    c.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
    // highlight
    c.fillStyle = "rgba(255,255,255,0.12)";
    c.fillRect(px + 1, py + 1, BLOCK - 2, 4);
    c.globalAlpha = 1;
  }

  function text(
    s: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: CanvasTextAlign = "center",
    spacing = 0,
  ) {
    c.font = font;
    c.fillStyle = color;
    c.textAlign = align;
    c.letterSpacing = `${spacing}px`;
    c.fillText(s, x, y);
    c.letterSpacing = "0px";
  }

  function drawBoard() {
    c.fillStyle = CANVAS_BG;
    c.fillRect(BOARD_X, 0, COLS * BLOCK, ROWS * BLOCK);

    c.strokeStyle = GRID;
    c.lineWidth = 0.5;
    for (let col = 1; col < COLS; col++) {
      c.beginPath();
      c.moveTo(BOARD_X + col * BLOCK, 0);
      c.lineTo(BOARD_X + col * BLOCK, ROWS * BLOCK);
      c.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      c.beginPath();
      c.moveTo(BOARD_X, r * BLOCK);
      c.lineTo(BOARD_X + COLS * BLOCK, r * BLOCK);
      c.stroke();
    }

    for (let r = 0; r < ROWS; r++)
      for (let col = 0; col < COLS; col++)
        drawBlock(BOARD_X, 0, col, r, board[r][col]);

    if (!gameOver) {
      // ghost
      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let col = 0; col < current.shape[r].length; col++)
          drawBlock(
            BOARD_X,
            0,
            current.x + col,
            gy + r,
            current.shape[r][col],
            0.2,
          );

      // current piece
      for (let r = 0; r < current.shape.length; r++)
        for (let col = 0; col < current.shape[r].length; col++)
          drawBlock(
            BOARD_X,
            0,
            current.x + col,
            current.y + r,
            current.shape[r][col],
          );
    }

    c.strokeStyle = BORDER;
    c.lineWidth = 1;
    c.strokeRect(BOARD_X + 0.5, 0.5, COLS * BLOCK - 1, ROWS * BLOCK - 1);
  }

  function drawStats() {
    const cx = BOARD_X / 2;
    const stats: [string, string][] = [
      ["SCORE", fmt(score)],
      ["LINES", String(lines)],
      ["LEVEL", String(level)],
    ];
    stats.forEach(([label, value], i) => {
      const y = 200 + i * 90;
      text(label, cx, y, `600 11px ${SANS}`, LABEL, "center", 2);
      text(value, cx, y + 34, `700 26px ${MONO}`, VALUE, "center", 1);
    });
  }

  function drawNext() {
    const boxX =
      BOARD_X + COLS * BLOCK + (W - BOARD_X - COLS * BLOCK - 120) / 2;
    const boxY = 150;
    const cx = boxX + 60;
    text("NEXT", cx, boxY - 14, `600 11px ${SANS}`, LABEL, "center", 2);

    c.fillStyle = CANVAS_BG;
    c.fillRect(boxX, boxY, 120, 120);
    c.strokeStyle = BORDER;
    c.lineWidth = 1;
    c.strokeRect(boxX + 0.5, boxY + 0.5, 119, 119);

    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(boxX, boxY, offX + col, offY + r, shape[r][col]);
  }

  function drawControls() {
    const x0 = BOARD_X + COLS * BLOCK + 40;
    text("CONTROLES", x0, 330, `600 11px ${SANS}`, LABEL, "left", 2);

    CONTROLS.forEach(({ keys, label }, i) => {
      const y = 362 + i * 30;
      let x = x0;
      for (const k of keys) {
        if (k === "/") {
          text("/", x, y + 4, `12px ${SANS}`, CONTROLS_TEXT, "left");
          x += c.measureText("/").width + 4;
          continue;
        }
        c.font = `11px ${SANS}`;
        const w = c.measureText(k).width + 12;
        c.fillStyle = KBD_BG;
        c.strokeStyle = KBD_BORDER;
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(x + 0.5, y - 10.5, w, 20, 3);
        c.fill();
        c.stroke();
        text(k, x + 0.5 + w / 2, y + 4, `11px ${SANS}`, KBD_TEXT, "center");
        x += w + 4;
      }
      text(label, x + 4, y + 4, `12px ${SANS}`, CONTROLS_TEXT, "left");
    });
  }

  function drawGameOver() {
    c.fillStyle = "rgba(10,10,20,0.75)";
    c.fillRect(0, 0, W, H);
    text(
      "GAME OVER",
      W / 2,
      H / 2 - 10,
      `800 40px ${SANS}`,
      "#e57373",
      "center",
      4,
    );
    text(`PUNTAJE: ${fmt(score)}`, W / 2, H / 2 + 30, `18px ${MONO}`, VALUE);
  }

  function draw() {
    c.fillStyle = BG;
    c.fillRect(0, 0, W, H);
    drawStats();
    drawBoard();
    drawNext();
    drawControls();
    if (gameOver) drawGameOver();
  }

  // Último frame con overlay, emite fin de partida y para el loop
  function finish() {
    cancelAnimationFrame(rafId);
    draw();
    emit();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  function isFormTarget(t: EventTarget | null) {
    return (
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement
    );
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isFormTarget(e.target) || paused || gameOver) return;
    if (!GAME_KEYS.includes(e.code)) return;
    e.preventDefault();
    switch (e.code) {
      case "ArrowLeft":
        if (!hits(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!hits(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    if (gameOver) finish();
    else emit();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    if (!paused) {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
      lastTime = ts;
      update(dt);
      if (gameOver) {
        finish();
        return;
      }
      draw();
      emit();
    }
    rafId = requestAnimationFrame(loop);
  }

  spawn();
  draw();
  emit(); // emisión inicial: 0 / 1
  window.addEventListener("keydown", onKeyDown);
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(p: boolean) {
      if (p === paused) return;
      paused = p;
      if (!paused) lastTime = null; // evita pico de dt al reanudar
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
