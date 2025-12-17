import { websocketInterceptor as rawInterceptor, FirefoxBackgroundHelper } from '../index.js';
import type { WebSocketConfig } from '../../../types/index.js';

async function initialize() {
  try {
    // Initialize the RAW interceptor
    await rawInterceptor.initialize();
    
    // Set up Firefox-specific background helpers
    FirefoxBackgroundHelper.initialize();
    
    console.log('Firefox extension background script initialized');

    // Handle port connections (from popup)
    // @ts-ignore
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onConnect) {
      // @ts-ignore
      browser.runtime.onConnect.addListener((port: any) => {
        if (port.name === 'popup') {
            console.log('Popup connected');
            
            port.onMessage.addListener(async (message: any) => {
                console.log('Received message on port:', message);
                
                if (message.type === 'GET_CONFIG') {
                    // Read full config from storage
                    // @ts-ignore
                    const stored = await browser.storage.local.get(null);
                    
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
    }

    // Handle standard messages
    FirefoxBackgroundHelper.handleMessage(async (message, sender, sendResponse) => {
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
            // Don't return error for unknown messages as they might be handled by other listeners
            break; 
        }
      } catch (error: any) {
        console.error('Error handling message:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Listen for storage changes
    // @ts-ignore
    if (typeof browser !== 'undefined' && browser.storage) {
        // @ts-ignore
        browser.storage.onChanged.addListener((changes: any, namespace: any) => {
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
    }

  } catch (error) {
    console.error('Failed to initialize background script:', error);
  }
}

initialize();
