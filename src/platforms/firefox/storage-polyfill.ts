/**
 * Firefox Storage API Polyfill
 * Provides a consistent interface for Firefox storage API with fallback support
 * Firefox uses the browser.* namespace instead of chrome.*
 */

import type { ChromeStorage, ChromeStorageArea, StorageChanges, StorageChange } from '@/types/index.js';

/**
 * Firefox Storage Area implementation
 * Wraps browser.storage API to match Chrome's interface
 */
class FirefoxStorageArea implements ChromeStorageArea {
  private storageArea: browser.storage.StorageArea;
  private areaName: string;

  constructor(area: browser.storage.StorageArea, areaName: string = 'local') {
    this.storageArea = area;
    this.areaName = areaName;
  }

  async get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
  get(keys: string | string[] | Record<string, any> | null, callback: (items: Record<string, any>) => void): void;
  get(keys?: any, callback?: any): any {
    const execute = async () => {
      try {
        if (!keys) {
          return await this.storageArea.get();
        }

        if (typeof keys === 'string') {
          const result = await this.storageArea.get(keys);
          return result;
        }

        if (Array.isArray(keys)) {
          const result = await this.storageArea.get(keys);
          return result;
        }

        if (typeof keys === 'object') {
          const result = await this.storageArea.get(keys);
          return result;
        }

        return {};
      } catch (error) {
        console.error(`Error in Firefox storage get for ${this.areaName}:`, error);
        return {};
      }
    };

    if (callback) {
      execute()
        .then(result => callback(result))
        .catch(() => callback({}));
      return;
    }

    return execute();
  }

  async set(items: Record<string, any>): Promise<void>;
  set(items: Record<string, any>, callback: () => void): void;
  set(items: any, callback?: any): any {
    const execute = async () => {
      try {
        await this.storageArea.set(items);
      } catch (error) {
        console.error(`Error in Firefox storage set for ${this.areaName}:`, error);
        throw error;
      }
    };

    if (callback) {
      execute()
        .then(() => callback())
        .catch(() => callback());
      return;
    }

    return execute();
  }

  async remove(keys: string | string[]): Promise<void>;
  remove(keys: string | string[], callback: () => void): void;
  remove(keys: any, callback?: any): any {
    const execute = async () => {
      try {
        await this.storageArea.remove(keys);
      } catch (error) {
        console.error(`Error in Firefox storage remove for ${this.areaName}:`, error);
        throw error;
      }
    };

    if (callback) {
      execute()
        .then(() => callback())
        .catch(() => callback());
      return;
    }

    return execute();
  }

  async clear(): Promise<void>;
  clear(callback: () => void): void;
  clear(callback?: any): any {
    const execute = async () => {
      try {
        await this.storageArea.clear();
      } catch (error) {
        console.error(`Error in Firefox storage clear for ${this.areaName}:`, error);
        throw error;
      }
    };

    if (callback) {
      execute()
        .then(() => callback())
        .catch(() => callback());
      return;
    }

    return execute();
  }

  addListener(callback: (changes: StorageChanges, areaName: string) => void): void {
    this.storageArea.onChanged.addListener((changes: Record<string, browser.storage.StorageChange>) => {
      // Convert Firefox format to Chrome format
      const chromeChanges: StorageChanges = {};
      
      for (const [key, change] of Object.entries(changes)) {
        chromeChanges[key] = {
          oldValue: change.oldValue,
          newValue: change.newValue
        };
      }

      try {
        callback(chromeChanges, this.areaName);
      } catch (error) {
        console.error('Error in Firefox storage change listener:', error);
      }
    });
  }

  removeListener(callback: (changes: StorageChanges, areaName: string) => void): void {
    // Firefox doesn't provide a way to remove specific listeners
    // This is a limitation of the Firefox API
    console.warn('Firefox storage removeListener not fully supported');
  }

  hasListener(callback: (changes: StorageChanges, areaName: string) => void): boolean {
    // Firefox doesn't provide a way to check for specific listeners
    console.warn('Firefox storage hasListener not supported');
    return false;
  }
}

/**
 * Mock Firefox Storage implementation for testing and fallback
 */
class MockFirefoxStorageArea implements ChromeStorageArea {
  private storage = new Map<string, any>();
  private listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
  private areaName: string;

  constructor(areaName: string = 'local') {
    this.areaName = areaName;
  }

  async get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
  get(keys: string | string[] | Record<string, any> | null, callback: (items: Record<string, any>) => void): void;
  get(keys?: any, callback?: any): any {
    const execute = () => {
      if (!keys) {
        return Object.fromEntries(this.storage);
      }

      if (typeof keys === 'string') {
        return { [keys]: this.storage.get(keys) };
      }

      if (Array.isArray(keys)) {
        const result: Record<string, any> = {};
        keys.forEach(key => {
          result[key] = this.storage.get(key);
        });
        return result;
      }

      if (typeof keys === 'object') {
        const result: Record<string, any> = {};
        Object.keys(keys).forEach(key => {
          result[key] = this.storage.get(key) ?? keys[key];
        });
        return result;
      }

      return {};
    };

    if (callback) {
      try {
        const result = execute();
        callback(result);
      } catch (error) {
        console.error('Error in mock Firefox storage get:', error);
        callback({});
      }
      return;
    }

    return Promise.resolve(execute());
  }

  async set(items: Record<string, any>): Promise<void>;
  set(items: Record<string, any>, callback: () => void): void;
  set(items: any, callback?: any): any {
    const execute = () => {
      const changes: StorageChanges = {};
      
      Object.keys(items).forEach(key => {
        const oldValue = this.storage.get(key);
        const newValue = items[key];
        
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
            console.error('Error in Firefox storage change listener:', error);
          }
        });
      }
    };

    if (callback) {
      try {
        execute();
        callback();
      } catch (error) {
        console.error('Error in mock Firefox storage set:', error);
        callback();
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
  remove(keys: any, callback?: any): any {
    const execute = () => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
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
            console.error('Error in Firefox storage change listener:', error);
          }
        });
      }
    };

    if (callback) {
      try {
        execute();
        callback();
      } catch (error) {
        console.error('Error in mock Firefox storage remove:', error);
        callback();
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
  clear(callback?: any): any {
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
            console.error('Error in Firefox storage change listener:', error);
          }
        });
      }
    };

    if (callback) {
      try {
        execute();
        callback();
      } catch (error) {
        console.error('Error in mock Firefox storage clear:', error);
        callback();
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
 * Firefox Storage API implementation with fallback support
 */
export class FirefoxStoragePolyfill implements ChromeStorage {
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
    // Try to use real Firefox storage API if available
    if (typeof browser !== 'undefined' && browser.storage) {
      this.local = new FirefoxStorageArea(browser.storage.local, 'local');
      this.sync = browser.storage.sync ? new FirefoxStorageArea(browser.storage.sync, 'sync') : undefined;
      this.managed = browser.storage.managed ? new FirefoxStorageArea(browser.storage.managed, 'managed') : undefined;
      this.session = browser.storage.session ? new FirefoxStorageArea(browser.storage.session, 'session') : undefined;
      
      // Create unified onChanged listener
      const listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
      
      this.onChanged = {
        addListener: (callback) => {
          listeners.add(callback);
          (this.local as any).addListener(callback);
          if (this.sync) (this.sync as any).addListener(callback);
          if (this.managed) (this.managed as any).addListener(callback);
          if (this.session) (this.session as any).addListener(callback);
        },
        removeListener: (callback) => {
          listeners.delete(callback);
          (this.local as any).removeListener(callback);
          if (this.sync) (this.sync as any).removeListener(callback);
          if (this.managed) (this.managed as any).removeListener(callback);
          if (this.session) (this.session as any).removeListener(callback);
        },
        hasListener: (callback) => {
          return listeners.has(callback);
        }
      };
    } else {
      // Fallback to mock implementation
      console.warn('Firefox storage API not available, using mock implementation');
      this.local = new MockFirefoxStorageArea('local');
      this.sync = new MockFirefoxStorageArea('sync');
      this.managed = new MockFirefoxStorageArea('managed');
      this.session = new MockFirefoxStorageArea('session');
      
      // Create a unified onChanged listener
      const listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
      
      this.onChanged = {
        addListener: (callback) => {
          listeners.add(callback);
          // Add to all storage areas
          (this.local as MockFirefoxStorageArea).addListener(callback);
          if (this.sync) (this.sync as MockFirefoxStorageArea).addListener(callback);
          if (this.managed) (this.managed as MockFirefoxStorageArea).addListener(callback);
          if (this.session) (this.session as MockFirefoxStorageArea).addListener(callback);
        },
        removeListener: (callback) => {
          listeners.delete(callback);
          // Remove from all storage areas
          (this.local as MockFirefoxStorageArea).removeListener(callback);
          if (this.sync) (this.sync as MockFirefoxStorageArea).removeListener(callback);
          if (this.managed) (this.managed as MockFirefoxStorageArea).removeListener(callback);
          if (this.session) (this.session as MockFirefoxStorageArea).removeListener(callback);
        },
        hasListener: (callback) => {
          return listeners.has(callback);
        }
      };
    }
  }

  /**
   * Check if Firefox storage API is available
   */
  static isAvailable(): boolean {
    return typeof browser !== 'undefined' && 
           typeof browser.storage !== 'undefined' && 
           typeof browser.storage.local !== 'undefined';
  }

  /**
   * Create a storage polyfill instance
   */
  static create(): FirefoxStoragePolyfill {
    return new FirefoxStoragePolyfill();
  }
}

// Export singleton instance
export const firefoxStorage = FirefoxStoragePolyfill.create();