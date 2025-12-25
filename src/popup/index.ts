// Import WebComponents
import { registerComponents } from './components';

// Register custom elements
registerComponents();

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
};

// Application State
let currentConfig: ExtensionConfig = { ...defaultConfig };
let backgroundPort: chrome.runtime.Port | null = null;
let saveTimeouts = new Map<string, Timer>();

// Helper to get typed WebComponent
function getWebComponent<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

// Helper to get vanilla element
function getElement<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

// DOM Interface for vanilla elements
interface VanillaUIElements {
    tabButtons: NodeListOf<HTMLButtonElement>;
    tabContents: NodeListOf<HTMLElement>;
    saveAdvanced: HTMLButtonElement;
    resetAdvanced: HTMLButtonElement;
    saveFilters: HTMLButtonElement;
    resetFilters: HTMLButtonElement;
    exportConfig: HTMLButtonElement;
    importConfig: HTMLButtonElement;
    connectionStatus: HTMLElement;
    popOutBtn: HTMLButtonElement;
}

/**
 * Initialize Tabs logic (vanilla)
 */
function initTabs(ui: VanillaUIElements) {
    ui.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            ui.tabButtons.forEach(b => b.classList.remove('active'));
            ui.tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            if (tabId) {
                const content = document.getElementById(tabId);
                content?.classList.add('active');
            }
        });
    });
}

function initPopOut(ui: VanillaUIElements) {
    ui.popOutBtn.addEventListener('click', () => {
        const width = 400;
        const height = 620;
        
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html?mode=detached'),
            type: 'popup',
            width: width,
            height: height
        });
        
        window.close();
    });

    if (new URLSearchParams(window.location.search).get('mode') === 'detached') {
        ui.popOutBtn.style.display = 'none';
        document.body.classList.add('detached');
    }
}

/**
 * Show a temporary toast message
 */
function showToast(message: string, type: 'success' | 'error' = 'success') {
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
 * Save configuration to storage and notify background
 */
async function saveConfig(config: ExtensionConfig) {
    try {
        await chrome.storage.local.set(config);
        currentConfig = { ...currentConfig, ...config };
        
        if (backgroundPort) {
            backgroundPort.postMessage({
                type: 'UPDATE_CONFIG',
                config: config
            });
        }
        
        showToast('Settings saved');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('Failed to save settings', 'error');
    }
}

/**
 * Load configuration from storage
 */
async function loadConfig() {
    try {
        const stored = await chrome.storage.local.get(null) || {};
        currentConfig = { 
            ...defaultConfig, 
            ...stored,
            websockets: { ...defaultConfig.websockets, ...(stored.websockets || {}) },
            nativeMessaging: { ...defaultConfig.nativeMessaging, ...(stored.nativeMessaging || {}) },
            socketStream: { ...defaultConfig.socketStream, ...(stored.socketStream || {}) }
        };
        
        updateUI();
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

/**
 * Update UI fields based on current config using setData
 */
function updateUI() {
    // Get WebComponents
    const masterSwitch = getWebComponent<HTMLElement & { setData(data: boolean): void }>('masterSwitch');
    const debugMode = getWebComponent<HTMLElement & { setData(data: boolean): void }>('debugMode');
    const wsEnabled = getWebComponent<HTMLElement & { setData(data: boolean): void }>('wsEnabled');
    
    const WebhookUrl = getWebComponent<HTMLElement & { setData(data: string): void }>('WebhookUrl');
    const WindowUrl = getWebComponent<HTMLElement & { setData(data: string): void }>('WindowUrl');
    const nativeAppName = getWebComponent<HTMLElement & { setData(data: string): void }>('nativeAppName');
    const socketUrl = getWebComponent<HTMLElement & { setData(data: string): void }>('socketUrl');
    
    const eventBufferSize = getWebComponent<HTMLElement & { setData(data: number): void }>('eventBufferSize');
    const wsMinSize = getWebComponent<HTMLElement & { setData(data: number): void }>('wsMinSize');
    const wsMaxSize = getWebComponent<HTMLElement & { setData(data: number): void }>('wsMaxSize');
    
    const urlFilters = getWebComponent<HTMLElement & { setData(data: string): void }>('urlFilters');
    const excludeStrings = getWebComponent<HTMLElement & { setData(data: string): void }>('excludeStrings');
    
    // Config Cards
    const webhookCard = getWebComponent<HTMLElement & { getToggle(): any }>('webhookCard');
    const windowCard = getWebComponent<HTMLElement & { getToggle(): any }>('windowCard');
    const nativeCard = getWebComponent<HTMLElement & { getToggle(): any }>('nativeCard');
    const socketCard = getWebComponent<HTMLElement & { getToggle(): any }>('socketCard');

    // Update toggles
    masterSwitch.setData(currentConfig.masterSwitch);
    debugMode.setData(currentConfig.debugMode);
    wsEnabled.setData(currentConfig.websockets.enabled);

    // Update text inputs
    WebhookUrl.setData(currentConfig.WebhookUrl || '');
    WindowUrl.setData(currentConfig.WindowUrl || '');
    nativeAppName.setData(currentConfig.nativeMessaging?.appName || '');
    socketUrl.setData(currentConfig.socketStream?.url || '');

    // Update number inputs
    eventBufferSize.setData(currentConfig.eventBufferSize);
    wsMinSize.setData(currentConfig.websockets.minSize);
    wsMaxSize.setData(currentConfig.websockets.maxSize);

    // Update tag inputs
    urlFilters.setData(currentConfig.websockets.urlFilters?.join('\n') || '');
    excludeStrings.setData(currentConfig.websockets.excludeStrings?.join(',') || '');

    // Update config card toggles
    if (webhookCard?.getToggle()) {
        webhookCard.getToggle().setData(currentConfig.WebhookOption);
    }
    if (windowCard?.getToggle()) {
        windowCard.getToggle().setData(currentConfig.OpenWindow);
    }
    if (nativeCard?.getToggle()) {
        nativeCard.getToggle().setData(currentConfig.nativeMessaging?.enabled || false);
    }
    if (socketCard?.getToggle()) {
        socketCard.getToggle().setData(currentConfig.socketStream?.enabled || false);
    }
}

/**
 * Collect State from UI to Config object using getData
 */
function getConfigFromUI(): ExtensionConfig {
    // Get WebComponents
    const masterSwitch = getWebComponent<HTMLElement & { getData(): boolean }>('masterSwitch');
    const debugMode = getWebComponent<HTMLElement & { getData(): boolean }>('debugMode');
    const wsEnabled = getWebComponent<HTMLElement & { getData(): boolean }>('wsEnabled');
    
    const WebhookUrl = getWebComponent<HTMLElement & { getData(): string }>('WebhookUrl');
    const WindowUrl = getWebComponent<HTMLElement & { getData(): string }>('WindowUrl');
    const nativeAppName = getWebComponent<HTMLElement & { getData(): string }>('nativeAppName');
    const socketUrl = getWebComponent<HTMLElement & { getData(): string }>('socketUrl');
    
    const eventBufferSize = getWebComponent<HTMLElement & { getData(): number }>('eventBufferSize');
    const wsMinSize = getWebComponent<HTMLElement & { getData(): number }>('wsMinSize');
    const wsMaxSize = getWebComponent<HTMLElement & { getData(): number }>('wsMaxSize');
    
    const urlFilters = getWebComponent<HTMLElement & { getData(): string }>('urlFilters');
    const excludeStrings = getWebComponent<HTMLElement & { getData(): string }>('excludeStrings');
    
    // Config Cards
    const webhookCard = getWebComponent<HTMLElement & { getToggle(): any }>('webhookCard');
    const windowCard = getWebComponent<HTMLElement & { getToggle(): any }>('windowCard');
    const nativeCard = getWebComponent<HTMLElement & { getToggle(): any }>('nativeCard');
    const socketCard = getWebComponent<HTMLElement & { getToggle(): any }>('socketCard');

    // Parse tag inputs
    const urlTags = urlFilters.getData().split('\n').filter(t => t.trim());
    const excludeTags = excludeStrings.getData().split(',').filter(t => t.trim());

    return {
        ...currentConfig,
        masterSwitch: masterSwitch.getData(),
        debugMode: debugMode.getData(),
        websockets: {
            enabled: wsEnabled.getData(),
            urlFilters: urlTags,
            minSize: wsMinSize.getData(),
            maxSize: wsMaxSize.getData(),
            excludeStrings: excludeTags
        },
        WebhookUrl: WebhookUrl.getData().trim(),
        WindowUrl: WindowUrl.getData().trim(),
        nativeMessaging: {
            enabled: nativeCard.getToggle().getData(),
            appName: nativeAppName.getData().trim()
        },
        socketStream: {
            enabled: socketCard.getToggle().getData(),
            url: socketUrl.getData().trim()
        },
        WebhookOption: webhookCard.getToggle().getData(),
        OpenWindow: windowCard.getToggle().getData(),
        eventBufferSize: eventBufferSize.getData()
    };
}

/**
 * Auto-save with debounce
 */
function debouncedSave(key: string, callback: () => void, delay = 800) {
    if (saveTimeouts.has(key)) {
        clearTimeout(saveTimeouts.get(key));
    }
    const timer = setTimeout(callback, delay);
    saveTimeouts.set(key, timer);
}

/**
 * Setup Event Listeners for WebComponents
 */
function initEventListeners(ui: VanillaUIElements) {
    // Listen to change events from all WebComponents
    const components = document.querySelectorAll('raw-toggle, raw-text-input, raw-number-input, raw-tag-input, raw-config-card');
    
    components.forEach(comp => {
        // Listen for both change and input events
        comp.addEventListener('change', () => {
            debouncedSave('component_change', async () => {
                const config = getConfigFromUI();
                await saveConfig(config);
            });
        });

        comp.addEventListener('input', () => {
            debouncedSave('component_input', async () => {
                const config = getConfigFromUI();
                await saveConfig(config);
            });
        });
    });

    // Buttons
    ui.saveAdvanced.addEventListener('click', async () => {
        await saveConfig(getConfigFromUI());
    });
    
    ui.saveFilters.addEventListener('click', async () => {
        await saveConfig(getConfigFromUI());
    });

    ui.resetAdvanced.addEventListener('click', () => {
        const partialConfig = {
            ...currentConfig,
            debugMode: defaultConfig.debugMode,
            eventBufferSize: defaultConfig.eventBufferSize
        };
        saveConfig(partialConfig).then(loadConfig);
    });

    ui.resetFilters.addEventListener('click', () => {
        const partialConfig = {
            ...currentConfig,
            websockets: { ...defaultConfig.websockets }
        };
        saveConfig(partialConfig).then(loadConfig);
    });

    // Export
    ui.exportConfig.addEventListener('click', () => {
        const config = getConfigFromUI();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raw-interceptor-config.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import
    ui.importConfig.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const text = await file.text();
                    const imported = JSON.parse(text);
                    await saveConfig({ ...defaultConfig, ...imported });
                    await loadConfig();
                    showToast('Configuration imported');
                } catch (err) {
                    console.error('Import failed', err);
                    showToast('Import failed', 'error');
                }
            }
        };
        input.click();
    });
}

/**
 * Background Connection
 */
function connectBackground(ui: VanillaUIElements) {
    try {
        backgroundPort = chrome.runtime.connect({ name: 'popup' });
        
        ui.connectionStatus.classList.add('connected');
        ui.connectionStatus.title = "Connected to background";

        backgroundPort.onDisconnect.addListener(() => {
            ui.connectionStatus.classList.remove('connected');
            ui.connectionStatus.title = "Disconnected";
            backgroundPort = null;
        });

        backgroundPort.postMessage({ type: 'GET_CONFIG' });
        
        backgroundPort.onMessage.addListener((msg) => {
            if (msg.type === 'CONFIG_UPDATE') {
                currentConfig = { ...currentConfig, ...msg.config };
                updateUI();
            } else if (msg.type === 'LOG_ENTRY') {
                const { level, message, data, source } = msg.log;
                const prefix = `[BG-${source}]`;
                
                if (level === 'DEBUG' && !currentConfig.debugMode) return;

                switch (level) {
                   case 'ERROR': console.error(prefix, message, data || ''); break;
                   case 'WARN': console.warn(prefix, message, data || ''); break;
                   default: console.log(prefix, message, data || '');
                }
            }
        });
        
    } catch (e) {
        console.error("Connection failed", e);
    }
}

// Cache vanilla UI elements
function getVanillaElements(): VanillaUIElements {
    return {
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        saveAdvanced: getElement<HTMLButtonElement>('saveAdvanced'),
        resetAdvanced: getElement<HTMLButtonElement>('resetAdvanced'),
        saveFilters: getElement<HTMLButtonElement>('saveFilters'),
        resetFilters: getElement<HTMLButtonElement>('resetFilters'),
        exportConfig: getElement<HTMLButtonElement>('exportConfig'),
        importConfig: getElement<HTMLButtonElement>('importConfig'),
        connectionStatus: getElement<HTMLElement>('connectionStatus'),
        popOutBtn: getElement<HTMLButtonElement>('popOutBtn'),
    };
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    const ui = getVanillaElements();
    
    initTabs(ui);
    initEventListeners(ui);
    initPopOut(ui);
    
    await loadConfig();
    connectBackground(ui);
});
