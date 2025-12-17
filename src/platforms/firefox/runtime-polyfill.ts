/**
 * Firefox Runtime API Polyfill
 * Provides a consistent interface for Firefox runtime API with fallback support
 * Firefox uses the browser.* namespace instead of chrome.*
 */

import type { ChromeRuntime } from '@/types/index.js';

/**
 * Firefox Runtime implementation
 * Wraps browser.runtime API to match Chrome's interface
 */
class FirefoxRuntime implements ChromeRuntime {
  public lastError?: { message: string };

  get onMessage() {
    return {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        browser.runtime.onMessage.addListener(callback);
      },
      removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        browser.runtime.onMessage.removeListener(callback);
      },
      hasListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        return browser.runtime.onMessage.hasListener(callback);
      }
    };
  }

  get onStartup() {
    return {
      addListener: (callback: () => void) => {
        browser.runtime.onStartup.addListener(callback);
      },
      removeListener: (callback: () => void) => {
        browser.runtime.onStartup.removeListener(callback);
      }
    };
  }

  get onInstalled() {
    return {
      addListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        browser.runtime.onInstalled.addListener(callback);
      },
      removeListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        browser.runtime.onInstalled.removeListener(callback);
      }
    };
  }

  async sendMessage(message: any): Promise<any>;
  sendMessage(message: any, callback: (response: any) => void): void;
  sendMessage(extensionId: string, message: any, callback: (response: any) => void): void;
  sendMessage(messageOrExtensionId: any, messageOrCallback?: any, callback?: any): any {
    const isThreeParams = typeof messageOrExtensionId === 'string';
    const message = isThreeParams ? messageOrCallback : messageOrExtensionId;
    const cb = isThreeParams ? callback : messageOrCallback;

    if (cb) {
      // Callback-based API
      browser.runtime.sendMessage(message)
        .then(response => cb(response))
        .catch(error => cb({ error: error.message }));
      return;
    } else {
      // Promise-based API
      return browser.runtime.sendMessage(message);
    }
  }

  connect(connectInfo?: {name?: string}): {
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
  } {
    const port = browser.runtime.connect(connectInfo);
    
    // Wrap the Firefox port to match Chrome's interface
    return {
      postMessage: (message: any) => port.postMessage(message),
      disconnect: () => port.disconnect(),
      onMessage: {
        addListener: (callback: (message: any) => void) => port.onMessage.addListener(callback),
        removeListener: (callback: (message: any) => void) => port.onMessage.removeListener(callback)
      },
      onDisconnect: {
        addListener: (callback: () => void) => port.onDisconnect.addListener(callback),
        removeListener: (callback: () => void) => port.onDisconnect.removeListener(callback)
      }
    };
  }
}

/**
 * Mock Firefox Runtime implementation for testing and fallback
 */
class MockFirefoxRuntime implements ChromeRuntime {
  public lastError?: { message: string };
  
  private messageListeners = new Set<(message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void>();
  private startupListeners = new Set<() => void>();
  private installedListeners = new Set<(details: {reason: string, previousVersion?: string}) => void>();
  public connections = new Map<string, MockFirefoxConnection>();

  get onMessage() {
    return {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        this.messageListeners.add(callback);
      },
      removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        this.messageListeners.delete(callback);
      },
      hasListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
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

  async sendMessage(message: any): Promise<any>;
  sendMessage(message: any, callback: (response: any) => void): void;
  sendMessage(extensionId: string, message: any, callback: (response: any) => void): void;
  sendMessage(messageOrExtensionId: any, messageOrCallback?: any, callback?: any): any {
    const isThreeParams = typeof messageOrExtensionId === 'string';
    const message = isThreeParams ? messageOrCallback : messageOrExtensionId;
    const cb = isThreeParams ? callback : messageOrCallback;

    const execute = async () => {
      // Simulate message handling
      let response: any = undefined;
      let wasHandled = false;

      // Try to handle with listeners
      for (const listener of this.messageListeners) {
        try {
          const result = listener(message, { id: 'mock-sender' }, (resp: any) => {
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
        .catch(error => cb({ error: error.message }));
      return;
    }

    return execute();
  }

  connect(connectInfo?: {name?: string}): {
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
  } {
    const connectionName = connectInfo?.name || `connection_${Date.now()}`;
    
    if (this.connections.has(connectionName)) {
      return this.connections.get(connectionName)!;
    }

    const connection = new MockFirefoxConnection(connectionName, this);
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
  simulateMessage(message: any, sender?: any): Promise<any> {
    return new Promise((resolve) => {
      let response: any = undefined;
      let wasHandled = false;

      for (const listener of this.messageListeners) {
        try {
          const result = listener(message, sender || { id: 'mock-sender' }, (resp: any) => {
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
class MockFirefoxConnection {
  private messageListeners = new Set<(message: any) => void>();
  private disconnectListeners = new Set<() => void>();
  private isDisconnected = false;

  constructor(
    public name: string,
    private runtime: MockFirefoxRuntime
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
      addListener: (callback: (message: any) => void) => {
        this.messageListeners.add(callback);
      },
      removeListener: (callback: (message: any) => void) => {
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
 * Firefox Runtime API implementation with fallback support
 */
export class FirefoxRuntimePolyfill implements ChromeRuntime {
  public lastError?: { message: string };
  
  public onMessage: {
    addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => void;
    removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => void;
    hasListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => boolean;
  };
  
  public onStartup: {
    addListener: (callback: () => void) => void;
    removeListener: (callback: () => void) => void;
  };
  
  public onInstalled: {
    addListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => void;
    removeListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => void;
  };

  private mockRuntime: MockFirefoxRuntime;

  constructor() {
    this.mockRuntime = new MockFirefoxRuntime();

    // Try to use real Firefox runtime API if available
    if (typeof browser !== 'undefined' && browser.runtime) {
      this.lastError = browser.runtime.lastError ? { message: browser.runtime.lastError.message || '' } : undefined;
      this.onMessage = browser.runtime.onMessage;
      this.onStartup = browser.runtime.onStartup;
      this.onInstalled = browser.runtime.onInstalled;
    } else {
      // Fallback to mock implementation
      console.warn('Firefox runtime API not available, using mock implementation');
      this.lastError = this.mockRuntime.lastError;
      this.onMessage = this.mockRuntime.onMessage;
      this.onStartup = this.mockRuntime.onStartup;
      this.onInstalled = this.mockRuntime.onInstalled;
    }
  }

  async sendMessage(message: any): Promise<any>;
  sendMessage(message: any, callback: (response: any) => void): void;
  sendMessage(extensionId: string, message: any, callback: (response: any) => void): void;
  sendMessage(messageOrExtensionId: any, messageOrCallback?: any, callback?: any): any {
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
      // Use real Firefox API - Firefox only supports single parameter
      if (typeof messageOrExtensionId === 'string') {
        // Extension ID provided - Firefox doesn't support this, use mock
        return this.mockRuntime.sendMessage(messageOrExtensionId, messageOrCallback, callback);
      } else {
        // Single message parameter
        if (callback) {
          // Callback-based API
          browser.runtime.sendMessage(messageOrExtensionId)
            .then(response => callback(response))
            .catch(error => callback({ error: error.message }));
          return;
        } else {
          // Promise-based API
          return browser.runtime.sendMessage(messageOrExtensionId);
        }
      }
    } else {
      // Fallback to mock implementation
      return this.mockRuntime.sendMessage(messageOrExtensionId, messageOrCallback, callback);
    }
  }

  connect(connectInfo?: {name?: string}): {
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
  } {
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.connect) {
      const port = browser.runtime.connect(connectInfo);
      
      // Wrap the Firefox port to match Chrome's interface
      return {
        postMessage: (message: any) => port.postMessage(message),
        disconnect: () => port.disconnect(),
        onMessage: {
          addListener: (callback: (message: any) => void) => port.onMessage.addListener(callback),
          removeListener: (callback: (message: any) => void) => port.onMessage.removeListener(callback)
        },
        onDisconnect: {
          addListener: (callback: () => void) => port.onDisconnect.addListener(callback),
          removeListener: (callback: () => void) => port.onDisconnect.removeListener(callback)
        }
      };
    } else {
      // Fallback to mock implementation
      return this.mockRuntime.connect(connectInfo);
    }
  }

  /**
   * Check if Firefox runtime API is available
   */
  static isAvailable(): boolean {
    return typeof browser !== 'undefined' && 
           typeof browser.runtime !== 'undefined';
  }

  /**
   * Create a runtime polyfill instance
   */
  static create(): FirefoxRuntimePolyfill {
    return new FirefoxRuntimePolyfill();
  }

  /**
   * Get mock runtime for testing (only available in fallback mode)
   */
  getMockRuntime(): MockFirefoxRuntime | null {
    if (typeof browser === 'undefined' || !browser.runtime) {
      return this.mockRuntime;
    }
    return null;
  }
}

// Export singleton instance
export const firefoxRuntime = FirefoxRuntimePolyfill.create();