/**
 * Gugnani Tyres CRM - Background Sync Engine
 * Pushes offline actions to the backend when internet is restored.
 */

const SyncEngine = {
    isSyncing: false,

    init: function() {
        window.addEventListener('online', () => {
            console.log('Online! Starting background sync...');
            this.processQueue();
        });
        
        // Also try to sync on load if online
        if (navigator.onLine) {
            setTimeout(() => this.processQueue(), 3000);
        }
        
        // Request OS Notification Permissions
        if ("Notification" in window) {
            if (Notification.permission !== "granted" && Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }
        
        // Initialize Real-Time Polling Worker
        if (window.Worker) {
            this.pollingWorker = new Worker('js/pollingWorker.js');
            this.pollingWorker.postMessage({
                type: 'INIT',
                supabaseUrl: typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_URL : '',
                supabaseKey: typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_KEY : '',
                token: localStorage.getItem('crm_token') || ''
            });

            this.pollingWorker.onmessage = (e) => {
                if (e.data.type === 'UPDATE_FOUND') {
                    console.log('Background polling detected new data!');
                    
                    // Show in-app toast
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            toast: true,
                            position: 'bottom-end',
                            icon: 'info',
                            title: 'Live Update Received',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                    
                    // Trigger OS Push Notification
                    if ("Notification" in window && Notification.permission === "granted") {
                        if (document.hidden || document.visibilityState === 'hidden') {
                            new Notification("Gugnani Tyres CRM", {
                                body: "Database updated! New leads or follow-ups available.",
                                icon: "./assets/icons/icon-192x192.png"
                            });
                        }
                    }
                    
                    if (typeof window.refreshCurrentPageData === 'function') {
                        // Pass true or similar flag if you want to bypass cache completely
                        window.refreshCurrentPageData();
                    }
                    
                    // Force the notification bell to check again next time it's clicked
                    if (typeof window.updateNotificationBadge === 'function') {
                        window.notificationCache = null;
                        window.updateNotificationBadge();
                    }
                }
            };
        }
    },

    processQueue: async function() {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            const tasks = await CRMDB.getSyncTasks();
            if (tasks.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`Found ${tasks.length} pending offline tasks.`);
            
            // Show toast notification using Swal if available
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    icon: 'info',
                    title: 'Syncing offline changes...',
                    showConfirmButton: false,
                    timer: 3000
                });
            }

            let successCount = 0;

            for (const task of tasks) {
                try {
                    // Send directly bypassing the API wrapper's queue logic to prevent infinite loops
                    await API.call(task.action, task.payload, false, true);
                    await CRMDB.removeSyncTask(task.id);
                    successCount++;
                } catch (err) {
                    console.error('Network failure or error during sync, will retry later.', err);
                    break; // Stop processing queue if internet drops again
                }
            }

            if (successCount > 0 && typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    icon: 'success',
                    title: `Synced ${successCount} items!`,
                    showConfirmButton: false,
                    timer: 3000
                });
                
                // Refresh current view if possible
                if (typeof window.refreshCurrentPageData === 'function') {
                    window.refreshCurrentPageData();
                }
            }
            
        } catch (e) {
            console.error('Sync process error:', e);
        } finally {
            this.isSyncing = false;
            // Check if queue has more items (in case new ones were added while syncing)
            setTimeout(() => {
                CRMDB.getSyncTasks().then(tasks => {
                    if (tasks.length > 0 && navigator.onLine) this.processQueue();
                });
            }, 5000);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SyncEngine.init();
});
