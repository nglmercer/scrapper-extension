function getVersion(){
  return require('../package.json')?.version || '1.0.0';
}
export const baseManifest = {
  name: "RAW Data Interceptor",
  version: getVersion(),
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
    "nativeMessaging"
  ];
  
  const commonHostPermissions = [
    "<all_urls>",
    "ws://*/*",
    "wss://*/*"
  ];

  const baseConfig = {
    manifest_version: 3,
    ...baseManifest,
    permissions: commonPermissions,
    host_permissions: commonHostPermissions,
    // Agregar CSP permisiva para desarrollo
    content_security_policy: platform === 'chrome' ? {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src ws://localhost:* wss://*"
    } : {
      extension_pages: "script-src 'self'; connect-src ws://localhost:* wss://*"
    }
  };

  if (platform === 'chrome') {
    return {
      ...baseConfig,
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
    return {
      ...baseConfig,
      browser_specific_settings: {
        gecko: {
          id: "nglmercer@gmail.com"
        }
      },
      background: {
        scripts: ["background.js"],
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
  }
}