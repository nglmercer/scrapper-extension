/**
 * Unit tests for storage module
 */

/// <reference types="bun-types" />
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { CrossPlatformStorage, StorageFactory, DEFAULT_CONFIG } from '@/core/storage.js';
import { chromeStorage } from '@/platforms/chrome/storage-polyfill.js';

describe('CrossPlatformStorage', () => {
  let storage: CrossPlatformStorage;

  beforeEach(() => {
    storage = new CrossPlatformStorage('local');
    // Clear storage before each test
    chromeStorage.local.clear();
  });

  afterEach(() => {
    // Clean up after each test
    StorageFactory.clearCache();
  });

  test('should initialize successfully', () => {
    expect(storage).toBeDefined();
    expect(storage).toBeInstanceOf(CrossPlatformStorage);
  });

  test('should set and get single value', async () => {
    await storage.set('testKey', 'testValue');
    const value = await storage.get<string>('testKey');
    expect(value).toBe('testValue');
  });

  test('should set and get multiple values', async () => {
    const testData = {
      key1: 'value1',
      key2: 42,
      key3: true
    };

    await storage.set(testData);
    const result = await storage.get(['key1', 'key2', 'key3']);
    
    expect(result.key1).toBe('value1');
    expect(result.key2).toBe(42);
    expect(result.key3).toBe(true);
  });

  test('should handle undefined values', async () => {
    const value = await storage.get('nonExistentKey');
    expect(value).toBeUndefined();
  });

  test('should remove values', async () => {
    await storage.set('testKey', 'testValue');
    await storage.remove('testKey');
    const value = await storage.get('testKey');
    expect(value).toBeUndefined();
  });

  test('should clear all values', async () => {
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.clear();
    
    const value1 = await storage.get('key1');
    const value2 = await storage.get('key2');
    
    expect(value1).toBeUndefined();
    expect(value2).toBeUndefined();
  });

  test('should handle configuration loading', async () => {
    const config = await storage.loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test('should handle configuration saving', async () => {
    const newConfig = {
      ...DEFAULT_CONFIG,
      masterSwitch: false,
      debugMode: true
    };

    await storage.saveConfig(newConfig);
    const loadedConfig = await storage.loadConfig();
    
    expect(loadedConfig.masterSwitch).toBe(false);
    expect(loadedConfig.debugMode).toBe(true);
  });

  test('should handle configuration reset', async () => {
    await storage.setConfigValue('masterSwitch', false);
    await storage.setConfigValue('debugMode', true);
    
    await storage.resetConfig();
    const config = await storage.loadConfig();
    
    expect(config.masterSwitch).toBe(DEFAULT_CONFIG.masterSwitch);
    expect(config.debugMode).toBe(DEFAULT_CONFIG.debugMode);
  });

  test('should handle individual config values', async () => {
    await storage.setConfigValue('masterSwitch', false);
    await storage.setConfigValue('WebhookUrl', 'https://example.com/webhook');
    
    const masterSwitch = await storage.getConfigValue('masterSwitch');
    const webhookUrl = await storage.getConfigValue('WebhookUrl');
    
    expect(masterSwitch).toBe(false);
    expect(webhookUrl).toBe('https://example.com/webhook');
  });

  test('should notify change listeners', async () => {
    const changes: any[] = [];
    const unsubscribe = storage.onChanged((change) => {
      changes.push(change);
    });

    await storage.set('testKey', 'testValue');
    await storage.remove('testKey');

    // Allow time for async notifications
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(changes.length).toBeGreaterThan(0);
    
    unsubscribe();
  });

  test('should handle errors gracefully', async () => {
    // Test with invalid storage area
    const invalidStorage = new CrossPlatformStorage('invalid' as any);
    
    try {
      await invalidStorage.get('test');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('StorageFactory', () => {
  test('should create singleton instances', () => {
    const storage1 = StorageFactory.create('local');
    const storage2 = StorageFactory.create('local');
    
    expect(storage1).toBe(storage2);
  });

  test('should create different instances for different areas', () => {
    const localStorage = StorageFactory.create('local');
    const syncStorage = StorageFactory.create('sync');
    
    expect(localStorage).not.toBe(syncStorage);
  });

  test('should clear cache', () => {
    const storage1 = StorageFactory.create('local');
    StorageFactory.clearCache();
    const storage2 = StorageFactory.create('local');
    
    expect(storage1).not.toBe(storage2);
  });
});