---
name: new-game
description: Diseña la spec para añadir un juego jugable a Arcade Vault (motor TS en canvas + wrapper React + registro de juegos + fila en la tabla games + leaderboard en Supabase). Acepta una carpeta de references/started-games/ o la descripción de un juego original. Úsala al portar o crear un juego, antes de escribir código; la implementación se hace después con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games (ej. 03-tetris) o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*), Bash(test:*), mcp__supabase__execute_sql, mcp__supabase__list_tables
---

# /new-game — Spec para un juego nuevo con leaderboard

## Contexto de sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay references/started-games/"`

Motores ya portados:
!`ls lib/games/ 2>/dev/null || echo "No existe lib/games/"`

Registro genérico de juegos:
!`test -f lib/games/registry.ts && echo "EXISTE lib/games/registry.ts" || echo "NO EXISTE lib/games/registry.ts — la spec debe incluir el Paso 0 (registro genérico)"`

Migraciones:
!`ls supabase/migrations/ 2>/dev/null || echo "No hay migraciones"`

---

Esta skill produce **una spec** (`specs/NN-<id>-game.md`, estado `Borrador`) que describe cómo añadir un juego jugable a la plataforma siguiendo el patrón fijado por SPEC 05 (Asteroids: motor TS + wrapper React + HUD por callbacks) y SPEC 06 (tabla `games`, `scores`, vista `leaderboard`, `saveScoreAction`). **No escribes código.** El usuario implementa luego con `/spec-impl`.

Archivos de apoyo en este mismo directorio:

- `integration-contract.md` — contrato técnico que todo juego cumple (motor, tipos, wrapper, registro, DB, leaderboard, portada, criterios y riesgos base). Léelo siempre.
- `game-spec-template.md` — esqueleto de la spec a generar. Respétalo.

Responde en el idioma del prompt inicial (por defecto español, como las specs del repo).

## Fase 1 — Contexto del proyecto

1. Lee `CLAUDE.md`, `integration-contract.md` y `game-spec-template.md`.
2. Lee `specs/05-asteroids-game-port.md` y `specs/06-games-table-and-leaderboard.md` (patrón base) y las dos specs más recientes si son posteriores (convenciones nuevas, p. ej. el registro).
3. Lee `components/game-player.tsx`, el motor de ejemplo (`lib/games/asteroids/engine.ts`) y, si existe, `lib/games/registry.ts`.
4. Consulta el catálogo real (MCP Supabase `execute_sql`):
   ```sql
   select id, title, category, cover, color, sort_order from public.games order by sort_order;
   ```
   Juegos con entrada en el registro (o `asteroids` si no hay registro) son **reales**; el resto son **mocks**. Si el MCP no está disponible, lee la migración más reciente de `supabase/migrations/` y avisa de que los datos pueden estar desactualizados.

## Fase 2 — Origen del juego

`$ARGUMENTS` puede ser una carpeta de referencia (`03-tetris`, `tetris`, `04-arkanoid`…) o una descripción.

**Si coincide con una carpeta de `references/started-games/`:** lee `README.md`, `CLAUDE.md` y todo el código (`game.js`, `levels.js`, `style.css`, `index.html`, `assets/`, `specs/` si hay). Usa `wc -l` para dimensionar. Extrae y anota:

- Resolución del canvas y si depende de la ventana.
- Loop (rAF/setInterval), `dt`, estados (`playing`/`paused`/`gameover`…).
- Globals y accesos a `document`/`window` que habrá que encapsular.
- Input: teclas, mouse, táctil; teclas propias de pausa (`P`/`Esc`) o reinicio.
- HUD propio dibujado en canvas o en DOM (los HUD en DOM no se portan; se mapean al HUD React).
- Puntuación, vidas, nivel (o equivalentes: líneas, oleadas…). Cómo y cuándo cambian.
- Game over y reinicio.
- Assets (imágenes, spritesheets, fuentes, sonido) y cómo se cargan.

**Si no hay referencia (juego original):** pregunta mecánica principal, controles, cómo se puntúa, condición de fin, vidas/niveles. Debe ser un juego original o de género; no una recreación de un juego existente concreto (nombre, personajes, arte, niveles). Si la descripción apunta a eso, propón un giro original.

## Fase 3 — Preguntas

Bloques de 3–5 preguntas con `AskUserQuestion`, recomendación primero y marcada `(Recomendado)`. No preguntes lo que ya puedes deducir del código. Cubre siempre:

1. **Catálogo:** id (slug), título, categoría (`ARCADE|PUZZLE|SHOOTER|VERSUS`), color (`cyan|magenta|yellow|green`).
2. **Id nuevo o reemplazar un mock.** Lista los mocks del catálogo con temática similar (p. ej. tetris ↔ `caida`, arkanoid ↔ `bloque-buster`). Opciones: id nuevo (`insert`, mock intacto) o reemplazar el mock (`update` de la fila: conserva id, `sort_order` y opcionalmente portada/textos). Pregúntalo **siempre**, aunque no haya candidato obvio.
3. **Posición** (`sort_order`): primero, al final, o en lugar del mock. Recuerda que el home muestra los 6 primeros y el Salón usa el primero como tab por defecto.
4. **Mapeo al HUD de la plataforma** (Puntuación / Vidas / Nivel): qué métrica alimenta cada uno; si el juego no tiene vidas o nivel, se oculta ese stat (`hud.lives`/`hud.level` = false) o se muestra `—`.
5. **Fidelidad:** conservar el HUD del canvas (recomendado, como SPEC 05) o quitarlo; overlay de game over del canvas; desviaciones obligatorias (el reinicio y la pausa los controla la plataforma; teclas propias de pausa/reinicio se desactivan o se delegan).
6. **Controles:** teclado / mouse; qué teclas reciben `preventDefault`. Táctil queda fuera salvo que se pida.
7. **Assets:** copiar a `public/games/<id>/` (recomendado) o reemplazar por dibujo vectorial.
8. **Portada** `.cover-<id>`: nueva (diseñada con `/frontend-design`) o reutilizar la del mock reemplazado.
9. **Fuera de alcance:** sonido, táctil, gamepad, niveles extra, recolor, etc.

Si `lib/games/registry.ts` **no existe**, informa que la spec incluirá el **Paso 0 — registro genérico** (refactor de `game-player.tsx` + migrar asteroids) y pregunta si va en esta spec (recomendado) o en una spec propia previa.

Deja de preguntar cuando puedas responder sin suponer: qué archivos aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica.

Si el juego es muy grande (varias mecánicas + editor/niveles + muchos assets) o toca más de tres áreas, propón dividirlo en dos specs (p. ej. núcleo jugable / niveles y power-ups).

## Fase 4 — Escribir la spec

1. Número: el mayor de `specs/` + 1, dos dígitos. Slug: `<id>-game` (o `<id>-game-port` si viene de referencia).
2. Rellena `game-spec-template.md` con datos reales: rutas, nombres de tipos (`create<Name>`), métricas, teclas, textos `short`/`long` redactados (desde el README si hay referencia), migración, criterios.
3. Copia del contrato los criterios y riesgos base que apliquen y añade los específicos del juego (puntuaciones exactas, reglas de nivel, etc., tomados del código de referencia).
4. Cabecera: `**Status:** Borrador`, `**Depends on:** SPEC 05, SPEC 06` (+ la spec del registro si fue separada; verifica que exista), `**Date:**` de la sesión.
5. Escribe el archivo directamente, sin pedir confirmación por sección si Fase 3 quedó completa. Solo pregunta si el archivo ya existe.
6. Si falta `specs/.spec-config.yml`, créalo como hace `/spec` (`AutoCreateBranch: true`).

## Fase 5 — Cierre

Muestra:

- Ruta de la spec creada.
- Recordatorio: está en `Borrador`; cámbiala a `Aprobado` tras revisarla.
- Siguiente paso: `/spec-impl NN-slug`.

**Detente aquí.** No propongas implementar.

## Reglas duras

- Nunca escribas código ni migraciones; solo el `.md` de la spec (y `.spec-config.yml` si falta).
- Nunca asumas decisiones no confirmadas (id, reemplazo de mock, mapeo de HUD, assets).
- No reinventes el leaderboard: `scores`, `leaderboard`, `saveScoreAction`, `getLeaderboard`, `getHallOfFame` ya funcionan por `game_id`; la spec solo asegura que el juego emite un `finalScore` entero 0–10.000.000.
- Un juego real siempre se integra vía registro; nunca con un nuevo `if (game.id === …)` en `game-player.tsx`.
- Los juegos que no se tocan (reales y mocks) deben seguir igual; inclúyelo como criterio.
