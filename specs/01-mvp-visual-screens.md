# SPEC 01 — MVP visual: 5 pantallas de Arcade Vault

> **Status:** Implementado
> **Depends on:** ninguna
> **Date:** 2026-10-26
> **Objective:** Portar a Next.js (App Router) las 5 pantallas de `references/templates/` (biblioteca, detalle, reproductor, auth, salón de la fama) con el mismo aspecto y el mismo comportamiento que el template, sin añadir funcionalidad nueva.

## Por qué existe esta spec

`references/templates/` es un prototipo en React UMD + Babel con router por hash. Hay que convertirlo en código Next 16 / React 19 / TypeScript estricto. El valor está en la fidelidad: el diseño ya está decidido, no se rediseña.

`app/globals.css` (tema, clases `.btn`, `.card`, `.crt`, etc.) y `app/layout.tsx` (fuentes `next/font`, `.av-bg`, `.av-noise`) **ya están portados**. No se tocan salvo bug de fidelidad.

## Alcance

**Dentro:**

- 5 pantallas como rutas del App Router (nombres en inglés):
  - `/` → Biblioteca (hero, búsqueda, chips de categoría, grilla con tilt 3D, estado vacío).
  - `/games/[id]` → Detalle (portada, tags, stats, leaderboard top 10).
  - `/games/[id]/play` → Reproductor (HUD, CRT, pausa, fin de juego, modal guardar puntuación).
  - `/auth` → Login / Crear cuenta / Invitado (pestañas, campo correo solo en "Crear cuenta").
  - `/hall-of-fame` → Salón de la Fama (tabs por juego, podio, tabla, fila "TU MEJOR MARCA" si hay sesión).
- Componente `Nav` (logo, links, contador estático `CRÉDITOS · 03`, botón sesión, menú hamburguesa móvil con backdrop) y footer, ambos en el layout raíz.
- Datos mock tipados: `GAMES`, `CATS`, `PLAYERS`, `seededScores`.
- Sesión simulada y puntuaciones guardadas en `localStorage` (`av_user`, `av_scores`), igual que el template.
- Reproductor simulado: puntaje aleatorio por intervalo de 220 ms, igual que el template.
- Responsive tal como lo define `globals.css`.
- Metadata por página (título) en español.

**Fuera de alcance (specs futuras):**

- Juegos reales (Tetris, Snake, etc.). El reproductor sigue siendo una simulación.
- Autenticación real, OAuth (botones Google/GitHub sin efecto), backend, base de datos.
- Leaderboards reales: `av_scores` se escribe pero ninguna pantalla lo lee, como en el template.
- Créditos dinámicos (`CRÉDITOS · 03` es texto fijo).
- Rediseño o cambios de estilo. Tests automatizados (no hay test runner).
- i18n: todo el texto queda en español.

## Modelo de datos

Estructuras que ya existen en `data.jsx`, ahora tipadas en `lib/data.ts`:

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string; // clase CSS, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string; // plays es texto, ej. "12.4K"
};
export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
export type SessionUser = { name: string }; // localStorage "av_user" (JSON | null)
export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
}; // "av_scores" (array JSON)
```

- `CATS = ["TODOS", ...categorías]`; 8 juegos: bloque-buster, caida, serpentina, gloton, invasores, rocas, ranaria, duelo-pixel (contenido copiado literal del template).
- `seededScores(seed, count)` se copia con el mismo algoritmo para que los datos coincidan con el template.
- Sin versionado de claves de `localStorage`: se mantienen `av_user` y `av_scores` tal cual.

## Plan de implementación

Estructura: `lib/` y `components/` en la raíz (alias `@/*`). Páginas como Server Components; `"use client"` solo en componentes con estado/efectos.

1. Crear `lib/data.ts` con tipos, `GAMES`, `CATS`, `PLAYERS`, `seededScores`. Verificar: `npm run build` pasa.
2. Crear `components/session-provider.tsx` (cliente): contexto con `user`, `login(u | null)`, `signOut()`, `saveScore(entry)`; lee `av_user` tras montar (evitar mismatch de hidratación) y envuelve `localStorage` en try/catch.
3. Crear `components/nav.tsx` (cliente: menú móvil, `usePathname` para el link activo, botón sesión) y `components/footer.tsx`. Montarlos con el provider en `app/layout.tsx` dentro de `<main className="av-main">`. Verificar: el nav se ve en `/`.
4. Biblioteca: `components/game-card.tsx` (cliente, tilt) y `components/library.tsx` (cliente, búsqueda + chips). Reemplazar `app/page.tsx` (boilerplate). Click en tarjeta/JUGAR → `/games/[id]`.
5. Detalle: `app/games/[id]/page.tsx` (server; `notFound()` si el id no existe; `generateStaticParams` desde `GAMES`). Botones → `/games/[id]/play` y `/`.
6. Auth: `app/auth/page.tsx` + `components/auth-form.tsx` (cliente). Submit → `login({name})` y redirige a `/`; invitado → `login(null)` y redirige a `/`.
7. Reproductor: `app/games/[id]/play/page.tsx` + `components/game-player.tsx` (cliente: HUD, pausa, fin, modal, guardar). SALIR → `/games/[id]`; VOLVER AL VAULT → `/`.
8. Salón: `app/hall-of-fame/page.tsx` + `components/hall-of-fame.tsx` (cliente: tabs, podio, tabla, fila del usuario).
9. Metadata por página y revisión final de fidelidad contra `references/templates/Arcade Vault.html` en desktop y móvil.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores ni warnings nuevos.
- [ ] `npm run build` termina sin errores.
- [ ] `/` muestra 8 tarjetas; buscar "caí" deja 1; el chip PUZZLE deja 1; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta navega a `/games/<id>` y muestra título, descripción larga, 3 stats y 10 filas de leaderboard.
- [ ] `/games/id-inexistente` muestra la página 404 (con `cacheComponents` el estado HTTP queda en 200 + `noindex`, comportamiento documentado de Next al hacer streaming).
- [ ] "JUGAR AHORA" abre `/games/<id>/play`; el puntaje sube solo; PAUSA lo detiene y muestra "EN PAUSA"; REANUDAR lo retoma.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA_" y añade una entrada en `localStorage.av_scores`; JUGAR DE NUEVO reinicia en 0.
- [ ] En `/auth`, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de auth guarda `av_user` (nombre en mayúsculas, máx. 10 caracteres), redirige a `/` y el nav muestra el nombre; clicarlo cierra sesión y borra `av_user`.
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin sesión.
- [ ] Recargar con sesión iniciada conserva el nombre en el nav, sin warnings de hidratación en consola.
- [ ] `/hall-of-fame` muestra tabs para los 8 juegos, podio 1-2-3 y 12 filas; la fila "TU MEJOR MARCA" aparece solo con sesión.
- [ ] Menú hamburguesa visible en ≤ 840 px, abre/cierra con backdrop y enlaza a Biblioteca, Salón y Cuenta/Iniciar Sesión.
- [ ] El link activo del nav es "Biblioteca" en `/`, `/games/*` y "Salón de la Fama" en `/hall-of-fame`.
- [ ] Footer y `CRÉDITOS · 03` visibles; el resto de pantallas se ve igual que el template al compararlas en navegador (desktop y móvil).
- [ ] Consola del navegador sin errores en las 5 pantallas.

## Decisiones tomadas y descartadas

- **Sí:** rutas del App Router (`/`, `/games/[id]`, `/games/[id]/play`, `/auth`, `/hall-of-fame`). URLs reales, `<Link>` y prefetch. **No:** replicar el router por hash del template (va contra Next).
- **Sí:** URLs en inglés. **No:** URLs en español; el usuario prefirió inglés aunque el UI esté en español.
- **Sí:** mantener sesión falsa + `localStorage` como el template. **No:** estado solo en memoria ni auth real; lo primero cambia el comportamiento, lo segundo es otra spec.
- **Sí:** `lib/` y `components/` en la raíz. **No:** `_components` dentro de `app/`.
- **Sí:** CSS global ya portado en `globals.css`. **No:** reescribir a utilidades Tailwind (riesgo de divergir del diseño).
- **Sí:** fuentes vía `next/font` (ya hecho en `layout.tsx`). **No:** Geist.
- **Sí:** footer, fondo, créditos estáticos y reproductor simulado, idénticos al template.
- **Sí:** verificación con lint + build + revisión manual en navegador. **No:** tests automatizados (no hay runner; añadirlo es otra spec).
- **Sí:** `/frontend-design` guía cualquier ajuste visual, según `CLAUDE.md`, pero el diseño del template manda.

## Riesgos identificados

| Riesgo                                                         | Mitigación                                                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents` cambia la semántica de render dinámico/caché | Leer `node_modules/next/dist/docs/` antes de escribir páginas; datos mock estáticos, sin `fetch` ni request APIs en servidor. |
| Mismatch de hidratación al leer `localStorage`                 | Leer `av_user` en `useEffect` tras montar; el primer render es "sin sesión".                                                  |
| `localStorage` bloqueado o JSON corrupto                       | try/catch en lectura y escritura, como el template.                                                                           |
| `Math.random` en el reproductor rompe SSR/hidratación          | Solo se usa dentro de efectos en el cliente, nunca en el render inicial.                                                      |
| Next 16 / React 19.3 difieren de lo que conozco                | Consultar la documentación local antes de usar APIs de routing, `params` (asíncronos) o metadata.                             |
| Divergencia visual respecto al template                        | Comparar lado a lado con `Arcade Vault.html` abierto en el navegador al final del plan.                                       |

## Qué **no** entra en esta spec

- Juegos jugables reales.
- Auth real / OAuth / backend / base de datos.
- Leaderboards y salón alimentados por datos reales (`av_scores`).
- Créditos dinámicos.
- Rediseño visual o cambios de copy.
- Tests automatizados.
- i18n.

Cada uno de estos, si llega, va en su propia spec.
