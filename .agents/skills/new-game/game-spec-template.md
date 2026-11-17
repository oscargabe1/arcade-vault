# Plantilla — spec de juego nuevo

Esqueleto que `/new-game` rellena. **No se copia literal**: cada `<placeholder>` y cada comentario `<!-- … -->` se sustituye por contenido real (del código de referencia o de las respuestas del usuario). Las secciones y su orden replican `specs/05-asteroids-game-port.md`. El idioma es el de las specs del repo (español).

Origen de cada parte:

- **[REF]** — se extrae del código/README de `references/started-games/<carpeta>/` (o de la descripción, si es original).
- **[RESP]** — sale de las respuestas en Fase 3.
- **[CONTRATO]** — se copia/adapta de `integration-contract.md`.

---

```markdown
# SPEC NN — <Portar <Reference> como juego `<id>` | Juego nuevo `<id>`>

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06<, SPEC MM (registro) si fue separada>
> **Date:** <fecha de la sesión>
> **Objective:** <Una frase: añadir/reemplazar `<id>` en el catálogo con un juego real en canvas cuyo puntaje se guarda en el leaderboard de Supabase.>

## Por qué existe esta spec

<!-- [REF] qué es el juego, en qué estado está el reference (líneas, globals, loop propio), y por qué entra ahora. [RESP] si reemplaza al mock `<mock-id>` o entra con id propio. Si incluye Paso 0, explicar que asteroids estaba hardcodeado en game-player.tsx y que esta spec introduce el registro. -->

## Alcance

**Dentro:**

- <Paso 0 si aplica> Registro genérico: `lib/games/types.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx`; `game-player.tsx` usa `REAL_GAMES[game.id]`; `asteroids` migra al registro y se borra `components/asteroids-canvas.tsx`. [CONTRATO §2–4]
- Catálogo: migración `supabase/migrations/<ts>_add_<id>_game.sql` con <insert de `<id>` en `sort_order = n` | update de `<mock-id>`>: `title`, `short_desc`, `long_desc`, `category`, `cover`, `color`. [RESP] Textos `short`/`long` redactados desde el README. [REF]
- Portada `.cover-<id>` en `app/globals.css` diseñada con `/frontend-design` <| reutiliza `<cover-mock>`>. [RESP]
- Motor portado a TypeScript en `lib/games/<id>/` (`engine.ts` + <archivos>), sin globals ni DOM a nivel de módulo. [CONTRATO §1]
- Lógica de juego idéntica al reference: <lista concreta de reglas: puntuación por acción, velocidad, niveles, vidas, power-ups…>. [REF]
- HUD del canvas original <se conserva: qué dibuja | se elimina>. Overlay de game over con `PUNTAJE: N`. [RESP]
- HUD de la plataforma: Puntuación = <métrica>, Vidas = <métrica | oculto>, Nivel = <métrica | oculto>. [RESP]
- Entrada en `REAL_GAMES`: `{ factory: create<Name>, width: W, height: H, hud: { lives, level }, initial: { lives, level } }`.
- Controles: <teclas/mouse>; `preventDefault` en <teclas> mientras está activo. [REF]+[RESP]
- Assets en `public/games/<id>/`: <lista> <| no hay assets>. [REF]
- Desviaciones del reference: <reinicio y pausa delegados a la plataforma; otras>. [RESP]
- Guardado vía `saveScoreAction` existente; sin cambios en `scores`, `leaderboard` ni `lib/games.ts`. [CONTRATO §6]

**Fuera de alcance (specs futuras):**

- <táctil, sonido, gamepad, recolor, niveles extra, editor…> [RESP]
- Cambios en otros juegos (reales o mocks) <y en el mock `<mock-id>` si no se reemplaza>.
- Cambios en el modelo de `scores`/`leaderboard`, anti-trampa.
- Tests automatizados (no hay runner configurado).

## Modelo de datos

<!-- [CONTRATO §2,§4,§5] Mostrar: SQL de la migración (insert/update concreto con textos reales), tipos TS nuevos (types.ts y registry.ts si Paso 0), firma `create<Name>`, entrada del registro, y estado interno del motor (antes globals del reference: lista real). Indicar valores de emisión inicial de callbacks. -->

## Plan de implementación

Antes de escribir: leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components y `cacheComponents`.

<!-- Pasos numerados, cada uno deja el sistema funcional y termina en "Verificar: …". Orden recomendado: -->

0. <Solo si aplica> Registro genérico + migrar asteroids. Verificar: lint/build; `/games/asteroids/play` idéntico (criterios SPEC 05).
1. Catálogo: migración (`npm run db:new add_<id>_game`), `db:push`, `db:types`; portada `.cover-<id>`. Verificar: `/games` muestra la tarjeta; `/games/<id>/play` muestra el mock (aún sin registro).
2. Motor: `lib/games/<id>/<entidades/datos>.ts`. Verificar: lint/build (importar no toca el DOM).
3. Motor: `lib/games/<id>/engine.ts` con `create<Name>` (input, update, draw, HUD canvas, game over, `setPaused`, `destroy`). Verificar: lint.
4. <Assets a `public/games/<id>/` si aplica.>
5. Registro: añadir `<id>` a `REAL_GAMES`. Verificar: `/games/<id>/play` muestra el juego real; los demás siguen igual.
6. Verificación manual completa (`/run` o navegador, desktop y ≤ 840 px): partida hasta game over, guardar con sesión, comprobar ficha y Salón, jugar de nuevo, pausa, FIN, SALIR, sin sesión. Comparar con `references/started-games/<carpeta>/index.html`. Consola limpia; StrictMode sin loops duplicados.

## Criterios de aceptación

<!-- [CONTRATO §8] adaptados con <id> + criterios específicos [REF] con valores exactos (puntos por acción, condiciones de nivel, valores iniciales del HUD, qué dibuja el canvas al cargar). Todos booleanos y verificables. -->

## Decisiones tomadas y descartadas

<!-- Formato "**Sí:** … **No:** …; motivo". Incluir siempre: id nuevo vs reemplazo de mock, posición en catálogo, mapeo de HUD, HUD de canvas conservado o no, controles, assets, registro genérico vs if por id, reinicio por remontaje (`key`) vs método restart. -->

## Riesgos identificados

<!-- [CONTRATO §9] filtrados a los que aplican + específicos del juego (p. ej. mouse fuera del canvas, timers de gravedad, carga de spritesheet). Tabla Riesgo | Mitigación. -->

## Qué **no** entra en esta spec

<!-- Resumen del fuera de alcance. -->

Cada uno de estos, si llega, va en su propia spec.
```
