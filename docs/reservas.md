# Reserva de llamada

El calendario de reservas de la web: un flujo de tres pasos que termina en una cita de 30 minutos en Google Calendar con enlace de Google Meet.

## Cuenta

Las citas llegan al Google Calendar de **noumiconsultant@gmail.com**. Esa misma cuenta de Google es la que se usa para crear el proyecto en Google Cloud y autorizar la conexión. Como es una @gmail.com (no Google Workspace), en la pantalla de permisos hay que elegir **Externo** y después **publicar la app** para dejarla "En producción"; si se queda en "Prueba", la conexión caduca a los 7 días y las reservas dejan de funcionar sin avisar.

Las invitaciones de Google Meet salen de esa cuenta, y es también el correo de contacto que muestra el calendario si no carga o no quedan horas.

## Dónde aparece

| Sitio | Cómo |
|---|---|
| Pop-up | Cualquier enlace que acabe en `#reservar` (botones "Reservar llamada", menú, pie) o con `data-open-booking`. Si el enlace lleva `data-goal="commerce"`, `"leads"` o `"web"`, el objetivo viene marcado. |
| Sección "Cuéntanos tu negocio" | `<div data-booking data-source="home">` en la home y en las landings (con `data-goal` en cada landing). |
| Página propia | `prototipo/reservar.html`, útil como destino de anuncios. |

Todo sale de un único componente: `prototipo/js/booking.js`, con sus estilos en `prototipo/css/noumi.css` (bloque "Reserva de llamada").

## El flujo

1. **Tu negocio**: qué necesita (E-Commerce Growth, Lead Generation o diseño web), inversión mensual en publicidad, ticket medio (las opciones cambian según el objetivo) y qué le preocupa. Las tres primeras son obligatorias.
2. **Tus datos**: nombre y apellidos, teléfono y email, nombre de la empresa o marca (obligatorios) y, si los tiene, web actual y red social. El teléfono se comprueba en el navegador: 9 cifras españolas que empiecen por 6, 7, 8 o 9, o un número internacional con prefijo; se rechazan los de relleno como 600000000. Lleva un campo oculto contra robots.
3. **Día y hora**: calendario con los días libres y las horas de cada día. Se elige una hora y se confirma.
4. **Confirmación**: "Llamada reservada" con la fecha y el email al que llega la invitación.

## Reglas de horario

En `RULES`, al principio de `booking.js` (y lo mismo en el servidor cuando se conecte):

- Llamadas de 30 minutos y 15 minutos libres entre llamadas.
- Lunes a jueves de 9:30 a 13:00 y de 14:30 a 18:00; viernes de 10:00 a 13:00 y de 14:30 a 16:00.
- No se puede reservar para el mismo día; como mucho 14 días vista.
- Hora de España (`Europe/Madrid`), con el cambio de hora incluido.

## Cómo funciona por dentro

- **Servidor** (funciones de Vercel, en `api/` en la raíz del repositorio):
  - `GET /api/booking/slots`: pregunta a Google qué horas están ocupadas y devuelve los huecos libres según las reglas.
  - `POST /api/booking`: valida los datos (el teléfono con `libphonenumber-js`), vuelve a comprobar que el hueco sigue libre y crea el evento en Google Calendar con Google Meet. Google envía la invitación al cliente.
  - Las reglas están en `api/_lib/booking.js` y deben coincidir con las de `prototipo/js/booking.js`.
  - El evento se llama "Llamada con Noumi Consultant" (es también el asunto de la invitación que recibe el cliente) y en la descripción lleva el contacto, la empresa o marca, qué necesita, la inversión, el ticket, la web, la red social, qué le preocupa y la página desde la que reservó.
- **Navegador** (`prototipo/js/booking.js`): pide los huecos a `/api/booking/slots`. Si en esa dirección no hay servidor (GitHub Pages, el artifact o un archivo abierto en local), pasa solo al **modo de prueba**: calcula los huecos con las mismas reglas, simula la reserva y lo avisa con "Vista de prueba". Si el servidor existe pero falla (por ejemplo, faltan las claves), muestra el error y el correo de contacto; nunca finge una reserva.
- **Pruebas**: `npm install` y `npm test` comprueban las reglas de horario, el horario de verano, los huecos ocupados, la validación y la creación del evento con Google simulado.

## Activarlo en Vercel

1. En el proyecto de Vercel, entra en **Settings → Environment Variables** y añade, para **Production** y **Preview**, las tres claves que guardó el script en `referencia/calendario-reservas/.env.local`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
2. Vuelve a desplegar (Deployments → los tres puntos del último → **Redeploy**). Las variables solo se aplican en un despliegue nuevo.
3. Abre la web en Vercel, pulsa "Reservar llamada" y comprueba que **no** sale el aviso "Vista de prueba" y que los horarios coinciden con tu calendario.
4. Haz una reserva con otro correo tuyo y comprueba que el evento aparece en el calendario de noumiconsultant@gmail.com con Meet y los datos, y que llega la invitación. Después borra el evento.

Para cerrar un día (festivo, vacaciones), crea en ese calendario un evento de día completo marcado como **Ocupado**.

## Zona horaria del calendario

El calendario de noumiconsultant@gmail.com debe estar en la zona horaria de Madrid (Google Calendar → Configuración → Zona horaria). Si está en UTC, las invitaciones muestran la hora en UTC aunque la cita esté bien puesta.

## Si algo falla

| Síntoma | Causa |
|---|---|
| "No se pueden cargar los horarios" en Vercel | Faltan las variables o no se ha vuelto a desplegar después de añadirlas |
| Funcionaba y deja de cargar a los 7 días | La app de Google Cloud se quedó en "Prueba": publícala y vuelve a ejecutar el script |
| Error al confirmar la reserva | No se marcaron todas las casillas de permisos al autorizar: vuelve a ejecutar el script |
| En Vercel sale "Vista de prueba" | No se han desplegado las funciones de `api/`: comprueba que el proyecto usa la raíz del repositorio |

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
