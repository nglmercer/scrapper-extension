// Core types for the RAW Data Interceptor

export interface WebSocketMessage {
  type: 'open' | 'message' | 'close' | 'error';
  connectionId: string;
  data?: any;
  metadata: MessageMetadata;
  timestamp: number;
}

export interface MessageMetadata {
  platform: Platform;
  dataType: 'string' | 'arraybuffer' | 'blob' | 'object';
  size: number;
  url?: string;
  originalType?: string;
  isBinary?: boolean;
  event?: string;
  code?: number;
  reason?: string;
  wasClean?: boolean;
  [key:string]:any;
}

export type Platform = 'tiktok' | 'kick' | 'twitch' | 'youtube' | 'unknown';

export interface ConnectionManagerConfig {
  enabled: boolean;
  maxConnections: number;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  keepAliveInterval: number;
}

export interface InterceptorConfig {
  masterSwitch: boolean;
  debugMode: boolean;
  WebhookUrl: string;
  WebhookOption: boolean;
  WindowUrl: string;
  OpenWindow: boolean;
  eventBufferSize: number;
  // Export methods
  nativeMessaging: {
    enabled: boolean;
    appName: string;
  };
  socketStream: {
    enabled: boolean;
    url: string;
  };
  websockets: WebSocketConfig;
  connectionManager: ConnectionManagerConfig;
}

export interface WebSocketConfig {
  enabled: boolean;
  urlFilters: string[];
  minSize: number;
  maxSize: number;
  excludeStrings: string[];
}

export interface WebhookResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export interface ConnectionInfo {
  id: string;
  url: string;
  protocols?: string | string[];
  state: 'connecting' | 'open' | 'closed' | 'error';
  created: number;
  closed?: number;
}

export interface InterceptorStats {
  totalIntercepts: number;
  totalConnections: number;
  activeConnections: number;
  startTime: number;
  runtime: number;
  platform: Platform;
}

export interface StorageChange<T = any> {
  oldValue?: T;
  newValue?: T;
}

export type StorageChanges = Record<string, StorageChange>;

// Platform-specific storage interfaces
export interface ChromeStorageArea {
  get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
  get(keys: string | string[] | Record<string, any> | null, callback: (items: Record<string, any>) => void): void;
  
  set(items: Record<string, any>): Promise<void>;
  set(items: Record<string, any>, callback: () => void): void;
  
  remove(keys: string | string[]): Promise<void>;
  remove(keys: string | string[], callback: () => void): void;
  
  clear(): Promise<void>;
  clear(callback: () => void): void;
}

export interface ChromeStorage {
  local: ChromeStorageArea;
  sync?: ChromeStorageArea;
  managed?: ChromeStorageArea;
  session?: ChromeStorageArea;
  
  onChanged: {
    addListener(callback: (changes: StorageChanges, areaName: string) => void): void;
    removeListener(callback: (changes: StorageChanges, areaName: string) => void): void;
    hasListener(callback: (changes: StorageChanges, areaName: string) => void): boolean;
  };
}

// Runtime interfaces
export interface ChromeRuntime {
  lastError?: {
    message: string;
  };
  
  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
    removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
    hasListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
  };
  
  onStartup: {
    addListener(callback: () => void): void;
    removeListener(callback: () => void): void;
  };
  
  onInstalled: {
    addListener(callback: (details: {reason: string, previousVersion?: string}) => void): void;
    removeListener(callback: (details: {reason: string, previousVersion?: string}) => void): void;
  };
  
  sendMessage(message: any): Promise<any>;
  sendMessage(message: any, callback: (response: any) => void): void;
  sendMessage(extensionId: string, message: any, callback: (response: any) => void): void;
  
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
  };
}

// Cross-platform abstraction
export interface PlatformStorage {
  get<T = any>(key: string): Promise<T | undefined>;
  get<T = any>(keys: string[]): Promise<Record<string, T>>;
  get<T = any>(keys: Record<string, T>): Promise<Record<string, T>>;
  
  set<T = any>(key: string, value: T): Promise<void>;
  set<T = any>(items: Record<string, T>): Promise<void>;
  
  remove(key: string | string[]): Promise<void>;
  clear(): Promise<void>;
  
  onChanged(callback: (changes: StorageChanges) => void): () => void;
}

export interface PlatformRuntime {
  sendMessage<T = any>(message: T): Promise<any>;
  onMessage(callback: (message: any) => Promise<any> | any): () => void;
  onStartup(callback: () => void): () => void;
  onInstalled(callback: (details: {reason: string, previousVersion?: string}) => void): () => void;
}

export interface DataInterceptor {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getStats(): InterceptorStats;
  getConnections(): ConnectionInfo[];
  toggleDebugMode(): boolean;
  toggleMasterSwitch(): boolean;
  isEnabled(): boolean;
  isDebugMode(): boolean;
}

export interface WebhookService {
  send(url: string, data: any): Promise<WebhookResponse>;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}

export interface WindowService {
  open(url: string): Promise<void>;
  close(): Promise<void>;
  isOpen(): boolean;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}
