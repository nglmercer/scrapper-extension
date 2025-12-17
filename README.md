# RAW Data Interceptor

A powerful, cross-platform WebSocket data interceptor for Chrome, Firefox, and Electron applications. Designed to capture, analyze, and process WebSocket communications in real-time.

## 🚀 Features

- **Cross-Platform Support**: Works seamlessly across Chrome extensions, Firefox add-ons, and Electron applications
- **Real-Time Interception**: Capture WebSocket messages as they happen
- **Flexible Filtering**: Filter messages by URL, size, and content
- **Multiple Data Types**: Support for text, JSON, binary, and ArrayBuffer data
- **Performance Optimized**: Minimal overhead with efficient message processing
- **Comprehensive Testing**: Includes WebSocket test server and integration tests
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Extensible Architecture**: Easy to add custom message handlers and processors

## 📦 Installation

```bash
npm install raw-data-interceptor
```

## 🔧 Platform-Specific Usage

### Chrome Extension

```javascript
// background.js
import { rawInterceptor, ChromeBackgroundHelper } from 'raw-data-interceptor/chrome';

async function initialize() {
  await rawInterceptor.initialize();
  ChromeBackgroundHelper.initialize();
  
  // Listen for intercepted messages
  rawInterceptor.onMessage((message) => {
    console.log('Intercepted WebSocket message:', message);
  });
}

// content.js
import { ChromeContentHelper } from 'raw-data-interceptor/chrome';

ChromeContentHelper.initialize();
```

### Firefox Extension

```javascript
// background.js
import { rawInterceptor, FirefoxBackgroundHelper } from 'raw-data-interceptor/firefox';

async function initialize() {
  await rawInterceptor.initialize();
  FirefoxBackgroundHelper.initialize();
  
  // Listen for intercepted messages
  rawInterceptor.onMessage((message) => {
    console.log('Intercepted WebSocket message:', message);
  });
}

// content.js
import { FirefoxContentHelper } from 'raw-data-interceptor/firefox';

FirefoxContentHelper.initialize();
```

### Electron Application

```javascript
// Main process
import { rawInterceptor, ElectronMainHelper } from 'raw-data-interceptor/electron';

async function initialize() {
  await rawInterceptor.initialize();
  ElectronMainHelper.setupIpcHandlers();
  
  // Listen for intercepted messages
  rawInterceptor.onMessage((message) => {
    console.log('Intercepted WebSocket message:', message);
  });
}

// Renderer process
import { ElectronRendererHelper } from 'raw-data-interceptor/electron';

ElectronRendererHelper.initialize();
```

## 🛠️ Configuration

```javascript
const config = {
  masterSwitch: true,           // Global on/off switch
  debugMode: false,             // Enable debug logging
  WebhookUrl: '',               // URL for webhook notifications
  WebhookOption: false,         // Enable webhook notifications
  WindowUrl: 'https://example.com/chat', // URL for external window
  OpenWindow: false,            // Open external window for data
  eventBufferSize: 1000,        // Buffer size for events
  websockets: {
    enabled: true,              // Enable WebSocket interception
    urlFilters: ['webcast', 'tikfinity'], // Filter by URL patterns
    minSize: 10,                // Minimum message size
    maxSize: 10000,             // Maximum message size
    excludeStrings: ['ping', 'pong'] // Exclude messages containing these strings
  }
};

await rawInterceptor.updateConfig(config);
```

## 📊 API Reference

### Core Methods

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
  console.log('Message:', message);
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

### Message Format

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

## 🧪 Testing

The package includes comprehensive tests and a WebSocket test server:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Start WebSocket test server
npm run test:server
```

### WebSocket Test Server

A built-in WebSocket test server for development and testing:

```javascript
import { WebSocketTestServer } from 'raw-data-interceptor/tests';

const server = new WebSocketTestServer({
  port: 8080,
  host: 'localhost',
  path: '/ws',
  enableHeartbeat: true,
  messageTypes: ['text', 'json', 'binary', 'ping', 'chat']
});

await server.start();

// The server supports various message types and automatic responses
```

## 🏗️ Building for Different Platforms

```bash
# Build for all platforms
npm run build:all

# Build for specific platforms
npm run build:chrome
npm run build:firefox
npm run build:electron

# Build extension packages
npm run extension:chrome
npm run extension:firefox
npm run extension:electron
```

## 📁 Project Structure

```
raw-data-interceptor/
├── src/
│   ├── core/                    # Core interceptor logic
│   ├── platforms/               # Platform-specific implementations
│   │   ├── chrome/             # Chrome extension support
│   │   ├── firefox/            # Firefox extension support
│   │   └── electron/           # Electron application support
│   ├── types/                   # TypeScript definitions
│   └── utils/                   # Utility functions
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── websocket-test-server.ts # Test server implementation
├── examples/                    # Usage examples for each platform
├── dist/                        # Built files
└── manifest*.json              # Platform-specific manifests
```

## 🔍 Platform-Specific Features

### Chrome Extension
- Manifest V3 support
- Service worker background scripts
- Content script injection
- Chrome storage API integration
- Runtime message passing

### Firefox Extension
- Manifest V2 support
- Browser API compatibility
- Content script injection
- Firefox storage API integration
- Runtime message passing

### Electron Application
- Main process integration
- Renderer process support
- IPC communication
- File-based storage
- Preload script support

## 🚨 Error Handling

The interceptor includes comprehensive error handling:

```javascript
try {
  await rawInterceptor.initialize();
} catch (error) {
  console.error('Initialization failed:', error);
  // Error includes context information
  console.error('Error context:', error.context);
}
```

## 📈 Performance Monitoring

Built-in performance metrics:

```javascript
const stats = rawInterceptor.getStats();
console.log(`Processed ${stats.totalIntercepts} messages`);
console.log(`Active connections: ${stats.activeConnections}`);
console.log(`Uptime: ${stats.runtime}ms`);
```

## 🔧 Advanced Usage

### Custom Message Processing

```javascript
rawInterceptor.onMessage((message) => {
  // Custom processing logic
  if (message.type === 'message' && message.data.type === 'chat') {
    // Process chat messages
    processChatMessage(message.data);
  }
});
```

### Platform Detection

The interceptor automatically detects the platform:

```javascript
// Supported platforms: 'tiktok', 'kick', 'twitch', 'youtube', 'unknown'
const platform = rawInterceptor.getStats().platform;
```

### Filtering Examples

```javascript
// Filter by URL patterns
config.websockets.urlFilters = ['webcast', 'tikfinity', 'twitch'];

// Filter by message size
config.websockets.minSize = 100;
config.websockets.maxSize = 5000;

// Filter by content
config.websockets.excludeStrings = ['ping', 'pong', 'heartbeat'];
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue on GitHub
- Check the examples in the `/examples` directory
- Review the test files for usage patterns

## 🔄 Changelog

### v3.1.0
- Added Firefox platform support
- Added Electron platform support
- Enhanced WebSocket test server
- Improved error handling
- Added comprehensive integration tests
- Updated TypeScript definitions

### v3.0.0
- Initial cross-platform release
- Chrome extension support
- Core WebSocket interception
- Basic filtering capabilities
- TypeScript support
