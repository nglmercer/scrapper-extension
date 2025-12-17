import { websocketInterceptor } from '../../../core/interceptor.js';

// Initialize in main world
console.log('RAW Interceptor: Injected script loading...');
websocketInterceptor.initialize();
console.log('RAW Interceptor: Injected script initialized');

// Forward intercepted messages to content script
websocketInterceptor.onMessage((message) => {
  window.postMessage({
    type: 'RAW_DATA_EVENT',
    payload: message
  }, '*');
});

// Expose for debugging
(window as any).rawInterceptor = websocketInterceptor;
