/**
 * Gugnani Tyres CRM - Configuration
 */

const CONFIG = {
  // IMPORTANT: Replace this URL with your actual Google Apps Script Web App URL after deployment
  API_URL: "https://script.google.com/macros/s/AKfycbxt6pMaszwjHxn36G6RKVKZQzgbnem28-1qjfLwdTh_n8QhwTxlxDtHsSvRE8pZgS0A/exec",
  
  APP_NAME: "Gugnani Tyres CRM",
  APP_VERSION: "1.0.0",
  
  // Theme configuration (used by JS charts, etc)
  COLORS: {
    primary: "#CC0000",
    secondary: "#1C1C1E",
    success: "#28A745",
    warning: "#FFC107",
    danger: "#DC3545",
    info: "#17A2B8"
  }
};

// Register Service Worker for PWA & Offline Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.warn('ServiceWorker registration failed: ', err);
            });
    });
}
// End of config
