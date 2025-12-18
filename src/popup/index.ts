
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
    debugMode: boolean;
    eventBufferSize: number;
    masterSwitch: boolean;
    websockets: WebSocketConfig;
    [key: string]: any;
}

const defaultConfig: ExtensionConfig = {
    WebhookUrl: "",
    WebhookOption: false,
    WindowUrl: "https://nglmercer.github.io/multistreamASTRO/",
    OpenWindow: false,
    debugMode: false,
    eventBufferSize: 1000,
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

// Tag Input Handler Class
class TagInput {
    private container: HTMLElement;
    private tagsList: HTMLElement;
    private input: HTMLInputElement;
    private hiddenInput: HTMLInputElement;
    private tags: string[] = [];
    private delimiter: string;

    constructor(
        containerId: string, 
        tagsListId: string, 
        inputId: string, 
        hiddenInputId: string,
        initialTags: string[] = [],
        delimiter: string = '\n'
    ) {
        this.container = document.getElementById(containerId) as HTMLElement;
        this.tagsList = document.getElementById(tagsListId) as HTMLElement;
        this.input = document.getElementById(inputId) as HTMLInputElement;
        this.hiddenInput = document.getElementById(hiddenInputId) as HTMLInputElement;
        this.tags = initialTags;
        this.delimiter = delimiter;

        this.init();
        this.render();
    }

    private init() {
        // Handle input keydown
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                this.addTag(this.input.value);
            } else if (e.key === 'Backspace' && this.input.value === '' && this.tags.length > 0) {
                this.removeTag(this.tags.length - 1);
            }
        });

        // Handle focus on container
        this.container.addEventListener('click', () => {
            this.input.focus();
        });

        // Sync hidden input initially
        this.updateHiddenInput();
    }

    public addTag(text: string) {
        const value = text.trim();
        if (value && !this.tags.includes(value)) {
            this.tags.push(value);
            this.input.value = '';
            this.render();
            this.updateHiddenInput();
            this.triggerChange();
        } else {
            this.input.value = ''; // Clear if empty or duplicate
        }
    }

    public removeTag(index: number) {
        this.tags.splice(index, 1);
        this.render();
        this.updateHiddenInput();
        this.triggerChange();
    }

    public setTags(tags: string[]) {
        this.tags = tags;
        this.render();
        this.updateHiddenInput();
    }

    public getTags(): string[] {
        return this.tags;
    }

    private updateHiddenInput() {
        this.hiddenInput.value = this.tags.join(this.delimiter);
    }

    private triggerChange() {
        // Create synthetic input event on the hidden input to trigger listeners
        const event = new Event('input', { bubbles: true });
        this.hiddenInput.dispatchEvent(event);
    }

    private render() {
        this.tagsList.innerHTML = '';
        this.tags.forEach((tag, index) => {
            const tagEl = document.createElement('div');
            tagEl.className = 'tag';
            
            const tagText = document.createElement('span');
            tagText.textContent = tag;
            
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeTag(index);
            };

            tagEl.appendChild(tagText);
            tagEl.appendChild(removeBtn);
            this.tagsList.appendChild(tagEl);
        });
    }
}

// DOM Interface
interface UIElements {
    tabButtons: NodeListOf<HTMLButtonElement>;
    tabContents: NodeListOf<HTMLElement>;
    masterSwitch: HTMLInputElement;
    WebhookOption: HTMLInputElement;
    WebhookUrl: HTMLInputElement;
    OpenWindow: HTMLInputElement;
    WindowUrl: HTMLInputElement;
    debugMode: HTMLInputElement;
    eventBufferSize: HTMLInputElement;
    wsEnabled: HTMLInputElement;
    // wsUrlFilters: HTMLTextAreaElement; // Replaced by TagInput hidden input wrapper or managed separately
    wsMinSize: HTMLInputElement;
    wsMaxSize: HTMLInputElement;
    // wsExcludeStrings: HTMLInputElement; // Replaced by TagInput hidden input wrapper
    saveAdvanced: HTMLButtonElement;
    resetAdvanced: HTMLButtonElement;
    saveFilters: HTMLButtonElement;
    resetFilters: HTMLButtonElement;
    exportConfig: HTMLButtonElement;
    importConfig: HTMLButtonElement;
    connectionStatus: HTMLElement;
    
    // Containers
    WebhookOption_container: HTMLElement;
    OpenWindow_container: HTMLElement;
    
    // Header
    popOutBtn: HTMLButtonElement;
}

// Helper to get element typed
function getEl<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

// Cache DOM elements
function getElements(): UIElements {
    return {
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        masterSwitch: getEl<HTMLInputElement>('masterSwitch'),
        WebhookOption: getEl<HTMLInputElement>('WebhookOption'),
        WebhookUrl: getEl<HTMLInputElement>('WebhookUrl'),
        OpenWindow: getEl<HTMLInputElement>('OpenWindow'),
        WindowUrl: getEl<HTMLInputElement>('WindowUrl'),
        debugMode: getEl<HTMLInputElement>('debugMode'),
        eventBufferSize: getEl<HTMLInputElement>('eventBufferSize'),
        wsEnabled: getEl<HTMLInputElement>('wsEnabled'),
        // These are now handled via TagInput hidden inputs
        // wsUrlFilters: getEl<HTMLTextAreaElement>('wsUrlFilters'),
        wsMinSize: getEl<HTMLInputElement>('wsMinSize'),
        wsMaxSize: getEl<HTMLInputElement>('wsMaxSize'),
        // wsExcludeStrings: getEl<HTMLInputElement>('wsExcludeStrings'), 
        saveAdvanced: getEl<HTMLButtonElement>('saveAdvanced'),
        resetAdvanced: getEl<HTMLButtonElement>('resetAdvanced'),
        saveFilters: getEl<HTMLButtonElement>('saveFilters'),
        resetFilters: getEl<HTMLButtonElement>('resetFilters'),
        exportConfig: getEl<HTMLButtonElement>('exportConfig'),
        importConfig: getEl<HTMLButtonElement>('importConfig'),
        connectionStatus: getEl<HTMLElement>('connectionStatus'),
        WebhookOption_container: getEl<HTMLElement>('WebhookOption_container'),
        OpenWindow_container: getEl<HTMLElement>('OpenWindow_container'),
        popOutBtn: getEl<HTMLButtonElement>('popOutBtn'),
    };
}

let ui: UIElements;
let urlTagInput: TagInput;
let excludeTagInput: TagInput;

/**
 * Initialize Tabs logic
 */
function initTabs() {
    ui.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
             // Remove active class from all
            ui.tabButtons.forEach(b => b.classList.remove('active'));
            ui.tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to current
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            if (tabId) {
                const content = document.getElementById(tabId);
                content?.classList.add('active');
            }
        });
    });
}

function initPopOut() {
    // Check if we are already in a detached window (not a browser action popup)
    // A simple heuristic is checking window type or URL parameters if we set them,
    // but checking chrome.windows.getCurrent works too.
    
    chrome.windows.getCurrent((win) => {
        if (win.type === 'popup') {
           // We are likely in the detached window or a very specific popup mode.
           // Can hide button to avoid recursion, though standard browser action is also 'popup' type in some contexts?
           // Actually, standard extension popup usually closes on blur. 
           // If we created it via windows.create({type: 'popup'}), it persists.
           // We can check search params or just compare functionality.
        }
    });

    ui.popOutBtn.addEventListener('click', () => {
        const width = 400;
        const height = 620;
        
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html?mode=detached'),
            type: 'popup',
            width: width,
            height: height
        });
        
        // Close the current transient popup
        window.close();
    });

    // If we are in detached mode, hide the button
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
    toast.className = `toast ${type === 'error' ? 'bg-error' : ''}`; // simplified logic
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
        const stored = await chrome.storage.local.get(null) || {}; // Get all, guard against undefined
        // Merge with default to ensure all keys exist
        currentConfig = { 
            ...defaultConfig, 
            ...stored,
            websockets: { ...defaultConfig.websockets, ...(stored.websockets || {}) } 
        };
        
        updateUI();
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

/**
 * Update UI fields based on current config
 */
function updateUI() {
    // General
    ui.masterSwitch.checked = currentConfig.masterSwitch;
    ui.WebhookOption.checked = currentConfig.WebhookOption;
    ui.WebhookUrl.value = currentConfig.WebhookUrl || '';
    ui.OpenWindow.checked = currentConfig.OpenWindow;
    ui.WindowUrl.value = currentConfig.WindowUrl || '';

    // Advanced
    ui.debugMode.checked = currentConfig.debugMode;
    ui.eventBufferSize.value = String(currentConfig.eventBufferSize);

    // Filters
    if (currentConfig.websockets) {
        ui.wsEnabled.checked = currentConfig.websockets.enabled;
        
        // Update Tag Inputs
        urlTagInput.setTags(currentConfig.websockets.urlFilters || []);
        excludeTagInput.setTags(currentConfig.websockets.excludeStrings || []);
        
        ui.wsMinSize.value = String(currentConfig.websockets.minSize);
        ui.wsMaxSize.value = String(currentConfig.websockets.maxSize);
    }

    updateCollapsibleVisibility();
}

/**
 * Toggle visibility of collapsible sections
 */
function updateCollapsibleVisibility() {
    if (ui.WebhookOption.checked) {
        ui.WebhookOption_container.classList.add('visible');
    } else {
        ui.WebhookOption_container.classList.remove('visible');
    }

    if (ui.OpenWindow.checked) {
        ui.OpenWindow_container.classList.add('visible');
    } else {
        ui.OpenWindow_container.classList.remove('visible');
    }
}

/**
 * Collect State from UI to Config object
 */
function getConfigFromUI(): ExtensionConfig {
    return {
        ...currentConfig,
        masterSwitch: ui.masterSwitch.checked,
        WebhookOption: ui.WebhookOption.checked,
        WebhookUrl: ui.WebhookUrl.value.trim(),
        OpenWindow: ui.OpenWindow.checked,
        WindowUrl: ui.WindowUrl.value.trim(),
        debugMode: ui.debugMode.checked,
        eventBufferSize: parseInt(ui.eventBufferSize.value) || 1000,
        websockets: {
            enabled: ui.wsEnabled.checked,
            urlFilters: urlTagInput.getTags(), // Get directly from tag input instance
            minSize: parseInt(ui.wsMinSize.value) || 0,
            maxSize: parseInt(ui.wsMaxSize.value) || 10000,
            excludeStrings: excludeTagInput.getTags(), // Get directly from tag input instance
        }
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
 * Setup Event Listeners
 */
function initEventListeners() {
    // Toggles with immediate save
    const toggles = [
        { el: ui.masterSwitch, key: 'masterSwitch' },
        { el: ui.WebhookOption, key: 'WebhookOption' },
        { el: ui.OpenWindow, key: 'OpenWindow' },
        { el: ui.debugMode, key: 'debugMode' },
        { el: ui.wsEnabled, key: 'wsEnabled' },
    ];

    toggles.forEach(({ el, key }) => {
        el.addEventListener('change', async () => {
            updateCollapsibleVisibility();
            const config = getConfigFromUI();
            await saveConfig(config);
        });
    });

    // Inputs with debounce
    const inputs = [
        ui.WebhookUrl, ui.WindowUrl, ui.eventBufferSize, 
        ui.wsMinSize, ui.wsMaxSize
    ];

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            debouncedSave('input_change', async () => {
                const config = getConfigFromUI();
                await saveConfig(config);
            });
        });
    });

    // Listen to changes on the hidden inputs for the TagInputs
    [
        getEl<HTMLInputElement>('wsUrlFilters'), 
        getEl<HTMLInputElement>('wsExcludeStrings')
    ].forEach(hiddenInput => {
        hiddenInput.addEventListener('input', () => {
             debouncedSave('tag_change', async () => {
                const config = getConfigFromUI();
                await saveConfig(config);
            });
        })
    })

    // Buttons
    ui.saveAdvanced.addEventListener('click', async () => {
        await saveConfig(getConfigFromUI());
    });
    
    ui.saveFilters.addEventListener('click', async () => {
        await saveConfig(getConfigFromUI());
    });

    ui.resetAdvanced.addEventListener('click', () => {
        // Only reset advanced fields
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
function connectBackground() {
    try {
        backgroundPort = chrome.runtime.connect({ name: 'popup' });
        
        ui.connectionStatus.classList.add('connected');
        ui.connectionStatus.title = "Connected to background";

        backgroundPort.onDisconnect.addListener(() => {
            ui.connectionStatus.classList.remove('connected');
            ui.connectionStatus.title = "Disconnected";
            backgroundPort = null;
        });

        // Request initial config update just in case
        backgroundPort.postMessage({ type: 'GET_CONFIG' });
        
        backgroundPort.onMessage.addListener((msg) => {
            if (msg.type === 'CONFIG_UPDATE') {
                currentConfig = { ...currentConfig, ...msg.config };
                updateUI();
            } else if (msg.type === 'LOG_ENTRY') {
                // Forward background logs to popup console
                const { level, message, data, source } = msg.log;
                const prefix = `[BG-${source}]`;
                
                // Only log if debug mode is on or it's important
                // The logger already filters DEBUG logs based on debugMode state in background,
                // but we might want to respect local debugMode too.
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

// Data Migration or Cleanup if needed
function integrityCheck() {
    // If we have legacy keys or want to clean up local storage, do it here
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    ui = getElements();
    
    // Initialize Tag Inputs
    urlTagInput = new TagInput(
        'urlFiltersContainer', 
        'urlTagsList', 
        'urlInput', 
        'wsUrlFilters',
        [],
        '\n'
    );
    
    excludeTagInput = new TagInput(
        'excludeStringsContainer', 
        'excludeTagsList', 
        'excludeInput', 
        'wsExcludeStrings',
        [],
        ','
    );

    initTabs();
    initEventListeners();
    initPopOut();
    
    await loadConfig();
    connectBackground();
});
