/**
 * Gugnani Tyres CRM - Global Lead Form Logic
 */

let currentDuplicateId = null;
let currentEditLeadId = null;
let leadFormEventsInitialized = false;
let wasDetailsModalOpen = false;

window.initLeadFormEvents = function() {
    if (leadFormEventsInitialized) return;
    
    document.getElementById('vehicleType').addEventListener('change', function() {
        if(this.value === 'Other') {
            document.getElementById('divOtherVehicleType').style.display = 'block';
        } else {
            document.getElementById('divOtherVehicleType').style.display = 'none';
        }
    });
    
    document.getElementById('chkAltMobile').addEventListener('change', function() {
        document.getElementById('divAltMobile').style.display = this.checked ? 'block' : 'none';
        if (!this.checked) document.getElementById('altMobile').value = '';
    });
    
    document.getElementById('chkWhatsappSame').addEventListener('change', function() {
        document.getElementById('divWhatsapp').style.display = this.checked ? 'none' : 'block';
        if (this.checked) document.getElementById('whatsapp').value = '';
    });
    
    document.getElementById('btnCheckDuplicate').addEventListener('click', async () => {
        const mobile = document.getElementById('mobile').value;
        const vehNo = document.getElementById('vehicleNumber').value;
        if(!mobile && !vehNo) {
            Swal.fire('Notice', 'Enter Mobile or Vehicle Number to check.', 'info');
            return;
        }
        await checkDuplicate(mobile, vehNo);
    });
    
    const btnSaveLead = document.getElementById('btnSaveLead');
    if(btnSaveLead) btnSaveLead.addEventListener('click', saveLead);
    
    const btnCreateDuplicate = document.getElementById('btnCreateDuplicate');
    if(btnCreateDuplicate) {
        btnCreateDuplicate.addEventListener('click', () => {
            const dupModal = bootstrap.Modal.getInstance(document.getElementById('duplicateModal'));
            if(dupModal) dupModal.hide();
            submitLeadData(); // force submit
        });
    }
    
    const btnOpenExisting = document.getElementById('btnOpenExisting');
    if(btnOpenExisting) {
        btnOpenExisting.addEventListener('click', () => {
            if(currentDuplicateId) {
                const dupModal = bootstrap.Modal.getInstance(document.getElementById('duplicateModal'));
                if(dupModal) dupModal.hide();
                
                const currentModal = bootstrap.Modal.getInstance(document.getElementById('leadModal'));
                if(currentModal) currentModal.hide();
                
                window.openLeadDetailsModal(currentDuplicateId);
            }
        });
    }
    
    document.getElementById('leadModal').addEventListener('hidden.bs.modal', function () {
        if (currentEditLeadId) {
            const detailModal = document.getElementById('leadDetailsModal');
            if (wasDetailsModalOpen && detailModal && !detailModal.classList.contains('show')) {
                window.openLeadDetailsModal(currentEditLeadId);
            }
            currentEditLeadId = null;
            wasDetailsModalOpen = false;
        }
    });
    
    leadFormEventsInitialized = true;
};

window.showLeadForm = function(leadId = null) {
    if (!leadId) wasDetailsModalOpen = false;
    currentEditLeadId = typeof leadId === 'string' ? leadId : null;

    document.getElementById('leadForm').reset();
    document.getElementById('divOtherVehicleType').style.display = 'none';
    document.getElementById('divAltMobile').style.display = 'none';
    document.getElementById('divWhatsapp').style.display = 'none';

    document.getElementById('leadModalTitle').innerHTML = currentEditLeadId ? 'Edit Lead Details' : 'Create New Lead';

    API.fetchWithCache('getLeadInitialData', {}, (initialData) => {
        const checkTomSelect = () => {
            if (typeof TomSelect !== 'undefined') {
                initTomSelects(initialData);
                populateLeadForm();
                
                const modal = new bootstrap.Modal(document.getElementById('leadModal'));
                modal.show();
            } else {
                console.log("Waiting for TomSelect to load...");
                setTimeout(checkTomSelect, 50);
            }
        };
        checkTomSelect();
    });
};

function initTomSelects(data) {
    const user = Auth.getUser();
    
    // Assigned Exec
    const execEl = document.getElementById('assignedExec');
    if(execEl) {
        if(execEl.tomselect) execEl.tomselect.destroy();
        let execs = data.employees || [];
        if (user.Role !== 'Super Admin' && user.Role !== 'Branch Manager') {
            execs = execs.filter(e => e.EmployeeID === user.EmployeeID);
        }
        new TomSelect(execEl, {
            create: false,
            valueField: 'EmployeeID',
            labelField: 'Name',
            searchField: 'Name',
            options: execs,
            placeholder: 'Select Executive...',
            plugins: ['dropdown_input']
        });
    }

    // Assigned Branch
    const branchEl = document.getElementById('assignedBranch');
    if(branchEl) {
        if(branchEl.tomselect) branchEl.tomselect.destroy();
        let branches = data.branches || [];
        if (user.Role !== 'Super Admin') {
            const allowed = user.Branches ? user.Branches.split(',').map(b=>b.trim()) : [];
            branches = branches.filter(b => allowed.includes(b.BranchName));
        }
        new TomSelect(branchEl, {
            create: false,
            valueField: 'BranchName',
            labelField: 'BranchName',
            searchField: 'BranchName',
            options: branches,
            placeholder: 'Select Branch...',
            plugins: ['dropdown_input']
        });
    }

    // Pref Brand
    const brandEl = document.getElementById('prefBrand');
    if(brandEl) {
        if(brandEl.tomselect) brandEl.tomselect.destroy();
        let brands = data.brands || [];
        let mappedBrands = brands.map(b => {
            const brandVal = b.Brand || b.brand || '';
            return brandVal ? { Brand: brandVal } : null;
        }).filter(Boolean);
        new TomSelect(brandEl, {
            create: function(input) {
                return {
                    Brand: input
                };
            },
            valueField: 'Brand',
            labelField: 'Brand',
            searchField: 'Brand',
            options: mappedBrands,
            placeholder: 'Select or add brand...',
            plugins: ['dropdown_input']
        });
    }

    // Tyre Size
    const tsEl = document.getElementById('tyreSize');
    if(tsEl) {
        if(tsEl.tomselect) tsEl.tomselect.destroy();
        let sizes = data.tyreSizes || [];
        let mappedSizes = sizes.map(s => {
            const sizeVal = s.Size || s.size || '';
            return sizeVal ? {
                Size: sizeVal,
                cleanSize: sizeVal.replace(/[^a-zA-Z0-9]/g, '')
            } : null;
        }).filter(Boolean);
        new TomSelect(tsEl, {
            create: function(input) {
                return {
                    Size: input,
                    cleanSize: input.replace(/[^a-zA-Z0-9]/g, '')
                };
            },
            valueField: 'Size',
            labelField: 'Size',
            searchField: ['Size', 'cleanSize'],
            options: mappedSizes,
            placeholder: 'Select or type size (e.g. 2356517)...',
            plugins: ['dropdown_input']
        });
    }
}

function setTomSelectValue(id, value) {
    const el = document.getElementById(id);
    if(el && el.tomselect && value) {
        // If create is true and option doesn't exist, we must add it first
        if (el.tomselect.settings.create) {
            el.tomselect.addOption({
                [el.tomselect.settings.valueField]: value,
                [el.tomselect.settings.labelField]: value
            });
        }
        el.tomselect.setValue(value);
    }
}

function populateLeadForm() {
    if (currentEditLeadId && window.CRMCachedLeads && window.CRMCachedLeads[currentEditLeadId]) {
        const lead = window.CRMCachedLeads[currentEditLeadId];
        document.getElementById('customerName').value = lead.CustomerName || '';
        document.getElementById('mobile').value = lead.Mobile || '';
        if (lead.AltMobile) {
            document.getElementById('chkAltMobile').checked = true;
            document.getElementById('divAltMobile').style.display = 'block';
            document.getElementById('altMobile').value = lead.AltMobile;
        }
        if (lead.WhatsApp && lead.WhatsApp !== lead.Mobile) {
            document.getElementById('chkWhatsappSame').checked = false;
            document.getElementById('divWhatsapp').style.display = 'block';
            document.getElementById('whatsapp').value = lead.WhatsApp;
        }
        document.getElementById('address').value = lead.Address || '';
        
        if (lead.VehicleType) {
            const vt = document.getElementById('vehicleType');
            const opts = Array.from(vt.options).map(o => o.value);
            if (opts.includes(lead.VehicleType)) {
                vt.value = lead.VehicleType;
            } else {
                vt.value = 'Other';
                document.getElementById('divOtherVehicleType').style.display = 'block';
                document.getElementById('otherVehicleType').value = lead.VehicleType;
            }
        }
        document.getElementById('vehicleCompany').value = lead.VehicleCompany || '';
        document.getElementById('vehicleModel').value = lead.VehicleModel || '';
        document.getElementById('vehicleNumber').value = lead.VehicleNumber || '';
        
        setTomSelectValue('tyreSize', lead.TyreSize);
        document.getElementById('quantity').value = lead.Quantity || '';
        document.getElementById('budget').value = lead.Budget || '';
        setTomSelectValue('prefBrand', lead.PrefBrand);
        
        document.getElementById('source').value = lead.Source || 'Walk In';
        document.getElementById('priority').value = lead.Priority || 'Medium';
        
        setTomSelectValue('assignedExec', lead.AssignedExec);
        setTomSelectValue('assignedBranch', lead.AssignedBranch);
        
        document.getElementById('expFitmentDate').value = lead.ExpFitmentDate || '';
        document.getElementById('remarks').value = lead.Remarks || '';
    } else {
        const user = Auth.getUser();
        if (user) {
            setTomSelectValue('assignedExec', user.EmployeeID);
            if (user.Branches) {
                setTomSelectValue('assignedBranch', user.Branches.split(',')[0].trim());
            }
        }
    }
}

window.editLead = function(leadId) {
    const detailModalEl = document.getElementById('leadDetailsModal');
    wasDetailsModalOpen = detailModalEl && detailModalEl.classList.contains('show');
    
    const detailModal = bootstrap.Modal.getInstance(detailModalEl);
    if (detailModal && wasDetailsModalOpen) {
        detailModal.hide();
    }
    
    window.showLeadForm(leadId);
};

async function checkDuplicate(mobile, vehNo) {
    try {
        const res = await API.call('checkDuplicateLead', { mobile, vehicleNumber: vehNo });
        if (res.hasDuplicate) {
            const dup = res.duplicates[0];
            currentDuplicateId = dup.LeadID;
            
            let html = `
                <div class="alert alert-warning">
                    <strong>Lead ID:</strong> ${dup.LeadID}<br>
                    <strong>Name:</strong> ${dup.CustomerName}<br>
                    <strong>Mobile:</strong> ${dup.Mobile}<br>
                    <strong>Vehicle:</strong> ${dup.VehicleNumber ? dup.VehicleNumber : 'N/A'} (${dup.VehicleType || 'N/A'})<br>
                    <strong>Status:</strong> ${dup.Status}<br>
                    <strong>Assigned To:</strong> ${dup.AssignedExec} (${dup.AssignedBranch})<br>
                    <strong>Created On:</strong> ${dup.Date}
                </div>
            `;
            const detailsDiv = document.getElementById('duplicateLeadInfo') || document.getElementById('duplicateDetails');
            if (detailsDiv) detailsDiv.innerHTML = html;
            
            const modal = new bootstrap.Modal(document.getElementById('duplicateModal'));
            modal.show();
            return true;
        } else {
            Swal.fire({
                title: 'Clear!',
                text: 'No duplicate found.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            return false;
        }
    } catch(e) {
        console.error(e);
        return false;
    }
}

async function saveLead() {
    const btn = document.getElementById('btnSaveLead');
    CRMUtils.setButtonLoading(btn, true);
    
    try {
        const form = document.getElementById('leadForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const mobile = document.getElementById('mobile').value;
        const vehNo = document.getElementById('vehicleNumber').value;
        
        if (currentEditLeadId) {
            await submitLeadData();
            return;
        }
        
        try {
            const res = await API.call('checkDuplicateLead', { mobile, vehicleNumber: vehNo }, true);
            if (res.hasDuplicate) {
                 const dup = res.duplicates[0];
                 currentDuplicateId = dup.LeadID;
                 
                 let html = `
                     <div class="alert alert-warning">
                         <strong>Lead ID:</strong> ${dup.LeadID}<br>
                         <strong>Name:</strong> ${dup.CustomerName}<br>
                         <strong>Mobile:</strong> ${dup.Mobile}<br>
                         <strong>Vehicle:</strong> ${dup.VehicleNumber || 'N/A'}<br>
                         <strong>Status:</strong> ${dup.Status}<br>
                         <strong>Assigned To:</strong> ${dup.AssignedExec} (${dup.AssignedBranch})
                     </div>
                 `;
                 const detailsDiv = document.getElementById('duplicateLeadInfo') || document.getElementById('duplicateDetails');
                 if(detailsDiv) detailsDiv.innerHTML = html;
                 
                 const modalEl = document.getElementById('duplicateModal');
                 if(modalEl) new bootstrap.Modal(modalEl).show();
                 return; 
            }
        } catch(e) {
            console.error(e);
        }
        
        await submitLeadData();
    } finally {
        CRMUtils.setButtonLoading(btn, false);
    }
}

async function submitLeadData() {
    const vType = document.getElementById('vehicleType').value;
    const actualVType = vType === 'Other' ? document.getElementById('otherVehicleType').value : vType;
    
    const payload = {
        CustomerName: document.getElementById('customerName').value,
        Mobile: document.getElementById('mobile').value,
        AltMobile: document.getElementById('chkAltMobile').checked ? document.getElementById('altMobile').value : '',
        WhatsApp: document.getElementById('chkWhatsappSame').checked ? document.getElementById('mobile').value : document.getElementById('whatsapp').value,
        Email: '',
        Address: document.getElementById('address').value,
        VehicleType: actualVType,
        VehicleCompany: document.getElementById('vehicleCompany').value,
        VehicleModel: document.getElementById('vehicleModel').value,
        VehicleNumber: document.getElementById('vehicleNumber').value,
        TyreSize: document.getElementById('tyreSize').value,
        Quantity: document.getElementById('quantity').value,
        Budget: document.getElementById('budget').value,
        PrefBrand: document.getElementById('prefBrand').value,
        Source: document.getElementById('source').value,
        Priority: document.getElementById('priority').value,
        AssignedExec: document.getElementById('assignedExec').value,
        AssignedBranch: document.getElementById('assignedBranch').value,
        ExpFitmentDate: document.getElementById('expFitmentDate').value,
        Remarks: document.getElementById('remarks').value
    };
    
    if (currentEditLeadId) payload.LeadID = currentEditLeadId;
    
    try {
        if (currentEditLeadId) {
            await API.call('updateLead', payload);
            Swal.fire('Success', 'Lead updated successfully', 'success');
        } else {
            await API.call('createLead', payload);
            Swal.fire('Success', 'Lead created successfully', 'success');
        }
        
        const mainModal = bootstrap.Modal.getInstance(document.getElementById('leadModal'));
        if (mainModal) mainModal.hide();
        
        // If we have a global loadLeads function on this page, call it
        if (typeof window.loadLeads === 'function') {
            window.loadLeads();
        }
        
        if (currentEditLeadId && wasDetailsModalOpen) {
            window.openLeadDetailsModal(currentEditLeadId);
        }
    } catch(e) {
        Swal.fire('Error', e.message, 'error');
    }
}

// Helpers
window.populateDropdown = function(id, data, valKey, textKey, defaultText) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = defaultText ? `<option value="">${defaultText}</option>` : '';
    data.forEach(item => {
        el.innerHTML += `<option value="${item[valKey]}">${item[textKey]}</option>`;
    });
};
window.populateDatalist = function(id, data, key) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = '';
    data.forEach(item => {
        el.innerHTML += `<option value="${item[key]}">`;
    });
};
window.populateDatalistFromArray = function(id, data) {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = '';
    data.forEach(item => {
        el.innerHTML += `<option value="${item}">`;
    });
};
