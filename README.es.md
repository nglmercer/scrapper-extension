# MultiStream Live Interceptor

## Resumen

MultiStream Live Interceptor es una extensión de navegador diseñada para interceptar y decodificar mensajes de las transmisiones en vivo de TikTok y Kick. Captura varios eventos como chats, regalos, "me gusta" y seguimientos, y ofrece la posibilidad de reenviar estos eventos a una URL de webhook específica o mostrarlos en una ventana separada.

## Características

-   **Intercepción de Eventos:** Captura y decodifica eventos de transmisiones en vivo de TikTok y Kick.
-   **Integración con Webhooks:** Reenvía eventos en vivo a una URL de webhook personalizada para su posterior procesamiento.
-   **Ventana de Chat Emergente:** Muestra el chat y los eventos en vivo en una ventana separada y personalizable.
-   **Decodificación de Protobuf:** Incluye un esquema de Protobuf para decodificar los mensajes binarios de WebSocket de TikTok.
-   **Fácil de Usar:** Interfaz emergente simple para una configuración rápida.

## Instalación

### Desde la Chrome Web Store / Complementos de Firefox

(Las instrucciones se agregarán una vez que la extensión sea publicada)

### Instalación Manual

1.  **Descarga el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/tiktok-live-interceptor.git
    ```
2.  **Abre la página de extensiones de tu navegador:**
    -   **Chrome:** Navega a `chrome://extensions`
    -   **Firefox:** Navega a `about:debugging#/runtime/this-firefox`
3.  **Habilita el Modo de Desarrollador.**
4.  **Carga la extensión:**
    -   **Chrome:** Haz clic en "Cargar descomprimida" y selecciona la carpeta del repositorio clonado.
    -   **Firefox:** Haz clic en "Cargar complemento temporal..." y selecciona el archivo `manifest.json`.

## Cómo Usar

1.  **Abre una transmisión en vivo de TikTok o Kick.**
2.  **Haz clic en el ícono de la extensión** en la barra de herramientas de tu navegador para abrir la ventana emergente.
3.  **Pestaña General:**
    -   Ingresa el `uniqueId` de un canal para ser redirigido a su transmisión en vivo.
4.  **Pestaña Avanzado:**
    -   **Webhook:** Habilita el webhook e ingresa la URL para enviar los eventos.
    -   **Abrir Ventana:** Habilita esta opción para abrir una nueva ventana que mostrará los eventos en vivo. Puedes personalizar la URL de esta ventana.
5.  **Guarda tu configuración.**

## Archivos del Proyecto

-   `manifest.json`: Define los permisos, scripts y propiedades de la extensión.
-   `background.js`: Service worker que se ejecuta en segundo plano, manejando mensajes y eventos.
-   `content.js`: Se inyecta en las páginas de TikTok y Kick para interceptar los mensajes de WebSocket.
-   `injected.js`: Script que se ejecuta en el contexto de la página para decodificar los mensajes de Protobuf y comunicarse con `content.js`.
-   `popup.html` / `popup.js`: La interfaz de usuario y la lógica para la ventana emergente de la extensión.
-   `protobuf.min.js`: La biblioteca Protobuf.js para decodificar mensajes.
-   `style.css`: Estilos para la ventana emergente.
-   `icons/`: Iconos de la extensión para diferentes tamaños.
