/**
 * Gugnani Tyres CRM - Real-Time Polling Worker
 * Runs in the background to check for database updates without blocking the UI.
 */

let apiUrl = '';
let authToken = '';
let lastUpdated = 0;
let pollingInterval = null;

self.onmessage = function(e) {
    const data = e.data;
    
    if (data.type === 'INIT') {
        apiUrl = data.apiUrl;
        authToken = data.token;
        
        // Start polling every 60 seconds to avoid hitting Google Apps Script quotas
        if (!pollingInterval) {
            pollingInterval = setInterval(checkForUpdates, 60000);
            // Do an immediate initial check
            checkForUpdates();
        }
    } else if (data.type === 'STOP') {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
};

async function checkForUpdates() {
    if (!apiUrl || !authToken) return;

    try {
        const requestBody = {
            action: 'checkDatabaseVersion',
            token: authToken,
            payload: {}
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.lastUpdated) {
            const serverLastUpdated = result.data.lastUpdated;
            
            if (lastUpdated === 0) {
                // First time checking, just record the timestamp
                lastUpdated = serverLastUpdated;
            } else if (serverLastUpdated > lastUpdated) {
                // Database has been updated!
                lastUpdated = serverLastUpdated;
                self.postMessage({ type: 'UPDATE_FOUND' });
            }
        }
    } catch (error) {
        // Silently fail in background (could be offline or rate limited)
        console.warn("Polling Worker: Network check failed.", error);
    }
}
