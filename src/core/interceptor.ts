/**
 * Core WebSocket Interceptor
 * Main implementation for intercepting WebSocket communications
 */

import type { 
  DataInterceptor, 
  WebSocketMessage, 
  MessageMetadata, 
  InterceptorStats, 
  ConnectionInfo, 
  Platform,
  WebSocketConfig,
  InterceptorConfig,
  ConnectionManagerConfig
} from '@/types/index.js';
import { WSConnectionManager, type ManagedConnection, type CloneConnectionOptions } from './ws-connection-manager.js';

/**
 * WebSocket connection wrapper
 */
class WebSocketConnection {
  private originalWebSocket: WebSocket;
  private messageHandlers = new Map<string, Set<(event: MessageEvent) => void>>();
  private eventHandlers = new Map<string, Set<(event: Event) => void>>();
  
  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly protocols: string | string[] | undefined,
    private interceptor: WebSocketInterceptor,
    originalWebSocketConstructor: typeof WebSocket
  ) {
    this.originalWebSocket = new originalWebSocketConstructor(url, protocols);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Store reference to the original event handlers before replacing them
    const originalWebSocket = this.originalWebSocket;
    
    // Override the event handlers to intercept messages
    const self = this;
    
    // Intercept messages by overriding the onmessage property
    const originalOnMessage = originalWebSocket.onmessage;
    originalWebSocket.onmessage = function(event) {
      self.interceptor.handleMessage(self.id, event);
      self.notifyHandlers('message', event);
      if (originalOnMessage) {
        originalOnMessage.call(this, event);
      }
    };

    // Intercept open events
    const originalOnOpen = originalWebSocket.onopen;
    originalWebSocket.onopen = function(event) {
      self.interceptor.handleOpen(self.id, event);
      self.notifyHandlers('open', event);
      if (originalOnOpen) {
        originalOnOpen.call(this, event);
      }
    };

    // Intercept close events
    const originalOnClose = originalWebSocket.onclose;
    originalWebSocket.onclose = function(event) {
      self.interceptor.handleClose(self.id, event);
      self.notifyHandlers('close', event);
      if (originalOnClose) {
        originalOnClose.call(this, event);
      }
    };

    // Intercept error events
    const originalOnError = originalWebSocket.onerror;
    originalWebSocket.onerror = function(event) {
      self.interceptor.handleError(self.id, event);
      self.notifyHandlers('error', event);
      if (originalOnError) {
        originalOnError.call(this, event);
      }
    };

    // Also add event listeners as backup
    originalWebSocket.addEventListener('message', (event) => {
      this.interceptor.handleMessage(this.id, event);
      this.notifyHandlers('message', event);
    });

    originalWebSocket.addEventListener('open', (event) => {
      this.interceptor.handleOpen(this.id, event);
      this.notifyHandlers('open', event);
    });

    originalWebSocket.addEventListener('close', (event) => {
      this.interceptor.handleClose(this.id, event);
      this.notifyHandlers('close', event);
    });

    originalWebSocket.addEventListener('error', (event) => {
      this.interceptor.handleError(this.id, event);
      this.notifyHandlers('error', event);
    });
  }

  private notifyHandlers(eventType: string, event: Event): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in ${eventType} handler:`, error);
        }
      });
    }
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.delete(listener);
    }
  }

  get readyState(): number {
    return this.originalWebSocket.readyState;
  }

  get CONNECTING(): number {
    return WebSocket.CONNECTING;
  }

  get OPEN(): number {
    return WebSocket.OPEN;
  }

  get CLOSING(): number {
    return WebSocket.CLOSING;
  }

  get CLOSED(): number {
    return WebSocket.CLOSED;
  }

  close(code?: number, reason?: string): void {
    this.originalWebSocket.close(code, reason);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.originalWebSocket.send(data);
  }

  getOriginalWebSocket(): WebSocket {
    return this.originalWebSocket;
  }
}

/**
 * Main WebSocket Interceptor implementation
 */
export class WebSocketInterceptor implements DataInterceptor {
  private connections = new Map<string, WebSocketConnection>();
  private messageCallbacks = new Set<(message: WebSocketMessage) => void>();
  private enabled = true;
  private debugMode = false;
  private stats: InterceptorStats;
  private connectionCounter = 0;
  private originalWebSocket: typeof WebSocket;
  private connectionManager: WSConnectionManager;

  constructor(
    private config: WebSocketConfig = {
      enabled: true,
      urlFilters: [],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: []
    },
    connectionManagerConfig?: ConnectionManagerConfig
  ) {
    this.originalWebSocket = WebSocket;
    this.stats = {
      totalIntercepts: 0,
      totalConnections: 0,
      activeConnections: 0,
      startTime: Date.now(),
      runtime: 0,
      platform: this.detectPlatform()
    };
    
    // Initialize connection manager
    this.connectionManager = new WSConnectionManager(
      this.stats.platform,
      connectionManagerConfig
    );
  }

  async initialize(): Promise<void> {
    if (this.enabled) {
      this.interceptWebSocket();
    }
  }

  async destroy(): Promise<void> {
    // Restore original WebSocket if in browser environment
    if (typeof window !== 'undefined' && window.WebSocket !== this.originalWebSocket) {
      window.WebSocket = this.originalWebSocket;
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      try {
        connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }

    this.connections.clear();
    this.messageCallbacks.clear();
  }

  private detectPlatform(): Platform {
    // Handle both browser and test environments
    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : 'test';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('kick.com')) return 'kick';
    if (hostname.includes('twitch.tv')) return 'twitch';
    if (hostname.includes('youtube.com')) return 'youtube';
    
    const regexHostname = /^([^.]+)\./;
    const match = regexHostname.exec(hostname);
    if (match) {
      return match[1] as Platform;
    }
    const parts = hostname.split('.');
    return (parts[0] || 'unknown') as Platform;
  }

  private interceptWebSocket(): void {
    
    // Check if we're in a browser environment or test environment
    const isBrowser = typeof window !== 'undefined' && window.WebSocket;
    
    // Use a more robust way to detect test environment
    const getGlobalObject = () => {
      if (typeof globalThis !== 'undefined') return globalThis;
      // @ts-ignore - Web Workers
      if (typeof self !== 'undefined') return self;
      if (typeof window !== 'undefined') return window;
      // @ts-ignore - Node.js global
      if (typeof global !== 'undefined') return global;
      return {} as any;
    };
    
    const globalObj = getGlobalObject();
    const isTestEnvironment = globalObj.WebSocket !== undefined;
    if (!isBrowser && !isTestEnvironment) {
      console.warn('WebSocket interception not available in this environment');
      return;
    }

    const self = this;
    let OriginalWebSocket: typeof WebSocket;
    let targetObject: any;

    if (isBrowser) {
      OriginalWebSocket = window.WebSocket;
      targetObject = window;
    } else {
      // In test environment, use the global WebSocket or import it
      try {
        // Check if WebSocket is available globally first
        if (globalObj.WebSocket) {
          OriginalWebSocket = globalObj.WebSocket;
          targetObject = globalObj;
        } else {
          // Try to import ws module
          // @ts-ignore - Dynamic import for test environment
          const wsModule = require('ws');
          OriginalWebSocket = wsModule.WebSocket || wsModule;
          targetObject = globalObj;
        }
      } catch (error) {
        console.warn('WebSocket module not available in test environment');
        return;
      }
    }

    const InterceptedWebSocket = function (url: string | URL, protocols?: string | string[]) {
      const connectionId = `ws_${++self.connectionCounter}`;
      const urlString = url instanceof URL ? url.toString() : url;
      
      // Check if connection should be intercepted
      if (!self.shouldInterceptConnection(urlString)) {
        console.log('[WebSocket Interceptor] Connection not intercepted, using original WebSocket');
        return new OriginalWebSocket(url, protocols);
      }

      const connection = new WebSocketConnection(
        connectionId,
        urlString,
        protocols,
        self,
        OriginalWebSocket
      );

      self.connections.set(connectionId, connection);
      self.stats.totalConnections++;
      self.stats.activeConnections++;

      return connection.getOriginalWebSocket();
    } as any;

    // Preserve WebSocket constants and prototype
    InterceptedWebSocket.prototype = OriginalWebSocket.prototype;
    Object.defineProperty(InterceptedWebSocket, 'CONNECTING', { value: OriginalWebSocket.CONNECTING });
    Object.defineProperty(InterceptedWebSocket, 'OPEN', { value: OriginalWebSocket.OPEN });
    Object.defineProperty(InterceptedWebSocket, 'CLOSING', { value: OriginalWebSocket.CLOSING });
    Object.defineProperty(InterceptedWebSocket, 'CLOSED', { value: OriginalWebSocket.CLOSED });

    targetObject.WebSocket = InterceptedWebSocket;
  }

  private shouldInterceptConnection(url: string): boolean {
    if (!this.enabled || !this.config.enabled) {
      return false;
    }

    // Check URL filters
    // If filters are defined, ONLY intercept URLs that match at least one filter.
    // Use lowerCase for case-insensitive matching.
    if (this.config.urlFilters && this.config.urlFilters.length > 0) {
      const lowerUrl = url.toLowerCase();
      // Filter out empty strings first
      const activeFilters = this.config.urlFilters.filter(f => f && f.trim().length > 0);
      
      if (activeFilters.length > 0) {
          const shouldInclude = activeFilters.some(filter => 
            lowerUrl.includes(filter.toLowerCase())
          );
          
          if (this.debugMode) {
            console.log(`[WebSocket Interceptor] URL Filter Check: ${url} -> Match? ${shouldInclude}`);
          }

          if (!shouldInclude) {
            return false;
          }
      }
    }

    // If no filters are present (or only empty/whitespace filters), intercept everything by default.
    return true;
  }

  private shouldInterceptMessage(data: any): boolean {
    if (!this.enabled || !this.config.enabled) {
      return false;
    }

    // Check size limits
    const size = this.getDataSize(data);
    if (size < this.config.minSize || size > this.config.maxSize) {
      return false;
    }

    // Check exclude strings
    if (this.config.excludeStrings.length > 0) {
      const dataString = this.dataToString(data).toLowerCase();
      const shouldExclude = this.config.excludeStrings.some(excludeString =>
        dataString.includes(excludeString.toLowerCase())
      );
      if (shouldExclude) {
        return false;
      }
    }

    return true;
  }

  private getDataSize(data: any): number {
    if (typeof data === 'string') {
      return data.length;
    } else if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof Blob) {
      return data.size;
    } else if (data instanceof Uint8Array) {
      return data.length;
    } else if (data && typeof data === 'object') {
      return JSON.stringify(data).length;
    }
    return 0;
  }

  private dataToString(data: any): string {
    if (typeof data === 'string') {
      return data;
    } else if (data instanceof ArrayBuffer) {
      return new TextDecoder().decode(data);
    } else if (data instanceof Blob) {
      return '[Blob]';
    } else if (data instanceof Uint8Array) {
      return new TextDecoder().decode(data);
    } else if (data && typeof data === 'object') {
      return JSON.stringify(data);
    }
    return String(data);
  }

  private createMessageMetadata(data: any, url?: string): MessageMetadata {
    const isBuffer = this.isBuffer(data);
    return {
      platform: this.stats.platform,
      dataType: this.getDataType(data),
      size: this.getDataSize(data),
      url,
      originalType: typeof data,
      isBinary: data instanceof ArrayBuffer || data instanceof Uint8Array || data instanceof Blob || isBuffer,
      timestamp: Date.now()
    };
  }

  private getDataType(data: any): 'string' | 'arraybuffer' | 'blob' | 'object' {
    if (typeof data === 'string') return 'string';
    if (data instanceof ArrayBuffer) return 'arraybuffer';
    if (data instanceof Blob) return 'blob';
    if (data instanceof Uint8Array) return 'arraybuffer';
    if (this.isBuffer(data)) return 'arraybuffer';
    return 'object';
  }

  private isBuffer(data: any): boolean {
    try {
      // Check if Buffer is available and data is a Buffer
      // @ts-ignore - Buffer might not be available in browser environments
      return typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(data);
    } catch {
      return false;
    }
  }

  handleOpen(connectionId: string, event: Event): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const message: WebSocketMessage = {
      type: 'open',
      connectionId,
      metadata: this.createMessageMetadata(null, connection.url),
      timestamp: Date.now()
    };

    this.stats.totalIntercepts++;
    this.notifyMessageHandlers(message);
  }

  handleMessage(connectionId: string, event: MessageEvent): void {
    const data = event.data;
    
    let isBinary = false;
    
    // Enhanced binary detection for different data types
    if (data instanceof ArrayBuffer ||
        data instanceof Uint8Array ||
        data instanceof Int8Array ||
        data instanceof Uint16Array ||
        data instanceof Int16Array ||
        data instanceof Uint32Array ||
        data instanceof Int32Array ||
        data instanceof Float32Array ||
        data instanceof Float64Array ||
        this.isBuffer(data)) {
      isBinary = true;
    } else if (data instanceof Blob) {
      isBinary = true;
    } else if (data instanceof DataView) {
      isBinary = true;
    }

    // Create metadata first to ensure proper binary detection
    const connection = this.connections.get(connectionId);
    const metadata = this.createMessageMetadata(data, connection?.url);
    
    // Override isBinary detection - this is crucial for binary data
    metadata.isBinary = isBinary;

    if (!this.shouldInterceptMessage(data)) return;

    const message: WebSocketMessage = {
      type: 'message',
      connectionId,
      data: this.processData(data),
      metadata,
      timestamp: Date.now()
    };

    this.stats.totalIntercepts++;
    this.notifyMessageHandlers(message);
  }

  handleClose(connectionId: string, event: CloseEvent): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.stats.activeConnections--;
      this.connections.delete(connectionId);
    }

    const message: WebSocketMessage = {
      type: 'close',
      connectionId,
      metadata: {
        ...this.createMessageMetadata(null, connection?.url),
        event: 'close',
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      },
      timestamp: Date.now()
    };

    this.stats.totalIntercepts++;
    this.notifyMessageHandlers(message);
  }

  handleError(connectionId: string, event: Event): void {
    const connection = this.connections.get(connectionId);
    
    const message: WebSocketMessage = {
      type: 'error',
      connectionId,
      metadata: {
        ...this.createMessageMetadata(null, connection?.url),
        event: 'error'
      },
      timestamp: Date.now()
    };

    this.stats.totalIntercepts++;
    this.notifyMessageHandlers(message);
  }

  private processData(data: any): any {
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    }
    if (typeof data === 'string') {
      const match = data.match(/^42(\d+)?(.*)$/);

      if (!match) return data;

      //const ackId = match[1];
      const jsonStr = match[2];
      try {
        const parsed = JSON.parse(jsonStr!);
        return parsed
        } catch (e) {
            // Failed to parse, treat as normal string
            if (this.debugMode) {
                console.warn('[WebSocket Interceptor] Failed to decode Socket.IO message:', e);
            }
        }
    }

    return data;
  }

  private notifyMessageHandlers(message: WebSocketMessage): void {
    // Only notify if interceptor is enabled
    if (!this.enabled) {
      return;
    }

    if (this.debugMode) {
      console.log('[WebSocket Interceptor]', message);
    }

    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  onMessage(callback: (message: WebSocketMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  getStats(): InterceptorStats {
    this.stats.runtime = Date.now() - this.stats.startTime;
    return { ...this.stats };
  }

  getConnections(): ConnectionInfo[] {
    const connections: ConnectionInfo[] = [];
    
    for (const [id, connection] of this.connections) {
      let state: ConnectionInfo['state'] = 'connecting';
      
      switch (connection.readyState) {
        case WebSocket.CONNECTING:
          state = 'connecting';
          break;
        case WebSocket.OPEN:
          state = 'open';
          break;
        case WebSocket.CLOSING:
          state = 'closed';
          break;
        case WebSocket.CLOSED:
          state = 'closed';
          break;
      }

      connections.push({
        id,
        url: connection.url,
        protocols: connection.protocols,
        state,
        created: Date.now() - 1000, // Approximate
      });
    }

    return connections;
  }

  toggleDebugMode(): boolean {
    this.debugMode = !this.debugMode;
    return this.debugMode;
  }

  toggleMasterSwitch(): boolean {
    this.enabled = !this.enabled;
    
    if (this.enabled) {
      // Re-intercept WebSocket when enabling
      this.interceptWebSocket();
    } else {
      // Restore original WebSocket
      const getGlobalObject = () => {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof self !== 'undefined') return self;
        if (typeof window !== 'undefined') return window;
        // @ts-ignore - Node.js global
        if (typeof global !== 'undefined') return global;
        return {} as any;
      };
      
      const globalObj = getGlobalObject();
      if (globalObj.WebSocket && globalObj.WebSocket !== this.originalWebSocket) {
        globalObj.WebSocket = this.originalWebSocket;
      }
    }
    
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isDebugMode(): boolean {
    return this.debugMode;
  }

  updateConfig(config: WebSocketConfig): void {
    if (this.debugMode) {
        console.log('[WebSocket Interceptor] Updating config:', config);
    }
    
    // Create new config object to ensure updates take effect
    this.config = { 
        ...this.config, 
        ...config,
        // Ensure filters are array copies if provided
        urlFilters: config.urlFilters ? [...config.urlFilters] : this.config.urlFilters,
        excludeStrings: config.excludeStrings ? [...config.excludeStrings] : this.config.excludeStrings
    };
    
    // Force re-evaluation of current connections if needed? 
    // Usually not possible for WebSockets as we can't 'disconnect' them and reconnect without user visible side-effects.
    // But any NEW connection will use the new config.
  }

  // ========== Connection Manager Methods ==========

  /**
   * Clone an existing WebSocket connection
   * Creates a new WebSocket connection to the same URL
   */
  async cloneConnection(
    originalConnection: ConnectionInfo,
    options: CloneConnectionOptions = {}
  ): Promise<string> {
    return this.connectionManager.cloneConnection(originalConnection, options);
  }

  /**
   * Create a new persistent WebSocket connection
   */
  async createPersistentConnection(
    url: string,
    protocols?: string | string[],
    options: CloneConnectionOptions = {}
  ): Promise<string> {
    return this.connectionManager.createPersistentConnection(url, protocols, options);
  }

  /**
   * Close a managed connection
   */
  closeManagedConnection(connectionId: string): void {
    this.connectionManager.closeConnection(connectionId);
  }

  /**
   * Remove a managed connection from the manager
   */
  removeManagedConnection(connectionId: string): void {
    this.connectionManager.removeConnection(connectionId);
  }

  /**
   * Close all managed connections
   */
  closeAllManagedConnections(): void {
    this.connectionManager.closeAllConnections();
  }

  /**
   * Remove all managed connections
   */
  removeAllManagedConnections(): void {
    this.connectionManager.removeAllConnections();
  }

  /**
   * Get information about a specific managed connection
   */
  getManagedConnection(connectionId: string): ManagedConnection | undefined {
    return this.connectionManager.getConnection(connectionId);
  }

  /**
   * Get all managed connections
   */
  getManagedConnections(): ManagedConnection[] {
    return this.connectionManager.getAllConnections();
  }

  /**
   * Get active (open) managed connections
   */
  getActiveManagedConnections(): ManagedConnection[] {
    return this.connectionManager.getActiveConnections();
  }

  /**
   * Get persistent managed connections
   */
  getPersistentConnections(): ManagedConnection[] {
    return this.connectionManager.getPersistentConnections();
  }

  /**
   * Get cloned managed connections
   */
  getClonedConnections(): ManagedConnection[] {
    return this.connectionManager.getClonedConnections();
  }

  /**
   * Update connection manager configuration
   */
  updateConnectionManagerConfig(config: Partial<ConnectionManagerConfig>): void {
    this.connectionManager.updateConfig(config);
  }

  /**
   * Get connection manager configuration
   */
  getConnectionManagerConfig(): ConnectionManagerConfig {
    return this.connectionManager.getConfig();
  }

  /**
   * Enable or disable the connection manager
   */
  setConnectionManagerEnabled(enabled: boolean): void {
    this.connectionManager.setEnabled(enabled);
  }

  /**
   * Check if connection manager is enabled
   */
  isConnectionManagerEnabled(): boolean {
    return this.connectionManager.isEnabled();
  }

  /**
   * Get connection manager statistics
   */
  getConnectionManagerStats(): {
    total: number;
    active: number;
    persistent: number;
    cloned: number;
    closed: number;
    error: number;
  } {
    return this.connectionManager.getStats();
  }

  /**
   * Register a message handler for managed connections
   */
  onManagedMessage(handler: (connectionId: string, data: any) => void): () => void {
    return this.connectionManager.onMessage(handler);
  }

  /**
   * Clean up connection manager
   */
  destroyConnectionManager(): void {
    this.connectionManager.destroy();
  }
}

// Export singleton instance
export const websocketInterceptor = new WebSocketInterceptor();
