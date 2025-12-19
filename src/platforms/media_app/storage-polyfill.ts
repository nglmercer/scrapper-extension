/**
 * Tauri Storage API Polyfill
 * Provides a consistent interface for Tauri storage using the filesystem or native store
 */

import type { ChromeStorage, ChromeStorageArea, StorageChanges } from '@/types/index.js';

// Define the Tauri API types we need
declare global {
  interface Window {
    __TAURI__?: {
       fs: any;
       path: any;
    };
  }
}

/**
 * File-based storage implementation for Tauri
 */
class TauriFileStorageArea implements ChromeStorageArea {
  private data: Record<string, unknown> = {};
  private listeners = new Set<(changes: StorageChanges, areaName: string) => void>();
  private areaName: string;
  private initialized = false;
  private filePath: string = '';

  constructor(areaName: string = 'local') {
    this.areaName = areaName;
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
          const { appConfigDir, join } = window.__TAURI__.path;
          const { exists, readTextFile, writeTextFile, createDir, BaseDirectory } = window.__TAURI__.fs;

          const configDir = await appConfigDir();
          
          // Ensure config dir exists
          try {
              if (!(await exists(configDir))) {
                await createDir(configDir, { recursive: true });
              }
          } catch (e) {
              // Ignore if already exists or permission issues
              console.warn('Tauri config dir check failed', e);
          }

          this.filePath = await join(configDir, `${this.areaName}-storage.json`);

          if (await exists(this.filePath)) {
            const content = await readTextFile(this.filePath);
            this.data = JSON.parse(content);
          }
      }
    } catch (error) {
      console.warn(`Failed to initialize Tauri storage for ${this.areaName}:`, error);
    }
    
    this.initialized = true;
  }

  private async saveData(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__ && this.filePath) {
         const { writeTextFile } = window.__TAURI__.fs;
         await writeTextFile(this.filePath, JSON.stringify(this.data, null, 2));
      }
    } catch (error) {
      console.error(`Error saving Tauri storage data for ${this.areaName}:`, error);
    }
  }

  async get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void): void;
  get(keys?: unknown, callback?: unknown): unknown {
    const execute = async () => {
      await this.ensureInitialized();

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
      execute().then(result => {
        (callback as (items: Record<string, unknown>) => void)(result);
      }).catch(err => {
         console.error(err);
         (callback as (items: Record<string, unknown>) => void)({});
      });
      return;
    }

    return execute();
  }

  async set(items: Record<string, unknown>): Promise<void>;
  set(items: Record<string, unknown>, callback: () => void): void;
  set(items: unknown, callback?: unknown): unknown {
    const execute = async () => {
      await this.ensureInitialized();

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

      await this.saveData();

      // Notify listeners
      if (Object.keys(changes).length > 0) {
        this.listeners.forEach(listener => {
            try { listener(changes, this.areaName); } catch (e) { console.error(e); }
        });
      }
    };

    if (callback) {
      execute().then(() => (callback as () => void)()).catch(() => (callback as () => void)());
      return;
    }

    return execute();
  }

  async remove(keys: string | string[]): Promise<void>;
  remove(keys: string | string[], callback: () => void): void;
  remove(keys: unknown, callback?: unknown): unknown {
     const execute = async () => {
        await this.ensureInitialized();
        const keysArray = Array.isArray(keys) ? keys : [keys as string];
        const changes: StorageChanges = {};

        keysArray.forEach(key => {
             const oldValue = this.data[key];
             if (this.data.hasOwnProperty(key)) {
                 delete this.data[key];
                 changes[key] = { oldValue };
             }
        });

        await this.saveData();
        
        if (Object.keys(changes).length > 0) {
            this.listeners.forEach(listener => {
                try { listener(changes, this.areaName); } catch (e) { console.error(e); }
            });
        }
     };

     if (callback) {
        execute().then(() => (callback as () => void)()).catch(() => (callback as () => void)());
        return;
    }

    return execute();
  }

  async clear(): Promise<void>;
  clear(callback: () => void): void;
  clear(callback?: unknown): unknown {
     const execute = async () => {
        await this.ensureInitialized();
        const changes: StorageChanges = {};
        
        Object.keys(this.data).forEach(key => {
             changes[key] = { oldValue: this.data[key] };
        });

        this.data = {};
        await this.saveData();

        if (Object.keys(changes).length > 0) {
            this.listeners.forEach(listener => {
                try { listener(changes, this.areaName); } catch (e) { console.error(e); }
            });
        }
     };

     if (callback) {
        execute().then(() => (callback as () => void)()).catch(() => (callback as () => void)());
        return;
    }

    return execute();
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
 * Tauri Storage API implementation
 */
export class TauriStoragePolyfill implements ChromeStorage {
  public local: ChromeStorageArea;
  public sync?: ChromeStorageArea;
  
  public onChanged: {
    addListener: (callback: (changes: StorageChanges, areaName: string) => void) => void;
    removeListener: (callback: (changes: StorageChanges, areaName: string) => void) => void;
    hasListener: (callback: (changes: StorageChanges, areaName: string) => void) => boolean;
  };

  constructor() {
    this.local = new TauriFileStorageArea('local');
    // Sync behaves like local in this polyfill
    this.sync = new TauriFileStorageArea('sync');
    
    const listeners = new Set<(changes: StorageChanges, areaName: string) => void>();

    this.onChanged = {
      addListener: (callback) => {
        listeners.add(callback);
        (this.local as TauriFileStorageArea).addListener(callback);
        if (this.sync) (this.sync as TauriFileStorageArea).addListener(callback);
      },
      removeListener: (callback) => {
        listeners.delete(callback);
        (this.local as TauriFileStorageArea).removeListener(callback);
        if (this.sync) (this.sync as TauriFileStorageArea).removeListener(callback);
      },
      hasListener: (callback) => listeners.has(callback)
    };
  }

  static isAvailable(): boolean {
      return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  }

  static create(): TauriStoragePolyfill {
      return new TauriStoragePolyfill();
  }
}

export const tauriStorage = TauriStoragePolyfill.create();
