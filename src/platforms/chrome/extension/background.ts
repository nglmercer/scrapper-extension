import { ChromeBackgroundHelper } from '../index.js';
import { rawInterceptor, logger } from '@/index.js';

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
          
          // Forward logs to popup
          const removeLogListener = logger.addListener((log) => {
              try {
                  port.postMessage({
                      type: 'LOG_ENTRY',
                      log: log
                  });
              } catch (e) {
                  // Port likely disconnected
                  removeLogListener();
              }
          });

          port.onDisconnect.addListener(() => {
              removeLogListener();
          });
          
          port.onMessage.addListener(async (message: any) => {
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
                  if (message.config) {
                      await rawInterceptor.updateConfig(message.config);
                  }
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
            if (message.config) {
                await rawInterceptor.updateConfig(message.config);
            }
            return { success: true };
            
          case 'RAW_DATA_EVENT':
             // Handle intercepted data via core
             console.log('Background Intercepted:', message.payload);
             await rawInterceptor.processEvent(message);
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
    
    // Listen for storage changes (Core handles this, but we keep an empty listener for compatibility if needed or removed)
    // The core rawInterceptor.initialize() sets up the storage listener.

  } catch (error) {
    console.error('Failed to initialize background script:', error);
  }
}

initialize();
