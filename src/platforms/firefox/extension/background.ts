import { FirefoxBackgroundHelper } from '../index.js';
import { rawInterceptor,logger } from '@/index.js';
// --- USER PROVIDED LOGIC ---
/* eslint-disable no-var */
declare var browser: any;

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
            logger.debug('Popup connected');
            
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
                logger.debug('Received message on port:',"Popup", message);
                
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
                    // Update other config if needed
                    if (message.config) {
                        await rawInterceptor.updateConfig(message.config);
                    }
                }
            });
        }
      });
    }

    // Handle standard messages
    FirefoxBackgroundHelper.handleMessage(async (message, sender, sendResponse) => {
      logger.debug('Background received message:',"Background", message);
      
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
             //logger.debug('Background Intercepted:',"Background", message.payload);
             // Delegate to core
             await rawInterceptor.processEvent(message);
             return {
                 success: true,
             };

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
    // @ts-ignore
    if (typeof browser !== 'undefined' && browser.storage) {
        // @ts-ignore
        browser.storage.onChanged.addListener((changes: any, namespace: any) => {
            if (namespace === 'local') {
                // The core interceptor has its own storage listener, 
                // but if we need to sync anything specific here, we can.
                // Generally, rawInterceptor.initialize() sets up the listener in core.
                // So we might not need this unless there are Firefox specific quirks.
                
                // However, we should ensure the interceptor updates if storage changes
                // The core 'setupConfigListener' does this.
            }
        });
    }

  } catch (error) {
    console.error('Failed to initialize background script:', error);
  }
}

initialize();
