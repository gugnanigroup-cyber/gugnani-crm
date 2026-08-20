/**
 * Gugnani Tyres CRM - Schedule Logic
 */

let schTable;

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    Layout.render("Schedule");
    
    schTable = $('#scheduleTable').DataTable({
        pageLength: 25,
        ordering: false
    });
    
    // Check if we came here to schedule a specific lead
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    window.refreshCurrentPageData = loadScheduleData;
    await loadScheduleData();
    
    if (id) {
        schTable.search(id).draw();
    }
});

async function loadScheduleData() {
    API.fetchWithCache('getLeads', { status: '' }, (allLeads) => {
        const leads = allLeads.filter(l => {
            if (l.Status === 'Scheduled') return true;
            if (l.Status === 'Completed' && l.ExpFitmentDate && String(l.ExpFitmentDate).trim() !== '-' && String(l.ExpFitmentDate).trim() !== '') return true;
            return false;
        });
        
        window.CRMCachedLeads = window.CRMCachedLeads || {};
        schTable.clear();
        
        leads.forEach(lead => {
            window.CRMCachedLeads[lead.LeadID] = lead;
            
            // Only show Pending/Scheduled leads in the Table View
            if (lead.Status !== 'Scheduled') return;
            
            // Determine badge for reserved stock
            let reservedBadge = lead.ReservedStock === 'Yes' 
                ? '<span class="badge bg-success">Yes</span>' 
                : '<span class="badge bg-secondary">No</span>';

                let reminderHtml = '';
                let phoneColorClass = 'text-success'; 
                let phoneIconClass = 'fa-phone fa-xl'; 
                let extractedTime = '';

                if (lead.Remarks && lead.Remarks.startsWith('Reminder:')) {
                    const parts = lead.Remarks.replace('Reminder:', '').trim().split(' ');
                    const remDate = parts[0];
                    const remTime = parts[1];
                    extractedTime = remTime;
                    let isDue = CRMUtils.isCallDue(remDate, remTime);
                    
                    if (isDue) {
                        const badgeTxt = CRMUtils.getDueBadgeText(remDate, remTime);
                        reminderHtml = `<br><span class="badge bg-danger mt-1"><i class="fa-solid fa-bell me-1"></i> ${badgeTxt}</span><br><small class="text-danger fw-bold">${lead.Remarks}</small>`;
                        phoneColorClass = 'text-danger';
                        phoneIconClass = 'fa-phone fa-shake fa-xl';
                    } else {
                        reminderHtml = `<br><small class="text-muted fst-italic">${lead.Remarks}</small>`;
                    }
                }
                
                let waMsg = `Hi ${lead.CustomerName || ''}, this is from Gugnani Tyres. Your fitment for ${lead.TyreSize || ''} is scheduled for ${CRMUtils.formatIsoDate(lead.ExpFitmentDate) || ''}.`;
                let waLink = CRMUtils.generateWhatsAppLink(lead.Mobile, waMsg);
                let waBtnHtml = `<a href="${waLink}" target="_blank" class="text-success ms-2" title="WhatsApp Customer"><i class="fa-brands fa-whatsapp fa-xl"></i></a>`;
                let callBtnHtml = `<div>
                      <a href="tel:${lead.Mobile}" class="${phoneColorClass} auto-due-check" data-remdate="${lead.ExpFitmentDate || ''}" data-remtime="${extractedTime || ''}" title="Call Customer" style="text-decoration: none;"><i class="fa-solid ${phoneIconClass}"></i></a>
                      ${waBtnHtml}
                  </div>`;
                
                let timeHtml = extractedTime ? `<br><small class="text-muted">${CRMUtils.formatIsoTime(extractedTime)}</small>` : '';
                
                schTable.row.add([
                    `<b>${CRMUtils.formatIsoDate(lead.ExpFitmentDate) || 'Not Set'}</b>${timeHtml}`,
                    `Lead ID: <b>${lead.LeadID}</b><br>${lead.CustomerName} <br><small><a href="tel:${lead.Mobile}" class="text-decoration-none text-muted fw-bold"><i class="fa-solid fa-phone text-muted me-1"></i>${lead.Mobile}</a></small>${reminderHtml}`,
                    `${lead.TyreSize || '-'} (Qty: ${lead.Quantity || '-'})`,
                    callBtnHtml,
                    reservedBadge,
                    lead.AssignedBranch,
                    `
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-info text-white" onclick="window.openLeadDetailsModal('${lead.LeadID}')" title="Open Lead Details"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn btn-sm btn-success" onclick="window.schOpenActionModal('completed', '${lead.LeadID}')" title="Complete"><i class="fa-solid fa-check"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="window.schOpenActionModal('lost', '${lead.LeadID}')" title="Mark Lost"><i class="fa-solid fa-xmark"></i></button>
                        <button class="btn btn-sm btn-primary" onclick="window.openScheduleModal('${lead.LeadID}')" title="Edit Schedule"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-sm btn-warning" onclick="window.revertSchedule('${lead.LeadID}')" title="Revert to Follow-up"><i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                    `
                ]);
        });
        schTable.draw();
        
        // Render Calendar
        renderCalendar(leads);
    });
}

let calendarInstance = null;
function renderCalendar(leads) {
    if (typeof FullCalendar === 'undefined') return;
    
    // Group leads by date for summary badges
    const dateSummary = {};
    leads.forEach(lead => {
        let fDate = String(lead.ExpFitmentDate || '').trim();
        let yyyymmdd = new Date().toISOString().split('T')[0]; // fallback to today
        
        if (lead.Status === 'Completed' && lead.UpdatedAt) {
            // If it's completed, group it by the day it was actually completed!
            yyyymmdd = String(lead.UpdatedAt).split('T')[0];
        } else if (fDate && fDate.includes('/')) {
            const parts = fDate.split('/');
            if (parts.length === 3) {
                yyyymmdd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        } else if (fDate && fDate.includes('-') && fDate.split('-')[0].length === 4) {
            yyyymmdd = fDate.split('T')[0];
        }
        
        let cleanDate = yyyymmdd;
        lead.cleanDate = cleanDate; // cache it for later
        
        if (!dateSummary[cleanDate]) {
            dateSummary[cleanDate] = { total: 0, completed: 0, pending: 0 };
        }
        dateSummary[cleanDate].total++;
        if (lead.Status === 'Completed') {
            dateSummary[cleanDate].completed++;
        } else {
            dateSummary[cleanDate].pending++;
        }
    });
    
    // Build actual events for Week and Day Views!
    const calendarEvents = [];
    leads.forEach(lead => {
        let timeStr = '10:00:00'; // Default to 10 AM if no time found
        
        if (lead.Status === 'Completed' && lead.UpdatedAt) {
            // For completed leads, use the EXACT time it was marked completed (converted to local time)
            let d = new Date(lead.UpdatedAt);
            if (!isNaN(d.getTime())) {
                let hours = String(d.getHours()).padStart(2, '0');
                let mins = String(d.getMinutes()).padStart(2, '0');
                let secs = String(d.getSeconds()).padStart(2, '0');
                timeStr = `${hours}:${mins}:${secs}`;
            }
        } else if (lead.Remarks && lead.Remarks.includes('Reminder:')) {
            const parts = lead.Remarks.substring(lead.Remarks.indexOf('Reminder:')).replace('Reminder:', '').trim().split(' ');
            if (parts.length > 1) {
                let fTime = parts[1];
                if (fTime.length === 5) fTime += ':00'; // HH:MM to HH:MM:SS
                if (/^\d{2}:\d{2}:\d{2}$/.test(fTime)) {
                    timeStr = fTime;
                }
            }
        }
        
        calendarEvents.push({
            title: lead.CustomerName + ' (' + lead.Status + ')',
            start: lead.cleanDate + 'T' + timeStr,
            color: lead.Status === 'Completed' ? '#28a745' : '#dc3545',
            extendedProps: { leadId: lead.LeadID }
        });
    });
    
    if (calendarInstance) {
        calendarInstance.destroy();
    }
    
    const calendarEl = document.getElementById('calendar');
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: '100%',
        fixedWeekCount: false, // Don't force 6 weeks if month only has 5
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: calendarEvents,
        eventDidMount: function(arg) {
            // Hide individual event blocks on the Month view, 
            // since we already built custom summary squares for Month view!
            if (arg.view.type === 'dayGridMonth') {
                arg.el.style.display = 'none';
            }
        },
        eventClick: function(arg) {
            // Open the global lead details modal for this specific customer
            if (window.openLeadDetailsModal) {
                window.openLeadDetailsModal(arg.event.extendedProps.leadId);
            }
        },
        dayCellDidMount: function(arg) {
            let tzoffset = (new Date()).getTimezoneOffset() * 60000;
            let localISOTime = (new Date(arg.date.getTime() - tzoffset)).toISOString().split('T')[0];
            
            // Expose leads globally for the click handler
            window.currentCalendarLeads = leads;
            
            let summary = dateSummary[localISOTime];
            if (summary) {
                // Use absolute positioning so it takes ZERO physical height in the DOM!
                // This guarantees the calendar rows will never stretch based on content.
                let html = `
                <div onclick="window.openDaySummaryModal('${localISOTime}')" class="w-100 text-center" style="position: absolute; top: 25px; left: 0; right: 0; font-size: 0.85rem; z-index: 10; cursor: pointer;">
                    <div class="fw-bold text-primary mb-1" title="Total Scheduled"><i class="fa-solid fa-list-ol"></i> Total: ${summary.total}</div>
                    <div class="fw-bold text-success mb-1" title="Completed"><i class="fa-solid fa-check"></i> Done: ${summary.completed}</div>
                    <div class="fw-bold text-danger" title="Pending"><i class="fa-solid fa-clock"></i> Pending: ${summary.pending}</div>
                </div>`;
                const topEl = arg.el.querySelector('.fc-daygrid-day-top');
                if(topEl) topEl.insertAdjacentHTML('afterend', html);
            }
            
            // Make the whole cell click open the modal too
            arg.el.style.cursor = 'pointer';
            arg.el.style.position = 'relative'; // Ensure absolute positioning works
            arg.el.onclick = function(e) {
                window.openDaySummaryModal(localISOTime);
            };
        }
    });
    
    const calCont = document.getElementById('calendarContainer');
    let isCalendarVisible = !calCont.classList.contains('d-none');
    
    // Always render to build the instance, FullCalendar 6 can handle hidden rendering better if we updateSize later
    calendarInstance.render();
    window.calendarRendered = true;
}

window.openDaySummaryModal = function(dateStr) {
    try {
        const leadsList = window.currentCalendarLeads || [];
        const dayLeads = leadsList.filter(l => l.cleanDate === dateStr);
        
        const modalEl = document.getElementById('daySummaryModal');
        if (!modalEl) {
            console.error('Modal element not found!');
            return;
        }
        
        let displayDate = dateStr;
        if (dateStr && dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        document.getElementById('dsDateTitle').textContent = displayDate;
        const listEl = document.getElementById('dsLeadList');
        listEl.innerHTML = '';
        
        if (dayLeads.length === 0) {
            listEl.innerHTML = '<li class="list-group-item text-center text-muted py-4">No fitments scheduled for this day.</li>';
        } else {
            dayLeads.forEach(lead => {
                const isCompleted = lead.Status === 'Completed';
                const badgeClass = isCompleted ? 'bg-success' : 'bg-danger';
                
                let timeStr = '';
                if (lead.Remarks && lead.Remarks.includes('Reminder:')) {
                    const parts = lead.Remarks.replace('Reminder:', '').trim().split(' ');
                    if (parts.length > 1) {
                        // Safe time formatting fallback
                        let fTime = parts[1];
                        try { fTime = CRMUtils.formatIsoTime(parts[1]); } catch(e){}
                        timeStr = `<div class="text-muted small"><i class="fa-regular fa-clock me-1"></i>${fTime}</div>`;
                    }
                }
                
                listEl.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                        <div>
                            <div class="fw-bold fs-6">${lead.CustomerName || 'Unknown Customer'} <span class="badge ${badgeClass} ms-2">${lead.Status}</span></div>
                            <div class="text-muted small">${lead.TyreSize || ''} • ${lead.Mobile || ''}</div>
                            ${timeStr}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-info text-white" onclick="bootstrap.Modal.getInstance(document.getElementById('daySummaryModal')).hide(); window.openLeadDetailsModal('${lead.LeadID}')" title="View/Edit Details">
                                <i class="fa-solid fa-eye me-1"></i>View Details
                            </button>
                        </div>
                    </li>
                `;
            });
        }
        
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch (e) {
        console.error("Modal Error:", e);
        alert("Failed to open summary: " + e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnTable = document.getElementById('btnTableView');
    const btnCal = document.getElementById('btnCalendarView');
    const tableCont = document.getElementById('tableContainer');
    const calCont = document.getElementById('calendarContainer');
    
    if(btnTable && btnCal) {
        btnTable.addEventListener('click', () => {
            btnTable.classList.add('active');
            btnCal.classList.remove('active');
            tableCont.classList.remove('d-none');
            calCont.classList.add('d-none');
        });
        btnCal.addEventListener('click', () => {
            btnCal.classList.add('active');
            btnTable.classList.remove('active');
            calCont.classList.remove('d-none');
            tableCont.classList.add('d-none');
            
            // Force FullCalendar to recalculate its grid sizes now that it is visible
            if (calendarInstance) {
                setTimeout(() => {
                    calendarInstance.updateSize();
                    window.dispatchEvent(new Event('resize'));
                }, 100);
            }
        });
    }
});

async function openScheduleModal(leadId) {
    try {
        // 1. Instantly open the modal so the user doesn't see a blank loading screen
        const modalEl = document.getElementById('scheduleModal');
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        
        // Reset form slightly before data arrives to prevent showing old data
        document.getElementById('schLeadId').value = leadId;
        document.getElementById('schSize').value = 'Loading...';
        document.getElementById('schQty').value = '...';
        
        // Schedule date cannot be in the past
        document.getElementById('schDate').setAttribute('min', CRMUtils.getLocalDateISO());
        
        modal.show();

        // 2. Fetch the data silently (pass false to hide the global full-screen loader)
        const res = await API.call('getLeadDetails', { leadId: leadId }, false);
        const lead = res.lead;
        const sch = res.schedule || {};
        
        document.getElementById('schSize').value = sch.TyreSize || lead.TyreSize || '';
        document.getElementById('schQty').value = sch.Quantity || lead.Quantity || '';
        
        // Format date to YYYY-MM-DD for the input[type=date]
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
        
        // Format time to HH:MM for input[type=time]
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
        
        // Populate branches
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
        
        // Modal is already shown at the beginning, so we don't need to show it again here
        // modal.show();
        
    } catch(e) {
        Swal.fire('Error', e.message, 'error').then(()=> window.location.href='schedule.html');
    }
}

let scheduleEventsInitialized = false;
window.initScheduleFormEvents = function() {
    if (scheduleEventsInitialized) return;
    scheduleEventsInitialized = true;
    
    document.getElementById('btnSaveSchedule').addEventListener('click', async () => {
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
            
            const res = await API.call('scheduleFitment', payload);
            const msg = res.rescheduled ? 'Fitment rescheduled successfully!' : 'Fitment scheduled successfully!';
            Swal.fire('Success', msg, 'success');
            bootstrap.Modal.getInstance(document.getElementById('scheduleModal')).hide();
            loadScheduleData();
            
            // Remove ID from URL so refresh doesn't reopen modal
            window.history.replaceState({}, document.title, "schedule.html");
            
        } catch(e) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            CRMUtils.setButtonLoading(btn, false);
        }
    });
    
    // Complete Actions
    const btnComplete = document.getElementById('btnSubmitComplete');
    if(btnComplete) {
        btnComplete.addEventListener('click', async () => {
            const btn = document.getElementById('btnSubmitComplete');
            CRMUtils.setButtonLoading(btn, true);
            try {
                const payload = {
                    LeadID: schCurrentLeadId,
                    CompDate: document.getElementById('compDate').value,
                    InvoiceNo: document.getElementById('compInvoice').value,
                    Remarks: document.getElementById('compRemarks').value
                };
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
                loadScheduleData(); // Refresh tables
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                CRMUtils.setButtonLoading(btn, false);
            }
        });
    }

    // Lost Actions
    const btnLost = document.getElementById('btnSubmitLost');
    if(btnLost) {
        btnLost.addEventListener('click', async () => {
            const btn = document.getElementById('btnSubmitLost');
            CRMUtils.setButtonLoading(btn, true);
            try {
                const form = document.getElementById('lostForm');
                if(!form.checkValidity()) { form.reportValidity(); return; }
                
                const payload = {
                    LeadID: schCurrentLeadId,
                    LostReason: document.getElementById('lostReason').value,
                    Remarks: document.getElementById('lostRemarks').value
                };
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
                loadScheduleData();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                CRMUtils.setButtonLoading(btn, false);
            }
        });
    }
    
    // Revert Actions
    const btnRevert = document.getElementById('btnSubmitRevert');
    if(btnRevert) {
        btnRevert.addEventListener('click', async () => {
            const btn = document.getElementById('btnSubmitRevert');
            CRMUtils.setButtonLoading(btn, true);
            try {
                const reason = document.getElementById('revertReason').value;
                if(!reason) return Swal.fire('Required', 'Please enter a reason for reverting.', 'warning');
                
                const payload = {
                    LeadID: schCurrentLeadId,
                    Reason: reason,
                    RemDate: document.getElementById('revertDate').value,
                    RemTime: document.getElementById('revertTime').value
                };
                await API.call('revertSchedule', payload);
                Swal.fire({ icon: 'success', title: 'Reverted', text: 'Lead reverted to Follow-up.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                bootstrap.Modal.getInstance(document.getElementById('revertModal')).hide();
                loadScheduleData();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            } finally {
                if(btn) CRMUtils.setButtonLoading(btn, false);
            }
        });
    }
}

  window.schOpenActionModal = function(action, leadId) {
      const user = Auth.getUser();
      if(user.Role === 'Reception') {
          Swal.fire('Denied', 'Reception cannot close leads.', 'error');
          return;
      }
      // Close any open Bootstrap modals (e.g. Lead Details) before opening Swal
      document.querySelectorAll('.modal.show').forEach(m => {
          const instance = bootstrap.Modal.getInstance(m);
          if (instance) instance.hide();
      });

      if (action === 'completed') {
          Swal.fire({
              title: 'Mark as Completed',
              html: `
                  <div class="mb-3 text-start">
                      <label class="form-label fw-bold">Completion Date <span class="text-danger">*</span></label>
                      <input type="date" id="swalCompDate" class="form-control" value="${CRMUtils.getLocalDateISO()}" required>
                  </div>
                  <div class="mb-3 text-start">
                      <label class="form-label fw-bold">Invoice Number (Optional)</label>
                      <input type="text" id="swalCompInvoice" class="form-control" placeholder="Invoice #">
                  </div>
                  <div class="mb-3 text-start">
                      <label class="form-label fw-bold">Remarks</label>
                      <textarea id="swalCompRemarks" class="form-control" rows="2" placeholder="Any remarks..."></textarea>
                  </div>
              `,
              showCancelButton: true,
              confirmButtonText: '<i class="fa-solid fa-check"></i> Confirm Completion',
              confirmButtonColor: '#198754',
              cancelButtonText: 'Cancel',
              preConfirm: () => {
                  const date = document.getElementById('swalCompDate').value;
                  if (!date) {
                      Swal.showValidationMessage('Completion date is required');
                      return false;
                  }
                  return {
                      compDate: date,
                      invoiceNo: document.getElementById('swalCompInvoice').value,
                      remarks: document.getElementById('swalCompRemarks').value
                  };
              }
          }).then(async (result) => {
              if (result.isConfirmed) {
                  try {
                      await API.call('markCompleted', {
                          LeadID: leadId,
                          CompDate: result.value.compDate,
                          InvoiceNo: result.value.invoiceNo,
                          Remarks: result.value.remarks
                      });
                      Swal.fire({ icon: 'success', title: 'Completed!', text: 'Lead marked as completed.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                      loadScheduleData();
                  } catch(e) {
                      Swal.fire('Error', e.message, 'error');
                  }
              }
          });

      } else if (action === 'lost') {
          Swal.fire({
              title: 'Mark as Lost',
              html: `
                  <div class="mb-3 text-start">
                      <label class="form-label fw-bold">Lost Reason <span class="text-danger">*</span></label>
                      <select id="swalLostReason" class="form-select">
                          <option value="">Select Reason</option>
                          <option value="Purchased Elsewhere">Purchased Elsewhere</option>
                          <option value="Price High">Price High</option>
                          <option value="Out Of Stock">Out Of Stock</option>
                          <option value="Vehicle Sold">Vehicle Sold</option>
                          <option value="Wrong Number">Wrong Number</option>
                          <option value="Duplicate">Duplicate</option>
                          <option value="No Requirement">No Requirement</option>
                          <option value="Other">Other</option>
                      </select>
                  </div>
                  <div class="mb-3 text-start">
                      <label class="form-label fw-bold">Remarks</label>
                      <textarea id="swalLostRemarks" class="form-control" rows="2" placeholder="Any remarks..."></textarea>
                  </div>
              `,
              showCancelButton: true,
              confirmButtonText: '<i class="fa-solid fa-xmark"></i> Mark as Lost',
              confirmButtonColor: '#dc3545',
              cancelButtonText: 'Cancel',
              preConfirm: () => {
                  const reason = document.getElementById('swalLostReason').value;
                  if (!reason) {
                      Swal.showValidationMessage('Please select a reason');
                      return false;
                  }
                  return {
                      reason: reason,
                      remarks: document.getElementById('swalLostRemarks').value
                  };
              }
          }).then(async (result) => {
              if (result.isConfirmed) {
                  try {
                      await API.call('markLost', {
                          LeadID: leadId,
                          Reason: result.value.reason,
                          Remarks: result.value.remarks
                      });
                      Swal.fire({ icon: 'success', title: 'Marked Lost', text: 'Lead marked as lost.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                      loadScheduleData();
                  } catch(e) {
                      Swal.fire('Error', e.message, 'error');
                  }
              }
          });
      }
  };

  window.openScheduleModal = function(leadId) {
      // Close any open Bootstrap modals before opening Swal
      document.querySelectorAll('.modal.show').forEach(m => {
          const instance = bootstrap.Modal.getInstance(m);
          if (instance) instance.hide();
      });
      const lead = window.CRMCachedLeads && window.CRMCachedLeads[leadId];
      Swal.fire({
          title: 'Edit Fitment Schedule',
          html: `
              <div class="row g-3 text-start">
                  <div class="col-6">
                      <label class="form-label fw-bold">Fitment Date <span class="text-danger">*</span></label>
                      <input type="date" id="swalSchDate" class="form-control" min="${CRMUtils.getLocalDateISO()}" value="${CRMUtils.getLocalDateISO()}" required>
                  </div>
                  <div class="col-6">
                      <label class="form-label fw-bold">Time <span class="text-danger">*</span></label>
                      <input type="time" id="swalSchTime" class="form-control" value="10:00">
                  </div>
                  <div class="col-6">
                      <label class="form-label fw-bold">Tyre Size</label>
                      <input type="text" id="swalSchSize" class="form-control" value="${lead ? (lead.TyreSize || '') : ''}">
                  </div>
                  <div class="col-6">
                      <label class="form-label fw-bold">Quantity</label>
                      <input type="number" id="swalSchQty" class="form-control" value="${lead ? (lead.Quantity || '') : ''}">
                  </div>
                  <div class="col-6">
                      <label class="form-label fw-bold">Reserved Stock?</label>
                      <select id="swalSchReserved" class="form-select">
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                      </select>
                  </div>
                  <div class="col-12">
                      <label class="form-label fw-bold">Remarks</label>
                      <textarea id="swalSchRemarks" class="form-control" rows="2"></textarea>
                  </div>
              </div>
          `,
          showCancelButton: true,
          confirmButtonText: '<i class="fa-solid fa-calendar-check"></i> Confirm Schedule',
          confirmButtonColor: '#0d6efd',
          cancelButtonText: 'Cancel',
          width: '600px',
          preConfirm: () => {
              const date = document.getElementById('swalSchDate').value;
              if (!date) {
                  Swal.showValidationMessage('Fitment date is required');
                  return false;
              }
              return {
                  date: date,
                  time: document.getElementById('swalSchTime').value,
                  size: document.getElementById('swalSchSize').value,
                  qty: document.getElementById('swalSchQty').value,
                  reserved: document.getElementById('swalSchReserved').value,
                  remarks: document.getElementById('swalSchRemarks').value
              };
          }
      }).then(async (result) => {
          if (result.isConfirmed) {
              try {
                  const res = await API.call('scheduleFitment', {
                      LeadID: leadId,
                      FitmentDate: result.value.date,
                      FitmentTime: result.value.time,
                      TyreSize: result.value.size,
                      Quantity: result.value.qty,
                      ReservedStock: result.value.reserved,
                      Remarks: result.value.remarks
                  });
                  const msg = res.rescheduled ? 'Fitment rescheduled!' : 'Fitment scheduled!';
                  Swal.fire({ icon: 'success', title: msg, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                  loadScheduleData();
              } catch(e) {
                  Swal.fire('Error', e.message, 'error');
              }
          }
      });
  };
  
  window.revertSchedule = function(leadId) {
      Swal.fire({
          title: 'Revert to Follow-up',
          html: `
              <div class="mb-3 text-start">
                  <label class="form-label">Next Follow-up Date</label>
                  <input type="date" id="swalRevDate" class="form-control" min="${CRMUtils.getLocalDateISO()}">
              </div>
              <div class="mb-3 text-start">
                  <label class="form-label">Time</label>
                  <input type="time" id="swalRevTime" class="form-control">
              </div>
              <div class="mb-3 text-start">
                  <label class="form-label">Reason <span class="text-danger">*</span></label>
                  <input type="text" id="swalRevReason" class="form-control" placeholder="Why are you reverting this?">
              </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Revert',
          preConfirm: () => {
              const reason = document.getElementById('swalRevReason').value;
              if (!reason) {
                  Swal.showValidationMessage('Reason is required');
              }
              return {
                  Date: document.getElementById('swalRevDate').value,
                  Time: document.getElementById('swalRevTime').value,
                  Reason: reason
              }
          }
      }).then(async (result) => {
          if (result.isConfirmed) {
              try {
                  let remStr = 'Reverted from Schedule: ' + result.value.Reason;
                  if (result.value.Date && result.value.Time) {
                      remStr += ` | Reminder: ${result.value.Date} ${result.value.Time}`;
                  }
                  await API.call('updateLeadStatus', {
                      LeadID: leadId,
                      Status: 'Follow Up',
                      FollowUpDate: result.value.Date,
                      FollowUpTime: result.value.Time,
                      Remarks: remStr
                  });
                  Swal.fire({ icon: 'success', title: 'Reverted', text: 'Lead reverted to Follow-up.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                  loadScheduleData(); // Refresh table and calendar
              } catch(e) {
                  Swal.fire('Error', e.message, 'error');
              }
          }
      });
  };

  // Add event listener for when the global Lead Modal marks it complete, so we refresh our calendar!
  document.addEventListener('leadUpdated', () => {
      loadScheduleData();
  });
