(() => {
  // injected.js - Simplified WebSocket interceptor
  console.log("RAW Interceptor: Multi-WebSocket script started");

  // Global state for managing multiple connections
  const state = {
    connections: new Map(), // Map<connectionId, {ws, url, protocols, metadata}>
    config: {
      masterSwitch: true,
      debugMode: true,
    },
    stats: {
      totalIntercepts: 0,
      totalConnections: 0,
      startTime: Date.now(),
    },
    connectionCounter: 0,
  };

  // Log based on debug mode
  function log(message, data) {
    if (state.config.debugMode) {
      console.log(`[WS-Interceptor] ${message}`, data || "");
    }
  }

  // Detect platform
  function detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes("tiktok.com")) return "tiktok";
    if (hostname.includes("kick.com")) return "kick";
    if (hostname.includes("twitch.tv")) return "twitch";
    if (hostname.includes("youtube.com")) return "youtube";
    return "unknown";
  }

  // Send message to content script
  function sendMessageToContent(type, data) {
    try {
      window.postMessage(
        {
          type: "RAW_INTERCEPTOR_MESSAGE",
          payload: { type, data },
        },
        "*",
      );
    } catch (error) {
      console.error("Failed to send message to content script:", error);
    }
  }

  // Request configuration from content script
  function requestConfig() {
    sendMessageToContent("REQUEST_CONFIG", {});
  }

  // Update local configuration
  function updateConfig(newConfig) {
    const oldDebugMode = state.config.debugMode;
    state.config = { ...state.config, ...newConfig };

    if (oldDebugMode !== state.config.debugMode) {
      log(`Debug mode ${state.config.debugMode ? "enabled" : "disabled"}`);
    }

    log("Configuration updated", state.config);
  }

  // Emit WebSocket data for any connection
  function emitWebSocketData(connectionId, type, raw, metadata = {}) {
    if (!state.config.masterSwitch) return;

    state.stats.totalIntercepts++;

    const event = {
      type: "RAW_DATA_EVENT",
      payload: {
        connectionId,
        source: "websockets",
        type,
        raw,
        metadata: {
          platform: detectPlatform(),
          timestamp: Date.now(),
          dataType:
            typeof raw === "string"
              ? "string"
              : raw instanceof ArrayBuffer
                ? "arraybuffer"
                : raw instanceof Blob
                  ? "blob"
                  : "object",
          size: raw?.length || raw?.byteLength || raw?.size || 0,
          ...metadata,
        },
      },
    };

    window.postMessage(event, "*");

    if (state.stats.totalIntercepts % 100 === 0) {
      log(`Processed ${state.stats.totalIntercepts} WebSocket messages`);
    }
  }

  // Listen for messages from content script
  function setupMessageListener() {
    window.addEventListener("message", (event) => {
      if (event.data?.type === "RAW_INTERCEPTOR_RESPONSE") {
        const { type, data } = event.data.payload;

        switch (type) {
          case "CONFIG_RESPONSE":
            updateConfig(data);
            break;
          case "TOGGLE_DEBUG":
            updateConfig({ debugMode: data.debugMode });
            break;
          case "TOGGLE_MASTER":
            updateConfig({ masterSwitch: data.masterSwitch });
            break;
        }
      }
    });
  }

  // Intercept WebSocket constructor to track all connections
  function interceptWebSocket() {
    if (!window.WebSocket) {
      log("WebSocket not available");
      return;
    }

    const OriginalWebSocket = window.WebSocket;

    window.WebSocket = function (url, protocols) {
      const connectionId = `ws_${++state.connectionCounter}`;
      const ws = new OriginalWebSocket(url, protocols);

      // Store connection info
      const connectionInfo = {
        ws,
        url,
        protocols,
        connectionId,
        created: Date.now(),
        state: "connecting",
      };

      state.connections.set(connectionId, connectionInfo);
      state.stats.totalConnections++;

      log(`New WebSocket connection created: ${connectionId}`, {
        url,
        protocols,
      });

      // Set up event listeners
      ws.addEventListener("open", (event) => {
        connectionInfo.state = "open";
        emitWebSocketData(connectionId, "open", null, { event: "open" });
        log(`WebSocket ${connectionId} opened`);
      });

      ws.addEventListener("message", (event) => {
        if (!state.config.masterSwitch) return;

        const data = event.data;

        // Handle different data types directly without filtering
        let processedData = data;

        if (data instanceof ArrayBuffer) {
          processedData = new Uint8Array(data);
        }
        log("processedData", processedData);
        emitWebSocketData(connectionId, "message", processedData, {
          url,
          originalType: typeof data,
          isBinary:
            data instanceof ArrayBuffer ||
            data instanceof Uint8Array ||
            data instanceof Blob,
        });
      });

      ws.addEventListener("close", (event) => {
        connectionInfo.state = "closed";
        connectionInfo.closed = Date.now();
        emitWebSocketData(connectionId, "close", null, {
          event: "close",
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        log(`WebSocket ${connectionId} closed`, {
          code: event.code,
          reason: event.reason,
        });
      });

      ws.addEventListener("error", (event) => {
        connectionInfo.state = "error";
        emitWebSocketData(connectionId, "error", null, { event: "error" });
        log(`WebSocket ${connectionId} error`, event);
      });

      return ws;
    };

    // Preserve WebSocket constants and prototype
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    window.WebSocket.OPEN = OriginalWebSocket.OPEN;
    window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

    log("WebSocket interceptor initialized");
  }

  // Get statistics
  function getStats() {
    return {
      ...state.stats,
      activeConnections: Array.from(state.connections.values()).filter(
        (c) => c.state === "open",
      ).length,
      totalConnections: state.connections.size,
      runtime: Date.now() - state.stats.startTime,
      platform: detectPlatform(),
    };
  }

  // Get all connections info
  function getConnections() {
    const connections = [];
    for (const [id, info] of state.connections) {
      connections.push({
        id,
        url: info.url,
        protocols: info.protocols,
        state: info.state,
        created: info.created,
        closed: info.closed,
      });
    }
    return connections;
  }

  // Create a new WebSocket connection manually
  function createConnection(url, protocols) {
    if (!window.WebSocket) {
      throw new Error("WebSocket not available");
    }

    return new window.WebSocket(url, protocols);
  }

  // Close a specific connection
  function closeConnection(connectionId) {
    const connection = state.connections.get(connectionId);
    if (connection && connection.ws) {
      connection.ws.close();
      return true;
    }
    return false;
  }

  // Close all connections
  function closeAllConnections() {
    let closed = 0;
    for (const [id, connection] of state.connections) {
      if (connection.ws && connection.state === "open") {
        connection.ws.close();
        closed++;
      }
    }
    return closed;
  }

  // Toggle debug mode (communicates with content script)
  function toggleDebugMode() {
    sendMessageToContent("TOGGLE_DEBUG", {
      currentMode: state.config.debugMode,
    });
    return !state.config.debugMode;
  }

  // Toggle master switch (communicates with content script)
  function toggleMasterSwitch() {
    sendMessageToContent("TOGGLE_MASTER", {
      currentSwitch: state.config.masterSwitch,
    });
    return !state.config.masterSwitch;
  }

  // Expose API to window
  window.RAWInterceptorAPI = {
    // Configuration (now communicates through content script)
    getStats,
    config: () => ({ ...state.config }),
    toggleDebugMode,
    toggleMasterSwitch,

    // Connection management
    getConnections,
    createConnection,
    closeConnection,
    closeAllConnections,

    // State access (read-only)
    getState: () => ({
      stats: { ...state.stats },
      connectionCount: state.connections.size,
      platform: detectPlatform(),
    }),
  };

  // Initialize WebSocket interception
  function initialize() {
    setupMessageListener();
    requestConfig(); // Request initial config
    interceptWebSocket();
    log("RAW Multi-WebSocket Interceptor initialized successfully");

    // Request config periodically in case of updates
    setInterval(requestConfig, 10000);
  }

  // Start interception
  initialize();
})();
