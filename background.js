// background.js (Service Worker para Manifest V3)

let WebhookUrl = '';
let WebhookOption = false;
let WindowUrl = '';
let OpenWindow = false;
let newWindow = null;

// Cargar configuración al inicializar
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'WebhookUrl', 
      'WebhookOption', 
      'WindowUrl', 
      'OpenWindow'
    ]);
    
    WebhookUrl = result.WebhookUrl || '';
    WebhookOption = result.WebhookOption || false;
    WindowUrl = result.WindowUrl || 'https://nglmercer.github.io/multistreamASTRO/chat';
    OpenWindow = result.OpenWindow || false;
    
    console.log('Configuración cargada:', { WebhookUrl, WebhookOption, WindowUrl, OpenWindow });
  } catch (error) {
    console.error('Error cargando configuración:', error);
  }
}

// Escuchar cambios en la configuración
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.WebhookUrl) WebhookUrl = changes.WebhookUrl.newValue || '';
    if (changes.WebhookOption) WebhookOption = changes.WebhookOption.newValue || false;
    if (changes.WindowUrl) WindowUrl = changes.WindowUrl.newValue || '';
    if (changes.OpenWindow) OpenWindow = changes.OpenWindow.newValue || false;
    
    console.log('Configuración actualizada:', { WebhookUrl, WebhookOption, WindowUrl, OpenWindow });
  }
});

// Función para enviar webhook
async function sendWebhook(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json().catch(() => response.text());
    console.log('Webhook enviado exitosamente:', result);
    return { success: true, result };
    
  } catch (error) {
    console.error('Error enviando webhook:', error);
    return { success: false, error: error.message };
  }
}

let chatTabId = null;
let tabCreationPromise = null; // ¡Esta es la clave! Nuestra promesa "bloqueadora".

/**
 * Función principal que se dispara con cada evento.
 * Su única responsabilidad es orquestar la obtención de la pestaña y el envío del mensaje.
 * @param {object} eventData - Los datos a enviar a la pestaña.
 */
async function handleNewWindow(eventData) {
    if (!OpenWindow || !WindowUrl) {
        console.log('Opción de ventana/pestaña nueva deshabilitada.');
        return;
    }

    try {
        console.log('Evento recibido. Obteniendo o creando la pestaña de chat...');
        // Esta función es ahora la responsable de manejar la lógica de creación/reutilización.
        // Todas las llamadas concurrentes a handleNewWindow esperarán aquí a la misma promesa.
        const tabId = await getOrCreateChatTab();
        
        console.log(`Pestaña lista con ID: ${tabId}. Enviando mensaje.`);
        sendMessageToTab(tabId, eventData);

    } catch (error) {
        console.error('Error final en el flujo de manejo de la pestaña:', error);
        // El reseteo del estado se maneja dentro de getOrCreateChatTab,
        // por lo que aquí solo informamos del error.
    }
}

/**
 * Obtiene el ID de una pestaña de chat existente o crea una nueva.
 * Es "idempotente" y a prueba de condiciones de carrera.
 * @returns {Promise<number>} Una promesa que se resuelve con el ID de la pestaña.
 */
function getOrCreateChatTab() {
    // ---- PASO 1: Bloqueo ----
    // Si ya hay una operación de creación en curso, no hacemos nada nuevo.
    // Simplemente devolvemos la promesa existente para que la nueva llamada espere.
    if (tabCreationPromise) {
        console.log('Una operación de creación de pestaña ya está en curso. Esperando su resultado...');
        return tabCreationPromise;
    }

    // ---- PASO 2: Iniciar Operación ----
    // Si no hay ninguna operación en curso, creamos una nueva promesa y la guardamos.
    // Esto "bloquea" instantáneamente a cualquier otra llamada que llegue después de esta línea.
    tabCreationPromise = new Promise(async (resolve, reject) => {
        try {
            const tabs = await chrome.tabs.query({ url: WindowUrl + "*" });

            if (tabs.length > 0) {
                // ---- CASO A: La pestaña ya existe ----
                console.log('Pestaña de chat encontrada, reutilizándola.');
                const targetTab = tabs[0];
                chatTabId = targetTab.id;
                
                // Aunque ya exista, puede que aún no esté cargada. Esperamos a que lo esté.
                await waitForTabLoad(chatTabId);
                resolve(chatTabId);

            } else {
                // ---- CASO B: La pestaña no existe ----
                console.log('Pestaña de chat no encontrada, creando una nueva en segundo plano.');
                const newTab = await chrome.tabs.create({ url: WindowUrl, active: false });
                chatTabId = newTab.id;

                // La nueva pestaña necesita tiempo para cargar. Esperamos.
                await waitForTabLoad(chatTabId);
                resolve(chatTabId);
            }
        } catch (error) {
            // ---- MANEJO DE ERRORES ----
            console.error('Error durante la creación/búsqueda de la pestaña:', error);
            // Si algo falla, es crucial limpiar el estado para permitir un nuevo intento.
            chatTabId = null;
            tabCreationPromise = null; // Liberamos el "bloqueo".
            reject(error);
        }
    });

    return tabCreationPromise;
}

/**
 * Función de utilidad para esperar a que una pestaña termine de cargar.
 * @param {number} tabId - El ID de la pestaña a observar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando la pestaña está en estado 'complete'.
 */
function waitForTabLoad(tabId) {
    return new Promise(async (resolve) => {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
            resolve();
            return;
        }

        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

/**
 * Listener para limpiar el estado si el usuario cierra la pestaña manualmente.
 * Es una buena práctica para mantener el estado sincronizado.
 */
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId === chatTabId) {
        console.log('El usuario ha cerrado la pestaña de chat. Reiniciando estado.');
        // Reiniciamos AMBAS variables de estado.
        chatTabId = null;
        tabCreationPromise = null;
    }
});

// Escuchar mensajes de content scripts y popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Mensaje recibido en background:', message);
  
  if (message.type === 'TIKTOK_LIVE_EVENT' || 
      message.type === 'KICK_LIVE_EVENT' || 
      message.type === 'TWITCH_LIVE_EVENT') {
    
    const now = Date.now();
    const eventData = {
      type: message.type,
      payload: {
        ...message.payload,
        timestamp: now
      }
    };
    
    // Enviar webhook si está habilitado
    if (WebhookOption && WebhookUrl) {
      console.log('Enviando webhook...');
      const webhookResult = await sendWebhook(WebhookUrl, eventData.payload);
      
      // Notificar resultado al popup si está abierto (CORRECCIÓN AQUÍ)
/*       chrome.runtime.sendMessage({
        type: 'WEBHOOK_RESULT',
        success: webhookResult.success,
        result: webhookResult.result || null,
        error: webhookResult.error || null,
        timestamp: now
      }); */
    }
    
    // Manejar ventana nueva
    await handleNewWindow(message);
    
    // Reenviar a popup si está conectado (CORRECCIÓN AQUÍ)
    /* chrome.runtime.sendMessage(eventData); */
    // Responder al sender
    sendResponse({
        type: 'success',
        ...eventData
      });
  }
  
  // Para mensajes síncronos
  return {
        type: 'success',
        ...message
  }; 
});
function sendMessageToTab(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (msg) => {
      // Este código se ejecuta DENTRO de la página de destino
      window.postMessage(msg, window.location.origin);
    },
    args: [message] // Argumentos que se pasarán a la función
  });
}
// Limpiar referencias de ventanas cerradas
chrome.windows.onRemoved.addListener((windowId) => {
  if (newWindow && newWindow.id === windowId) {
    console.log('Ventana cerrada, limpiando referencia');
    newWindow = null;
  }
});