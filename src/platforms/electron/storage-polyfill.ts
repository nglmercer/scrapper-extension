/**
 * Electron Storage API Polyfill
 * Provides a consistent interface for Electron storage with fallback support
 * Uses file system storage for Electron main process
 */

import type { ChromeStorage, ChromeStorageArea, StorageChanges, StorageChange } from '@/types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * File-based storage implementation for Electron
 */
class ElectronFileStorageArea implements ChromeStorageArea {
  private storagePath: string;
  private data: Record<string, unknown> = {};
  private listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
  private areaName: string;
  private initialized = false;

  constructor(areaName: string = 'local', appName: string = 'raw-data-interceptor') {
    this.areaName = areaName;
    
    // Determine storage path based on platform
    const homeDir = os.homedir();
    const appDataDir = process.env.APPDATA || 
                      (process.platform === 'darwin' ? path.join(homeDir, 'Library', 'Application Support') : path.join(homeDir, '.config'));
    
    const appDir = path.join(appDataDir, appName);
    this.storagePath = path.join(appDir, `${areaName}-storage.json`);
    
    // Ensure directory exists
    try {
      fs.mkdirSync(appDir, { recursive: true });
      this.loadData();
    } catch (error) {
      console.error(`Error creating storage directory for ${areaName}:`, error);
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const fileContent = fs.readFileSync(this.storagePath, 'utf8');
        this.data = JSON.parse(fileContent);
      }
      this.initialized = true;
    } catch (error) {
      console.error(`Error loading storage data for ${this.areaName}:`, error);
      this.data = {};
      this.initialized = true;
    }
  }

  private saveData(): void {
    try {
      const jsonData = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.storagePath, jsonData, 'utf8');
    } catch (error) {
      console.error(`Error saving storage data for ${this.areaName}:`, error);
    }
  }

  async get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void): void;
  get(keys?: unknown, callback?: unknown): unknown {
    const execute = () => {
      if (!this.initialized) {
        this.loadData();
      }

      if (!keys) {
        return { ...this.data };
      }

      if (typeof keys === 'string') {
        return { [keys]: this.data[keys] };
      }

      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        keys.forEach(key => {
          result[key] = this.data[key];
        });
        return result;
      }

      if (typeof keys === 'object' && keys !== null) {
        const result: Record<string, unknown> = {};
        const k = keys as Record<string, unknown>;
        Object.keys(k).forEach(key => {
          result[key] = this.data[key] ?? k[key];
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
        console.error(`Error in Electron storage get for ${this.areaName}:`, error);
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
      if (!this.initialized) {
        this.loadData();
      }

      const changes: StorageChanges = {};
      
      const it = items as Record<string, unknown>;
      Object.keys(it).forEach(key => {
        const oldValue = this.data[key];
        const newValue = it[key];
        
        this.data[key] = newValue;
        
        if (oldValue !== newValue) {
          changes[key] = { oldValue, newValue };
        }
      });

      // Save to file
      this.saveData();

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
        console.error(`Error in Electron storage set for ${this.areaName}:`, error);
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
      if (!this.initialized) {
        this.loadData();
      }

      const keysArray = Array.isArray(keys) ? keys : [keys];
      const changes: StorageChanges = {};

      keysArray.forEach(key => {
        const oldValue = this.data[key];
        if (this.data.hasOwnProperty(key)) {
          delete this.data[key];
          changes[key] = { oldValue };
        }
      });

      // Save to file
      this.saveData();

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
        console.error(`Error in Electron storage remove for ${this.areaName}:`, error);
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
      if (!this.initialized) {
        this.loadData();
      }

      const changes: StorageChanges = {};
      
      Object.keys(this.data).forEach(key => {
        changes[key] = { oldValue: this.data[key] };
      });

      this.data = {};

      // Save to file
      this.saveData();

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
        console.error(`Error in Electron storage clear for ${this.areaName}:`, error);
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
 * Mock Electron Storage implementation for testing and fallback
 */
class MockElectronStorageArea implements ChromeStorageArea {
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

      if (typeof keys === 'object' && keys !== null) {
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
        console.error('Error in mock Electron storage get:', error);
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
        console.error('Error in mock Electron storage set:', error);
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
        console.error('Error in mock Electron storage remove:', error);
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
        console.error('Error in mock Electron storage clear:', error);
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
 * Electron Storage API implementation with fallback support
 */
export class ElectronStoragePolyfill implements ChromeStorage {
  public local: ChromeStorageArea;
  public sync?: ChromeStorageArea;
  public managed?: ChromeStorageArea;
  public session?: ChromeStorageArea;
  
  public onChanged: {
    addListener: (callback: (changes: StorageChanges, areaName: string) => void) => void;
    removeListener: (callback: (changes: StorageChanges, areaName: string) => void) => void;
    hasListener: (callback: (changes: StorageChanges, areaName: string) => void) => boolean;
  };

  constructor(appName?: string) {
    // Check if we're in Electron environment
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      // Use file-based storage for Electron
      this.local = new ElectronFileStorageArea('local', appName);
      this.sync = new ElectronFileStorageArea('sync', appName);
      this.managed = new ElectronFileStorageArea('managed', appName);
      this.session = new ElectronFileStorageArea('session', appName);
    } else {
      // Fallback to mock implementation
      console.warn('Electron environment not detected, using mock implementation');
      this.local = new MockElectronStorageArea('local');
      this.sync = new MockElectronStorageArea('sync');
      this.managed = new MockElectronStorageArea('managed');
      this.session = new MockElectronStorageArea('session');
    }
    
    // Create a unified onChanged listener
    const listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
    
    this.onChanged = {
      addListener: (callback) => {
        listeners.add(callback);
        // Add to all storage areas
        (this.local as ElectronFileStorageArea).addListener(callback);
        if (this.sync) (this.sync as ElectronFileStorageArea).addListener(callback);
        if (this.managed) (this.managed as ElectronFileStorageArea).addListener(callback);
        if (this.session) (this.session as ElectronFileStorageArea).addListener(callback);
      },
      removeListener: (callback) => {
        listeners.delete(callback);
        // Remove from all storage areas
        (this.local as ElectronFileStorageArea).removeListener(callback);
        if (this.sync) (this.sync as ElectronFileStorageArea).removeListener(callback);
        if (this.managed) (this.managed as ElectronFileStorageArea).removeListener(callback);
        if (this.session) (this.session as ElectronFileStorageArea).removeListener(callback);
      },
      hasListener: (callback) => {
        return listeners.has(callback);
      }
    };
  }

  /**
   * Check if Electron environment is available
   */
  static isAvailable(): boolean {
    return typeof process !== 'undefined' && 
           typeof process.versions !== 'undefined' && 
           typeof process.versions.electron !== 'undefined';
  }

  /**
   * Create a storage polyfill instance
   */
  static create(appName?: string): ElectronStoragePolyfill {
    return new ElectronStoragePolyfill(appName);
  }
}

// Export singleton instance
export const electronStorage = ElectronStoragePolyfill.create();