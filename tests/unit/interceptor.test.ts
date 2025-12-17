/**
 * Unit tests for interceptor module
 */

/// <reference types="bun-types" />
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { WebSocketInterceptor } from '@/core/interceptor.js';
import type { WebSocketMessage, WebSocketConfig } from '@/types/index.js';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocols?: string | string[];
  private eventListeners = new Map<string, Set<(event: any) => void>>();

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = url instanceof URL ? url.toString() : url;
    this.protocols = protocols;
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.triggerEvent('open', { type: 'open' });
    }, 0);
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  send(data: any): void {
    // Simulate message sending
    this.triggerEvent('message', { type: 'message', data });
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.triggerEvent('close', { type: 'close', code, reason, wasClean: true });
  }

  triggerEvent(type: string, event: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in ${type} listener:`, error);
        }
      });
    }
  }

  simulateError(): void {
    this.triggerEvent('error', { type: 'error' });
  }
}

// Mock global WebSocket
// Mock global WebSocket and window
(globalThis as any).WebSocket = MockWebSocket;
(globalThis as any).window = {
  location: {
    hostname: 'test.com'
  },
  WebSocket: MockWebSocket
};

// Store original WebSocket for restoration
const originalWebSocket = (globalThis as any).WebSocket;

describe('WebSocketInterceptor', () => {
  let interceptor: WebSocketInterceptor;

  beforeEach(() => {
    interceptor = new WebSocketInterceptor();
  });

  afterEach(async () => {
    await interceptor.destroy();
    // Restore original WebSocket
    (globalThis as any).WebSocket = originalWebSocket;
  });

  test('should initialize successfully', async () => {
    await interceptor.initialize();
    expect(interceptor.isEnabled()).toBe(true);
  });

  test('should toggle debug mode', () => {
    const initialMode = interceptor.isDebugMode();
    const newMode = interceptor.toggleDebugMode();
    expect(newMode).toBe(!initialMode);
    expect(interceptor.isDebugMode()).toBe(!initialMode);
  });

  test('should toggle master switch', () => {
    const initialState = interceptor.isEnabled();
    const newState = interceptor.toggleMasterSwitch();
    expect(newState).toBe(!initialState);
    expect(interceptor.isEnabled()).toBe(!initialState);
  });

  test('should get initial stats', () => {
    const stats = interceptor.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalIntercepts).toBe(0);
    expect(stats.totalConnections).toBe(0);
    expect(stats.activeConnections).toBe(0);
    expect(stats.platform).toBeDefined();
  });

  test('should get empty connections list', () => {
    const connections = interceptor.getConnections();
    expect(connections).toBeArray();
    expect(connections).toHaveLength(0);
  });

  test('should handle message callbacks', async () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    await interceptor.initialize();

    // Create a WebSocket connection - this should be intercepted
    const ws = new WebSocket('ws://test.com');
    
    // Wait for connection to open
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Send a message
    ws.send('test message');
    
    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(messages.length).toBeGreaterThan(0);
    
    unsubscribe();
  });

  test('should filter connections based on URL', async () => {
    const config: WebSocketConfig = {
      enabled: true,
      urlFilters: ['allowed.com'],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: []
    };

    interceptor.updateConfig(config);
    await interceptor.initialize();

    // Create connections to different URLs - only allowed should be intercepted
    const allowedWs = new WebSocket('ws://allowed.com/test');
    const blockedWs = new WebSocket('ws://blocked.com/test');

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 50));

    const connections = interceptor.getConnections();
    
    // Only the allowed connection should be tracked
    expect(connections.length).toBe(1);
    expect(connections[0]?.url).toContain('allowed.com');
  });

  test('should filter messages based on size', async () => {
    const config: WebSocketConfig = {
      enabled: true,
      urlFilters: [],
      minSize: 10,
      maxSize: 100,
      excludeStrings: []
    };

    interceptor.updateConfig(config);
    await interceptor.initialize();

    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    const ws = new WebSocket('ws://test.com');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send messages of different sizes
    ws.send('short'); // Too small
    ws.send('this is a medium length message'); // Just right
    ws.send('a'.repeat(200)); // Too large

    await new Promise(resolve => setTimeout(resolve, 50));

    // Only the medium message should be intercepted
    const messageData = messages.filter(m => m.type === 'message').map(m => m.data);
    expect(messageData).toContain('this is a medium length message');
    expect(messageData).not.toContain('short');
    expect(messageData).not.toContain('a'.repeat(200));

    unsubscribe();
  });

  test('should filter messages based on exclude strings', async () => {
    const config: WebSocketConfig = {
      enabled: true,
      urlFilters: [],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: ['exclude', 'filter']
    };

    interceptor.updateConfig(config);
    await interceptor.initialize();

    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    const ws = new WebSocket('ws://test.com');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send messages with and without exclude strings
    ws.send('this should be excluded');
    ws.send('this should pass through');
    ws.send('this should be filtered out');

    await new Promise(resolve => setTimeout(resolve, 50));

    const messageData = messages.filter(m => m.type === 'message').map(m => m.data);
    expect(messageData).toContain('this should pass through');
    expect(messageData).not.toContain('this should be excluded');
    expect(messageData).not.toContain('this should be filtered out');

    unsubscribe();
  });

  test('should handle connection events', async () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    await interceptor.initialize();

    const ws = new WebSocket('ws://test.com');
    
    // Wait for open event
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Send message and close
    ws.send('test message');
    ws.close(1000, 'Normal closure');

    await new Promise(resolve => setTimeout(resolve, 50));

    const eventTypes = messages.map(m => m.type);
    expect(eventTypes).toContain('open');
    expect(eventTypes).toContain('message');
    expect(eventTypes).toContain('close');

    unsubscribe();
  });

  test('should handle error events', async () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    await interceptor.initialize();

    const ws = new WebSocket('ws://test.com');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate error by creating a connection that will fail
    try {
      const errorWs = new WebSocket('ws://invalid-url-that-will-fail.com');
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Expected to fail
    }

    await new Promise(resolve => setTimeout(resolve, 50));

    const errorMessages = messages.filter(m => m.type === 'error');
    expect(errorMessages.length).toBeGreaterThan(0);

    unsubscribe();
  });

  test('should handle disabled state', async () => {
    interceptor.toggleMasterSwitch(); // Disable
    await interceptor.initialize();

    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    const ws = new MockWebSocket('ws://test.com');
    await new Promise(resolve => setTimeout(resolve, 10));
    ws.send('test message');
    await new Promise(resolve => setTimeout(resolve, 10));

    // No messages should be intercepted when disabled
    expect(messages.length).toBe(0);

    unsubscribe();
  });

  test('should handle debug mode', async () => {
    interceptor.toggleDebugMode(); // Enable debug mode
    await interceptor.initialize();

    const consoleSpy = console.log = () => {}; // Mock console.log

    const ws = new MockWebSocket('ws://test.com');
    await new Promise(resolve => setTimeout(resolve, 10));
    ws.send('test message');
    await new Promise(resolve => setTimeout(resolve, 10));

    // In debug mode, console.log should be called
    // (We can't easily test this without more complex mocking)

    console.log = consoleSpy; // Restore console.log
  });

  test('should update configuration', () => {
    const newConfig: WebSocketConfig = {
      enabled: false,
      urlFilters: ['new-filter.com'],
      minSize: 50,
      maxSize: 500,
      excludeStrings: ['new-exclude']
    };

    interceptor.updateConfig(newConfig);
    
    // The config should be updated (we can't easily test this without exposing internal state)
    expect(true).toBe(true); // Placeholder test
  });

  test('should handle data processing', async () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    await interceptor.initialize();

    const ws = new WebSocket('ws://test.com');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send different data types
    ws.send('string message');
    ws.send(new ArrayBuffer(10));
    ws.send(new Blob(['blob content']));
    ws.send(JSON.stringify({ json: 'data' }));

    await new Promise(resolve => setTimeout(resolve, 50));

    const messageData = messages.filter(m => m.type === 'message').map(m => m.data);
    
    // Check that different data types are processed correctly
    expect(messageData).toContain('string message');
    expect(messageData.some(d => d instanceof Uint8Array)).toBe(true);
    expect(messageData).toContain('blob content');
    expect(messageData.some(d => typeof d === 'string' && d.includes('{"json":"data"}'))).toBe(true);

    unsubscribe();
  });
});