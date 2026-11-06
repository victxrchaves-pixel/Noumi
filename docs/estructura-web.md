# Noumi Consultant: estructura de la web

Documento base para diseñar y construir la web de Noumi. Se apoya en el documento *Estrategia comercial y modelo operativo* (noviembre 2026).

---

## 1. Qué tiene que conseguir la web

La web tiene **un único trabajo**: conseguir que la persona correcta **reserve una Discovery Call** (20–30 min). Todo lo demás (servicios, método, planes, casos) existe para llevar hasta ese botón.

Tres reglas derivadas de la estrategia:

1. **La web es la primera demo.** Noumi vende web, tracking y paid media, así que su propia web tiene que ser rápida, medir todo bien (GA4 + GTM + Consent Mode) y convertir. Si no, la promesa no se sostiene.
2. **Segmentar por objetivo, no por servicio.** El cliente no piensa "necesito GTM", piensa "quiero vender más" o "quiero más clientes". Por eso la navegación principal lleva a **Noumi Commerce** y **Noumi Leads**, y los servicios quedan como capa de detalle.
3. **Una sola promesa.** *"We turn traffic into business"* / *"Convertimos tráfico en negocio"*. Se repite en hero, cierre y meta descripción.

### El nombre: Noumi = *Know me*

El juego de palabras da un concepto de marca muy útil y conviene explotarlo:

- **Know me → que te conozcan.** Hacemos que tu marca se vea (creatividad, web, anuncios).
- **Know me → conocerte de verdad.** Medimos para saber quién compra, por qué y cuánto cuesta (tracking, datos).

Línea de manifiesto propuesta: **"Primero te conocemos. Luego hacemos que te conozcan. Y medimos cada paso."**

Úsalo en la sección *Sobre Noumi*, en el cierre de la home y en el tono general. No en el hero: ahí manda la promesa comercial.

---

## 2. Mapa del sitio

```
/                               Home
├── /soluciones/commerce        Noumi Commerce (e-commerce)       ★ página comercial
├── /soluciones/leads           Noumi Leads (servicios / leads)   ★ página comercial
├── /servicios
│   ├── /diseno-web             Web Design & Development
│   ├── /tracking-analitica     Tracking & Analytics
│   └── /paid-media             Paid Media & Performance (+ creatividades)
├── /planes                     Launch · Growth · Scale
├── /metodo                     The Noumi Growth System
├── /proyectos                  Casos de estudio y trabajo visual
├── /sobre-noumi                Know me: quiénes somos y cómo pensamos
├── /recursos                   Blog / guías (fase 3)
├── /reservar                   Discovery Call: formulario + calendario  ★ conversión
└── /legal
    ├── /aviso-legal
    ├── /privacidad
    └── /cookies
```

### Menú principal (máximo 6 elementos + botón)

`Soluciones ▾` · `Servicios ▾` · `Método` · `Planes` · `Proyectos` · `Sobre Noumi` · **[Reservar llamada]**

- *Soluciones* despliega Commerce / Leads con una línea cada una ("Vende más y con más margen" / "Consigue clientes cualificados").
- El botón **Reservar llamada** está fijo en la cabecera, también en móvil.

### Footer

Logo + promesa · enlaces a Soluciones, Servicios, Planes · email y LinkedIn/Instagram · legales · selector de cookies.

---

## 3. Home: secciones en orden

| # | Sección | Qué cuenta | Contenido / notas |
|---|---------|-----------|-------------------|
| 1 | **Hero** | La promesa | H1: *Convertimos tráfico en negocio.* Subtítulo: *Diseño web, medición y publicidad conectados en un solo sistema, para e-commerce y negocios de servicios.* CTA principal: **Reserva tu Discovery Call**. CTA secundario: *Ver cómo trabajamos* (ancla al método). |
| 2 | **El problema** | Por qué otros fallan | 3 síntomas: *"Inviertes en anuncios pero no sabes qué vende"*, *"Tu web es bonita pero no convierte"*, *"Cada proveedor hace su parte y nadie mira el resultado"*. Cierre: el problema son las acciones aisladas. |
| 3 | **La solución: un sistema** | Diferenciación | Diagrama de los 3 pilares conectados: **Web → Tracking → Paid Media → (vuelta a la web)**. Una línea por pilar y enlace a su página. Es la sección más "Noumi" de toda la web: aquí luce el trabajo visual. |
| 4 | **¿Cuál es tu objetivo?** | Segmentación | Dos tarjetas grandes lado a lado: **Noumi Commerce** (vendo productos online: ROAS, CPA, ticket medio) y **Noumi Leads** (vendo servicios: CPL, leads cualificados, reservas). Cada una lleva a su página. |
| 5 | **The Noumi Growth System** | Método | 5 pasos en línea horizontal (vertical en móvil): Discover · Build · Launch · Optimize · Scale, con una frase cada uno. Destacar el matiz de *Scale*: "solo escalamos cuando los números lo permiten", que transmite confianza. |
| 6 | **Prueba** | Credibilidad | Al principio, sin casos: mostrar **qué medimos** (KPI por objetivo) y un ejemplo de dashboard de reporting. Cuando haya 3–5 clientes: casos con cifra + logo + cita. No inventar testimonios. |
| 7 | **Planes** | Encaje | 3 tarjetas sin precios: **Launch** (proyecto puntual), **Growth** (servicio mensual, 1 plataforma), **Scale** (servicio mensual, hasta 2 plataformas + CRO). Debajo: *"Cada propuesta se ajusta a tu negocio después de la primera llamada. La inversión publicitaria va aparte"*. Enlace a /planes. |
| 8 | **Know me** | Marca / personas | Manifiesto corto + foto o retrato del equipo. Humaniza una oferta muy técnica. |
| 9 | **FAQ** | Quitar objeciones | 5–7 preguntas: ¿la inversión en anuncios va aparte? ¿usáis las 3 plataformas siempre? ¿incluís creatividades? ¿hay permanencia? ¿de quién son las cuentas publicitarias? ¿en cuánto tiempo veré resultados? ¿trabajáis con mi sector? |
| 10 | **CTA final** | Conversión | *"Cuéntanos tu negocio en 20 minutos."* Botón a /reservar o formulario corto incrustado. |

---

## 4. Páginas clave

### 4.1 Noumi Commerce y Noumi Leads (páginas comerciales)

Son **las páginas más importantes después de la home** (el checklist de lanzamiento las pide expresamente) y las que recibirán el tráfico de campañas. Misma plantilla, contenido distinto:

1. **Hero por objetivo.** Commerce: *"Más ventas, más rentables."* Leads: *"Menos formularios vacíos, más clientes reales."*
2. **Para quién es.** Perfil de cliente y señales de que encaja.
3. **Qué optimizamos.** KPI concretos:
   - Commerce: compras, tasa de conversión, ticket medio, CPA, ROAS, margen.
   - Leads: leads cualificados, CPL, coste por lead cualificado, reservas, tasa de cierre, CAC.
4. **Cómo lo hacemos.** Los 3 pilares aplicados a ese objetivo (por ejemplo, en Leads: formularios, llamadas y conexión con el CRM).
5. **Canales.** Meta / Google / Pinterest, con la nota de que se eligen según producto, demanda y presupuesto.
6. **Plan recomendado.** Normalmente Growth o Scale, con enlace a /planes.
7. **Método** (versión compacta).
8. **FAQ específica.**
9. **CTA** a Discovery Call, con el objetivo ya preseleccionado en el formulario.

### 4.2 Servicios (3 páginas)

Para SEO y para quien ya sabe lo que busca. Estructura: qué es → qué incluye (lista del documento estratégico) → herramientas/plataformas (logos) → cómo encaja con los otros dos pilares → planes en los que entra → CTA.

> **Creatividad.** En la estrategia las creatividades son un complemento (3 iniciales en Growth/Scale y el resto por unidad), no un pilar. Recomendación: **no crear un cuarto servicio**. La creatividad se demuestra con la estética de la web y en /proyectos, y se explica dentro de *Paid Media* como "Creatividades publicitarias". Si queréis venderla como servicio propio, primero hay que darle precio y alcance en la oferta comercial.

### 4.3 Planes

- Tabla comparativa Launch / Growth / Scale, sin precios: proyecto puntual o servicio mensual, plataformas, tracking, dashboard, CRO, creatividades incluidas, reporting.
- Bloque **"Qué no incluye"**: inversión publicitaria, webs nuevas fuera de alcance, producción compleja (vídeo, foto, rodajes), creatividades adicionales.
- Bloque **"¿No sabes cuál elegir?"**, que lleva a la Discovery Call ("el diagnóstico decide si te conviene un proyecto o un servicio recurrente").

### 4.4 Método

Los 5 pasos ampliados: qué pasa en cada uno, qué entregamos y cuánto dura aproximadamente. Añadir el proceso comercial como línea de tiempo: *Llamada → Auditoría y propuesta → Contratación → Onboarding → Implementación → Optimización*. Así el cliente sabe qué ocurre después de pulsar el botón.

### 4.5 Proyectos

- **Al lanzar:** pocos proyectos pero bien contados, aunque sean propios o de prueba (la propia web de Noumi puede ser el caso n.º 1: cómo está construida y medida). Mejor 2 buenos que 6 flojos.
- **Formato de caso:** cliente y sector → reto → qué hicimos (pilares) → resultado con cifra → visuales.
- Filtro por *Commerce / Leads*.

### 4.6 Reservar (Discovery Call)

Página de conversión, **sin menú que distraiga**:

- Columna izquierda: qué pasará en la llamada (20–30 min, sin compromiso, saldrás con un diagnóstico).
- Columna derecha: formulario de cualificación (basado en lo que se revisa en la llamada):
  1. Nombre, email, web
  2. Objetivo: **Vender online / Conseguir clientes**
  3. Inversión mensual actual o prevista en publicidad (rangos)
  4. Ticket medio o valor de un cliente (rangos)
  5. Qué te preocupa ahora mismo (texto corto, opcional)
- Después de enviar: calendario incrustado (Calendly o Cal.com) para elegir hora.

---

## 5. Medición de la propia web

Como Noumi vende tracking, esto forma parte del producto:

- **GA4 + Google Tag Manager**, con **Consent Mode v2** y banner de cookies conforme a RGPD/LSSI.
- **Meta Pixel + Conversions API** y conversiones de Google Ads desde el primer día, aunque todavía no haya campañas.
- Eventos clave:

| Evento | Cuándo |
|--------|--------|
| `cta_click` | Clic en cualquier "Reservar llamada" (con parámetro de ubicación) |
| `solution_view` | Vista de Commerce o Leads |
| `pricing_view` | Llega a la sección o página de planes |
| `form_start` | Primer campo del formulario rellenado |
| `generate_lead` | Formulario enviado (con objetivo y rango de inversión) |
| `call_booked` | Cita confirmada en el calendario (conversión principal) |

- UTMs en todos los enlaces de redes y propuestas, y un dashboard sencillo en Looker Studio. Además sirve como muestra del reporting que se entrega a los clientes.

---

## 6. Dirección visual (punto de partida)

- **Paleta:** la del documento estratégico, azul marino casi negro + violeta como acento + blanco. Alto contraste y serio, con un acento creativo.
- **Tipografía:** sans grotesca de gran tamaño para titulares y sans legible para texto. Cifras grandes como recurso gráfico (ROAS, CPL…).
- **Concepto gráfico:** **creatividad + datos**. Líneas que conectan los 3 pilares, mini-gráficos y flujos en lugar de fotos de stock. Es lo que distingue a Noumi de una agencia solo creativa y de una consultora solo técnica.
- **Movimiento:** sutil y con propósito (el diagrama del sistema que se "conecta" al hacer scroll). Nada que penalice la velocidad.
- **Rendimiento:** objetivo Lighthouse ≥ 90 en móvil. Es argumento de venta.

---

## 7. Idioma y tono

- **Español como idioma principal.** Los nombres de producto en inglés se mantienen (Launch, Growth, Scale, Growth System) y la promesa puede ir en bilingüe.
- Versión en inglés en fase 3, solo si hay demanda internacional.
- Tono: directo, seguro, sin jerga innecesaria. Si se usa un término técnico (ROAS, CPL), se explica la primera vez.

---

## 8. Fases de lanzamiento

| Fase | Páginas | Por qué |
|------|---------|---------|
| **1 · MVP (lanzar ya)** | Home completa, Noumi Commerce, Noumi Leads, Reservar, Legal + tracking completo | Con esto ya se puede captar y lanzar campañas. Planes y método viven como secciones de la home. |
| **2 · Profundidad** | 3 páginas de servicio, Planes, Método, Sobre Noumi | SEO y más información para quien compara. |
| **3 · Autoridad** | Proyectos con casos reales, Recursos/blog, auditoría gratuita como lead magnet, versión EN | Cuando haya 3–5 clientes y resultados documentados. |

---

## 9. Decisiones pendientes

1. **Precios: decidido, no se muestran en la web.** El precio se da en la propuesta, después de la Discovery Call.
2. **¿Creatividad como servicio propio o como capa transversal?** (ver 4.2).
3. **¿Auditoría gratuita como gancho?** Atrae más leads, pero consume horas. Se puede limitar a una "auditoría express" automatizada o a cupos.
4. **Tecnología:** Framer o Webflow si queréis editar sin código. Astro o Next.js si se construye a medida en este repositorio (más control sobre rendimiento y tracking).
5. **Propiedad de las cuentas publicitarias:** decidirla y explicarla en la FAQ, porque genera confianza.
