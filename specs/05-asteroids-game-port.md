# SPEC 05 — Portar Asteroids como juego nuevo `asteroids`

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-27
> **Objective:** Añadir al catálogo un juego nuevo `asteroids` cuyo reproductor (`/games/asteroids/play`) corre el Asteroids real de `references/started-games/02-asteroids/`, portado a un motor TypeScript en un `<canvas>`, conservando el HUD original del canvas y mostrando además el HUD de la plataforma.

## Por qué existe esta spec

El reproductor actual (`components/game-player.tsx`) es un mock: suma puntos aleatorios con un `setInterval` y dibuja una arena falsa. Asteroids ya existe como juego completo en canvas puro (`game.js`, 510 líneas, globals + `document.getElementById`, loop propio). Es el primer juego real de la plataforma, así que esta spec fija el patrón (motor framework-agnóstico + wrapper React + callbacks al HUD) que seguirán los demás. El juego entra con id propio `asteroids`; `rocas` es un juego mock del catálogo y no se toca.

## Alcance

**Dentro:**

- Nueva entrada `asteroids` **al inicio** de `GAMES` en `lib/data.ts` (queda en el preview del home y primero en `/games`):
  - `id: "asteroids"`, `title: "ASTEROIDS"`, `cat: "SHOOTER"`, `cover: "cover-asteroids"`, `color: "cyan"`, `best: 0`, `plays: "0"`.
  - `short` / `long` redactados a partir del README del reference (nave, bordes toroidales, asteroides que se parten, 3 vidas, power-up de disparo triple). Sin mencionar OVNIs.
- Clase `.cover-asteroids` (con `::before`/`::after` si hace falta) en `app/globals.css`, coherente con las portadas existentes (`.cover-rocas` en `app/globals.css:490` como referencia de estructura). Diseño guiado por `/frontend-design`.
- Motor portado a TypeScript en `lib/games/asteroids/`, sin globals ni acceso a `document`/`window` en el nivel de módulo:
  - `entities.ts`: `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y constantes (`RADII`, `SPEEDS`, `POINTS`, `W = 800`, `H = 600`, power-up).
  - `engine.ts`: `createAsteroids(canvas, callbacks)` con estado, input, update, draw y loop `requestAnimationFrame` (`dt` capado a 50 ms).
- Lógica de juego idéntica a `game.js`: 3 vidas, invencibilidad con parpadeo, wrap toroidal, división 3→2→1 de asteroides, puntos 20/50/100, partículas, power-up `3x` (15 % de drop, garantizado a las 5 muertes, 5 s de duración, 12 s de vida), siguiente nivel con `3 + level` asteroides.
- **HUD del canvas original se conserva** (`drawHUD` de `game.js`): `SCORE N` arriba a la izquierda, `NIVEL N` centrado, iconos de vida arriba a la derecha y `3x  N.Ns` cuando hay power-up. El overlay "GAME OVER" también se conserva.
- **HUD de la plataforma** (Jugador / Puntuación / Vidas / Nivel) alimentado por callbacks del motor. Es información duplicada a propósito: canvas y HUD React deben mostrar los mismos valores.
- Componente cliente `components/asteroids-canvas.tsx`: monta el motor en `useEffect`, lo destruye al desmontar y expone `active` (pausa/reanuda) y callbacks.
- `components/game-player.tsx` despacha por `game.id`: `asteroids` usa el motor real; los otros 8 juegos (incluido `rocas`) conservan el mock tal cual. Botones PAUSA/REANUDAR, FIN, SALIR y modal "FIN DEL JUEGO" con GUARDAR PUNTUACIÓN y JUGAR DE NUEVO funcionan con el juego real.
- Guardado vía `saveScore({ game: "asteroids", score, name })` existente (localStorage `av_scores`).
- Teclado solamente: `←` `→` rotar, `↑` propulsar, `Espacio` disparar; `preventDefault` en esas teclas mientras el juego está activo para que la página no haga scroll.
- Estilo visual original: trazos blancos sobre negro, power-up cian; el marco CRT/scanlines de la plataforma lo rodea.
- Canvas con resolución lógica fija 800×600, escalado por CSS al 100 % del ancho de `.crt-screen` (que ya es 4/3).
- Única desviación del reference: en el overlay "GAME OVER" del canvas el subtexto pasa a `PUNTAJE: N` (sin "ESPACIO PARA REINICIAR") y `Espacio` ya no reinicia; el reinicio lo hace el modal de la plataforma.

**Fuera de alcance (specs futuras):**

- Controles táctiles / D-pad en pantalla.
- Recolorear el juego con el neón de la plataforma, sonido, OVNIs.
- Cambios al juego `rocas` (sigue como mock, con su portada y copy actuales).
- Puntajes en Supabase, leaderboard real, mejor puntaje local en la ficha. El leaderboard de `/games/asteroids` sigue siendo `seededScores`.
- Portar los otros 8 juegos o reemplazar su mock.
- Hint de controles en la UI, soporte de gamepad, ajuste por `devicePixelRatio`.
- Cambios en `app/games/[id]/page.tsx`, `session-provider.tsx`, rutas o en cualquier entrada de `GAMES` distinta de la nueva.
- Tests automatizados (no hay runner configurado).

## Modelo de datos

Sin tablas ni persistencia nueva. Estructuras nuevas (tipos TS):

```ts
// lib/data.ts — nueva primera entrada de GAMES (tipo Game sin cambios)
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "...", // redactar desde el README del reference
  long: "...",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 0,
  plays: "0",
}

// lib/games/asteroids/engine.ts
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

export function createAsteroids(
  canvas: HTMLCanvasElement,
  cb: AsteroidsCallbacks,
): AsteroidsGame;

// components/asteroids-canvas.tsx
type Props = AsteroidsCallbacks & { active: boolean }; // active = !paused && !over
```

Estado interno del motor (antes globals de `game.js`): `ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state` (`"playing" | "dead" | "gameover"`), `deadTimer`, `powerUpSpawned`, `killsSinceSpawn`. Los callbacks se emiten solo cuando el valor cambia, más una emisión inicial (0 / 3 / 1) al crear el juego, en el mismo frame en que cambia el estado que dibuja el canvas.

`SavedScore` en `lib/data.ts` no cambia de forma: `{ game: "asteroids", score, name, at }`.

## Plan de implementación

Antes de escribir: leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components (`"use client"`) y de `cacheComponents`; el canvas y el motor solo existen en cliente.

1. Catálogo: añadir la entrada `asteroids` al inicio de `GAMES` y la clase `.cover-asteroids` en `app/globals.css` (usar `/frontend-design`). Verificar: `npm run build` pasa; aparece primera en `/games` y en "JUEGOS DISPONIBLES AHORA" del home; `/games/asteroids` muestra ficha con portada propia, mejor global `0` y partidas `0`; `/games/asteroids/play` muestra el mock por ahora; `rocas` sigue igual.
2. Crear `lib/games/asteroids/entities.ts`: portar clases y constantes de `game.js` a TS. Las entidades reciben `ctx` en `draw(ctx)` en vez de usar un global. Verificar: `npm run lint` y `npm run build` pasan (el módulo no toca `document` al importarse).
3. Crear `lib/games/asteroids/engine.ts` con `createAsteroids`: `keys`/`justPressed` locales, listeners `keydown`/`keyup`/`blur` en `window` (blur limpia teclas), ignorando eventos cuyo `target` sea `input`/`textarea`/`select`; `preventDefault` en `ArrowLeft/Right/Up/Down` y `Space`. `initGame`, `update`, `draw` (incluye `drawHUD` y `drawLifeIcon` originales sin cambios), loop con `dt` capado. Al llegar a `gameover` llama a `onGameOver(score)` una sola vez, dibuja el overlay "GAME OVER" con subtexto `PUNTAJE: N`, deja de aceptar input y se elimina el reinicio por `Espacio`. `destroy()` cancela el rAF y remueve todos los listeners. Verificar: `npm run lint` pasa.
4. Crear `components/asteroids-canvas.tsx` (`"use client"`): `<canvas width={800} height={600}>` con estilo 100 % ancho/alto, `display: block`. Un `useEffect` de montaje crea el juego y devuelve `destroy`; los callbacks se leen desde un ref (patrón latest-ref) para no recrear el motor en cada render; otro `useEffect` llama `setPaused(!active)`. Verificar: el componente compila y no rompe el build.
5. Modificar `components/game-player.tsx`: `const real = game.id === "asteroids"`. Para `real`: renderizar `<AsteroidsCanvas key={runKey} active={!paused && !over} … />` dentro de `.crt-screen` en lugar de `.game-arena`; los callbacks hacen `setScore`/`setLives`/`setLevel`/`setOver(true)`; desactivar los dos `useEffect` mock (intervalo de score y subida de nivel) cuando `real`. `restart()` incrementa `runKey` (remonta el canvas = juego nuevo) además de resetear el estado actual. El overlay de pausa y el modal existentes no cambian. Para el resto de juegos el comportamiento es el actual. Al pulsar PAUSA/REANUDAR/FIN el botón debe quitar el foco (`blur`) para que `Espacio` no lo re-active. Verificar: `/games/bloque-buster/play` y `/games/rocas/play` siguen mock; `/games/asteroids/play` muestra el juego.
6. Verificación manual completa con `/run` o navegador en `/games/asteroids/play` (desktop y ≤ 840 px de ancho): jugar una partida hasta perder las 3 vidas, guardar puntaje, jugar de nuevo, pausar, FIN, SALIR. Comparar el canvas contra `references/started-games/02-asteroids/index.html`. Revisar consola sin errores ni warnings. Verificar en `npm run dev` (StrictMode: doble montaje) que no queden dos loops corriendo.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `GAMES` tiene 9 entradas con `asteroids` primera; `/games` muestra 9 tarjetas con ASTEROIDS primero y el home la incluye en "JUEGOS DISPONIBLES AHORA" (los 6 primeros).
- [ ] `/games/asteroids` muestra portada `cover-asteroids`, categoría SHOOTER, mejor global `0` y partidas `0`; `JUGAR AHORA` lleva a `/games/asteroids/play`.
- [ ] `/games/asteroids/play` muestra el juego real en un canvas 800×600 escalado dentro del `.crt-screen`, sin deformarse en desktop ni en ≤ 840 px, sin scroll horizontal.
- [ ] Al cargar, el HUD React muestra Puntuación `0`, Vidas `♥ ♥ ♥`, Nivel `01`, el canvas dibuja `SCORE  0`, `NIVEL 1` y 3 iconos de nave, y el juego arranca con 4 asteroides grandes y la nave parpadeando 3 s.
- [ ] `←` `→` rotan, `↑` propulsa (con llama), `Espacio` dispara (cooldown 0,2 s); la página no hace scroll al pulsar `↑`, `↓` ni `Espacio`.
- [ ] Destruir un asteroide grande/mediano/pequeño suma 20/50/100; `SCORE` del canvas y Puntuación del HUD React muestran siempre el mismo valor; los grandes y medianos se parten en 2 del tamaño inferior, los pequeños no.
- [ ] Al chocar con un asteroide sin invencibilidad se pierde una vida (iconos del canvas y Vidas del HUD React bajan de 3 a 2…), hay 2 s de espera con explosión y reaparece al centro invencible.
- [ ] Al destruir todos los asteroides `NIVEL` del canvas y Nivel del HUD React suben en 1 y aparecen `3 + nivel` asteroides.
- [ ] El power-up `3x` aparece, se recoge al tocarlo, dispara 3 balas abiertas durante 5 s y muestra `3x  N.Ns` en el canvas.
- [ ] Al perder la última vida el canvas dibuja el overlay "GAME OVER" con `PUNTAJE: N` (sin texto de reinicio), se abre el modal "FIN DEL JUEGO" con la misma puntuación final, y `Espacio` no reinicia la partida.
- [ ] En el modal, escribir iniciales con barra espaciadora no dispara ni mueve nada del juego; GUARDAR PUNTUACIÓN agrega `{ game: "asteroids", score, name, at }` a `localStorage["av_scores"]`.
- [ ] JUGAR DE NUEVO inicia una partida nueva con score 0, 3 vidas, nivel 1 y asteroides frescos; VOLVER AL VAULT lleva a `/games`.
- [ ] PAUSA congela el juego (nada se mueve, el score no cambia), muestra el overlay "EN PAUSA", y REANUDAR continúa donde estaba; `Espacio` tras pulsar PAUSA no reanuda ni dispara.
- [ ] FIN abre el modal con el puntaje actual y detiene el juego; SALIR vuelve a `/games/asteroids`.
- [ ] Navegar fuera de `/games/asteroids/play` y volver no deja loops ni listeners duplicados (una sola nave responde al teclado; verificado también bajo StrictMode en `npm run dev`).
- [ ] Los otros 8 juegos, incluido `rocas` (`/games/<id>/play`), siguen mostrando el mock sin cambios.
- [ ] Consola sin errores ni warnings de hidratación en `/games/asteroids/play`.
- [ ] `git diff` en `lib/data.ts` solo añade la entrada `asteroids`; no toca `components/session-provider.tsx` ni `app/games/[id]/page.tsx`.

## Decisiones tomadas y descartadas

- **Sí:** id nuevo `asteroids`. **No:** reutilizar `rocas`; queda como mock de catálogo sin cambios.
- **Sí:** `asteroids` primero en `GAMES`. **No:** al final; es el único juego jugable y debe verse en el home. Efectos: `rocas` sale del preview del home (solo se muestran los 6 primeros) y el tab por defecto del Salón de la Fama pasa a ASTEROIDS (usa `GAMES[0]`).
- **Sí:** ficha con `best: 0`, `plays: "0"`. **No:** valores inventados; es un juego nuevo sin partidas.
- **Sí:** portada nueva `cover-asteroids`. **No:** reutilizar `cover-rocas`; habría dos tarjetas idénticas.
- **Sí:** motor TS en `lib/games/asteroids/` + wrapper React con callbacks. **No:** `<iframe>`/`public/game.js` ni `next/script`; el score/vidas no llegarían al HUD sin `postMessage`, globals y listeners sueltos se rompen con navegación SPA y StrictMode.
- **Sí:** HUD doble: el del canvas original (SCORE, NIVEL, vidas, `3x`) más el HUD React. **No:** quitar el del canvas; se pidió fidelidad al reference y el duplicado es aceptable. Ambos leen el mismo estado del motor.
- **Sí:** overlay "GAME OVER" del canvas conservado, con subtexto `PUNTAJE: N`. **No:** mantener "ESPACIO PARA REINICIAR"; chocaría con el modal y el campo de iniciales. Es la única desviación del reference.
- **Sí:** solo `asteroids` real, los otros 8 siguen en mock. **No:** reemplazar el mock de todos; cambia 8 juegos fuera del alcance.
- **Sí:** solo teclado. **No:** controles táctiles; amplían CSS y alcance, van en otra spec. La ficha sigue diciendo "TECLADO / TÁCTIL" hasta entonces.
- **Sí:** estilo vectorial blanco original dentro del marco CRT. **No:** recolorear con neón; cambia el juego y no se pidió.
- **Sí:** resolución lógica fija 800×600 con escalado CSS. **No:** canvas del tamaño de la ventana; obliga a reescribir física y spawns.
- **Sí:** guardar con `saveScore` en localStorage. **No:** Supabase ni leaderboard real; el modelo de scores en DB va en su propia spec (SPEC 04 dejó solo infraestructura).
- **Sí:** reiniciar remontando el canvas con `key`. **No:** método `restart()` en el motor; menos API y estado residual cero.

## Riesgos identificados

| Riesgo                                                                                            | Mitigación                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta el efecto dos veces y deja dos loops/listeners                                   | `destroy()` cancela rAF y remueve todos los listeners; criterio de aceptación explícito.                                                                  |
| `Espacio` activa el botón enfocado (PAUSA) o escribe en el input del modal                        | `preventDefault` en `Space` mientras el juego está activo, `blur()` de los botones del HUD, y el motor ignora eventos con `target` en `input`/`textarea`. |
| `ArrowUp/Down` y `Espacio` hacen scroll de la página                                              | `preventDefault` solo mientras el motor está activo; se libera al pausar/destruir.                                                                        |
| Teclas atascadas tras perder foco de la ventana o al pausar                                       | Listener `blur` en `window` limpia `keys` y `justPressed`.                                                                                                |
| Import del motor falla en SSR / `cacheComponents` por tocar `document` en el nivel de módulo      | Ningún acceso a `document`/`window`/`canvas` fuera de `createAsteroids`; el canvas solo se usa en `useEffect`.                                            |
| Re-renders del HUD recrean el motor o lo ralentizan                                               | Callbacks por ref (latest-ref) y emisión solo al cambiar el valor.                                                                                        |
| Reglas de React 19 del lint (`react-hooks/set-state-in-effect`, refs en render)                   | Setear estado solo desde callbacks del motor; refs actualizados en efecto; correr `npm run lint` en cada paso.                                            |
| Pico de `dt` al volver a la pestaña                                                               | Se conserva el cap de 50 ms del original; `setPaused` reinicia la marca de tiempo al reanudar.                                                            |
| Desfase entre HUD del canvas y HUD React                                                          | Ambos salen del mismo estado del motor; los callbacks se emiten en el mismo frame en que cambia el valor; criterios de aceptación comparan ambos.         |
| Criterio "8 tarjetas" de SPEC 02 queda obsoleto (ahora son 9) y `rocas` sale del preview del home | Aceptado y documentado en Decisiones; no se modifica SPEC 02.                                                                                             |

## Qué **no** entra en esta spec

- Controles táctiles, gamepad, sonido, OVNIs, redibujo con estética neón.
- Cambios al juego `rocas` o a los otros 7 juegos mock.
- Supabase, ranking real, mejor puntaje local en la ficha.
- Tests automatizados, hint de controles en UI, soporte `devicePixelRatio`.

Cada uno de estos, si llega, va en su propia spec.
