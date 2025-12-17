# RAW Data Interceptor

A cross-platform TypeScript library for intercepting WebSocket data in Chrome extensions, Firefox add-ons, and Electron applications. Built with Bun and designed for maximum compatibility across different browser environments.

## Features

- 🔌 **Cross-Platform Support**: Works in Chrome, Firefox, and Electron
- 🚀 **TypeScript First**: Full TypeScript support with comprehensive type definitions
- 🧪 **Well Tested**: Comprehensive test suite using Bun's built-in test runner
- 📦 **Modern Build**: Uses Bun for fast builds and development
- 🔧 **Configurable**: Flexible configuration system with storage persistence
- 🎯 **WebSocket Interception**: Specialized for WebSocket data capture and analysis
- 🔄 **Real-time Updates**: Configuration changes apply in real-time
- 🛡️ **Error Handling**: Robust error handling with fallback mechanisms

## Installation

```bash
# Using Bun (recommended)
bun add raw-data-interceptor

# Using npm
npm install raw-data-interceptor

# Using yarn
yarn add raw-data-interceptor
```

## Quick Start

```typescript
import { RAWInterceptor } from 'raw-data-interceptor';

// Create interceptor instance
const interceptor = new RAWInterceptor();

// Initialize with configuration
await interceptor.initialize();

// Listen for WebSocket messages
const unsubscribe = interceptor.onMessage((message) => {
  console.log('WebSocket message:', message);
});

// Update configuration
await interceptor.updateConfig({
  enabled: true,
  filters: {
    urlPatterns: ['*://api.example.com/*'],
    minSize: 100,
    maxSize: 10000
  }
});

// Clean up
await interceptor.destroy();
```

## Configuration

The interceptor supports comprehensive configuration options:

```typescript
interface InterceptorConfig {
  masterSwitch: boolean;        // Master on/off switch
  debugMode: boolean;           // Enable debug logging
  enabled: boolean;             // Enable/disable interception
  filters: {
    urlPatterns: string[];      // URL patterns to intercept
    minSize: number;            // Minimum message size
    maxSize: number;            // Maximum message size
    contentType: string;        // Content type filter
    excludeStrings: string[];   // Strings to exclude
  };
  WebhookUrl: string;           // Webhook URL for notifications
  WebhookOption: boolean;       // Enable webhook notifications
  WindowUrl: string;            // Window URL for display
  OpenWindow: boolean;          // Open window on intercept
  eventBufferSize: number;      // Buffer size for events
}
```

## Platform-Specific Usage

### Chrome Extension

```typescript
import { RAWInterceptor } from 'raw-data-interceptor';

// The interceptor automatically detects Chrome APIs
const interceptor = new RAWInterceptor();
await interceptor.initialize();

// Configuration is automatically persisted to chrome.storage
```

### Firefox Add-on

```typescript
import { RAWInterceptor } from 'raw-data-interceptor';

// Works with Firefox WebExtension APIs
const interceptor = new RAWInterceptor();
await interceptor.initialize();
```

### Electron Application

```typescript
import { RAWInterceptor } from 'raw-data-interceptor';

// Works in Electron main or renderer process
const interceptor = new RAWInterceptor();
await interceptor.initialize();
```

### Node.js/Testing

```typescript
import { RAWInterceptor } from 'raw-data-interceptor';

// Automatically uses mock implementations for testing
const interceptor = new RAWInterceptor();
await interceptor.initialize();
```

## API Reference

### RAWInterceptor Class

#### Constructor
```typescript
const interceptor = new RAWInterceptor();
```

#### Methods

- `initialize(): Promise<void>` - Initialize the interceptor
- `destroy(): Promise<void>` - Clean up resources
- `getConfig(): InterceptorConfig` - Get current configuration
- `updateConfig(config: Partial<InterceptorConfig>): Promise<void>` - Update configuration
- `resetConfig(): Promise<void>` - Reset to default configuration
- `getStats(): InterceptorStats` - Get interception statistics
- `getConnections(): ConnectionInfo[]` - Get active connections
- `toggleDebugMode(): boolean` - Toggle debug mode
- `toggleMasterSwitch(): boolean` - Toggle master switch
- `onMessage(callback: (message: WebSocketMessage) => void): () => void` - Listen for messages
- `isEnabled(): boolean` - Check if enabled
- `isDebugMode(): boolean` - Check if debug mode is active

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/raw-data-interceptor.git
cd raw-data-interceptor

# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build

# Build for different platforms
bun run build:chrome
bun run build:firefox
bun run build:electron
```

### Project Structure

```
src/
├── core/                    # Core interceptor logic
│   ├── interceptor.ts      # Main interceptor implementation
│   └── storage.ts          # Cross-platform storage abstraction
├── platforms/              # Platform-specific implementations
│   └── chrome/            # Chrome API polyfills
│       ├── storage-polyfill.ts
│       └── runtime-polyfill.ts
├── types/                  # TypeScript type definitions
│   └── index.ts
├── utils/                  # Utility functions
└── index.ts               # Main entry point

tests/
├── unit/                   # Unit tests
└── integration/            # Integration tests

dist/                       # Built output
├── index.js               # Main bundle
├── index.d.ts             # TypeScript declarations
└── platforms/             # Platform-specific builds
```

### Testing

The project includes comprehensive tests using Bun's built-in test runner:

```bash
# Run all tests
bun test

# Run unit tests only
bun test tests/unit

# Run specific test file
bun test tests/unit/interceptor.test.ts

# Run with coverage
bun test --coverage
```

## Browser Compatibility

- **Chrome**: 88+ (Manifest V3 supported)
- **Firefox**: 78+ (WebExtension API)
- **Edge**: 88+ (Chromium-based)
- **Safari**: 14+ (WebExtension API)
- **Electron**: 12+ (Chromium 89+)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `bun test`
5. Build the project: `bun run build`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Cross-platform WebSocket interception
- Chrome, Firefox, and Electron support
- Comprehensive TypeScript definitions
- Full test coverage
- Modern Bun-based build system

## Support

- 📖 [Documentation](https://github.com/your-username/raw-data-interceptor/wiki)
- 🐛 [Issue Tracker](https://github.com/your-username/raw-data-interceptor/issues)
- 💬 [Discussions](https://github.com/your-username/raw-data-interceptor/discussions)

## Related Projects

- [WebSocket Interceptor](https://github.com/example/websocket-interceptor) - Alternative WebSocket interception library
- [Chrome Extension Boilerplate](https://github.com/example/chrome-extension-boilerplate) - Starter template for Chrome extensions
- [Firefox Extension Workshop](https://extensionworkshop.com/) - Official Firefox extension development resources
