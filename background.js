// background.js - Service Worker

console.log('Background script iniciado');

// Escuchar mensajes de los content scripts
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

// Agregar permisos de notificaciones al instalar
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

// Manejar clicks en el menú contextual
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

// Función para obtener eventos almacenados (puede ser llamada desde popup)
function getStoredEvents(callback) {
    chrome.storage.local.get(['tiktokEvents'], (result) => {
        callback(result.tiktokEvents || []);
    });
}

// Función para limpiar eventos almacenados
function clearStoredEvents() {
    chrome.storage.local.set({ tiktokEvents: [] });
}

// Exponer funciones para el popup
globalThis.getStoredEvents = getStoredEvents;
globalThis.clearStoredEvents = clearStoredEvents;