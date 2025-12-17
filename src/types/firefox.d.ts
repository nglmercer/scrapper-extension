/**
 * Firefox WebExtension API Type Definitions
 * Minimal definitions for browser.* namespace used in the project
 */

declare namespace browser {
  namespace runtime {
    interface Port {
      postMessage(message: any): void;
      disconnect(): void;
      onMessage: {
        addListener(callback: (message: any) => void): void;
        removeListener(callback: (message: any) => void): void;
      };
      onDisconnect: {
        addListener(callback: () => void): void;
        removeListener(callback: () => void): void;
      };
    }

    interface Manifest {
      manifest_version: number;
      [key: string]: any;
    }

    const id: string;
    var lastError: { message: string } | undefined;
    
    function getURL(path: string): string;
    function getManifest(): Manifest;
    function sendMessage(message: any): Promise<any>;
    function connect(connectInfo?: { name?: string }): Port;
    
    const onStartup: {
      addListener(callback: () => void): void;
      removeListener(callback: () => void): void;
    };
    
    const onInstalled: {
      addListener(callback: (details: { reason: string; previousVersion?: string }) => void): void;
      removeListener(callback: (details: { reason: string; previousVersion?: string }) => void): void;
    };
    
    const onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
      removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
      hasListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): boolean;
    };
  }

  namespace storage {
    interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }

    interface StorageArea {
      get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
      set(items: Record<string, any>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
      onChanged: {
        addListener(callback: (changes: Record<string, StorageChange>) => void): void;
        removeListener(callback: (changes: Record<string, StorageChange>) => void): void;
      };
    }

    const local: StorageArea;
    let sync: StorageArea;
    let managed: StorageArea;
    let session: StorageArea;
    
    const onChanged: {
      addListener(callback: (changes: Record<string, StorageChange>, areaName: string) => void): void;
      removeListener(callback: (changes: Record<string, StorageChange>, areaName: string) => void): void;
      hasListener(callback: (changes: Record<string, StorageChange>, areaName: string) => boolean): boolean;
    };
  }

  namespace tabs {
    interface Tab {
      id: number;
      index: number;
      windowId: number;
      openerTabId?: number;
      selected?: boolean;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      mutedInfo?: MutedInfo;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      lastAccessed: number;
      successorId?: number;
      cookieStoreId?: string;
    }

    interface MutedInfo {
      muted: boolean;
      reason?: string;
      extensionId?: string;
    }

    interface QueryInfo {
      active?: boolean;
      pinned?: boolean;
      audible?: boolean;
      muted?: boolean;
      highlighted?: boolean;
      discarded?: boolean;
      autoDiscardable?: boolean;
      currentWindow?: boolean;
      lastFocusedWindow?: boolean;
      status?: string;
      title?: string;
      url?: string | string[];
      windowId?: number;
      windowType?: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
      index?: number;
    }

    function query(queryInfo: QueryInfo): Promise<Tab[]>;
    function get(tabId: number): Promise<Tab>;
    function create(createProperties: {
      url?: string;
      active?: boolean;
      pinned?: boolean;
      windowId?: number;
      openerTabId?: number;
      index?: number;
      cookieStoreId?: string;
    }): Promise<Tab>;
    function remove(tabIds: number | number[]): Promise<void>;
    function update(tabId: number, updateProperties: {
      url?: string;
      active?: boolean;
      highlighted?: boolean;
      pinned?: boolean;
      muted?: boolean;
      openerTabId?: number;
      successorTabId?: number;
    }): Promise<Tab>;
  }
}

// Global browser object
declare const browser: typeof browser;