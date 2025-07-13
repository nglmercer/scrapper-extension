/**
 * @file content.js
 * @description Este script se inyecta en las páginas web para interactuar con su contenido.
 */
console.log('Content script cargado para TikTok Live Interceptor');
// content.js - Solución 1: Namespace aislado
// Función para inyectar script en la página
let extensionNamespace;
let originalProtobuf;
function injectScript() {
    extensionNamespace = 'TikTokInterceptor_' + Date.now();
    const protoscript = document.createElement('script');
    protoscript.src = chrome.runtime.getURL('protobuf.min.js');
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
        console.log('Script inyectado correctamente');
    };
    script.onerror = function() {
        console.error('Error al inyectar script');
        this.remove();
    };
    protoscript.onload = function() {
    // Mover protobuf a namespace único
    window[extensionNamespace] = window.protobuf;
    
    // Restaurar protobuf original
    if (originalProtobuf) {
        window.protobuf = originalProtobuf;
    } else {
        delete window.protobuf;
    }
        
        console.log('✅ Protobuf cargado en namespace:', extensionNamespace, window[extensionNamespace]);
    };
    protoscript.onerror = function(error) {
        console.error('❌ Error cargando protobuf:', error);
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
    (document.head || document.documentElement).appendChild(protoscript);
}
/**
 * Función simple para hacer peticiones POST con JSON
 * @param {string} url - URL del endpoint
 * @param {Object} data - Objeto JSON a enviar
 * @param {Object} options - Opciones adicionales
 * @param {Object} options.headers - Headers adicionales
 * @param {number} options.timeout - Timeout en milisegundos (default: 30000)
 * @param {string} options.bearerToken - Token de autorización Bearer
 * @param {Object} options.basicAuth - Autenticación básica {username, password}
 * @returns {Promise<Object>} - Respuesta de la petición
 */
async function postJSON(url, data, options = {}) {
  const {
    headers = {},
    timeout = 30000,
    bearerToken,
    basicAuth
  } = options;

  // Construir headers
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Agregar autenticación si se proporciona
  if (bearerToken) {
    finalHeaders['Authorization'] = `Bearer ${bearerToken}`;
  }

  if (basicAuth && basicAuth.username && basicAuth.password) {
    const credentials = btoa(`${basicAuth.username}:${basicAuth.password}`);
    finalHeaders['Authorization'] = `Basic ${credentials}`;
  }

  // Configurar AbortController para timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: finalHeaders,
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parsear respuesta
    let responseData;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers)
    };

  } catch (error) {
    clearTimeout(timeoutId);
    
    let errorMessage = 'Error desconocido';
    if (error.name === 'AbortError') {
      errorMessage = `Request timed out after ${timeout}ms`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      status: 0,
      statusText: 'Error',
      data: null,
      error: errorMessage
    };
  }
}

// Ejemplos de uso:

// 1. POST básico
/*
const result = await postJSON('https://api.example.com/users', {
  name: 'Juan',
  email: 'juan@example.com'
});

console.log(result);
*/
// Escuchar mensajes del script inyectado
let WebhookUrl = window.localStorage.WebhookUrl || window.WebhookUrl || "";
let WebhookOption = window.localStorage.WebhookOption === "true" || window.WebhookOption || false;
let WindowUrl = window.localStorage.WindowUrl || "https://nglmercer.github.io/multistreamASTRO/chat";
let OpenWindow = window.localStorage.OpenWindow === "true" || window.OpenWindow || false;
chrome.storage.local.get(['WebhookUrl', 'WebhookOption','WindowUrl','OpenWindow'], (result) => {
    WebhookUrl = result.WebhookUrl || WebhookUrl;
    WebhookOption = result.WebhookOption || WebhookOption;
    WindowUrl = result.WindowUrl || WindowUrl;
    OpenWindow = result.OpenWindow || OpenWindow;
})
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log("newChange ",{
        key,
        oldValue,
        newValue
      })
        if (key === 'WebhookUrl') {
            WebhookUrl = newValue;
        } else if (key === 'WebhookOption') {
            WebhookOption = newValue;
        } else if (key === 'WindowUrl') {
            WindowUrl = newValue;
        } else if (key === 'OpenWindow') {
            OpenWindow = newValue;
        }
    }
});

let newWindow = false;
window.addEventListener('message',async (event) => {
    // Solo procesar mensajes de nuestro origen
    if (event.source !== window || !event.data.type) return;
    
    if (event.data.type === 'TIKTOK_LIVE_EVENT' || event.data.type === 'KICK_LIVE_EVENT') {
        const now = Date.now();
        if ( WebhookUrl && WebhookOption){
            const result = await postJSON(WebhookUrl, event.data.payload);
            console.log("result",result,{ WebhookUrl, WebhookOption });
        }
        if (!newWindow){
          if (!WindowUrl || !OpenWindow){
            console.log("newWindow",newWindow,{ WindowUrl,OpenWindow });
            return;
          }
            const newWindowUrl = WindowUrl;
            newWindow = window.open(newWindowUrl);
        } else {
          if (!newWindow || newWindow.closed) {
            console.log("newWindow",newWindow,{ WindowUrl,OpenWindow });
            return;
          }
            newWindow.postMessage({
                type: event.data.type,
                payload: {
                   ...event.data.payload,
                }
            }, '*');
        }
        console.log('Evento recibido desde página:', event.data.payload,now.toString());
        // Enviar al background script o procesar aquí

    }
});

// Inyectar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
} else {
    injectScript();
}