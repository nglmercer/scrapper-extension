/**
 * Firefox Platform Entry Point
 * Exports Firefox-specific implementations and polyfills
 */

export * from '../../types/index.js';
export * from '../../core/storage.js';
export * from '../../core/interceptor.js';

// Firefox-specific exports
export { firefoxStorage, FirefoxStoragePolyfill } from './storage-polyfill.js';
export { firefoxRuntime, FirefoxRuntimePolyfill } from './runtime-polyfill.js';

// Re-export core with Firefox implementations
export { storage, CrossPlatformStorage, StorageFactory } from '../../core/storage.js';
export { websocketInterceptor, WebSocketInterceptor } from '../../core/interceptor.js';

/**
 * Firefox Platform Utilities
 */
export class FirefoxPlatformUtils {
  /**
   * Check if running in Firefox extension context
   */
  static isFirefoxExtension(): boolean {
    return typeof browser !== 'undefined' && 
           typeof browser.runtime !== 'undefined' && 
           typeof browser.runtime.id !== 'undefined';
  }

  /**
   * Get Firefox extension ID
   */
  static getExtensionId(): string | undefined {
    if (this.isFirefoxExtension()) {
      return browser.runtime.id;
    }
    return undefined;
  }

  /**
   * Check if Firefox storage API is available
   */
  static isStorageAvailable(): boolean {
    return typeof browser !== 'undefined' && 
           typeof browser.storage !== 'undefined' && 
           typeof browser.storage.local !== 'undefined';
  }

  /**
   * Check if Firefox runtime API is available
   */
  static isRuntimeAvailable(): boolean {
    return typeof browser !== 'undefined' && 
           typeof browser.runtime !== 'undefined';
  }

  /**
   * Get Firefox manifest version
   */
  static getManifestVersion(): number | undefined {
    if (this.isFirefoxExtension() && browser.runtime.getManifest) {
      const manifest = browser.runtime.getManifest();
      return manifest.manifest_version;
    }
    return undefined;
  }

  /**
   * Create Firefox-specific error with context
   */
  static createError(message: string, context?: any): Error {
    const error = new Error(message);
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  /**
   * Convert Chrome APIs to Firefox APIs if needed
   */
  static normalizeAPI(): void {
    // Firefox uses 'browser' namespace instead of 'chrome'
    if (typeof chrome === 'undefined' && typeof browser !== 'undefined') {
      (globalThis as any).chrome = browser;
    }
  }
}

/**
 * Firefox Extension Background Script Helper
 */
export class FirefoxBackgroundHelper {
  private static isInitialized = false;

  /**
   * Initialize background script with common functionality
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Normalize APIs
    FirefoxPlatformUtils.normalizeAPI();

    // Handle extension startup
    browser.runtime.onStartup.addListener(() => {
      console.log('Firefox extension started');
    });

    // Handle extension installation
    browser.runtime.onInstalled.addListener((details) => {
      console.log('Firefox extension installed:', details.reason);
      
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
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
 * Firefox Content Script Helper
 */
export class FirefoxContentHelper {
  private static isInitialized = false;

  /**
   * Initialize content script with common functionality
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Normalize APIs
    FirefoxPlatformUtils.normalizeAPI();

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
      script.src = browser.runtime.getURL('injected.js');
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
      browser.runtime.sendMessage(message).then((response) => {
        resolve(response);
      }).catch((error) => {
        reject(new Error(error.message));
      });
    });
  }

  /**
   * Connect to background script
   */
  static connect(name?: string): browser.runtime.Port {
    return browser.runtime.connect({ name });
  }
}

/**
 * Firefox Popup Helper
 */
export class FirefoxPopupHelper {
  /**
   * Connect to background script with proper error handling
   */
  static connectToBackground(name: string = 'popup'): browser.runtime.Port {
    try {
      const port = browser.runtime.connect({ name });
      
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
      return await browser.runtime.sendMessage(message);
    } catch (error) {
      console.error('Failed to send message to background:', error);
      throw error;
    }
  }

  /**
   * Get current tab information
   */
  static async getCurrentTab(): Promise<browser.tabs.Tab | undefined> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      return tabs[0];
    } catch (error) {
      console.error('Failed to get current tab:', error);
      return undefined;
    }
  }
}

// Default export
export default {
  FirefoxPlatformUtils,
  FirefoxBackgroundHelper,
  FirefoxContentHelper,
  FirefoxPopupHelper
};