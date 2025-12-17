
/**
 * Unit tests for RAWInterceptor
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { RAWInterceptor } from '../../src/index.js';
import type { CrossPlatformStorage } from '../../src/core/storage.js';
import type { WebSocketInterceptor } from '../../src/core/interceptor.js';
import type { InterceptorConfig, WebSocketMessage, StorageChanges } from '../../src/types/index.js';

// Mock types
type MockStorage = CrossPlatformStorage & {
  loadConfig: ReturnType<typeof mock>;
  saveConfig: ReturnType<typeof mock>;
  resetConfig: ReturnType<typeof mock>;
  onChanged: ReturnType<typeof mock>;
  initialize: ReturnType<typeof mock>;
};

type MockInterceptor = WebSocketInterceptor & {
  initialize: ReturnType<typeof mock>;
  destroy: ReturnType<typeof mock>;
  updateConfig: ReturnType<typeof mock>;
  isEnabled: ReturnType<typeof mock>;
  isDebugMode: ReturnType<typeof mock>;
  toggleMasterSwitch: ReturnType<typeof mock>;
  toggleDebugMode: ReturnType<typeof mock>;
  getStats: ReturnType<typeof mock>;
  getConnections: ReturnType<typeof mock>;
  onMessage: ReturnType<typeof mock>;
};

describe('RAWInterceptor', () => {
  let interceptor: RAWInterceptor;
  let mockStorage: MockStorage | any;
  let mockInterceptor: MockInterceptor;
  let configCallback: (changes: StorageChanges) => void;

  beforeEach(() => {
    // Basic mock implementation for Storage
    mockStorage = {
      loadConfig: mock(() => Promise.resolve({})), // Returns empty object to be merged with default
      saveConfig: mock(() => Promise.resolve()),
      resetConfig: mock(() => Promise.resolve()),
      onChanged: mock((cb) => {
        configCallback = cb;
        return () => {}; // return cleanup function
      }),
      initialize: mock(() => {}),
    } as any;

    // Basic mock implementation for WebSocketInterceptor
    mockInterceptor = {
      initialize: mock(() => Promise.resolve()),
      destroy: mock(() => Promise.resolve()),
      updateConfig: mock(() => {}),
      isEnabled: mock(() => true),
      isDebugMode: mock(() => false),
      toggleMasterSwitch: mock(() => false), // Toggling from true -> false
      toggleDebugMode: mock(() => true),    // Toggling from false -> true
      getStats: mock(() => ({
        totalIntercepts: 10,
        totalConnections: 5,
        activeConnections: 1,
        startTime: 0,
        runtime: 100,
        platform: 'chrome'
      })),
      getConnections: mock(() => []),
      onMessage: mock(() => () => {}),
    } as any;

    interceptor = new RAWInterceptor(mockStorage, mockInterceptor);
  });

  afterEach(async () => {
    await interceptor.destroy();
  });

  test('should initialize correctly', async () => {
    await interceptor.initialize();

    expect(mockStorage.loadConfig).toHaveBeenCalled();
    expect(mockInterceptor.updateConfig).toHaveBeenCalled();
    expect(mockInterceptor.initialize).toHaveBeenCalled();
    expect(mockStorage.onChanged).toHaveBeenCalled();
  });

  test('should not initialize twice', async () => {
    await interceptor.initialize();
    
    // Clear mock history
    (mockStorage.loadConfig as any).mockClear();
    
    await interceptor.initialize();
    
    expect(mockStorage.loadConfig).not.toHaveBeenCalled();
  });

  test('should update configuration and sync with dependencies', async () => {
    await interceptor.initialize();

    const newConfig: Partial<InterceptorConfig> = {
      debugMode: true,
      masterSwitch: false // Different from default true
    };
    
    // Setup mock return values to simulate state change
    mockInterceptor.isDebugMode.mockReturnValue(false); // Current state false
    mockInterceptor.isEnabled.mockReturnValue(true);    // Current state true

    await interceptor.updateConfig(newConfig);

    expect(mockStorage.saveConfig).toHaveBeenCalled();
    expect(mockInterceptor.toggleDebugMode).toHaveBeenCalled(); // Should be called because debugMode changed
    expect(mockInterceptor.toggleMasterSwitch).toHaveBeenCalled(); // Should be called because masterSwitch changed
  });

  test('should propagate toggleDebugMode', async () => {
    await interceptor.initialize();

    mockInterceptor.toggleDebugMode.mockReturnValue(true);
    
    const result = interceptor.toggleDebugMode();

    expect(mockInterceptor.toggleDebugMode).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(mockStorage.saveConfig).toHaveBeenCalled(); // Should save the new state
  });

  test('should propagate toggleMasterSwitch', async () => {
    await interceptor.initialize();

    mockInterceptor.toggleMasterSwitch.mockReturnValue(false);

    const result = interceptor.toggleMasterSwitch();

    expect(mockInterceptor.toggleMasterSwitch).toHaveBeenCalled();
    expect(result).toBe(false);
    expect(mockStorage.saveConfig).toHaveBeenCalled();
  });

  test('should reset configuration', async () => {
    mockStorage.loadConfig.mockResolvedValue({
      masterSwitch: true
    } as any);

    await interceptor.resetConfig();

    expect(mockStorage.resetConfig).toHaveBeenCalled();
    expect(mockStorage.loadConfig).toHaveBeenCalled();
    expect(mockStorage.saveConfig).toHaveBeenCalled(); // Called by updateConfig inside resetConfig
  });

  test('should cleanup on destroy', async () => {
    await interceptor.initialize();
    
    await interceptor.destroy();
    
    expect(mockInterceptor.destroy).toHaveBeenCalled();
    
    // Try destroying again - should do nothing
    (mockInterceptor.destroy as any).mockClear();
    await interceptor.destroy();
    expect(mockInterceptor.destroy).not.toHaveBeenCalled();
  });

  test('should handle storage changes', async () => {
    await interceptor.initialize();
    
    // Prepare for change event
    mockStorage.loadConfig.mockResolvedValue({
      debugMode: true,
      masterSwitch: true,
      websockets: { enabled: true }
    } as any);

    mockInterceptor.isDebugMode.mockReturnValue(false); // Current state mismatch with new config
    
    // Trigger storage change
    if (configCallback) {
      configCallback({
        debugMode: { oldValue: false, newValue: true },
        websockets: { oldValue: {}, newValue: {} } as any
      });
    }

    // Wait for promise chain
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockStorage.loadConfig).toHaveBeenCalled();
    expect(mockInterceptor.toggleDebugMode).toHaveBeenCalled();
    expect(mockInterceptor.updateConfig).toHaveBeenCalled();
  });
});
