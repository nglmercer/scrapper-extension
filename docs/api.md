# API Reference

## Core Methods

```javascript
// Initialize the interceptor
await rawInterceptor.initialize();

// Get current statistics
const stats = rawInterceptor.getStats();
// Returns: { totalIntercepts, totalConnections, activeConnections, platform, runtime }

// Get active connections
const connections = rawInterceptor.getConnections();
// Returns: Array of connection info objects

// Listen for intercepted messages
const unsubscribe = rawInterceptor.onMessage((message) => {
  console.log("Message:", message);
});

// Toggle debug mode
const debugMode = rawInterceptor.toggleDebugMode();

// Toggle master switch
const enabled = rawInterceptor.toggleMasterSwitch();

// Update configuration
await rawInterceptor.updateConfig(newConfig);

// Clean up
await rawInterceptor.destroy();
```

## Message Format

Intercepted messages have the following structure:

```javascript
{
  type: 'message',        // 'open', 'message', 'close', 'error'
  connectionId: 'ws_123', // Unique connection identifier
  data: { ... },          // Message data (varies by type)
  metadata: {
    platform: 'tiktok',   // Detected platform
    dataType: 'json',     // 'string', 'arraybuffer', 'blob', 'object'
    size: 256,            // Message size in bytes
    url: 'wss://example.com', // Connection URL
    timestamp: 1234567890 // Unix timestamp
  },
  timestamp: 1234567890   // Message timestamp
}
```

## Custom Message Processing

```javascript
rawInterceptor.onMessage((message) => {
  // Custom processing logic
  if (message.type === "message" && message.data.type === "chat") {
    // Process chat messages
    processChatMessage(message.data);
  }
});
```
