# SPEC 06 — Tabla `games` y leaderboard real en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-10-27
> **Objective:** Mover el catálogo de juegos a una tabla `games` de Supabase y reemplazar los leaderboards mock por puntajes reales en una tabla `scores`, guardados solo por jugadores con sesión.

## Por qué existe esta spec

El catálogo vive en `GAMES` (`lib/data.ts`) y los leaderboards de la ficha y del Salón de la Fama salen de `seededScores` (datos inventados). Los puntajes guardados van a `localStorage["av_scores"]` y nadie los lee. SPEC 04 dejó Supabase conectado sin tablas; esta spec crea las dos primeras tablas y conecta la UI a ellas. Supabase Auth no existe todavía: "autenticado" significa la sesión mock `av_user` de `components/session-provider.tsx`.

## Alcance

**Dentro:**

- Migración `games`: tabla + seed de los 9 juegos actuales (mismo orden, `asteroids` primero) + RLS de solo lectura para `anon`.
- Migración `scores`: tabla + vista `leaderboard` (mejor marca por `player_name` y juego, con rango) + RLS `select` e `insert` para `anon` con checks.
- Cliente sin cookies `lib/supabase/public.ts` para lecturas dentro de `'use cache'`.
- Capa de lectura `lib/games.ts`: `getGames`, `getGame`, `getGameStats`, `getLeaderboard`, `getHallOfFame`, con `'use cache'` + `cacheTag`.
- Catálogo desde DB en: home (`components/home.tsx`), biblioteca (`components/library.tsx`), ficha `/games/[id]`, reproductor `/games/[id]/play`, Salón de la Fama, y `generateStaticParams` de ambas rutas `[id]`. Componentes cliente reciben `games` por props.
- Ficha: `Partidas` = nº de puntajes guardados, `Mejor global` = max score (0 / 0 sin datos); top 10 real de `leaderboard`.
- Salón de la Fama: tabs desde DB, podio + tabla top 12 reales; fila "TU MEJOR MARCA" con rango y puntaje reales del nombre de la sesión (no aparece si no tiene puntaje).
- Estados vacíos: leaderboard "SIN PUNTAJES AÚN — SÉ EL PRIMERO"; podio con slots `---`.
- Guardado: Server Action `saveScoreAction` en `app/games/[id]/play/actions.ts` que valida, inserta en `scores` con `user.name` e invalida con `updateTag`.
- Modal "FIN DEL JUEGO": con sesión → muestra el nombre de la sesión (no editable) + GUARDAR PUNTUACIÓN; sin sesión → sin botón, texto "INICIA SESIÓN PARA GUARDAR" con link a `/auth`. Error de guardado → mensaje en el modal y botón reintentable.
- Degradado: `app/error.tsx` "VAULT FUERA DE LÍNEA" con botón reintentar si falla el catálogo; leaderboard que falla → "NO SE PUDO CARGAR".
- Limpieza: se eliminan `GAMES`, `seededScores`, `PLAYERS`, `SavedScore`, `saveScore` del contexto y toda escritura a `av_scores`.

**Fuera de alcance (specs futuras):**

- Supabase Auth, `user_id` en `scores`, RLS por `auth.uid()`, `proxy.ts`.
- Anti-trampa (firma de partidas, validación server-side del juego).
- Migrar datos viejos de `localStorage["av_scores"]`.
- Panel admin para editar juegos, juegos nuevos, portar los 8 juegos mock.
- Paginación, filtros por fecha, Realtime en leaderboards.
- Cambios de diseño visual más allá de estados vacío/error/sin sesión.
- Tests automatizados.

## Modelo de datos

```sql
-- supabase/migrations/<ts>_create_games.sql
create table public.games (
  id          text primary key,              -- slug: 'asteroids', 'bloque-buster'...
  title       text not null,
  short_desc  text not null,
  long_desc   text not null,
  category    text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text not null,                 -- clase CSS, ej. 'cover-asteroids'
  color       text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order  int  not null unique,
  created_at  timestamptz not null default now()
);
alter table public.games enable row level security;
create policy "games_select_anon" on public.games for select to anon, authenticated using (true);
-- seed: 9 inserts con los textos actuales de lib/data.ts, sort_order 1..9

-- supabase/migrations/<ts>_create_scores.sql
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       int  not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);
alter table public.scores enable row level security;
create policy "scores_select_anon" on public.scores for select to anon, authenticated using (true);
create policy "scores_insert_anon" on public.scores for insert to anon, authenticated with check (true); -- checks en columnas

create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, best_score, achieved_at,
       rank() over (partition by game_id order by best_score desc) as rank
from (
  select distinct on (game_id, player_name)
         game_id, player_name, score as best_score, created_at as achieved_at
  from public.scores
  order by game_id, player_name, score desc, created_at asc
) b;
```

TypeScript:

```ts
// lib/data.ts — tipos (GAMES, seededScores, PLAYERS, SavedScore se eliminan)
export type Game = { id; title; short; long; cat: Category; cover; color }; // sin best/plays
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // se reutiliza
export type GameStats = { best: number; plays: number };

// lib/supabase/public.ts
export function createPublicClient(): SupabaseClient<Database>; // sin cookies, apto para 'use cache'

// lib/games.ts  ('use cache' en cada función)
getGames(): Promise<Game[]>                                  // cacheTag('games'), orden sort_order
getGame(id: string): Promise<Game | null>                   // cacheTag('games')
getGameStats(id: string): Promise<GameStats>                // cacheTag(`scores:${id}`)
getLeaderboard(id: string, limit: number): Promise<ScoreRow[]> // cacheTag(`scores:${id}`)
getHallOfFame(limit: number): Promise<Record<string, ScoreRow[]>> // cacheTag('scores')

// app/games/[id]/play/actions.ts
saveScoreAction(gameId: string, name: string, score: number):
  Promise<{ ok: true } | { ok: false; error: string }>
// updateTag(`scores:${gameId}`) y updateTag('scores')

// app/hall-of-fame/actions.ts
getPlayerBestAction(gameId: string, name: string): Promise<ScoreRow | null>
```

Convenciones: `player_name` se guarda tal cual llega de la sesión (ya en mayúsculas, ≤ 10 chars, ver `components/auth-form.tsx:18`). Fecha `ScoreRow.date` en formato `DD/MM/YYYY`. Empates comparten rango (`rank()`).

## Plan de implementación

Antes de escribir: leer `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`, `04-functions/cacheTag.md`, `04-functions/updateTag.md` y la guía de Server Actions. Consultar vía MCP `search_docs` RLS en vistas (`security_invoker`).

1. Migración `games` (`npm run db:new create_games`): tabla, RLS, seed de 9 juegos copiados de `GAMES`. `npm run db:push` y `npm run db:types`. Verificar: MCP `list_tables` muestra `games` con 9 filas; build pasa (UI aún usa `GAMES`).
2. Migración `scores` + vista `leaderboard`. `db:push`, `db:types`. Verificar: `execute_sql` inserta un score de prueba como `anon`, aparece en `leaderboard` con `rank = 1`, insert con `player_name` de 11 chars falla; borrar la fila de prueba. MCP `get_advisors` sin alertas de seguridad nuevas.
3. `lib/supabase/public.ts` y `lib/games.ts` con las 5 funciones cacheadas. Verificar: `npm run lint` y `npm run build` pasan.
4. Catálogo desde DB: `generateStaticParams`, `generateMetadata` y páginas de `/games/[id]` y `/games/[id]/play` usan `getGames`/`getGame`; `app/page.tsx`, `app/games/page.tsx` pasan `games` a `Home`/`Library`. Añadir `app/error.tsx`. Verificar: home, `/games`, ficha y play idénticos a antes (salvo stats).
5. Ficha: stats con `getGameStats` y top 10 con `getLeaderboard(id, 10)`; estado vacío y "NO SE PUDO CARGAR". Verificar: `/games/asteroids` muestra 0 / 0 y estado vacío.
6. Salón de la Fama: `app/hall-of-fame/page.tsx` pasa `games` y `getHallOfFame(12)` a `HallOfFame`; podio `---` si faltan filas; fila "TU MEJOR MARCA" vía `getPlayerBestAction` cuando hay `user`. Verificar: tabs = 9 juegos de DB, vacío correcto.
7. Guardado: `saveScoreAction` (valida juego existe, nombre 1–10, score entero 0–10M) + cambios en el modal de `components/game-player.tsx` (con/sin sesión, error, reintento). Quitar `saveScore` de `session-provider.tsx`. Verificar: guardar en asteroids actualiza ficha y Salón sin recargar caché manual.
8. Limpieza: borrar `GAMES`, `seededScores`, `PLAYERS`, `SavedScore` de `lib/data.ts`. Verificar: `grep -rn "GAMES\|seededScores\|av_scores" app components lib` vacío; lint y build pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `supabase/migrations/` tiene 2 migraciones versionadas; `npx supabase migration list` las muestra aplicadas en remoto.
- [ ] `games` tiene 9 filas con `asteroids` en `sort_order = 1`; `database.types.ts` incluye `games`, `scores` y `leaderboard`.
- [ ] Home, `/games`, `/games/[id]` y `/games/[id]/play` muestran los mismos 9 juegos, textos y portadas que antes, leídos de Supabase.
- [ ] `/games/<id-inexistente>` devuelve 404.
- [ ] Sin puntajes, `/games/asteroids` muestra Partidas `0`, Mejor global `0` y "SIN PUNTAJES AÚN — SÉ EL PRIMERO"; el Salón muestra podio `---`.
- [ ] Sin sesión, el modal "FIN DEL JUEGO" no tiene botón GUARDAR y muestra "INICIA SESIÓN PARA GUARDAR" con link a `/auth`; no se inserta nada en `scores`.
- [ ] Con sesión `PX_KAI`, GUARDAR inserta 1 fila `{game_id: 'asteroids', player_name: 'PX_KAI', score}` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] Tras guardar, `/games/asteroids` y `/hall-of-fame` (tab ASTEROIDS) muestran el puntaje sin reiniciar el servidor; Partidas sube en 1.
- [ ] Dos partidas del mismo nombre (1000 y 3000) → el leaderboard muestra una sola fila `3000`; Partidas = 2; Mejor global = 3000.
- [ ] Con sesión y puntaje, el Salón muestra "TU MEJOR MARCA" con rango y puntaje reales; con sesión sin puntaje, la fila no aparece.
- [ ] `saveScoreAction` rechaza score negativo, no entero, > 10M, nombre vacío o > 10 chars y `gameId` inexistente, y el modal muestra el error.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` inválida, las páginas de catálogo muestran "VAULT FUERA DE LÍNEA" en vez de crashear.
- [ ] `localStorage["av_scores"]` no se escribe; `grep -rn "GAMES\|seededScores\|PLAYERS\|av_scores" app components lib` vacío.
- [ ] MCP `get_advisors` (security) sin alertas de RLS deshabilitado ni vista `security_definer`.
- [ ] Consola sin errores ni warnings de hidratación en home, `/games`, ficha, play y Salón.

## Decisiones tomadas y descartadas

- **Sí:** catálogo completo desde la tabla `games`. **No:** tabla solo como FK con `GAMES` local; dos fuentes de verdad.
- **Sí:** solo guarda quien tiene sesión mock (`av_user`). **No:** guardar invitados; pedido explícito. **No:** Supabase Auth aquí; va en spec propia y añadirá `user_id`.
- **Sí:** nombre del modal = `user.name`, no editable. **No:** input libre de iniciales; permitiría guardar con cualquier nombre teniendo sesión.
- **Sí:** Server Action con validación + RLS con checks de columna. **No:** insert directo desde el cliente; sin validación de juego ni punto único para invalidar caché.
- **Sí:** leaderboard = mejor marca por nombre (vista `leaderboard`, `rank()`). **No:** todas las partidas; un jugador llenaría la tabla.
- **Sí:** `best`/`plays` calculados de `scores`. **No:** columnas con valores fake; se pierden 28450, "12.4K", etc., todos arrancan en 0.
- **Sí:** eliminar `av_scores`. **No:** escritura paralela ni migración de datos viejos.
- **Sí:** estado vacío. **No:** seed de puntajes demo; serían datos inventados en un ranking real.
- **Sí:** `'use cache'` + `cacheTag` + `updateTag` en la action. **No:** todo dinámico; más lento y pierde `generateStaticParams`.
- **Sí:** cliente sin cookies para lecturas cacheadas. **No:** `lib/supabase/server.ts`; `cookies()` no se permite dentro de `'use cache'`.
- **Sí:** vista `security_invoker`. **No:** vista por defecto (`security_definer`), saltaría RLS.
- **Sí:** error visible si Supabase cae. **No:** fallback a `GAMES` local; duplicaría la fuente de verdad.
- **Sí:** una sola spec para `games` + `scores`. **No:** dividir; `scores` depende de `games` por FK y ambas tocan las mismas pantallas.

## Riesgos identificados

| Riesgo                                                               | Mitigación                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `cookies()` dentro de `'use cache'` rompe el build                   | Lecturas con `createPublicClient()` sin cookies; la action usa `lib/supabase/server.ts`. |
| `generateStaticParams` falla en build si Supabase no responde        | Build requiere env válidas (igual que SPEC 04); documentado.                             |
| Cualquiera puede insertar con la publishable key saltándose la UI    | Aceptado hasta la spec de Auth; checks de rango/longitud en DB y action.                 |
| Vista expone datos saltando RLS                                      | `security_invoker = true`; criterio con `get_advisors`.                                  |
| Leaderboard no se refresca tras guardar                              | `updateTag('scores:<id>')` y `updateTag('scores')`; criterio explícito.                  |
| Seed diverge de los textos actuales                                  | Copiar literalmente de `lib/data.ts`; criterio de UI idéntica.                           |
| Nombres con distinta capitalización cuentan como jugadores distintos | La sesión ya normaliza a mayúsculas (`auth-form.tsx:18`).                                |
| Reglas React 19 del lint al cargar "TU MEJOR MARCA" en cliente       | Llamada en handler/efecto con `startTransition`; correr lint en cada paso.               |

## Qué **no** entra en esta spec

- Supabase Auth, `user_id`, `proxy.ts`.
- Anti-trampa, migración de `av_scores`, panel admin de juegos.
- Paginación, Realtime, rediseño visual, tests automatizados.

Cada uno de estos, si llega, va en su propia spec.
