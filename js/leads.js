/**
 * Gugnani Tyres CRM - Lead Management Logic
 */

let leadsTable;

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    Layout.render("Leads");
    
    // Initialize DataTable
    leadsTable = $('#leadsTable').DataTable({
        pageLength: 25,
        ordering: false, // Custom sorting applied via backend/query usually
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Global Search..."
        }
    });
    
    setupEventListeners();
    window.refreshCurrentPageData = loadLeads;
    await loadInitialData();
    
    // Check if we came from dashboard with a specific filter
    const urlParams = new URLSearchParams(window.location.search);
    const statusFilter = urlParams.get('status');
    if (statusFilter) {
        document.getElementById('filterStatus').value = statusFilter;
        loadLeads();
    }
    
    // Check if we came from another page trying to edit a lead
    const autoEditId = sessionStorage.getItem('autoEditLead');
    if (autoEditId) {
        sessionStorage.removeItem('autoEditLead');
        // Wait a tiny bit for the table and master data to finish rendering
        setTimeout(() => window.editLead(autoEditId), 500); 
    }
});

function loadInitialData() {
    // 1. Kick off Lead loading immediately (Don't wait for master data)
    loadLeads();
    
    // 2. Load Master Data in parallel to speed things up using SWR cache
    API.fetchWithCache('getLeadInitialData', {}, (initialData) => {
        try {
            const user = Auth.getUser();
            
            const branches = initialData.branches || [];
            const employees = initialData.employees || [];
            const tyreSizes = initialData.tyreSizes || [];
            
            // Populate Branches
            if (user.Role === 'Super Admin') {
                CRMUtils.populateSelect('filterBranch', branches, 'BranchName', 'BranchName', 'All Branches');
            }        
            // Note: Lead form fields are now populated dynamically by lead-form.jsmpanies);
            
        } catch (error) {
            console.error("Error loading master data dropdowns", error);
        }
    });
}

async function loadLeads() {
    const filters = {
        status: document.getElementById('filterStatus').value,
        branch: document.getElementById('filterBranch') ? document.getElementById('filterBranch').value : null
    };
    
    API.fetchWithCache('getLeads', filters, (leads) => {
        window.CRMCachedLeads = window.CRMCachedLeads || {};
        leadsTable.clear();
        
        const kanbanCols = { 'Open': '', 'Scheduled': '', 'Completed': '', 'Lost': '' };
        const counts = { 'Open': 0, 'Scheduled': 0, 'Completed': 0, 'Lost': 0 };
        
        leads.forEach(lead => {
            window.CRMCachedLeads[lead.LeadID] = lead;
            
            let statusBadge = '';
            switch(lead.Status) {
                case 'Open': statusBadge = '<span class="status-badge status-open">OPEN</span>'; break;
                case 'Scheduled': statusBadge = '<span class="status-badge status-scheduled">SCHEDULED</span>'; break;
                case 'Completed': statusBadge = '<span class="status-badge status-completed">COMPLETED</span>'; break;
                case 'Lost': statusBadge = '<span class="status-badge status-lost">LOST</span>'; break;
            }
            
            let vehStr = lead.VehicleCompany ? `${lead.VehicleCompany} ${lead.VehicleModel}` : lead.VehicleType;
            let reqStr = lead.TyreSize ? `${lead.TyreSize} (Qty: ${lead.Quantity})` : '-';
            
            let dStr = String(lead.Date || '-');
            if (dStr.includes('T')) dStr = new Date(dStr).toLocaleDateString('en-GB');
            
            let tStr = String(lead.Time || '-');
            if (tStr.includes('T')) tStr = new Date(tStr).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
            
            let temp = lead.Temperature || (lead.Priority === 'High' ? 'Hot' : (lead.Priority === 'Low' ? 'Cold' : 'Warm'));
            let tempIcon = '';
            if (temp === 'Hot') tempIcon = '<i class="fa-solid fa-fire text-danger ms-2" style="font-size: 1.1rem;" title="Hot"></i>';
            else if (temp === 'Warm') tempIcon = '<i class="fa-solid fa-temperature-half text-warning ms-2" style="font-size: 1.1rem;" title="Warm"></i>';
            else if (temp === 'Cold') tempIcon = '<i class="fa-solid fa-snowflake text-info ms-2" style="font-size: 1.1rem;" title="Cold"></i>';
            
            leadsTable.row.add([
                `<b>${lead.LeadID}</b>`,
                `${dStr}<br><small class="text-muted">${tStr}</small>`,
                `<span class="fw-medium">${lead.CustomerName}</span><br>
                 <small><i class="fa-solid fa-phone text-muted me-1"></i> <a href="tel:${lead.Mobile}" class="text-decoration-none text-dark fw-bold">${lead.Mobile}</a></small>`,
                `${vehStr}<br><small class="text-muted">${lead.VehicleNumber}</small>`,
                reqStr,
                `<div class="d-flex align-items-center">${statusBadge}${tempIcon}</div>`,
                `<div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary text-nowrap" onclick="window.openLeadDetailsModal('${lead.LeadID}')">View / Follow-up</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.editLead('${lead.LeadID}')" title="Edit Lead"><i class="fa-solid fa-pen-to-square"></i></button>
                </div>`
            ]);
            
            // Build Kanban Card
            if (counts[lead.Status] !== undefined) counts[lead.Status]++;
            let cardHtml = `
            <div class="kanban-card p-2 mb-2">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="kanban-card-title">${lead.CustomerName}</span>
                    ${tempIcon}
                </div>
                <div class="kanban-card-subtitle mb-1"><i class="fa-solid fa-phone me-1"></i><a href="tel:${lead.Mobile}" class="text-decoration-none text-dark fw-bold">${lead.Mobile}</a></div>
                <div class="kanban-card-text mb-1">
                    <i class="fa-solid fa-car me-1 text-muted"></i>${vehStr} 
                    <small class="text-muted ms-1">${lead.VehicleNumber}</small>
                </div>
                <div class="kanban-card-text mb-2">
                    <i class="fa-solid fa-circle-check me-1 text-muted"></i>${reqStr}
                </div>
                <div class="kanban-card-footer">
                    <span>${dStr}</span>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="window.openLeadDetailsModal('${lead.LeadID}')" title="View"><i class="fa-regular fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="window.editLead('${lead.LeadID}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    </div>
                </div>
            </div>`;
            
            if (kanbanCols[lead.Status] !== undefined) {
                kanbanCols[lead.Status] += cardHtml;
            }
        });
        
        leadsTable.draw();
        
        // Rebuild Kanban Board
        let boardHtml = '';
        const statuses = [
            { id: 'Open', label: 'New / Open', class: 'open' },
            { id: 'Scheduled', label: 'Processing', class: 'scheduled' },
            { id: 'Completed', label: 'Completed', class: 'completed' },
            { id: 'Lost', label: 'Lost / Cancelled', class: 'lost' }
        ];
        statuses.forEach(s => {
            boardHtml += `
            <div class="kanban-column me-3" data-col-status="${s.id}">
                <div class="kanban-header kanban-header-${s.class} p-2 d-flex justify-content-between align-items-center" onclick="window.filterKanbanColumn('${s.id}')" title="Click to focus this column">
                    <span>${s.label}</span>
                    <span class="badge bg-light text-dark rounded-pill">${counts[s.id]}</span>
                </div>
                <div class="kanban-body p-2 custom-scrollbar">
                    ${kanbanCols[s.id]}
                </div>
            </div>`;
        });
        
        const boardEl = document.querySelector('.kanban-board');
        if (boardEl) boardEl.innerHTML = boardHtml;
    });
}

function setupEventListeners() {
    document.getElementById('btnApplyFilters').addEventListener('click', loadLeads);
    document.getElementById('btnResetFilters').addEventListener('click', () => {
        document.getElementById('filterStatus').value = '';
        if(document.getElementById('filterBranch')) document.getElementById('filterBranch').value = '';
        loadLeads();
    });
    
    // View Toggle Logic
    const toggleRadios = document.querySelectorAll('input[name="viewToggle"]');
    toggleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                const view = e.target.value;
                localStorage.setItem('crm_lead_view', view);
                toggleView(view);
            }
        });
    });
    
    // Set initial view
    const savedView = localStorage.getItem('crm_lead_view') || 'list';
    if (savedView === 'grid') {
        const gridRadio = document.getElementById('gridViewToggle');
        if (gridRadio) {
            gridRadio.checked = true;
            toggleView('grid');
        }
    }
}

function toggleView(view) {
    if (view === 'grid') {
        document.getElementById('tableViewContainer').classList.add('d-none');
        document.getElementById('kanbanViewContainer').classList.remove('d-none');
    } else {
        document.getElementById('kanbanViewContainer').classList.add('d-none');
        document.getElementById('tableViewContainer').classList.remove('d-none');
    }
}

function viewLead(leadId) {
    window.openLeadDetailsModal(leadId);
}

window.filterKanbanColumn = function(statusId) {
    const allCols = document.querySelectorAll('.kanban-column');
    const targetCol = document.querySelector(`.kanban-column[data-col-status="${statusId}"]`);
    const isFocused = targetCol.classList.contains('focused');
    
    if (isFocused) {
        // Un-focus: show all columns
        allCols.forEach(col => {
            col.classList.remove('d-none', 'focused');
        });
    } else {
        // Focus: hide others, expand target
        allCols.forEach(col => {
            if (col.getAttribute('data-col-status') === statusId) {
                col.classList.remove('d-none');
                col.classList.add('focused');
            } else {
                col.classList.add('d-none');
                col.classList.remove('focused');
            }
        });
    }
}
