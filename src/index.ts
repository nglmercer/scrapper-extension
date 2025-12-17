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

import { CrossPlatformStorage, StorageFactory, DEFAULT_CONFIG } from './core/storage.js';
import { WebSocketInterceptor } from './core/interceptor.js';

// Re-export everything
export * from './types/index.js';
export * from './core/storage.js';
export * from './core/interceptor.js';
export * from './platforms/chrome/storage-polyfill.js';
export * from './platforms/chrome/runtime-polyfill.js';

/**
 * Main RAW Interceptor class that orchestrates all components
 */
export class RAWInterceptor {
  private isInitialized = false;
  private storage: CrossPlatformStorage;
  private interceptor: WebSocketInterceptor;
  private config: InterceptorConfig;

  constructor() {
    this.storage = new CrossPlatformStorage('local');
    this.interceptor = new WebSocketInterceptor();
    this.config = {
      masterSwitch: true,
      debugMode: false,
      WebhookUrl: '',
      WebhookOption: false,
      WindowUrl: 'https://nglmercer.github.io/multistreamASTRO/chat',
      OpenWindow: false,
      eventBufferSize: 1000,
      websockets: {
        enabled: true,
        urlFilters: ['webcast', 'tikfinity.zerody.one', 'irc-ws.chat.twitch.tv'],
        minSize: 10,
        maxSize: 10000,
        excludeStrings: ['hi', 'pong', 'ping']
      }
    };
  }

  /**
   * Initialize the interceptor with configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('RAW Interceptor already initialized');
      return;
    }

    try {
      // Load configuration from storage
      const storedConfig = await this.storage.loadConfig();
      this.config = { ...this.config, ...storedConfig };
      
      // Update interceptor with WebSocket config
      this.interceptor.updateConfig(this.config.websockets);
      
      // Set debug mode
      if (this.config.debugMode !== this.interceptor.isDebugMode()) {
        this.interceptor.toggleDebugMode();
      }
      
      // Set master switch
      if (this.config.masterSwitch !== this.interceptor.isEnabled()) {
        this.interceptor.toggleMasterSwitch();
      }

      // Initialize the interceptor
      await this.interceptor.initialize();

      // Set up configuration change listener
      this.setupConfigListener();

      this.isInitialized = true;
      console.log('RAW Interceptor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RAW Interceptor:', error);
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
      await this.interceptor.destroy();
      this.isInitialized = false;
      console.log('RAW Interceptor destroyed');
    } catch (error) {
      console.error('Error destroying RAW Interceptor:', error);
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
      if (newConfig.debugMode !== undefined && newConfig.debugMode !== this.interceptor.isDebugMode()) {
        this.interceptor.toggleDebugMode();
      }
      
      // Update master switch if changed
      if (newConfig.masterSwitch !== undefined && newConfig.masterSwitch !== this.interceptor.isEnabled()) {
        this.interceptor.toggleMasterSwitch();
      }
      
      console.log('Configuration updated');
    } catch (error) {
      console.error('Error updating configuration:', error);
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
      console.log('Configuration reset to defaults');
    } catch (error) {
      console.error('Error resetting configuration:', error);
      throw error;
    }
  }

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
    this.storage.onChanged((changes: StorageChanges) => {
      // Handle configuration changes
      if (changes.masterSwitch || changes.debugMode || changes.websockets) {
        console.log('Configuration changed externally, updating interceptor');
        
        // Reload config from storage
        this.storage.loadConfig().then((config: InterceptorConfig) => {
          this.config = config;
          
          // Update interceptor
          if (changes.websockets) {
            this.interceptor.updateConfig(config.websockets);
          }
          
          if (changes.debugMode) {
            const debugMode = changes.debugMode.newValue ?? false;
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
        }).catch((error: any) => {
          console.error('Error handling configuration change:', error);
        });
      }
    });
  }
}

// Export singleton instance
export const rawInterceptor = new RAWInterceptor();

// Default export
export default RAWInterceptor;