/**
 * Gugnani Tyres CRM - Utility functions for Exports
 */

const CRMUtils = {
    setButtonLoading: function(btn, isLoading, originalText = 'Save') {
        if (!btn) return;
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalText || originalText;
        }
    },
    
    exportToCSV: function(tableId, filename) {
        const table = document.getElementById(tableId);
        if(!table) return;
        
        let csv = [];
        const rows = table.querySelectorAll('tr');
        
        for (let i = 0; i < rows.length; i++) {
            let row = [], cols = rows[i].querySelectorAll('td, th');
            
            // Skip action columns usually the last one, or skip elements with .no-export class
            for (let j = 0; j < cols.length; j++) {
                if(cols[j].classList.contains('no-export')) continue;
                
                // Get text, replace double quotes with single quotes to avoid breaking csv
                let data = cols[j].innerText.replace(/"/g, "'").replace(/(\r\n|\n|\r)/gm, " ");
                // Escape commas
                row.push('"' + data + '"');
            }
            csv.push(row.join(','));
        }
        
        this.downloadCSV(csv.join('\n'), filename);
    },
    
    downloadCSV: function(csv, filename) {
        let csvFile;
        let downloadLink;
        
        csvFile = new Blob([csv], {type: "text/csv"});
        downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    },
    
    printDiv: function(divId, title) {
        const printContents = document.getElementById(divId).innerHTML;
        const originalContents = document.body.innerHTML;
        
        document.body.innerHTML = `
            <div class="print-container">
                <h2 class="mb-4">${title}</h2>
                ${printContents}
            </div>
        `;
        
        window.print();
        
        // Restore
        document.body.innerHTML = originalContents;
        window.location.reload();
    },
    
    logout: function(redirect = true) {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        sessionStorage.clear();
        if (redirect) window.location.href = 'login.html';
    },
    
    openWhatsApp: function(phone, text = '') {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        let url = isMobile 
            ? `https://wa.me/91${phone}`
            : `https://web.whatsapp.com/send/?phone=91${phone}`;
            
        if (text) {
            url += isMobile ? `?text=${encodeURIComponent(text)}` : `&text=${encodeURIComponent(text)}`;
        }
        window.open(url, '_blank');
    },

    refreshPageData: async function() {
        // Clear all caches (both sessionStorage and IndexedDB)
        if (typeof API !== 'undefined' && typeof API.clearCache === 'function') {
            await API.clearCache();
        } else {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('crm_cache_')) sessionStorage.removeItem(key);
            });
        }
        
        // Hide modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(m => {
            const instance = bootstrap.Modal.getInstance(m);
            if (instance) instance.hide();
        });
        
        // Refresh page silently
        if (typeof window.refreshCurrentPageData === 'function') {
            window.refreshCurrentPageData();
        } else {
            window.location.reload();
        }
    },
    
    executeGlobalSearch: async function(query) {
        const modalEl = document.getElementById('globalSearchModal');
        const resultsContainer = document.getElementById('globalSearchResults');
        
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new bootstrap.Modal(modalEl);
        
        resultsContainer.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Searching across all leads...</div></div>';
        modal.show();
        
        try {
            const results = await API.call('globalSearch', { query });
            
            if (!results || results.length === 0) {
                resultsContainer.innerHTML = '<div class="p-5 text-center text-muted"><i class="fa-solid fa-magnifying-glass fs-1 mb-3"></i><br>No leads found matching "<b>' + query + '</b>"</div>';
                return;
            }
            
            let html = '';
            results.forEach(lead => {
                let badge = lead.Status === 'Completed' ? 'success' : (lead.Status === 'Lost' ? 'danger' : (lead.Status === 'Scheduled' ? 'warning text-dark' : 'primary'));
                html += `
                    <div class="list-group-item list-group-item-action p-3 d-flex justify-content-between align-items-center">
                        <div>
                            <div class="d-flex align-items-center mb-1">
                                <span class="fw-bold fs-5 me-2">${lead.CustomerName}</span>
                                <span class="badge bg-${badge}">${lead.Status}</span>
                            </div>
                            <div class="text-muted small mt-2">
                                <span class="me-3"><i class="fa-solid fa-phone me-1"></i>${lead.Mobile}</span>
                                <span class="me-3"><i class="fa-solid fa-car me-1"></i>${lead.VehicleNumber || 'N/A'}</span>
                                <span class="me-3"><i class="fa-solid fa-user-tie me-1"></i>${lead.AssignedExec || '-'} (${lead.AssignedBranch || '-'})</span>
                                <span><i class="fa-solid fa-hashtag me-1"></i>${lead.LeadID}</span>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm rounded-pill px-3" onclick="bootstrap.Modal.getInstance(document.getElementById('globalSearchModal')).hide(); window.openLeadDetailsModal('${lead.LeadID}')">View</button>
                    </div>
                `;
            });
            resultsContainer.innerHTML = html;
        } catch (e) {
            resultsContainer.innerHTML = '<div class="p-5 text-center text-danger">Error performing search: ' + e.message + '</div>';
        }
    },
    
    getLocalDateISO: function() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    formatIsoDate: function(dStr) {
        let str = String(dStr || '-');
        if (str.includes('T')) return new Date(str).toLocaleDateString('en-GB');
        return str;
    },
    
    formatIsoTime: function(tStr) {
        let str = String(tStr || '-');
        if (str === '-') return '';
        if (str.includes('T')) return new Date(str).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        
        // Handle HH:MM string format directly
        if (/^\d{2}:\d{2}$/.test(str)) {
            let [hours, minutes] = str.split(':');
            let h = parseInt(hours, 10);
            let ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12;
            h = h ? h : 12; // the hour '0' should be '12'
            let hStr = h < 10 ? '0' + h : h;
            return `${hStr}:${minutes} ${ampm}`;
        }
        
        return str;
    },
    
    isCallDue: function(remDate, remTime) {
        if (!remDate || remDate === '-') return false;
        
        try {
            let cleanDate = this.formatIsoDate(remDate);
            let cleanTime = this.formatIsoTime(remTime);
            if (!cleanTime || cleanTime === '-') cleanTime = '00:00';
            
            let y, m, d;
            if (cleanDate.includes('/')) {
                [d, m, y] = cleanDate.split('/').map(Number);
            } else if (cleanDate.includes('-')) {
                [y, m, d] = cleanDate.split('-').map(Number);
            } else {
                return false;
            }
            
            let h = 0, min = 0;
            const timePart = cleanTime.replace(/am|pm|AM|PM/g, '').trim();
            if (timePart.includes(':')) {
                [h, min] = timePart.split(':').map(Number);
            }
            if (cleanTime.toUpperCase().includes('PM') && h < 12) h += 12;
            if (cleanTime.toUpperCase().includes('AM') && h === 12) h = 0;
            
            const dt = new Date(y, m - 1, d, h, min, 0);
            const now = new Date();
            return now >= dt;
        } catch(e) {
            console.error("isCallDue Error:", e);
            return false;
        }
    },
    
    getDueBadgeText: function(remDate, remTime) {
        if (!remDate || remDate === '-') return '';
        try {
            let cleanDate = this.formatIsoDate(remDate);
            let y, m, d;
            if (cleanDate.includes('/')) {
                [d, m, y] = cleanDate.split('/').map(Number);
            } else if (cleanDate.includes('-')) {
                [y, m, d] = cleanDate.split('-').map(Number);
            } else {
                return 'Call Due!';
            }
            
            const dueDt = new Date(y, m - 1, d);
            dueDt.setHours(0, 0, 0, 0);
            
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            const diffTime = now.getTime() - dueDt.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Call Due Today';
            if (diffDays === 1) return 'Overdue by 1 day';
            if (diffDays > 1) return `Overdue by ${diffDays} days`;
            
            return 'Call Due!'; 
        } catch(e) {
            return 'Call Due!';
        }
    },
    
    generateWhatsAppLink: function(mobile, message) {
        if (!mobile) return '#';
        let cleanMobile = String(mobile).replace(/\D/g, '');
        if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;
        const text = message ? encodeURIComponent(message) : '';
        return `https://wa.me/${cleanMobile}?text=${text}`;
    },
    
    exportTableToCSV: function(tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        let csv = [];
        const rows = table.querySelectorAll('tr');
        
        for (let i = 0; i < rows.length; i++) {
            let row = [], cols = rows[i].querySelectorAll('td, th');
            
            // Skip rows with no data or loading rows
            if (cols.length === 1 && cols[0].colSpan > 1) continue;
            
            for (let j = 0; j < cols.length; j++) {
                // Ignore the Action column (usually the last column, but check text)
                if (cols[j].innerText.trim() === 'Action' || cols[j].querySelector('.btn')) continue;
                
                // Clean the text
                let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, ' ').trim();
                // Escape double quotes
                data = data.replace(/"/g, '""');
                row.push('"' + data + '"');
            }
            if (row.length > 0) csv.push(row.join(','));
        }
        
        const csvFile = new Blob([csv.join('\n')], {type: 'text/csv'});
        const downloadLink = document.createElement('a');
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    },
    
    playDing: function() {
        try {
            // A simple base64 encoded short 'ding' sound (using a very short beep for code brevity)
            const beep = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Note: In a real app we use a valid base64 audio string, for now we will just use AudioContext oscillator for a perfect ding
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
            gain.gain.setValueAtTime(1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    },
    
    populateSelect: function(selectId, dataArray, valueKey, labelKey, defaultLabel = '') {
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        
        selectEl.innerHTML = '';
        if (defaultLabel) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = defaultLabel;
            selectEl.appendChild(opt);
        }
        
        if (Array.isArray(dataArray)) {
            dataArray.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item[valueKey];
                opt.textContent = item[labelKey];
                selectEl.appendChild(opt);
            });
        }
    },

    populateDatalist: function(datalistId, dataArray, dataKey) {
        const datalistEl = document.getElementById(datalistId);
        if (!datalistEl) return;
        
        datalistEl.innerHTML = '';
        if (Array.isArray(dataArray)) {
            dataArray.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item[dataKey] || item;
                datalistEl.appendChild(opt);
            });
        }
    },

    populateDatalistFromArray: function(datalistId, dataArray) {
        const datalistEl = document.getElementById(datalistId);
        if (!datalistEl) return;
        
        datalistEl.innerHTML = '';
        if (Array.isArray(dataArray)) {
            dataArray.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item;
                datalistEl.appendChild(opt);
            });
        }
    }
};

// Start live checking for overdue calls (runs every 60 seconds)
document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        document.querySelectorAll('.auto-due-check').forEach(el => {
            let remDate = el.getAttribute('data-remdate');
            let remTime = el.getAttribute('data-remtime');
            if (CRMUtils.isCallDue(remDate, remTime)) {
                // Update icon color to red
                el.classList.remove('text-success');
                el.classList.add('text-danger');
                
                // Add shake animation to icon if not already there
                let icon = el.querySelector('.fa-phone');
                if (icon && !icon.classList.contains('fa-shake')) {
                    icon.classList.add('fa-shake');
                }
            }
        });
    }, 60000); // 60s
});
