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

// Manejar ventana nueva
async function handleNewWindow(eventData) {
  if (!OpenWindow || !WindowUrl) {
    console.log('Ventana nueva deshabilitada');
    return;
  }

  try {
    if (!newWindow) {
      // Crear nueva ventana
      const window = await chrome.windows.create({
        url: WindowUrl,
        type: 'normal',
        width: 800,
        height: 600
      });
      
      newWindow = window;
      console.log('Nueva ventana creada:', window.id);
      
      // Enviar datos cuando la ventana esté lista
      setTimeout(() => {
        chrome.tabs.query({ windowId: window.id }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: eventData.type,
              payload: eventData.payload
            }).catch(err => console.log('Mensaje no enviado aún:', err.message));
          }
        });
      }, 2000);
      
    } else {
      // Verificar si la ventana sigue abierta
      try {
        await chrome.windows.get(newWindow.id);
        
        // Enviar mensaje a las pestañas de la ventana
        chrome.tabs.query({ windowId: newWindow.id }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: eventData.type,
              payload: eventData.payload
            }).catch(err => console.log('Error enviando mensaje a pestaña:', err.message));
          });
        });
        
      } catch (error) {
        // La ventana fue cerrada, crear una nueva
        console.log('Ventana cerrada, creando nueva...');
        newWindow = null;
        handleNewWindow(eventData); // Recursión para crear nueva ventana
      }
    }
    
  } catch (error) {
    console.error('Error manejando ventana:', error);
    newWindow = null;
  }
}

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
      
      // Notificar resultado al popup si está abierto
      try {
        chrome.runtime.sendMessage({
          type: 'WEBHOOK_RESULT',
          payload: webhookResult
        });
      } catch (error) {
        // El popup no está abierto, no hay problema
      }
    }
    
    // Manejar ventana nueva
    await handleNewWindow(eventData);
    
    // Reenviar a popup si está conectado
    try {
      chrome.runtime.sendMessage({
        type: message.type,
        payload: eventData.payload
      });
    } catch (error) {
      // El popup no está abierto
    }
    
    // Responder al sender
    sendResponse({ success: true, timestamp: now });
  }
  
  // Para mensajes síncronos
  return true;
});

// Limpiar referencias de ventanas cerradas
chrome.windows.onRemoved.addListener((windowId) => {
  if (newWindow && newWindow.id === windowId) {
    console.log('Ventana cerrada, limpiando referencia');
    newWindow = null;
  }
});

// Conectar con popup
const popupPorts = new Set();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    popupPorts.add(port);
    
    // Enviar configuración actual al popup
    port.postMessage({
      type: 'SETTINGS_UPDATE',
      payload: { WebhookUrl, WebhookOption, WindowUrl, OpenWindow }
    });
    
    port.onDisconnect.addListener(() => {
      popupPorts.delete(port);
    });
  }
});

// Función para notificar a todos los popups conectados
function notifyPopups(message) {
  popupPorts.forEach(port => {
    try {
      port.postMessage(message);
    } catch (error) {
      popupPorts.delete(port);
    }
  });
}