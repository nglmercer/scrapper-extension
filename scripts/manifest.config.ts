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
  const commonPermissions = [
    "storage", 
    "scripting",
    "tabs",
    "nativeMessaging" // Required for the Native Host feature
  ];

  const commonHostPermissions = [
    "<all_urls>"
  ];

  if (platform === 'chrome') {
    // Manifest V3 for Chrome
    return {
      manifest_version: 3,
      ...baseManifest,
      permissions: [
        ...commonPermissions,
        // Chrome specific additions if any
      ],
      host_permissions: commonHostPermissions,
      background: {
        service_worker: "background.js",
        type: "module"
      },
      action: {
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
    // Manifest V3 for Firefox
    return {
      manifest_version: 3,
      ...baseManifest,
      browser_specific_settings: {
        gecko: {
          id: "nglmercer@gmail.com" // Fixed ID for native messaging to work consistently
        }
      },
      permissions: [
        ...commonPermissions,
        // Firefox specific additions
      ],
      host_permissions: commonHostPermissions,
      background: {
        scripts: ["background.js"],
        type: "module" // Important for ES modules in background
      },
      action: {
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
  }
}
