# Building

## Build Commands

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

## Project Structure

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
