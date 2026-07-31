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
        // Fetch all leads if we haven't already just for export table
        if (allLeads.length === 0) {
            allLeads = await API.call('getLeads');
            renderExportTable(allLeads);
        }
        
        const payload = {
            reportType: 'executive',
            dateRange: dateRange,
            startDate: startDate,
            endDate: endDate
        };
        
        const reportData = await API.call('getAdvancedReport', payload);
        API.hideLoader();
        
        renderAggregatedReport(reportData.aggregated);
        
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

function renderAggregatedReport(aggregated) {
    // 1. Compute Metrics
    let totalLeads = 0;
    let completed = 0;
    let lost = 0;
    
    aggregated.forEach(stat => {
        totalLeads += stat.total;
        completed += stat.completed;
        lost += stat.lost;
    });
    
    const conversion = totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0;
    
    // 2. Update KPI DOM
    document.getElementById('kpiTotal').textContent = totalLeads;
    document.getElementById('kpiCompleted').textContent = completed;
    document.getElementById('kpiRate').textContent = conversion + '%';
    document.getElementById('kpiLost').textContent = lost;
    
    // 3. Populate Table
    if (!execTable) return;
    execTable.clear();
    
    const execDataArr = [];
    
    aggregated.forEach(stats => {
        const convRate = stats.conversion;
        const convBadge = convRate >= 30 ? 'bg-success' : (convRate >= 15 ? 'bg-warning' : 'bg-danger');
        
        execDataArr.push({
            name: stats.label,
            completed: stats.completed
        });
        
        execTable.row.add([
            `<strong>${stats.label}</strong>`,
            stats.total,
            stats.completed,
            stats.lost,
            stats.open + stats.scheduled,
            stats.followupsDone || 0,
            stats.fitmentsDone || 0,
            `<span class="badge ${convBadge}">${convRate}%</span>`
        ]);
    });
    execTable.draw();
    
    // 4. Update Chart
    updateChart(execDataArr, 'execChart', execChart);
}

function updateChart(execDataArr, chartId, chartInstance) {
    const donutCtx = document.getElementById(chartId).getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
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
    
    const newChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: dLabels,
            datasets: [{
                data: dData,
                backgroundColor: dColors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 8,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        boxWidth: 12, 
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 13 }
                    } 
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleFont: { family: "'Inter', sans-serif", size: 14 },
                    bodyFont: { family: "'Inter', sans-serif", size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            }
        }
    });
    if (chartId === 'execChart') execChart = newChart;
    else if (chartId === 'branchChart') branchChart = newChart;
}

async function generateBranchReport() {
    const dateRange = document.getElementById('branchDateRange').value;
    const startDate = document.getElementById('branchDateFrom').value;
    const endDate = document.getElementById('branchDateTo').value;
    
    if (dateRange === 'custom' && (!startDate || !endDate)) {
        Swal.fire('Error', 'Please select both Start and End dates', 'error');
        return;
    }
    
    try {
        API.showLoader();
        const payload = {
            reportType: 'branch',
            dateRange: dateRange,
            startDate: startDate,
            endDate: endDate
        };
        
        const reportData = await API.call('getAdvancedReport', payload);
        API.hideLoader();
        
        renderAggregatedBranchReport(reportData.aggregated);
        
    } catch (e) {
        API.hideLoader();
        Swal.fire('Error', e.message || 'Failed to generate branch report', 'error');
    }
}

function renderAggregatedBranchReport(aggregated) {
    // 1. Compute Metrics
    let totalLeads = 0;
    let completed = 0;
    let lost = 0;
    
    aggregated.forEach(stat => {
        totalLeads += stat.total;
        completed += stat.completed;
        lost += stat.lost;
    });
    
    const conversion = totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0;
    
    // 2. Update KPI DOM
    document.getElementById('kpiBranchTotal').textContent = totalLeads;
    document.getElementById('kpiBranchCompleted').textContent = completed;
    document.getElementById('kpiBranchRate').textContent = conversion + '%';
    document.getElementById('kpiBranchLost').textContent = lost;
    
    // 3. Populate Table
    if (!branchTable) return;
    branchTable.clear();
    
    const branchDataArr = [];
    
    aggregated.forEach(stats => {
        const convRate = stats.conversion;
        const convBadge = convRate >= 30 ? 'bg-success' : (convRate >= 15 ? 'bg-warning' : 'bg-danger');
        
        branchDataArr.push({
            name: stats.label,
            completed: stats.completed
        });
        
        branchTable.row.add([
            `<strong>${stats.label}</strong>`,
            stats.total,
            stats.completed,
            stats.lost,
            stats.open + stats.scheduled,
            stats.followupsDone || 0,
            stats.fitmentsDone || 0,
            `<span class="badge ${convBadge}">${convRate}%</span>`
        ]);
    });
    branchTable.draw();
    
    // 4. Update Chart
    updateChart(branchDataArr, 'branchChart', branchChart);
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

