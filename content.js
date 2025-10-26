// content.js - Enhanced content script with bidirectional communication
console.log("RAW Interceptor: Enhanced content script started");

let messageCount = 0;
let lastLogTime = 0;
let config = {
  WebhookUrl: "",
  WebhookOption: false,
  WindowUrl: "",
  OpenWindow: false,
  // Interceptor specific config
  masterSwitch: true,
  debugMode: true,
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

// Forward WebSocket data to background with throttling
function forwardWebSocketData(event) {
  // Only handle WebSocket events
  if (!event.data?.type || event.data.type !== "RAW_DATA_EVENT") return;
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

// Handle messages from injected script
function handleInjectedScriptMessage(event) {
  if (!event.data?.type || event.data.type !== "RAW_INTERCEPTOR_MESSAGE")
    return;

  const { type, data } = event.data.payload;

  switch (type) {
    case "REQUEST_CONFIG":
      // Send current config to injected script
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
      chrome.storage.local.set({ debugMode: newDebugMode }, () => {
        console.log("Debug mode toggled:", newDebugMode);
      });
      // Send response back to injected script
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
      chrome.storage.local.set({ masterSwitch: newMasterSwitch }, () => {
        console.log("Master switch toggled:", newMasterSwitch);
      });
      // Send response back to injected script
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

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle chat window messages if enabled
  if (
    message.type === "RAW_DATA_EVENT" &&
    config.OpenWindow &&
    config.WindowUrl
  ) {
    chrome.tabs.query({ url: config.WindowUrl + "*" }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting
          .executeScript({
            target: { tabId: tabs[0].id },
            func: (msg) => window.postMessage(msg, "*"),
            args: [message],
          })
          .catch(() => {
            // Silently handle execution errors
          });
      }
    });
  }
  sendResponse({ received: true });
  return true;
});

// Initialize the content script
function initialize() {
  injectScript();
  loadConfig();

  // Listen for messages from injected script
  window.addEventListener("message", handleInjectedScriptMessage);

  // Listen for WebSocket data from injected script
  window.addEventListener("message", forwardWebSocketData, { passive: true });

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
