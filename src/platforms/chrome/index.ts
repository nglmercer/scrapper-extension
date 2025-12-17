/**
 * Chrome Platform Entry Point
 * Exports Chrome-specific implementations and polyfills
 */

export * from '../../types/index.js';
export * from '../../core/storage.js';
export * from '../../core/interceptor.js';

// Chrome-specific exports
export { chromeStorage, ChromeStoragePolyfill } from './storage-polyfill.js';
export { chromeRuntime, ChromeRuntimePolyfill } from './runtime-polyfill.js';

// Re-export core with Chrome implementations
export { storage, CrossPlatformStorage, StorageFactory } from '../../core/storage.js';
export { websocketInterceptor, WebSocketInterceptor } from '../../core/interceptor.js';

// Chrome-specific utilities
export class ChromePlatformUtils {
  /**
   * Check if running in Chrome extension context
   */
  static isChromeExtension(): boolean {
    return typeof chrome !== 'undefined' && 
           typeof chrome.runtime !== 'undefined' && 
           typeof chrome.runtime.id !== 'undefined';
  }

  /**
   * Get Chrome extension ID
   */
  static getExtensionId(): string | undefined {
    if (this.isChromeExtension()) {
      return chrome.runtime.id;
    }
    return undefined;
  }

  /**
   * Check if Chrome storage API is available
   */
  static isStorageAvailable(): boolean {
    return typeof chrome !== 'undefined' && 
           typeof chrome.storage !== 'undefined' && 
           typeof chrome.storage.local !== 'undefined';
  }

  /**
   * Check if Chrome runtime API is available
   */
  static isRuntimeAvailable(): boolean {
    return typeof chrome !== 'undefined' && 
           typeof chrome.runtime !== 'undefined';
  }

  /**
   * Get Chrome manifest version
   */
  static getManifestVersion(): number | undefined {
    if (this.isChromeExtension() && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      return manifest.manifest_version;
    }
    return undefined;
  }

  /**
   * Create Chrome-specific error with context
   */
  static createError(message: string, context?: any): Error {
    const error = new Error(message);
    if (context) {
      (error as any).context = context;
    }
    return error;
  }
}

/**
 * Chrome Extension Background Script Helper
 */
export class ChromeBackgroundHelper {
  private static isInitialized = false;

  /**
   * Initialize background script with common functionality
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('Chrome extension started');
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Chrome extension installed:', details.reason);
      
      // Set default configuration on first install
      if (details.reason === 'install') {
        this.setDefaultConfig();
      }
    });

    this.isInitialized = true;
  }

  /**
   * Set default configuration
   */
  private static async setDefaultConfig(): Promise<void> {
    try {
      const { CrossPlatformStorage } = await import('../../core/storage.js');
      const storage = new CrossPlatformStorage('local');
      await storage.resetConfig();
      console.log('Default configuration set');
    } catch (error) {
      console.error('Failed to set default configuration:', error);
    }
  }

  /**
   * Handle messages from content scripts and popup
   */
  static handleMessage(
    callback: (message: any, sender: any, sendResponse: (response?: any) => void) => Promise<any> | any
  ): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const result = callback(message, sender, sendResponse);
      
      // Handle async callbacks
      if (result instanceof Promise) {
        result.then(sendResponse).catch(error => {
          console.error('Error in message handler:', error);
          sendResponse({ error: error.message });
        });
        return true; // Keep message channel open for async response
      }
      
      return result;
    });
  }
}

/**
 * Chrome Content Script Helper
 */
export class ChromeContentHelper {
  private static isInitialized = false;

  /**
   * Initialize content script with common functionality
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Inject WebSocket interceptor script
    this.injectInterceptorScript();

    this.isInitialized = true;
  }

  /**
   * Inject the WebSocket interceptor script into the page
   */
  private static injectInterceptorScript(): void {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = () => {
        script.remove();
        console.log('WebSocket interceptor script injected');
      };
      script.onerror = () => {
        console.error('Failed to inject WebSocket interceptor script');
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      console.error('Error injecting interceptor script:', error);
    }
  }

  /**
   * Send message to background script
   */
  static async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Connect to background script
   */
  static connect(name?: string): chrome.runtime.Port {
    return chrome.runtime.connect({ name });
  }
}

/**
 * Chrome Popup Helper
 */
export class ChromePopupHelper {
  /**
   * Connect to background script with proper error handling
   */
  static connectToBackground(name: string = 'popup'): chrome.runtime.Port {
    try {
      const port = chrome.runtime.connect({ name });
      
      port.onDisconnect.addListener(() => {
        console.log('Disconnected from background script');
      });

      return port;
    } catch (error) {
      console.error('Failed to connect to background script:', error);
      throw error;
    }
  }

  /**
   * Send message to background script and handle response
   */
  static async sendMessage(message: any): Promise<any> {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message to background:', error);
      throw error;
    }
  }

  /**
   * Get current tab information
   */
  static async getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0];
    } catch (error) {
      console.error('Failed to get current tab:', error);
      return undefined;
    }
  }
}

// Default export
export default {
  ChromePlatformUtils,
  ChromeBackgroundHelper,
  ChromeContentHelper,
  ChromePopupHelper
};