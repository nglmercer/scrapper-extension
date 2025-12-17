/**
 * Chrome Extension Example
 * Demonstrates how to use the RAW Data Interceptor in a Chrome extension
 */

// Import the Chrome-specific implementation
import { rawInterceptor, ChromeBackgroundHelper, ChromeContentHelper } from 'raw-data-interceptor/chrome';

// Background script
class ChromeExtensionBackground {
  constructor() {
    this.setupMessageHandlers();
    this.setupStorageListeners();
  }

  async initialize() {
    try {
      // Initialize the RAW interceptor
      await rawInterceptor.initialize();
      
      // Set up Chrome-specific background helpers
      ChromeBackgroundHelper.initialize();
      
      console.log('Chrome extension background script initialized');
    } catch (error) {
      console.error('Failed to initialize background script:', error);
    }
  }

  setupMessageHandlers() {
    // Handle messages from content scripts and popup
    ChromeBackgroundHelper.handleMessage(async (message, sender, sendResponse) => {
      console.log('Background received message:', message);
      
      try {
        switch (message.type) {
          case 'GET_STATS':
            const stats = rawInterceptor.getStats();
            return { success: true, stats };
            
          case 'TOGGLE_DEBUG':
            const debugMode = rawInterceptor.toggleDebugMode();
            return { success: true, debugMode };
            
          case 'TOGGLE_MASTER':
            const masterSwitch = rawInterceptor.toggleMasterSwitch();
            return { success: true, masterSwitch };
            
          case 'GET_CONFIG':
            const config = rawInterceptor.getConfig();
            return { success: true, config };
            
          case 'UPDATE_CONFIG':
            await rawInterceptor.updateConfig(message.config);
            return { success: true };
            
          default:
            return { success: false, error: 'Unknown message type' };
        }
      } catch (error) {
        console.error('Error handling message:', error);
        return { success: false, error: error.message };
      }
    });
  }

  setupStorageListeners() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      console.log('Storage changed:', changes, namespace);
      
      // Handle configuration changes
      if (namespace === 'local') {
        if (changes.masterSwitch || changes.debugMode || changes.websockets) {
          // Configuration will be automatically updated by the interceptor
          console.log('Configuration updated automatically');
        }
      }
    });
  }
}

// Content script
class ChromeExtensionContent {
  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Chrome-specific content helpers
      ChromeContentHelper.initialize();
      
      // Set up message forwarding to background
      this.setupMessageForwarding();
      
      console.log('Chrome extension content script initialized');
    } catch (error) {
      console.error('Failed to initialize content script:', error);
    }
  }

  setupMessageForwarding() {
    // Listen for messages from the page (injected script)
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'RAW_DATA_EVENT') {
        // Forward to background script
        chrome.runtime.sendMessage({
          type: 'RAW_DATA_EVENT',
          payload: event.data.payload
        });
      }
    });
  }
}

// Popup script
class ChromeExtensionPopup {
  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      this.setupUI();
      this.loadStats();
      console.log('Chrome extension popup initialized');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
    }
  }

  setupUI() {
    // Set up toggle buttons
    const debugToggle = document.getElementById('debug-toggle');
    const masterToggle = document.getElementById('master-toggle');
    
    if (debugToggle) {
      debugToggle.addEventListener('click', async () => {
        try {
          const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_DEBUG' });
          if (response.success) {
            this.updateDebugButton(response.debugMode);
          }
        } catch (error) {
          console.error('Failed to toggle debug mode:', error);
        }
      });
    }
    
    if (masterToggle) {
      masterToggle.addEventListener('click', async () => {
        try {
          const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_MASTER' });
          if (response.success) {
            this.updateMasterButton(response.masterSwitch);
          }
        } catch (error) {
          console.error('Failed to toggle master switch:', error);
        }
      });
    }
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response.success) {
        this.displayStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  displayStats(stats) {
    const statsElement = document.getElementById('stats');
    if (statsElement) {
      statsElement.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Intercepts:</span>
          <span class="stat-value">${stats.totalIntercepts}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active Connections:</span>
          <span class="stat-value">${stats.activeConnections}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Connections:</span>
          <span class="stat-value">${stats.totalConnections}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Platform:</span>
          <span class="stat-value">${stats.platform}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Uptime:</span>
          <span class="stat-value">${Math.round(stats.runtime / 1000)}s</span>
        </div>
      `;
    }
  }

  updateDebugButton(debugMode) {
    const button = document.getElementById('debug-toggle');
    if (button) {
      button.textContent = debugMode ? 'Disable Debug' : 'Enable Debug';
      button.className = debugMode ? 'btn btn-warning' : 'btn btn-info';
    }
  }

  updateMasterButton(masterSwitch) {
    const button = document.getElementById('master-toggle');
    if (button) {
      button.textContent = masterSwitch ? 'Disable Interceptor' : 'Enable Interceptor';
      button.className = masterSwitch ? 'btn btn-danger' : 'btn btn-success';
    }
  }
}

// Initialize based on context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  if (chrome.runtime.getManifest) {
    // Background script
    const background = new ChromeExtensionBackground();
    background.initialize();
  } else if (window.location.href.includes('popup.html')) {
    // Popup script
    const popup = new ChromeExtensionPopup();
  } else {
    // Content script
    const content = new ChromeExtensionContent();
  }
}

// Export for use in other scripts
export {
  ChromeExtensionBackground,
  ChromeExtensionContent,
  ChromeExtensionPopup
};