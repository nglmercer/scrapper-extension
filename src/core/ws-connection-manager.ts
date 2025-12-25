/**
 * WebSocket Connection Manager
 * Handles persistent WebSocket connections and connection cloning
 */

import type { ConnectionInfo, Platform } from '@/types/index.js';

export interface ManagedConnection extends ConnectionInfo {
  originalConnectionId?: string;
  isClone?: boolean;
  persistent?: boolean;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  lastActivity?: number;
  messageCount?: number;
  websocket?: WebSocket;
}

export interface ConnectionManagerConfig {
  enabled: boolean;
  maxConnections: number;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  keepAliveInterval: number;
}

export interface CloneConnectionOptions {
  persistent?: boolean;
  autoReconnect?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

/**
 * WebSocket Connection Manager
 * Manages multiple WebSocket connections, including cloned and persistent ones
 */
export class WSConnectionManager {
  private connections = new Map<string, ManagedConnection>();
  private config: ConnectionManagerConfig;
  private keepAliveTimers = new Map<string, NodeJS.Timeout>();
  private platform: Platform;
  private messageHandlers = new Set<(connectionId: string, data: any) => void>();

  constructor(platform: Platform = 'unknown', config?: Partial<ConnectionManagerConfig>) {
    this.platform = platform;
    this.config = {
      enabled: false,
      maxConnections: 10,
      autoReconnect: false,
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      keepAliveInterval: 30000,
      ...config
    };
  }

  /**
   * Clone an existing WebSocket connection
   * Creates a new WebSocket connection to the same URL
   */
  async cloneConnection(
    originalConnection: ConnectionInfo,
    options: CloneConnectionOptions = {}
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Connection manager is disabled');
    }

    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum number of connections reached');
    }

    const connectionId = `ws_clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const ws = new WebSocket(originalConnection.url, originalConnection.protocols);
      
      const managedConnection: ManagedConnection = {
        ...originalConnection,
        id: connectionId,
        originalConnectionId: originalConnection.id,
        isClone: true,
        persistent: options.persistent ?? false,
        autoReconnect: options.autoReconnect ?? this.config.autoReconnect,
        reconnectAttempts: 0,
        lastActivity: Date.now(),
        messageCount: 0,
        websocket: ws,
        state: 'connecting'
      };

      this.connections.set(connectionId, managedConnection);
      this.setupConnectionHandlers(connectionId, ws, options);
      
      return connectionId;
    } catch (error) {
      this.connections.delete(connectionId);
      throw new Error(`Failed to clone connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new persistent WebSocket connection
   */
  async createPersistentConnection(
    url: string,
    protocols?: string | string[],
    options: CloneConnectionOptions = {}
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Connection manager is disabled');
    }

    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum number of connections reached');
    }

    const connectionId = `ws_persistent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const ws = new WebSocket(url, protocols);
      
      const managedConnection: ManagedConnection = {
        id: connectionId,
        url,
        protocols,
        state: 'connecting',
        created: Date.now(),
        isClone: false,
        persistent: true,
        autoReconnect: options.autoReconnect ?? this.config.autoReconnect,
        reconnectAttempts: 0,
        lastActivity: Date.now(),
        messageCount: 0,
        websocket: ws
      };

      this.connections.set(connectionId, managedConnection);
      this.setupConnectionHandlers(connectionId, ws, options);
      
      return connectionId;
    } catch (error) {
      this.connections.delete(connectionId);
      throw new Error(`Failed to create persistent connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup WebSocket event handlers for a managed connection
   */
  private setupConnectionHandlers(
    connectionId: string,
    ws: WebSocket,
    options: CloneConnectionOptions
  ): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    ws.addEventListener('open', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.state = 'open';
        conn.lastActivity = Date.now();
        conn.reconnectAttempts = 0;
      }
      
      // Start keepalive if persistent
      if (connection.persistent) {
        this.startKeepAlive(connectionId);
      }
    });

    ws.addEventListener('message', (event) => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastActivity = Date.now();
        conn.messageCount = (conn.messageCount || 0) + 1;
      }

      // Notify message handlers
      this.notifyMessageHandlers(connectionId, event.data);

      // Call custom onMessage handler if provided
      if (options.onMessage) {
        try {
          options.onMessage(event.data);
        } catch (error) {
          console.error(`[WSConnectionManager] Error in onMessage handler for ${connectionId}:`, error);
        }
      }
    });

    ws.addEventListener('close', (event) => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.state = 'closed';
        conn.closed = Date.now();
      }

      this.stopKeepAlive(connectionId);

      // Handle auto-reconnect if enabled
      const shouldReconnect = connection.autoReconnect && 
                             (connection.reconnectAttempts || 0) < this.config.maxReconnectAttempts;

      if (shouldReconnect) {
        this.scheduleReconnect(connectionId);
      }

      // Call custom onClose handler if provided
      if (options.onClose) {
        try {
          options.onClose(event);
        } catch (error) {
          console.error(`[WSConnectionManager] Error in onClose handler for ${connectionId}:`, error);
        }
      }
    });

    ws.addEventListener('error', (event) => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.state = 'error';
      }

      // Call custom onError handler if provided
      if (options.onError) {
        try {
          options.onError(event);
        } catch (error) {
          console.error(`[WSConnectionManager] Error in onError handler for ${connectionId}:`, error);
        }
      }
    });
  }

  /**
   * Start keep-alive mechanism for a connection
   */
  private startKeepAlive(connectionId: string): void {
    this.stopKeepAlive(connectionId);

    const timer = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (!connection || connection.websocket?.readyState !== WebSocket.OPEN) {
        this.stopKeepAlive(connectionId);
        return;
      }

      // Send a ping or small message to keep connection alive
      try {
        if (connection.websocket) {
          connection.websocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      } catch (error) {
        console.warn(`[WSConnectionManager] Failed to send keep-alive for ${connectionId}:`, error);
        this.stopKeepAlive(connectionId);
      }
    }, this.config.keepAliveInterval);

    this.keepAliveTimers.set(connectionId, timer);
  }

  /**
   * Stop keep-alive mechanism for a connection
   */
  private stopKeepAlive(connectionId: string): void {
    const timer = this.keepAliveTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.keepAliveTimers.delete(connectionId);
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.reconnectAttempts = (connection.reconnectAttempts || 0) + 1;

    setTimeout(async () => {
      const conn = this.connections.get(connectionId);
      if (!conn || conn.state === 'open') return;

      try {
        // Reconnect to the same URL
        const ws = new WebSocket(conn.url, conn.protocols);
        conn.websocket = ws;
        conn.state = 'connecting';
        
        // Setup handlers again
        this.setupConnectionHandlers(connectionId, ws, {});
        
        console.log(`[WSConnectionManager] Reconnecting ${connectionId} (attempt ${conn.reconnectAttempts})`);
      } catch (error) {
        console.error(`[WSConnectionManager] Failed to reconnect ${connectionId}:`, error);
        
        // Try again if we haven't reached max attempts
        if ((conn.reconnectAttempts || 0) < this.config.maxReconnectAttempts) {
          this.scheduleReconnect(connectionId);
        }
      }
    }, this.config.reconnectDelay);
  }

  /**
   * Close a managed connection
   */
  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.stopKeepAlive(connectionId);

    if (connection.websocket) {
      try {
        connection.websocket.close(1000, 'Connection closed by user');
      } catch (error) {
        console.error(`[WSConnectionManager] Error closing connection ${connectionId}:`, error);
      }
    }

    connection.state = 'closed';
    connection.closed = Date.now();
  }

  /**
   * Remove a managed connection from the manager
   */
  removeConnection(connectionId: string): void {
    this.closeConnection(connectionId);
    this.connections.delete(connectionId);
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    for (const connectionId of this.connections.keys()) {
      this.closeConnection(connectionId);
    }
  }

  /**
   * Remove all connections
   */
  removeAllConnections(): void {
    this.closeAllConnections();
    this.connections.clear();
  }

  /**
   * Get information about a specific connection
   */
  getConnection(connectionId: string): ManagedConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all managed connections
   */
  getAllConnections(): ManagedConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get active (open) connections
   */
  getActiveConnections(): ManagedConnection[] {
    return this.getAllConnections().filter(conn => conn.state === 'open');
  }

  /**
   * Get persistent connections
   */
  getPersistentConnections(): ManagedConnection[] {
    return this.getAllConnections().filter(conn => conn.persistent);
  }

  /**
   * Get cloned connections
   */
  getClonedConnections(): ManagedConnection[] {
    return this.getAllConnections().filter(conn => conn.isClone);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConnectionManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConnectionManagerConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable the connection manager
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      // Close all connections when disabled
      this.closeAllConnections();
    }
  }

  /**
   * Check if manager is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    active: number;
    persistent: number;
    cloned: number;
    closed: number;
    error: number;
  } {
    const connections = this.getAllConnections();
    
    return {
      total: connections.length,
      active: connections.filter(c => c.state === 'open').length,
      persistent: connections.filter(c => c.persistent).length,
      cloned: connections.filter(c => c.isClone).length,
      closed: connections.filter(c => c.state === 'closed').length,
      error: connections.filter(c => c.state === 'error').length
    };
  }

  /**
   * Register a message handler
   */
  onMessage(handler: (connectionId: string, data: any) => void): () => void {
    this.messageHandlers.add(handler);
    
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Notify all message handlers
   */
  private notifyMessageHandlers(connectionId: string, data: any): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(connectionId, data);
      } catch (error) {
        console.error(`[WSConnectionManager] Error in message handler for ${connectionId}:`, error);
      }
    });
  }

  /**
   * Clean up manager
   */
  destroy(): void {
    this.removeAllConnections();
    this.messageHandlers.clear();
    
    // Clear all keep-alive timers
    for (const timer of this.keepAliveTimers.values()) {
      clearInterval(timer);
    }
    this.keepAliveTimers.clear();
  }
}
