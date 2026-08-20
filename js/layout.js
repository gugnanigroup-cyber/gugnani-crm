/**
 * Gugnani Tyres CRM - Layout Injector
 * Injects sidebar and topbar statically without requiring fetch to avoid local CORS issues.
 */

window.Layout = {
  render: function(title = "Dashboard") {
    // Inject Tom Select dynamically
    if (!document.getElementById('tom-select-css')) {
        const css = document.createElement('link');
        css.id = 'tom-select-css';
        css.rel = 'stylesheet';
        css.href = 'https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/css/tom-select.bootstrap5.min.css';
        document.head.appendChild(css);
    }
    if (!document.getElementById('tom-select-js')) {
        const js = document.createElement('script');
        js.id = 'tom-select-js';
        js.src = 'https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/js/tom-select.complete.min.js';
        document.head.appendChild(js);
    }

    const sidebar = `
      <div class="sidebar bg-secondary text-white d-flex flex-column h-100" id="sidebar">
          <div class="sidebar-header p-4 text-center">
              <img src="assets/logo_wide.png" alt="Gugnani Tyres CRM" style="max-width: 90%; max-height: 80px; filter: brightness(1.15) contrast(1.2);" class="mb-1 bg-white rounded p-2">
          </div>
          
          <div class="px-3 mb-2 small text-muted text-uppercase fw-bold" style="letter-spacing: 1px; font-size: 0.7rem;">Menu</div>
          
          <ul class="nav flex-column mb-auto">
              <li class="nav-item">
                  <a class="nav-link" href="dashboard.html"><i class="fa-solid fa-chart-pie me-3"></i> Dashboard</a>
              </li>
              <li class="nav-item">
                  <a class="nav-link" href="leads.html"><i class="fa-solid fa-users me-3"></i> Leads</a>
              </li>
              <li class="nav-item">
                  <a class="nav-link" href="followups.html"><i class="fa-solid fa-phone-volume me-3"></i> Follow-ups</a>
              </li>
              <li class="nav-item">
                  <a class="nav-link" href="schedule.html"><i class="fa-solid fa-calendar-check me-3"></i> Fitment Schedule</a>
              </li>
              <li class="nav-item">
                  <a class="nav-link" href="completed.html"><i class="fa-solid fa-circle-check me-3"></i> Completed Leads</a>
              </li>
              <li class="nav-item">
                  <a class="nav-link" href="reports.html"><i class="fa-solid fa-chart-line me-3"></i> Reports</a>
              </li>
              
              <div class="px-3 mt-4 mb-2 small text-muted text-uppercase fw-bold admin-only" style="letter-spacing: 1px; font-size: 0.7rem;">Administration</div>
              
              <li class="nav-item admin-only">
                  <a class="nav-link" href="employees.html"><i class="fa-solid fa-user-tie me-3"></i> Employees</a>
              </li>
              <li class="nav-item admin-only">
                  <a class="nav-link" href="branches.html"><i class="fa-solid fa-store me-3"></i> Branches</a>
              </li>
          </ul>
      </div>
    `;

    const topbar = `
      <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom px-4 w-100" id="topbar">
          <div class="d-flex justify-content-between align-items-center w-100">
              <div class="d-flex align-items-center">
                  <button class="btn btn-outline-secondary d-lg-none me-3" id="sidebarToggle">
                      <i class="fa-solid fa-bars"></i>
                  </button>
                  <h4 class="mb-0 fw-bold" style="color: var(--secondary-color);">${title}</h4>
              </div>
              
              <div class="d-flex align-items-center">
                  <!-- Global Search -->
                  <div class="me-4 d-none d-md-block position-relative">
                      <i class="fa-solid fa-magnifying-glass position-absolute text-muted" style="left: 12px; top: 12px;"></i>
                      <input type="text" id="globalSearchBar" class="form-control bg-light border-0 rounded-pill" placeholder="Search Mobile, Vehicle (DL...)" style="padding-left: 35px; width: 280px;" autocomplete="off">
                  </div>
                  
                  <!-- Theme Toggle -->
                  <div class="me-3">
                      <button class="btn btn-light" type="button" id="themeToggleBtn" style="border-radius: 50%; width: 40px; height: 40px; padding: 0;">
                          <i class="fa-solid fa-moon text-muted" id="themeIcon"></i>
                      </button>
                  </div>
                  
                  <!-- Notifications -->
                  <div class="dropdown me-3">
                      <button class="btn btn-light position-relative" type="button" data-bs-toggle="dropdown" style="border-radius: 50%; width: 40px; height: 40px; padding: 0;" onclick="window.fetchRealNotifications()">
                          <i class="fa-solid fa-bell text-muted"></i>
                          <span id="notificationBadge" class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style="display:none;">
                            <span class="visually-hidden">New alerts</span>
                          </span>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-0 py-2" style="width: 320px;">
                          <h6 class="dropdown-header px-3 text-dark fw-bold border-bottom pb-2 mb-2">Notifications</h6>
                          <div id="notificationList">
                              <li><a class="dropdown-item text-center small text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</a></li>
                          </div>
                      </ul>
                  </div>
              
                  <!-- User Profile -->
                  <div class="dropdown">
                      <button class="btn btn-light dropdown-toggle d-flex align-items-center" type="button" id="userDropdown" data-bs-toggle="dropdown" style="border-radius: 50px; padding: 5px 15px 5px 5px;">
                          <img src="" class="rounded-circle me-2 user-avatar" width="32" height="32" alt="User">
                          <span class="d-none d-md-inline user-name fw-medium me-1">User</span>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                          <li class="px-3 py-2 text-center">
                              <img src="" class="rounded-circle mb-2 user-avatar" width="60" height="60">
                              <div class="fw-bold user-name">User</div>
                              <div class="text-muted small user-role">Role</div>
                              <div class="text-primary small mt-1 user-branches">Branches</div>
                          </li>
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item" href="#" id="btnProfileModal"><i class="fa-solid fa-user me-2 text-muted"></i> My Profile</a></li>
                          <li><a class="dropdown-item text-danger" href="#" id="btnLogoutDrop"><i class="fa-solid fa-right-from-bracket me-2"></i> Logout</a></li>
                      </ul>
                  </div>
              </div>
          </div>
      </nav>
    `;
    
    // Inject
    const sbContainer = document.getElementById('sidebar-container');
    if (sbContainer) sbContainer.innerHTML = sidebar;
    
    const tbContainer = document.getElementById('topbar-container');
    if (tbContainer) tbContainer.innerHTML = topbar;
    
    // Inject Shared Lead Details Modal
    const modalHtml = `
      <div class="modal fade" id="leadDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-white border-bottom-0 pb-0">
              <h4 class="modal-title fw-bold text-secondary" id="lmLeadTitle">Lead Details</h4>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
              <!-- Top Row: Details & Form side by side -->
              <div class="row g-4 mb-4">
                  <!-- Left Col: Details & Actions -->
                  <div class="col-lg-6">
                      <div class="premium-card p-4 bg-white h-100 d-flex flex-column">
                          <div id="lmTopActionButtons" class="d-flex justify-content-between mb-3">
                              <button class="btn btn-sm btn-success px-3 rounded-pill" onclick="window.lmSwalAction('completed')">
                                  <i class="fa-solid fa-check"></i> Mark Complete
                              </button>
                              <button class="btn btn-sm btn-danger px-3 rounded-pill" onclick="window.lmSwalAction('lost')">
                                  <i class="fa-solid fa-xmark"></i> Mark Lost
                              </button>
                          </div>
                          
                          <h6 class="form-section-title border-bottom pb-2 mb-3">Customer Information</h6>
                          <div id="lmLeadInfoContainer"></div>
                          
                          <div id="lmBottomActionButtons" class="mt-auto pt-3 border-top">
                              <button class="btn btn-primary w-100" onclick="window.lmSwalSchedule()">
                                  <i class="fa-solid fa-calendar-check"></i> Schedule Fitment
                              </button>
                          </div>
                      </div>
                  </div>
                  
                  <!-- Right Col: Add Follow-up Form -->
                  <div class="col-lg-6">
                      <div class="premium-card p-4 bg-white h-100 d-flex flex-column" id="lmAddFollowupFormContainer">
                          <h6 class="form-section-title text-dark">Add New Follow-up</h6>
                          <form id="lmAddFollowupForm" class="d-flex flex-column flex-grow-1">
                              <div class="mb-3">
                                  <label class="form-label">Discussion Notes <span class="text-danger">*</span></label>
                                  <textarea class="form-control" id="lmDiscussion" rows="3" required></textarea>
                              </div>
                              <div class="mb-3">
                                  <label class="form-label">Customer Feedback</label>
                                  <select class="form-select" id="lmFeedback">
                                      <option value="">Select Feedback</option>
                                      <option value="Interested">Interested</option>
                                      <option value="Considering">Considering</option>
                                      <option value="Not Interested">Not Interested</option>
                                      <option value="Price Too High">Price Too High</option>
                                      <option value="Will Visit Tomorrow">Will Visit Tomorrow</option>
                                  </select>
                              </div>
                              <div class="row g-2 mb-3">
                                  <div class="col-6">
                                      <label class="form-label">Next Reminder Date</label>
                                      <input type="date" class="form-control" id="lmRemDate">
                                  </div>
                                  <div class="col-6">
                                      <label class="form-label">Time</label>
                                      <input type="time" class="form-control" id="lmRemTime">
                                  </div>
                              </div>
                              <div class="mt-auto pt-3 border-top">
                                  <button type="submit" class="btn btn-primary w-100">Save Follow-up</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>

              <!-- Bottom Row: Timeline -->
              <div class="row g-4">
                  <div class="col-12">
                      <div class="premium-card p-4 bg-white">
                          <h6 class="form-section-title">Communication Timeline</h6>
                          <div class="timeline" id="lmTimelineContainer"></div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
      </div>
      
      <!-- Shared Action Modal (Complete / Lost) -->
      <div class="modal fade" id="lmActionModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="lmActionModalTitle">Action</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <!-- Complete Form -->
                <form id="lmCompleteForm" class="hidden">
                    <div class="mb-3">
                        <label class="form-label">Completion Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control" id="lmCompDate" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Invoice Number (Optional)</label>
                        <input type="text" class="form-control" id="lmCompInvoice">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Remarks</label>
                        <textarea class="form-control" id="lmCompRemarks" rows="2"></textarea>
                    </div>
                    <button type="submit" class="btn btn-success w-100">Confirm Completion</button>
                </form>
                
                <!-- Lost Form -->
                <form id="lmLostForm" class="hidden">
                    <div class="mb-3">
                        <label class="form-label">Lost Reason <span class="text-danger">*</span></label>
                        <select class="form-select" id="lmLostReason" required>
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
                    <div class="mb-3">
                        <label class="form-label">Remarks</label>
                        <textarea class="form-control" id="lmLostRemarks" rows="2"></textarea>
                    </div>
                    <button type="submit" class="btn btn-danger w-100">Mark as Lost</button>
                </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Shared Schedule Modal -->
      <div class="modal fade" id="lmScheduleModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="fa-solid fa-calendar-plus text-primary me-2"></i> Schedule Fitment</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
              <form id="lmScheduleForm">
                  <div class="row g-3">
                      <div class="col-md-6">
                          <label class="form-label">Fitment Date <span class="text-danger">*</span></label>
                          <input type="date" class="form-control" id="lmSchDate" required>
                      </div>
                      <div class="col-md-6">
                          <label class="form-label">Time <small class="text-muted">(blank = 10:00 AM)</small></label>
                          <input type="time" class="form-control" id="lmSchTime">
                      </div>
                      <div class="col-md-6">
                          <label class="form-label">Tyre Size</label>
                          <input type="text" class="form-control" id="lmSchSize">
                      </div>
                      <div class="col-md-6">
                          <label class="form-label">Quantity</label>
                          <input type="number" class="form-control" id="lmSchQty">
                      </div>
                      <div class="col-md-6">
                          <label class="form-label">Reserved Stock?</label>
                          <select class="form-select" id="lmSchReserved">
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                          </select>
                      </div>
                      <div class="col-md-6 admin-only">
                          <label class="form-label">Branch</label>
                          <select class="form-select" id="lmSchBranch"></select>
                      </div>
                      <div class="col-12">
                          <label class="form-label">Remarks / Special Instructions</label>
                          <textarea class="form-control" id="lmSchRemarks" rows="2"></textarea>
                      </div>
                  </div>
                  <div class="mt-4">
                      <button type="submit" class="btn btn-primary w-100">Confirm Schedule</button>
                  </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      
    `;
    
    // Append modal HTML to body if not already there
    if (!document.getElementById('leadDetailsModal')) {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        
        // We append the children one by one because modalHtml has multiple sibling divs (lmActionModal, lmScheduleModal)
        while (modalDiv.firstChild) {
            document.body.appendChild(modalDiv.firstChild);
        }
    }
    
    // Load Global Lead Form Modal (Create/Edit Lead)
    if (!document.getElementById('leadModal')) {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
<!-- Lead Form Modal -->
<div class="modal fade" id="leadModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0">
                <h5 class="modal-title fw-bold" id="leadModalTitle"><i class="fa-solid fa-user-plus me-2"></i> Create/Edit Lead</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <form id="leadForm">
                    <div class="premium-card p-4 bg-white mb-4">
                        <h6 class="form-section-title border-bottom pb-2 mb-3 text-primary"><i class="fa-solid fa-address-card me-2"></i>Customer Information</h6>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Customer Name <span class="text-danger">*</span></label>
                                <input type="text" id="customerName" class="form-control bg-light" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Mobile <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <input type="tel" id="mobile" class="form-control bg-light" required>
                                    <button class="btn btn-outline-primary" type="button" id="btnCheckDuplicate" title="Check if customer exists"><i class="fa-solid fa-magnifying-glass"></i> Check</button>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check form-switch mb-2">
                                    <input class="form-check-input" type="checkbox" id="chkAltMobile">
                                    <label class="form-check-label fw-bold" for="chkAltMobile">Alternate Mobile</label>
                                </div>
                                <div id="divAltMobile" style="display:none;">
                                    <input type="tel" id="altMobile" class="form-control bg-light" placeholder="Enter alternate mobile">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check form-switch mb-2">
                                    <input class="form-check-input" type="checkbox" id="chkWhatsappSame" checked>
                                    <label class="form-check-label fw-bold" for="chkWhatsappSame">WhatsApp is same</label>
                                </div>
                                <div id="divWhatsapp" style="display:none;">
                                    <input type="tel" id="whatsapp" class="form-control bg-light" placeholder="Enter WhatsApp number">
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-bold">Address</label>
                                <textarea id="address" class="form-control bg-light" rows="2"></textarea>
                            </div>
                        </div>
                    </div>

                    <div class="premium-card p-4 bg-white mb-4">
                        <h6 class="form-section-title border-bottom pb-2 mb-3 text-primary"><i class="fa-solid fa-car me-2"></i>Vehicle & Requirement</h6>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Vehicle Type</label>
                                <select id="vehicleType" class="form-select bg-light">
                                    <option value="Car">Car</option>
                                    <option value="Bike">Bike</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div id="divOtherVehicleType" style="display:none;" class="mt-2">
                                    <input type="text" id="otherVehicleType" class="form-control bg-light" placeholder="Specify Vehicle Type">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Vehicle Company</label>
                                <input type="text" id="vehicleCompany" class="form-control bg-light">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Vehicle Model</label>
                                <input type="text" id="vehicleModel" class="form-control bg-light">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Vehicle Number</label>
                                <input type="text" id="vehicleNumber" class="form-control bg-light">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Tyre Size</label>
                                <select id="tyreSize" class="form-select bg-light" placeholder="Search or add size...">
                                    <option value=""></option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Quantity</label>
                                <input type="number" id="quantity" class="form-control bg-light">
                            </div>
                        </div>
                    </div>

                    <div class="premium-card p-4 bg-white">
                        <h6 class="form-section-title border-bottom pb-2 mb-3 text-primary"><i class="fa-solid fa-chart-line me-2"></i>Status & Assignment</h6>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Budget</label>
                                <input type="number" id="budget" class="form-control bg-light" placeholder="₹">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Pref Brand <small class="text-muted fw-normal">(select multiple)</small></label>
                                <select id="prefBrand" class="form-select bg-light" multiple placeholder="Select or add brand...">
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Source</label>
                                <select id="source" class="form-select bg-light">
                                    <option>Walk In</option>
                                    <option>Phone</option>
                                    <option>Website</option>
                                    <option>Reference</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Priority</label>
                                <select id="priority" class="form-select bg-light">
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Assigned Exec</label>
                                <select id="assignedExec" class="form-select bg-light">
                                    <option value=""></option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold">Assigned Branch</label>
                                <select id="assignedBranch" class="form-select bg-light">
                                    <option value=""></option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">Exp Fitment Date</label>
                                <input type="date" id="expFitmentDate" class="form-control bg-light">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold">
                                    Next Follow-up Date
                                    <small class="text-muted fw-normal">(optional — blank = now)</small>
                                </label>
                                <input type="date" id="initialFollowUpDate" class="form-control bg-light">
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-bold">Remarks</label>
                                <textarea id="remarks" class="form-control bg-light" rows="2"></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 bg-light">
                <button type="button" class="btn btn-secondary px-4 rounded-pill" data-bs-dismiss="modal">Close</button>
                <button type="button" id="btnSaveLead" class="btn btn-primary px-4 rounded-pill">
                    <i class="fa-solid fa-save me-2"></i> Save Lead
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Shared Action Modal (Complete / Lost) for Dashboard and Schedule -->
<div class="modal fade" id="actionModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0">
                <h5 class="modal-title fw-bold" id="actionModalTitle"><i class="fa-solid fa-bolt me-2"></i> Action</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <!-- Complete Form -->
                <form id="completeForm" class="hidden">
                    <div class="text-center mb-4">
                        <div class="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3" style="width: 60px; height: 60px;">
                            <i class="fa-solid fa-check fs-2"></i>
                        </div>
                        <h5 class="fw-bold text-success">Mark as Completed</h5>
                    </div>
                    <div class="premium-card p-3 bg-white border-success" style="border-top: 4px solid #198754;">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Completion Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control bg-light" id="compDate" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Invoice Number (Optional)</label>
                            <input type="text" class="form-control bg-light" id="compInvoice" placeholder="e.g. INV-12345">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Remarks</label>
                            <textarea class="form-control bg-light" id="compRemarks" rows="2" placeholder="Any final notes..."></textarea>
                        </div>
                    </div>
                    <button type="button" id="btnSubmitComplete" class="btn btn-success w-100 rounded-pill mt-3 py-2 fw-bold">
                        <i class="fa-solid fa-check-circle me-2"></i> Confirm Completion
                    </button>
                </form>
                
                <!-- Lost Form -->
                <form id="lostForm" class="hidden">
                    <div class="text-center mb-4">
                        <div class="d-inline-flex align-items-center justify-content-center bg-danger text-white rounded-circle mb-3" style="width: 60px; height: 60px;">
                            <i class="fa-solid fa-xmark fs-2"></i>
                        </div>
                        <h5 class="fw-bold text-danger">Mark as Lost</h5>
                    </div>
                    <div class="premium-card p-3 bg-white border-danger" style="border-top: 4px solid #dc3545;">
                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Lost Reason <span class="text-danger">*</span></label>
                            <select class="form-select bg-light" id="lostReason" required>
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
                        <div class="mb-3">
                            <label class="form-label fw-bold text-dark">Remarks</label>
                            <textarea class="form-control bg-light" id="lostRemarks" rows="2" placeholder="Additional details..."></textarea>
                        </div>
                    </div>
                    <button type="button" id="btnSubmitLost" class="btn btn-danger w-100 rounded-pill mt-3 py-2 fw-bold">
                        <i class="fa-solid fa-ban me-2"></i> Confirm Mark as Lost
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Shared Schedule Modal -->
<div class="modal fade" id="scheduleModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0">
                <h5 class="modal-title fw-bold"><i class="fa-solid fa-calendar-plus me-2 text-warning"></i> Schedule Fitment</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <form id="scheduleForm">
                    <input type="hidden" id="schLeadId">
                    <div class="premium-card p-4 bg-white">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-dark">Tyre Size</label>
                                <input type="text" id="schSize" class="form-control bg-light fw-bold text-primary">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-dark">Quantity</label>
                                <input type="number" id="schQty" class="form-control bg-light fw-bold text-primary">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-dark">Date <span class="text-danger">*</span></label>
                                <input type="date" id="schDate" class="form-control bg-light" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-dark">Time <span class="text-danger">*</span></label>
                                <input type="time" id="schTime" class="form-control bg-light" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-dark">Reserved Stock</label>
                                <select id="schReserved" class="form-select bg-light">
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                            <div class="col-md-6 admin-only">
                                <label class="form-label fw-bold text-dark">Branch</label>
                                <select id="schBranch" class="form-select bg-light"></select>
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-bold text-dark">Remarks / Special Instructions</label>
                                <textarea id="schRemarks" class="form-control bg-light" rows="2"></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer border-top-0 bg-light">
                <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="button" id="btnSaveSchedule" class="btn btn-warning rounded-pill px-4 fw-bold">
                    <i class="fa-solid fa-save me-2"></i> Save Schedule
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Revert Schedule Modal -->
<div class="modal fade" id="revertModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0">
                <h5 class="modal-title fw-bold"><i class="fa-solid fa-rotate-left me-2 text-warning"></i> Revert Schedule</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <div class="premium-card p-4 bg-white border-warning" style="border-top: 4px solid #ffc107;">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-dark">Reason for Reverting <span class="text-danger">*</span></label>
                        <textarea id="revertReason" class="form-control bg-light" required placeholder="Why is this being reverted?"></textarea>
                    </div>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-dark">New Follow-up Date <span class="text-danger">*</span></label>
                            <input type="date" id="revertDate" class="form-control bg-light" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-dark">New Follow-up Time <span class="text-danger">*</span></label>
                            <input type="time" id="revertTime" class="form-control bg-light" required>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer border-top-0 bg-light">
                <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="button" id="btnSubmitRevert" class="btn btn-warning rounded-pill px-4 fw-bold">
                    <i class="fa-solid fa-rotate-left me-2"></i> Revert to Follow-up
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Duplicate Check Modal -->
<div class="modal fade" id="duplicateModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-warning text-dark border-0">
                <h5 class="modal-title fw-bold"><i class="fa-solid fa-triangle-exclamation me-2"></i> Duplicate Found</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <p>A lead already exists with this Mobile/Vehicle number.</p>
                <div id="duplicateLeadInfo" class="p-3 bg-white border rounded mb-3"></div>
                <p class="mb-0 fw-bold text-secondary">Do you want to create a new duplicate lead anyway, or open the existing one?</p>
            </div>
            <div class="modal-footer border-top-0 bg-light">
                <button type="button" class="btn btn-secondary px-3 rounded-pill" data-bs-dismiss="modal">Cancel</button>
                <button type="button" id="btnCreateDuplicate" class="btn btn-danger px-3 rounded-pill">Create Duplicate</button>
                <button type="button" id="btnOpenExisting" class="btn btn-primary px-3 rounded-pill">Open Existing</button>
            </div>
        </div>
    </div>
</div>
`;
        while (modalDiv.firstChild) {
            document.body.appendChild(modalDiv.firstChild);
        }
        if (typeof window.initLeadFormEvents === 'function') {
            window.initLeadFormEvents();
        }
        if (typeof window.initScheduleFormEvents === 'function') {
            window.initScheduleFormEvents();
        }
    }
    
    this.attachEvents();
  },
  
  attachEvents: function() {
      document.body.insertAdjacentHTML('beforeend', `
      <!-- Profile Modal -->
      <div class="modal fade" id="profileModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-danger text-white border-0">
              <h5 class="modal-title fw-bold"><i class="fa-solid fa-user-shield me-2"></i> My Profile</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 bg-light">
                <div class="text-center mb-4">
                    <img src="" class="rounded-circle border border-3 border-danger shadow-sm user-avatar mb-2" style="width: 80px; height: 80px; background-color: #fff; object-fit: cover;" alt="User">
                    <h5 class="fw-bold text-dark user-name mb-0">Loading...</h5>
                    <small class="text-muted user-role fw-semibold">Role</small>
                </div>
                
                <h6 class="form-section-title text-secondary border-bottom pb-2 mb-3">Profile Details</h6>
                <div class="row g-2 mb-4 text-start">
                    <div class="col-6">
                        <small class="text-muted fw-bold text-uppercase d-block mb-1" style="font-size: 0.7rem;">Mobile</small>
                        <div class="fw-medium text-dark" id="modalProfileMobile">--</div>
                    </div>
                    <div class="col-6">
                        <small class="text-muted fw-bold text-uppercase d-block mb-1" style="font-size: 0.7rem;">Branches</small>
                        <div class="fw-medium text-dark user-branches">--</div>
                    </div>
                </div>

                <h6 class="form-section-title text-secondary border-bottom pb-2 mb-3">Update Password</h6>
                <form id="formUpdatePassword">
                    <div class="mb-3">
                        <label class="form-label small fw-semibold">New Password</label>
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0"><i class="fa-solid fa-lock text-muted"></i></span>
                            <input type="password" class="form-control border-start-0" id="profNewPassword" placeholder="Enter new password" required>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="form-label small fw-semibold">Confirm Password</label>
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0"><i class="fa-solid fa-check-double text-muted"></i></span>
                            <input type="password" class="form-control border-start-0" id="profConfPassword" placeholder="Confirm new password" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-danger w-100 fw-bold shadow-sm rounded-pill"><i class="fa-solid fa-key me-2"></i>Update Password</button>
                </form>
            </div>
          </div>
        </div>
      </div>
      <div class="modal fade" id="globalSearchModal" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered modal-lg">
              <div class="modal-content border-0 shadow-lg">
                  <div class="modal-header bg-dark text-white border-0">
                      <h5 class="modal-title fw-bold"><i class="fa-solid fa-search me-2"></i> Search Results</h5>
                      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body p-0">
                      <div class="list-group list-group-flush" id="globalSearchResults">
                          <!-- Results will be injected here -->
                      </div>
                  </div>
              </div>
          </div>
      </div>
    `);

    // Auth Check & UI Update
    Auth.updateUI();

    // Sidebar toggle
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    // Add overlay for mobile
    let overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
      });
      
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
      });
    }
    
    // Active Link Highlight
    const path = window.location.pathname;
    const page = path.split("/").pop() || "dashboard.html";
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('href') === page) {
        link.classList.add('active');
      }
    });

    // Prevent Bootstrap modal from stealing focus when SweetAlert popup is open over it
    if (!window._swalFocusOverrideBound) {
        window._swalFocusOverrideBound = true;
        document.addEventListener('focusin', function(e) {
            if (e.target && e.target.closest && e.target.closest('.swal2-container')) {
                e.stopImmediatePropagation();
            }
        }, true);
    }
    
    // Global Search Binding
    const searchBar = document.getElementById('globalSearchBar');
    if (searchBar) {
        searchBar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length >= 2) {
                    CRMUtils.executeGlobalSearch(query);
                } else {
                    Swal.fire('Notice', 'Please enter at least 2 characters to search.', 'info');
                }
            }
        });
    }
      
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    if (themeToggleBtn && themeIcon) {
        if (localStorage.getItem('crm_theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        }
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('crm_theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            } else {
                localStorage.setItem('crm_theme', 'light');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            }
        });
    }
    
    // Start notification polling every 60 seconds
    if (typeof window.updateNotificationBadge === 'function') {
        window.updateNotificationBadge();
        setInterval(window.updateNotificationBadge, 60000);
    }
    
    // User Info
    const user = Auth.getUser();
    if (user) {
        document.querySelectorAll('.user-avatar').forEach(img => {
            img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.Name)}&background=CC0000&color=fff&bold=true`;
        });
    }

    // Set mobile number in modal when opened
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.addEventListener('show.bs.modal', () => {
            const user = Auth.getUser();
            if (user) {
                const mEl = document.getElementById('modalProfileMobile');
                if (mEl) mEl.textContent = user.Mobile || 'N/A';
            }
        });
    }

    const btnProfileModal = document.getElementById('btnProfileModal');
    if (btnProfileModal) {
        btnProfileModal.addEventListener('click', (e) => {
            e.preventDefault();
            const modalEl = document.getElementById('profileModal');
            if (modalEl) {
                let m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                m.show();
            } else {
                console.error("Profile modal element not found!");
            }
        });
    }

    const btnLogoutDrop = document.getElementById('btnLogoutDrop');
    if (btnLogoutDrop) {
        btnLogoutDrop.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Are you sure?',
                    text: "You will be logged out of the CRM.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: typeof CONFIG !== 'undefined' ? CONFIG.COLORS.primary : '#CC0000',
                    cancelButtonColor: typeof CONFIG !== 'undefined' ? CONFIG.COLORS.secondary : '#6c757d',
                    confirmButtonText: 'Yes, logout'
                }).then((result) => {
                    if (result.isConfirmed && typeof Auth !== 'undefined') {
                        Auth.logout();
                    }
                });
            } else if (typeof Auth !== 'undefined') {
                Auth.logout();
            }
        });
    }

    const formUpdatePassword = document.getElementById('formUpdatePassword');
    if (formUpdatePassword) {
        formUpdatePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPass = document.getElementById('profNewPassword').value;
            const confPass = document.getElementById('profConfPassword').value;
            
            if (newPass !== confPass) {
                Swal.fire('Error', 'Passwords do not match.', 'error');
                return;
            }
            
            try {
                const user = Auth.getUser();
                await API.call('updateEmployee', { EmployeeID: user.EmployeeID, Password: newPass, Mobile: user.Mobile });
                Swal.fire('Success', 'Password updated successfully.', 'success').then(() => {
                    document.getElementById('formUpdatePassword').reset();
                    bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
                });
            } catch (err) {
                Swal.fire('Error', err.message || 'Failed to update password. You may not have permission.', 'error');
            }
        });
    }
  }
};

window.notificationCache = null;

// Fetch and update badge silently
window.updateNotificationBadge = async function() {
    if (!Auth.getUser()) return;
    try {
        const todayFollowups = await API.call('getFollowUps', {type: 'today_only'}, false); // false = no full-screen loader
        const overdueFollowups = await API.call('getFollowUps', {type: 'overdue'}, false);
        
        let pToday = todayFollowups.filter(f => f.Status !== 'Completed').length;
        let pOverdue = overdueFollowups.filter(f => f.Status !== 'Completed').length;
        
        window.notificationCache = { pToday, pOverdue };
        
        // Check for immediate audio alerts
        if (Notification.permission === 'default') Notification.requestPermission();
        
        const now = new Date();
        const curH = now.getHours();
        const curM = now.getMinutes();
        
        todayFollowups.forEach(f => {
            if (f.Status !== 'Completed' && f.RemTime) {
                let rTime = f.RemTime;
                let h = 0, min = 0;
                const cleanTime = rTime.replace(/am|pm|AM|PM/g, '').trim();
                if (cleanTime.includes(':')) [h, min] = cleanTime.split(':').map(Number);
                if (rTime.toUpperCase().includes('PM') && h < 12) h += 12;
                if (rTime.toUpperCase().includes('AM') && h === 12) h = 0;
                
                // If it's exactly this minute!
                if (h === curH && min === curM && !window[`notified_${f.LeadID}_${rTime}`]) {
                    window[`notified_${f.LeadID}_${rTime}`] = true;
                    if (window.CRMUtils && window.CRMUtils.playDing) CRMUtils.playDing();
                    if (Notification.permission === 'granted') {
                        new Notification("CRM Call Due!", { body: `Call ${f.CustomerName || 'Lead'} immediately.` });
                    }
                }
            }
        });
        
        const badgeEl = document.getElementById('notificationBadge');
        if (badgeEl) {
            badgeEl.style.display = (pToday > 0 || pOverdue > 0) ? 'block' : 'none';
        }
    } catch(e) {}
};

// Render dropdown instantly from cache
window.fetchRealNotifications = async function() {
    const listEl = document.getElementById('notificationList');
    
    if (listEl && !window.notificationCache) {
        listEl.innerHTML = `<li><a class="dropdown-item text-center small text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Checking server...</a></li>`;
    }
    
    if (!window.notificationCache) {
        await window.updateNotificationBadge();
    }
    
    if (!window.notificationCache) {
        if (listEl) listEl.innerHTML = `<li><a class="dropdown-item text-center small text-danger"><i class="fa-solid fa-circle-exclamation me-2"></i>Failed to connect</a></li>`;
        return;
    }
    
    let { pToday, pOverdue } = window.notificationCache;
    let html = '';
    
    if (pOverdue > 0) {
        html += `<li><a class="dropdown-item px-3 py-2 text-wrap small text-danger" href="followups.html"><i class="fa-solid fa-triangle-exclamation me-2"></i>You have ${pOverdue} overdue follow-ups!</a></li>`;
        html += `<li><hr class="dropdown-divider"></li>`;
    }
    if (pToday > 0) {
        html += `<li><a class="dropdown-item px-3 py-2 text-wrap small text-warning" href="followups.html"><i class="fa-solid fa-clock me-2"></i>You have ${pToday} pending follow-ups today.</a></li>`;
        html += `<li><hr class="dropdown-divider"></li>`;
    }
    
    if (html === '') {
        html = `<li><a class="dropdown-item px-3 py-2 text-wrap small text-muted text-center"><i class="fa-solid fa-check-circle text-success mb-2 fs-4 d-block"></i>You are all caught up!</a></li>`;
    } else {
        html = html.replace(/<li><hr class="dropdown-divider"><\/li>$/, '');
    }
    
    if (listEl) listEl.innerHTML = html;
};

// Check badge silently on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.updateNotificationBadge, 2000);
});


