/**
 * Chrome Runtime API Polyfill
 * Provides a consistent interface for Chrome runtime API with fallback support
 */

import type { ChromeRuntime } from '@/types/index.js';

/**
 * Mock Chrome Runtime implementation for testing and fallback
 */
class MockRuntime implements ChromeRuntime {
  public lastError?: { message: string };
  
  private messageListeners = new Set<(message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void>();
  private startupListeners = new Set<() => void>();
  private installedListeners = new Set<(details: {reason: string, previousVersion?: string}) => void>();
  public connections = new Map<string, MockConnection>();

  get onMessage() {
    return {
      addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => {
        this.messageListeners.add(callback);
      },
      removeListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => {
        this.messageListeners.delete(callback);
      },
      hasListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => {
        return this.messageListeners.has(callback);
      }
    };
  }

  get onStartup() {
    return {
      addListener: (callback: () => void) => {
        this.startupListeners.add(callback);
      },
      removeListener: (callback: () => void) => {
        this.startupListeners.delete(callback);
      }
    };
  }

  get onInstalled() {
    return {
      addListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        this.installedListeners.add(callback);
      },
      removeListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        this.installedListeners.delete(callback);
      }
    };
  }

  async sendMessage(message: unknown): Promise<unknown>;
  sendMessage(message: unknown, callback: (response: unknown) => void): void;
  sendMessage(extensionId: string, message: unknown, callback: (response: unknown) => void): void;
  sendMessage(messageOrExtensionId: unknown, messageOrCallback?: unknown, callback?: unknown): unknown {
    const isThreeParams = typeof messageOrExtensionId === 'string';
    const message = isThreeParams ? messageOrCallback : messageOrExtensionId;
    // eslint-disable-next-line @typescript-eslint/ban-types
    const cb = (isThreeParams ? callback : messageOrCallback) as Function | undefined;

    const execute = async () => {
      // Simulate message handling
      let response: unknown = undefined;
      let wasHandled = false;

      // Try to handle with listeners
      for (const listener of this.messageListeners) {
        try {
          const result = listener(message, { id: 'mock-sender' }, (resp: unknown) => {
            response = resp;
            wasHandled = true;
          });
          
          if (result === true) {
            wasHandled = true;
          }
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      }

      if (!wasHandled) {
        // Default response
        response = { type: 'success', message: 'Message received' };
      }

      return response;
    };

    if (cb) {
      execute()
        .then(response => cb(response))
        .catch((error: unknown) => cb({ error: error instanceof Error ? error.message : 'Unknown error' }));
      return;
    }

    return execute();
  }

  connect(connectInfo?: {name?: string}): {
    postMessage(message: unknown): void;
    disconnect(): void;
    onMessage: {
      addListener(callback: (message: unknown) => void): void;
      removeListener(callback: (message: unknown) => void): void;
    };
    onDisconnect: {
      addListener(callback: () => void): void;
      removeListener(callback: () => void): void;
    };
  } {
    const connectionName = connectInfo?.name || `connection_${Date.now()}`;
    
    if (this.connections.has(connectionName)) {
      return this.connections.get(connectionName)!;
    }

    const connection = new MockConnection(connectionName, this);
    this.connections.set(connectionName, connection);
    
    return connection;
  }

  /**
   * Trigger startup event (for testing)
   */
  triggerStartup() {
    this.startupListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in startup listener:', error);
      }
    });
  }

  /**
   * Trigger installed event (for testing)
   */
  triggerInstalled(details: {reason: string, previousVersion?: string}) {
    this.installedListeners.forEach(listener => {
      try {
        listener(details);
      } catch (error) {
        console.error('Error in installed listener:', error);
      }
    });
  }

  /**
   * Simulate receiving a message (for testing)
   */
  simulateMessage(message: unknown, sender?: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      let response: unknown = undefined;
      let wasHandled = false;

      for (const listener of this.messageListeners) {
        try {
          const result = listener(message, sender || { id: 'mock-sender' }, (resp: unknown) => {
            response = resp;
            wasHandled = true;
            resolve(resp);
          });
          
          if (result === true) {
            wasHandled = true;
          }
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      }

      if (!wasHandled) {
        resolve({ type: 'success', message: 'Message received' });
      }
    });
  }
}

/**
 * Mock connection for runtime.connect()
 */
class MockConnection {
  private messageListeners = new Set<(message: unknown) => void>();
  private disconnectListeners = new Set<() => void>();
  private isDisconnected = false;

  constructor(
    public name: string,
    private runtime: MockRuntime
  ) {}

  postMessage(message: any): void {
    if (this.isDisconnected) {
      console.warn('Cannot post message to disconnected connection');
      return;
    }

    // Simulate message delivery with a small delay
    setTimeout(() => {
      this.messageListeners.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in connection message listener:', error);
        }
      });
    }, 0);
  }

  disconnect(): void {
    if (this.isDisconnected) {
      return;
    }

    this.isDisconnected = true;
    this.runtime.connections.delete(this.name);

    // Notify disconnect listeners
    setTimeout(() => {
      this.disconnectListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.error('Error in connection disconnect listener:', error);
        }
      });
    }, 0);
  }

  get onMessage() {
    return {
      addListener: (callback: (message: unknown) => void) => {
        this.messageListeners.add(callback);
      },
      removeListener: (callback: (message: unknown) => void) => {
        this.messageListeners.delete(callback);
      }
    };
  }

  get onDisconnect() {
    return {
      addListener: (callback: () => void) => {
        this.disconnectListeners.add(callback);
      },
      removeListener: (callback: () => void) => {
        this.disconnectListeners.delete(callback);
      }
    };
  }
}

/**
 * Chrome Runtime API implementation with fallback support
 */
export class ChromeRuntimePolyfill implements ChromeRuntime {
  public lastError?: { message: string };
  
  public onMessage: {
    addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => void;
    removeListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => void;
    hasListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => boolean;
  };
  
  public onStartup: {
    addListener: (callback: () => void) => void;
    removeListener: (callback: () => void) => void;
  };
  
  public onInstalled: {
    addListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => void;
    removeListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => void;
  };

  private mockRuntime: MockRuntime;

  constructor() {
    this.mockRuntime = new MockRuntime();

    // Try to use real Chrome runtime API if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      this.lastError = chrome.runtime.lastError ? { message: chrome.runtime.lastError.message || '' } : undefined;
      this.onMessage = chrome.runtime.onMessage;
      this.onStartup = chrome.runtime.onStartup;
      this.onInstalled = chrome.runtime.onInstalled;
    } else {
      // Fallback to mock implementation
      console.warn('Chrome runtime API not available, using mock implementation');
      this.lastError = this.mockRuntime.lastError;
      this.onMessage = this.mockRuntime.onMessage;
      this.onStartup = this.mockRuntime.onStartup;
      this.onInstalled = this.mockRuntime.onInstalled;
    }
  }

  async sendMessage(message: unknown): Promise<unknown>;
  sendMessage(message: unknown, callback: (response: unknown) => void): void;
  sendMessage(extensionId: string, message: unknown, callback: (response: unknown) => void): void;
  sendMessage(messageOrExtensionId: string, messageOrCallback?: unknown, callback?: (response: unknown) => void): unknown {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // Use real Chrome API
      if (typeof messageOrExtensionId === 'string') {
        return chrome.runtime.sendMessage(messageOrExtensionId, messageOrCallback, callback as (response: unknown) => void);
      } else {
        return chrome.runtime.sendMessage(messageOrExtensionId, messageOrCallback);
      }
    } else {
      // Fallback to mock implementation
      return this.mockRuntime.sendMessage(messageOrExtensionId as string, messageOrCallback, callback as (response: unknown) => void);
    }
  }

  connect(connectInfo?: {name?: string}): {
    postMessage(message: unknown): void;
    disconnect(): void;
    onMessage: {
      addListener(callback: (message: unknown) => void): void;
      removeListener(callback: (message: unknown) => void): void;
    };
    onDisconnect: {
      addListener(callback: () => void): void;
      removeListener(callback: () => void): void;
    };
  } {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.connect) {
      return chrome.runtime.connect(connectInfo);
    } else {
      return this.mockRuntime.connect(connectInfo);
    }
  }

  /**
   * Check if Chrome runtime API is available
   */
  static isAvailable(): boolean {
    return typeof chrome !== 'undefined' && 
           typeof chrome.runtime !== 'undefined';
  }

  /**
   * Create a runtime polyfill instance
   */
  static create(): ChromeRuntimePolyfill {
    return new ChromeRuntimePolyfill();
  }

  /**
   * Get mock runtime for testing (only available in fallback mode)
   */
  getMockRuntime(): MockRuntime | null {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return this.mockRuntime;
    }
    return null;
  }
}

// Export singleton instance
export const chromeRuntime = ChromeRuntimePolyfill.create();