// background.js - Enhanced service worker with interceptor configuration management
let config = {
  WebhookUrl: "",
  WebhookOption: false,
  WindowUrl: "https://nglmercer.github.io/multistreamASTRO/chat",
  OpenWindow: false,
  // Interceptor specific config
  masterSwitch: true,
  debugMode: true,
};

let chatTabId = null;
let tabCreationPromise = null;
const popupPorts = new Set();

// Load configuration from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      "WebhookUrl",
      "WebhookOption",
      "WindowUrl",
      "OpenWindow",
      "masterSwitch",
      "debugMode",
    ]);

    config.WebhookUrl = result.WebhookUrl || "";
    config.WebhookOption = result.WebhookOption || false;
    config.WindowUrl = result.WindowUrl || config.WindowUrl;
    config.OpenWindow = result.OpenWindow || false;
    config.masterSwitch =
      result.masterSwitch !== undefined ? result.masterSwitch : true;
    config.debugMode = result.debugMode !== undefined ? result.debugMode : true;

    console.log("Background configuration loaded:", config);
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Initialize on startup and install
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();

  // Initialize default values for interceptor config if not set
  const existing = await chrome.storage.local.get([
    "masterSwitch",
    "debugMode",
  ]);
  if (existing.masterSwitch === undefined) {
    await chrome.storage.local.set({ masterSwitch: true });
  }
  if (existing.debugMode === undefined) {
    await chrome.storage.local.set({ debugMode: true });
  }
});

// Listen for configuration changes
chrome.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (config.hasOwnProperty(key)) {
      config[key] = newValue;
      console.log(`Configuration updated: ${key} = ${newValue}`);
    }
  }
});

// Send WebSocket data to webhook
async function sendWebhook(url, data) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handle chat window for WebSocket data
async function handleChatWindow(websocketData) {
  if (!config.OpenWindow || !config.WindowUrl) return;

  try {
    const tabId = await getOrCreateChatTab();
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: (msg) => window.postMessage(msg, "*"),
        args: [websocketData],
      })
      .catch(() => {});
  } catch (error) {
    chatTabId = null;
    tabCreationPromise = null;
  }
}

// Get or create chat tab
function getOrCreateChatTab() {
  if (tabCreationPromise) return tabCreationPromise;

  tabCreationPromise = new Promise(async (resolve, reject) => {
    try {
      const tabs = await chrome.tabs.query({ url: config.WindowUrl + "*" });

      if (tabs.length > 0) {
        chatTabId = tabs[0].id;
        if (tabs[0].status === "complete") {
          resolve(chatTabId);
        } else {
          await waitForTabLoad(chatTabId);
          resolve(chatTabId);
        }
      } else {
        const newTab = await chrome.tabs.create({
          url: config.WindowUrl,
          active: false,
        });
        chatTabId = newTab.id;
        await waitForTabLoad(chatTabId);
        resolve(chatTabId);
      }
    } catch (error) {
      chatTabId = null;
      tabCreationPromise = null;
      reject(error);
    }
  });

  return tabCreationPromise;
}

// Wait for tab to fully load
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") {
          resolve();
        } else {
          setTimeout(checkTab, 100);
        }
      } catch (error) {
        resolve();
      }
    };
    checkTab();
  });
}

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === chatTabId) {
    chatTabId = null;
    tabCreationPromise = null;
  }
});

// Handle port connections from popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    popupPorts.add(port);

    // Send current config when popup connects
    port.postMessage({
      type: "CONFIG_UPDATE",
      config: config,
    });

    port.onDisconnect.addListener(() => popupPorts.delete(port));
  }
});

// Broadcast configuration changes to all content scripts
async function broadcastConfigChange(changes) {
  try {
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "CONFIG_BROADCAST",
          changes: changes,
        });
      } catch (error) {
        // Ignore tabs that don't have content scripts
      }
    }
  } catch (error) {
    console.error("Failed to broadcast config changes:", error);
  }
}

// Main message handler for WebSocket data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Process WebSocket messages
  if (
    message.type === "RAW_DATA_EVENT" &&
    message.payload?.source === "websockets"
  ) {
    // Check master switch before processing
    if (!config.masterSwitch) {
      sendResponse({
        type: "WEBSOCKET_DATA_BLOCKED",
        reason: "Master switch disabled",
      });
      return true;
    }

    if (config.debugMode) {
      console.log("Processing WebSocket data:", {
        platform: message.payload.metadata?.platform,
        type: message.payload.type,
        size: message.payload.raw?.length || 0,
      });
    }

    // Send webhook if enabled
    if (config.WebhookOption && config.WebhookUrl) {
      sendWebhook(config.WebhookUrl, message.payload);
    }

    // Handle chat window if enabled
    if (config.OpenWindow) {
      handleChatWindow(message);
    }

    // Forward to popup ports
    popupPorts.forEach((port) => {
      try {
        port.postMessage(message);
      } catch (error) {
        popupPorts.delete(port);
      }
    });

    sendResponse({ type: "WEBSOCKET_DATA_PROCESSED" });
    return true;
  }

  // Handle configuration updates from popup
  if (message.type === "UPDATE_CONFIG") {
    const updates = message.config;

    // Save to storage
    chrome.storage.local.set(updates, () => {
      console.log("Configuration updated:", updates);
    });

    // Broadcast changes to all content scripts
    broadcastConfigChange(updates);

    // Forward to other popup ports
    popupPorts.forEach((port) => {
      if (port !== sender) {
        try {
          port.postMessage({
            type: "CONFIG_UPDATE",
            config: { ...config, ...updates },
          });
        } catch (error) {
          popupPorts.delete(port);
        }
      }
    });

    sendResponse({ success: true });
    return true;
  }

  // Handle config requests
  if (message.type === "GET_CONFIG") {
    sendResponse({ config: config });
    return true;
  }

  sendResponse({ received: true });
  return true;
});

// Handle installation/updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("RAW Interceptor extension installed");
  } else if (details.reason === "update") {
    console.log("RAW Interceptor extension updated");
  }
});
