/**
 * RAW Data Interceptor - Main Entry Point
 * Cross-platform WebSocket data interceptor for Chrome, Firefox, and Electron
 */

import type {
  InterceptorConfig,
  InterceptorStats,
  ConnectionInfo,
  WebSocketMessage,
  StorageChanges
} from './types/index.js';

// Declare chrome API availability
declare var chrome: any;


import { CrossPlatformStorage, StorageFactory, DEFAULT_CONFIG } from './core/storage.js';
import { WebSocketInterceptor } from './core/interceptor.js';
import { logger, Logger } from './core/logger.js';

// Re-export everything
export * from './types/index.js';
export * from './core/storage.js';
export * from './core/interceptor.js';
export * from './core/logger.js';
export * from './platforms/chrome/storage-polyfill.js';
export * from './platforms/chrome/runtime-polyfill.js';

/**
 * Main RAW Interceptor class that orchestrates all components
 */
class RAWInterceptor {
  private isInitialized = false;
  private storage: CrossPlatformStorage;
  private interceptor: WebSocketInterceptor;
  private config: InterceptorConfig;

  // Chat tab management state
  private chatTabId: number | null = null;
  private tabCreationPromise: Promise<number> | null = null;

  private configListenerCleanup: (() => void) | null = null;

  constructor(
    storage?: CrossPlatformStorage,
    interceptor?: WebSocketInterceptor
  ) {
    this.storage = storage || new CrossPlatformStorage('local');
    this.interceptor = interceptor || new WebSocketInterceptor();
    this.config = {
      masterSwitch: true,
      debugMode: false,
      WebhookUrl: '',
      WebhookOption: false,
      WindowUrl: '',
      OpenWindow: false,
      eventBufferSize: 1000,
      nativeMessaging: {
        enabled: false,
        appName: 'com.scrapper.extension.host'
      },
      socketStream: {
        enabled: false,
        url: 'ws://localhost:3000'
      },
      websockets: {
        enabled: true,
        urlFilters: ['webcast'],
        minSize: 10,
        maxSize: 10000,
        excludeStrings: ['hi', 'pong', 'ping']
      }
    };
  }

  /**
   * Safe logger that respects debug mode
   */
  /**
   * Safe logger that respects debug mode
   */
  private log(message: string, ...args: unknown[]): void {
    logger.debug(message, 'RAWInterceptor', args);
  }

  /**
   * Initialize the interceptor with configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }

    try {
      // Load configuration from storage
      const storedConfig = await this.storage.loadConfig();
      this.config = { ...this.config, ...storedConfig };
      
      // Update logger debug mode
      logger.setDebugMode(this.config.debugMode);

      // Update interceptor with WebSocket config
      this.interceptor.updateConfig(this.config.websockets);
      
      // Set debug mode on interceptor
      if (this.config.debugMode !== this.interceptor.isDebugMode()) {
        this.interceptor.toggleDebugMode();
      }
      
      // Set master switch
      if (this.config.masterSwitch !== this.interceptor.isEnabled()) {
        this.interceptor.toggleMasterSwitch();
      }

      // Initialize exports
      this.initNativeMessaging();
      this.initSocketStream();

      // Initialize the interceptor
      await this.interceptor.initialize();

      // Set up configuration change listener
      this.setupConfigListener();

      // Set up tab removal listener if in extension environment
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onRemoved) {
        chrome.tabs.onRemoved.addListener((tabId: number) => {
            if (tabId === this.chatTabId) {
                this.log('El usuario ha cerrado la pestaña de chat. Reiniciando estado.');
                this.chatTabId = null;
                this.tabCreationPromise = null;
            }
        });
      }

      this.isInitialized = true;

      this.log('Initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize', 'RAWInterceptor', error);
      throw error;
    }
  }

  /**
   * Destroy the interceptor and clean up resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      if (this.configListenerCleanup) {
        this.configListenerCleanup();
        this.configListenerCleanup = null;
      }

      await this.interceptor.destroy();
      this.isInitialized = false;
      this.log('Destroyed');
    } catch (error) {
      logger.error('Error destroying', 'RAWInterceptor', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): InterceptorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<InterceptorConfig>): Promise<void> {
    try {
      // Update local config
      this.config = { ...this.config, ...newConfig };
      
      // Update storage
      await this.storage.saveConfig(this.config);
      
      // Update interceptor
      if (newConfig.websockets) {
        this.interceptor.updateConfig(newConfig.websockets);
      }
      
      // Update debug mode if changed
      if (newConfig.debugMode !== undefined) {
          logger.setDebugMode(newConfig.debugMode);
          if (newConfig.debugMode !== this.interceptor.isDebugMode()) {
            this.interceptor.toggleDebugMode();
          }
      }
      
      // Update master switch if changed
      if (newConfig.masterSwitch !== undefined && newConfig.masterSwitch !== this.interceptor.isEnabled()) {
        this.interceptor.toggleMasterSwitch();
      }
      
      // Update Native Messaging
      if (newConfig.nativeMessaging) {
          if (newConfig.nativeMessaging.enabled && !this.nativePort) {
              this.initNativeMessaging();
          } else if (!newConfig.nativeMessaging.enabled && this.nativePort) {
              this.nativePort.disconnect();
              this.nativePort = null;
          }
      }

      // Update Socket Stream
      if (newConfig.socketStream) {
          // Re-init handles enabled check
          this.initSocketStream();
      }

      this.log('Configuration updated');
    } catch (error) {
      logger.error('Error updating configuration', 'RAWInterceptor', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    try {
      await this.storage.resetConfig();
      const defaultConfig = await this.storage.loadConfig();
      await this.updateConfig(defaultConfig);
      this.log('Configuration reset to defaults');
    } catch (error) {
       logger.error('Error resetting configuration', 'RAWInterceptor', error);
      throw error;
    }
  }
  
  // ... (Stats, connections remain same, just ensure they work) ...

  /**
   * Get interceptor statistics
   */
  getStats(): InterceptorStats {
    return this.interceptor.getStats();
  }

  /**
   * Get active connections
   */
  getConnections(): ConnectionInfo[] {
    return this.interceptor.getConnections();
  }

  /**
   * Toggle debug mode
   */
  toggleDebugMode(): boolean {
    const newMode = this.interceptor.toggleDebugMode();
    logger.setDebugMode(newMode);
    this.updateConfig({ debugMode: newMode });
    return newMode;
  }

  /**
   * Toggle master switch
   */
  toggleMasterSwitch(): boolean {
    const newState = this.interceptor.toggleMasterSwitch();
    this.updateConfig({ masterSwitch: newState });
    return newState;
  }

  /**
   * Listen for WebSocket messages
   */
  onMessage(callback: (message: WebSocketMessage) => void): () => void {
    return this.interceptor.onMessage(callback);
  }

  /**
   * Check if interceptor is enabled
   */
  isEnabled(): boolean {
    return this.interceptor.isEnabled();
  }

  /**
   * Check if debug mode is active
   */
  isDebugMode(): boolean {
    return this.interceptor.isDebugMode();
  }

  /**
   * Set up configuration change listener
   */
  private setupConfigListener(): void {
    this.configListenerCleanup = this.storage.onChanged((changes: StorageChanges) => {
      // Handle configuration changes
      try {
        if (changes.masterSwitch || changes.debugMode || changes.websockets) {
          
          // Reload config from storage
          this.storage.loadConfig().then((config: InterceptorConfig) => {
            this.config = config;
            
            // Update interceptor
            if (changes.websockets) {
              this.interceptor.updateConfig(config.websockets);
            }
            
            if (changes.debugMode) {
              const debugMode = changes.debugMode.newValue ?? false;
              logger.setDebugMode(debugMode);
              if (debugMode !== this.interceptor.isDebugMode()) {
                this.interceptor.toggleDebugMode();
              }
            }
            
            if (changes.masterSwitch) {
              const masterSwitch = changes.masterSwitch.newValue ?? true;
              if (masterSwitch !== this.interceptor.isEnabled()) {
                this.interceptor.toggleMasterSwitch();
              }
            }
          }).catch((error: unknown) => {
            logger.error('Error handling configuration change', 'RAWInterceptor', error);
          });
        }
      } catch (error) {
        logger.error('Error in configuration change listener', 'RAWInterceptor', error);
      }
    });
  }


  // Native Messaging State
  private nativePort: any | null = null;
  
  // WebSocket Stream State
  private streamSocket: WebSocket | null = null;
  private streamReconnectTimer: any | null = null;

  /**
   * Initialize Native Messaging
   */
  private initNativeMessaging() {
    if (!this.config.nativeMessaging?.enabled || typeof chrome === 'undefined' || !chrome.runtime?.connectNative) {
      return;
    }

    try {
      const appName = this.config.nativeMessaging.appName;
      this.log(`Connecting to native app: ${appName}`);
      this.nativePort = chrome.runtime.connectNative(appName);
      
      this.nativePort.onDisconnect.addListener(() => {
         this.log('Native messaging disconnected');
         this.nativePort = null;
         // Optional: retry logic if needed, but usually onDisconnect means app closed or not found
         if (chrome.runtime.lastError) {
             logger.error('Native messaging error', 'RAWInterceptor', chrome.runtime.lastError);
         }
      });
      
      this.nativePort.onMessage.addListener((msg: any) => {
          this.log('Received native message:', msg);
          // Handle response if any logic requires it
      });
      
    } catch (e) {
      logger.error('Failed to init native messaging', 'RAWInterceptor', e);
    }
  }

  /**
   * Initialize WebSocket Stream
   */
  private initSocketStream() {
      if (!this.config.socketStream?.enabled) {
          if (this.streamSocket) {
              this.streamSocket.close();
              this.streamSocket = null;
          }
          return;
      }

      const url = this.config.socketStream.url;
      if (!url) return;

      if (this.streamSocket && (this.streamSocket.readyState === WebSocket.OPEN || this.streamSocket.readyState === WebSocket.CONNECTING)) {
          return; // Already connecting or connected
      }

      try {
          this.log(`Connecting to stream socket: ${url}`);
          this.streamSocket = new WebSocket(url);
          
          this.streamSocket.onopen = () => {
              this.log('Stream socket connected');
              // Clear reconnect timer if successful
              if (this.streamReconnectTimer) {
                  clearTimeout(this.streamReconnectTimer);
                  this.streamReconnectTimer = null;
              }
          };
          
          this.streamSocket.onclose = () => {
              this.log('Stream socket closed');
              this.streamSocket = null;
              // Reconnect logic
              this.scheduleStreamReconnect();
          };
          
          this.streamSocket.onerror = (err) => {
              logger.error('Stream socket error', 'RAWInterceptor', err);
          };

      } catch (e) {
          logger.error('Failed to init stream socket', 'RAWInterceptor', e);
          this.scheduleStreamReconnect();
      }
  }

  private scheduleStreamReconnect() {
      if (this.streamReconnectTimer) return;
      if (!this.config.socketStream?.enabled) return;

      this.log('Scheduling stream reconnect in 5s...');
      this.streamReconnectTimer = setTimeout(() => {
          this.streamReconnectTimer = null;
          this.initSocketStream();
      }, 5000);
  }

  /**
   * Process an intercepted event: Send webhook and/or handle new window
   */
  async processEvent(message: any): Promise<void> {
      const { 
          WebhookUrl, WebhookOption, 
          OpenWindow, WindowUrl,
          nativeMessaging, socketStream
      } = this.config;
      
      const now = new Date().toLocaleString();
      const payloadWithTime = {
          ...message.payload,
          time: now
      };
      
      // 1. Webhook
      if (WebhookOption && WebhookUrl) {
          // Don't await webhooks to prevent blocking other outputs? 
          // Previous logic awaited it. Let's keep it async but maybe not await if performance matters.
          // For now, keep await to maintain order/logic flow.
          await this.sendWebhook(WebhookUrl, payloadWithTime);
      }
      
      // 2. Window PostMessage
      if (OpenWindow && WindowUrl) {
          await this.handleNewWindow(message);
      }

      // 3. Native Messaging
      if (nativeMessaging?.enabled && this.nativePort) {
          try {
              this.nativePort.postMessage(payloadWithTime);
          } catch (e) {
              // Port might be disconnected unexpectedly
              logger.error('Error sending native message', 'RAWInterceptor', e);
              this.nativePort = null;
              // Try to reconnect?
              this.initNativeMessaging();
          }
      }

      // 4. WebSocket Stream
      if (socketStream?.enabled && this.streamSocket?.readyState === WebSocket.OPEN) {
          try {
              this.streamSocket.send(JSON.stringify(payloadWithTime));
          } catch (e) {
              logger.error('Error sending to stream socket', 'RAWInterceptor', e);
          }
      }
  }

  /**
   * Send data to the configured webhook
   */
  async sendWebhook(url: string, data: any): Promise<{ success: boolean; result?: any; error?: any }> {
    try {
      this.log('Enviando webhook...');
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
      this.log('Webhook enviado exitosamente:', result);
      return { success: true, result };
      
    } catch (error: any) {
      logger.error('Error enviando webhook', 'RAWInterceptor', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle opening/updating the separate chat window/tab
   */
  async handleNewWindow(eventData: any): Promise<void> {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
          return;
      }
      
      const { WindowUrl, OpenWindow } = this.config;
      if (!OpenWindow || !WindowUrl) {
           // this.log('Opción de ventana/pestaña nueva deshabilitada.');
          return;
      }

      try {
          this.log('Evento recibido. Obteniendo o creando la pestaña de chat...');
          const tabId = await this.getOrCreateChatTab(WindowUrl);
          
          this.log(`Pestaña lista con ID: ${tabId}. Enviando mensaje.`);
          this.sendMessageToTab(tabId, eventData);

      } catch (error) {
          logger.error('Error final en el flujo de manejo de la pestaña', 'RAWInterceptor', error);
      }
  }

  // ... (private helpers getOrCreateChatTab, waitForTabLoad, sendMessageToTab stay mostly same but use this.log / logger.error) ...

  private getOrCreateChatTab(windowUrl: string): Promise<number> {
      if (this.tabCreationPromise) {
          this.log('Una operación de creación de pestaña ya está en curso. Esperando su resultado...');
          return this.tabCreationPromise;
      }

      this.tabCreationPromise = new Promise(async (resolve, reject) => {
          try {
              // @ts-ignore
              const tabs = await chrome.tabs.query({ url: windowUrl + "*" });

              if (tabs.length > 0) {
                  this.log('Pestaña de chat encontrada, reutilizándola.');
                  const targetTab = tabs[0];
                  this.chatTabId = targetTab.id;
                  
                  await this.waitForTabLoad(this.chatTabId!);
                  resolve(this.chatTabId!);

              } else {
                  this.log('Pestaña de chat no encontrada, creando una nueva en segundo plano.');
                  // @ts-ignore
                  const newTab = await chrome.tabs.create({ url: windowUrl, active: false });
                  this.chatTabId = newTab.id;

                  await this.waitForTabLoad(this.chatTabId!);
                  resolve(this.chatTabId!);
              }
          } catch (error) {
              logger.error('Error durante la creación/búsqueda de la pestaña', 'RAWInterceptor', error);
              this.chatTabId = null;
              this.tabCreationPromise = null;
              reject(error);
          }
      });

      return this.tabCreationPromise;
  }

  private waitForTabLoad(tabId: number): Promise<void> {
      return new Promise(async (resolve) => {
          try {
            // @ts-ignore
            const tab = await chrome.tabs.get(tabId);
            if (tab.status === 'complete') {
                resolve();
                return;
            }

            const listener = (updatedTabId: number, changeInfo: any) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    // @ts-ignore
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            // @ts-ignore
            chrome.tabs.onUpdated.addListener(listener);
          } catch (e) {
            resolve();
          }
      });
  }

  private sendMessageToTab(tabId: number, message: any) {
    // @ts-ignore
    if (chrome.scripting) {
      // @ts-ignore
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (msg: any) => {
          window.postMessage(msg, window.location.origin);
        },
        args: [message]
      }).catch((e: any) => logger.error('Error sending message to tab', 'RAWInterceptor', e));
    }
  }
}

// Export singleton instance
const rawInterceptor = new RAWInterceptor();
export { rawInterceptor,RAWInterceptor };
// Default export
export default RAWInterceptor;