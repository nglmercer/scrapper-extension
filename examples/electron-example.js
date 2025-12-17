/**
 * Electron Application Example
 * Demonstrates how to use the RAW Data Interceptor in an Electron application
 */

// Import the Electron-specific implementation
import { rawInterceptor, ElectronMainHelper, ElectronRendererHelper, ElectronPreloadHelper } from 'raw-data-interceptor/electron';

const { app, BrowserWindow, ipcMain, ipcRenderer, contextBridge } = require('electron');
const path = require('path');

/**
 * Electron Main Process
 */
class ElectronMainApp {
  constructor() {
    this.mainWindow = null;
    this.setupAppEvents();
    this.setupIpcHandlers();
  }

  setupAppEvents() {
    app.whenReady().then(() => {
      this.createWindow();
      this.initializeInterceptor();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Load your application
    this.mainWindow.loadFile('index.html');
    
    // Set up the interceptor main window reference
    const { electronMainRuntime } = require('raw-data-interceptor/electron');
    if (electronMainRuntime.setMainWindow) {
      electronMainRuntime.setMainWindow(this.mainWindow);
    }

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  async initializeInterceptor() {
    try {
      // Set up IPC handlers for the interceptor
      ElectronMainHelper.setupIpcHandlers();
      
      // Initialize the RAW interceptor
      await rawInterceptor.initialize();
      
      console.log('Electron main process interceptor initialized');
    } catch (error) {
      console.error('Failed to initialize interceptor:', error);
    }
  }

  setupIpcHandlers() {
    // Handle requests from renderer process
    ipcMain.handle('interceptor:get-stats', async () => {
      return rawInterceptor.getStats();
    });

    ipcMain.handle('interceptor:toggle-debug', async () => {
      return rawInterceptor.toggleDebugMode();
    });

    ipcMain.handle('interceptor:toggle-master', async () => {
      return rawInterceptor.toggleMasterSwitch();
    });

    ipcMain.handle('interceptor:get-config', async () => {
      return rawInterceptor.getConfig();
    });

    ipcMain.handle('interceptor:update-config', async (event, config) => {
      await rawInterceptor.updateConfig(config);
      return { success: true };
    });

    // Handle WebSocket data from renderer
    ipcMain.handle('interceptor:websocket-data', async (event, data) => {
      console.log('WebSocket data received in main process:', data);
      
      // Process the data as needed
      // You could save to file, send to external service, etc.
      
      return { success: true, processed: true };
    });
  }
}

/**
 * Electron Preload Script
 */
class ElectronPreloadScript {
  constructor() {
    this.setupExposedAPIs();
  }

  setupExposedAPIs() {
    // Expose safe APIs to renderer process
    ElectronPreloadHelper.exposeAPIs();
    
    // Add custom APIs
    contextBridge.exposeInMainWorld('interceptorAPI', {
      // Stats
      getStats: () => ipcRenderer.invoke('interceptor:get-stats'),
      
      // Controls
      toggleDebug: () => ipcRenderer.invoke('interceptor:toggle-debug'),
      toggleMaster: () => ipcRenderer.invoke('interceptor:toggle-master'),
      
      // Configuration
      getConfig: () => ipcRenderer.invoke('interceptor:get-config'),
      updateConfig: (config) => ipcRenderer.invoke('interceptor:update-config', config),
      
      // WebSocket data
      sendWebSocketData: (data) => ipcRenderer.invoke('interceptor:websocket-data', data),
      
      // Platform info
      getPlatformInfo: () => {
        const { ElectronPlatformUtils } = require('raw-data-interceptor/electron');
        return ElectronPlatformUtils.getPlatformInfo();
      }
    });
  }
}

/**
 * Electron Renderer Process
 */
class ElectronRendererApp {
  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize renderer helper
      ElectronRendererHelper.initialize();
      
      // Set up UI
      this.setupUI();
      
      // Load initial data
      await this.loadData();
      
      console.log('Electron renderer process initialized');
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
    }
  }

  setupUI() {
    // Create UI elements
    this.createControlPanel();
    this.createStatsPanel();
    this.createWebSocketPanel();
  }

  createControlPanel() {
    const controlPanel = document.getElementById('control-panel');
    if (!controlPanel) return;

    controlPanel.innerHTML = `
      <div class="panel-header">
        <h3>Interceptor Controls</h3>
      </div>
      <div class="panel-content">
        <button id="toggle-debug" class="btn btn-info">Toggle Debug Mode</button>
        <button id="toggle-master" class="btn btn-primary">Toggle Master Switch</button>
        <button id="refresh-stats" class="btn btn-secondary">Refresh Stats</button>
      </div>
    `;

    // Add event listeners
    document.getElementById('toggle-debug')?.addEventListener('click', async () => {
      try {
        const debugMode = await window.interceptorAPI.toggleDebug();
        this.updateDebugButton(debugMode);
      } catch (error) {
        console.error('Failed to toggle debug mode:', error);
      }
    });

    document.getElementById('toggle-master')?.addEventListener('click', async () => {
      try {
        const masterSwitch = await window.interceptorAPI.toggleMaster();
        this.updateMasterButton(masterSwitch);
      } catch (error) {
        console.error('Failed to toggle master switch:', error);
      }
    });

    document.getElementById('refresh-stats')?.addEventListener('click', () => {
      this.loadData();
    });
  }

  createStatsPanel() {
    const statsPanel = document.getElementById('stats-panel');
    if (!statsPanel) return;

    statsPanel.innerHTML = `
      <div class="panel-header">
        <h3>Interceptor Statistics</h3>
      </div>
      <div class="panel-content">
        <div id="stats-content">
          <p>Loading statistics...</p>
        </div>
      </div>
    `;
  }

  createWebSocketPanel() {
    const wsPanel = document.getElementById('websocket-panel');
    if (!wsPanel) return;

    wsPanel.innerHTML = `
      <div class="panel-header">
        <h3>WebSocket Test</h3>
      </div>
      <div class="panel-content">
        <div class="form-group">
          <label for="ws-url">WebSocket URL:</label>
          <input type="text" id="ws-url" class="form-control" value="ws://localhost:8080" />
        </div>
        <div class="form-group">
          <label for="ws-message">Message:</label>
          <textarea id="ws-message" class="form-control" rows="3">{"type": "test", "data": "Hello World"}</textarea>
        </div>
        <button id="connect-ws" class="btn btn-success">Connect</button>
        <button id="send-message" class="btn btn-primary" disabled>Send Message</button>
        <button id="disconnect-ws" class="btn btn-danger" disabled>Disconnect</button>
        <div id="ws-output" class="mt-3">
          <h4>WebSocket Output:</h4>
          <pre id="ws-messages"></pre>
        </div>
      </div>
    `;

    let ws = null;
    const messagesDiv = document.getElementById('ws-messages');

    document.getElementById('connect-ws')?.addEventListener('click', () => {
      const url = document.getElementById('ws-url').value;
      this.connectWebSocket(url, messagesDiv);
    });

    document.getElementById('send-message')?.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = document.getElementById('ws-message').value;
        try {
          const parsedMessage = JSON.parse(message);
          ws.send(JSON.stringify(parsedMessage));
          this.addMessage(messagesDiv, `Sent: ${message}`);
        } catch (error) {
          // Send as plain text if not valid JSON
          ws.send(message);
          this.addMessage(messagesDiv, `Sent: ${message}`);
        }
      }
    });

    document.getElementById('disconnect-ws')?.addEventListener('click', () => {
      if (ws) {
        ws.close();
      }
    });
  }

  connectWebSocket(url, messagesDiv) {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        this.addMessage(messagesDiv, 'Connected to WebSocket server');
        document.getElementById('send-message').disabled = false;
        document.getElementById('disconnect-ws').disabled = false;
        document.getElementById('connect-ws').disabled = true;
      };

      ws.onmessage = (event) => {
        this.addMessage(messagesDiv, `Received: ${event.data}`);
      };

      ws.onclose = () => {
        this.addMessage(messagesDiv, 'Disconnected from WebSocket server');
        document.getElementById('send-message').disabled = true;
        document.getElementById('disconnect-ws').disabled = true;
        document.getElementById('connect-ws').disabled = false;
      };

      ws.onerror = (error) => {
        this.addMessage(messagesDiv, `Error: ${error.message || 'WebSocket error'}`);
      };

    } catch (error) {
      this.addMessage(messagesDiv, `Connection error: ${error.message}`);
    }
  }

  addMessage(messagesDiv, message) {
    const timestamp = new Date().toLocaleTimeString();
    messagesDiv.textContent += `[${timestamp}] ${message}\n`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async loadData() {
    try {
      // Load statistics
      const stats = await window.interceptorAPI.getStats();
      this.displayStats(stats);
      
      // Load configuration
      const config = await window.interceptorAPI.getConfig();
      this.updateControls(config);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  displayStats(stats) {
    const statsContent = document.getElementById('stats-content');
    if (statsContent) {
      statsContent.innerHTML = `
        <div class="stat-grid">
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
        </div>
      `;
    }
  }

  updateControls(config) {
    this.updateDebugButton(config.debugMode);
    this.updateMasterButton(config.masterSwitch);
  }

  updateDebugButton(debugMode) {
    const button = document.getElementById('toggle-debug');
    if (button) {
      button.textContent = debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode';
      button.className = debugMode ? 'btn btn-warning' : 'btn btn-info';
    }
  }

  updateMasterButton(masterSwitch) {
    const button = document.getElementById('toggle-master');
    if (button) {
      button.textContent = masterSwitch ? 'Disable Interceptor' : 'Enable Interceptor';
      button.className = masterSwitch ? 'btn btn-danger' : 'btn btn-success';
    }
  }
}

// Initialize based on process type
if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
  if (process.type === 'browser') {
    // Main process
    const mainApp = new ElectronMainApp();
  } else if (process.type === 'renderer') {
    // Renderer process
    window.addEventListener('DOMContentLoaded', () => {
      const rendererApp = new ElectronRendererApp();
    });
  }
}

// Export for use in other scripts
export {
  ElectronMainApp,
  ElectronRendererApp,
  ElectronPreloadScript
};