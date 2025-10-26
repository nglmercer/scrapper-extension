// popup.js - FIXED: Sin duplicaciones
(() => {
  "use strict";

  console.log("RAW Interceptor: Enhanced popup script started");

  // DOM elements cache
  const elements = {
    tabButtons: document.querySelectorAll(".tablink"),
    tabContents: document.querySelectorAll(".tabcontent"),
    masterSwitch: document.getElementById("masterSwitch"),
    WebhookOption: document.getElementById("WebhookOption"),
    WebhookUrl: document.getElementById("WebhookUrl"),
    OpenWindow: document.getElementById("OpenWindow"),
    WindowUrl: document.getElementById("WindowUrl"),
    keepAliveOnTabClose: document.getElementById("keepAliveOnTabClose"),
    debugMode: document.getElementById("debugMode"),
    eventBufferSize: document.getElementById("eventBufferSize"),
    wsEnabled: document.getElementById("wsEnabled"),
    wsUrlFilters: document.getElementById("wsUrlFilters"),
    wsMinSize: document.getElementById("wsMinSize"),
    wsMaxSize: document.getElementById("wsMaxSize"),
    wsExcludeStrings: document.getElementById("wsExcludeStrings"),
    saveAdvanced: document.getElementById("saveAdvanced"),
    resetAdvanced: document.getElementById("resetAdvanced"),
    saveFilters: document.getElementById("saveFilters"),
    resetFilters: document.getElementById("resetFilters"),
    exportConfig: document.getElementById("exportConfig"),
    importConfig: document.getElementById("importConfig"),
    status: document.getElementById("status"),
  };

  const defaultConfig = {
    WebhookUrl: "",
    WebhookOption: false,
    WindowUrl: "https://nglmercer.github.io/multistreamASTRO/chat",
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

  let currentConfig = { ...defaultConfig };
  let backgroundPort = null;
  let isLoading = false;

  // FIXED: Flags para evitar inicialización múltiple
  let isInitialized = false;
  let saveTimeouts = new Map(); // Para debouncing individual por campo

  // Initialize tabs
  function initTabs() {
    elements.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.dataset.tab;
        elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
        elements.tabContents.forEach(
          (content) => (content.style.display = "none"),
        );
        button.classList.add("active");
        document.getElementById(tabName).style.display = "block";
      });
    });

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

  // Save configuration to storage and update background
  async function saveConfig(config) {
    try {
      console.log("Saving config:", config);
      await chrome.storage.local.set(config);
      currentConfig = { ...currentConfig, ...config };

      if (backgroundPort) {
        backgroundPort.postMessage({
          type: "UPDATE_CONFIG",
          config: config,
        });
      } else {
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

  // Load configuration from storage
  async function loadConfig() {
    if (isLoading) {
      console.log("Already loading config, skipping...");
      return currentConfig;
    }

    isLoading = true;

    try {
      console.log("Loading configuration from storage...");

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

    if (elements.masterSwitch) {
      elements.masterSwitch.checked = currentConfig.masterSwitch ?? true;
    }

    if (elements.WebhookOption) {
      elements.WebhookOption.checked = currentConfig.WebhookOption || false;
    }

    if (elements.WebhookUrl) {
      elements.WebhookUrl.value = currentConfig.WebhookUrl || "";
    }

    if (elements.OpenWindow) {
      elements.OpenWindow.checked = currentConfig.OpenWindow || false;
    }

    if (elements.WindowUrl) {
      elements.WindowUrl.value = currentConfig.WindowUrl || "";
    }

    if (elements.keepAliveOnTabClose) {
      elements.keepAliveOnTabClose.checked =
        currentConfig.keepAliveOnTabClose || false;
    }

    if (elements.debugMode) {
      elements.debugMode.checked = currentConfig.debugMode ?? false;
    }

    if (elements.eventBufferSize) {
      elements.eventBufferSize.value = currentConfig.eventBufferSize || 1000;
    }

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

    updateFieldVisibility();
  }

  // Update field visibility based on switch states
  function updateFieldVisibility() {
    try {
      const webhookContainer = document.getElementById(
        "WebhookOption_container",
      );
      if (webhookContainer) {
        const shouldShow = currentConfig.WebhookOption;
        webhookContainer.style.display = shouldShow ? "flex" : "none";
      }

      const windowContainer = document.getElementById("OpenWindow_container");
      if (windowContainer) {
        const shouldShow = currentConfig.OpenWindow;
        windowContainer.style.display = shouldShow ? "flex" : "none";
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
        }
      });

      backgroundPort.onDisconnect.addListener(() => {
        console.log("Disconnected from background");
        backgroundPort = null;
      });

      setTimeout(() => {
        if (backgroundPort) {
          backgroundPort.postMessage({ type: "GET_CONFIG" });
        }
      }, 100);
    } catch (error) {
      console.error("Failed to connect to background:", error);
    }
  }

  // FIXED: Debounce mejorado por campo
  function debouncedSave(fieldName, callback, delay = 1000) {
    // Cancelar timeout anterior para este campo específico
    if (saveTimeouts.has(fieldName)) {
      clearTimeout(saveTimeouts.get(fieldName));
    }

    const timeout = setTimeout(callback, delay);
    saveTimeouts.set(fieldName, timeout);
  }

  // Event listeners - FIXED: Sin duplicaciones
  function initEventListeners() {
    // IMPORTANTE: Solo inicializar UNA VEZ
    if (isInitialized) {
      console.log("Event listeners already initialized, skipping...");
      return;
    }

    // Switch toggles
    if (elements.masterSwitch) {
      elements.masterSwitch.addEventListener("change", async () => {
        currentConfig.masterSwitch = elements.masterSwitch.checked;
        await saveConfig(currentConfig);
      });
    }

    if (elements.WebhookOption) {
      elements.WebhookOption.addEventListener("change", async () => {
        currentConfig.WebhookOption = elements.WebhookOption.checked;
        updateFieldVisibility();
        await saveConfig(currentConfig);
      });
    }

    if (elements.OpenWindow) {
      elements.OpenWindow.addEventListener("change", async () => {
        currentConfig.OpenWindow = elements.OpenWindow.checked;
        updateFieldVisibility();
        await saveConfig(currentConfig);
      });
    }

    // Keep Alive toggle - NOTA: Esta funcionalidad NO es posible
    if (elements.keepAliveOnTabClose) {
      elements.keepAliveOnTabClose.addEventListener("change", async () => {
        currentConfig.keepAliveOnTabClose =
          elements.keepAliveOnTabClose.checked;
        await saveConfig(currentConfig);

        // ADVERTENCIA: Esto NO mantendrá la conexión WebSocket viva
        // cuando cierres la pestaña. Las conexiones WebSocket están
        // vinculadas al contexto de la página y se cierran automáticamente.
        showStatus(
          `Keep alive ${currentConfig.keepAliveOnTabClose ? "enabled" : "disabled"} (experimental)`,
          "info",
        );
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

    // Real-time updates for text inputs - FIXED: Mejor debouncing
    const textInputs = [
      { element: elements.WebhookUrl, name: "WebhookUrl" },
      { element: elements.WindowUrl, name: "WindowUrl" },
      { element: elements.eventBufferSize, name: "eventBufferSize" },
      { element: elements.wsUrlFilters, name: "wsUrlFilters" },
      { element: elements.wsMinSize, name: "wsMinSize" },
      { element: elements.wsMaxSize, name: "wsMaxSize" },
      { element: elements.wsExcludeStrings, name: "wsExcludeStrings" },
    ];

    textInputs.forEach(({ element, name }) => {
      if (element) {
        element.addEventListener("input", () => {
          debouncedSave(
            name,
            async () => {
              const config = getConfigFromUI();
              await saveConfig(config);
            },
            1500,
          ); // 1.5 segundos de debounce
        });
      }
    });

    isInitialized = true;
    console.log("Event listeners initialized successfully");
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
