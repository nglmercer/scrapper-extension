import { PatternController, registerAllComponents } from './components/index.js';

// Types for configuration
interface WebSocketConfig {
    enabled: boolean;
    urlFilters: string[];
    minSize: number;
    maxSize: number;
    excludeStrings: string[];
}

interface ExtensionConfig {
    WebhookUrl: string;
    WebhookOption: boolean;
    WindowUrl: string;
    OpenWindow: boolean;
    nativeMessaging: {
        enabled: boolean;
        appName: string;
    };
    socketStream: {
        enabled: boolean;
        url: string;
    };
    debugMode: boolean;
    eventBufferSize: number;
    masterSwitch: boolean;
    websockets: WebSocketConfig;
    [key: string]: any;
}

const defaultConfig: ExtensionConfig = {
    WebhookUrl: "",
    WebhookOption: false,
    WindowUrl: "/",
    OpenWindow: false,
    debugMode: false,
    eventBufferSize: 1000,
    nativeMessaging: {
        enabled: false,
        appName: 'com.scrapper.extension.host'
    },
    socketStream: {
        enabled: false,
        url: 'ws://localhost:3000'
    },
    masterSwitch: true,
    websockets: {
        enabled: true,
        urlFilters: ["webcast", "tikfinity.zerody.one", "irc-ws.chat.twitch.tv"],
        minSize: 10,
        maxSize: 10000,
        excludeStrings: ["hi", "pong", "ping"],
    },
    connectionManager: {
        enabled: false,
        maxConnections: 10,
        autoReconnect: false,
        reconnectDelay: 3000,
        maxReconnectAttempts: 5,
        keepAliveInterval: 30000
    }
};

/**
 * Popup Manager - handles all popup logic using the pattern controller and custom elements
 */
export class PopupManager {
    private controller: PatternController;
    private backgroundPort: chrome.runtime.Port | null = null;
    private saveTimeouts = new Map<string, NodeJS.Timeout>();
    
    constructor() {
        this.controller = PatternController.getInstance();
        this.setupController();
        this.registerEventListeners();
    }
    
    /**
     * Initialize the popup manager
     */
    async initialize(): Promise<void> {
        // Register all custom elements
        registerAllComponents();
        
        // Load initial configuration
        await this.loadConfig();
        
        // Connect to background script
        this.connectBackground();
        
        // Initialize UI state
        this.initializeUIState();
    }
    
    /**
     * Setup controller middleware and state management
     */
    private setupController(): void {
        // Add middleware for logging
        this.controller.addMiddleware((action: string, data: any) => {
            console.log(`[PopupManager] Action: ${action}`, data);
            return data;
        });
        
        // Add middleware for auto-saving
        this.controller.addMiddleware((action: string, data: any) => {
            if (action === 'UPDATE_CONFIG' || action === 'SET_CONFIG') {
                this.debouncedSave('config_update', async () => {
                    await this.saveConfig(this.controller.getFullState());
                });
            }
            return data;
        });
    }
    
    /**
     * Register event listeners for custom elements
     */
    private registerEventListeners(): void {
        // Listen for tab changes
        document.addEventListener('tab-change', (event: any) => {
            console.log('Tab changed to:', event.detail.tabId);
        });
        
        // Listen for toggle changes
        document.addEventListener('change', (event: any) => {
            if (event.target?.tagName === 'SWITCH-TOGGLE') {
                console.log('Toggle changed:', event.detail);
            }
        });
        
        // Listen for tag input changes
        document.addEventListener('change', (event: any) => {
            if (event.target?.tagName === 'TAG-INPUT') {
                console.log('Tags changed:', event.detail);
            }
        });
        
        // Handle pop-out button
        const popOutBtn = document.getElementById('popOutBtn') as HTMLButtonElement;
        if (popOutBtn) {
            popOutBtn.addEventListener('click', this.handlePopOut.bind(this));
        }
        
        // Handle save buttons
        const saveAdvancedBtn = document.getElementById('saveAdvanced') as HTMLButtonElement;
        if (saveAdvancedBtn) {
            saveAdvancedBtn.addEventListener('click', this.handleSaveAdvanced.bind(this));
        }
        
        const saveFiltersBtn = document.getElementById('saveFilters') as HTMLButtonElement;
        if (saveFiltersBtn) {
            saveFiltersBtn.addEventListener('click', this.handleSaveFilters.bind(this));
        }
        
        // Handle reset buttons
        const resetAdvancedBtn = document.getElementById('resetAdvanced') as HTMLButtonElement;
        if (resetAdvancedBtn) {
            resetAdvancedBtn.addEventListener('click', this.handleResetAdvanced.bind(this));
        }
        
        const resetFiltersBtn = document.getElementById('resetFilters') as HTMLButtonElement;
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', this.handleResetFilters.bind(this));
        }
        
        // Handle export/import buttons
        const exportBtn = document.getElementById('exportConfig') as HTMLButtonElement;
        if (exportBtn) {
            exportBtn.addEventListener('click', this.handleExport.bind(this));
        }
        
        const importBtn = document.getElementById('importConfig') as HTMLButtonElement;
        if (importBtn) {
            importBtn.addEventListener('click', this.handleImport.bind(this));
        }
    }
    
    /**
     * Initialize UI state in the controller
     */
    private initializeUIState(): void {
        // Set initial tab
        this.controller.setState('activeTab', 'general');
        
        // Set connection status
        this.controller.setState('connectionStatus', 'disconnected');
    }
    
    /**
     * Load configuration from storage
     */
    private async loadConfig(): Promise<void> {
        try {
            const stored = await chrome.storage.local.get(null) || {};
            const config = { 
                ...defaultConfig, 
                ...stored,
                websockets: { ...defaultConfig.websockets, ...(stored.websockets || {}) },
                nativeMessaging: { ...defaultConfig.nativeMessaging, ...(stored.nativeMessaging || {}) },
                socketStream: { ...defaultConfig.socketStream, ...(stored.socketStream || {}) }
            };
            
            // Set all config values in the controller
            Object.entries(config).forEach(([key, value]) => {
                this.controller.setState(key, value, true); // silent update
            });
            
            console.log('Configuration loaded:', config);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showToast('Failed to load settings', 'error');
        }
    }
    
    /**
     * Save configuration to storage and notify background
     */
    private async saveConfig(config: Record<string, any>): Promise<void> {
        try {
            await chrome.storage.local.set(config);
            
            if (this.backgroundPort) {
                this.backgroundPort.postMessage({
                    type: 'UPDATE_CONFIG',
                    config: config
                });
            }
            
            this.showToast('Settings saved');
            console.log('Configuration saved:', config);
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }
    
    /**
     * Connect to background script
     */
    private connectBackground(): void {
        try {
            this.backgroundPort = chrome.runtime.connect({ name: 'popup' });
            
            // Update connection status
            this.controller.setState('connectionStatus', 'connected');
            
            this.backgroundPort.onDisconnect.addListener(() => {
                this.controller.setState('connectionStatus', 'disconnected');
                this.backgroundPort = null;
            });
            
            // Request initial config update
            this.backgroundPort.postMessage({ type: 'GET_CONFIG' });
            
            this.backgroundPort.onMessage.addListener((msg) => {
                if (msg.type === 'CONFIG_UPDATE') {
                    // Update controller state with new config
                    this.controller.setStateBatch(msg.config);
                } else if (msg.type === 'LOG_ENTRY') {
                    this.handleBackgroundLog(msg.log);
                }
            });
            
        } catch (e) {
            console.error("Connection failed", e);
            this.controller.setState('connectionStatus', 'disconnected');
        }
    }
    
    /**
     * Handle background script logs
     */
    private handleBackgroundLog(log: any): void {
        const { level, message, data, source } = log;
        const prefix = `[BG-${source}]`;
        
        // Only log if debug mode is on
        const debugMode = this.controller.getState('debugMode');
        if (level === 'DEBUG' && !debugMode) return;
        
        switch (level) {
            case 'ERROR': console.error(prefix, message, data || ''); break;
            case 'WARN': console.warn(prefix, message, data || ''); break;
            default: console.log(prefix, message, data || '');
        }
    }
    
    /**
     * Handle pop-out functionality
     */
    private handlePopOut(): void {
        const width = 400;
        const height = 620;
        
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html?mode=detached'),
            type: 'popup',
            width: width,
            height: height
        });
        
        window.close();
    }
    
    /**
     * Handle save advanced settings
     */
    private async handleSaveAdvanced(): Promise<void> {
        await this.saveConfig(this.controller.getFullState());
    }
    
    /**
     * Handle save filters
     */
    private async handleSaveFilters(): Promise<void> {
        await this.saveConfig(this.controller.getFullState());
    }
    
    /**
     * Handle reset advanced settings
     */
    private async handleResetAdvanced(): Promise<void> {
        const partialConfig = {
            debugMode: defaultConfig.debugMode,
            eventBufferSize: defaultConfig.eventBufferSize
        };
        
        this.controller.setStateBatch(partialConfig);
        await this.saveConfig(this.controller.getFullState());
    }
    
    /**
     * Handle reset filters
     */
    private async handleResetFilters(): Promise<void> {
        this.controller.setState('websockets', { ...defaultConfig.websockets });
        await this.saveConfig(this.controller.getFullState());
    }
    
    /**
     * Handle export configuration
     */
    private handleExport(): void {
        const config = this.controller.getFullState();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raw-interceptor-config.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Handle import configuration
     */
    private handleImport(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const text = await file.text();
                    const imported = JSON.parse(text);
                    const mergedConfig = { ...defaultConfig, ...imported };
                    
                    this.controller.setStateBatch(mergedConfig);
                    await this.saveConfig(this.controller.getFullState());
                    
                    this.showToast('Configuration imported');
                } catch (err) {
                    console.error('Import failed', err);
                    this.showToast('Import failed', 'error');
                }
            }
        };
        input.click();
    }
    
    /**
     * Show temporary toast message
     */
    private showToast(message: string, type: 'success' | 'error' = 'success'): void {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type === 'error' ? 'bg-error' : ''}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }
    
    /**
     * Debounced save function
     */
    private debouncedSave(key: string, callback: () => void, delay: number = 800): void {
        if (this.saveTimeouts.has(key)) {
            clearTimeout(this.saveTimeouts.get(key)!);
        }
        const timer = setTimeout(callback, delay);
        this.saveTimeouts.set(key, timer);
    }
}

// Initialize the popup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const popupManager = new PopupManager();
    await popupManager.initialize();
});
