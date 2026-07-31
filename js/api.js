/**
 * Gugnani Tyres CRM - API Wrapper
 */

const API = {
  
  showLoader: function() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.remove('hidden');
  },
  
  hideLoader: function() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.add('hidden');
  },
  
  /**
   * Main function to call backend API
   */
  call: async function(action, payload = {}, showLoading = true) {
    if (showLoading) this.showLoader();
    
    const token = localStorage.getItem('crm_token');
    
    const requestBody = {
      action: action,
      token: token,
      payload: payload
    };

    try {
      // Using fetch with POST and text/plain to avoid CORS preflight in Apps Script
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (showLoading) this.hideLoader();
      
      if (result.status === 'error') {
        if (result.code === 401) {
          // Session invalid or expired
          Auth.logout(false);
          Swal.fire({
            icon: 'error',
            title: 'Session Expired',
            text: 'Please login again.',
            confirmButtonText: 'OK'
          }).then(() => {
            window.location.href = 'login.html';
          });
          throw new Error('Session Expired');
        }
        throw new Error(result.message);
      }
      
      // Invalidate cache for write operations
      if (['createLead', 'updateLead', 'addFollowUp', 'updateLeadStatus', 'markCompleted', 'updateBranch', 'createBranch', 'updateEmployee', 'createEmployee', 'deleteLead', 'deleteFollowUp'].includes(action)) {
          this.clearCache();
      }
      
      return result.data;
      
    } catch (error) {
      if (showLoading) this.hideLoader();
      console.error("API Call Error:", error);
      
      // If it's a TypeError (Network failure)
      if (error instanceof TypeError || !navigator.onLine) {
        // If it's a write operation, queue it for background sync
        if (['createLead', 'updateLead', 'addFollowUp', 'updateLeadStatus'].includes(action)) {
            console.warn(`[Offline] Queueing ${action} for background sync.`);
            if (typeof CRMDB !== 'undefined') {
                await CRMDB.addSyncTask(action, payload);
                if (typeof SyncEngine !== 'undefined' && !SyncEngine.isSyncing && navigator.onLine) {
                    SyncEngine.processQueue();
                }
                return { _optimistic: true, message: "Saved offline. Will sync when internet returns." };
            }
        }
        throw new Error("Network offline. Please check your connection.");
      }
      
      throw error;
    }
  },
  
  clearCache: async function() {
      // Clear sessionStorage
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('crm_cache_')) {
              keysToRemove.push(key);
          }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
      
      // Clear IndexedDB if available
      if (typeof CRMDB !== 'undefined') {
          try {
              await CRMDB.clearAllCache();
          } catch(e) {
              console.warn("Failed to clear IndexedDB cache", e);
          }
      }
  },

  /**
   * Stale-While-Revalidate (SWR) fetching strategy
   * Instantly calls renderCallback with cached data (if any), 
   * then fetches fresh data silently. If fresh data differs, calls renderCallback again.
   */
  fetchWithCache: async function(action, payload, renderCallback) {
    const cacheKey = "crm_cache_" + action + "_" + JSON.stringify(payload);
    
    // Fallback to sessionStorage if IndexedDB is not ready yet
    let cachedStr = sessionStorage.getItem(cacheKey);
    let hasRenderedCache = false;
    
    // Try IndexedDB first for persistence across sessions
    if (typeof CRMDB !== 'undefined') {
        try {
            const dbCache = await CRMDB.getCache(cacheKey);
            if (dbCache) {
                cachedStr = JSON.stringify(dbCache);
            }
        } catch(e) {}
    }
    
    // 1. Render immediately from cache
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        renderCallback(parsed, false); // isFresh = false
        hasRenderedCache = true;
      } catch(e) {
        console.warn("Cache parse error", e);
      }
    } else {
      this.showLoader();
    }
    
    // 2. Fetch fresh data in background (silent if we already rendered cache)
    if (navigator.onLine) {
        this.call(action, payload, !hasRenderedCache)
          .then(async (freshData) => {
            const freshStr = JSON.stringify(freshData);
            if (cachedStr !== freshStr) {
              sessionStorage.setItem(cacheKey, freshStr);
              if (typeof CRMDB !== 'undefined') {
                  await CRMDB.setCache(cacheKey, freshData);
              }
              renderCallback(freshData, true); // isFresh = true
            }
          })
          .catch(err => {
            console.error("Background fetch failed for", action, err);
          });
    } else {
        if (!hasRenderedCache) {
            this.hideLoader();
            console.warn("Offline and no cache available for", action);
        }
    }
  }
};
