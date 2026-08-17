/**
 * Gugnani Tyres CRM - Dashboard Logic
 */

let leadTrendChartInstance = null;
let conversionChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireLogin();
  Layout.render("Dashboard");
  
  window.refreshCurrentPageData = loadDashboardData;
  loadDashboardData();
});

async function loadDashboardData() {
  // 1. Fetch Stats
  API.fetchWithCache('getDashboardStats', {}, (data) => {
      animateValue("statTodayLeads", data.todayLeads);
      animateValue("statTodayFollowUps", data.todayFollowUps);
      animateValue("statPendingFollowUps", data.pendingFollowUps);
      animateValue("statCompleted", data.completed);
      renderCharts(data);
  });
  
  // Fetch ALL leads first to get true statuses
  API.fetchWithCache('getLeads', { status: '' }, (allLeads) => {
      window.CRMCachedLeads = window.CRMCachedLeads || {};
      allLeads.forEach(lead => window.CRMCachedLeads[lead.LeadID] = lead);
      
      // 2. Fetch FollowUps (for Pending Reminders)
      API.fetchWithCache('getFollowUps', { type: 'today' }, (followups) => {
          // Deduplicate by LeadID (take latest)
          const uniqueFollowupsMap = new Map();
          followups.forEach(f => {
              uniqueFollowupsMap.set(f.LeadID, f);
          });
          const uniqueFollowups = Array.from(uniqueFollowupsMap.values());
          
          // Sort by date/time ascending
          uniqueFollowups.sort((a, b) => {
              let cleanA = CRMUtils.formatIsoDate(a.RemDate);
              let cleanB = CRMUtils.formatIsoDate(b.RemDate);
              const dateA = new Date((cleanA && cleanA.includes('/')) ? cleanA.split('/').reverse().join('-') : cleanA);
              const dateB = new Date((cleanB && cleanB.includes('/')) ? cleanB.split('/').reverse().join('-') : cleanB);
              if (dateA < dateB) return -1;
              if (dateA > dateB) return 1;
              const timeA = a.RemTime || '00:00';
              const timeB = b.RemTime || '00:00';
              return timeA.localeCompare(timeB);
          });
          
          // Filter out scheduled, completed, and lost leads
          const activeFollowups = uniqueFollowups.filter(f => {
              const leadStatus = window.CRMCachedLeads[f.LeadID] ? window.CRMCachedLeads[f.LeadID].Status : f.Status;
              return leadStatus !== 'Completed' && leadStatus !== 'Lost' && leadStatus !== 'Scheduled';
          });
          
          // Filter to only today or earlier
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const filteredFollowups = activeFollowups.filter(f => {
              if (!f.RemDate) return false;
              let cleanDate = CRMUtils.formatIsoDate(f.RemDate);
              let dParts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
              if (dParts.length !== 3) return false;
              let [d, m, y] = cleanDate.includes('/') ? dParts : [dParts[2], dParts[1], dParts[0]];
              if (y.length === 2) y = "20" + y;
              let remDateObj = new Date(y, m - 1, d);
              return remDateObj <= today;
          });
          
          renderTodayReminders(filteredFollowups);
      });
      
      // 3. Fetch Scheduled Leads (for Fitment Plan)
      // Only Leads with Status === 'Scheduled' and FitmentDate <= today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const scheduledLeads = allLeads.filter(l => {
          if (l.Status !== 'Scheduled') return false;
          
          let fDate = l.FitmentDate || l.ExpFitmentDate;
          if (!fDate) return false;
          
          let cleanDate = CRMUtils.formatIsoDate(fDate);
          let dParts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
          if (dParts.length !== 3) return false;
          let [d, m, y] = cleanDate.includes('/') ? dParts : [dParts[2], dParts[1], dParts[0]];
          if (y.length === 2) y = "20" + y;
          let fitDateObj = new Date(y, m - 1, d);
          
          return fitDateObj <= today;
      });
      
      renderTodayFitments(scheduledLeads);
  });
}

function renderCharts(data) {
    const trendCtx = document.getElementById('leadTrendChart');
    if (trendCtx) {
        if (leadTrendChartInstance) {
            leadTrendChartInstance.destroy();
        }
        leadTrendChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: data.trendLabels || ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                datasets: [{
                    label: 'New Leads',
                    data: data.weeklyTrend || [0, 0, 0, 0, 0, 0, 0],
                    borderColor: CONFIG.COLORS.primary,
                    backgroundColor: 'rgba(204, 0, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4 // curvy lines
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] }, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
    
    const funnelCtx = document.getElementById('conversionChart');
    if (funnelCtx) {
        if (conversionChartInstance) {
            conversionChartInstance.destroy();
        }
        conversionChartInstance = new Chart(funnelCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Lost'],
                datasets: [{
                    data: [data.completed || 0, data.pendingFollowUps || 0, data.lost || 0],
                    backgroundColor: [
                        CONFIG.COLORS.success,
                        CONFIG.COLORS.warning,
                        CONFIG.COLORS.danger
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}



function renderTodayReminders(followups) {
    try {
        const tbody = document.getElementById('remindersTable');
        
        if (!followups || followups.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fa-solid fa-mug-hot fs-3 mb-2 d-block"></i> No reminders for today. Great job!</td></tr>`;
            return;
        }
        
        let html = '';
        followups.forEach(f => {
            let timeStr = CRMUtils.formatIsoTime(f.RemTime);
            let cleanDate = CRMUtils.formatIsoDate(f.RemDate);
            if (!timeStr || timeStr === '-') timeStr = '00:00';
            
            let dateTimeStr = `${cleanDate}<br>${timeStr}`;
            
            let isDue = CRMUtils.isCallDue(f.RemDate, f.RemTime);
            
            let reminderHtml = '';
            let phoneColorClass = 'text-success';
            let phoneIconClass = 'fa-phone fa-xl';
            
            if (isDue) {
                let dueText = 'Call due today';
                if (cleanDate.includes('/') || cleanDate.includes('-')) {
                    let dParts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
                    if (dParts.length === 3) {
                        let [d, m, y] = cleanDate.includes('/') ? dParts : [dParts[2], dParts[1], dParts[0]];
                        if (y.length === 2) y = "20" + y;
                        let dObj = new Date(y, m - 1, d);
                        let today = new Date();
                        today.setHours(0,0,0,0);
                        let diffTime = today - dObj;
                        if (diffTime > 0) {
                            let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 0) {
                                dueText = `Call due before ${diffDays} days`;
                            }
                        }
                    }
                }
            
                reminderHtml = `<br><span class="badge bg-danger mt-1"><i class="fa-solid fa-bell me-1"></i> ${dueText}</span>`;
                phoneColorClass = 'text-danger';
                phoneIconClass = 'fa-phone fa-shake fa-xl';
            }
            
            let waMsg = `Hi ${f.CustomerName || ''}, this is from Gugnani Tyres following up.`;
            let waLink = CRMUtils.generateWhatsAppLink(f.Mobile, waMsg);
            let waBtnHtml = `<a href="${waLink}" target="_blank" class="text-success ms-2" title="WhatsApp Customer"><i class="fa-brands fa-whatsapp fa-xl"></i></a>`;
            
            let callBtnHtml = `<div class="text-center">
                <a href="tel:${f.Mobile}" class="${phoneColorClass}" title="Call Customer" style="text-decoration: none;"><i class="fa-solid ${phoneIconClass}"></i></a>
                ${waBtnHtml}
            </div>`;
            
            let leadDisplay = f.CustomerName ? `<b>${f.CustomerName}</b><br><small class="text-muted"><a href="tel:${f.Mobile}" class="text-decoration-none text-dark fw-bold">${f.Mobile || ''}</a></small>${reminderHtml}` : `<b>Lead #${f.LeadID}</b>`;
            
            let actionHtml = `
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-info text-white" onclick="window.openLeadDetailsModal('${f.LeadID}')" title="Open"><i class="fa-solid fa-eye"></i></button>
                </div>
            `;
            
            html += `
                <tr>
                    <td><span class="badge bg-light text-dark border"><i class="fa-regular fa-clock text-primary"></i> ${dateTimeStr}</span></td>
                    <td class="fw-medium">${leadDisplay}</td>
                    <td>${callBtnHtml}</td>
                    <td>${f.Exec || '-'}</td>
                    <td class="text-center"><span class="badge bg-warning text-dark">Pending</span></td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        document.getElementById('remindersTable').innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading reminders.</td></tr>`;
    }
}


function renderTodayFitments(leads) {
    try {
        const tbody = document.getElementById('fitmentsTable');
        
        animateValue("statTodayFitments", leads.length);
        
        if (!leads || leads.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fa-solid fa-mug-hot fs-3 mb-2 d-block"></i> No fitments scheduled for today.</td></tr>`;
            return;
        }
        
        let html = '';
        leads.forEach(lead => {
            let reservedBadge = lead.ReservedStock === 'Yes' 
                ? '<span class="badge bg-dark">Yes</span>' 
                : '<span class="badge bg-dark">No</span>';
                
            let phoneColorClass = 'text-danger';
            let phoneIconClass = 'fa-phone';
            
            let isDue = false;
            let fDate = lead.FitmentDate || lead.ExpFitmentDate;
            let fTime = lead.FitmentTime || '00:00';
            if (fDate && fTime) {
                 isDue = CRMUtils.isCallDue(fDate, fTime);
            }
            
            let timeStr = '-';
            let cleanDate = CRMUtils.formatIsoDate(fDate);
            if (fTime && fTime !== '00:00') {
                timeStr = CRMUtils.formatIsoTime(fTime);
            }
            
            let reminderHtml = '';
            if (isDue) {
                let dueText = 'Call Due Today';
                if (cleanDate.includes('/') || cleanDate.includes('-')) {
                    let dParts = cleanDate.includes('/') ? cleanDate.split('/') : cleanDate.split('-');
                    if (dParts.length === 3) {
                        let [d, m, y] = cleanDate.includes('/') ? dParts : [dParts[2], dParts[1], dParts[0]];
                        if (y.length === 2) y = "20" + y;
                        let dObj = new Date(y, m - 1, d);
                        let today = new Date();
                        today.setHours(0,0,0,0);
                        let diffTime = today - dObj;
                        if (diffTime > 0) {
                            let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 0) {
                                dueText = `Call due before ${diffDays} days`;
                            }
                        }
                    }
                }
                reminderHtml = `<br><span class="badge bg-danger rounded-pill mt-1"><i class="fa-solid fa-bell me-1"></i> ${dueText}</span>`;
                phoneIconClass = 'fa-phone fa-shake fa-xl';
            }
            
            let remDateStr = '';
            if (lead.RemDate) {
                 remDateStr = `<br><small class="text-danger fw-bold" style="font-size: 11px;">Reminder: ${lead.RemDate} ${lead.RemTime || ''}</small>`;
            }
                
            let waMsg = `Hi ${lead.CustomerName || ''}, regarding your fitment appointment with Gugnani Tyres.`;
            let waLink = CRMUtils.generateWhatsAppLink(lead.Mobile, waMsg);
            
            let waBtnHtml = `<a href="${waLink}" target="_blank" class="text-success ms-2" title="WhatsApp Customer"><i class="fa-brands fa-whatsapp fa-xl"></i></a>`;
            
            let callBtnHtml = `<div class="d-flex align-items-center justify-content-center">
                <a href="tel:${lead.Mobile}" class="${phoneColorClass}" title="Call Customer" style="text-decoration: none;"><i class="fa-solid ${phoneIconClass}"></i></a>
                ${waBtnHtml}
            </div>`;
            
            let actionHtml = `
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm btn-info text-white" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; background-color: #0dcaf0; border: none;" onclick="window.openLeadDetailsModal('${lead.LeadID}')" title="View"><i class="fa-solid fa-eye" style="font-size:12px;"></i></button>
                    <button class="btn btn-sm text-white" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; background-color: #198754; border: none;" onclick="window.openDashboardActionModal('completed', '${lead.LeadID}')" title="Complete"><i class="fa-solid fa-check" style="font-size:12px;"></i></button>
                    <button class="btn btn-sm text-white" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; background-color: #dc3545; border: none;" onclick="window.openDashboardActionModal('lost', '${lead.LeadID}')" title="Lost"><i class="fa-solid fa-xmark" style="font-size:12px;"></i></button>
                    <button class="btn btn-sm text-white" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; background-color: #b02a37; border: none;" onclick="window.openScheduleModal('${lead.LeadID}')" title="Edit Fitment"><i class="fa-solid fa-pen-to-square" style="font-size:12px;"></i></button>
                    <button class="btn btn-sm text-dark" style="width:28px; height:28px; padding:0; display:flex; align-items:center; justify-content:center; background-color: #ffc107; border: none;" onclick="window.dashboardRevertSchedule('${lead.LeadID}')" title="Revert"><i class="fa-solid fa-rotate-right" style="font-size:12px;"></i></button>
                </div>
            `;
            
            html += `
                <tr>
                    <td><b>${cleanDate}</b><br><small class="text-muted">${timeStr}</small></td>
                    <td>
                        <small class="text-muted">Lead ID:</small> <b>${lead.LeadID}</b><br>
                        ${lead.CustomerName || 'Unknown'}<br>
                        <small class="text-muted"><i class="fa-solid fa-phone"></i> ${lead.Mobile || ''}</small>
                        ${reminderHtml}
                        ${remDateStr}
                    </td>
                    <td>${lead.TyreSize || '-'} <small class="text-muted">(Qty: ${lead.Quantity || '-'})</small></td>
                    <td>${callBtnHtml}</td>
                    <td class="text-center">${reservedBadge}</td>
                    <td class="text-center">${lead.AssignedBranch || 'All'}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        document.getElementById('fitmentsTable').innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading fitments.</td></tr>`;
    }
}


function animateValue(id, end, duration = 1000) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    // If it's 0 or invalid, just set it
    if (!end || end === 0) {
        obj.innerHTML = 0;
        return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * end);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end; // Ensure exact end value
        }
    };
    window.requestAnimationFrame(step);
}

// ----------------------------------------------------
// Dashboard Inline Schedule Actions
// ----------------------------------------------------

let dashboardCurrentLeadId = null;

window.openDashboardActionModal = function(action, leadId) {
    dashboardCurrentLeadId = leadId;
    const user = Auth.getUser();
    if(user.Role === 'Reception') {
        Swal.fire('Denied', 'Reception cannot close leads.', 'error');
        return;
    }
    
    // Reset forms
    const completeForm = document.getElementById('completeForm');
    if (completeForm) completeForm.reset();
    const lostForm = document.getElementById('lostForm');
    if (lostForm) lostForm.reset();
    
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
};

window.openScheduleModal = async function(leadId) {
    try {
        const modalEl = document.getElementById('scheduleModal');
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        
        // Reset form
        const scheduleForm = document.getElementById('scheduleForm');
        if (scheduleForm) scheduleForm.reset();
        
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
};



window.dashboardRevertSchedule = function(leadId) {
    dashboardCurrentLeadId = leadId;
    document.getElementById('revertReason').value = '';
    document.getElementById('revertDate').value = '';
    document.getElementById('revertTime').value = '';
    document.getElementById('revertDate').setAttribute('min', CRMUtils.getLocalDateISO());
    new bootstrap.Modal(document.getElementById('revertModal')).show();
};

// Setup Dashboard Events
document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btnSaveSchedule');
    if(btnSave) {
        btnSave.addEventListener('click', async () => {
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
            
            try {
                await API.call('scheduleFitment', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Saved',
                    text: 'Fitment Schedule updated.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                bootstrap.Modal.getInstance(document.getElementById('scheduleModal')).hide();
                loadDashboardData(); // Refresh table
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        });
    }
    
    const btnComplete = document.getElementById('btnSubmitComplete');
    if(btnComplete) {
        btnComplete.addEventListener('click', async () => {
            const payload = {
                LeadID: dashboardCurrentLeadId,
                CompDate: document.getElementById('compDate').value,
                InvoiceNo: document.getElementById('compInvoice').value,
                Remarks: document.getElementById('compRemarks').value
            };
            try {
                await API.call('markCompleted', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Completed!',
                    text: 'Lead marked as completed!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                bootstrap.Modal.getInstance(document.getElementById('actionModal')).hide();
                loadDashboardData(); // Refresh tables
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        });
    }
    
    // Lost Actions
    const btnLost = document.getElementById('btnSubmitLost');
    if(btnLost) {
        btnLost.addEventListener('click', async () => {
            const payload = {
                LeadID: dashboardCurrentLeadId,
                LostReason: document.getElementById('lostReason').value,
                Remarks: document.getElementById('lostRemarks').value
            };
            if (!payload.LostReason) {
                return Swal.fire('Required', 'Please select a reason for lost.', 'warning');
            }
            try {
                await API.call('markLost', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Marked Lost',
                    text: 'Lead marked as lost.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                bootstrap.Modal.getInstance(document.getElementById('actionModal')).hide();
                loadDashboardData();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        });
    }
    
    // Revert Actions
    const btnRevert = document.getElementById('btnSubmitRevert');
    if(btnRevert) {
        btnRevert.addEventListener('click', async () => {
            const reason = document.getElementById('revertReason').value;
            if(!reason) return Swal.fire('Required', 'Please enter a reason for reverting.', 'warning');
            
            const payload = {
                LeadID: dashboardCurrentLeadId,
                Reason: reason,
                RemDate: document.getElementById('revertDate').value,
                RemTime: document.getElementById('revertTime').value
            };
            try {
                await API.call('revertSchedule', payload);
                Swal.fire({ icon: 'success', title: 'Reverted', text: 'Lead reverted to Follow-up.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                bootstrap.Modal.getInstance(document.getElementById('revertModal')).hide();
                loadDashboardData();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        });
    }
});


