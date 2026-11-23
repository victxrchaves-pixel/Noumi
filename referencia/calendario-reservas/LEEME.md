# Calendario de reservas propio con Google Calendar

Una página tipo Calendly (`/reservar`) en tu propia web:

- El cliente elige **30 min o 1 hora**, un día y una hora libre.
- Deja **nombre, email, teléfono** (validado por país) y una descripción de su negocio.
- La cita se crea **directamente en tu Google Calendar** con enlace de **Google Meet**, y Google le envía la invitación por email.

Sin Calendly, sin suscripciones y sin intermediarios. La API de Google Calendar es gratuita.

## Cómo funciona

```
Navegador (/reservar)
   │  GET  /api/booking/slots?duration=30   → huecos libres
   │  POST /api/booking                     → crea la cita
   ▼
Servidor de tu web (Next.js en Vercel)
   │  aplica tus reglas: horario, margen entre citas, antelación…
   │  pregunta a Google qué horas tienes ocupadas (freeBusy)
   │  crea el evento con Meet + invitación (events.insert)
   ▼
Google Calendar (tu cuenta)
```

Las credenciales de Google viven solo en el servidor, como variables de entorno. Nunca llegan al navegador.

> Lo probamos también con Google Apps Script como intermediario y no compensa: tarda entre 2 y 30 segundos por consulta y a veces falla. La conexión directa responde en menos de medio segundo.

---

## 1. Requisitos

- Una web en **Next.js con App Router**, con **Tailwind** y **shadcn/ui**. Si no usas shadcn, el único componente que hace falta es el botón (`components/ui/button.tsx`, incluido).
- Desplegada en **Vercel** o en cualquier hosting que ejecute Node.
- Una cuenta de Google con el calendario donde quieres recibir las citas.

## 2. Copiar los archivos

Copia las carpetas `app`, `components`, `lib` y `scripts` en la raíz de tu proyecto:

| Archivo | Para qué sirve |
|---|---|
| `app/reservar/page.tsx` | La página `/reservar` |
| `components/booking/booking-widget.tsx` | El calendario, los horarios y el formulario |
| `app/api/booking/slots/route.ts` | Devuelve los huecos libres |
| `app/api/booking/route.ts` | Valida los datos y crea la cita |
| `lib/booking.ts` | **Reglas de horario** y conexión con Google Calendar |
| `lib/phone.ts` | Validación del teléfono por país |
| `lib/tracking.ts` | Evento de conversión `lead_created` (GA4, Meta, OpenAI) |
| `lib/utils.ts`, `components/ui/button.tsx` | Utilidades de shadcn (no los copies si ya los tienes) |
| `scripts/google-auth.mjs` | Conecta tu Google Calendar, se ejecuta una sola vez |

Instala las dependencias:

```bash
npm install libphonenumber-js lucide-react clsx tailwind-merge class-variance-authority radix-ui
```

## 3. Personalizar

| Dónde | Qué cambiar |
|---|---|
| `components/booking/booking-widget.tsx` | `src="/foto.jpg"` (pon tu foto en `/public`) y `Tu Nombre` |
| `app/reservar/page.tsx` | Título de la página, logo (`/logo.png`) y `Tu marca` |
| `lib/booking.ts` → `RULES` | Título del evento, zona horaria y **reglas de horario** (punto 4) |
| `lib/booking.ts` → `description` | `Reservado desde tuweb.com` |
| `lib/booking.ts` → `BOOKING_DURATIONS` | Las duraciones que se pueden elegir (por defecto 30 y 60 min) |

Los botones de tu web que antes abrían Calendly tienen que apuntar ahora a `/reservar`.

## 4. Reglas de horario

Todo está en `RULES`, en `lib/booking.ts`:

```ts
const RULES = {
  calendarId: "primary",        // tu calendario principal
  timeZone: "Europe/Madrid",
  title: "Llamada de descubrimiento",
  buffer: 15,                   // minutos libres antes y después de cada cita
  minNoticeHours: 4,            // antelación mínima para reservar
  maxDaysAhead: 14,             // hasta cuántos días vista
  hours: {                      // 1 = lunes … 7 = domingo; sin entrada = cerrado
    1: [["09:30", "13:00"], ["14:30", "18:00"]],
    // …
    5: [["10:00", "13:00"], ["14:30", "16:00"]],
  },
};
```

- Las citas empiezan al inicio de cada franja y se encadenan cada *duración + margen*. Con 30 min y 15 de margen salen huecos a las 9:30, 10:15, 11:00…
- Cualquier evento que tengas en el calendario marcado como **Ocupado** bloquea los huecos que se solapan con él. Para cerrar un festivo, crea un evento de día completo marcado como "Ocupado".

## 5. Configurar Google Cloud (unos 15 minutos, una sola vez)

Hazlo todo con **la cuenta del calendario**.

1. **Crea el proyecto.** Entra en [console.cloud.google.com](https://console.cloud.google.com) → selector de proyectos (arriba a la izquierda) → **Proyecto nuevo** → `Reservas web` → **Crear**. Después selecciónalo.
2. **Activa la API.** Busca "Google Calendar API" en la barra superior → **Habilitar**. No hace falta activar la facturación.
3. **Configura la pantalla de permisos.** Busca **Google Auth Platform** → **Comenzar**:
   - Nombre de la app: `Reservas web`. Correo de asistencia: el tuyo.
   - **Audiencia:**
     - Con **Google Workspace** (correo de empresa): elige **Interno**. No hay que hacer nada más.
     - Con una **@gmail.com**: elige **Externo**. Después, en **Público** → **Publicar aplicación**, déjala en estado **"En producción"**. ⚠️ Si se queda en "Prueba", la conexión caduca cada 7 días y las reservas dejan de funcionar sin avisar.
   - Contacto: tu correo → acepta → **Crear**.
4. **Crea las credenciales.** En el menú de Google Auth Platform → **Clientes** → **Crear cliente**:
   - Tipo: **Aplicación de escritorio**. Nombre: `Web` → **Crear**.
   - Copia el **ID de cliente** y el **Secreto del cliente**.

## 6. Conectar tu calendario

1. Copia `.env.example` como `.env.local` en la raíz del proyecto y rellena las dos primeras líneas, sin espacios ni comillas:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   GOOGLE_REFRESH_TOKEN=
   ```
2. Ejecuta, desde la raíz del proyecto:
   ```bash
   node scripts/google-auth.mjs
   ```
3. Se abre el navegador:
   - Elige la cuenta del calendario.
   - Si sale "Google no ha verificado esta aplicación": **Configuración avanzada → Ir a …**. Es normal, porque la app es tuya.
   - **Marca todas las casillas** de permisos del calendario → **Continuar**.
4. En la terminal debe aparecer `✓ Calendario conectado: tu@correo` y el token se guarda solo en `.env.local`.

`.env.local` contiene credenciales: comprueba que está en tu `.gitignore` y no lo subas nunca al repositorio.

## 7. Probar en local

```bash
npm run dev
```

Abre `http://localhost:3000/reservar`:

- Los horarios deben cargar en menos de un segundo y coincidir con tu disponibilidad real.
- Haz una reserva poniendo como cliente otro correo tuyo. Comprueba que el evento aparece en tu calendario con Meet y los datos, y que llega la invitación. Después borra el evento.

## 8. Publicar en Vercel

En tu proyecto de Vercel → **Settings → Environment Variables**, añade las tres variables con los mismos valores que en `.env.local`, marcadas para **Production** y **Preview**:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

Truco: puedes pegar las tres líneas de golpe en el campo "Key" y Vercel las separa solas. Los cambios se aplican en el siguiente despliegue.

## 9. Medición (opcional)

Al confirmar una reserva, `lib/tracking.ts` envía:

- `lead_created` al `dataLayer` (GTM/GA4)
- `Lead` a Meta (`fbq`)
- `lead_created` a OpenAI Ads (`oaiq`)

Todos llevan el id del evento de Google como `event_id`, para deduplicar si más adelante envías conversiones desde el servidor. Si no usas alguna de estas plataformas, no pasa nada: se ignora sola.

`trackLeadCreated` también muestra un aviso abajo, "Conversión enviada: lead_created", para comprobar que se dispara. Bórralo de `lib/tracking.ts` si no lo quieres.

## 10. Seguridad incluida

- **Validación en el servidor** de todos los campos. El teléfono se valida con `libphonenumber-js`: longitud y numeración real de cada país (sin prefijo se asume España) y rechazo de números de relleno como `600000000`.
- **Comprobación del hueco justo antes de crear la cita**, para evitar que dos personas reserven la misma hora.
- **Campo oculto anti-bots** en el formulario.

## Problemas frecuentes

| Síntoma | Causa |
|---|---|
| "No se pueden cargar los horarios" y `not_configured` | Faltan variables en `.env.local` o en Vercel |
| `auth_failed` tras unos días | App en modo "Prueba" (Externo): publícala y vuelve a ejecutar `google-auth.mjs` |
| `upstream_error` al reservar | No se marcaron todas las casillas de permisos: vuelve a ejecutar `google-auth.mjs` |
| Huecos en horas que no tocan | Revisa `timeZone` y `hours` en `RULES` |
| La invitación llega como "remitente desconocido" | Es normal la primera vez que alguien recibe algo de tu correo |

## Hacerlo con Claude Code

Puedes pasarle esta carpeta a Claude Code en tu proyecto con algo como:

> "Integra este sistema de reservas en mi web siguiendo LEEME.md. Adapta los estilos a mi diseño, pon mis datos y mis horarios, y guíame en la configuración de Google Cloud paso a paso."
