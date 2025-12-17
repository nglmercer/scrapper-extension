# Configuration

You can configure the interceptor using `updateConfig`.

```javascript
const config = {
  masterSwitch: true, // Global on/off switch
  debugMode: false, // Enable debug logging
  WebhookUrl: "", // URL for webhook notifications
  WebhookOption: false, // Enable webhook notifications
  WindowUrl: "https://example.com/chat", // URL for external window
  OpenWindow: false, // Open external window for data
  eventBufferSize: 1000, // Buffer size for events
  websockets: {
    enabled: true, // Enable WebSocket interception
    urlFilters: ["webcast", "tikfinity"], // Filter by URL patterns
    minSize: 10, // Minimum message size
    maxSize: 10000, // Maximum message size
    excludeStrings: ["ping", "pong"], // Exclude messages containing these strings
  },
};

await rawInterceptor.updateConfig(config);
```

## Advanced Filtering

```javascript
// Filter by URL patterns
config.websockets.urlFilters = ["webcast", "tikfinity", "twitch"];

// Filter by message size
config.websockets.minSize = 100;
config.websockets.maxSize = 5000;

// Filter by content
config.websockets.excludeStrings = ["ping", "pong", "heartbeat"];
```
