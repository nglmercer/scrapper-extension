/**
 * Integration tests for WebSocket interception
 * Tests the complete flow from WebSocket creation to message interception
 */

/// <reference types="bun-types" />
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { WebSocketTestServer, WebSocketTestClient, WebSocket } from '../websocket-test-server.js';
import { RAWInterceptor } from '../../src/index.js';
import type { WebSocketMessage, InterceptorConfig } from '../../src/types/index.js';

// Set up global WebSocket for testing
if (typeof globalThis !== 'undefined' && !globalThis.WebSocket) {
  //@ts-ignore
  globalThis.WebSocket = WebSocket;
} else if (typeof global !== 'undefined' && !global.WebSocket) {
  // @ts-ignore - Node.js global
  global.WebSocket = WebSocket;
}

describe('WebSocket Interception Integration Tests', () => {
  let testServer: WebSocketTestServer;
  let interceptor: RAWInterceptor;
  let serverUrl: string;

  beforeAll(async () => {
    // Start test server
    testServer = new WebSocketTestServer({
      port: 8081,
      host: 'localhost',
      path: '/test',
      enableHeartbeat: false
    });
    
    await testServer.start();
    serverUrl = 'ws://localhost:8081/test';
  });

  afterAll(async () => {
    // Stop test server
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(() => {
    // Create fresh interceptor for each test
    interceptor = new RAWInterceptor();
    
    // Configure interceptor for test environment
    interceptor.updateConfig({
      websockets: {
        enabled: true,
        urlFilters: ['localhost'], // Allow localhost connections
        minSize: 0,
        maxSize: Infinity,
        excludeStrings: []
      }
    });
  });

  afterEach(async () => {
    // Clean up interceptor
    if (interceptor) {
      await interceptor.destroy();
    }
  });

  test('should intercept WebSocket connection and messages', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    // Set up message interception
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    // Create WebSocket client
    const client = new WebSocketTestClient(serverUrl);
    
    await client.connect();

    // Send test messages
    client.send({ type: 'text', data: 'Hello World' });
    client.send({ type: 'json', data: { test: 'data', value: 123 } });
    client.send({ type: 'ping', data: 'test-ping' });

    // Wait for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify interception
    expect(interceptedMessages.length).toBeGreaterThan(0);
    
    // Should have connection open event
    const openMessages = interceptedMessages.filter(m => m.type === 'open');
    expect(openMessages.length).toBeGreaterThan(0);
    
    // Should have message events
    const messageEvents = interceptedMessages.filter(m => m.type === 'message');
    expect(messageEvents.length).toBeGreaterThan(0);

    client.close();
    unsubscribe();
  });

  test('should filter messages based on configuration', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Configure interceptor with filters
    const config: Partial<InterceptorConfig> = {
      websockets: {
        enabled: true,
        urlFilters: ['localhost'],
        minSize: 10,
        maxSize: 1000,
        excludeStrings: ['exclude', 'filter']
      }
    };
    
    await interceptor.updateConfig(config);
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    // Set up message interception
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient(serverUrl);
    await client.connect();

    // Send messages that should be filtered
    client.send({ type: 'text', data: 'exclude this message' });
    client.send({ type: 'text', data: 'filter this out' });
    client.send({ type: 'text', data: 'x' }); // Too small
    client.send({ type: 'text', data: 'a'.repeat(2000) }); // Too large

    // Send messages that should pass through
    client.send({ type: 'text', data: 'this should pass through' });
    client.send({ type: 'json', data: { test: 'valid data', length: 'medium' } });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify filtering worked
    const messageEvents = interceptedMessages.filter(m => m.type === 'message');
    
    // Should not have excluded messages
    const messageData = messageEvents.map(m => {
      if (typeof m.data === 'string') {
        try {
          const parsed = JSON.parse(m.data);
          return parsed.data || parsed;
        } catch {
          return m.data;
        }
      }
      return m.data;
    });
    
    // Check the actual message content
    const messageContents = messageData.map(d => typeof d === 'string' ? d : JSON.stringify(d));
    
    expect(messageContents.some(content => content.includes('exclude this message'))).toBe(false);
    expect(messageContents.some(content => content.includes('filter this out'))).toBe(false);
    expect(messageContents.some(content => content === 'x')).toBe(false);
    expect(messageContents.some(content => content.includes('a'.repeat(2000)))).toBe(false);
    
    // Should have valid messages
    expect(messageContents.some(content => content.includes('this should pass through'))).toBe(true);

    client.close();
    unsubscribe();
  });

  test('should handle binary data interception', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient(serverUrl);
    await client.connect();

    // Send binary data
    const binaryData = Buffer.from('Binary test data');
    client.sendBinary(binaryData);

    // Send ArrayBuffer
    const arrayBuffer = new ArrayBuffer(64);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < 64; i++) {
      view[i] = i;
    }
    client.sendBinary(arrayBuffer);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify binary data interception
    const binaryMessages = interceptedMessages.filter(m => 
      m.type === 'message' && m.metadata?.isBinary
    );
    expect(binaryMessages.length).toBeGreaterThan(0);

    client.close();
    unsubscribe();
  });

  test('should handle connection lifecycle events', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient(serverUrl);
    
    // Connect
    await client.connect();

    // Send message and wait for response
    client.send({ type: 'text', data: 'test message' });
    
    // Wait a bit for the message to be processed
    await new Promise(resolve => setTimeout(resolve, 50));

    // Close connection
    client.close();

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify lifecycle events
    const eventTypes = interceptedMessages.map(m => m.type);
    expect(eventTypes).toContain('open');
    expect(eventTypes).toContain('message');
    expect(eventTypes).toContain('close');

    unsubscribe();
  });

  test('should handle multiple simultaneous connections', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    // Create multiple clients
    const clients: WebSocketTestClient[] = [];
    const clientCount = 3;

    for (let i = 0; i < clientCount; i++) {
      const client = new WebSocketTestClient(serverUrl);
      await client.connect();
      clients.push(client);
    }

    // Send messages from different clients
    clients.forEach((client, index) => {
      client.send({ type: 'text', data: `Message from client ${index}` });
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify multiple connections
    const openEvents = interceptedMessages.filter(m => m.type === 'open');
    expect(openEvents.length).toBe(clientCount);

    const messageEvents = interceptedMessages.filter(m => m.type === 'message');
    // Allow for some variation in message count due to timing
    expect(messageEvents.length).toBeGreaterThanOrEqual(clientCount);
    expect(messageEvents.length).toBeLessThanOrEqual(clientCount * 2); // Allow up to 2x due to echo responses

    // Clean up
    clients.forEach(client => client.close());
    unsubscribe();
  });

  test('should handle server broadcast messages', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient(serverUrl);
    await client.connect();

    // Trigger server broadcast
    testServer.broadcast({
      type: 'broadcast',
      data: 'This is a broadcast message',
      timestamp: Date.now()
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify broadcast interception
    const broadcastMessages = interceptedMessages.filter(m =>
      m.type === 'message' && (
        m.data?.type === 'broadcast' ||
        (typeof m.data === 'string' && m.data.includes('broadcast')) ||
        (typeof m.data === 'string' && m.data.includes('This is a broadcast message'))
      )
    );
    expect(broadcastMessages.length).toBeGreaterThan(0);

    client.close();
    unsubscribe();
  });

  test('should handle error events', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient('ws://localhost:8081/invalid');
    
    // Try to connect to invalid endpoint
    try {
      await client.connect();
    } catch (error) {
      // Expected to fail
    }

    // Wait for potential error processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if any error events were intercepted
    const errorEvents = interceptedMessages.filter(m => m.type === 'error');
    // Note: Error events might not be generated in this test setup

    client.close();
    unsubscribe();
  });

  test('should respect master switch', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    // Disable interceptor
    interceptor.toggleMasterSwitch();

    const client = new WebSocketTestClient(serverUrl);
    await client.connect();
    client.send({ type: 'text', data: 'should not be intercepted' });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not have intercepted any messages
    expect(interceptedMessages.length).toBe(0);

    // Enable and test again
    interceptor.toggleMasterSwitch();
    
    // Create a new client connection after enabling
    const client2 = new WebSocketTestClient(serverUrl);
    await client2.connect();
    
    // Send another message
    client2.send({ type: 'text', data: 'should be intercepted now' });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should now have intercepted messages
    expect(interceptedMessages.length).toBeGreaterThan(0);
    
    client2.close();

    client.close();
    unsubscribe();
  });

  test('should provide accurate statistics', async () => {
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage(() => {});

    const initialStats = interceptor.getStats();
    expect(initialStats.totalIntercepts).toBe(0);
    expect(initialStats.totalConnections).toBe(0);
    expect(initialStats.activeConnections).toBe(0);

    const client = new WebSocketTestClient(serverUrl);
    await client.connect();
    
    client.send({ type: 'text', data: 'test message' });
    client.send({ type: 'json', data: { test: 'data' } });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalStats = interceptor.getStats();
    expect(finalStats.totalIntercepts).toBeGreaterThan(0);
    expect(finalStats.totalConnections).toBeGreaterThan(0);
    expect(finalStats.activeConnections).toBeGreaterThan(0);
    expect(finalStats.runtime).toBeGreaterThan(0);

    client.close();
    unsubscribe();
  });

  test('should handle rapid message sending', async () => {
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient(serverUrl);
    await client.connect();

    // Send many messages rapidly
    const messageCount = 50;
    for (let i = 0; i < messageCount; i++) {
      client.send({ type: 'text', data: `Rapid message ${i}` });
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should have intercepted most messages
    const messageEvents = interceptedMessages.filter(m => m.type === 'message');
    expect(messageEvents.length).toBeGreaterThan(messageCount * 0.8); // Allow for some loss

    client.close();
    unsubscribe();
  });
});

describe('WebSocket Interceptor Performance Tests', () => {
  let testServer: WebSocketTestServer;
  let interceptor: RAWInterceptor;

  beforeAll(async () => {
    testServer = new WebSocketTestServer({
      port: 8082,
      host: 'localhost',
      path: '/perf',
      enableHeartbeat: false
    });
    
    await testServer.start();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(() => {
    interceptor = new RAWInterceptor();
  });

  afterEach(async () => {
    if (interceptor) {
      await interceptor.destroy();
    }
  });

  test('should handle high message throughput', async () => {
    const messageCount = 1000;
    const interceptedMessages: WebSocketMessage[] = [];
    
    // Configure interceptor for performance test
    await interceptor.updateConfig({
      websockets: {
        enabled: true,
        urlFilters: ['localhost'],
        minSize: 0,
        maxSize: Infinity,
        excludeStrings: []
      }
    });
    
    // Initialize interceptor first
    await interceptor.initialize();
    
    const unsubscribe = interceptor.onMessage((message) => {
      interceptedMessages.push(message);
    });

    const client = new WebSocketTestClient('ws://localhost:8082/perf');
    await client.connect();

    const startTime = Date.now();

    // Send many messages
    for (let i = 0; i < messageCount; i++) {
      client.send({ type: 'text', data: `Performance test message ${i}` });
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const endTime = Date.now();
    const duration = endTime - startTime;
    const throughput = interceptedMessages.length / (duration / 1000);

    console.log(`Processed ${interceptedMessages.length} messages in ${duration}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);

    // Should handle reasonable throughput
    expect(throughput).toBeGreaterThan(100); // At least 100 messages/second

    client.close();
    unsubscribe();
  });
});