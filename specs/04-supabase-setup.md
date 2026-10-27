# SPEC 04 — Infraestructura de Supabase en Next.js

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-10-27
> **Objective:** Conectar la app Next.js al proyecto Supabase `kzdcinpkwxgofgqbqyqf` con clientes server/browser tipados, variables de entorno y Supabase CLI enlazado, sin tablas ni cambios de UI.

## Por qué existe esta spec

Auth (`av_user`) y puntajes (`av_scores`) viven en localStorage (`components/session-provider.tsx`). Moverlos a Supabase requiere primero una base común: dependencias, clientes, env, CLI y tipos. Esta spec solo deja esa base lista y verificada; Auth y scores llegan en specs propias.

## Alcance

**Dentro:**

- Dependencias: `@supabase/supabase-js`, `@supabase/ssr`; devDependency `supabase` (CLI, vía `npx supabase`).
- `lib/supabase/server.ts`: `createClient()` async para Server Components / Server Actions / Route Handlers, con `createServerClient` + `cookies()` de `next/headers`.
- `lib/supabase/client.ts`: `createClient()` para Client Components con `createBrowserClient`.
- `lib/supabase/database.types.ts` generado con `supabase gen types typescript --linked`; ambos clientes tipados con `<Database>`.
- Scripts npm: `db:types` (regenera tipos), `db:push` (`supabase db push`), `db:new` (`supabase migration new`).
- `supabase init` → carpeta `supabase/` (`config.toml`, `migrations/` vacía) versionada; `supabase link --project-ref kzdcinpkwxgofgqbqyqf`.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` y `.env.example` (solo nombres). `SUPABASE_DB_PASSWORD` (ya en `.env`) documentada en `.env.example` para el CLI.
- Health check temporal para verificar conexión; se borra al final.

**Fuera de alcance (specs futuras):**

- Tablas, RLS, migraciones con contenido.
- Supabase Auth, reemplazo de `av_user`, `proxy.ts` de refresh de sesión.
- Puntajes en DB, reemplazo de `av_scores`, hall of fame real.
- Secret/service_role key, Edge Functions, Storage, Realtime.
- Stack local con Docker (`supabase start`).
- Cambios de UI, tests automatizados.

## Modelo de datos

Sin tablas. Estructuras nuevas:

```ts
// lib/supabase/database.types.ts — generado, no editar a mano
export type Database = { public: { Tables: {}; Views: {}; Functions: {}; ... } };

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;
```

Entorno:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Solo para Supabase CLI (db push / link), nunca en la app
SUPABASE_DB_PASSWORD=
```

## Plan de implementación

Antes de escribir: leer `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` y la doc de `cookies()` / `cacheComponents` (uso de request APIs dentro de `<Suspense>`). Consultar la guía `@supabase/ssr` para Next.js vía MCP `search_docs`.

1. Instalar `@supabase/supabase-js`, `@supabase/ssr` y `-D supabase`. Verificar: `npm run build` pasa.
2. `npx supabase init` y `npx supabase link --project-ref kzdcinpkwxgofgqbqyqf` (usa `SUPABASE_DB_PASSWORD`). Añadir a `.gitignore` lo que el CLI marque como local (`supabase/.temp`, `.branches`). Verificar: `npx supabase migration list` responde sin error.
3. Env: obtener URL y publishable key (MCP `get_project_url` / `get_publishable_keys`), escribirlas en `.env.local`; actualizar `.env.example`. Verificar: `.env.local` sigue ignorado (`git check-ignore .env.local`).
4. Scripts npm `db:types`, `db:push`, `db:new`; ejecutar `npm run db:types` → `lib/supabase/database.types.ts`. Verificar: archivo existe y compila.
5. Crear `lib/supabase/server.ts` y `lib/supabase/client.ts` tipados con `Database`. Las env se leen dentro de la función, no a nivel de módulo. Verificar: `npm run lint` y `npm run build` pasan.
6. Health check temporal: `app/supabase-check/page.tsx` (Server Component dinámico dentro de `<Suspense>`) que hace `select` a una tabla inexistente con el cliente server y muestra el código de error. Esperado `PGRST205` (tabla no encontrada = URL y key válidas); `401 / Invalid API key` = mal configurado. Verificar en navegador. Luego borrar la carpeta.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js`, `@supabase/ssr` en dependencies y `supabase` en devDependencies.
- [ ] Existen `supabase/config.toml` y `supabase/migrations/` en git; `npx supabase migration list` funciona contra el remoto.
- [ ] `npm run db:types` regenera `lib/supabase/database.types.ts` sin error.
- [ ] `lib/supabase/server.ts` y `lib/supabase/client.ts` exportan `createClient` tipado con `Database`.
- [ ] El health check devolvió `PGRST205` (no `401`) con las env reales, y la ruta `/supabase-check` ya no existe al cerrar la spec (404).
- [ ] `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD` sin valores.
- [ ] `SUPABASE_DB_PASSWORD` no aparece en `.next/static` ni en archivos versionados (`git ls-files | xargs grep -l SUPABASE_DB_PASSWORD=.` solo `.env.example` vacío).
- [ ] No hay `proxy.ts`/`middleware.ts`, ni tablas en el proyecto (`list_tables` vacío), ni cambios visibles en la UI.

## Decisiones tomadas y descartadas

- **Sí:** solo infraestructura. **No:** incluir auth o scores; tocaría 4+ áreas. Van en specs propias.
- **Sí:** Supabase CLI con migraciones versionadas en `supabase/`. **No:** MCP `apply_migration` o dashboard; no reproducible.
- **Sí:** CLI como devDependency (`npx supabase`). **No:** Homebrew global; versión no fijada en el repo.
- **Sí:** solo `supabase link` al remoto. **No:** `supabase start` con Docker; overhead sin tablas todavía.
- **Sí:** publishable key (`sb_publishable_…`). **No:** anon key legacy; **No:** secret key, no hay operaciones admin.
- **Sí:** diferir `proxy.ts` a la spec de Auth. **No:** incluirlo ya; sin sesión no aporta y añade latencia por request.
- **Sí:** tipos generados desde ahora. **No:** esperar a tener tablas; los clientes nacen tipados.
- **Sí:** health check temporal que se borra. **No:** `/api/health` permanente; endpoint público sin uso.

## Riesgos identificados

| Riesgo                                                                | Mitigación                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `cookies()` con `cacheComponents` exige `<Suspense>` o falla el build | Leer docs de Next 16; health check dentro de `<Suspense>`.                                  |
| `next build` falla si faltan env                                      | Leer env dentro de `createClient()`, no a nivel de módulo.                                  |
| `SUPABASE_DB_PASSWORD` filtrada                                       | Sin prefijo `NEXT_PUBLIC_`, solo la usa el CLI; `.env*` ignorado; criterio con `grep`.      |
| `supabase link` sube archivos locales a git (`.temp`)                 | Revisar `git status` tras `init`/`link` y ampliar `.gitignore`.                             |
| API de `@supabase/ssr` cambió (`getAll`/`setAll` cookies)             | Consultar docs vía MCP `search_docs` antes de escribir.                                     |
| Hay dos `.env` (`.env` y `.env.local`)                                | Documentar: `.env.local` para la app; el CLI lee `SUPABASE_DB_PASSWORD` del entorno/`.env`. |

## Qué **no** entra en esta spec

- Tablas, RLS, auth, `proxy.ts`, puntajes en DB.
- Secret key, Edge Functions, Storage, Realtime, Docker local.
- Cambios de UI, tests automatizados.

Cada uno de estos, si llega, va en su propia spec.
