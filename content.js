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
      console.log('Mensaje enviado al background:', response,WindowUrl,window.location.origin);
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
  // Si esta página es la ventana nueva, procesar el evento
  
  // Aquí puedes agregar lógica específica para la ventana nueva
  // Por ejemplo, mostrar notificaciones, actualizar UI, etc.
/*   console.log('Mensaje recibido del background:', message);
  console.log("window.location.origin",window.location.origin) */
  if (message.type === 'TIKTOK_LIVE_EVENT' || 
      message.type === 'KICK_LIVE_EVENT' || 
      message.type === 'TWITCH_LIVE_EVENT') {
    
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