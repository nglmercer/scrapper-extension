/**
 * Electron Runtime API Polyfill
 * Provides a consistent interface for Electron runtime with fallback support
 * Uses IPC for main-renderer communication
 */

import type { ChromeRuntime } from '@/types/index.js';

/**
 * Electron Runtime implementation for main process
 */
class ElectronMainRuntime implements ChromeRuntime {
  public lastError?: { message: string };
  private ipcMain: any;
  private mainWindow: any;

  constructor() {
    // Try to get Electron IPC
    const electron = this.getElectronModule();
    this.ipcMain = electron?.ipcMain;
    
    if (!this.ipcMain) {
      console.warn('IPC not available in Electron main process');
    }
  }

  private getElectronModule(): any {
    try {
      return require('electron');
    } catch (error) {
      console.warn('Electron module not available');
      return null;
    }
  }

  setMainWindow(window: any): void {
    this.mainWindow = window;
  }

  get onMessage() {
    return {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        if (this.ipcMain) {
          this.ipcMain.handle('raw-interceptor:message', async (event: any, message: any) => {
            return new Promise((resolve) => {
              const result = callback(message, { id: 'electron-renderer' }, (response: any) => {
                resolve(response);
              });
              
              if (result !== true && result !== undefined) {
                resolve(result);
              }
            });
          });
        }
      },
      removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        // Electron doesn't provide easy way to remove specific IPC handlers
        console.warn('Electron runtime removeListener not fully supported');
      },
      hasListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        // Electron doesn't provide way to check for specific IPC handlers
        console.warn('Electron runtime hasListener not supported');
        return false;
      }
    };
  }

  get onStartup() {
    return {
      addListener: (callback: () => void) => {
        // Simulate startup event when app is ready
        const electron = this.getElectronModule();
        if (electron?.app) {
          electron.app.whenReady().then(callback);
        } else {
          // Fallback to immediate callback
          setTimeout(callback, 0);
        }
      },
      removeListener: (callback: () => void) => {
        console.warn('Electron runtime removeListener not fully supported');
      }
    };
  }

  get onInstalled() {
    return {
      addListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        // Simulate installation event
        setTimeout(() => {
          callback({ reason: 'install' });
        }, 100);
      },
      removeListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        console.warn('Electron runtime removeListener not fully supported');
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

    if (this.mainWindow && this.mainWindow.webContents) {
      // Send to renderer process
      const execute = async () => {
        try {
          const result = await this.mainWindow.webContents.send('raw-interceptor:message', message);
          return { type: 'success', result };
        } catch (error) {
          return { type: 'error', error: (error as Error).message };
        }
      };

      if (cb) {
        execute()
          .then(response => cb(response))
          .catch(error => cb({ error: (error as Error).message }));
        return;
      }

      return execute();
    } else {
      // Fallback response
      const response = { type: 'success', message: 'Message received' };
      if (cb) {
        cb(response);
      } else {
        return Promise.resolve(response);
      }
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
    // Create a mock connection for Electron
    const connectionName = connectInfo?.name || `connection_${Date.now()}`;
    
    return {
      postMessage: (message: any) => {
        if (this.mainWindow && this.mainWindow.webContents) {
          this.mainWindow.webContents.send('raw-interceptor:port-message', { name: connectionName, message });
        }
      },
      disconnect: () => {
        console.log(`Electron connection ${connectionName} disconnected`);
      },
      onMessage: {
        addListener: (callback: (message: any) => void) => {
          if (this.ipcMain) {
            this.ipcMain.handle(`raw-interceptor:port-message:${connectionName}`, async (event: any, message: any) => {
              callback(message);
            });
          }
        },
        removeListener: (callback: (message: any) => void) => {
          console.warn('Electron port removeListener not fully supported');
        }
      },
      onDisconnect: {
        addListener: (callback: () => void) => {
          // Simulate disconnect
          setTimeout(callback, 0);
        },
        removeListener: (callback: () => void) => {
          console.warn('Electron port removeListener not fully supported');
        }
      }
    };
  }
}

/**
 * Electron Runtime implementation for renderer process
 */
class ElectronRendererRuntime implements ChromeRuntime {
  public lastError?: { message: string };
  private ipcRenderer: any;

  constructor() {
    // Try to get Electron IPC
    const electron = this.getElectronModule();
    this.ipcRenderer = electron?.ipcRenderer;
    
    if (!this.ipcRenderer) {
      console.warn('IPC not available in Electron renderer process');
    }
  }

  private getElectronModule(): any {
    try {
      return require('electron');
    } catch (error) {
      console.warn('Electron module not available');
      return null;
    }
  }

  get onMessage() {
    return {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        if (this.ipcRenderer) {
          this.ipcRenderer.on('raw-interceptor:message', (event: any, message: any) => {
            const result = callback(message, { id: 'electron-main' }, (response: any) => {
              // Send response back to main process
              if (event.sender) {
                event.sender.send('raw-interceptor:response', response);
              }
            });
            
            if (result === true) {
              // Keep channel open for async response
              return true;
            }
          });
        }
      },
      removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        if (this.ipcRenderer) {
          this.ipcRenderer.removeAllListeners('raw-interceptor:message');
        }
      },
      hasListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => {
        // Electron doesn't provide way to check for specific IPC listeners
        console.warn('Electron runtime hasListener not supported');
        return false;
      }
    };
  }

  get onStartup() {
    return {
      addListener: (callback: () => void) => {
        // Renderer process startup
        setTimeout(callback, 0);
      },
      removeListener: (callback: () => void) => {
        console.warn('Electron runtime removeListener not fully supported');
      }
    };
  }

  get onInstalled() {
    return {
      addListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        // Simulate installation event
        setTimeout(() => {
          callback({ reason: 'install' });
        }, 100);
      },
      removeListener: (callback: (details: {reason: string, previousVersion?: string}) => void) => {
        console.warn('Electron runtime removeListener not fully supported');
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

    if (this.ipcRenderer) {
      const execute = async () => {
        try {
          const result = await this.ipcRenderer.invoke('raw-interceptor:message', message);
          return result;
        } catch (error) {
          return { type: 'error', error: (error as Error).message };
        }
      };

      if (cb) {
        execute()
          .then(response => cb(response))
          .catch(error => cb({ error: (error as Error).message }));
        return;
      }

      return execute();
    } else {
      // Fallback response
      const response = { type: 'success', message: 'Message received' };
      if (cb) {
        cb(response);
      } else {
        return Promise.resolve(response);
      }
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
    // Create a mock connection for Electron renderer
    const connectionName = connectInfo?.name || `connection_${Date.now()}`;
    
    return {
      postMessage: (message: any) => {
        if (this.ipcRenderer) {
          this.ipcRenderer.send('raw-interceptor:port-message', { name: connectionName, message });
        }
      },
      disconnect: () => {
        console.log(`Electron renderer connection ${connectionName} disconnected`);
      },
      onMessage: {
        addListener: (callback: (message: any) => void) => {
          if (this.ipcRenderer) {
            this.ipcRenderer.on(`raw-interceptor:port-message:${connectionName}`, (event: any, message: any) => {
              callback(message);
            });
          }
        },
        removeListener: (callback: (message: any) => void) => {
          if (this.ipcRenderer) {
            this.ipcRenderer.removeAllListeners(`raw-interceptor:port-message:${connectionName}`);
          }
        }
      },
      onDisconnect: {
        addListener: (callback: () => void) => {
          // Simulate disconnect
          setTimeout(callback, 0);
        },
        removeListener: (callback: () => void) => {
          console.warn('Electron port removeListener not fully supported');
        }
      }
    };
  }
}

/**
 * Mock Electron Runtime implementation for testing and fallback
 */
class MockElectronRuntime implements ChromeRuntime {
  public lastError?: { message: string };
  
  private messageListeners = new Set<(message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void>();
  private startupListeners = new Set<() => void>();
  private installedListeners = new Set<(details: {reason: string, previousVersion?: string}) => void>();
  public connections = new Map<string, MockElectronConnection>();

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
        .catch(error => cb({ error: (error as Error).message }));
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

    const connection = new MockElectronConnection(connectionName, this);
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
class MockElectronConnection {
  private messageListeners = new Set<(message: any) => void>();
  private disconnectListeners = new Set<() => void>();
  private isDisconnected = false;

  constructor(
    public name: string,
    private runtime: MockElectronRuntime
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
 * Electron Runtime API implementation with fallback support
 */
export class ElectronRuntimePolyfill implements ChromeRuntime {
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

  private mockRuntime: MockElectronRuntime;
  private mainRuntime: ElectronMainRuntime | null = null;
  private rendererRuntime: ElectronRendererRuntime | null = null;

  constructor(isMainProcess: boolean = false) {
    this.mockRuntime = new MockElectronRuntime();

    // Determine which runtime to use based on process type
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      if (isMainProcess || !(process as any).type || (process as any).type === 'browser') {
        // Main process
        this.mainRuntime = new ElectronMainRuntime();
        this.lastError = this.mainRuntime.lastError;
        this.onMessage = this.mainRuntime.onMessage;
        this.onStartup = this.mainRuntime.onStartup;
        this.onInstalled = this.mainRuntime.onInstalled;
      } else {
        // Renderer process
        this.rendererRuntime = new ElectronRendererRuntime();
        this.lastError = this.rendererRuntime.lastError;
        this.onMessage = this.rendererRuntime.onMessage;
        this.onStartup = this.rendererRuntime.onStartup;
        this.onInstalled = this.rendererRuntime.onInstalled;
      }
    } else {
      // Fallback to mock implementation
      console.warn('Electron environment not detected, using mock implementation');
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
    if (this.mainRuntime) {
      return this.mainRuntime.sendMessage(messageOrExtensionId, messageOrCallback, callback);
    } else if (this.rendererRuntime) {
      return this.rendererRuntime.sendMessage(messageOrExtensionId, messageOrCallback, callback);
    } else {
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
    if (this.mainRuntime) {
      return this.mainRuntime.connect(connectInfo);
    } else if (this.rendererRuntime) {
      return this.rendererRuntime.connect(connectInfo);
    } else {
      return this.mockRuntime.connect(connectInfo);
    }
  }

  /**
   * Set main window (for main process)
   */
  setMainWindow(window: any): void {
    if (this.mainRuntime) {
      this.mainRuntime.setMainWindow(window);
    }
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
   * Create a runtime polyfill instance
   */
  static create(isMainProcess: boolean = false): ElectronRuntimePolyfill {
    return new ElectronRuntimePolyfill(isMainProcess);
  }

  /**
   * Get mock runtime for testing (only available in fallback mode)
   */
  getMockRuntime(): MockElectronRuntime | null {
    if (!this.mainRuntime && !this.rendererRuntime) {
      return this.mockRuntime;
    }
    return null;
  }
}

// Export singleton instances
export const electronRuntime = ElectronRuntimePolyfill.create();
export const electronMainRuntime = ElectronRuntimePolyfill.create(true);