# Mi Primera Extensión de Chrome (Ejemplo Completo)

Este repositorio contiene el código fuente de una extensión de Chrome de ejemplo. El propósito de este proyecto es demostrar los conceptos fundamentales y la estructura básica de una extensión de Chrome utilizando Manifest V3.

## 📜 Índice

- [Funcionalidad](#-funcionalidad)
- [🚀 Estructura del Proyecto](#-estructura-del-proyecto)
- [🧩 Componentes Principales](#-componentes-principales)
  - [manifest.json](#manifestjson)
  - [Popup (popup.html y popup.js)](#popup-popuphtml-y-popupjs)
  - [Content Script (content.js)](#content-script-contentjs)
  - [Background Script (background.js)](#background-script-backgroundjs)
- [🛠️ Instalación y Pruebas](#️-instalación-y-pruebas)
- [🐛 Depuración (Debugging)](#-depuración-debugging)

## ✨ Funcionalidad

La extensión realiza las siguientes acciones:

1.  **Modificación Automática de Página**: Al cargar cualquier página web, el `content.js` cambia el color de fondo a un gris claro (`#f0f0f0`) para indicar que la extensión está activa.
2.  **Interacción con el Popup**: Al hacer clic en el botón "Cambiar Color" dentro del popup de la extensión, se envía un mensaje al `content.js` para cambiar el color de fondo de la página activa a un rojo claro (`#ff6b6b`).
3.  **Interacción con el Icono**: Al hacer clic en el ícono de la extensión en la barra de herramientas, el `background.js` envía un mensaje al `content.js` para cambiar el color de fondo a un amarillo (`#ffcc00`).

## 🚀 Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

```
/mi-extension
├── README.md
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🧩 Componentes Principales

### manifest.json

Es el archivo de configuración central y el corazón de la extensión. Define los metadatos, permisos, scripts y otros recursos que la extensión necesita.

-   `"manifest_version": 3`: Especifica el uso de Manifest V3, la versión más reciente y segura del manifiesto de Chrome.
-   `"permissions"`: Declara los permisos necesarios. `"activeTab"` otorga acceso temporal a la pestaña activa tras una interacción del usuario, y `"storage"` permite usar la API de almacenamiento de Chrome.
-   `"action"`: Configura el ícono de la extensión en la barra de herramientas y define `popup.html` como la ventana emergente.
-   `"background"`: Registra `background.js` como el service worker para tareas en segundo plano.
-   `"content_scripts"`: Configura `content.js` para ser inyectado en todas las páginas web (`"<all_urls>"`).

### Popup (popup.html y popup.js)

El popup es la interfaz de usuario principal que se muestra al hacer clic en el ícono de la extensión.

-   **`popup.html`**: Define la estructura HTML del popup. Contiene un título y un botón.
-   **`popup.js`**: Añade interactividad al popup. Escucha el evento `click` del botón y, cuando ocurre, envía un mensaje al `content.js` de la pestaña activa para que realice una acción (cambiar el color).

### Content Script (content.js)

Este script se ejecuta en el contexto de las páginas web que el usuario visita. Es el puente entre la extensión y el contenido de la página.

-   **Modifica el DOM**: Puede leer y modificar el DOM de la página, como se demuestra al cambiar el color de fondo.
-   **Escucha Mensajes**: Utiliza `chrome.runtime.onMessage` para escuchar y reaccionar a los mensajes enviados desde el `popup.js` o el `background.js`.

### Background Script (background.js)

Es un service worker que se ejecuta en segundo plano, independientemente de cualquier página web o ventana del navegador. Es ideal para manejar eventos y mantener estados a largo plazo.

-   **Manejo de Eventos**: Escucha eventos del navegador, como la instalación de la extensión (`chrome.runtime.onInstalled`) o clics en el ícono de la acción (`chrome.action.onClicked`).

## 🛠️ Instalación y Pruebas

Para cargar y probar la extensión en tu navegador:

1.  Abre Google Chrome y navega a la página de gestión de extensiones: `chrome://extensions/`.
2.  Activa el **Modo de desarrollador** usando el interruptor en la esquina superior derecha.
3.  Haz clic en el botón **Cargar extensión sin empaquetar**.
4.  En el diálogo que aparece, selecciona la carpeta completa del proyecto (`c:\Users\mm\Documents\extensiones`).
5.  La extensión se instalará y su ícono aparecerá en la barra de herramientas de Chrome.

## 🐛 Depuración (Debugging)

Para depurar las diferentes partes de la extensión, necesitas abrir las Herramientas de Desarrollador (DevTools) en el contexto correcto:

-   **Para el Popup**: Haz clic derecho sobre el popup de la extensión y selecciona **Inspeccionar**.
-   **Para el Background Script**: En la página `chrome://extensions/`, busca tu extensión y haz clic en el enlace **service worker**.
-   **Para el Content Script**: Abre las DevTools (`F12`) en cualquier página web donde la extensión esté activa. Ve a la pestaña **Fuentes (Sources)** y busca tu script en la sub-pestaña **Content scripts**.