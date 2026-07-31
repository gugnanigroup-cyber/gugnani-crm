/**
 * Gugnani Tyres CRM - Branch Logic
 */

let branchTable;
let rawBranches = [];

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    if(!Auth.requireRole(['Super Admin', 'Branch Manager'])) return;
    
    Layout.render("Branches");
    
    branchTable = $('#branchTable').DataTable({
        pageLength: 25,
        dom: '<"row"<"col-md-6"l><"col-md-6"f>>rt<"row"<"col-md-6"i><"col-md-6"p>>'
    });
    
    await loadBranches();
    
    document.getElementById('btnSaveBranch').addEventListener('click', async () => {
        const btn = document.getElementById('btnSaveBranch');
        CRMUtils.setButtonLoading(btn, true);
        try {
            const form = document.getElementById('branchForm');
            if(!form.checkValidity()) {
                form.reportValidity(); 
                return;
            }
            
            const branchId = document.getElementById('branchId').value;
            const payload = {
                BranchName: document.getElementById('branchName').value,
                Phone: document.getElementById('branchPhone').value,
                Address: document.getElementById('branchAddress').value,
                Manager: document.getElementById('branchManager').value,
                Status: document.getElementById('branchStatus').value
            };
            
            if (branchId) {
                payload.BranchID = branchId;
            }
            
            try {
                const action = branchId ? 'updateBranch' : 'createBranch';
                await API.call(action, payload);
                Swal.fire('Success', branchId ? 'Branch updated.' : 'Branch created.', 'success');
                bootstrap.Modal.getInstance(document.getElementById('branchModal')).hide();
                loadBranches();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        } finally {
            CRMUtils.setButtonLoading(btn, false);
        }
    });
});

function loadBranches() {
    API.fetchWithCache('getBranches', {}, (branches) => {
        rawBranches = branches;
        branchTable.clear();
        
        branches.forEach(b => {
            const statusBadge = b.Status === 'Inactive' ? '<span class="badge bg-danger">Inactive</span>' : '<span class="badge bg-success">Active</span>';
            branchTable.row.add([
                `<strong>${b.BranchID || '-'}</strong>`,
                b.BranchName || '-',
                b.Address || '-',
                b.Phone || '-',
                b.Manager || '-',
                statusBadge,
                `<button class="btn btn-sm btn-outline-primary" onclick="editBranch('${b.BranchID}')"><i class="fa-solid fa-pen"></i> Edit</button>`
            ]);
        });
        
        branchTable.draw();
    });
}

function showBranchModal() {
    document.getElementById('branchForm').reset();
    document.getElementById('branchId').value = '';
    new bootstrap.Modal(document.getElementById('branchModal')).show();
}

function editBranch(id) {
    const branch = rawBranches.find(b => b.BranchID === id);
    if (!branch) return;
    
    document.getElementById('branchId').value = branch.BranchID;
    document.getElementById('branchName').value = branch.BranchName;
    document.getElementById('branchPhone').value = branch.Phone;
    document.getElementById('branchManager').value = branch.Manager;
    document.getElementById('branchAddress').value = branch.Address;
    document.getElementById('branchStatus').value = branch.Status;
    
    new bootstrap.Modal(document.getElementById('branchModal')).show();
}
