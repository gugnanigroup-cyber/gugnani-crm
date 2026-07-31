/**
 * Gugnani Tyres CRM - Follow-ups Logic
 */

let fuTable;
let currentLeadId = null;

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    Layout.render("Follow-ups");
    
    // Check if ID is passed in URL (legacy support, redirect to open modal)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    // Init table
    fuTable = $('#followupsTable').DataTable({
        pageLength: 25,
        ordering: false
    });
    const followupFilter = document.getElementById('followupFilter');
    if (followupFilter) {
        followupFilter.addEventListener('change', (e) => {
            const customDateRange = document.getElementById('customDateRange');
            if (e.target.value === 'custom') {
                if (customDateRange) customDateRange.classList.remove('d-none');
            } else {
                if (customDateRange) customDateRange.classList.add('d-none');
                loadList();
            }
        });
    }
    
    const btnCustomFilter = document.getElementById('btnCustomFilter');
    if (btnCustomFilter) btnCustomFilter.addEventListener('click', loadList);
    
    window.refreshCurrentPageData = loadList;
    await loadList();
    
    if (id) {
        window.openLeadDetailsModal(id);
    }
    
    setupEventListeners();
});

async function loadList() {
    const type = document.getElementById('followupFilter').value;
    let payload = { type: type };
    
    if (type === 'custom') {
        const start = document.getElementById('fuStartDate').value;
        const end = document.getElementById('fuEndDate').value;
        if (!start || !end) {
            Swal.fire('Required', 'Please select both start and end dates', 'warning');
            return;
        }
        payload.startDate = start;
        payload.endDate = end;
    }
    // Fetch ALL Leads FIRST (using cache for instant load)
    API.fetchWithCache('getLeads', { status: '' }, (allLeads) => {
        window.CRMCachedLeads = window.CRMCachedLeads || {};
        allLeads.forEach(lead => window.CRMCachedLeads[lead.LeadID] = lead);
        
        API.fetchWithCache('getFollowUps', payload, (followups) => {
            console.log("Raw followups from API:", followups);
            fuTable.clear();
            
            const uniqueFollowupsMap = new Map();
            followups.forEach(f => {
                uniqueFollowupsMap.set(f.LeadID, f);
            });
            const uniqueFollowups = Array.from(uniqueFollowupsMap.values());
            
            // Sort so oldest/overdue are at the top
            uniqueFollowups.sort((a, b) => {
                const dateA = new Date((a.RemDate && a.RemDate.includes('/')) ? a.RemDate.split('/').reverse().join('-') : a.RemDate);
                const dateB = new Date((b.RemDate && b.RemDate.includes('/')) ? b.RemDate.split('/').reverse().join('-') : b.RemDate);
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                const timeA = a.RemTime || '00:00';
                const timeB = b.RemTime || '00:00';
                return timeA.localeCompare(timeB);
            });
            
            // Filter out leads that have moved out of the follow-up stage based on fresh lead cache
            const activeFollowups = uniqueFollowups.filter(f => {
                const lead = window.CRMCachedLeads[f.LeadID];
                if (lead) {
                    return lead.Status !== 'Completed' && lead.Status !== 'Lost' && lead.Status !== 'Scheduled';
                }
                // If lead isn't in cache yet, trust the backend's filtering (it already filters these out)
                return true;
            });
            console.log("activeFollowups after filtering:", activeFollowups);
            
            activeFollowups.forEach(f => {
                if (!window.CRMCachedLeads[f.LeadID]) {
                    window.CRMCachedLeads[f.LeadID] = {
                        LeadID: f.LeadID, CustomerName: f.CustomerName, Mobile: f.Mobile, Status: f.Status, AssignedExec: f.Exec
                    };
                }
                
                let remStr = "-";
                if (f.RemDate) {
                    remStr = `<b>${CRMUtils.formatIsoDate(f.RemDate)}</b><br><small class="text-muted">${CRMUtils.formatIsoTime(f.RemTime)}</small>`;
                }
                
                let reminderHtml = '';
                let phoneColorClass = 'text-success'; 
                let phoneIconClass = 'fa-phone fa-xl'; 
                
                if (f.RemDate) {
                    let isDue = CRMUtils.isCallDue(f.RemDate, f.RemTime);
                    if (isDue) {
                        const badgeTxt = CRMUtils.getDueBadgeText(f.RemDate, f.RemTime);
                        reminderHtml = `<br><span class="badge bg-danger mt-1"><i class="fa-solid fa-bell me-1"></i> ${badgeTxt}</span>`;
                        phoneColorClass = 'text-danger';
                        phoneIconClass = 'fa-phone fa-shake fa-xl';
                    }
                }
                
                let waMsg = `Hi ${f.CustomerName || ''}, this is from Gugnani Tyres following up on your inquiry.`;
                let waLink = CRMUtils.generateWhatsAppLink(f.Mobile, waMsg);
                let waBtnHtml = `<a href="${waLink}" target="_blank" class="text-success ms-2" title="WhatsApp Customer"><i class="fa-brands fa-whatsapp fa-xl"></i></a>`;
                
                let leadDisplay = `<div class="fw-medium">Lead #${f.LeadID}</div>`;
                if (f.CustomerName || f.Mobile) {
                    leadDisplay += `<div class="fw-bold mt-1">${f.CustomerName || ''}</div>`;
                    if (f.Mobile) {
                        leadDisplay += `<small class="text-muted"><a href="tel:${f.Mobile}" class="text-decoration-none text-dark"><i class="fa-solid fa-phone text-muted me-1"></i>${f.Mobile}</a></small>`;
                    }
                }
                leadDisplay += reminderHtml;
                let callBtnHtml = `<div>
                      <a href="tel:${f.Mobile}" class="${phoneColorClass} auto-due-check" data-remdate="${f.RemDate || ''}" data-remtime="${f.RemTime || ''}" title="Call Customer" style="text-decoration: none;"><i class="fa-solid ${phoneIconClass}"></i></a>
                      ${waBtnHtml}
                  </div>`;
                
                fuTable.row.add([
                    remStr,
                    leadDisplay,
                    `<div class="text-truncate" style="max-width: 300px;">${f.Discussion || '-'}</div>`,
                    callBtnHtml,
                    `<button class="btn btn-sm btn-outline-primary" onclick="window.openLeadDetailsModal('${f.LeadID}')">Open</button>`
                ]);
            });
            fuTable.draw();
        });
    });
}

function setupEventListeners() {
    // Actions
    const btnSubmitComplete = document.getElementById('btnSubmitComplete');
    if (btnSubmitComplete) {
        btnSubmitComplete.addEventListener('click', async () => {
            const btn = document.getElementById('btnSubmitComplete');
            CRMUtils.setButtonLoading(btn, true);
            try {
                const payload = {
                    LeadID: currentLeadId,
                    CompDate: document.getElementById('compDate').value,
                    InvoiceNo: document.getElementById('compInvoice').value,
                    Remarks: document.getElementById('compRemarks').value
                };
                await API.call('markCompleted', payload);
                Swal.fire('Success', 'Lead marked as completed!', 'success').then(() => {
                    CRMUtils.refreshPageData();
                });
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                CRMUtils.setButtonLoading(btn, false);
            }
        });
    }
    
    const btnSubmitLost = document.getElementById('btnSubmitLost');
    if (btnSubmitLost) {
        btnSubmitLost.addEventListener('click', async () => {
            const btn = document.getElementById('btnSubmitLost');
            CRMUtils.setButtonLoading(btn, true);
            try {
                const reason = document.getElementById('lostReason').value;
                if(!reason) {
                    Swal.fire('Required', 'Please select a reason.', 'warning');
                    return;
                }
                const payload = {
                    LeadID: currentLeadId,
                    Reason: reason,
                    Remarks: document.getElementById('lostRemarks').value
                };
                await API.call('markLost', payload);
                Swal.fire('Success', 'Lead marked as lost.', 'success').then(() => {
                    CRMUtils.refreshPageData();
                });
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                CRMUtils.setButtonLoading(btn, false);
            }
        });
    }

    // Save Schedule
    const btnSaveSchedule = document.getElementById('btnSaveSchedule');
    if (btnSaveSchedule) {
        btnSaveSchedule.addEventListener('click', async () => {
            const btn = document.getElementById('btnSaveSchedule');
            CRMUtils.setButtonLoading(btn, true);
            try {
                const form = document.getElementById('scheduleForm');
                if(!form.checkValidity()) { form.reportValidity(); return; }
                
                const payload = {
                    LeadID: document.getElementById('schLeadId').value,
                    FitmentDate: document.getElementById('schDate').value,
                    FitmentTime: document.getElementById('schTime').value,
                    TyreSize: document.getElementById('schSize').value,
                    Quantity: document.getElementById('schQty').value,
                    ReservedStock: document.getElementById('schReserved').value,
                    Remarks: document.getElementById('schRemarks').value,
                    Branch: document.getElementById('schBranch') ? document.getElementById('schBranch').value : undefined
                };
                
                await API.call('scheduleFitment', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Scheduled',
                    text: 'Fitment Scheduled successfully.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                bootstrap.Modal.getInstance(document.getElementById('scheduleModal')).hide();
                // Refresh lead details to reflect updated status
                loadLeadDetails(currentLeadId);
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                CRMUtils.setButtonLoading(btn, false);
            }
        });
    }
}

function openActionModal(action) {
    const user = Auth.getUser();
    if(user.Role === 'Reception') {
        Swal.fire('Denied', 'Reception cannot close leads.', 'error');
        return;
    }
    
    document.getElementById('completeForm').classList.add('hidden');
    document.getElementById('lostForm').classList.add('hidden');
    
    const modal = new bootstrap.Modal(document.getElementById('actionModal'));
    
    if(action === 'completed') {
        document.getElementById('actionModalTitle').innerHTML = '<i class="fa-solid fa-check text-success"></i> Mark Completed';
        document.getElementById('completeForm').classList.remove('hidden');
        const todayStr = CRMUtils.getLocalDateISO();
        document.getElementById('compDate').value = todayStr; // YYYY-MM-DD
        document.getElementById('compDate').setAttribute('max', todayStr); // Cannot be future date
    } else {
        document.getElementById('actionModalTitle').innerHTML = '<i class="fa-solid fa-xmark text-danger"></i> Mark Lost';
        document.getElementById('lostForm').classList.remove('hidden');
    }
    modal.show();
}

function formatIsoDate(dStr) {
    let str = String(dStr || '-');
    if (str.includes('T')) return new Date(str).toLocaleDateString('en-GB');
    return str;
}

function formatIsoTime(tStr) {
    let str = String(tStr || '-');
    if (str.includes('T')) return new Date(str).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
    if (str === '-') return '';
    return str;
}

async function openScheduleModal(leadId) {
    try {
        const modalEl = document.getElementById('scheduleModal');
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        
        document.getElementById('schLeadId').value = leadId;
        document.getElementById('schSize').value = 'Loading...';
        document.getElementById('schQty').value = '...';
        
        // Schedule date cannot be in the past
        document.getElementById('schDate').setAttribute('min', CRMUtils.getLocalDateISO());
        
        modal.show();

        const res = await API.call('getLeadDetails', { leadId: leadId }, false);
        const lead = res.lead;
        const sch = res.schedule || {};
        
        document.getElementById('schSize').value = sch.TyreSize || lead.TyreSize || '';
        document.getElementById('schQty').value = sch.Quantity || lead.Quantity || '';
        
        let fDate = sch.FitmentDate || lead.ExpFitmentDate || '';
        if (fDate) {
            fDate = String(fDate);
            if (fDate.includes('T')) {
                fDate = fDate.split('T')[0];
            } else if (fDate.includes('/')) {
                let parts = fDate.split('/');
                if (parts.length === 3) fDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
        }
        
        let fTime = sch.FitmentTime || '';
        if (fTime) {
            fTime = String(fTime);
            if (fTime.includes('T')) {
                const t = new Date(fTime);
                fTime = t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0');
            } else {
                fTime = fTime.substring(0, 5);
            }
        }
        
        document.getElementById('schDate').value = fDate;
        document.getElementById('schTime').value = fTime;
        document.getElementById('schReserved').value = sch.ReservedStock || 'No';
        
        if (document.getElementById('schRemarks')) {
            document.getElementById('schRemarks').value = sch.Remarks || '';
        }
        
        const user = Auth.getUser();
        if (user.Role === 'Super Admin' || user.Role === 'Branch Manager') {
            const branches = await API.call('getBranches', {}, false);
            const select = document.getElementById('schBranch');
            select.innerHTML = '';
            branches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.BranchName; opt.textContent = b.BranchName;
                if(b.BranchName === (sch.Branch || lead.AssignedBranch)) opt.selected = true;
                select.appendChild(opt);
            });
        }
    } catch(e) {
        Swal.fire('Error', e.message, 'error');
    }
}

