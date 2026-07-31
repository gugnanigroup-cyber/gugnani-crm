/**
 * Reports & Analytics Controller - Local Computation Version
 */

let execTable;
let execChart;
let branchTable;
let branchChart;
let exportTable;
let allLeads = [];

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireLogin();
    
    // Inject Sidebar & Topbar
    if (typeof Layout !== 'undefined') {
        Layout.render('Reports');
    }
    
    // Initialize DataTables only when the matching markup exists
    const execTableElement = document.getElementById('execTable');
    if (execTableElement) {
        execTable = $('#execTable').DataTable({
            pageLength: 25,
            dom: '<"row"<"col-md-6"B><"col-md-6"f>>rt<"row"<"col-md-6"i><"col-md-6"p>>',
            order: [[2, 'desc']] // Sort by Completed desc
        });
    }
    
    const branchTableElement = document.getElementById('branchTable');
    if (branchTableElement) {
        branchTable = $('#branchTable').DataTable({
            pageLength: 25,
            dom: '<"row"<"col-md-6"B><"col-md-6"f>>rt<"row"<"col-md-6"i><"col-md-6"p>>',
            order: [[2, 'desc']] // Sort by Completed desc
        });
    }
    
    const exportTableElement = document.getElementById('exportTable');
    if (exportTableElement) {
        exportTable = $('#exportTable').DataTable({
            pageLength: 50,
            dom: '<"row"<"col-md-6"l><"col-md-6"f>>rt<"row"<"col-md-6"i><"col-md-6"p>>',
            order: [[0, 'desc']]
        });
    }
    
    // Date Range Logic
    const execDateRange = document.getElementById('execDateRange');
    const execCustomDates = document.getElementById('execCustomDates');
    
    if (execDateRange && execCustomDates) {
        execDateRange.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                execCustomDates.classList.remove('d-none');
            } else {
                execCustomDates.classList.add('d-none');
            }
        });
    }

    const branchDateRange = document.getElementById('branchDateRange');
    const branchCustomDates = document.getElementById('branchCustomDates');
    
    if (branchDateRange && branchCustomDates) {
        branchDateRange.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                branchCustomDates.classList.remove('d-none');
            } else {
                branchCustomDates.classList.add('d-none');
            }
        });
    }

    // Generate Button
    const btnGenExecReport = document.getElementById('btnGenExecReport');
    if (btnGenExecReport) {
        btnGenExecReport.addEventListener('click', generateExecReport);
    }

    const btnGenBranchReport = document.getElementById('btnGenBranchReport');
    if (btnGenBranchReport) {
        btnGenBranchReport.addEventListener('click', generateBranchReport);
    }
    
    // Export CSV
    const btnExportAll = document.getElementById('btnExportAll');
    if (btnExportAll) {
        btnExportAll.addEventListener('click', async () => {
            try {
                API.showLoader();
                const leads = await API.call('getLeads');
                if (leads && leads.length > 0) {
                    // Convert leads to CSV format
                    const headers = Object.keys(leads[0]).join(',');
                    const rows = leads.map(l => Object.values(l).map(val => {
                        if(val === null || val === undefined) return '';
                        let str = String(val).replace(/"/g, '""');
                        return `"${str}"`;
                    }).join(',')).join('\n');
                    
                    const csvContent = headers + '\n' + rows;
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `Master_Leads_Backup_${new Date().getTime()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    Swal.fire('Info', 'No leads found to export.', 'info');
                }
                API.hideLoader();
            } catch (e) {
                API.hideLoader();
                Swal.fire('Error', e.message || 'Failed to download backup', 'error');
            }
        });
    }

    // Initial Load
    generateExecReport();
    if (branchDateRange) {
        generateBranchReport();
    }
});

window.exportReportData = function() {
    const btn = document.getElementById('btnExportAll');
    if (btn) btn.click();
};

async function generateExecReport() {
    const dateRange = document.getElementById('execDateRange').value;
    const startDate = document.getElementById('execDateFrom').value;
    const endDate = document.getElementById('execDateTo').value;
    
    if (dateRange === 'custom' && (!startDate || !endDate)) {
        Swal.fire('Error', 'Please select both Start and End dates', 'error');
        return;
    }
    
    try {
        API.showLoader();
        // Fetch all leads if we haven't already
        if (allLeads.length === 0) {
            allLeads = await API.call('getLeads');
            renderExportTable(allLeads);
        }
        API.hideLoader();
        
        const filteredLeads = filterLeadsByDate(allLeads, dateRange, startDate, endDate);
        
        renderAggregatedReport(filteredLeads);
        
    } catch (e) {
        API.hideLoader();
        Swal.fire('Error', e.message || 'Failed to generate report', 'error');
    }
}

function filterLeadsByDate(leads, rangeType, startStr, endStr) {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1); // This month start
    let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // This month end
    
    if (rangeType === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (rangeType === 'this_year') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    } else if (rangeType === 'custom') {
        startDate = new Date(startStr);
        endDate = new Date(endStr);
        endDate.setHours(23, 59, 59, 999);
    }
    
    return leads.filter(lead => {
        if (!lead.Date) return false;
        
        let leadDate;
        // The API returns Date string, possibly like "2026-07-23" or similar
        // Let's try parsing directly
        let cleanDateStr = lead.Date;
        if (cleanDateStr.includes('/')) {
            // DD/MM/YYYY
            const parts = cleanDateStr.split('/');
            leadDate = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            // YYYY-MM-DD
            const parts = cleanDateStr.split('T')[0].split('-');
            leadDate = new Date(parts[0], parts[1] - 1, parts[2]);
        }
        
        return leadDate >= startDate && leadDate <= endDate;
    });
}

function renderAggregatedReport(leads) {
    // 1. Compute Metrics
    let totalLeads = leads.length;
    let completed = 0;
    let lost = 0;
    
    const execMap = {}; // { ExecName: { total, completed, lost, pending } }
    
    leads.forEach(lead => {
        const status = lead.Status;
        const execName = lead.AssignedExec || 'Unassigned';
        
        if (status === 'Completed') completed++;
        if (status === 'Lost') lost++;
        
        if (!execMap[execName]) {
            execMap[execName] = { total: 0, completed: 0, lost: 0, pending: 0 };
        }
        
        execMap[execName].total++;
        if (status === 'Completed') execMap[execName].completed++;
        else if (status === 'Lost') execMap[execName].lost++;
        else execMap[execName].pending++;
    });
    
    const conversion = totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0;
    
    // 2. Update KPI DOM
    document.getElementById('kpiTotal').textContent = totalLeads;
    document.getElementById('kpiCompleted').textContent = completed;
    document.getElementById('kpiLost').textContent = lost;
    document.getElementById('kpiRate').textContent = conversion + '%';
    
    // 3. Update Table
    execTable.clear();
    
    const execDataArr = [];
    
    for (const [execName, stats] of Object.entries(execMap)) {
        const convRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        const convBadge = convRate >= 30 ? 'bg-success' : (convRate >= 15 ? 'bg-warning' : 'bg-danger');
        
        execDataArr.push({
            name: execName,
            completed: stats.completed
        });
        
        execTable.row.add([
            `<strong>${execName}</strong>`,
            stats.total,
            stats.completed,
            stats.lost,
            stats.pending,
            `<span class="badge ${convBadge}">${convRate}%</span>`
        ]);
    }
    execTable.draw();
    
    // 4. Update Chart
    updateChart(execDataArr);
}

function updateChart(execDataArr) {
    const donutCtx = document.getElementById('execChart').getContext('2d');
    if (execChart) execChart.destroy();
    
    // Sort by most completed
    execDataArr.sort((a, b) => b.completed - a.completed);
    
    let dLabels = [];
    let dData = [];
    let dColors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
    
    let otherSum = 0;
    execDataArr.forEach((d, i) => {
        if (i < 5) {
            dLabels.push(d.name);
            dData.push(d.completed);
        } else {
            otherSum += d.completed;
        }
    });
    
    if (otherSum > 0) {
        dLabels.push('Others');
        dData.push(otherSum);
    }
    
    // If absolutely no completed leads, show empty
    if (dData.reduce((a, b) => a + b, 0) === 0) {
        dLabels = ['No Data'];
        dData = [1];
        dColors = ['#e9ecef'];
    }
    
    execChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: dLabels,
            datasets: [{
                data: dData,
                backgroundColor: dColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            }
        }
    });
}

async function generateBranchReport() {
    const branchDateRange = document.getElementById('branchDateRange');
    const branchTableElement = document.getElementById('branchTable');
    const branchChartElement = document.getElementById('branchChart');

    if (!branchDateRange || !branchTableElement || !branchChartElement) {
        return;
    }

    const dateRange = branchDateRange.value;
    const startDate = document.getElementById('branchDateFrom').value;
    const endDate = document.getElementById('branchDateTo').value;
    
    if (dateRange === 'custom' && (!startDate || !endDate)) {
        Swal.fire('Error', 'Please select both Start and End dates', 'error');
        return;
    }
    
    try {
        API.showLoader();
        // Fetch all leads if we haven't already
        if (allLeads.length === 0) {
            allLeads = await API.call('getLeads');
            renderExportTable(allLeads);
        }
        API.hideLoader();
        
        const filteredLeads = filterLeadsByDate(allLeads, dateRange, startDate, endDate);
        
        renderAggregatedBranchReport(filteredLeads);
        
    } catch (e) {
        API.hideLoader();
        Swal.fire('Error', e.message || 'Failed to generate branch report', 'error');
    }
}

function renderAggregatedBranchReport(leads) {
    if (!branchTable || !document.getElementById('branchChart')) {
        return;
    }

    // 1. Compute Metrics
    let totalLeads = leads.length;
    let completed = 0;
    let lost = 0;
    
    const branchMap = {}; // { BranchName: { total, completed, lost, pending } }
    
    leads.forEach(lead => {
        const status = lead.Status;
        const branchName = lead.AssignedBranch || 'Unassigned';
        
        if (status === 'Completed') completed++;
        if (status === 'Lost') lost++;
        
        if (!branchMap[branchName]) {
            branchMap[branchName] = { total: 0, completed: 0, lost: 0, pending: 0 };
        }
        
        branchMap[branchName].total++;
        if (status === 'Completed') branchMap[branchName].completed++;
        else if (status === 'Lost') branchMap[branchName].lost++;
        else branchMap[branchName].pending++;
    });
    
    const conversion = totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0;
    
    // 2. Update KPI DOM
    document.getElementById('kpiBranchTotal').textContent = totalLeads;
    document.getElementById('kpiBranchCompleted').textContent = completed;
    document.getElementById('kpiBranchLost').textContent = lost;
    document.getElementById('kpiBranchRate').textContent = conversion + '%';
    
    // 3. Update Table
    branchTable.clear();
    
    const branchDataArr = [];
    
    for (const [branchName, stats] of Object.entries(branchMap)) {
        const convRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        const convBadge = convRate >= 30 ? 'bg-success' : (convRate >= 15 ? 'bg-warning' : 'bg-danger');
        
        branchDataArr.push({
            name: branchName,
            completed: stats.completed
        });
        
        branchTable.row.add([
            `<strong>${branchName}</strong>`,
            stats.total,
            stats.completed,
            stats.lost,
            stats.pending,
            `<span class="badge ${convBadge}">${convRate}%</span>`
        ]);
    }
    
    branchTable.draw();
    
    // 4. Render Chart
    // Sort branches by completed for the chart, take top 5, bucket rest into "Other"
    branchDataArr.sort((a, b) => b.completed - a.completed);
    
    let chartLabels = [];
    let chartData = [];
    let chartColors = ['#0d6efd', '#20c997', '#ffc107', '#fd7e14', '#0dcaf0', '#adb5bd'];
    
    if (branchDataArr.length === 0 || completed === 0) {
        chartLabels = ['No Data'];
        chartData = [1];
        chartColors = ['#e9ecef'];
    } else {
        let top5 = branchDataArr.slice(0, 5);
        let otherCompleted = branchDataArr.slice(5).reduce((sum, item) => sum + item.completed, 0);
        
        top5.forEach(item => {
            if (item.completed > 0) {
                chartLabels.push(item.name);
                chartData.push(item.completed);
            }
        });
        
        if (otherCompleted > 0) {
            chartLabels.push('Other');
            chartData.push(otherCompleted);
        }
    }
    
    if (branchChart) {
        branchChart.destroy();
    }
    
    const ctx = document.getElementById('branchChart').getContext('2d');
    branchChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            }
        }
    });
}

function renderExportTable(leads) {
    if (!exportTable) return;
    exportTable.clear();
    
    leads.forEach(lead => {
        const badgeClass = lead.Status === 'Completed' ? 'bg-success' : 
                          (lead.Status === 'Lost' ? 'bg-danger' : 
                          (lead.Status === 'Scheduled' ? 'bg-warning text-dark' : 'bg-primary'));
                          
        exportTable.row.add([
            `<strong>${lead.LeadID || '-'}</strong>`,
            lead.Date ? String(lead.Date).split('T')[0] : '-',
            lead.CustomerName || '-',
            lead.Mobile || '-',
            lead.AssignedBranch || 'Unassigned',
            lead.AssignedExec || 'Unassigned',
            `<span class="badge ${badgeClass}">${lead.Status || 'Open'}</span>`
        ]);
    });
    
    exportTable.draw();
}

