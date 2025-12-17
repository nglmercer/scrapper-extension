/**
 * WebSocket Test Server
 * A comprehensive test server for testing WebSocket interception capabilities
 */

import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import * as http from 'http';
import * as url from 'url';

export interface TestServerConfig {
  port: number;
  host: string;
  path: string;
  protocols: string[];
  enableHeartbeat: boolean;
  heartbeatInterval: number;
  messageTypes: string[];
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  connectionId: string;
}

export interface ServerStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  startTime: number;
  uptime: number;
}

/**
 * WebSocket Test Server
 */
export class WebSocketTestServer {
  private server: http.Server | undefined;
  private wss: WebSocketServer | undefined;
  private connections = new Map<string, WsWebSocket>();
  private config: TestServerConfig;
  private stats: ServerStats;
  private heartbeatInterval?: NodeJS.Timeout;
  private messageHandlers = new Map<string, (ws: WsWebSocket, data: any) => void>();

  constructor(config: Partial<TestServerConfig> = {}) {
    this.config = {
      port: 8080,
      host: 'localhost',
      path: '/ws',
      protocols: ['chat', 'test'],
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      messageTypes: ['text', 'json', 'binary', 'ping', 'pong'],
      ...config
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      startTime: Date.now(),
      uptime: 0
    };

    this.setupServer();
    this.setupMessageHandlers();
  }

  private setupServer(): void {
    // Create HTTP server
    this.server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      
      // Handle health check
      if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          stats: this.getStats(),
          config: this.config
        }));
        return;
      }

      // Handle stats endpoint
      if (parsedUrl.pathname === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getStats()));
        return;
      }

      // Handle connection info
      if (parsedUrl.pathname === '/connections') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          connections: Array.from(this.connections.keys()),
          count: this.connections.size
        }));
        return;
      }

      // Default response
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('WebSocket Test Server - Use WebSocket connection');
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.config.path,
      verifyClient: () => {
        // Allow all connections for testing
        return true;
      }
    });

    // Handle WebSocket connections
    this.wss.on('connection', (ws: WsWebSocket, request) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat if enabled
    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  private setupMessageHandlers(): void {
    // Text message handler
    this.messageHandlers.set('text', (ws, data) => {
      const response = {
        type: 'text_response',
        data: `Echo: ${data}`,
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(response));
    });

    // JSON message handler
    this.messageHandlers.set('json', (ws, data) => {
      const response = {
        type: 'json_response',
        data: {
          ...data,
          echoed: true,
          timestamp: Date.now()
        }
      };
      ws.send(JSON.stringify(response));
    });

    // Binary message handler
    this.messageHandlers.set('binary', (ws, data) => {
      // Echo binary data back
      ws.send(data);
    });

    // Ping handler
    this.messageHandlers.set('ping', (ws, data) => {
      const response = {
        type: 'pong',
        data: data,
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(response));
    });

    // Chat message handler
    this.messageHandlers.set('chat', (ws, data) => {
      const response = {
        type: 'chat_message',
        user: data.user || 'anonymous',
        message: data.message,
        timestamp: Date.now()
      };
      
      // Broadcast to all connections
      this.broadcast(response);
    });

    // Test data handler - sends various types of data
    this.messageHandlers.set('test_data', (ws, data) => {
      const testTypes = data.types || ['small', 'medium', 'large'];
      
      testTypes.forEach((testType: string) => {
        setTimeout(() => {
          let testData: any;
          
          switch (testType) {
            case 'small':
              testData = { type: 'small_data', value: 'Hello World', timestamp: Date.now() };
              break;
            case 'medium':
              testData = { 
                type: 'medium_data', 
                value: 'A'.repeat(1000),
                timestamp: Date.now() 
              };
              break;
            case 'large':
              testData = { 
                type: 'large_data', 
                value: 'B'.repeat(10000),
                timestamp: Date.now() 
              };
              break;
            case 'binary':
              testData = Buffer.from('Binary test data');
              break;
            case 'arraybuffer':
              testData = new ArrayBuffer(1024);
              break;
            default:
              testData = { type: 'unknown', testType, timestamp: Date.now() };
          }
          
          if (testData instanceof ArrayBuffer || testData instanceof Buffer) {
            ws.send(testData);
          } else {
            ws.send(JSON.stringify(testData));
          }
        }, Math.random() * 1000);
      });
    });
  }

  private handleConnection(ws: WsWebSocket, request: http.IncomingMessage): void {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store connection
    this.connections.set(connectionId, ws);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    console.log(`New WebSocket connection: ${connectionId} from ${request.socket.remoteAddress}`);

    // Send welcome message
    const welcomeMessage = {
      type: 'welcome',
      connectionId,
      serverTime: Date.now(),
      supportedTypes: Array.from(this.messageHandlers.keys()),
      config: {
        enableHeartbeat: this.config.enableHeartbeat,
        heartbeatInterval: this.config.heartbeatInterval
      }
    };
    ws.send(JSON.stringify(welcomeMessage));

    // Handle incoming messages
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      this.handleMessage(ws, connectionId, data, isBinary);
    });

    // Handle connection close
    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnect(connectionId, code, reason);
    });

    // Handle connection errors
    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
    });

    // Handle ping/pong
    ws.on('ping', (data: Buffer) => {
      console.log(`Received ping from ${connectionId}`);
    });

    ws.on('pong', (data: Buffer) => {
      console.log(`Received pong from ${connectionId}`);
    });
  }

  private handleMessage(ws: WsWebSocket, connectionId: string, data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean): void {
    this.stats.totalMessages++;

    try {
      let messageData: any;

      // Handle different data types
      if (isBinary) {
        if (data instanceof ArrayBuffer) {
           messageData = new Uint8Array(data);
        } else {
           messageData = data;
        }
      } else if (Buffer.isBuffer(data)) {
        // Text frame received as Buffer
        messageData = data.toString();
        try {
          messageData = JSON.parse(messageData);
        } catch {
          // Keep as string if not JSON
        }
      } else if (Array.isArray(data)) {
         // Fragmented text frame?
         messageData = Buffer.concat(data).toString();
         try {
           messageData = JSON.parse(messageData);
         } catch {
         }
      } else {
         // Other formats?
         messageData = data.toString();
         try {
           messageData = JSON.parse(messageData);
         } catch {
         }
      }

      //console.log(`Message from ${connectionId}:`, messageData);

      // Handle different message types
      if (typeof messageData === 'object' && messageData.type) {
        const handler = this.messageHandlers.get(messageData.type);
        if (handler) {
          handler(ws, messageData.data || messageData);
        } else {
          // Unknown message type
          const response = {
            type: 'error',
            error: `Unknown message type: ${messageData.type}`,
            supportedTypes: Array.from(this.messageHandlers.keys())
          };
          ws.send(JSON.stringify(response));
        }
      } else if (isBinary) {
        // Handle binary data
        const handler = this.messageHandlers.get('binary');
        if (handler) {
          handler(ws, messageData);
        }
      } else {
        // Handle plain text
        const handler = this.messageHandlers.get('text');
        if (handler) {
          handler(ws, messageData);
        }
      }
    } catch (error) {
      console.error(`Error handling message from ${connectionId}:`, error);
      
      const errorResponse = {
        type: 'error',
        error: 'Failed to process message',
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(errorResponse));
    }
  }

  private handleDisconnect(connectionId: string, code: number, reason: Buffer): void {
    console.log(`WebSocket disconnected: ${connectionId}, code: ${code}, reason: ${reason.toString()}`);
    
    this.connections.delete(connectionId);
    this.stats.activeConnections--;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((ws, connectionId) => {
        if (ws.readyState === WsWebSocket.OPEN) {
          ws.ping();
        }
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WsWebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId: string, message: any): boolean {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WsWebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      ws.send(messageStr);
      return true;
    }
    return false;
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Get active connections
   */
  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Add custom message handler
   */
  addMessageHandler(type: string, handler: (ws: WsWebSocket, data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(type: string): boolean {
    return this.messageHandlers.delete(type);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server?.listen(this.config.port, this.config.host, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`WebSocket Test Server started on ${this.config.host}:${this.config.port}${this.config.path}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.stopHeartbeat();
    
    // Close all WebSocket connections
    this.connections.forEach((ws) => {
      try {
        ws.terminate();
      } catch (e) {
        // Ignore errors during termination
      }
    });
    this.connections.clear();
    
    if (this.server?.closeAllConnections) {
      this.server.closeAllConnections();
    }

    return new Promise((resolve) => {
      this.wss?.close(() => {
        this.server?.close(() => {
          console.log('WebSocket Test Server stopped');
          resolve();
        });
      });
    });
  }
}

/**
 * Create a simple WebSocket test client for testing
 */
export class WebSocketTestClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage?: (message: any) => void;
  private onOpen?: () => void;
  private onClose?: () => void;
  private onError?: (error: Error) => void;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use global WebSocket if available (for interception), otherwise use imported WebSocket
      const WebSocketConstructor = (typeof globalThis !== 'undefined' && globalThis.WebSocket) ||
                                   (typeof global !== 'undefined' && global.WebSocket) ||
                                   WsWebSocket; // Fallback to imported WebSocket
      
      // Cast to standard WebSocket since we expect a standard-compliant implementation
      // or at least one that supports standard events as used below
      this.ws = new WebSocketConstructor(this.url) as unknown as WebSocket;

      this.ws.onopen = () => {
        console.log('WebSocket client connected');
        if (this.onOpen) this.onOpen();
        resolve();
      };

      this.ws.onmessage = (event) => {
        // Handle binary data
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob || (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(event.data))) {
          if (this.onMessage) this.onMessage(event.data);
          return;
        }
        
        try {
          const message = JSON.parse(event.data.toString());
          if (this.onMessage) this.onMessage(message);
        } catch (error) {
          // Handle non-JSON messages
          if (this.onMessage) this.onMessage(event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket client disconnected');
        if (this.onClose) this.onClose();
      };

      this.ws.onerror = (event: Event) => {
        console.error('WebSocket client error:', event);
        if (this.onError) this.onError(new Error('WebSocket error'));
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
    }
  }

  sendBinary(data: Buffer | ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  setMessageHandler(handler: (message: any) => void): void {
    this.onMessage = handler;
  }

  setOpenHandler(handler: () => void): void {
    this.onOpen = handler;
  }

  setCloseHandler(handler: () => void): void {
    this.onClose = handler;
  }

  setErrorHandler(handler: (error: Error) => void): void {
    this.onError = handler;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export WebSocket for use in tests
export { WsWebSocket as WebSocket };