/**
 * Tauri Platform Entry Point
 */

export * from '../../types/index.js';
export * from '../../core/storage.js';
export * from '../../core/interceptor.js';

// Tauri-specific exports
export { tauriStorage, TauriStoragePolyfill } from './storage-polyfill.js';

import { CrossPlatformStorage } from '../../core/storage.js';
import { websocketInterceptor } from '../../core/interceptor.js';
import { tauriStorage } from './storage-polyfill.js';
import { RAWInterceptor } from '@/index.js';

/**
 * Tauri Platform Utilities
 */
export class TauriPlatformUtils {
  static isTauri(): boolean {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  }
}

/**
 * Tauri Helper to initialize the interceptor
 */
export class TauriHelper {
  private static isInitialized = false;

  /**
   * Initialize the interceptor in the Tauri WebView context
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (!TauriPlatformUtils.isTauri()) {
        console.warn('Tauri helper called outside of Tauri environment');
        return;
    }

    console.log('Initializing RAW Interceptor for Tauri...');

    try {
        // 1. Setup Storage with Tauri backend
        const storage = new CrossPlatformStorage('local', tauriStorage);
        
        // 2. Initialize the Interceptor
        const interceptor = new RAWInterceptor(storage, websocketInterceptor);
        await interceptor.initialize();

        // 3. Expose to window for debugging or frontend control
        (window as any).rawInterceptor = interceptor;
        
        console.log('RAW Interceptor initialized successfully in Tauri.');
        
    } catch (e) {
        console.error('Failed to initialize Tauri Interceptor:', e);
    }

    this.isInitialized = true;
  }
}

export default {
    TauriPlatformUtils,
    TauriHelper
};
