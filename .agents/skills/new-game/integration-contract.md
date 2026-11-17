# Contrato de integración de juegos — Arcade Vault

Patrón destilado de SPEC 05 (Asteroids) y SPEC 06 (tabla `games` + leaderboard). Toda spec generada por `/new-game` lo cumple. Las rutas y nombres son los reales del repo; `<id>` es el slug del juego y `<Name>` su nombre en PascalCase.

## 1. Motor — `lib/games/<id>/`

- `engine.ts` exporta `create<Name>(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle`. Archivos auxiliares (`entities.ts`, `levels.ts`, `pieces.ts`…) según el juego.
- **Cero acceso a `document`/`window`/`Image` a nivel de módulo**: importar el motor no debe tocar el DOM (SSR + `cacheComponents`). Todo dentro de `create<Name>`.
- Resolución lógica **fija** (la del reference, p. ej. 800×600) y escalado por CSS dentro de `.crt-screen` (relación 4/3). Si el reference no es 4/3, la spec decide letterbox o fondo.
- Loop `requestAnimationFrame` con `dt` capado a **50 ms**. Si el reference usa `setInterval`/gravedad por ticks, se mantiene la lógica pero se maneja dentro del rAF con acumulador.
- `setPaused(p)`: congela `update`, deja visible el último frame y reinicia la marca de tiempo al reanudar.
- `destroy()`: cancela rAF, timers y **todos** los listeners. Bajo StrictMode (doble montaje) no quedan dos loops.
- Callbacks: emisión inicial (p. ej. `0 / 3 / 1`) y luego **solo al cambiar**, en el mismo frame que cambia lo que dibuja el canvas.
- `onGameOver(finalScore)` **una sola vez**; luego el motor deja de aceptar input. **Sin reinicio interno**: reiniciar = remontar el canvas (`key`) desde el modal de la plataforma. Overlays de canvas tipo "PULSA X PARA REINICIAR" se cambian por `PUNTAJE: N`.
- Teclas propias de pausa/reinicio del reference (`P`, `Esc`, `R`…) se desactivan; la pausa la controla la plataforma.
- Input: listeners en `window` (`keydown`/`keyup`/`blur`; mouse sobre el `canvas` si aplica). Ignorar eventos con `target` `input`/`textarea`/`select`. `preventDefault` solo en las teclas del juego y solo mientras está activo. `blur` limpia teclas pulsadas.
- Puntuación entera entre 0 y 10.000.000 (check de `scores` y validación de `saveScoreAction`).
- Assets: en `public/games/<id>/`, cargados dentro de `create<Name>` (`new Image()` ahí); el juego espera a que carguen antes de arrancar el loop o dibuja un estado "CARGANDO".

## 2. Tipos comunes — `lib/games/types.ts`

```ts
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
```

## 3. Wrapper genérico — `components/game-canvas.tsx`

Generaliza `components/asteroids-canvas.tsx` (que se elimina en el Paso 0):

- `"use client"`; props `GameCallbacks & { factory: GameFactory; width: number; height: number; active: boolean }`.
- Patrón latest-ref para callbacks (el motor no se recrea en cada render).
- `useEffect` de montaje: `factory(canvas, …)` → devuelve `destroy`.
- `useEffect` sobre `active`: `setPaused(!active)`.
- `<canvas width height style={{ display: "block", width: "100%", height: "100%" }}>`.

## 4. Registro — `lib/games/registry.ts`

```ts
export type RealGame = {
  factory: GameFactory;
  width: number;
  height: number;
  hud: { lives: boolean; level: boolean }; // stats del HUD React que aplican
  initial: { lives: number; level: number }; // valores con que arranca el HUD
};

export const REAL_GAMES: Record<string, RealGame> = {
  asteroids: {
    factory: createAsteroids,
    width: 800,
    height: 600,
    hud: { lives: true, level: true },
    initial: { lives: 3, level: 1 },
  },
  // <id>: { … }
};
```

`components/game-player.tsx`:

- `const real = REAL_GAMES[game.id]` sustituye a `game.id === "asteroids"`.
- Con `real`: `<GameCanvas key={runKey} factory={real.factory} … active={!paused && !over} />`; los `useEffect` del mock se desactivan; `restart()` resetea a `real.initial` e incrementa `runKey`.
- Sin `real`: mock actual sin cambios.
- Stats `Vidas`/`Nivel` se ocultan si `hud.lives`/`hud.level` es `false`.
- Pausa, FIN, SALIR, overlay "EN PAUSA" y modal "FIN DEL JUEGO" no cambian.

**Paso 0 (solo si `lib/games/registry.ts` no existe):** crear `types.ts`, `registry.ts`, `game-canvas.tsx`; tipar `createAsteroids` como `GameFactory` (sus tipos `AsteroidsCallbacks`/`AsteroidsGame` pasan a ser alias o se eliminan); migrar `game-player.tsx`; borrar `components/asteroids-canvas.tsx`. Verificar que `/games/asteroids/play` se comporta idéntico (criterios de SPEC 05) antes de añadir el juego nuevo.

## 5. Catálogo — tabla `public.games`

Migración con `npm run db:new add_<id>_game`, luego `npm run db:push` y `npm run db:types`.

- **Id nuevo:**
  ```sql
  insert into public.games (id, title, short_desc, long_desc, category, cover, color, sort_order)
  values ('<id>', '<TITLE>', '<short>', '<long>', '<CAT>', 'cover-<id>', '<color>', <n>);
  ```
  `sort_order` es `unique`: para insertar en medio, desplazar primero los existentes (`update … set sort_order = sort_order + 100 where sort_order >= n` y luego normalizar) dentro de la misma migración.
- **Reemplazo de mock:** `update public.games set title = …, short_desc = …, long_desc = …, cover = … where id = '<mock-id>';` (id y `sort_order` se conservan; los `scores` ligados al id se mantienen).
- Checks vigentes: `category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')`, `color in ('cyan','magenta','yellow','green')`.
- La caché `games` (`'use cache'` + `cacheTag('games')` en `lib/games.ts`) se rellena en build / nuevo deploy; en `npm run dev` puede requerir reiniciar el servidor. `generateStaticParams` de `/games/[id]` y `/games/[id]/play` incluye el juego nuevo automáticamente.

## 6. Leaderboard — ya existe, no se toca

- Guardado: `saveScoreAction(gameId, name, score)` en `app/games/[id]/play/actions.ts` (valida juego, nombre 1–10, score entero 0–10M; `updateTag('scores:<id>')` y `updateTag('scores')`).
- Lectura: vista `leaderboard` (mejor marca por `player_name` y juego, `rank()`), `getGameStats`, `getLeaderboard`, `getHallOfFame` en `lib/games.ts`.
- Solo guarda quien tiene sesión (`useSession().user`); sin sesión el modal muestra "INICIA SESIÓN PARA GUARDAR".
- El juego nuevo solo tiene que llamar a `onGameOver(finalScore)` con un entero válido y alimentar `onScore`.

## 7. Portada — `app/globals.css`

Clase `.cover-<id>` (con `::before`/`::after` si hace falta) junto a `.cover-asteroids`, misma estructura que las portadas existentes. Diseño con `/frontend-design`. Si se reemplaza un mock, puede reutilizar su portada.

## 8. Criterios de aceptación base

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La migración aparece aplicada (`npx supabase migration list`) y `games` contiene `<id>` con el `sort_order` acordado; `database.types.ts` regenerado.
- [ ] `/games` y (si aplica) el home muestran la tarjeta con portada `cover-<id>`; `/games/<id>` muestra la ficha con Partidas `0`, Mejor global `0` y "SIN PUNTAJES AÚN — SÉ EL PRIMERO".
- [ ] `/games/<id>/play` muestra el juego real en canvas escalado dentro de `.crt-screen`, sin deformarse en desktop ni en ≤ 840 px, sin scroll horizontal.
- [ ] El HUD React (Puntuación / Vidas / Nivel según `hud`) muestra siempre los mismos valores que el juego.
- [ ] Las teclas del juego no hacen scroll de la página; escribir en inputs no mueve el juego.
- [ ] PAUSA congela el juego y REANUDAR continúa; `Espacio` tras pulsar PAUSA no reanuda ni actúa.
- [ ] FIN abre el modal con el puntaje actual; SALIR vuelve a `/games/<id>`.
- [ ] Al perder, se abre "FIN DEL JUEGO" con la misma puntuación final, y el juego no se reinicia por teclado.
- [ ] Con sesión, GUARDAR inserta `{game_id: '<id>', player_name, score}` y la ficha y el Salón de la Fama (tab del juego) lo muestran sin reiniciar el servidor; Partidas sube en 1.
- [ ] Sin sesión no hay botón GUARDAR y no se inserta nada.
- [ ] JUGAR DE NUEVO arranca una partida limpia con los valores iniciales.
- [ ] Navegar fuera y volver no deja loops ni listeners duplicados (verificado bajo StrictMode en `npm run dev`).
- [ ] `asteroids` y los demás juegos (reales y mocks) siguen funcionando igual.
- [ ] Consola sin errores ni warnings de hidratación en `/games/<id>` y `/games/<id>/play`.

## 9. Riesgos base

| Riesgo                                                             | Mitigación                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces y deja dos loops/listeners              | `destroy()` cancela rAF/timers y quita todos los listeners; criterio explícito.                      |
| `Espacio`/`Enter` activan el botón enfocado o escriben en el modal | `preventDefault` solo activo, `blur()` en botones del HUD, motor ignora `input`/`textarea`/`select`. |
| Flechas/`Espacio` hacen scroll                                     | `preventDefault` en teclas del juego mientras está activo.                                           |
| Teclas atascadas al perder foco o pausar                           | Listener `blur` limpia teclas.                                                                       |
| Import del motor rompe SSR / `cacheComponents`                     | Nada de `document`/`window`/`Image` a nivel de módulo.                                               |
| Re-renders del HUD recrean el motor                                | Latest-ref en `GameCanvas`, callbacks solo al cambiar.                                               |
| Reglas React 19 del lint (`set-state-in-effect`, refs en render)   | Estado solo desde callbacks; refs actualizados en efecto; lint en cada paso.                         |
| Pico de `dt` al volver a la pestaña                                | Cap 50 ms; `setPaused` reinicia timestamp.                                                           |
| Desfase HUD canvas vs HUD React                                    | Ambos salen del mismo estado del motor, emitidos en el mismo frame.                                  |
| Juego nuevo no aparece tras la migración                           | Caché `games` se regenera en build; reiniciar `npm run dev`; documentado.                            |
| `sort_order` duplicado al insertar en medio                        | Desplazar filas en la misma migración.                                                               |
| Assets no cargados al primer frame                                 | Carga dentro de `create<Name>` y arranque tras `onload` / estado "CARGANDO".                         |
