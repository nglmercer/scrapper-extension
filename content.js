/**
 * @file content.js
 * @description Este script se inyecta en las páginas web para interactuar con su contenido.
 */
console.log('Content script cargado para TikTok Live Interceptor');
// content.js - Solución 1: Namespace aislado
// Función para inyectar script en la página
let extensionNamespace;
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


// Escuchar mensajes del script inyectado
window.addEventListener('message', (event) => {
    // Solo procesar mensajes de nuestro origen
    if (event.source !== window || !event.data.type) return;
    
    if (event.data.type === 'TIKTOK_LIVE_EVENT') {
        console.log('Evento recibido desde página:', event.data.payload);
        
        // Enviar al background script o procesar aquí
        chrome.runtime.sendMessage({
            type: 'TIKTOK_LIVE_EVENT',
            data: event.data.payload
        }).catch(err => {
            console.warn('Error enviando mensaje al background:', err);
        });
    }
});

// Inyectar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
} else {
    injectScript();
}


/**
 * Escucha los mensajes enviados desde otras partes de la extensión (como el popup o el background script).
 * @param {object} request - El mensaje enviado.
 * @param {chrome.runtime.MessageSender} sender - Información sobre el remitente del mensaje.
 * @param {function} sendResponse - Función para enviar una respuesta al remitente.
 * @returns {boolean} - Devuelve true para indicar que la respuesta se enviará de forma asíncrona.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

});