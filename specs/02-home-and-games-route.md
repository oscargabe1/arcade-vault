# SPEC 02 — Home en `/` y galería movida a `/games`

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-26
> **Objective:** Convertir `/` en la landing del template `references/templates/home-about/` (sin la página ni el botón "Acerca de") y mover la galería de juegos de `/` a `/games`.

## Por qué existe esta spec

La SPEC 01 dejó la biblioteca en `/`. El template `home-about/` añade una landing (hero, features, preview de juegos, stats, actividad, precios, CTA final) que debe ser la puerta de entrada, y la galería pasa a su propia URL. "Acerca de" se pospone: ni ruta ni link.

## Alcance

**Dentro:**

- `/` → Home (landing) portada de `home.jsx`: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA" (primeros 6 de `GAMES`), stats, "ACTIVIDAD EN VIVO" (últimas puntuaciones + top jugadores), precios + FAQ, CTA final.
- `/games` → Galería (el componente `Library` actual, sin cambios de comportamiento).
- Contenido del home como copia literal estática del template (textos, nombres, puntajes y stats hardcodeados).
- Efecto "reveal" al hacer scroll (`IntersectionObserver`, clase `.in`), igual que `useReveal` del template.
- Estilos del home portados a `app/globals.css` desde `references/templates/home-about/styles.css`: bloque `HOME PAGE` (líneas ~930–1070), `ACTIVITY` (~1621–1670) y `PRICING` (~1672–1730), más cualquier utilidad que usen (p. ej. `.fade-in`, `.blink`, `.pulse`, `.btn.xl`) si aún no existe.
- Nav (desktop y panel móvil): links **Inicio** (`/`) · **Biblioteca** (`/games`) · **Salón de la Fama**. Logo → `/`.
- Enlaces que hoy apuntan a `/` y pasan a `/games`: volver del detalle, `VOLVER AL VAULT` del reproductor, botón en hall of fame, redirect tras login/invitado en `/auth`.
- Metadata de `/games` ("Biblioteca · Arcade Vault"); `/` conserva el título actual.

**Fuera de alcance (specs futuras):**

- Página `/about`, `about.jsx`, estilos `.about*` y el link/botón "Acerca de" (en nav, panel móvil o home).
- Gamepad (`GAMEPAD`, themes, score floaters) y todo el CSS del template que no use el home.
- Datos dinámicos: stats, actividad en vivo y top jugadores son texto fijo; nada se lee de `av_scores` ni de `lib/data.ts` salvo los 6 juegos del preview.
- Redirects de `/` a `/games` ni compatibilidad con URLs viejas (aún no hay usuarios).
- Rediseño, cambios de copy, i18n, tests automatizados.

## Modelo de datos

Esta feature no introduce estructuras nuevas. Reutiliza `GAMES` y `Game` de `lib/data.ts` (SPEC 01). Los arrays de features, stats, actividad, top y FAQ viven como constantes locales en el componente del home (datos mock tipados inline, copiados del template).

## Plan de implementación

1. Mover la galería: crear `app/games/page.tsx` (Server Component, metadata "Biblioteca · Arcade Vault", renderiza `<Library />`). Verificar: `/games` muestra la galería; `/` aún funciona.
2. Actualizar enlaces a `/games`: `app/games/[id]/page.tsx:69`, `components/game-player.tsx:136`, `components/hall-of-fame.tsx:100`, `components/auth-form.tsx:19` y `:69`. Verificar: ningún flujo de la SPEC 01 aterriza en `/` salvo el logo.
3. Actualizar `components/nav.tsx`: añadir link "Inicio" (activo solo en `/`), "Biblioteca" → `/games` (activo en `/games*`), en desktop y panel móvil. Verificar: el link activo es correcto en `/`, `/games`, `/games/[id]`, `/hall-of-fame`.
4. Portar CSS del home a `app/globals.css` (bloques indicados arriba, sin `.about*` ni gamepad). Verificar: `npm run build` pasa y no cambia el aspecto de las pantallas existentes.
5. Crear `components/home/` o archivo único `components/home.tsx` (cliente por el reveal): `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` y secciones. Usar `<Link>` en lugar de `navigate`: EXPLORAR JUEGOS / VER TODOS LOS JUEGOS / INSERTAR MONEDA → `/games`; CREAR CUENTA / EMPEZAR GRATIS → `/auth`; mini-card → `/games/[id]`; VER SALÓN → `/hall-of-fame`. Sin ningún elemento de "Acerca de".
6. Reemplazar `app/page.tsx` para renderizar el home. Metadata se mantiene. Verificar con `/run`/navegador en desktop y móvil contra `references/templates/home-about/arcade-vault-standalone.html`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra hero con título "EL ARCADE CLÁSICO ESTÁ DE VUELTA", 2 CTAs, y las 6 secciones del template (por qué, juegos, stats, actividad, precios, CTA final).
- [ ] `/games` muestra las 8 tarjetas, búsqueda y chips funcionando como en la SPEC 01.
- [ ] La sección "JUEGOS DISPONIBLES AHORA" muestra exactamente 6 mini-cards; clic en una navega a `/games/<id>`.
- [ ] EXPLORAR JUEGOS, VER TODOS LOS JUEGOS e INSERTAR MONEDA navegan a `/games`.
- [ ] CREAR CUENTA y EMPEZAR GRATIS navegan a `/auth`; VER SALÓN → navega a `/hall-of-fame`.
- [ ] Las secciones aparecen con animación al hacer scroll (clase `.in` añadida al entrar en viewport).
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" (desktop y menú móvil); no existe el texto "Acerca de" en ningún lugar de la UI.
- [ ] No existe la ruta `/about` (404) ni archivos `about` en `app/` o `components/`.
- [ ] Link activo: "Inicio" en `/`; "Biblioteca" en `/games` y `/games/<id>`; "Salón de la Fama" en `/hall-of-fame`.
- [ ] Volver del detalle, `VOLVER AL VAULT`, el botón de hall of fame, y el envío de `/auth` (cuenta e invitado) llevan a `/games`.
- [ ] `grep -n "about" app/globals.css` no devuelve reglas `.about*`.
- [ ] El home se ve igual que el template en desktop y en ≤ 840 px, sin scroll horizontal.
- [ ] Consola del navegador sin errores ni warnings de hidratación en `/` y `/games`.

## Decisiones tomadas y descartadas

- **Sí:** `/` = landing, `/games` = galería. **No:** mantener la galería en `/` con la landing en otra ruta; lo pidió el usuario.
- **Sí:** nav "Inicio + Biblioteca + Salón" como el template. **No:** solo Biblioteca; dejaba el home inalcanzable salvo por el logo.
- **Sí:** todo lo que volvía a `/` ahora vuelve a `/games` (incluido login/invitado). **No:** aterrizar en `/` tras auth; el usuario viene a jugar.
- **Sí:** contenido del home copiado literal y estático. **No:** derivar stats/top de `lib/data.ts`; añade lógica y se desvía del template.
- **Sí:** portar solo el CSS del home a `globals.css`. **No:** archivo CSS aparte (rompe la convención de CSS único) ni copiar el template completo (arrastra `.about*` y gamepad fuera de alcance).
- **Sí:** diferir "Acerca de" por completo (ruta, link, estilos). **No:** dejar el link deshabilitado u oculto; el usuario pidió no ponerlo.
- **Sí:** `/frontend-design` guía cualquier ajuste visual, pero el template manda.
- **No:** redirect `/` → `/games` ni alias; no hay URLs externas que preservar.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `IntersectionObserver` y `.reveal { opacity: 0 }` dejan secciones invisibles si el efecto falla o no hay JS | Aplicar el efecto solo en cliente tras montar; secciones visibles en el primer render del hero (no usa `.reveal`). |
| Clases CSS del home chocan con las existentes en `globals.css` | Comparar nombres antes de pegar; si hay colisión, mantener la definición de la SPEC 01 y registrar la diferencia. |
| `toLocaleString("es-ES")` difiere entre servidor y cliente (hidratación) | Formatear con locale explícito fijo `es-ES` (ya lo hace el template) o precalcular el string. |
| Referencias rotas a `/` tras mover la galería | El paso 2 lista cada archivo; criterio de aceptación sobre los redirects. |
| `cacheComponents` / Next 16 | Leer `node_modules/next/dist/docs/` antes de escribir; página estática sin request APIs. |

## Qué **no** entra en esta spec

- Página "Acerca de" y su botón/link.
- Gamepad y estilos no usados por el home.
- Datos dinámicos o reales en el home.
- Redirects/compatibilidad de URLs viejas.
- Rediseño, i18n, tests automatizados.

Cada uno de estos, si llega, va en su propia spec.
