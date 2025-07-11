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
        
        // Aquí puedes procesar los eventos como quieras:
        // - Guardar en storage
        // - Enviar a un servidor
        // - Mostrar notificaciones
        // - Etc.
        
        // Ejemplo: guardar en storage
        chrome.storage.local.get(['tiktokEvents'], (result) => {
            const events = result.tiktokEvents || [];
            events.push({
                ...request.data,
                timestamp: Date.now(),
                tabId: sender.tab?.id
            });
            
            // Mantener solo los últimos 100 eventos
            if (events.length > 100) {
                events.splice(0, events.length - 100);
            }
            
            chrome.storage.local.set({ tiktokEvents: events });
        });
        
        // Ejemplo: mostrar notificación para gifts
        if (request.data.eventName === 'gift') {
            const user = request.data.data.user?.nickname || 'Usuario';
            const giftName = request.data.data.giftDetails?.giftName || 'Regalo';
            
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon48.png',
                title: 'Regalo recibido!',
                message: `${user} envió: ${giftName}`
            });
        }
        
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

/**
 * Maneja los clics en los elementos del menú contextual creados por la extensión.
 * @param {chrome.contextMenus.OnClickData} info - Información sobre el elemento del menú en el que se hizo clic.
 * @param {chrome.tabs.Tab} tab - La pestaña donde ocurrió el clic.
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'tiktokInterceptor') {
        console.log('Activando interceptor en tab:', tab.id);
        
        // Inyectar scripts si es necesario
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    }
});

/**
 * Obtiene los eventos almacenados en chrome.storage.local.
 * @param {function(Array<object>)} callback - La función a la que se le pasarán los eventos.
 */
function getStoredEvents(callback) {
    chrome.storage.local.get(['tiktokEvents'], (result) => {
        callback(result.tiktokEvents || []);
    });
}

/**
 * Limpia todos los eventos almacenados en chrome.storage.local.
 */
function clearStoredEvents() {
    chrome.storage.local.set({ tiktokEvents: [] });
}

// Exponer funciones para el popup
globalThis.getStoredEvents = getStoredEvents;
globalThis.clearStoredEvents = clearStoredEvents;