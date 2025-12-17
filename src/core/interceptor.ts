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
  InterceptorConfig
} from '@/types/index.js';

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
    private interceptor: WebSocketInterceptor
  ) {
    this.originalWebSocket = new WebSocket(url, protocols);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Intercept messages
    this.originalWebSocket.addEventListener('message', (event) => {
      this.interceptor.handleMessage(this.id, event);
      this.notifyHandlers('message', event);
    });

    // Intercept other events
    this.originalWebSocket.addEventListener('open', (event) => {
      this.interceptor.handleOpen(this.id, event);
      this.notifyHandlers('open', event);
    });

    this.originalWebSocket.addEventListener('close', (event) => {
      this.interceptor.handleClose(this.id, event);
      this.notifyHandlers('close', event);
    });

    this.originalWebSocket.addEventListener('error', (event) => {
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

  constructor(
    private config: WebSocketConfig = {
      enabled: true,
      urlFilters: [],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: []
    }
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
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.WebSocket) {
      console.warn('WebSocket interception not available in this environment');
      return;
    }

    const self = this;
    const OriginalWebSocket = window.WebSocket;

    const InterceptedWebSocket = function (url: string | URL, protocols?: string | string[]) {
      const connectionId = `ws_${++self.connectionCounter}`;
      const urlString = url instanceof URL ? url.toString() : url;
      
      // Check if connection should be intercepted
      if (!self.shouldInterceptConnection(urlString)) {
        return new OriginalWebSocket(url, protocols);
      }

      const connection = new WebSocketConnection(
        connectionId,
        urlString,
        protocols,
        self
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

    window.WebSocket = InterceptedWebSocket;
  }

  private shouldInterceptConnection(url: string): boolean {
    if (!this.enabled || !this.config.enabled) {
      return false;
    }

    // Check URL filters
    if (this.config.urlFilters.length > 0) {
      const shouldInclude = this.config.urlFilters.some(filter => 
        url.toLowerCase().includes(filter.toLowerCase())
      );
      if (!shouldInclude) {
        return false;
      }
    }

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
    return {
      platform: this.stats.platform,
      dataType: this.getDataType(data),
      size: this.getDataSize(data),
      url,
      originalType: typeof data,
      isBinary: data instanceof ArrayBuffer || data instanceof Uint8Array || data instanceof Blob,
      timestamp: Date.now()
    };
  }

  private getDataType(data: any): 'string' | 'arraybuffer' | 'blob' | 'object' {
    if (typeof data === 'string') return 'string';
    if (data instanceof ArrayBuffer) return 'arraybuffer';
    if (data instanceof Blob) return 'blob';
    if (data instanceof Uint8Array) return 'arraybuffer';
    return 'object';
  }

  handleOpen(connectionId: string, event: Event): void {
    if (!this.shouldInterceptConnection('')) return;

    const message: WebSocketMessage = {
      type: 'open',
      connectionId,
      metadata: this.createMessageMetadata(null),
      timestamp: Date.now()
    };

    this.stats.totalIntercepts++;
    this.notifyMessageHandlers(message);
  }

  handleMessage(connectionId: string, event: MessageEvent): void {
    const data = event.data;
    
    if (!this.shouldInterceptMessage(data)) return;

    const connection = this.connections.get(connectionId);
    const metadata = this.createMessageMetadata(data, connection?.url);

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

    if (!this.shouldInterceptConnection('')) return;

    const message: WebSocketMessage = {
      type: 'close',
      connectionId,
      metadata: {
        ...this.createMessageMetadata(null),
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
    if (!this.shouldInterceptConnection('')) return;

    const message: WebSocketMessage = {
      type: 'error',
      connectionId,
      metadata: {
        ...this.createMessageMetadata(null),
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
      this.interceptWebSocket();
    } else {
      // Restore original WebSocket if in browser environment
      if (typeof window !== 'undefined' && window.WebSocket !== this.originalWebSocket) {
        window.WebSocket = this.originalWebSocket;
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
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const websocketInterceptor = new WebSocketInterceptor();