# SPEC 07 — Portar el juego de bloques de `03-tetris` como juego `caida`

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-11-17
> **Objective:** Reemplazar el mock `caida` del catálogo por un juego real de bloques que caen, portado de `references/started-games/03-tetris/` a un motor TypeScript en canvas, cuyo puntaje se guarda en el leaderboard de Supabase; e introducir el registro genérico de juegos reales.

## Por qué existe esta spec

`caida` (CAÍDA, PUZZLE, magenta, `sort_order = 3`) es hoy un mock: el reproductor suma puntos aleatorios sobre una arena falsa. El reference `03-tetris` es un juego de bloques completo en canvas puro (`game.js`, 332 líneas, `'use strict'`, globals, `document.getElementById` a nivel de módulo, `keydown` en `document`, panel HUD y overlays en DOM, toggle de tema con `localStorage`). Tiene identidad propia: además de las 7 piezas clásicas incluye la **tuerca**, un anillo 3×3 gris. Entra reemplazando al mock `caida` (misma temática, mismo id, misma posición, misma portada `cover-tetro`); no tiene scores guardados (`count = 0`), así que no hay datos que migrar. El título se mantiene CAÍDA: no se usa el nombre comercial del juego clásico.

Es el segundo juego real. `components/game-player.tsx` tiene `asteroids` hardcodeado (`const real = game.id === "asteroids"` + `AsteroidsCanvas`), así que esta spec incluye el **Paso 0**: registro genérico (`lib/games/types.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx`) y migración de `asteroids` a él, antes de añadir `caida`.

## Alcance

**Dentro:**

- **Paso 0 — registro genérico:** `lib/games/types.ts` (`GameCallbacks`, `GameHandle`, `GameFactory`), `lib/games/registry.ts` (`RealGame`, `REAL_GAMES`), `components/game-canvas.tsx` (wrapper genérico). `createAsteroids` se tipa como `GameFactory` (se eliminan `AsteroidsCallbacks`/`AsteroidsGame`); `game-player.tsx` usa `REAL_GAMES[game.id]`; se borra `components/asteroids-canvas.tsx`. Stats Vidas/Nivel se ocultan según `hud`.
- **Catálogo:** migración `supabase/migrations/<ts>_update_caida_game.sql` con `update` de la fila `caida`: solo `short_desc` y `long_desc` (redactados desde el README). `id`, `title` (`CAÍDA`), `category` (`PUZZLE`), `cover` (`cover-tetro`), `color` (`magenta`) y `sort_order` (`3`) se conservan.
- **Portada:** se reutiliza `.cover-tetro` (`app/globals.css:425`); sin CSS nuevo.
- **Motor** portado a TypeScript en `lib/games/caida/` (`pieces.ts` + `engine.ts`), sin globals ni DOM a nivel de módulo.
- **Lógica de juego idéntica al reference:**
  - Tablero 10 × 20, celdas de 30 px; `0` = vacía, `1–8` = índice de color.
  - 8 piezas: I, O, T, S, Z, J, L y tuerca (`[[8,8,8],[8,0,8],[8,8,8]]`), elegidas con azar uniforme `floor(random × 8) + 1`. Spawn en `y = 0`, `x = floor(COLS/2) − floor(ancho/2)`.
  - Rotación horaria `rotateCW` (transpuesta + reverso) con wall kicks `[0, −1, 1, −2, 2]`; si todos chocan, no rota.
  - Gravedad: `dropAccum += dt`; si `dropAccum ≥ dropInterval` → `dropAccum = 0` y baja una fila o fija la pieza.
  - Soft drop (`↓`): baja 1 fila y suma **+1**; si no puede bajar, fija la pieza (sin punto).
  - Hard drop (`Espacio`): cae hasta la posición fantasma, suma **+2 por celda** recorrida y fija.
  - Fijar = `merge` + `clearLines` + `spawn`. Líneas: `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel **antes** de recalcularlo; `level = floor(lines/10) + 1`; `dropInterval = max(100, 1000 − (level − 1) × 90)` ms.
  - Pieza fantasma con `globalAlpha = 0.2`; bloques con highlight `rgba(255,255,255,0.12)` de 4 px arriba.
  - Game over cuando la pieza recién generada colisiona al aparecer.
- **Lienzo 800×600 con panel en canvas** (el panel DOM del reference se porta al canvas):
  - Tablero 300×600 en `x = 250…550`, `y = 0…600`, fondo `#1a1a25`, borde `#2a2a3a`, grid `#22222e` (0,5 px).
  - Panel izquierdo (`x 0…250`): `SCORE`, `LINES`, `LEVEL` (etiquetas `#555570`, 10–12 px, tracking; valores `#7aa2f7` monoespaciados ~26 px).
  - Panel derecho (`x 550…800`): `NEXT` con caja 120×120 (rejilla 4×4 de 30 px, pieza centrada con `offX/offY = floor((4 − tamaño)/2)`) y debajo `CONTROLES` (`← → mover`, `↑ / X rotar`, `↓ bajar`, `ESPACIO caída`; sin `P`).
  - Fondo general `#0f0f17`.
- **Overlay de game over en canvas:** velo `rgba(10,10,20,0.75)` sobre todo el lienzo, `GAME OVER` en `#e57373` y `PUNTAJE: N` en `#7aa2f7`. Sin botón ni texto de reinicio.
- **HUD de la plataforma:** Puntuación = `score`; **Vidas oculto** (`hud.lives = false`); Nivel = `level`. Líneas solo en el canvas.
- **Entrada en `REAL_GAMES`:** `caida: { factory: createCaida, width: 800, height: 600, hud: { lives: false, level: true }, initial: { lives: 0, level: 1 } }`.
- **Controles** (solo teclado, `keydown` en `window`, auto-repeat del SO como el reference): `ArrowLeft`/`ArrowRight` mover, `ArrowUp`/`KeyX` rotar, `ArrowDown` soft drop, `Space` hard drop. `preventDefault` en esas 6 teclas mientras el juego está activo.
- **Assets:** ninguno (todo es dibujo en canvas). No se crea `public/games/caida/`.
- **Desviaciones del reference:** sin `P` (la pausa es de la plataforma), sin botón Reiniciar (reinicio por modal + remontaje), sin overlay "PAUSA" propio (lo pone la plataforma), sin toggle de tema ni `localStorage` (solo tema oscuro), color de grid fijo en vez de `getComputedStyle`, `dt` capado a 50 ms, puntuación acotada a 10.000.000, se dibuja el frame final con el overlay de game over.
- Guardado vía `saveScoreAction` existente; sin cambios en `scores`, `leaderboard` ni `lib/games.ts`.

**Fuera de alcance (specs futuras):**

- Sonido y música.
- Controles táctiles y gamepad.
- Mecánicas extra: hold, bolsa de 7 (7-bag), T-spin, lock delay, SRS completo, rotación antihoraria, DAS/ARR propio.
- Tema claro (toggle light/dark del reference).
- Cambios en otros juegos (reales o mocks).
- Cambios en el modelo de `scores`/`leaderboard`, anti-trampa.
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Migración (`npm run db:new update_caida_game`):

```sql
-- supabase/migrations/<ts>_update_caida_game.sql
update public.games
set short_desc = 'Rota, encaja y limpia líneas antes de que el techo te aplaste.',
    long_desc  = 'Ocho piezas descienden por un pozo de 10×20: las siete clásicas y la tuerca, un anillo de 3×3 que pone a prueba tu geometría. Rota con ↑, deja caer con ESPACIO y guíate por la sombra fantasma. Cada 10 líneas sube el nivel y la caída se acelera sin piedad.'
where id = 'caida';
```

`title`, `category`, `cover`, `color` y `sort_order` no cambian. No hay `scores` ligados a `caida`.

Tipos comunes (Paso 0):

```ts
// lib/games/types.ts
export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void;
  onLevel?: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameHandle = {
  setPaused: (paused: boolean) => void; // congela update; el último frame sigue visible
  destroy: () => void; // cancela rAF y quita listeners
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  cb: GameCallbacks,
) => GameHandle;

// lib/games/registry.ts
export type RealGame = {
  factory: GameFactory;
  width: number;
  height: number;
  hud: { lives: boolean; level: boolean };
  initial: { lives: number; level: number };
};

export const REAL_GAMES: Record<string, RealGame> = {
  asteroids: {
    factory: createAsteroids,
    width: 800,
    height: 600,
    hud: { lives: true, level: true },
    initial: { lives: 3, level: 1 },
  },
  caida: {
    factory: createCaida,
    width: 800,
    height: 600,
    hud: { lives: false, level: true },
    initial: { lives: 0, level: 1 },
  },
};

// components/game-canvas.tsx
type Props = GameCallbacks & {
  factory: GameFactory;
  width: number;
  height: number;
  active: boolean; // !paused && !over
};
```

`createAsteroids` pasa a `export const createAsteroids: GameFactory` (o firma equivalente) y llama `cb.onLives?.(…)` / `cb.onLevel?.(…)`.

Motor `caida`:

```ts
// lib/games/caida/pieces.ts — constantes y funciones puras, sin DOM
export const COLS = 10,
  ROWS = 20,
  BLOCK = 30;
export const W = 800,
  H = 600,
  BOARD_X = 250; // tablero en x 250…550
export const COLORS: (string | null)[]; // null + 8 colores del reference (#4dd0e1 … #9e9e9e)
export const PIECES: (number[][] | null)[]; // null + I, O, T, S, Z, J, L, tuerca
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const MAX_SCORE = 10_000_000;
export type Board = number[][];
export type Piece = { type: number; shape: number[][]; x: number; y: number };
export function createBoard(): Board;
export function randomPiece(): Piece;
export function rotateCW(shape: number[][]): number[][];
export function collide(
  board: Board,
  shape: number[][],
  ox: number,
  oy: number,
): boolean;

// lib/games/caida/engine.ts
export const createCaida: GameFactory;
```

Estado interno del motor (antes globals de `game.js`): `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `rafId`, `destroyed`. Se eliminan `scoreEl`/`linesEl`/`levelEl`/`overlay*`/`restartBtn`/`nextCanvas`/theme toggle.

Callbacks: emisión inicial `onScore(0)`, `onLevel(1)` (no se llama `onLives`); luego solo cuando cambian, en el mismo frame en que cambia lo que dibuja el canvas. `onGameOver(score)` una sola vez. `score` se acota con `Math.min(score, MAX_SCORE)` en cada suma.

## Plan de implementación

Antes de escribir: leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (`"use client"`) y de `cacheComponents`; el canvas y el motor solo existen en cliente.

0. **Registro genérico + migrar asteroids.** Crear `lib/games/types.ts`, `lib/games/registry.ts` (solo `asteroids`) y `components/game-canvas.tsx` (generaliza `asteroids-canvas.tsx`: latest-ref, `factory(canvas, …)` en efecto de montaje → `destroy`, efecto `setPaused(!active)`, `<canvas width height style={{ display: "block", width: "100%", height: "100%" }}>`). Tipar `createAsteroids` como `GameFactory` y borrar sus tipos propios. En `game-player.tsx`: `const real = REAL_GAMES[game.id]`; con `real` renderizar `<GameCanvas key={runKey} factory={real.factory} width={real.width} height={real.height} active={!paused && !over} onScore={setScore} onLives={setLives} onLevel={setLevel} onGameOver={() => setOver(true)} />`; estados iniciales `lives`/`level` desde `real?.initial` (mock: 3 / 1); `restart()` resetea a esos mismos iniciales e incrementa `runKey`; los `useEffect` mock se desactivan con `real`; stat Vidas se renderiza solo si `!real || real.hud.lives`, Nivel solo si `!real || real.hud.level`. Borrar `components/asteroids-canvas.tsx`. Verificar: `npm run lint` y `npm run build`; `/games/asteroids/play` se comporta idéntico (criterios de SPEC 05: HUD, vidas, niveles, pausa, game over, guardar, jugar de nuevo); `/games/caida/play` y otros mocks siguen en mock con las 3 stats.
1. **Catálogo.** `npm run db:new update_caida_game` con el `update` de arriba; `npm run db:push`; `npm run db:types`. Sin cambios de CSS (`cover-tetro` se conserva). Verificar: `execute_sql` muestra los textos nuevos en `caida` con `sort_order = 3`; tras reiniciar `npm run dev`, `/games/caida` muestra la descripción nueva; `/games/caida/play` sigue en mock (aún sin registro).
2. **Motor — datos.** Crear `lib/games/caida/pieces.ts` (constantes, `createBoard`, `randomPiece`, `rotateCW`, `collide` recibiendo `board`). Verificar: `npm run lint` y `npm run build` (importar no toca el DOM).
3. **Motor — engine.** Crear `lib/games/caida/engine.ts` con `createCaida`: estado local; listeners `keydown` en `window` (ignora `input`/`textarea`/`select`, ignora si pausado o game over, `preventDefault` en las 6 teclas del juego); `tryRotate`, `hardDrop`, `softDrop`, `lockPiece`, `clearLines`, `spawn`, `ghostY`; loop rAF con `dt` capado a 50 ms y acumulador de gravedad; `draw` (fondo, panel izquierdo, tablero con grid, piezas fijadas, fantasma, pieza actual, panel derecho con NEXT y CONTROLES); al game over: `onGameOver(score)` una vez, dibuja el último frame + overlay `GAME OVER` / `PUNTAJE: N`, para el loop y deja de aceptar input. `setPaused(p)`: congela update y al reanudar reinicia `lastTime`. `destroy()`: `destroyed = true`, cancela rAF y quita el listener. Verificar: `npm run lint`.
4. **Registro.** Añadir `caida` a `REAL_GAMES`. Verificar: `/games/caida/play` muestra el juego real; `asteroids` y los mocks siguen igual.
5. **Verificación manual completa** (`/run` o navegador, desktop y ≤ 840 px): partida hasta game over, guardar con sesión, comprobar ficha y Salón (tab CAÍDA), jugar de nuevo, pausa, FIN, SALIR, sin sesión. Comparar con `references/started-games/03-tetris/index.html` (piezas, colores, fantasma, velocidades, puntuación). Consola limpia; StrictMode sin loops duplicados.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Existen `lib/games/types.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx`; `components/asteroids-canvas.tsx` no existe; `game-player.tsx` no contiene ningún `game.id === "…"`.
- [ ] `/games/asteroids/play` se comporta idéntico a antes del Paso 0 (criterios de SPEC 05), con Vidas `♥ ♥ ♥` y Nivel `01` al iniciar.
- [ ] La migración aparece aplicada (`npx supabase migration list`); `games.caida` tiene los textos nuevos y conserva `title = 'CAÍDA'`, `category = 'PUZZLE'`, `cover = 'cover-tetro'`, `color = 'magenta'`, `sort_order = 3`; `database.types.ts` regenerado.
- [ ] `/games` y el home muestran la tarjeta CAÍDA en 3.ª posición con portada `cover-tetro`; `/games/caida` muestra la ficha con Partidas `0`, Mejor global `0` y "SIN PUNTAJES AÚN — SÉ EL PRIMERO".
- [ ] `/games/caida/play` muestra el juego real en un canvas 800×600 escalado dentro de `.crt-screen`, sin deformarse en desktop ni en ≤ 840 px, sin scroll horizontal.
- [ ] Al cargar: HUD React con Puntuación `0`, **sin** stat Vidas, Nivel `01`; canvas con `SCORE 0`, `LINES 0`, `LEVEL 1`, una pieza en NEXT, la lista de CONTROLES sin `P`, y la primera pieza arriba del tablero bajando 1 fila por segundo.
- [ ] `←`/`→` mueven 1 columna (mantener la tecla repite al ritmo del SO), `↑` y `X` rotan en horario con wall kicks `0, −1, +1, −2, +2` (una I vertical pegada a la pared rota), `↓` baja 1 fila y suma 1, `Espacio` cae hasta la sombra y suma 2 por celda; la página no hace scroll con flechas ni `Espacio`.
- [ ] La pieza fantasma se dibuja translúcida donde aterrizará la pieza actual.
- [ ] La tuerca (anillo 3×3 gris `#9e9e9e`) aparece entre las piezas y su hueco central queda vacío al fijarse.
- [ ] Limpiar 1/2/3/4 líneas suma 100/300/500/800 × nivel actual; `LINES` del canvas sube en las líneas limpiadas.
- [ ] Al llegar a 10 líneas, `LEVEL` del canvas pasa a 2 y Nivel del HUD React a `02`, y la caída se acelera a 910 ms por fila (fórmula `max(100, 1000 − (nivel − 1) × 90)`).
- [ ] `SCORE` del canvas y Puntuación del HUD React muestran siempre el mismo valor (mismo formato `es-ES`).
- [ ] Cuando una pieza nueva no cabe al aparecer, el canvas dibuja el overlay `GAME OVER` con `PUNTAJE: N`, se abre "FIN DEL JUEGO" con la misma puntuación final, y ninguna tecla (`P`, `Espacio`, `R`, `Enter`) reinicia ni mueve nada.
- [ ] `P` no hace nada en ningún momento.
- [ ] PAUSA congela el juego (la pieza no baja, las teclas no la mueven) y REANUDAR continúa sin que la pieza "salte" filas; `Espacio` tras pulsar PAUSA no reanuda ni hace hard drop.
- [ ] FIN abre el modal con el puntaje actual; SALIR vuelve a `/games/caida`.
- [ ] Con sesión, GUARDAR inserta `{game_id: 'caida', player_name, score}` y la ficha y el Salón de la Fama (tab CAÍDA) lo muestran sin reiniciar el servidor; Partidas sube en 1.
- [ ] Sin sesión no hay botón GUARDAR y no se inserta nada.
- [ ] JUGAR DE NUEVO arranca una partida limpia: tablero vacío, Puntuación `0`, Nivel `01`, `LINES 0`.
- [ ] Escribir en inputs (modal, buscador) no mueve piezas.
- [ ] Navegar fuera y volver no deja loops ni listeners duplicados (una sola pieza responde; verificado bajo StrictMode en `npm run dev`).
- [ ] `asteroids` y los 7 mocks restantes (`/games/<id>/play`) siguen funcionando igual; los mocks siguen mostrando las 3 stats (Puntuación, Vidas, Nivel).
- [ ] Consola sin errores ni warnings de hidratación en `/games/caida` y `/games/caida/play`.
- [ ] `git diff` no toca `lib/games.ts`, `app/games/[id]/play/actions.ts` ni las migraciones existentes.

## Decisiones tomadas y descartadas

- **Sí:** reemplazar el mock `caida` (`update`, conserva id y `sort_order = 3`). **No:** id nuevo; habría dos juegos de bloques que caen y el mock quedaría redundante. No hay scores que perder.
- **Sí:** título CAÍDA. **No:** el nombre comercial del juego clásico; se evita la marca y se mantiene el catálogo en español. Se elimina el `<h1>` del reference.
- **Sí:** posición 3 (la del mock). **No:** primero; `asteroids` sigue siendo el tab por defecto del Salón. CAÍDA ya está entre los 6 del home.
- **Sí:** reutilizar `cover-tetro`. **No:** portada nueva; la actual ya representa piezas cayendo y no hay dos tarjetas iguales.
- **Sí:** solo `short_desc`/`long_desc` cambian en la migración. **No:** tocar `title`/`category`/`color`/`cover`; no cambian.
- **Sí:** registro genérico (`REAL_GAMES`) dentro de esta spec como Paso 0. **No:** otro `if (game.id === "caida")` en `game-player.tsx`, ni spec separada; es el segundo juego real y el refactor es pequeño.
- **Sí:** lienzo lógico 800×600 con tablero centrado y panel en canvas (SCORE/LINES/LEVEL a la izquierda, NEXT y CONTROLES a la derecha). **No:** canvas 300×600 con barras negras; deja el 60 % de la pantalla vacía y pierde el panel del reference. **No:** HUD en DOM; los HUD DOM no se portan.
- **Sí:** HUD React con Puntuación = `score`, Nivel = `level`, Vidas oculto. **No:** Vidas `—`; el juego no tiene vidas y un stat vacío confunde. Líneas solo en el canvas (el HUD de plataforma no tiene ese stat).
- **Sí:** conservar las 8 piezas, tuerca incluida, con azar uniforme. **No:** solo 7 estándar; la tuerca es la identidad del reference.
- **Sí:** overlay `GAME OVER` / `PUNTAJE: N` en canvas. **No:** botón Reiniciar del reference; chocaría con el modal de la plataforma.
- **Sí:** solo teclado, auto-repeat del SO. **No:** DAS/ARR propio, táctil, gamepad; amplían el motor y el alcance.
- **Sí:** solo tema oscuro, grid `#22222e` fijo. **No:** toggle de tema con `localStorage` y `getComputedStyle(document.body)`; no encaja en el marco CRT y lee el DOM fuera del canvas.
- **Sí:** `dt` capado a 50 ms y acumulador de gravedad dentro del rAF. **No:** `dt` sin cap del reference; tras volver a la pestaña bajaría una fila de golpe (el reference ya resetea `dropAccum = 0`, así que como mucho baja 1 fila; se conserva ese reset).
- **Sí:** puntuación acotada a 10.000.000. **No:** dejarla libre; `scores` y `saveScoreAction` rechazarían el guardado.
- **Sí:** reiniciar remontando el canvas con `key`. **No:** método `restart()` en el motor; menos API, estado residual cero.
- **Sí:** sin `public/games/caida/`. **No:** assets; el reference es 100 % dibujo en canvas.

## Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                                                          |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paso 0 rompe `asteroids`                                                        | Paso 0 se verifica aislado contra los criterios de SPEC 05 antes de tocar `caida`.                                                                  |
| StrictMode monta dos veces y deja dos loops/listeners                           | `destroy()` marca `destroyed`, cancela rAF y quita el listener; criterio explícito.                                                                 |
| `Espacio`/`Enter` activan el botón enfocado o escriben en el modal              | `preventDefault` solo activo, `blur()` en botones del HUD (ya existe), motor ignora `input`/`textarea`/`select`.                                    |
| Flechas/`Espacio` hacen scroll                                                  | `preventDefault` en las 6 teclas del juego mientras está activo.                                                                                    |
| Mantener `Espacio` encadena hard drops por auto-repeat (igual que el reference) | Aceptado por fidelidad; documentado. Si molesta, ignorar `e.repeat` en `Space` en una spec futura.                                                  |
| Teclas atascadas al perder foco                                                 | No aplica: el motor es por eventos `keydown` (sin mapa de teclas pulsadas), así que no necesita listener `blur`.                                    |
| Import del motor rompe SSR / `cacheComponents`                                  | `pieces.ts` es puro; nada de `document`/`window` a nivel de módulo; `performance.now()` solo dentro de `createCaida`.                               |
| Re-renders del HUD recrean el motor                                             | Latest-ref en `GameCanvas`; callbacks solo al cambiar.                                                                                              |
| Reglas React 19 del lint (`set-state-in-effect`, refs en render)                | Estado solo desde callbacks; estados iniciales desde `real.initial` en `useState`, no en efectos; lint en cada paso.                                |
| Pico de `dt` al volver a la pestaña o reanudar                                  | Cap 50 ms; `setPaused(false)` reinicia `lastTime`.                                                                                                  |
| Desfase HUD canvas vs HUD React (score, nivel)                                  | Ambos salen del mismo estado; emitir `onScore`/`onLevel` en el mismo tick que cambia (`softDrop`, `hardDrop`, `clearLines`); mismo formato `es-ES`. |
| `onGameOver` doble (game over disparado desde keydown y desde el loop)          | Flag `gameOver` comprobado antes de emitir; el loop termina tras dibujar el overlay.                                                                |
| Partida muy larga supera 10.000.000                                             | `Math.min(score, MAX_SCORE)` en cada suma.                                                                                                          |
| Ocultar Vidas cambia el layout del HUD para mocks o asteroids                   | Ocultar solo si `real && !real.hud.lives`; criterio de que mocks y asteroids conservan las 3 stats.                                                 |
| `caida` no muestra los textos nuevos tras la migración                          | Caché `games` se regenera en build; reiniciar `npm run dev`; documentado.                                                                           |

## Qué **no** entra en esta spec

- Sonido, música, controles táctiles y gamepad.
- Hold, 7-bag, T-spin, lock delay, SRS completo, rotación antihoraria, DAS/ARR propio.
- Tema claro / toggle de tema.
- Portada nueva para `caida`.
- Cambios en `asteroids` (más allá del Paso 0) o en los otros 7 mocks.
- Cambios en `scores`, `leaderboard`, `saveScoreAction` o `lib/games.ts`; anti-trampa.
- Tests automatizados, soporte `devicePixelRatio`.

Cada uno de estos, si llega, va en su propia spec.
