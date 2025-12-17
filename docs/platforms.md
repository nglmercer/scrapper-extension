# Platform-Specific Usage

## Chrome Extension

```javascript
// background.js
import {
  rawInterceptor,
  ChromeBackgroundHelper,
} from "raw-data-interceptor/chrome";

async function initialize() {
  await rawInterceptor.initialize();
  ChromeBackgroundHelper.initialize();

  // Listen for intercepted messages
  rawInterceptor.onMessage((message) => {
    console.log("Intercepted WebSocket message:", message);
  });
}

// content.js
import { ChromeContentHelper } from "raw-data-interceptor/chrome";

ChromeContentHelper.initialize();
```

## Firefox Extension

```javascript
// background.js
import {
  rawInterceptor,
  FirefoxBackgroundHelper,
} from "raw-data-interceptor/firefox";

async function initialize() {
  await rawInterceptor.initialize();
  FirefoxBackgroundHelper.initialize();

  // Listen for intercepted messages
  rawInterceptor.onMessage((message) => {
    console.log("Intercepted WebSocket message:", message);
  });
}

// content.js
import { FirefoxContentHelper } from "raw-data-interceptor/firefox";

FirefoxContentHelper.initialize();
```

## Electron Application

```javascript
// Main process
import {
  rawInterceptor,
  ElectronMainHelper,
} from "raw-data-interceptor/electron";

async function initialize() {
  await rawInterceptor.initialize();
  ElectronMainHelper.setupIpcHandlers();

  // Listen for intercepted messages
  rawInterceptor.onMessage((message) => {
    console.log("Intercepted WebSocket message:", message);
  });
}

// Renderer process
import { ElectronRendererHelper } from "raw-data-interceptor/electron";

ElectronRendererHelper.initialize();
```

## Platform Detection

The interceptor automatically detects the platform:

```javascript
// Supported platforms: 'tiktok', 'kick', 'twitch', 'youtube', 'unknown'
const platform = rawInterceptor.getStats().platform;
```
