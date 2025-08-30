/**
 * @file content.js
 * @description Este script se inyecta en las páginas web para interactuar con su contenido.
 */
console.log('Content script cargado para TikTok Live Interceptor');
// content.js - Solución 1: Namespace aislado
// Función para inyectar script en la página
let extensionNamespace;
let originalProtobuf;

function prepareEnvironment() {
    extensionNamespace = 'TikTokInterceptor_' + Date.now();
    
    // Guardar en un elemento DOM oculto
    const configDiv = document.createElement('div');
    configDiv.id = 'tiktok-interceptor-config';
    configDiv.style.display = 'none';
    configDiv.setAttribute('data-namespace', extensionNamespace);
    document.body.appendChild(configDiv);
    
    return extensionNamespace;
}

function injectScript() {
    const namespace = prepareEnvironment();
    
    const protoscript = document.createElement('script');
    protoscript.src = chrome.runtime.getURL('protobuf.min.js');
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    
    protoscript.onload = function() {

        console.log('✅ Protobuf configurado globalmente');
    };
    
    document.head.appendChild(protoscript);
    document.head.appendChild(script);

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
    timeout = 5000,
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
async function getProtobufSchema(schemaPath = "data.proto") {
    try {
        console.log(`📥 Obteniendo esquema protobuf desde: ${schemaPath}`);
        
        // Usar chrome.runtime.getURL para obtener la URL del archivo en la extensión
        const fileURL = chrome.runtime.getURL(schemaPath);
        console.log(`🔗 URL del archivo: ${fileURL}`);
        
        const response = await fetch(fileURL);
        
        // Verificar si la respuesta fue exitosa
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
        }
        
        // Verificar el tipo de contenido
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('text/') && !contentType.includes('application/octet-stream')) {
            console.warn(`⚠️ Tipo de contenido inesperado: ${contentType}`);
        }
        
        const schemaText = await response.text();
        
        // Validar que el contenido no esté vacío
        if (!schemaText || schemaText.trim().length === 0) {
            throw new Error('El esquema protobuf está vacío');
        }
        
        // Validación básica de sintaxis protobuf
        if (!schemaText.includes('syntax') && !schemaText.includes('message')) {
            console.warn('⚠️ El archivo no parece ser un esquema protobuf válido');
        }
        
        console.log(`✅ Esquema protobuf obtenido exitosamente (${schemaText.length} caracteres)`);
        return schemaText;
        
    } catch (error) {
        console.error('❌ Error obteniendo esquema protobuf:', error);
        
        // Fallback: intentar con ruta relativa si chrome.runtime.getURL falla
        try {
            console.log('🔄 Intentando con ruta relativa...');
            const fallbackResponse = await fetch(schemaPath);
            if (fallbackResponse.ok) {
                const fallbackText = await fallbackResponse.text();
                console.log('✅ Esquema obtenido con fallback');
                return fallbackText;
            }
        } catch (fallbackError) {
            console.error('❌ Fallback también falló:', fallbackError);
        }
        
        return null;
    }
}
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
async function getProtobufSchema(schemaPath = "data.proto") {
    try {
        console.log(`📥 Obteniendo esquema protobuf desde: ${schemaPath}`);
        
        // Usar chrome.runtime.getURL para obtener la URL del archivo en la extensión
        const fileURL = chrome.runtime.getURL(schemaPath);
        console.log(`🔗 URL del archivo: ${fileURL}`);
        
        const response = await fetch(fileURL);
        
        // Verificar si la respuesta fue exitosa
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
        }
        
        // Verificar el tipo de contenido
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('text/') && !contentType.includes('application/octet-stream')) {
            console.warn(`⚠️ Tipo de contenido inesperado: ${contentType}`);
        }
        
        const schemaText = await response.text();
        
        // Validar que el contenido no esté vacío
        if (!schemaText || schemaText.trim().length === 0) {
            throw new Error('El esquema protobuf está vacío');
        }
        
        // Validación básica de sintaxis protobuf
        if (!schemaText.includes('syntax') && !schemaText.includes('message')) {
            console.warn('⚠️ El archivo no parece ser un esquema protobuf válido');
        }
        
        console.log(`✅ Esquema protobuf obtenido exitosamente (${schemaText.length} caracteres)`);
        return schemaText;
        
    } catch (error) {
        console.error('❌ Error obteniendo esquema protobuf:', error);
        
        // Fallback: intentar con ruta relativa si chrome.runtime.getURL falla
        try {
            console.log('🔄 Intentando con ruta relativa...');
            const fallbackResponse = await fetch(schemaPath);
            if (fallbackResponse.ok) {
                const fallbackText = await fallbackResponse.text();
                console.log('✅ Esquema obtenido con fallback');
                return fallbackText;
            }
        } catch (fallbackError) {
            console.error('❌ Fallback también falló:', fallbackError);
        }
        
        return null;
    }
}
(async() => {
    const schemaText = await getProtobufSchema('data.proto');
    window.postMessage({
      type: 'PROTOBUF_SCHEMA',
      data: schemaText
    })
    setInterval(() => {
        window.postMessage({
          type: 'PROTOBUF_SCHEMA',
          data: schemaText
        })
    }, 10000);
})();
let newWindow = false;
// content.js - Script actualizado para comunicarse con background

window.addEventListener('message', async (event) => {
  const now = Date.now();
  
  // Solo procesar mensajes de nuestro origen
  if (event.source !== window || !event.data.type) return;
  
  if (
    event.data.type === 'TIKTOK_LIVE_EVENT' ||
    event.data.type === 'KICK_LIVE_EVENT' ||
    event.data.type === 'TWITCH_LIVE_EVENT'
  ) {
    
    console.log('Evento recibido desde página:', event.data.payload);
    
    try {
      // Enviar al background script (service worker)
      // Este SIEMPRE está disponible y puede hacer fetch sin restricciones CORS
      const response = await chrome.runtime.sendMessage({
        type: event.data.type,
        payload: {
          ...event.data.payload,
          timestamp: now,
          url: window.location.href, // Incluir la URL de origen
          platform: detectPlatform() // Detectar plataforma automáticamente
        }
      });
      
      console.log('Mensaje enviado al background:', response);
      
    } catch (error) {
      console.error('Error enviando mensaje al background:', error);
    }
  }
});

// Función auxiliar para detectar la plataforma
function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('kick.com')) return 'kick';
  if (hostname.includes('twitch.tv')) return 'twitch';
  if (hostname.includes('youtube.com')) return 'youtube';
  
  return 'unknown';
}

// Escuchar mensajes del background (para la ventana nueva)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TIKTOK_LIVE_EVENT' || 
      message.type === 'KICK_LIVE_EVENT' || 
      message.type === 'TWITCH_LIVE_EVENT') {
    
    // Si esta página es la ventana nueva, procesar el evento
    console.log('Mensaje recibido del background:', message);
    
    // Aquí puedes agregar lógica específica para la ventana nueva
    // Por ejemplo, mostrar notificaciones, actualizar UI, etc.
    
    sendResponse({ received: true });
  }
  
  return true; // Mantener el canal abierto para respuestas asíncronas
});

// Inyectar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
} else {
    injectScript();
}