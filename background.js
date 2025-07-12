/**
 * @file background.js
 * @description Service worker que se ejecuta en segundo plano para manejar eventos de la extensión,
 * como los eventos de TikTok Live, y gestionar el almacenamiento y las notificaciones.
 */

console.log('Background script iniciado');

/**
 * Escucha los mensajes enviados desde los content scripts.
 * Procesa los eventos de TikTok Live, los guarda en el almacenamiento local y muestra notificaciones.
 * @param {object} request - El mensaje enviado.
 * @param {chrome.runtime.MessageSender} sender - Información sobre el remitente.
 * @param {function} sendResponse - Función para enviar una respuesta.
 * @returns {boolean} - Devuelve true para indicar que la respuesta se enviará de forma asíncrona.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Mensaje recibido en background:', request);
    
    if (request.type === 'TIKTOK_LIVE_EVENT') {
        console.log('Evento de TikTok Live:', request.data);
        
        sendResponse({ success: true });
    }
    
    return true; // Mantener el canal abierto para respuestas asíncronas
});

/**
 * Se ejecuta una vez cuando la extensión se instala o se actualiza.
 * Crea un menú contextual para la extensión.
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extensión instalada');
    
    // Crear contexto de menú (opcional)
    chrome.contextMenus.create({
        id: 'tiktokInterceptor',
        title: 'Interceptar TikTok Live',
        contexts: ['page'],
        documentUrlPatterns: ['https://www.tiktok.com/*']
    });
});
