/**
 * Gugnani Tyres CRM - Lead Details Modal Logic
 */

let lmCurrentLeadId = null;
let lmCurrentLeadStatus = null;
let lmDataChanged = false;

// Opens the modal and loads the lead details
window.openLeadDetailsModal = async function(leadId) {
    lmCurrentLeadId = leadId;
    
    // Show modal immediately
    const modalEl = document.getElementById('leadDetailsModal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    
    document.getElementById('lmLeadTitle').textContent = `Lead: ${leadId}`;
    let cachedLead = window.CRMCachedLeads && window.CRMCachedLeads[leadId];
    if (cachedLead) {
        lmCurrentLeadStatus = cachedLead.Status;
        lmRenderLeadInfo(cachedLead);
    } else {
        document.getElementById('lmLeadInfoContainer').innerHTML = `<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>`;
    }
    
    document.getElementById('lmTimelineContainer').innerHTML = '';
    
    modal.show();
    
    modal.show();
    
    try {
        const res = await API.call('getLeadDetails', { leadId: leadId }, false);
        const lead = res.lead;
        const followups = res.followups;
        
        window.CRMCachedLeads = window.CRMCachedLeads || {};
        window.CRMCachedLeads[leadId] = lead;
        lmCurrentLeadStatus = lead.Status;
        
        lmRenderLeadInfo(lead);
        
        // Render Timeline
        lmRenderTimeline(followups, lead);
        
        // Reset form date constraint
        document.getElementById('lmRemDate').setAttribute('min', CRMUtils.getLocalDateISO());
        
    } catch(e) {
        document.getElementById('lmLeadInfoContainer').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
};

function lmRenderLeadInfo(lead) {
    let badge = '';
    if(lead.Status === 'Completed') badge = '<span class="badge bg-success">COMPLETED</span>';
    else if(lead.Status === 'Lost') badge = '<span class="badge bg-danger">LOST</span>';
    else if(lead.Status === 'Scheduled') badge = '<span class="badge bg-warning text-dark">SCHEDULED</span>';
    else badge = '<span class="badge bg-primary">OPEN</span>';
    
    let tempIcon = '';
    if (lead.Priority) {
        let temp = lead.Temperature || (lead.Priority === 'High' ? 'Hot' : (lead.Priority === 'Low' ? 'Cold' : 'Warm'));
        if (temp === 'Hot') tempIcon = '<i class="fa-solid fa-fire text-danger ms-2 fs-5" title="Hot"></i>';
        else if (temp === 'Warm') tempIcon = '<i class="fa-solid fa-temperature-half text-warning ms-2 fs-5" title="Warm"></i>';
        else if (temp === 'Cold') tempIcon = '<i class="fa-solid fa-snowflake text-info ms-2 fs-5" title="Cold"></i>';
    }
    
    const user = Auth.getUser();
    let canEdit = false;
    if (user) {
        if (user.Role === 'Super Admin') canEdit = true;
        else if (user.Role === 'Sales Executive' && lead.AssignedExec === user.EmployeeID) canEdit = true;
        else if ((user.Role === 'Branch Manager' || user.Role === 'Reception') && user.Branches && user.Branches.includes(lead.AssignedBranch)) canEdit = true;
    }
    
    const editBtn = canEdit ? `<button class="btn btn-sm btn-link text-primary ms-2 p-0" onclick="window.triggerEditLead('${lead.LeadID}')" title="Edit Lead"><i class="fa-solid fa-pen-to-square"></i></button>` : '';

    document.getElementById('lmLeadInfoContainer').innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <span class="fs-5 fw-bold">
                ${lead.CustomerName}
                ${editBtn}
            </span>
            <div class="d-flex align-items-center">
                ${badge}
                ${tempIcon}
            </div>
        </div>
        <div class="mb-2"><i class="fa-solid fa-mobile-screen text-muted me-2"></i> <a href="tel:${lead.Mobile}" class="text-decoration-none text-dark fw-bold">${lead.Mobile}</a> ${lead.AltMobile ? ' / <a href="tel:'+lead.AltMobile+'" class="text-decoration-none text-dark fw-bold">'+lead.AltMobile+'</a>' : ''}</div>
        <div class="mb-2"><i class="fa-brands fa-whatsapp text-success me-2"></i> ${lead.WhatsApp ? '<a href="javascript:void(0)" onclick="CRMUtils.openWhatsApp(\''+lead.WhatsApp+'\')" class="text-decoration-none text-dark fw-bold">'+lead.WhatsApp+'</a>' : '-'}</div>
        <div class="mb-2"><i class="fa-solid fa-car text-muted me-2"></i> ${lead.VehicleCompany || ''} ${lead.VehicleModel || ''} (${lead.VehicleNumber || '-'})</div>
        <div class="mb-2"><i class="fa-solid fa-circle-dot text-muted me-2"></i> ${lead.TyreSize || '-'} (Qty: ${lead.Quantity || '-'})</div>
        <div class="mb-2"><i class="fa-solid fa-location-dot text-muted me-2"></i> ${lead.Address || '-'}</div>
        <div class="mb-2"><i class="fa-solid fa-user-tie text-muted me-2"></i> Exec: ${lead.AssignedExec || '-'} (${lead.AssignedBranch || '-'})</div>
        <div class="mt-3 p-3 bg-light rounded text-muted small"><b>Initial Remarks:</b><br> ${lead.Remarks || '-'}</div>
    `;
    
    if(lead.Status === 'Completed' || lead.Status === 'Lost') {
        document.getElementById('lmAddFollowupForm').classList.add('d-none');
        document.getElementById('lmAddFollowupForm').classList.remove('d-flex');
        document.getElementById('lmTopActionButtons').classList.add('d-none');
        document.getElementById('lmTopActionButtons').classList.remove('d-flex');
        document.getElementById('lmBottomActionButtons').classList.add('d-none');
    } else {
        document.getElementById('lmAddFollowupForm').classList.remove('d-none');
        document.getElementById('lmAddFollowupForm').classList.add('d-flex');
        document.getElementById('lmTopActionButtons').classList.remove('d-none');
        document.getElementById('lmTopActionButtons').classList.add('d-flex');
        document.getElementById('lmBottomActionButtons').classList.remove('d-none');
    }
}

function lmRenderTimeline(followups, lead) {
    const container = document.getElementById('lmTimelineContainer');
    container.innerHTML = '';
    
    if (followups.length === 0) {
        container.innerHTML = '<div class="text-muted fst-italic">No follow-ups recorded yet.</div>';
    } else {
        followups.forEach(f => {
            let html = `
                <div class="timeline-item">
                    <div class="timeline-icon"></div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="fw-bold text-dark">${f.Exec}</span>
                        <small class="text-muted">${CRMUtils.formatIsoDate(f.Date)} ${CRMUtils.formatIsoTime(f.Time)}</small>
                    </div>
                    <p class="mb-2 text-secondary">${f.Discussion}</p>
            `;
            if (f.Feedback) {
                html += `<div class="badge bg-light text-dark border mb-2"><i class="fa-regular fa-comment-dots"></i> ${f.Feedback}</div><br>`;
            }
            if (f.RemDate) {
                html += `<small class="text-primary fw-medium"><i class="fa-regular fa-calendar me-1"></i> Reminder set: ${CRMUtils.formatIsoDate(f.RemDate)} ${CRMUtils.formatIsoTime(f.RemTime)}</small>`;
            }
            html += `</div>`;
            container.innerHTML += html;
        });
    }
    
    // Add lead creation event at bottom
    container.innerHTML += `
        <div class="timeline-item" style="opacity: 0.7;">
            <div class="timeline-icon" style="background:#6c757d; box-shadow: 0 0 0 2px #6c757d;"></div>
            <div class="d-flex justify-content-between mb-1">
                <span class="fw-bold text-dark">Lead Created</span>
                <small class="text-muted">${CRMUtils.formatIsoDate(lead.Date)}</small>
            </div>
            <p class="mb-0 text-secondary">Lead entered into system.</p>
        </div>
    `;
}



window.lmOpenActionModal = function(action) {
    const modal = new bootstrap.Modal(document.getElementById('lmActionModal'));
    
    if(action === 'completed') {
        document.getElementById('lmActionModalTitle').textContent = 'Mark as Completed';
        document.getElementById('lmCompleteForm').classList.remove('hidden');
        document.getElementById('lmLostForm').classList.add('hidden');
        document.getElementById('lmCompDate').value = CRMUtils.getLocalDateISO();
    } else {
        document.getElementById('lmActionModalTitle').textContent = 'Mark as Lost';
        document.getElementById('lmCompleteForm').classList.add('hidden');
        document.getElementById('lmLostForm').classList.remove('hidden');
    }
    modal.show();
};

window.lmOpenScheduleModal = function() {
    if (lmCurrentLeadStatus === 'Scheduled') {
        Swal.fire({
            title: 'Already Scheduled',
            text: 'This lead is already scheduled for fitment. Are you sure you want to reschedule it?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reschedule',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                _openSchModal();
            }
        });
    } else {
        _openSchModal();
    }
};

function _openSchModal() {
    document.getElementById('lmSchDate').value = CRMUtils.getLocalDateISO();
    document.getElementById('lmSchDate').setAttribute('min', CRMUtils.getLocalDateISO());
    
    // Prefill Tyre Size and Quantity if they exist
    if (lmCurrentLeadId && window.CRMCachedLeads && window.CRMCachedLeads[lmCurrentLeadId]) {
        const lead = window.CRMCachedLeads[lmCurrentLeadId];
        document.getElementById('lmSchSize').value = lead.TyreSize || '';
        document.getElementById('lmSchQty').value = lead.Quantity || '';
    } else {
        document.getElementById('lmSchSize').value = '';
        document.getElementById('lmSchQty').value = '';
    }
    
    // Attempt to load branches if admin
    const user = Auth.getUser();
    if(user && user.Role === 'Super Admin') {
        API.call('getBranches', {}, false).then(branches => {
            const el = document.getElementById('lmSchBranch');
            if(el) {
                el.innerHTML = '<option value="">Select Branch</option>';
                branches.forEach(b => el.innerHTML += `<option value="${b.BranchName}">${b.BranchName}</option>`);
            }
        });
    }
    
    new bootstrap.Modal(document.getElementById('lmScheduleModal')).show();
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('submit', async (e) => {
        // ... previous handler ...
        if (e.target && e.target.id === 'lmAddFollowupForm') {
            e.preventDefault();
            const payload = {
                LeadID: lmCurrentLeadId,
                Discussion: document.getElementById('lmDiscussion').value,
                Feedback: document.getElementById('lmFeedback').value,
                RemDate: document.getElementById('lmRemDate').value,
                RemTime: document.getElementById('lmRemTime').value,
                Status: 'Follow-up'
            };
            
            try {
                const btn = e.target.querySelector('button[type="submit"]');
                const origText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                btn.disabled = true;
                
                await API.call('addFollowUp', payload);
                e.target.reset();
                lmDataChanged = true; 
                
                btn.innerHTML = origText;
                btn.disabled = false;
                
                sessionStorage.clear();
                
                Swal.fire({icon: 'success', title: 'Saved', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000});
                
                const modalEl = document.getElementById('leadDetailsModal');
                bootstrap.Modal.getInstance(modalEl).hide();
            } catch(err) {
                Swal.fire('Error', err.message, 'error');
                e.target.querySelector('button[type="submit"]').disabled = false;
            }
        }
        
        // Handle Complete Form
        if (e.target && e.target.id === 'lmCompleteForm') {
            e.preventDefault();
            const payload = {
                LeadID: lmCurrentLeadId,
                CompDate: document.getElementById('lmCompDate').value,
                InvoiceNo: document.getElementById('lmCompInvoice').value,
                Remarks: document.getElementById('lmCompRemarks').value
            };
            try {
                const btn = e.target.querySelector('button[type="submit"]');
                btn.disabled = true;
                await API.call('markCompleted', payload);
                Swal.fire('Success', 'Lead marked as completed!', 'success').then(() => CRMUtils.refreshPageData());
            } catch(err) {
                Swal.fire('Error', err.message, 'error');
                e.target.querySelector('button[type="submit"]').disabled = false;
            }
        }
        
        // Handle Lost Form
        if (e.target && e.target.id === 'lmLostForm') {
            e.preventDefault();
            const payload = {
                LeadID: lmCurrentLeadId,
                Reason: document.getElementById('lmLostReason').value,
                Remarks: document.getElementById('lmLostRemarks').value
            };
            try {
                const btn = e.target.querySelector('button[type="submit"]');
                btn.disabled = true;
                await API.call('markLost', payload);
                Swal.fire('Success', 'Lead marked as lost.', 'success').then(() => CRMUtils.refreshPageData());
            } catch(err) {
                Swal.fire('Error', err.message, 'error');
                e.target.querySelector('button[type="submit"]').disabled = false;
            }
        }
        
        // Handle Schedule Form
        if (e.target && e.target.id === 'lmScheduleForm') {
            e.preventDefault();
            const payload = {
                LeadID: lmCurrentLeadId,
                FitmentDate: document.getElementById('lmSchDate').value,
                FitmentTime: document.getElementById('lmSchTime').value,
                TyreSize: document.getElementById('lmSchSize').value,
                Quantity: document.getElementById('lmSchQty').value,
                ReservedStock: document.getElementById('lmSchReserved').value,
                AssignedBranch: document.getElementById('lmSchBranch') ? document.getElementById('lmSchBranch').value : ''
            };
            try {
                const btn = e.target.querySelector('button[type="submit"]');
                btn.disabled = true;
                const res = await API.call('scheduleFitment', payload);
                const msg = res.rescheduled ? 'Fitment rescheduled successfully!' : 'Fitment scheduled successfully!';
                Swal.fire('Success', msg, 'success').then(() => CRMUtils.refreshPageData());
            } catch(err) {
                Swal.fire('Error', err.message, 'error');
                e.target.querySelector('button[type="submit"]').disabled = false;
            }
        }
    });
});

window.triggerEditLead = function(leadId) {
    if (typeof window.editLead === 'function') {
        window.editLead(leadId);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const autoOpenId = sessionStorage.getItem('autoOpenLeadDetails');
    if (autoOpenId) {
        sessionStorage.removeItem('autoOpenLeadDetails');
        setTimeout(() => window.openLeadDetailsModal(autoOpenId), 500); 
    }
});

