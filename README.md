# MultiStream Live Interceptor

## Overview

MultiStream Live Interceptor is a browser extension designed to intercept and decode messages from TikTok Live and Kick streams. It captures various events like chats, gifts, likes, and follows, and provides the ability to forward these events to a specified webhook URL or display them in a separate window.

## Features

- **Event Interception:** Captures and decodes live stream events from TikTok and Kick.
- **Webhook Integration:** Forwards live events to a custom webhook URL for further processing.
- **Pop-out Chat Window:** Displays live chat and events in a separate, customizable window.
- **Protobuf Decoding:** Includes a Protobuf schema to decode TikTok's binary WebSocket messages.
- **Easy to Use:** Simple popup interface for quick configuration.

## Installation

### From the Chrome Web Store / Firefox Add-ons

(Instructions to be added once the extension is published)

### Manual Installation

1.  **Download the repository:**
    ```bash
    git clone https://github.com/nglmercer/scrapper-extension.git
    ```
2.  **Open your browser's extension page:**
    -   **Chrome:** Navigate to `chrome://extensions`
    -   **Firefox:** Navigate to `about:debugging#/runtime/this-firefox`
3.  **Enable Developer Mode.**
4.  **Load the extension:**
    -   **Chrome:** Click on "Load unpacked" and select the cloned repository folder.
    -   **Firefox:** Click on "Load Temporary Add-on..." and select the `manifest.json` file.

## How to Use

1.  **Open a TikTok or Kick live stream.**
2.  **Click the extension icon** in your browser's toolbar to open the popup.
3.  **General Tab:**
    -   Enter a channel's `uniqueId` to be redirected to their live stream.
4.  **Advanced Tab:**
    -   **Webhook:** Enable the webhook and enter the URL to send events to.
    -   **Open Window:** Enable this to open a new window that will display the live events. You can customize the URL of this window.
5.  **Save your settings.**

## Project Files

-   `manifest.json`: Defines the extension's permissions, scripts, and properties.
-   `background.js`: Service worker that runs in the background, handling messages and events.
-   `content.js`: Injected into TikTok and Kick pages to intercept WebSocket messages.
-   `injected.js`: Script that runs in the page's context to decode Protobuf messages and communicate with `content.js`.
-   `popup.html` / `popup.js`: The UI and logic for the extension's popup.
-   `protobuf.min.js`: The Protobuf.js library for decoding messages.
-   `style.css`: Styles for the popup.
-   `icons/`: Extension icons for different sizes.
      
[Versión en español](./readme.es.md)

    