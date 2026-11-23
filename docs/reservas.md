# Reserva de llamada

El calendario de reservas de la web: un flujo de tres pasos que termina en una cita de 30 minutos en Google Calendar con enlace de Google Meet.

## Dónde aparece

| Sitio | Cómo |
|---|---|
| Pop-up | Cualquier enlace que acabe en `#reservar` (botones "Reservar llamada", menú, pie) o con `data-open-booking`. Si el enlace lleva `data-goal="commerce"`, `"leads"` o `"web"`, el objetivo viene marcado. |
| Sección "Cuéntanos tu negocio" | `<div data-booking data-source="home">` en la home y en las landings (con `data-goal` en cada landing). |
| Página propia | `prototipo/reservar.html`, útil como destino de anuncios. |

Todo sale de un único componente: `prototipo/js/booking.js`, con sus estilos en `prototipo/css/noumi.css` (bloque "Reserva de llamada").

## El flujo

1. **Tu negocio**: qué necesita (E-Commerce Growth, Lead Generation o diseño web), inversión mensual en publicidad, ticket medio (las opciones cambian según el objetivo), web actual y qué le preocupa. Las tres primeras son obligatorias.
2. **Tus datos**: nombre, email y teléfono (obligatorio). El teléfono se comprueba en el navegador: 9 cifras españolas que empiecen por 6, 7, 8 o 9, o un número internacional con prefijo; se rechazan los de relleno como 600000000. Lleva un campo oculto contra robots.
3. **Día y hora**: calendario con los días libres y las horas de cada día. Se elige una hora y se confirma.
4. **Confirmación**: "Llamada reservada" con la fecha y el email al que llega la invitación.

## Reglas de horario

En `RULES`, al principio de `booking.js` (y lo mismo en el servidor cuando se conecte):

- Llamadas de 30 minutos y 15 minutos libres entre llamadas.
- Lunes a jueves de 9:30 a 13:00 y de 14:30 a 18:00; viernes de 10:00 a 13:00 y de 14:30 a 16:00.
- No se puede reservar para el mismo día; como mucho 14 días vista.
- Hora de España (`Europe/Madrid`), con el cambio de hora incluido.

## Estado actual: modo de prueba

Mientras la web está en GitHub Pages no hay servidor, así que:

- Los huecos se calculan en el navegador con las reglas de arriba y algunas horas salen ocupadas para que se vea real.
- La reserva se simula: no se crea ninguna cita ni se envía ningún correo. El componente lo indica con un aviso discreto ("Vista de prueba").

## Conectar con Google Calendar (cuando la web esté en Vercel)

El código de servidor original está en `referencia/calendario-reservas/` (lo que venía en el zip). Pasos:

1. **Servidor.** Añadir dos funciones de Vercel en la raíz del proyecto, adaptadas de `referencia/calendario-reservas/api/` y `lib/booking.ts`:
   - `GET /api/booking/slots?duration=30`: devuelve los huecos libres.
   - `POST /api/booking`: valida los datos y crea la cita.

   En `lib/booking.ts` hay que cambiar `minNoticeHours: 4` por la regla "a partir de mañana", dejar solo la duración de 30 minutos, poner el título y la descripción con el dominio de Noumi, y añadir al evento las respuestas de la encuesta (objetivo, inversión, ticket, web, qué le preocupa, página de origen).
2. **Navegador.** En `booking.js`: `DEMO = false` y sustituir `BookingAPI.slots` y `BookingAPI.book` por las llamadas que ya están escritas en los comentarios. Nada más cambia.
3. **Google Cloud.** Seguir los pasos 5 y 6 de `referencia/calendario-reservas/LEEME.md` con la cuenta que recibirá las citas (con una @gmail.com hay que publicar la app en "En producción" para que la conexión no caduque cada 7 días).
4. **Variables de entorno en Vercel**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`. Nunca en el repositorio.
5. **Probar** una reserva real con otro correo propio y borrar el evento después.

## Medición

Ya preparada, se activa sola cuando estén instalados GTM, GA4, el píxel de Meta o el de OpenAI:

| Evento | Cuándo |
|---|---|
| `booking_open` | Se abre el pop-up |
| `booking_start` | Primera interacción con el formulario |
| `booking_step` (`encuesta`, `contacto`, `dia_hora`, `reservada`) | Cambio de paso |
| `booking_error` | Un paso con campos sin completar |
| `lead_created` | Reserva confirmada (la conversión). También `Lead` a Meta y `lead_created` a OpenAI, con el mismo `event_id` para poder deduplicar con eventos de servidor. |

Todos los eventos aparecen también en el panel "Know me" de la web.
