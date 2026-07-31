/**
 * Gugnani Tyres CRM - Employee Logic
 */

let empTable;
let rawEmployees = [];

document.addEventListener('DOMContentLoaded', async () => {
    Auth.requireLogin();
    if(!Auth.requireRole(['Super Admin', 'Branch Manager'])) return;
    
    Layout.render("Employees");
    
    empTable = $('#employeesTable').DataTable({
        pageLength: 25
    });
    
    loadInitialData();
    setupEventListeners();
});

function loadInitialData() {
    API.fetchWithCache('getBranches', {}, (branches) => {
        const container = document.getElementById('branchCheckboxes');
        container.innerHTML = '';
        branches.forEach(b => {
            container.innerHTML += `
                <div class="form-check form-check-inline me-4 mb-2">
                  <input class="form-check-input branch-cb" type="checkbox" id="cb_${b.BranchID}" value="${b.BranchName}">
                  <label class="form-check-label" for="cb_${b.BranchID}">${b.BranchName}</label>
                </div>
            `;
        });
        
        loadEmployees();
    });
}

function loadEmployees() {
    API.fetchWithCache('getEmployees', {}, (employees) => {
        rawEmployees = employees;
        empTable.clear();
        
        rawEmployees.forEach(e => {
            let status = e.Status === 'Active' ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>';
            let branches = e.Role === 'Super Admin' ? 'All' : (e.Branches || 'None');
            
            empTable.row.add([
                e.EmployeeID,
                `<div class="fw-bold">${e.Name}</div>`,
                `${e.Mobile}<br><small class="text-muted">${e.Email||''}</small>`,
                e.Role,
                branches,
                status,
                `<button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${e.EmployeeID}')"><i class="fa-solid fa-pen"></i> Edit</button>`
            ]);
        });
        
        empTable.draw();
    });
}

function showEmployeeModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('empId').value = '';
    document.getElementById('empModalTitle').innerText = 'Create Employee';
    document.getElementById('empPassword').required = true;
    document.getElementById('pwdHelp').style.display = 'none';
    
    // Clear checks
    document.querySelectorAll('.branch-cb').forEach(cb => cb.checked = false);
    document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);
    
    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
}

function editEmployee(id) {
    const emp = rawEmployees.find(e => e.EmployeeID === id);
    if(!emp) return;
    
    document.getElementById('empId').value = emp.EmployeeID;
    document.getElementById('empName').value = emp.Name;
    document.getElementById('empMobile').value = emp.Mobile;
    document.getElementById('empEmail').value = emp.Email;
    document.getElementById('empRole').value = emp.Role;
    document.getElementById('empStatus').value = emp.Status;
    
    document.getElementById('empPassword').required = false;
    document.getElementById('empPassword').value = '';
    document.getElementById('pwdHelp').style.display = 'block';
    
    // Set checks
    document.querySelectorAll('.branch-cb').forEach(cb => cb.checked = false);
    if(emp.Branches) {
        const brArr = emp.Branches.split(',').map(b=>b.trim());
        document.querySelectorAll('.branch-cb').forEach(cb => {
            if(brArr.includes(cb.value)) cb.checked = true;
        });
    }
    
    document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);
    if(emp.Permissions) {
        const pArr = emp.Permissions.split(',').map(p=>p.trim());
        document.querySelectorAll('.perm-cb').forEach(cb => {
            if(pArr.includes(cb.value)) cb.checked = true;
        });
    }
    
    toggleBranchAssign(emp.Role);
    
    document.getElementById('empModalTitle').innerText = 'Edit Employee';
    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
}

function setupEventListeners() {
    document.getElementById('btnSaveEmployee').addEventListener('click', async () => {
        const btn = document.getElementById('btnSaveEmployee');
        CRMUtils.setButtonLoading(btn, true);
        try {
            const form = document.getElementById('employeeForm');
            if(!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Get branches
            const role = document.getElementById('empRole').value;
            let branches = [];
            if(role !== 'Super Admin') {
                document.querySelectorAll('.branch-cb:checked').forEach(cb => {
                    branches.push(cb.value);
                });
                if(branches.length === 0) {
                    Swal.fire('Required', 'Please assign at least one branch.', 'warning');
                    return;
                }
            }
            
            // Get permissions
            let permissions = [];
            document.querySelectorAll('.perm-cb:checked').forEach(cb => {
                permissions.push(cb.value);
            });
            
            const payload = {
                EmployeeID: document.getElementById('empId').value,
                Name: document.getElementById('empName').value,
                Mobile: document.getElementById('empMobile').value,
                Email: document.getElementById('empEmail').value,
                Password: document.getElementById('empPassword').value,
                Role: role,
                Status: document.getElementById('empStatus').value,
                Branches: branches.join(', '),
                Permissions: permissions.join(',')
            };
            
            const action = payload.EmployeeID ? 'updateEmployee' : 'createEmployee';
            
            try {
                await API.call(action, payload);
                Swal.fire('Success', 'Employee saved successfully.', 'success');
                bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
                loadEmployees();
            } catch(e) {
                Swal.fire('Error', e.message, 'error');
            }
        } finally {
            CRMUtils.setButtonLoading(btn, false);
        }
    });
    
    document.getElementById('empRole').addEventListener('change', (e) => toggleBranchAssign(e.target.value));
}

function toggleBranchAssign(role) {
    if(role === 'Super Admin') {
        document.getElementById('branchAssignmentContainer').style.display = 'none';
        document.getElementById('permissionsContainer').style.display = 'none';
    } else {
        document.getElementById('branchAssignmentContainer').style.display = 'block';
        document.getElementById('permissionsContainer').style.display = 'block';
    }
}
