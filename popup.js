// popup.js - Enhanced popup script with proper background communication
(() => {
  "use strict";

  console.log("RAW Interceptor: Enhanced popup script started");

  // DOM elements cache
  const elements = {
    // Tab buttons
    tabButtons: document.querySelectorAll(".tablink"),
    tabContents: document.querySelectorAll(".tabcontent"),

    // General settings
    masterSwitch: document.getElementById("masterSwitch"),
    WebhookOption: document.getElementById("WebhookOption"),
    WebhookUrl: document.getElementById("WebhookUrl"),
    OpenWindow: document.getElementById("OpenWindow"),
    WindowUrl: document.getElementById("WindowUrl"),

    // Advanced settings
    debugMode: document.getElementById("debugMode"),
    eventBufferSize: document.getElementById("eventBufferSize"),

    // WebSocket filter settings
    wsEnabled: document.getElementById("wsEnabled"),
    wsUrlFilters: document.getElementById("wsUrlFilters"),
    wsMinSize: document.getElementById("wsMinSize"),
    wsMaxSize: document.getElementById("wsMaxSize"),
    wsExcludeStrings: document.getElementById("wsExcludeStrings"),

    // Buttons
    saveAdvanced: document.getElementById("saveAdvanced"),
    resetAdvanced: document.getElementById("resetAdvanced"),
    saveFilters: document.getElementById("saveFilters"),
    resetFilters: document.getElementById("resetFilters"),
    exportConfig: document.getElementById("exportConfig"),
    importConfig: document.getElementById("importConfig"),

    // Status
    status: document.getElementById("status"),
  };

  // Default configuration - FIXED: Removed duplicate properties
  const defaultConfig = {
    WebhookUrl: "",
    WebhookOption: false,
    WindowUrl: "https://nglmercer.github.io/multistreamASTRO/chat",
    OpenWindow: false,
    debugMode: false,
    eventBufferSize: 1000,
    masterSwitch: true,
    // WebSocket settings
    websockets: {
      enabled: true,
      urlFilters: [
        "webcast",
        "tiktok.com",
        "im-ws",
        "pusher",
        "irc-ws.chat.twitch.tv",
      ],
      minSize: 10,
      maxSize: 10000,
      excludeStrings: ["hi", "pong", "ping"],
    },
  };

  let currentConfig = { ...defaultConfig };
  let backgroundPort = null;
  let isLoading = false; // Prevent concurrent loads

  // Initialize tabs
  function initTabs() {
    elements.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.dataset.tab;

        // Update active states
        elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
        elements.tabContents.forEach(
          (content) => (content.style.display = "none"),
        );

        button.classList.add("active");
        document.getElementById(tabName).style.display = "block";
      });
    });

    // Set first tab as active by default
    if (elements.tabButtons[0]) {
      elements.tabButtons[0].click();
    }
  }

  // Show status message
  function showStatus(message, type = "info") {
    if (!elements.status) return;

    elements.status.textContent = message;
    elements.status.className = `status status-${type}`;
    elements.status.style.display = "block";

    setTimeout(() => {
      if (elements.status) {
        elements.status.style.display = "none";
      }
    }, 3000);
  }

  // Save configuration to storage and update background - FIXED: Updated local config
  async function saveConfig(config) {
    try {
      console.log("Saving config:", config);

      // Save to local storage
      await chrome.storage.local.set(config);

      // Update local currentConfig - FIXED: This was missing
      currentConfig = { ...currentConfig, ...config };

      // Send update to background script
      if (backgroundPort) {
        backgroundPort.postMessage({
          type: "UPDATE_CONFIG",
          config: config,
        });
      } else {
        // Fallback to direct message
        chrome.runtime.sendMessage({
          type: "UPDATE_CONFIG",
          config: config,
        });
      }

      showStatus("Configuration saved successfully", "success");
      return true;
    } catch (error) {
      console.error("Error saving config:", error);
      showStatus("Error saving configuration", "error");
      return false;
    }
  }

  // Load configuration from storage - FIXED: Explicit key list
  async function loadConfig() {
    if (isLoading) {
      console.log("Already loading config, skipping...");
      return currentConfig;
    }

    isLoading = true;

    try {
      console.log("Loading configuration from storage...");

      // Use explicit key list to avoid issues with duplicates
      const keysToGet = [
        "WebhookUrl",
        "WebhookOption",
        "WindowUrl",
        "OpenWindow",
        "debugMode",
        "eventBufferSize",
        "masterSwitch",
        "websockets",
      ];

      const result = await chrome.storage.local.get(keysToGet);
      console.log("Storage result:", result);

      currentConfig = { ...defaultConfig, ...result };
      updateUI();

      console.log("Final current config:", currentConfig);
      return currentConfig;
    } catch (error) {
      console.error("Error loading config:", error);
      showStatus("Error loading configuration", "error");
      return defaultConfig;
    } finally {
      isLoading = false;
    }
  }

  // Update UI elements with current config
  function updateUI() {
    console.log("Updating UI with config:", currentConfig);

    // General settings
    if (elements.masterSwitch) {
      elements.masterSwitch.checked = currentConfig.masterSwitch ?? true;
      console.log("Master switch set to:", elements.masterSwitch.checked);
    }

    if (elements.WebhookOption) {
      elements.WebhookOption.checked = currentConfig.WebhookOption || false;
      console.log("Webhook option set to:", elements.WebhookOption.checked);
    }

    if (elements.WebhookUrl) {
      elements.WebhookUrl.value = currentConfig.WebhookUrl || "";
    }

    if (elements.OpenWindow) {
      elements.OpenWindow.checked = currentConfig.OpenWindow || false;
      console.log("Open window set to:", elements.OpenWindow.checked);
    }

    if (elements.WindowUrl) {
      elements.WindowUrl.value = currentConfig.WindowUrl || "";
    }

    // Advanced settings
    if (elements.debugMode) {
      elements.debugMode.checked = currentConfig.debugMode ?? false;
    }

    if (elements.eventBufferSize) {
      elements.eventBufferSize.value = currentConfig.eventBufferSize || 1000;
    }

    // WebSocket settings
    if (elements.wsEnabled) {
      elements.wsEnabled.checked = currentConfig.websockets?.enabled ?? true;
    }

    if (elements.wsUrlFilters) {
      const urlFilters = currentConfig.websockets?.urlFilters || [];
      elements.wsUrlFilters.value = urlFilters.join("\n");
    }

    if (elements.wsMinSize) {
      elements.wsMinSize.value = currentConfig.websockets?.minSize || 10;
    }

    if (elements.wsMaxSize) {
      elements.wsMaxSize.value = currentConfig.websockets?.maxSize || 10000;
    }

    if (elements.wsExcludeStrings) {
      const excludeStrings = currentConfig.websockets?.excludeStrings || [];
      elements.wsExcludeStrings.value = excludeStrings.join(",");
    }

    // Update visibility based on switches - FIXED: Added better error handling
    updateFieldVisibility();
  }

  // Update field visibility based on switch states - FIXED: Better error handling
  function updateFieldVisibility() {
    try {
      const webhookContainer = document.getElementById(
        "WebhookOption_container",
      );
      if (webhookContainer) {
        const shouldShow = currentConfig.WebhookOption;
        webhookContainer.style.display = shouldShow ? "flex" : "none";
        console.log("Webhook container visibility:", shouldShow);
      }

      const windowContainer = document.getElementById("OpenWindow_container");
      if (windowContainer) {
        const shouldShow = currentConfig.OpenWindow;
        windowContainer.style.display = shouldShow ? "flex" : "none";
        console.log("Window container visibility:", shouldShow);
      }
    } catch (error) {
      console.error("Error updating field visibility:", error);
    }
  }

  // Get config from UI
  function getConfigFromUI() {
    const config = {
      ...currentConfig,
      masterSwitch: elements.masterSwitch?.checked ?? true,
      WebhookOption: elements.WebhookOption?.checked || false,
      WebhookUrl: elements.WebhookUrl?.value || "",
      OpenWindow: elements.OpenWindow?.checked || false,
      WindowUrl: elements.WindowUrl?.value || "",
      debugMode: elements.debugMode?.checked ?? false,
      eventBufferSize: parseInt(elements.eventBufferSize?.value) || 1000,
      websockets: {
        enabled: elements.wsEnabled?.checked ?? true,
        urlFilters:
          elements.wsUrlFilters?.value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s) || [],
        minSize: parseInt(elements.wsMinSize?.value) || 10,
        maxSize: parseInt(elements.wsMaxSize?.value) || 10000,
        excludeStrings:
          elements.wsExcludeStrings?.value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s) || [],
      },
    };

    console.log("Config from UI:", config);
    return config;
  }

  // Reset to default configuration
  async function resetToDefault() {
    console.log("Resetting to default configuration");
    currentConfig = { ...defaultConfig };
    updateUI();
    await saveConfig(currentConfig);
    showStatus("Reset to default configuration", "success");
  }

  // Export configuration
  function exportConfig() {
    const configToExport = getConfigFromUI();
    const blob = new Blob([JSON.stringify(configToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "raw-websocket-config.json";
    a.click();
    URL.revokeObjectURL(url);
    showStatus("Configuration exported", "success");
  }

  // Import configuration
  function importConfig() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          const importedConfig = JSON.parse(text);
          currentConfig = { ...defaultConfig, ...importedConfig };
          updateUI();
          await saveConfig(currentConfig);
          showStatus("Configuration imported", "success");
        } catch (error) {
          console.error("Import error:", error);
          showStatus("Error importing configuration", "error");
        }
      }
    };
    input.click();
  }

  // Connect to background script
  function connectToBackground() {
    try {
      backgroundPort = chrome.runtime.connect({ name: "popup" });

      backgroundPort.onMessage.addListener((message) => {
        console.log("Received message from background:", message);

        if (message.type === "CONFIG_UPDATE") {
          currentConfig = { ...currentConfig, ...message.config };
          updateUI();
          showStatus("Configuration updated", "info");
        } else if (message.type === "RAW_DATA_EVENT") {
          // Update real-time stats if needed
          console.log("Received WebSocket data:", message.payload);
        }
      });

      backgroundPort.onDisconnect.addListener(() => {
        console.log("Disconnected from background");
        backgroundPort = null;
      });

      // Request current config when connecting
      setTimeout(() => {
        if (backgroundPort) {
          backgroundPort.postMessage({ type: "GET_CONFIG" });
        }
      }, 100);
    } catch (error) {
      console.error("Failed to connect to background:", error);
    }
  }

  // Event listeners - FIXED: Added proper save calls
  function initEventListeners() {
    // Switch toggles
    if (elements.masterSwitch) {
      elements.masterSwitch.addEventListener("change", async () => {
        currentConfig.masterSwitch = elements.masterSwitch.checked;
        await saveConfig(currentConfig);
      });
    }

    // FIXED: Added save calls for WebhookOption
    if (elements.WebhookOption) {
      elements.WebhookOption.addEventListener("change", async () => {
        currentConfig.WebhookOption = elements.WebhookOption.checked;
        updateFieldVisibility();
        await saveConfig(currentConfig); // FIXED: This was missing
      });
    }

    // FIXED: Added save calls for OpenWindow
    if (elements.OpenWindow) {
      elements.OpenWindow.addEventListener("change", async () => {
        currentConfig.OpenWindow = elements.OpenWindow.checked;
        updateFieldVisibility();
        await saveConfig(currentConfig); // FIXED: This was missing
      });
    }

    // Save buttons
    if (elements.saveAdvanced) {
      elements.saveAdvanced.addEventListener("click", async () => {
        const config = getConfigFromUI();
        await saveConfig(config);
      });
    }

    if (elements.saveFilters) {
      elements.saveFilters.addEventListener("click", async () => {
        const config = getConfigFromUI();
        await saveConfig(config);
      });
    }

    // Reset buttons
    if (elements.resetAdvanced) {
      elements.resetAdvanced.addEventListener("click", resetToDefault);
    }

    if (elements.resetFilters) {
      elements.resetFilters.addEventListener("click", resetToDefault);
    }

    // Export/Import buttons
    if (elements.exportConfig) {
      elements.exportConfig.addEventListener("click", exportConfig);
    }

    if (elements.importConfig) {
      elements.importConfig.addEventListener("click", importConfig);
    }

    // Real-time updates for text inputs - FIXED: Better debouncing
    const textInputs = [
      elements.WebhookUrl,
      elements.WindowUrl,
      elements.eventBufferSize,
      elements.wsUrlFilters,
      elements.wsMinSize,
      elements.wsMaxSize,
      elements.wsExcludeStrings,
    ];

    textInputs.forEach((input) => {
      if (input) {
        let timeout;
        input.addEventListener("input", async () => {
          clearTimeout(timeout);
          timeout = setTimeout(async () => {
            const config = getConfigFromUI();
            await saveConfig(config);
          }, 1000); // Debounce save after 1 second
        });
      }
    });
  }

  // Initialize popup
  async function init() {
    try {
      console.log("Initializing popup...");

      initTabs();
      initEventListeners();
      connectToBackground();

      // Load config with a small delay to ensure DOM is ready
      setTimeout(async () => {
        await loadConfig();
        console.log("Popup initialized successfully");
      }, 100);
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      showStatus("Failed to initialize popup", "error");
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
