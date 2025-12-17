import { ChromeContentHelper } from '../index.js';

// Initialize content script
console.log('RAW Interceptor: Content script initializing...');
ChromeContentHelper.initialize();
console.log('RAW Interceptor: Content script initialized');

// Listen for messages from injected script (RAW_DATA_EVENT)
window.addEventListener('message', (event) => {
  if (event.data?.type === 'RAW_DATA_EVENT') {
    // Forward to background script
    ChromeContentHelper.sendMessage({
      type: 'RAW_DATA_EVENT',
      payload: event.data.payload
    }).catch(err => {
        // console.error('Failed to forward event:', err);
    });
  }
});
