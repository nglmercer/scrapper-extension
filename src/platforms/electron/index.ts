/**
 * Electron Platform Entry Point
 * Exports Electron-specific implementations and polyfills
 */

export * from '../../types/index.js';
export * from '../../core/storage.js';
export * from '../../core/interceptor.js';

// Electron-specific exports
export { electronStorage, ElectronStoragePolyfill } from './storage-polyfill.js';
export { electronRuntime, ElectronRuntimePolyfill } from './runtime-polyfill.js';

// Re-export core with Electron implementations
export { storage, CrossPlatformStorage, StorageFactory } from '../../core/storage.js';
export { websocketInterceptor, WebSocketInterceptor } from '../../core/interceptor.js';

/**
 * Electron Platform Utilities
 */
export class ElectronPlatformUtils {
  /**
   * Check if running in Electron context
   */
  static isElectron(): boolean {
    // Check for Electron environment
    return typeof process !== 'undefined' && 
           process.versions != null && 
           process.versions.electron != null;
  }

  /**
   * Check if running in Node.js (main process)
   */
  static isNode(): boolean {
    return typeof process !== 'undefined' && 
           process.versions != null && 
           process.versions.node != null;
  }

  /**
   * Check if running in renderer process
   */
  static isRenderer(): boolean {
    return this.isElectron() && 
           typeof window !== 'undefined' && 
           (window as any).process != null;
  }

  /**
   * Get Electron version
   */
  static getElectronVersion(): string | undefined {
    if (this.isElectron()) {
      return process.versions.electron;
    }
    return undefined;
  }

  /**
   * Get Node.js version
   */
  static getNodeVersion(): string | undefined {
    if (this.isNode()) {
      return process.versions.node;
    }
    return undefined;
  }

  /**
   * Get platform information
   */
  static getPlatformInfo(): { platform: string; arch: string; version: string } {
    if (this.isNode()) {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version
      };
    }
    return {
      platform: 'unknown',
      arch: 'unknown',
      version: 'unknown'
    };
  }

  /**
   * Create Electron-specific error with context
   */
  static createError(message: string, context?: any): Error {
    const error = new Error(message);
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  /**
   * Safely access Electron APIs
   */
  static safeRequire<T = any>(module: string): T | null {
    try {
      if (this.isElectron()) {
        return require(module);
      }
    } catch (error) {
      console.warn(`Failed to require ${module}:`, error);
    }
    return null;
  }
}

/**
 * Electron Main Process Helper
 */
export class ElectronMainHelper {
  private static isInitialized = false;

  /**
   * Initialize main process with common functionality
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Check if we're in the main process
    if (!ElectronPlatformUtils.isNode() || ElectronPlatformUtils.isRenderer()) {
      console.warn('ElectronMainHelper should only be used in the main process');
      return;
    }

    console.log('Electron main process initialized');
    this.isInitialized = true;
  }

  /**
   * Set up IPC handlers for renderer communication
   */
  static setupIpcHandlers(): void {
    const { ipcMain } = ElectronPlatformUtils.safeRequire('electron') || {};
    
    if (!ipcMain) {
      console.warn('IPC not available in main process');
      return;
    }

    // Handle configuration requests from renderer
    ipcMain.handle('raw-interceptor:get-config', async () => {
      try {
        const { CrossPlatformStorage } = require('../../core/storage.js');
        const storage = new CrossPlatformStorage('local');
        return await storage.loadConfig();
      } catch (error) {
        console.error('Error getting config:', error);
        return null;
      }
    });

    // Handle configuration updates from renderer
    ipcMain.handle('raw-interceptor:set-config', async (event: any, config: any) => {
      try {
        const { CrossPlatformStorage } = require('../../core/storage.js');
        const storage = new CrossPlatformStorage('local');
        await storage.saveConfig(config);
        return { success: true };
      } catch (error: any) {
        console.error('Error setting config:', error);
        return { success: false, error: error.message || String(error) };
      }
    });

    // Handle WebSocket data from renderer
    ipcMain.handle('raw-interceptor:websocket-data', async (event: any, data: any) => {
      try {
        // Process WebSocket data in main process
        console.log('WebSocket data received in main process:', data);
        return { success: true };
      } catch (error: any) {
        console.error('Error processing WebSocket data:', error);
        return { success: false, error: error.message || String(error) };
      }
    });
  }
}

/**
 * Electron Renderer Process Helper
 */
export class ElectronRendererHelper {
  private static isInitialized = false;

  /**
   * Initialize renderer process with common functionality
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Check if we're in the renderer process
    if (!ElectronPlatformUtils.isRenderer()) {
      console.warn('ElectronRendererHelper should only be used in the renderer process');
      return;
    }

    console.log('Electron renderer process initialized');
    this.isInitialized = true;
  }

  /**
   * Send message to main process
   */
  static async sendToMain(channel: string, ...args: any[]): Promise<any> {
    const { ipcRenderer } = ElectronPlatformUtils.safeRequire('electron') || {};
    
    if (!ipcRenderer) {
      console.warn('IPC not available in renderer process');
      return null;
    }

    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error('Error sending message to main process:', error);
      return null;
    }
  }

  /**
   * Get configuration from main process
   */
  static async getConfig(): Promise<any> {
    return this.sendToMain('raw-interceptor:get-config');
  }

  /**
   * Set configuration in main process
   */
  static async setConfig(config: any): Promise<any> {
    return this.sendToMain('raw-interceptor:set-config', config);
  }

  /**
   * Send WebSocket data to main process
   */
  static async sendWebSocketData(data: any): Promise<any> {
    return this.sendToMain('raw-interceptor:websocket-data', data);
  }
}

/**
 * Electron Preload Script Helper
 */
export class ElectronPreloadHelper {
  /**
   * Expose safe APIs to renderer process
   */
  static exposeAPIs(): void {
    if (!ElectronPlatformUtils.isRenderer()) {
      console.warn('ElectronPreloadHelper should only be used in preload scripts');
      return;
    }

    const { contextBridge, ipcRenderer } = ElectronPlatformUtils.safeRequire('electron') || {};
    
    if (!contextBridge || !ipcRenderer) {
      console.warn('Electron APIs not available for preload');
      return;
    }

    // Expose safe APIs to window
    contextBridge.exposeInMainWorld('electronAPI', {
      getConfig: () => ipcRenderer.invoke('raw-interceptor:get-config'),
      setConfig: (config: any) => ipcRenderer.invoke('raw-interceptor:set-config', config),
      sendWebSocketData: (data: any) => ipcRenderer.invoke('raw-interceptor:websocket-data', data),
      
      // Platform info
      platform: ElectronPlatformUtils.getPlatformInfo(),
      isElectron: true
    });

    console.log('Electron APIs exposed to renderer');
  }
}

// Default export
export default {
  ElectronPlatformUtils,
  ElectronMainHelper,
  ElectronRendererHelper,
  ElectronPreloadHelper
};