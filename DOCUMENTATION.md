# Video Speed Master Pro

## Descripción

Video Speed Master Pro es una extensión de Chrome/Edge que permite controlar la velocidad de reproducción de videos por dominio. Proporciona un panel flotante en la página y un popup para activar o desactivar el comportamiento por sitio.

## Estructura del proyecto

- `manifest.json` — configuración de la extensión.
- `popup.html` — interfaz del popup.
- `popup.js` — lógica del popup.
- `content.js` — panel in-page y aplicación de velocidad.
- `styles.css` — estilos del panel y temas.
- `docs/privacy-policy.html` — política de privacidad.
- `icon.png` — icono de la extensión.

## Cómo funciona

1. El navegador inyecta `content.js` en las páginas definidas por `matches: ["<all_urls>"]`.
2. `content.js` comprueba `chrome.storage.sync` para determinar si el dominio actual está activado.
3. Si está activado, se inicializa el panel in-page con controles de velocidad, reproducción y tema.
4. El popup permite activar/desactivar el dominio y alternar tema.
5. El popup actualiza `chrome.storage.sync` y recarga la pestaña tras cambios clave.

## Características

- Activación/desactivación por dominio.
- Panel flotante con controles completos de reproducción.
- Rango de velocidad: 0.25x a 3x (slider) con entrada numérica hasta 16x.
- Presets rápidos: 0.75x, 1x, 1.5x, 2x.
- Controles de play/pause y saltos de ±10 segundos.
- Tema claro/oscuro switchable en el panel y sincronizado globalmente.
- Guardado de posición del panel y estado minimizado por dominio.
- Panel se adapta automáticamente en modo pantalla completa.
- Detección automática de videos en iframes anidados.
- Soporte para `<video>` nativo y embeds de tipo `text/html`.
- Observador de mutaciones para aplicar velocidad a videos dinámicamente.
- Uso de `chrome.storage.sync` para persistencia multiplataforma.

## Archivo por archivo

### `manifest.json`

- `permissions`: `storage`, `activeTab`
- `action.default_popup`: `popup.html`
- `content_scripts`:
  - `matches`: `[`"<all_urls>"`]`
  - `js`: `content.js`
  - `css`: `styles.css`
  - `all_frames`: true

### `content.js`

Funciones principales:
- `tryInitPanel()`
  - Consulta `chrome.storage.sync` y decide si inicializar el panel.
  - Solo se ejecuta en la ventana principal (`window.top === window`).
  - Escucha cambios remotos en storage y aplica/remueve el panel dinámicamente.
  
- `initControl(theme)`
  - Crea el panel flotante con tema especificado (dark/light).
  - Restaura posición guardada (`hostname_pos`) y estado minimizado (`hostname_minimized`).
  - Configura listeners para: slider, presets, play/pause, skip, minimizar, arrastrar y tema.
  - Detecta y mueve el panel automáticamente al entrar/salir de pantalla completa.
  
- `applySpeedToAllVideos(speed)`
  - Aplica velocidad a todos los videos `<video>` en el documento.
  - Busca recursivamente en iframes e iframes anidados (mismo origen).
  - Usa MutationObserver para detectar y aplicar velocidad a videos agregados dinámicamente.
  - Ignora gracefully errores de origen cruzado.
  
- `controlVideos(fn)`
  - Helper que aplica una función a todos los videos (normales, en iframes y anidados).
  - Envuelve llamadas en try/catch para manejar excepciones.
  
- Event listeners:
  - Fullscreen events: `fullscreenchange`, `webkitfullscreenchange`, `mozfullscreenchange`, `MSFullscreenChange`.
  - Play/pause: Valida si hay videos reproduciéndose y ajusta UI del botón.
  - Skip ±10s: Manipula `currentTime` cuidando límites (0 a `duration`).
  - Tema en panel: Toggle entre dark/light y persiste en `chrome.storage.sync`.
  - Minimizar: Toggle de clase `minimized` y persiste en `hostname_minimized`.
  - Drag & Drop: Detecta mousedown/move/up, evita arrastrar desde inputs/buttons, guarda posición en `hostname_pos`.

### `popup.js`

Funciones y lógica:
- `DOMContentLoaded`
  - Obtiene la pestaña activa, extrae hostname y valida estado almacenado.
  - Inicializa UI (botón toggle, botón tema).
  
- Botones principales:
  - **Activar/desactivar dominio** (`toggleBtn`)
    - Lee estado actual del hostname en storage.
    - Invierte estado y recarga la pestaña para aplicar cambios.
    - Actualiza clase CSS y texto del botón (verde = activado, rojo = desactivado).
  
  - **Cambiar tema** (`themeBtn`)
    - Alterna entre dark/light en `chrome.storage.sync`.
    - Recarga pestaña para sincronizar con content.js.
    - Actualiza texto del botón para mostrar tema actual.
  

- Helpers:
  - `updateUI(active)` — actualiza botón toggle según estado.
  - `updateThemeBtn(theme)` — muestra tema actual en botón.

### `styles.css`

Estilos principales:

**Panel flotante (`#v-speed-panel`):**
- Posicionamiento fijo con z-index máximo (2147483647) para aparecer sobre todo.
- Backdrop filter blur para efecto glassmorphism.
- Ancho de 200px en modo expandido, auto en minimizado.
- Bordes redondeados y sombra con transparencia.
- Soporta temas `dark` y `light` con colores inversos.

**Estados:**
- `.minimized` — oculta contenido, muestra solo botón circular verde.
- `.dark` — fondo oscuro (rgba 20,20,20), bordes claros.
- `.light` — fondo claro (rgba 255,255,255), bordes oscuros.

**Componentes:**
- Slider (`input[type="range"]`) — accent-color verde (#22c55e).
- Presets — grid 2 columnas con hover y estado active.
- Controles de reproducción (`.v-controls`) — 3 botones centrados, tamaño 44x36px.
- Scan/Tema (`.v-small-controls`) — 2 botones lado a lado.
- Entrada numérica (`#v-number`) — ancho 64px, fondo transparente.
- Display de velocidad (`#v-val`) — fuente 24px bold centrado.

**Interactividad:**
- Hover en botones: fondo verde 30%, borde verde.
- Transiciones suaves (0.15s-0.3s) en todos los elementos.
- Cursor: move en panel, pointer en botones e inputs.

## Persistencia y alcance

**Por hostname (específico del sitio):**
- `hostname` — booleano que indica si la extensión está activada en ese dominio.
- `hostname_pos` — objeto `{ left: number, top: number }` con posición guardada del panel.
- `hostname_minimized` — booleano que indica si el panel está minimizado.

**Global (multiplataforma):**
- `theme` — string 'dark' o 'light'; tema actual del panel.

**Sincronización:**
- `chrome.storage.sync` sincroniza datos entre dispositivos con la misma cuenta de navegador.
- El popup lee y modifica estos valores; content.js escucha cambios en tiempo real.
- Cada cambio en storage dispara evento `chrome.storage.onChanged` en content.js.

## Seguridad y privacidad

- `content_scripts.matches: ["<all_urls>"]` inyecta la extensión en todos los URLs.
- El acceso a iframes cross-origin se maneja con `try/catch`.
- No hay envío de datos a servidores externos.
- La única sincronización remota proviene de `chrome.storage.sync`.

## Testing recomendado

**Manual — Panel flotante:**
- Sitios con elementos `<video>` HTML5 (YouTube con vídeos, Vimeo, etc.).
- Reproductores embebidos en iframes (YouTube embeds, etc.).
- Verificar que el panel se mueve al entrar/salir de pantalla completa.
- Cambiar velocidad con slider, presets y entrada numérica (incluir 16x).
- Verificar que minimizar persiste al recargar.
- Cambiar tema desde el panel y verificar sincronización.
- Arrastrar panel a diferentes posiciones y verificar persistencia.

**Manual — Popup:**
- Activar/desactivar dominio desde popup y verificar panel visible/invisible.
- Botón SCAN en sitios con y sin videos.
- Tema global desde popup sincroniza con panel.
- Recargar pestaña após cambios (comportamiento esperado).

**Manual — Reproducción:**
- Play/pause aplica a todos los videos del documento.
- Skip ±10s respeta límites (no va antes de 0 ni después de duration).
- Presets aplican velocidad correctamente.
- Velocidad persiste cuando se navega entre videos.

**Automatizado:**
- No existen tests actuales; se recomienda agregar pruebas con Puppeteer o Webdriver.
- Casos críticos: inicialización, almacenamiento sync, recargas, estado de videos.

## Build y publicación

Pasos:
1. Empaquetar el proyecto como ZIP.
2. Subir a Chrome Web Store o Edge Add-ons.
3. Incluir descripción, screenshots y política de privacidad.
4. Justificar permisos: `storage`, `activeTab`, inyección en `<all_urls>`.

Checklist:
- validar `manifest.json`
- validar `docs/privacy-policy.html`
- añadir screenshots del popup y del panel in-page

## Contribución

- reportar issues
- enviar PRs con descripción clara
- mantener consistencia de estilo

## Arquitectura avanzada

### Flujo de inicialización

1. Navegador carga página y ejecuta content.js.
2. `tryInitPanel()` consulta storage para verificar si el hostname está activado.
3. Si está activado:
   - `initControl()` crea el DOM del panel.
   - Restaura posición y tema desde storage.
   - Configura todos los listeners.
   - MutationObserver comienza a monitorear nuevos videos.
   - Aplica velocidad inicial (1x).
4. Popup recibe click del usuario y envía cambios a storage.
5. content.js recibe evento `chrome.storage.onChanged` y reacciona (toggle panel, cambio tema, etc.).

### Manejo de Fullscreen

El panel detecta eventos fullscreen en múltiples sabores (webkit, moz, ms) y:
- Si entra en fullscreen: mueve el panel al elemento fullscreen.
- Si sale de fullscreen: devuelve el panel a `document.body`.
- Esto asegura que el panel siempre esté visible incluso en videos fullscreen.

### MutationObserver para videos dinámicos

`applySpeedToAllVideos()` inicia un MutationObserver que:
- Monitorea cambios en `document.body` (childList + subtree).
- Detecta nuevos elementos `<video>` sin atributo `data-speed-applied`.
- Aplica velocidad actual a videos nuevos.
- Marca videos con `data-speed-applied="true"` para evitar duplicados.

### Drag & Drop sin bibliotecas

Implementado con mouse events:
- `mousedown`: Guarda offset (diferencia entre cursor y esquina del panel).
- `mousemove`: Actualiza posición del panel si `isDragging`.
- `mouseup`: Guarda posición final en `hostname_pos`.
- Evita arrastrar desde inputs o buttons (excepto minimizar).
- Minimizado permite arrastrar desde cualquier parte.

## Mejoras futuras

- restringir `content_scripts.matches` a hosts concretos
- ampliar mensajería con comandos como `setSpeed`
- agregar historial de configuración por sitio
- soporte para reproductores personalizados (HLS, DASH)

## Límites y restricciones conocidas

### Origen cruzado (CORS)
- No se puede acceder a iframes de origen cruzado.
- Reproductores embebidos de plataformas (YouTube, Twitch) en iframes cross-origin no se controlan.
- La extensión intenta acceder, pero silencia excepciones gracefully.

### Reproductores propietarios
- Solo funciona con elementos `<video>` nativos.
- Reproductores Flash, Silverlight o JavaScript propietarios requieren hooks adicionales.
- Algunos reproductores pueden tener protecciones contra cambio de playbackRate.

### Limitaciones del navegador
- `chrome.storage.sync` tiene cuota de sincronización; datos muy frecuentes pueden ser throttled.
- MutationObserver puede impactar rendimiento en páginas con alto movimiento de DOM.
- Fullscreen en algunos navegadores puede no permitir modificar el panel.
