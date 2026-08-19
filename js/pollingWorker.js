/**
 * Gugnani Tyres CRM - Real-Time Polling Worker
 * Runs in the background to check for database updates on Supabase without blocking the UI.
 */

let supabaseUrl = '';
let supabaseKey = '';
let authToken = '';
let lastUpdated = '';
let pollingInterval = null;

self.onmessage = function(e) {
    const data = e.data;
    
    if (data.type === 'INIT') {
        supabaseUrl = data.supabaseUrl;
        supabaseKey = data.supabaseKey;
        authToken = data.token;
        
        // Start polling every 60 seconds
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
    if (!supabaseUrl || !supabaseKey) return;

    try {
        // Query the most recently updated Lead from Supabase using their REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/Leads?select=UpdatedAt&order=UpdatedAt.desc&limit=1`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        const data = await response.json();
        
        if (data && data[0] && data[0].UpdatedAt) {
            const serverLastUpdated = data[0].UpdatedAt;
            
            if (lastUpdated === '') {
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
