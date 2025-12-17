import { websocketInterceptor as rawInterceptor, ChromeBackgroundHelper } from '../index.js';

async function initialize() {
  try {
    // Initialize the RAW interceptor
    await rawInterceptor.initialize();
    
    // Set up Chrome-specific background helpers
    ChromeBackgroundHelper.initialize();
    
    console.log('Chrome extension background script initialized');

    // Handle port connections (from popup)
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup') {
          console.log('Popup connected');
          
          port.onMessage.addListener(async (message) => {
              console.log('Received message on port:', message);
              
              if (message.type === 'GET_CONFIG') {
                  // Read full config from storage
                  const stored = await new Promise((resolve) => {
                      chrome.storage.local.get(null, (items) => resolve(items));
                  });
                  
                  port.postMessage({
                      type: 'CONFIG_UPDATE',
                      config: stored
                  });
              } else if (message.type === 'UPDATE_CONFIG') {
                  // Update interceptor config if present
                  if (message.config && message.config.websockets) {
                      (rawInterceptor as any).updateConfig(message.config.websockets);
                  }
                  // Also broadcast to other contexts if needed
              }
          });
      }
    });

    // Handle standard messages
    ChromeBackgroundHelper.handleMessage(async (message, sender, sendResponse) => {
      // console.log('Background received message:', message);
      
      try {
        switch (message.type) {
          case 'GET_STATS':
            const stats = rawInterceptor.getStats();
            return { success: true, stats };
            
          case 'TOGGLE_DEBUG':
            const debugMode = rawInterceptor.toggleDebugMode();
            return { success: true, debugMode };
            
          case 'TOGGLE_MASTER':
            const masterSwitch = rawInterceptor.toggleMasterSwitch();
            return { success: true, masterSwitch };
            
          case 'UPDATE_CONFIG':
            if (message.config && message.config.websockets) {
                (rawInterceptor as any).updateConfig(message.config.websockets);
            }
            return { success: true };
            
          case 'RAW_DATA_EVENT':
             // Handle intercepted data
             console.log('Background Intercepted:', message.payload);
             return { success: true };

          default:
            // return { success: false, error: 'Unknown message type' };
            break; 
        }
      } catch (error: any) {
        console.error('Error handling message:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.websockets && changes.websockets.newValue) {
                (rawInterceptor as any).updateConfig(changes.websockets.newValue);
            }
            if (changes.masterSwitch) {
                if (changes.masterSwitch.newValue !== rawInterceptor.isEnabled()) {
                    rawInterceptor.toggleMasterSwitch();
                }
            }
            if (changes.debugMode) {
                if (changes.debugMode.newValue !== rawInterceptor.isDebugMode()) {
                    rawInterceptor.toggleDebugMode();
                }
            }
        }
    });

  } catch (error) {
    console.error('Failed to initialize background script:', error);
  }
}

initialize();
