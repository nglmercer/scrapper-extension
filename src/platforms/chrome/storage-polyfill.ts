/**
 * Chrome Storage API Polyfill
 * Provides a consistent interface for Chrome storage API with fallback support
 */

import type { ChromeStorage, ChromeStorageArea, StorageChanges, StorageChange } from '@/types/index.js';

/**
 * Mock Chrome Storage Area implementation for testing and fallback
 */
class MockStorageArea implements ChromeStorageArea {
  private storage = new Map<string, unknown>();
  private listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
  private areaName: string;

  constructor(areaName: string = 'local') {
    this.areaName = areaName;
  }

  async get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void): void;
  get(keys?: unknown, callback?: unknown): unknown {
    const execute = () => {
      if (!keys) {
        return Object.fromEntries(this.storage);
      }

      if (typeof keys === 'string') {
        return { [keys]: this.storage.get(keys) };
      }

      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        keys.forEach(key => {
          result[key] = this.storage.get(key);
        });
        return result;
      }

      if (typeof keys === 'object') {
        const result: Record<string, unknown> = {};
        const k = keys as Record<string, unknown>;
        Object.keys(k).forEach(key => {
          result[key] = this.storage.get(key) ?? k[key];
        });
        return result;
      }

      return {};
    };

    if (callback) {
      try {
        const result = execute();
        (callback as (items: Record<string, unknown>) => void)(result);
      } catch (error) {
        console.error('Error in mock storage get:', error);
        (callback as (items: Record<string, unknown>) => void)({});
      }
      return;
    }

    return Promise.resolve(execute());
  }

  async set(items: Record<string, unknown>): Promise<void>;
  set(items: Record<string, unknown>, callback: () => void): void;
  set(items: unknown, callback?: unknown): unknown {
    const execute = () => {
      const changes: StorageChanges = {};
      const it = items as Record<string, unknown>;
      
      Object.keys(it).forEach(key => {
        const oldValue = this.storage.get(key);
        const newValue = it[key];
        
        this.storage.set(key, newValue);
        
        if (oldValue !== newValue) {
          changes[key] = { oldValue, newValue };
        }
      });

      // Notify listeners of changes
      if (Object.keys(changes).length > 0) {
        this.listeners.forEach(listener => {
          try {
            listener(changes, this.areaName);
          } catch (error) {
            console.error('Error in storage change listener:', error);
          }
        });
      }
    };

    if (callback) {
      try {
        execute();
        (callback as () => void)();
      } catch (error) {
        console.error('Error in mock storage set:', error);
        (callback as () => void)();
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        execute();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async remove(keys: string | string[]): Promise<void>;
  remove(keys: string | string[], callback: () => void): void;
  remove(keys: unknown, callback?: unknown): unknown {
    const execute = () => {
      const keysArray = Array.isArray(keys) ? keys : [keys as string];
      const changes: StorageChanges = {};

      keysArray.forEach(key => {
        const oldValue = this.storage.get(key);
        if (this.storage.has(key)) {
          this.storage.delete(key);
          changes[key] = { oldValue };
        }
      });

      // Notify listeners of changes
      if (Object.keys(changes).length > 0) {
        this.listeners.forEach(listener => {
          try {
            listener(changes, this.areaName);
          } catch (error) {
            console.error('Error in storage change listener:', error);
          }
        });
      }
    };

    if (callback) {
      try {
        execute();
        (callback as () => void)();
      } catch (error) {
        console.error('Error in mock storage remove:', error);
        (callback as () => void)();
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        execute();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async clear(): Promise<void>;
  clear(callback: () => void): void;
  clear(callback?: unknown): unknown {
    const execute = () => {
      const changes: StorageChanges = {};
      
      this.storage.forEach((value, key) => {
        changes[key] = { oldValue: value };
      });

      this.storage.clear();

      // Notify listeners of changes
      if (Object.keys(changes).length > 0) {
        this.listeners.forEach(listener => {
          try {
            listener(changes, this.areaName);
          } catch (error) {
            console.error('Error in storage change listener:', error);
          }
        });
      }
    };

    if (callback) {
      try {
        execute();
        (callback as () => void)();
      } catch (error) {
        console.error('Error in mock storage clear:', error);
        (callback as () => void)();
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        execute();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  addListener(callback: (changes: StorageChanges, areaName: string) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (changes: StorageChanges, areaName: string) => void): void {
    this.listeners.delete(callback);
  }

  hasListener(callback: (changes: StorageChanges, areaName: string) => void): boolean {
    return this.listeners.has(callback);
  }
}

/**
 * Chrome Storage API implementation with fallback support
 */
export class ChromeStoragePolyfill implements ChromeStorage {
  public local: ChromeStorageArea;
  public sync?: ChromeStorageArea;
  public managed?: ChromeStorageArea;
  public session?: ChromeStorageArea;
  
  public onChanged: {
    addListener: (callback: (changes: StorageChanges, areaName: string) => void) => void;
    removeListener: (callback: (changes: StorageChanges, areaName: string) => void) => void;
    hasListener: (callback: (changes: StorageChanges, areaName: string) => void) => boolean;
  };

  constructor() {
    // Try to use real Chrome storage API if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      this.local = chrome.storage.local;
      this.sync = chrome.storage.sync;
      this.managed = chrome.storage.managed;
      this.session = chrome.storage.session;
      this.onChanged = chrome.storage.onChanged;
    } else {
      // Fallback to mock implementation
      console.warn('Chrome storage API not available, using mock implementation');
      this.local = new MockStorageArea('local');
      this.sync = new MockStorageArea('sync');
      this.managed = new MockStorageArea('managed');
      this.session = new MockStorageArea('session');
      
      // Create a unified onChanged listener
      const listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
      
      this.onChanged = {
        addListener: (callback) => {
          listeners.add(callback);
          // Add to all storage areas
          (this.local as MockStorageArea).addListener(callback);
          if (this.sync) (this.sync as MockStorageArea).addListener(callback);
          if (this.managed) (this.managed as MockStorageArea).addListener(callback);
          if (this.session) (this.session as MockStorageArea).addListener(callback);
        },
        removeListener: (callback) => {
          listeners.delete(callback);
          // Remove from all storage areas
          (this.local as MockStorageArea).removeListener(callback);
          if (this.sync) (this.sync as MockStorageArea).removeListener(callback);
          if (this.managed) (this.managed as MockStorageArea).removeListener(callback);
          if (this.session) (this.session as MockStorageArea).removeListener(callback);
        },
        hasListener: (callback) => {
          return listeners.has(callback);
        }
      };
    }
  }

  /**
   * Check if Chrome storage API is available
   */
  static isAvailable(): boolean {
    return typeof chrome !== 'undefined' && 
           typeof chrome.storage !== 'undefined' && 
           typeof chrome.storage.local !== 'undefined';
  }

  /**
   * Create a storage polyfill instance
   */
  static create(): ChromeStoragePolyfill {
    return new ChromeStoragePolyfill();
  }
}

// Export singleton instance
export const chromeStorage = ChromeStoragePolyfill.create();