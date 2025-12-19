/**
 * Cross-platform storage abstraction
 * Provides a unified interface for different storage implementations
 */

import type { PlatformStorage, StorageChanges, InterceptorConfig } from '@/types/index.js';
import { chromeStorage } from '@/platforms/chrome/storage-polyfill.js';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: InterceptorConfig = {
  masterSwitch: true,
  debugMode: false,
  WebhookUrl: '',
  WebhookOption: false,
  WindowUrl: '/',
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
    urlFilters: ['webcast', 'tikfinity.zerody.one', 'irc-ws.chat.twitch.tv'],
    minSize: 10,
    maxSize: 10000,
    excludeStrings: ['hi', 'pong', 'ping']
  }
};

/**
 * Cross-platform storage implementation
 */
export class CrossPlatformStorage implements PlatformStorage {
  private changeListeners = new Set<(changes: StorageChanges) => void>();
  private isInitialized = false;

  constructor(
    private storageArea: 'local' | 'sync' | 'managed' | 'session' = 'local'
  ) {
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Set up storage change listener
    chromeStorage.onChanged.addListener((changes, areaName) => {
      if (areaName === this.storageArea) {
        this.notifyListeners(changes);
      }
    });

    this.isInitialized = true;
  }

  private notifyListeners(changes: StorageChanges): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(changes);
      } catch (error) {
        console.error('Error in storage change listener:', error);
      }
    });
  }

  async get<T = any>(key: string): Promise<T | undefined>;
  async get<T = any>(keys: string[]): Promise<Record<string, T>>;
  async get<T = any>(keys: Record<string, T>): Promise<Record<string, T>>;
  async get<T = any>(keys: string | string[] | Record<string, T>): Promise<T | undefined | Record<string, T>> {
    try {
      const storage = this.getStorageArea();
      const result = await storage.get(keys);

      if (typeof keys === 'string') {
        return result[keys] as T;
      }

      return result as Record<string, T>;
    } catch (error) {
      console.error('Error getting storage values:', error);
      
      // Return defaults for failed requests
      if (typeof keys === 'string') {
        return undefined;
      } else if (Array.isArray(keys)) {
        return {} as Record<string, T>;
      } else {
        return keys as Record<string, T>;
      }
    }
  }

  async set<T = any>(key: string, value: T): Promise<void>;
  async set<T = any>(items: Record<string, T>): Promise<void>;
  async set<T = any>(keyOrItems: string | Record<string, T>, value?: T): Promise<void> {
    try {
      const storage = this.getStorageArea();
      
      if (typeof keyOrItems === 'string' && value !== undefined) {
        await storage.set({ [keyOrItems]: value });
      } else if (typeof keyOrItems === 'object') {
        await storage.set(keyOrItems as Record<string, any>);
      } else {
        throw new Error('Invalid arguments for storage.set');
      }
    } catch (error) {
      console.error('Error setting storage values:', error);
      throw error;
    }
  }

  async remove(key: string | string[]): Promise<void> {
    try {
      const storage = this.getStorageArea();
      await storage.remove(key);
    } catch (error) {
      console.error('Error removing storage values:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const storage = this.getStorageArea();
      await storage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  onChanged(callback: (changes: StorageChanges) => void): () => void {
    this.changeListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  private getStorageArea() {
    const storage = chromeStorage[this.storageArea];
    if (!storage) {
      throw new Error(`Storage area '${this.storageArea}' is not available`);
    }
    return storage;
  }

  /**
   * Load configuration with defaults
   */
  async loadConfig(): Promise<InterceptorConfig> {
    try {
      const stored = await this.get<Partial<InterceptorConfig>>([
        'masterSwitch',
        'debugMode',
        'WebhookUrl',
        'WebhookOption',
        'WindowUrl',
        'OpenWindow',
        'eventBufferSize',
        'nativeMessaging',
        'socketStream',
        'websockets'
      ]);

      // Filter out undefined values and merge with defaults
      const filteredStored = Object.fromEntries(
        Object.entries(stored).filter(([_, value]) => value !== undefined)
      );

      return {
        ...DEFAULT_CONFIG,
        ...filteredStored
      };
    } catch (error) {
      console.error('Error loading configuration, using defaults:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save configuration
   */
  async saveConfig(config: Partial<InterceptorConfig>): Promise<void> {
    try {
      await this.set(config);
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    try {
      await this.clear();
      await this.saveConfig(DEFAULT_CONFIG);
    } catch (error) {
      console.error('Error resetting configuration:', error);
      throw error;
    }
  }

  /**
   * Get a specific configuration value
   */
  async getConfigValue<K extends keyof InterceptorConfig>(key: K): Promise<InterceptorConfig[K]> {
    const value = await this.get<InterceptorConfig[K]>(key);
    return value ?? DEFAULT_CONFIG[key];
  }

  /**
   * Set a specific configuration value
   */
  async setConfigValue<K extends keyof InterceptorConfig>(key: K, value: InterceptorConfig[K]): Promise<void> {
    await this.set(key, value);
  }
}

/**
 * Storage factory for creating platform-specific storage instances
 */
export class StorageFactory {
  private static instances = new Map<string, CrossPlatformStorage>();

  static create(storageArea: 'local' | 'sync' | 'managed' | 'session' = 'local'): CrossPlatformStorage {
    const key = storageArea;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, new CrossPlatformStorage(storageArea));
    }
    
    return this.instances.get(key)!;
  }

  static clearCache(): void {
    this.instances.clear();
  }
}

// Export default storage instance
export const storage = StorageFactory.create('local');