# SPEC 03 — Página `/about` con formulario de contacto vía Resend

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-26
> **Objective:** Añadir la ruta `/about` portada de `references/templates/home-about/about.jsx` (misión + formulario de contacto) y enviar el formulario por correo al equipo con Resend mediante una Server Action.

## Por qué existe esta spec

La SPEC 02 difirió "Acerca de" (ruta, link, estilos). El template trae la página con un formulario que solo simula el envío. Aquí se hace real: el mensaje llega por correo. Es la primera feature con backend y secretos del proyecto, por eso se fija el mecanismo (Server Action), el remitente y las protecciones antes de escribir código.

## Alcance

**Dentro:**

- `/about` → página portada de `about.jsx`: hero "ACERCA DE ARCADE VAULT" (misión + 3 highlights con `HighlightIcon`), divisor de píxeles y sección CONTÁCTANOS (intro, 3 tips, formulario).
- Efecto "reveal" al scroll en el divisor y la sección de contacto (clase `.in`, `IntersectionObserver`), igual que el home.
- Formulario con campos `name`, `email`, `msg`, botón `▶  ENVIAR MENSAJE`, animación `shake` cuando faltan campos y terminal de éxito `VAULT-OS // TERMINAL` con `ENVIAR OTRO MENSAJE`.
- Server Action `sendContactMessage` en `app/about/actions.ts` que revalida en servidor y envía con el SDK `resend`.
- Correo de texto plano al equipo: `from` `Arcade Vault <onboarding@resend.dev>`, `to` = `CONTACT_TO_EMAIL`, `replyTo` = correo del visitante, subject `[Arcade Vault] Mensaje de {nombre}`.
- Protecciones: validación servidor (campos requeridos, formato de correo, límites de longitud) y honeypot oculto.
- Estado de error: si la validación servidor o Resend fallan, el formulario muestra un mensaje de error en estilo terminal sin perder lo escrito.
- Variables de entorno `RESEND_API_KEY` y `CONTACT_TO_EMAIL` en `.env.local` (ya ignorado por `.gitignore`) y archivo `.env.example` con nombres sin valores.
- Link "Acerca de" en nav desktop, panel móvil y footer. Activo en `/about`.
- CSS portado a `app/globals.css` desde `references/templates/home-about/styles.css`: bloque `ABOUT PAGE` (líneas 1071–1150) más `@keyframes pxblink` y cualquier utilidad que use y aún no exista (`.caret`, `.press`, `.field textarea`).
- Metadata de `/about` ("Acerca de · Arcade Vault").

**Fuera de alcance (specs futuras):**

- Correo de confirmación/auto-respuesta al visitante (requiere dominio verificado en Resend).
- Dominio propio verificado en Resend. Con `onboarding@resend.dev` Resend solo entrega a la cuenta dueña de la API key.
- Plantilla HTML / `react-email`.
- Rate limit por IP, CAPTCHA, persistencia de mensajes en base de datos.
- Botón o CTA "Acerca de" en el home.
- Gamepad y CSS del template no usado por esta página.
- Rediseño, cambios de copy, i18n, tests automatizados.

## Modelo de datos

Sin persistencia. Estructuras nuevas, locales a `app/about/`:

```ts
// app/about/actions.ts
export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

// FormData esperado: name, email, msg, website (honeypot, debe llegar vacío)
```

Límites de validación: `name` ≤ 60, `email` ≤ 120 con formato válido, `msg` ≤ 2000 caracteres, todos tras `trim()` y no vacíos.

Entorno (`.env.local`, `.env.example` solo con nombres):

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=
```

Dependencia nueva: `resend` (`npm i resend`).

## Plan de implementación

Antes de escribir: leer `node_modules/next/dist/docs/01-app/02-guides/forms.md` y `environment-variables.md` (Next 16 + `cacheComponents`).

1. Portar el CSS: pegar el bloque `ABOUT PAGE` y los `@keyframes` faltantes en `app/globals.css`. Comparar nombres antes (`.field input` ya existe). Verificar: `npm run build` pasa y las pantallas existentes no cambian.
2. Instalar `resend`, crear `.env.example` y `.env.local` (valores los pone el usuario). Verificar: `npm run build` pasa sin la key (el cliente de Resend se instancia dentro de la acción, no a nivel de módulo).
3. Crear `app/about/actions.ts` (`"use server"`): `sendContactMessage(prev, formData)` → valida, ignora silenciosamente si `website` viene lleno (devuelve `success`), envía con Resend, devuelve `ContactState`. Verificar: llamada manual desde el formulario del paso 4.
4. Crear `components/contact-form.tsx` (cliente, `useActionState`): campos, honeypot oculto (`name="website"`, `tabIndex={-1}`, `autoComplete="off"`, fuera de pantalla), shake ante validación cliente, estado `pending` en el botón, terminal de éxito y terminal de error. Verificar: render en `/about` (paso 5).
5. Crear `components/about.tsx` (cliente por el reveal; `HighlightIcon` y secciones) y `app/about/page.tsx` (Server Component, metadata, renderiza `<About />` con `<ContactForm />`). Verificar: `/about` se ve igual que el template y el envío real llega al correo.
6. Añadir link "Acerca de" en `components/nav.tsx` (desktop y panel móvil, `isActive("about")` → `pathname === "/about"`) y en `components/footer.tsx`. Verificar: link activo correcto en `/about` y en las demás rutas.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores (sin `RESEND_API_KEY` definida en build).
- [ ] `/about` muestra título "ACERCA DE ARCADE VAULT", 3 highlights, divisor y sección "CONTÁCTANOS" con 3 tips.
- [ ] Las secciones del divisor y contacto reciben la clase `.in` al entrar en viewport.
- [ ] Enviar con algún campo vacío no llama a la acción, aplica `shake` y no muestra la terminal de éxito.
- [ ] Enviar datos válidos con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` reales muestra la terminal con "MENSAJE RECIBIDO… GRACIAS, {NOMBRE}." y llega un correo a `CONTACT_TO_EMAIL`.
- [ ] El correo recibido tiene subject `[Arcade Vault] Mensaje de {nombre}`, cuerpo con nombre, correo y mensaje, y responder lo dirige al correo del visitante.
- [ ] Un correo con formato inválido o un campo que excede el límite devuelve estado `error` desde el servidor (verificable sin JS cliente) y el formulario conserva lo escrito.
- [ ] Con `RESEND_API_KEY` inválida, el formulario muestra el mensaje de error en terminal y no el de éxito.
- [ ] Un envío con el campo `website` lleno muestra éxito pero no genera ningún correo.
- [ ] `ENVIAR OTRO MENSAJE` vuelve al formulario vacío.
- [ ] El botón queda deshabilitado mientras la acción está pendiente (sin envíos dobles).
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente (`grep -r "RESEND_API_KEY" .next/static` sin resultados) ni en el repo (`git ls-files | xargs grep -l re_` vacío).
- [ ] El nav (desktop y móvil) y el footer muestran "Acerca de"; el link activo es "Acerca de" solo en `/about`.
- [ ] `/about` se ve igual que el template en desktop y en ≤ 840 px, sin scroll horizontal.
- [ ] Consola del navegador sin errores ni warnings de hidratación en `/about`.

## Decisiones tomadas y descartadas

- **Sí:** Server Action. **No:** Route Handler `/api/contact`; añade endpoint público y fetch manual sin beneficio ahora.
- **Sí:** `onboarding@resend.dev` → correo del dueño de la cuenta. **No:** dominio propio; requiere DNS y el usuario no lo tiene decidido. Migrar es cambiar `from` y env.
- **Sí:** solo correo al equipo, `replyTo` al visitante. **No:** auto-respuesta; Resend con `onboarding@resend.dev` no entrega a terceros.
- **Sí:** texto plano. **No:** `react-email`/HTML; dependencia y archivos extra sin necesidad.
- **Sí:** validación servidor + honeypot + estado de error. **No:** rate limit; en memoria no funciona en serverless y un store es otra spec.
- **Sí:** honeypot responde éxito falso. **No:** error explícito; no da señal al bot.
- **Sí:** cliente de Resend instanciado dentro de la acción. **No:** a nivel de módulo; rompería `next build` sin la variable.
- **Sí:** link en nav (desktop + móvil) y footer. **No:** CTA en el home; el template no lo trae. Esto revierte la exclusión de "Acerca de" de la SPEC 02, que se difería a esta spec.
- **Sí:** CSS del About portado a `globals.css`. **No:** archivo CSS aparte ni copiar el gamepad.
- **Sí:** `/frontend-design` guía cualquier ajuste visual, pero el template manda.
- **Sí:** URL en inglés (`/about`), UI en español, igual que SPEC 01.

## Riesgos identificados

| Riesgo | Mitigación |
| ------ | ---------- |
| `onboarding@resend.dev` solo envía al correo de la cuenta Resend | `CONTACT_TO_EMAIL` debe ser ese correo; documentarlo en `.env.example`. |
| API key filtrada al cliente o al repo | Solo se lee en la Server Action; `.env*` ya está en `.gitignore`; criterio de aceptación con `grep`. |
| `next build` falla si falta la variable | Leer `process.env` y crear `new Resend()` dentro de la acción; error controlado si falta. |
| Spam por bots | Honeypot + límites de longitud. Rate limit queda fuera y se acepta el riesgo en esta etapa. |
| Clases del About chocan con `globals.css` (`.field`, `.shake`) | Comparar antes de pegar; si hay colisión, conservar la definición de SPEC 01 y registrar la diferencia. |
| `.reveal { opacity: 0 }` deja secciones invisibles si falla el efecto | Mismo patrón que SPEC 02: observer solo en cliente tras montar. |
| Next 16 / `cacheComponents` / `useActionState` difieren de lo que conozco | Leer `node_modules/next/dist/docs/` antes de escribir. |

## Qué **no** entra en esta spec

- Correo de confirmación al visitante.
- Dominio verificado en Resend.
- Plantillas HTML o `react-email`.
- Rate limit, CAPTCHA, guardado de mensajes.
- CTA "Acerca de" en el home.
- Rediseño, i18n, tests automatizados.

Cada uno de estos, si llega, va en su propia spec.
