/**
 * Gugnani Tyres CRM - Completed Leads Analysis Logic
 */

let completedTable;
let rawCompletedData = [];

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    Layout.render("Completed Leads");

    completedTable = $('#completedTable').DataTable({
        pageLength: 25,
        ordering: true,
        order: [[1, 'desc']], // Sort by Comp Date descending
        columnDefs: [
            { orderable: false, targets: [7] }
        ]
    });

    window.refreshCurrentPageData = loadCompletedData;

    // Populate dropdowns and bind events
    await initFilterOptions();
    bindEvents();

    // Initial load
    await loadCompletedData();
});

async function initFilterOptions() {
    const user = Auth.getUser();

    // Fetch branches & employees for dropdown filters
    try {
        const [branches, employees] = await Promise.all([
            API.call('getBranches', {}, false).catch(() => []),
            API.call('getEmployees', {}, false).catch(() => [])
        ]);

        const branchSelect = document.getElementById('filterBranch');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="All">All Branches</option>';
            branches.forEach(b => {
                const name = b.BranchName || b;
                branchSelect.innerHTML += `<option value="${name}">${name}</option>`;
            });

            // If user is Branch Manager or Reception, default to their branch
            if (user && user.Role === 'Branch Manager' && user.Branches) {
                const userBranch = user.Branches.split(',')[0].trim();
                branchSelect.value = userBranch;
            }
        }

        const execSelect = document.getElementById('filterExec');
        if (execSelect) {
            execSelect.innerHTML = '<option value="All">All Executives</option>';
            employees.forEach(e => {
                const name = e.Name || e.EmployeeID || e;
                const id = e.EmployeeID || name;
                execSelect.innerHTML += `<option value="${id}">${name} (${id})</option>`;
            });
        }
    } catch (e) {
        console.warn('Failed to load filter options:', e);
    }
}

function bindEvents() {
    const periodSelect = document.getElementById('periodFilter');
    const fromGroup = document.getElementById('customDateFromGroup');
    const toGroup = document.getElementById('customDateToGroup');

    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            if (periodSelect.value === 'custom') {
                fromGroup.classList.remove('d-none');
                toGroup.classList.remove('d-none');
            } else {
                fromGroup.classList.add('d-none');
                toGroup.classList.add('d-none');
            }
            loadCompletedData();
        });
    }

    document.getElementById('btnApplyFilter')?.addEventListener('click', loadCompletedData);

    document.getElementById('btnResetFilter')?.addEventListener('click', () => {
        document.getElementById('periodFilter').value = 'this_month';
        fromGroup.classList.add('d-none');
        toGroup.classList.add('d-none');
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('filterBranch').value = 'All';
        document.getElementById('filterExec').value = 'All';
        loadCompletedData();
    });
}

function getDateRange(period) {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    let startDate = '';
    let endDate = '';

    if (period === 'today') {
        startDate = formatDate(today);
        endDate = startDate;
    } else if (period === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        startDate = formatDate(y);
        endDate = startDate;
    } else if (period === 'this_week') {
        const day = today.getDay();
        const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diffToMon));
        startDate = formatDate(monday);
        endDate = formatDate(new Date());
    } else if (period === 'this_month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = formatDate(firstDay);
        endDate = formatDate(today);
    } else if (period === 'last_month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = formatDate(firstDay);
        endDate = formatDate(lastDay);
    } else if (period === 'this_year') {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        startDate = formatDate(firstDay);
        endDate = formatDate(today);
    } else if (period === 'custom') {
        startDate = document.getElementById('dateFrom').value || '';
        endDate = document.getElementById('dateTo').value || '';
    }

    return { startDate, endDate };
}

async function loadCompletedData() {
    const period = document.getElementById('periodFilter').value;
    const { startDate, endDate } = getDateRange(period);
    const branch = document.getElementById('filterBranch').value;
    const exec = document.getElementById('filterExec').value;

    const params = {
        startDate,
        endDate,
        branch: branch === 'All' ? '' : branch,
        exec: exec === 'All' ? '' : exec
    };

    API.fetchWithCache('getCompletedLeads', params, (data) => {
        rawCompletedData = data || [];
        renderCompletedTable(rawCompletedData);
        updateKPIs(rawCompletedData);
    });
}

function renderCompletedTable(data) {
    completedTable.clear();

    const empMap = CRMUtils.getEmployeeMap ? CRMUtils.getEmployeeMap() : {};

    data.forEach(item => {
        const leadId = item.LeadID || '';
        const compDateFormatted = item.CompDate ? item.CompDate.split('-').reverse().join('-') : '-';
        const compTime = item.CompTime ? item.CompTime.substring(0, 5) : '';
        const dateDisplay = `<span class="fw-bold text-dark">${compDateFormatted}</span>${compTime ? `<br><small class="text-muted"><i class="fa-regular fa-clock me-1"></i>${compTime}</small>` : ''}`;

        const customerInfo = `
            <div class="fw-bold text-dark">${CRMUtils.escapeHtml(item.CustomerName || '-')}</div>
            <small class="text-muted"><i class="fa-solid fa-phone me-1"></i>${CRMUtils.escapeHtml(item.Mobile || '-')}</small>
        `;

        const vehicle = item.VehicleModel || item.VehicleCompany || item.VehicleType || '-';
        const tyre = item.TyreSize ? `<span class="badge bg-light text-dark border me-1">${CRMUtils.escapeHtml(item.TyreSize)}</span>` : '';
        const qty = item.Quantity ? `<span class="badge bg-secondary">Qty: ${item.Quantity}</span>` : '';
        const reqDisplay = `
            <div class="small fw-semibold text-dark mb-1"><i class="fa-solid fa-car me-1 text-muted"></i>${CRMUtils.escapeHtml(vehicle)}</div>
            <div>${tyre}${qty}</div>
        `;

        const invoiceDisplay = item.InvoiceNo
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1"><i class="fa-solid fa-receipt me-1"></i>${CRMUtils.escapeHtml(item.InvoiceNo)}</span>`
            : `<span class="badge bg-light text-muted border">N/A</span>`;

        const execName = empMap[item.AssignedExec] || item.AssignedExec || '-';
        const branchName = item.CompletedBranch || item.AssignedBranch || '-';
        const branchExecDisplay = `
            <div class="small fw-bold text-dark">${CRMUtils.escapeHtml(branchName)}</div>
            <small class="text-muted"><i class="fa-solid fa-user-tie me-1"></i>${CRMUtils.escapeHtml(execName)}</small>
        `;

        const remarksDisplay = item.CompRemarks || item.Remarks
            ? `<small class="text-muted">${CRMUtils.escapeHtml(item.CompRemarks || item.Remarks)}</small>`
            : `<small class="text-muted fs-7">-</small>`;

        const actionBtn = `
            <div class="text-center">
                <button class="btn btn-sm btn-outline-primary rounded-circle" onclick="window.openLeadDetailsModal('${leadId}')" title="View Lead Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
        `;

        completedTable.row.add([
            `<a href="#" onclick="window.openLeadDetailsModal('${leadId}'); return false;" class="fw-bold text-primary">${leadId}</a>`,
            dateDisplay,
            customerInfo,
            reqDisplay,
            invoiceDisplay,
            branchExecDisplay,
            remarksDisplay,
            actionBtn
        ]);
    });

    completedTable.draw();
}

function updateKPIs(data) {
    const totalCompleted = data.length;
    let totalQty = 0;
    let invoiceCount = 0;
    const branchSet = new Set();

    data.forEach(item => {
        const q = parseInt(item.Quantity, 10);
        if (!isNaN(q)) totalQty += q;
        if (item.InvoiceNo && item.InvoiceNo.trim()) invoiceCount++;
        const branch = item.CompletedBranch || item.AssignedBranch;
        if (branch) branchSet.add(branch);
    });

    document.getElementById('kpiTotalCompleted').innerText = totalCompleted.toLocaleString();
    document.getElementById('kpiTotalQuantity').innerText = totalQty.toLocaleString();
    document.getElementById('kpiTotalInvoices').innerText = invoiceCount.toLocaleString();
    document.getElementById('kpiActiveBranches').innerText = branchSet.size.toLocaleString();
}

window.exportCompletedCSV = function() {
    if (!rawCompletedData || rawCompletedData.length === 0) {
        Swal.fire('No Data', 'There are no completed leads to export for the selected filter.', 'warning');
        return;
    }

    const empMap = CRMUtils.getEmployeeMap ? CRMUtils.getEmployeeMap() : {};

    const headers = [
        "Lead ID", "Completion Date", "Completion Time", "Customer Name", "Mobile",
        "Vehicle Type", "Vehicle Model", "Vehicle Number", "Tyre Size", "Quantity",
        "Invoice Number", "Branch", "Executive", "Remarks"
    ];

    const rows = rawCompletedData.map(item => [
        `"${item.LeadID || ''}"`,
        `"${item.CompDate || ''}"`,
        `"${item.CompTime || ''}"`,
        `"${(item.CustomerName || '').replace(/"/g, '""')}"`,
        `"${item.Mobile || ''}"`,
        `"${item.VehicleType || ''}"`,
        `"${(item.VehicleModel || '').replace(/"/g, '""')}"`,
        `"${item.VehicleNumber || ''}"`,
        `"${item.TyreSize || ''}"`,
        `"${item.Quantity || ''}"`,
        `"${item.InvoiceNo || ''}"`,
        `"${item.CompletedBranch || item.AssignedBranch || ''}"`,
        `"${empMap[item.AssignedExec] || item.AssignedExec || ''}"`,
        `"${(item.CompRemarks || item.Remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const period = document.getElementById('periodFilter').value;
    link.setAttribute("download", `Completed_Leads_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
