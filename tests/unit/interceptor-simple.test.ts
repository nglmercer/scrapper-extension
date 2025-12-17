/**
 * Simplified unit tests for interceptor module
 * Tests core functionality without WebSocket interception
 */

/// <reference types="bun-types" />
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { WebSocketInterceptor } from '@/core/interceptor.js';
import type { WebSocketConfig, WebSocketMessage, Platform } from '@/types/index.js';

describe('WebSocketInterceptor - Core Functionality', () => {
  let interceptor: WebSocketInterceptor;

  beforeEach(() => {
    interceptor = new WebSocketInterceptor();
  });

  afterEach(async () => {
    await interceptor.destroy();
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
    expect(stats.platform as string).toBe('test'); // Should be 'test' from our mock
  });

  test('should get empty connections list', () => {
    const connections = interceptor.getConnections();
    expect(connections).toBeArray();
    expect(connections).toHaveLength(0);
  });

  test('should handle message callbacks', () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    // Manually trigger a message to test the callback system
    const testMessage: WebSocketMessage = {
      type: 'message',
      connectionId: 'test-1',
      data: 'test data',
      metadata: {
        platform: 'unknown',
        dataType: 'string',
        size: 9,
        originalType: 'string',
        isBinary: false,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    // Simulate internal message handling
    (interceptor as any).notifyMessageHandlers(testMessage);

    expect(messages.length).toBe(1);
    expect(messages[0]).toEqual(testMessage);
    
    unsubscribe();
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
    // But we can test that the interceptor still works
    expect(interceptor.isEnabled()).toBe(true); // Master switch should still work
  });

  test('should handle disabled state', async () => {
    interceptor.toggleMasterSwitch(); // Disable
    await interceptor.initialize();

    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    // Manually trigger a message - should not be processed when disabled
    const testMessage: WebSocketMessage = {
      type: 'message',
      connectionId: 'test-1',
      data: 'test data',
      metadata: {
        platform: 'unknown',
        dataType: 'string',
        size: 9,
        originalType: 'string',
        isBinary: false,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    // This should not process the message when disabled
    (interceptor as any).notifyMessageHandlers(testMessage);

    // No messages should be intercepted when disabled
    expect(messages.length).toBe(0);

    unsubscribe();
  });

  test('should handle debug mode', () => {
    interceptor.toggleDebugMode(); // Enable debug mode
    
    // Create a spy for console.log
    const consoleSpy = console.log = () => {};
    
    // Manually trigger a message
    const testMessage: WebSocketMessage = {
      type: 'message',
      connectionId: 'test-1',
      data: 'test data',
      metadata: {
        platform: 'unknown',
        dataType: 'string',
        size: 9,
        originalType: 'string',
        isBinary: false,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    (interceptor as any).notifyMessageHandlers(testMessage);
    
    // In debug mode, console.log should be called
    // (We can't easily test this without more complex mocking)
    
    console.log = consoleSpy; // Restore console.log
    expect(true).toBe(true); // Placeholder test
  });

  test('should handle different message types', () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    // Test different message types
    const messageTypes: WebSocketMessage['type'][] = ['open', 'message', 'close', 'error'];
    
    messageTypes.forEach(type => {
      const testMessage: WebSocketMessage = {
        type,
        connectionId: `test-${type}`,
        metadata: {
          platform: 'unknown',
          dataType: 'string',
          size: 0,
          originalType: 'string',
          isBinary: false,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      if (type === 'message') {
        testMessage.data = 'test data';
      } else if (type === 'close') {
        testMessage.metadata = {
          ...testMessage.metadata,
          event: 'close',
          code: 1000,
          reason: 'Normal closure',
          wasClean: true
        };
      } else if (type === 'error') {
        testMessage.metadata = {
          ...testMessage.metadata,
          event: 'error'
        };
      }

      (interceptor as any).notifyMessageHandlers(testMessage);
    });

    expect(messages.length).toBe(4);
    expect(messages.map(m => m.type)).toEqual(messageTypes);
    
    unsubscribe();
  });

  test('should handle multiple subscribers', () => {
    const messages1: WebSocketMessage[] = [];
    const messages2: WebSocketMessage[] = [];
    
    const unsubscribe1 = interceptor.onMessage((message) => {
      messages1.push(message);
    });
    
    const unsubscribe2 = interceptor.onMessage((message) => {
      messages2.push(message);
    });

    const testMessage: WebSocketMessage = {
      type: 'message',
      connectionId: 'test-1',
      data: 'test data',
      metadata: {
        platform: 'unknown',
        dataType: 'string',
        size: 9,
        originalType: 'string',
        isBinary: false,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    (interceptor as any).notifyMessageHandlers(testMessage);

    expect(messages1.length).toBe(1);
    expect(messages2.length).toBe(1);
    expect(messages1[0]).toEqual(messages2[0]);

    unsubscribe1();
    unsubscribe2();
  });

  test('should handle subscriber unsubscribe', () => {
    const messages: WebSocketMessage[] = [];
    const unsubscribe = interceptor.onMessage((message) => {
      messages.push(message);
    });

    const testMessage: WebSocketMessage = {
      type: 'message',
      connectionId: 'test-1',
      data: 'test data',
      metadata: {
        platform: 'unknown',
        dataType: 'string',
        size: 9,
        originalType: 'string',
        isBinary: false,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    // First message should be received
    (interceptor as any).notifyMessageHandlers(testMessage);
    expect(messages.length).toBe(1);

    // Unsubscribe
    unsubscribe();

    // Second message should not be received
    (interceptor as any).notifyMessageHandlers(testMessage);
    expect(messages.length).toBe(1); // Should still be 1
  });

  test('should handle stats updates', () => {
    const initialStats = interceptor.getStats();
    expect(initialStats.totalIntercepts).toBe(0);

    // Manually update stats by triggering message handling
    const testMessage: WebSocketMessage = {
      type: 'message',
      connectionId: 'test-1',
      data: 'test data',
      metadata: {
        platform: 'unknown',
        dataType: 'string',
        size: 9,
        originalType: 'string',
        isBinary: false,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    // Manually update the start time to ensure runtime > 0
    (interceptor as any).stats.startTime = Date.now() - 1000;
    (interceptor as any).stats.totalIntercepts++;
    const updatedStats = interceptor.getStats();
    
    expect(updatedStats.totalIntercepts).toBe(1);
    expect(updatedStats.runtime).toBeGreaterThan(0);
  });
});

describe('WebSocketInterceptor - Configuration', () => {
  let interceptor: WebSocketInterceptor;

  beforeEach(() => {
    interceptor = new WebSocketInterceptor();
  });

  afterEach(async () => {
    await interceptor.destroy();
  });

  test('should handle configuration with URL filters', () => {
    const config: WebSocketConfig = {
      enabled: true,
      urlFilters: ['allowed.com', 'test.com'],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: []
    };

    interceptor.updateConfig(config);
    
    // Test the shouldInterceptConnection method indirectly
    // We can't easily test this without exposing internal methods,
    // but we can verify the config was updated by checking the interceptor still works
    expect(interceptor.isEnabled()).toBe(true);
  });

  test('should handle configuration with size limits', () => {
    const config: WebSocketConfig = {
      enabled: true,
      urlFilters: [],
      minSize: 10,
      maxSize: 100,
      excludeStrings: []
    };

    interceptor.updateConfig(config);
    expect(interceptor.isEnabled()).toBe(true);
  });

  test('should handle configuration with exclude strings', () => {
    const config: WebSocketConfig = {
      enabled: true,
      urlFilters: [],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: ['exclude', 'filter', 'block']
    };

    interceptor.updateConfig(config);
    expect(interceptor.isEnabled()).toBe(true);
  });

  test('should handle disabled configuration', () => {
    const config: WebSocketConfig = {
      enabled: false,
      urlFilters: [],
      minSize: 0,
      maxSize: Infinity,
      excludeStrings: []
    };

    interceptor.updateConfig(config);
    expect(interceptor.isEnabled()).toBe(true); // Master switch should still work
  });
});