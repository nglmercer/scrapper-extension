// content.js - FIXED: Sin duplicaciones
console.log("RAW Interceptor: Enhanced content script started");

let messageCount = 0;
let lastLogTime = 0;
let config = {
  WebhookUrl: "",
  WebhookOption: false,
  WindowUrl: "",
  OpenWindow: false,
  masterSwitch: true,
  debugMode: false,
};

// Detect current platform
function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes("tiktok.com")) return "tiktok";
  if (hostname.includes("kick.com")) return "kick";
  if (hostname.includes("twitch.tv")) return "twitch";
  if (hostname.includes("youtube.com")) return "youtube";
  return "unknown";
}

// Inject WebSocket script into page
function injectScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = () => {
    script.remove();
    console.log("WebSocket interceptor script injected");
  };
  script.onerror = () => console.error("Failed to inject WebSocket script");
  (document.head || document.documentElement).appendChild(script);
}

// FIXED: Un solo handler para TODOS los mensajes
function handleAllMessages(event) {
  // Ignorar mensajes que no son del interceptor
  if (!event.data?.type) return;

  // CASO 1: Mensajes de control desde injected.js
  if (event.data.type === "RAW_INTERCEPTOR_MESSAGE") {
    handleInjectedScriptMessage(event);
    return;
  }

  // CASO 2: Datos de WebSocket desde injected.js
  if (event.data.type === "RAW_DATA_EVENT") {
    forwardWebSocketData(event);
    return;
  }
}

// Handle messages from injected script
function handleInjectedScriptMessage(event) {
  const { type, data } = event.data.payload;

  switch (type) {
    case "REQUEST_CONFIG":
      window.postMessage(
        {
          type: "RAW_INTERCEPTOR_RESPONSE",
          payload: {
            type: "CONFIG_RESPONSE",
            data: {
              masterSwitch: config.masterSwitch,
              debugMode: config.debugMode,
            },
          },
        },
        "*",
      );
      break;

    case "TOGGLE_DEBUG":
      const newDebugMode = !data.currentMode;
      config.debugMode = newDebugMode;
      chrome.storage.local.set({ debugMode: newDebugMode });
      window.postMessage(
        {
          type: "RAW_INTERCEPTOR_RESPONSE",
          payload: {
            type: "TOGGLE_DEBUG",
            data: { debugMode: newDebugMode },
          },
        },
        "*",
      );
      break;

    case "TOGGLE_MASTER":
      const newMasterSwitch = !data.currentSwitch;
      config.masterSwitch = newMasterSwitch;
      chrome.storage.local.set({ masterSwitch: newMasterSwitch });
      window.postMessage(
        {
          type: "RAW_INTERCEPTOR_RESPONSE",
          payload: {
            type: "TOGGLE_MASTER",
            data: { masterSwitch: newMasterSwitch },
          },
        },
        "*",
      );
      break;
  }
}

// Forward WebSocket data to background with throttling
function forwardWebSocketData(event) {
  // Validación adicional
  if (event.data.payload?.source !== "websockets") return;

  messageCount++;
  const now = Date.now();
  const shouldLog = messageCount % 10 === 0 || now - lastLogTime > 5000;

  try {
    if (shouldLog) {
      const payload = event.data.payload;
      console.log("Forwarding WebSocket data:", {
        source: payload.source,
        type: payload.type,
        platform: payload.metadata?.platform,
        size: payload.raw?.length || payload.raw?.byteLength || 0,
        total: messageCount,
      });
      lastLogTime = now;
    }

    // IMPORTANTE: Solo enviamos UNA VEZ a background
    chrome.runtime
      .sendMessage({
        type: "RAW_DATA_EVENT",
        payload: {
          ...event.data.payload,
          platform: detectPlatform(),
          timestamp: Date.now(),
        },
      })
      .catch(() => {
        // Silently handle connection errors
      });
  } catch (error) {
    if (messageCount % 50 === 0) {
      console.error("Error forwarding WebSocket data:", error);
    }
  }
}

// Load configuration from storage
function loadConfig() {
  chrome.storage.local.get(
    [
      "WebhookUrl",
      "WebhookOption",
      "WindowUrl",
      "OpenWindow",
      "masterSwitch",
      "debugMode",
    ],
    (result) => {
      config = {
        WebhookUrl: result.WebhookUrl || "",
        WebhookOption: result.WebhookOption || false,
        WindowUrl: result.WindowUrl || "",
        OpenWindow: result.OpenWindow || false,
        masterSwitch:
          result.masterSwitch !== undefined ? result.masterSwitch : true,
        debugMode: result.debugMode !== undefined ? result.debugMode : true,
      };

      console.log("Configuration loaded:", config);

      // Notify injected script that config is ready
      setTimeout(() => {
        window.postMessage(
          {
            type: "RAW_INTERCEPTOR_RESPONSE",
            payload: {
              type: "CONFIG_RESPONSE",
              data: {
                masterSwitch: config.masterSwitch,
                debugMode: config.debugMode,
              },
            },
          },
          "*",
        );
      }, 1000);
    },
  );
}

// Listen for configuration changes
chrome.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (config.hasOwnProperty(key)) {
      config[key] = newValue;

      // Notify injected script of config changes
      if (key === "masterSwitch" || key === "debugMode") {
        window.postMessage(
          {
            type: "RAW_INTERCEPTOR_RESPONSE",
            payload: {
              type: key === "debugMode" ? "TOGGLE_DEBUG" : "TOGGLE_MASTER",
              data: {
                [key]: newValue,
              },
            },
          },
          "*",
        );
      }
    }
  }
});

// ELIMINADO: Ya no reenviamos mensajes desde aquí
// El background.js se encarga de enviar a la ventana de chat

// Initialize the content script
function initialize() {
  injectScript();
  loadConfig();

  // FIXED: Un solo listener para TODO
  window.addEventListener("message", handleAllMessages, { passive: true });

  // Retry injection if WebSocket interceptor is not available
  setTimeout(() => {
    if (!window.RAWInterceptorAPI) {
      console.log("Retrying WebSocket script injection");
      injectScript();
    }
  }, 2000);

  // Periodic statistics logging
  setInterval(() => {
    if (window.RAWInterceptorAPI && messageCount % 100 === 0) {
      const stats = window.RAWInterceptorAPI.getStats();
      console.log("RAW WebSocket Interceptor Stats:", {
        ...stats,
        forwarded: messageCount,
        rate:
          (messageCount / ((Date.now() - stats.startTime) / 1000)).toFixed(2) +
          " msg/s",
      });
    }
  }, 30000);

  console.log("RAW WebSocket Interceptor initialized");
}

// Start initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
