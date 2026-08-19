/**
 * Gugnani Tyres CRM - IndexedDB Local Database
 * Provides offline storage for caching and background syncing.
 */

const DB_NAME = 'GugnaniCRM_DB';
const DB_VERSION = 1;

const CRMDB = {
    db: null,

    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Cache Store: Stores API responses
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
                
                // Sync Queue Store: Stores offline actions (creates/updates)
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = function(event) {
                CRMDB.db = event.target.result;
                resolve(CRMDB.db);
            };

            request.onerror = function(event) {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Store data in cache
     */
    setCache: async function(key, data) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.put({ key: key, data: data, timestamp: new Date().getTime() });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get data from cache
     */
    getCache: async function(key) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result ? request.result.data : null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all database cache entries
     */
    clearAllCache: async function() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete cache entries starting with a prefix
     */
    clearCachePrefix: async function(prefix) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const request = store.openCursor();
            
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.key.startsWith(prefix)) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Add action to the Sync Queue (Outbox)
     */
    addSyncTask: async function(action, payload) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.add({ 
                action: action, 
                payload: payload, 
                timestamp: new Date().getTime() 
            });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all pending sync tasks
     */
    getSyncTasks: async function() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Remove task from Sync Queue after successful sync
     */
    removeSyncTask: async function(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

// Initialize DB eagerly
CRMDB.init().catch(e => console.warn("Could not init IndexedDB", e));
