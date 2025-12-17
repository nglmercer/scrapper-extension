export const baseManifest = {
  name: "RAW Data Interceptor",
  version: "3.1.0",
  description: "Cross-platform WebSocket data interceptor for Chrome, Firefox, and Electron",
  icons: {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
};

export function createManifest(platform: 'chrome' | 'firefox') {
  const isChrome = platform === 'chrome';

  if (isChrome) {
    // Manifest V3 for Chrome
    return {
      manifest_version: 3,
      ...baseManifest,
      permissions: [
        "storage", 
        "webRequest", 
        // "webRequestBlocking", // Not available in MV3 usually, but keep if needed for declarativeNetRequest logic later. Removed for strict MV3 compliance unless needed.
        // Actually webRequest is restricted in MV3. 
        // But let's assume standard permissions for now.
      ],
      host_permissions: [
        "<all_urls>"
      ],
      background: {
        service_worker: "background.js",
        type: "module"
      },
      action: { // browser_action -> action in MV3
        default_title: baseManifest.name,
        default_popup: "popup.html",
        default_icon: baseManifest.icons
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          run_at: "document_start"
        }
      ],
      web_accessible_resources: [
        {
          resources: ["injected.js"],
          matches: ["<all_urls>"]
        }
      ]
    };
  } else {
    // Manifest V2 for Firefox
    return {
      manifest_version: 2,
      ...baseManifest,
      permissions: [
        "storage",
        "webRequest",
        "webRequestBlocking",
        "<all_urls>"
      ],
      background: {
        scripts: ["background.js"],
        type: "module"
      },
      browser_action: {
        default_title: baseManifest.name,
        default_popup: "popup.html",
        default_icon: baseManifest.icons
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          run_at: "document_start"
        }
      ],
      web_accessible_resources: [
        "injected.js"
      ]
    };
  }
}
