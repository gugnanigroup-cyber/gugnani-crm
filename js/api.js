/**
 * Gugnani Tyres CRM - API Wrapper (Supabase Client-Side Integration)
 */

const API = {
  supabaseClient: null,
  
  showLoader: function() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.remove('hidden');
  },
  
  hideLoader: function() {
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.add('hidden');
  },

  /**
   * Initializes and returns the Supabase client, loading the SDK dynamically if needed.
   */
  getSupabase: async function() {
    if (this.supabaseClient) return this.supabaseClient;
    
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Supabase SDK'));
        document.head.appendChild(script);
      });
    }
    
    this.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    return this.supabaseClient;
  },

  /**
   * Hashes the password using standard SHA-256 (matches the legacy Apps Script hashing).
   */
  hashPassword: async function(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },
  
  /**
   * Main function to call backend operations (Now running on Supabase client-side)
   */
  call: async function(action, payload = {}, showLoading = true, bypassQueue = false) {
    if (showLoading) this.showLoader();
    
    const token = localStorage.getItem('crm_token');

    try {
      const supabase = await this.getSupabase();
      let result = null;

      // 1. Session check (skip check for login or forgotPassword)
      let user = null;
      if (action !== "login" && action !== "forgotPassword") {
        if (!token) {
          throw { code: 401, message: "Unauthorized. Please log in." };
        }
        // Validate session token
        const { data: session } = await supabase.from('Sessions').select('*').eq('Token', token).maybeSingle();
        if (!session || new Date(session.ExpiresAt) < new Date()) {
          throw { code: 401, message: "Session expired or invalid." };
        }
        
        // Fetch user info
        const { data: emp } = await supabase.from('Employees').select('*').eq('EmployeeID', session.EmployeeID).eq('Status', 'Active').maybeSingle();
        if (!emp) {
          throw { code: 401, message: "User account deactivated." };
        }
        user = emp;

        // Auto-extend session expiry
        const isReadOp = action.startsWith("get") || action.startsWith("check") || action === "globalSearch";
        if (!isReadOp) {
          const newExpiry = new Date();
          newExpiry.setHours(newExpiry.getHours() + 12);
          await supabase.from('Sessions').update({ ExpiresAt: newExpiry.toISOString() }).eq('Token', token);
        }
      }

      // 2. Action router
      switch (action) {
        case "login": {
          const { data: emp } = await supabase.from('Employees').select('*').eq('Mobile', payload.mobile).maybeSingle();
          if (!emp) throw new Error("Invalid mobile or password.");
          if (emp.Status !== "Active") throw new Error("Account is inactive. Contact Administrator.");

          const hashed = await this.hashPassword(payload.password);
          if (emp.PasswordHash !== hashed) throw new Error("Invalid mobile or password.");

          // Create session token
          const sessionToken = "TOK-" + Math.random().toString(36).substring(2, 15).toUpperCase();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 12); // 12-hour expiry

          await supabase.from('Sessions').insert({
            Token: sessionToken,
            EmployeeID: emp.EmployeeID,
            CreatedAt: new Date().toISOString(),
            ExpiresAt: expiresAt.toISOString()
          });

          // Update last login
          await supabase.from('Employees').update({ LastLogin: new Date().toISOString() }).eq('EmployeeID', emp.EmployeeID);

          delete emp.PasswordHash;
          result = { token: sessionToken, user: emp };
          break;
        }

        case "forgotPassword":
          result = { message: "Password reset instructions sent." };
          break;

        case "checkDatabaseVersion":
          result = { lastUpdated: Date.now() };
          break;

        case "getDashboardStats": {
          const today = new Date().toISOString().split('T')[0];
          const stats = {
            todayLeads: 0,
            todayFollowUps: 0,
            todayFitment: 0,
            pendingFollowUps: 0,
            completed: 0,
            lost: 0,
            weeklyTrend: [0, 0, 0, 0, 0, 0, 0],
            trendLabels: []
          };

          const trendDates = [];
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          for (let d = 6; d >= 0; d--) {
            const dObj = new Date();
            dObj.setDate(dObj.getDate() - d);
            trendDates.push(dObj.toISOString().split('T')[0]);
            stats.trendLabels.push(days[dObj.getDay()]);
          }

          let { data: leads } = await supabase.from('Leads').select('*');
          leads = leads || [];
          if (user.Role === 'Sales Executive') {
            leads = leads.filter(l => l.AssignedExec === user.EmployeeID);
          } else if (user.Role === 'Branch Manager' || user.Role === 'Reception') {
            const branches = user.Branches ? user.Branches.split(',').map(b => b.trim()) : [];
            leads = leads.filter(l => branches.includes(l.AssignedBranch));
          }

          const leadStatusMap = {};
          leads.forEach(l => {
            leadStatusMap[l.LeadID] = l.Status;
            if (l.Date === today) stats.todayLeads++;
            const tIdx = trendDates.indexOf(l.Date);
            if (tIdx !== -1) stats.weeklyTrend[tIdx]++;
            if (l.Status === 'Completed' && l.UpdatedAt && l.UpdatedAt.startsWith(today)) stats.completed++;
            if (l.Status === 'Lost') stats.lost++;
            if (l.Status === 'Scheduled' && l.ExpFitmentDate === today) stats.todayFitment++;
          });

          let { data: followups } = await supabase.from('FollowUps').select('*');
          followups = followups || [];
          if (user.Role === 'Sales Executive') {
            followups = followups.filter(fu => fu.Exec === user.EmployeeID);
          }
          followups = followups.filter(fu => {
            const status = leadStatusMap[fu.LeadID];
            return status && status !== 'Completed' && status !== 'Lost' && status !== 'Scheduled';
          });

          const latestFollowUp = {};
          followups.sort((a, b) => new Date(a.CreatedAt || (a.Date + 'T' + a.Time)) - new Date(b.CreatedAt || (b.Date + 'T' + b.Time)));
          followups.forEach(fu => {
            latestFollowUp[fu.LeadID] = fu.RemDate;
          });

          for (const leadId in latestFollowUp) {
            const rDate = latestFollowUp[leadId];
            if (rDate) {
              if (rDate === today) stats.todayFollowUps++;
              else if (rDate < today) stats.pendingFollowUps++;
            }
          }

          result = stats;
          break;
        }

        case "getAdvancedReport": {
          const reportType = payload.reportType || 'export';
          const dateRange = payload.dateRange || 'all';
          let startDate = "";
          let endDate = "";
          const today = new Date();

          if (dateRange === 'today') {
            startDate = endDate = today.toISOString().split('T')[0];
          } else if (dateRange === 'last7') {
            const dObj = new Date();
            dObj.setDate(dObj.getDate() - 7);
            startDate = dObj.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
          } else if (dateRange === 'thisMonth') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
          } else if (dateRange === 'custom') {
            startDate = payload.startDate;
            endDate = payload.endDate;
          }

          let { data: leads } = await supabase.from('Leads').select('*');
          leads = leads || [];
          if (user.Role === 'Sales Executive') {
            leads = leads.filter(l => l.AssignedExec === user.EmployeeID);
          } else if (user.Role === 'Branch Manager' || user.Role === 'Reception') {
            const branches = user.Branches ? user.Branches.split(',').map(b => b.trim()) : [];
            leads = leads.filter(l => branches.includes(l.AssignedBranch));
          }

          if (startDate) leads = leads.filter(l => l.Date >= startDate);
          if (endDate) leads = leads.filter(l => l.Date <= endDate);

          const aggregated = [];
          const map = {};

          if (reportType === 'executive' || reportType === 'branch') {
            const keyProp = reportType === 'executive' ? 'AssignedExec' : 'AssignedBranch';

            leads.forEach(L => {
              const key = L[keyProp] || 'Unassigned';
              if (!map[key]) {
                map[key] = { label: key, total: 0, completed: 0, lost: 0, open: 0, scheduled: 0, revenue: 0, followupsDone: 0, fitmentsDone: 0 };
              }
              map[key].total++;
              if (L.Status === 'Completed') map[key].completed++;
              else if (L.Status === 'Lost') map[key].lost++;
              else if (L.Status === 'Scheduled') map[key].scheduled++;
              else map[key].open++;

              if (L.Budget) {
                const val = parseFloat(String(L.Budget).replace(/[^0-9.]/g, ''));
                if (!isNaN(val)) map[key].revenue += val;
              }
            });

            let { data: allFollowups } = await supabase.from('FollowUps').select('*');
            allFollowups = allFollowups || [];
            allFollowups.forEach(fu => {
              if (fu.Date && (!startDate || fu.Date >= startDate) && (!endDate || fu.Date <= endDate)) {
                const matchLead = leads.find(l => l.LeadID === fu.LeadID);
                if (matchLead) {
                  const mKey = matchLead[keyProp] || 'Unassigned';
                  if (map[mKey]) map[mKey].followupsDone++;
                }
              }
            });

            let { data: allCompleted } = await supabase.from('Completed').select('*');
            allCompleted = allCompleted || [];
            allCompleted.forEach(comp => {
              if (comp.CompDate && (!startDate || comp.CompDate >= startDate) && (!endDate || comp.CompDate <= endDate)) {
                const matchLead = leads.find(l => l.LeadID === comp.LeadID);
                if (matchLead) {
                  const mKey = matchLead[keyProp] || 'Unassigned';
                  if (map[mKey]) map[mKey].fitmentsDone++;
                }
              }
            });

            for (const key in map) {
              const item = map[key];
              item.conversion = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              aggregated.push(item);
            }
            aggregated.sort((a, b) => b.completed - a.completed);
          }

          result = { aggregated, raw: leads };
          break;
        }

        case "getEmployees": {
          let { data: employees } = await supabase.from('Employees').select('*');
          employees = employees || [];
          if (user.Role === 'Branch Manager') {
            const mgrBranches = user.Branches ? user.Branches.split(',').map(b => b.trim()) : [];
            employees = employees.filter(emp => {
              if (emp.Role === 'Super Admin') return false;
              const empBranches = emp.Branches ? emp.Branches.split(',').map(b => b.trim()) : [];
              return empBranches.some(b => mgrBranches.includes(b));
            });
          }
          result = employees;
          break;
        }

        case "createEmployee": {
          const hash = await this.hashPassword(payload.Password);
          const newEmp = { ...payload, PasswordHash: hash, CreatedAt: new Date().toISOString() };
          delete newEmp.Password;
          const { data } = await supabase.from('Employees').insert(newEmp).select().single();
          result = data;
          break;
        }

        case "updateEmployee": {
          const updateData = { ...payload };
          if (payload.Password) {
            updateData.PasswordHash = await this.hashPassword(payload.Password);
            delete updateData.Password;
          }
          const { data } = await supabase.from('Employees').update(updateData).eq('EmployeeID', payload.EmployeeID).select().single();
          result = data;
          break;
        }

        case "getBranches": {
          const { data } = await supabase.from('Branches').select('*');
          result = data;
          break;
        }

        case "createBranch": {
          const { data } = await supabase.from('Branches').insert(payload).select().single();
          result = data;
          break;
        }

        case "updateBranch": {
          const { data } = await supabase.from('Branches').update(payload).eq('BranchID', payload.BranchID).select().single();
          result = data;
          break;
        }

        case "getLeads": {
          let { data: leads } = await supabase.from('Leads').select('*');
          leads = leads || [];
          if (user.Role === 'Sales Executive') {
            leads = leads.filter(l => l.AssignedExec === user.EmployeeID);
          } else if (user.Role === 'Branch Manager' || user.Role === 'Reception') {
            const branches = user.Branches ? user.Branches.split(',').map(b => b.trim()) : [];
            leads = leads.filter(l => branches.includes(l.AssignedBranch));
          }
          if (payload.status) {
            leads = leads.filter(l => l.Status === payload.status);
          }
          // Sort leads (Newest first)
          leads.sort((a, b) => new Date(b.CreatedAt || b.Date) - new Date(a.CreatedAt || a.Date));
          result = leads;
          break;
        }

        case "createLead": {
          const newLead = {
            ...payload,
            Date: payload.Date || new Date().toISOString().split('T')[0],
            Time: payload.Time || new Date().toTimeString().split(' ')[0].substring(0, 5),
            Status: 'Open',
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
          };
          await supabase.from('Leads').insert(newLead);
          
          // Auto-create initial follow-up reminder
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const remDate = tomorrow.toISOString().split('T')[0];
          await supabase.from('FollowUps').insert({
            FollowUpID: "FU-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            LeadID: newLead.LeadID,
            Date: newLead.Date,
            Time: newLead.Time,
            Discussion: "New Lead Created.",
            RemDate: remDate,
            RemTime: "10:00",
            Exec: newLead.AssignedExec,
            Status: "Pending",
            CreatedAt: new Date().toISOString()
          });
          
          result = newLead;
          break;
        }

        case "updateLead": {
          const updateData = { ...payload, UpdatedAt: new Date().toISOString() };
          await supabase.from('Leads').update(updateData).eq('LeadID', payload.LeadID);
          result = updateData;
          break;
        }

        case "checkDuplicateLead": {
          const { data: leads } = await supabase.from('Leads')
            .select('*')
            .or(`Mobile.eq.${payload.mobile},VehicleNumber.eq.${payload.vehicleNumber}`);
          const mobileMatch = (leads || []).find(l => l.Mobile === payload.mobile);
          const vehicleMatch = (leads || []).find(l => l.VehicleNumber === payload.vehicleNumber);
          result = {
            exists: (leads || []).length > 0,
            type: mobileMatch && vehicleMatch ? 'both' : (mobileMatch ? 'mobile' : 'vehicle'),
            lead: (leads || [])[0] || null
          };
          break;
        }

        case "getLeadInitialData": {
          const { data: branches } = await supabase.from('Branches').select('*').eq('Status', 'Active');
          let { data: employees } = await supabase.from('Employees').select('*').eq('Status', 'Active');
          
          employees = employees || [];
          if (user.Role === 'Branch Manager') {
            const mgrBranches = user.Branches ? user.Branches.split(',').map(b => b.trim()) : [];
            employees = employees.filter(emp => {
              if (emp.Role === 'Super Admin') return false;
              const empBranches = emp.Branches ? emp.Branches.split(',').map(b => b.trim()) : [];
              return empBranches.some(b => mgrBranches.includes(b));
            });
          }

          const { data: tyreSizes } = await supabase.from('MasterTyreSize').select('*').eq('Active', 'Active');
          const { data: brands } = await supabase.from('MasterBrands').select('*').eq('Active', 'Active');
          const { data: vehicles } = await supabase.from('MasterVehicle').select('*');

          result = {
            branches: branches || [],
            employees: employees || [],
            tyreSizes: tyreSizes || [],
            brands: brands || [],
            vehicles: vehicles || []
          };
          break;
        }

        case "getLeadDetails": {
          const { data: lead } = await supabase.from('Leads').select('*').eq('LeadID', payload.leadId).single();
          const { data: followups } = await supabase.from('FollowUps').select('*').eq('LeadID', payload.leadId).order('CreatedAt', { ascending: false });
          const { data: schedule } = await supabase.from('ScheduleFitment').select('*').eq('LeadID', payload.leadId).eq('Status', 'Scheduled').maybeSingle();
          const { data: completed } = await supabase.from('Completed').select('*').eq('LeadID', payload.leadId).maybeSingle();
          const { data: lost } = await supabase.from('Lost').select('*').eq('LeadID', payload.leadId).maybeSingle();
          result = { lead, followups, schedule, completed, lost };
          break;
        }

        case "globalSearch": {
          const { data: leads } = await supabase.from('Leads')
            .select('*')
            .or(`CustomerName.ilike.%${payload.query}%,Mobile.ilike.%${payload.query}%,VehicleNumber.ilike.%${payload.query}%`)
            .limit(20);
          result = leads;
          break;
        }

        case "getFollowUps": {
          const { data: allLeads } = await supabase.from('Leads').select('LeadID, Status, CustomerName, Mobile');
          const leadStatusMap = {};
          const leadDetailsMap = {};
          (allLeads || []).forEach(l => {
            leadStatusMap[l.LeadID] = l.Status;
            leadDetailsMap[l.LeadID] = { CustomerName: l.CustomerName, Mobile: l.Mobile };
          });

          let { data: followups } = await supabase.from('FollowUps').select('*');
          followups = followups || [];

          if (payload.type !== 'today_completed') {
            const seenLeads = {};
            followups.sort((a, b) => new Date(b.CreatedAt || (b.Date + 'T' + b.Time)) - new Date(a.CreatedAt || (a.Date + 'T' + a.Time)));
            followups = followups.filter(fu => {
              if (seenLeads[fu.LeadID]) return false;
              seenLeads[fu.LeadID] = true;
              return true;
            });
          }

          if (payload.type !== 'today_completed') {
            followups = followups.filter(fu => {
              const status = leadStatusMap[fu.LeadID];
              return status && status !== 'Completed' && status !== 'Lost' && status !== 'Scheduled';
            });
          } else {
            const todayStr = new Date().toISOString().split('T')[0];
            followups = followups.filter(fu => fu.Status === 'Completed' && fu.Date === todayStr);
          }

          const todayStr = new Date().toISOString().split('T')[0];
          if (payload.type === 'today') {
            followups = followups.filter(fu => fu.RemDate && fu.RemDate <= todayStr);
          } else if (payload.type === 'today_only') {
            followups = followups.filter(fu => fu.RemDate && fu.RemDate === todayStr);
          } else if (payload.type === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomStr = tomorrow.toISOString().split('T')[0];
            followups = followups.filter(fu => fu.RemDate && fu.RemDate === tomStr);
          } else if (payload.type === 'future') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomStr = tomorrow.toISOString().split('T')[0];
            followups = followups.filter(fu => fu.RemDate && fu.RemDate > tomStr);
          } else if (payload.type === 'overdue') {
            followups = followups.filter(fu => fu.RemDate && fu.RemDate < todayStr);
          } else if (payload.type === 'custom') {
            followups = followups.filter(fu => fu.RemDate && fu.RemDate >= payload.startDate && fu.RemDate <= payload.endDate);
          }

          followups.forEach(fu => {
            if (leadDetailsMap[fu.LeadID]) {
              fu.CustomerName = leadDetailsMap[fu.LeadID].CustomerName;
              fu.Mobile = leadDetailsMap[fu.LeadID].Mobile;
            }
          });

          followups.sort((a, b) => {
            const dateA = (a.RemDate || '') + ' ' + (a.RemTime || '');
            const dateB = (b.RemDate || '') + ' ' + (b.RemTime || '');
            return dateA.localeCompare(dateB);
          });

          result = followups;
          break;
        }

        case "addFollowUp": {
          const fu = {
            FollowUpID: "FU-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            LeadID: payload.LeadID,
            Date: new Date().toISOString().split('T')[0],
            Time: new Date().toTimeString().split(' ')[0].substring(0, 5),
            Discussion: payload.Discussion,
            Feedback: payload.Feedback || '',
            RemDate: payload.RemDate || '',
            RemTime: payload.RemTime || '',
            Exec: user.EmployeeID,
            Status: payload.Status || 'Completed',
            CreatedAt: new Date().toISOString()
          };
          await supabase.from('FollowUps').insert(fu);
          
          const updateData = { UpdatedAt: new Date().toISOString() };
          if (payload.RemDate) {
            updateData.Remarks = "Reminder: " + payload.RemDate + " " + (payload.RemTime || "");
          }
          await supabase.from('Leads').update(updateData).eq('LeadID', payload.LeadID);
          
          result = fu;
          break;
        }

        case "scheduleFitment": {
          const sch = {
            ScheduleID: "SCH-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            LeadID: payload.LeadID,
            FitmentDate: payload.FitmentDate,
            FitmentTime: payload.FitmentTime,
            Branch: payload.Branch,
            TyreSize: payload.TyreSize,
            Quantity: parseInt(payload.Quantity) || 0,
            ReservedStock: payload.ReservedStock || 'No',
            Exec: user.EmployeeID,
            Remarks: payload.Remarks || '',
            Status: 'Scheduled',
            CreatedAt: new Date().toISOString()
          };
          await supabase.from('ScheduleFitment').insert(sch);
          
          await supabase.from('Leads').update({
            Status: 'Scheduled',
            ExpFitmentDate: payload.FitmentDate,
            UpdatedAt: new Date().toISOString()
          }).eq('LeadID', payload.LeadID);
          
          result = sch;
          break;
        }

        case "revertSchedule": {
          await supabase.from('Leads').update({
            Status: 'Open',
            UpdatedAt: new Date().toISOString()
          }).eq('LeadID', payload.LeadID);
          
          await supabase.from('ScheduleFitment').update({ Status: 'Reverted' }).eq('LeadID', payload.LeadID);
          
          const fuRevert = {
            FollowUpID: "FU-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            LeadID: payload.LeadID,
            Date: new Date().toISOString().split('T')[0],
            Time: new Date().toTimeString().split(' ')[0].substring(0, 5),
            Discussion: "Reverted Schedule: " + payload.Reason,
            RemDate: payload.RemDate,
            RemTime: payload.RemTime,
            Exec: user.EmployeeID,
            Status: 'Pending',
            CreatedAt: new Date().toISOString()
          };
          await supabase.from('FollowUps').insert(fuRevert);
          result = fuRevert;
          break;
        }

        case "markCompleted": {
          const comp = {
            CompID: "COM-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            LeadID: payload.LeadID,
            CompDate: payload.CompDate,
            CompTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
            Branch: payload.Branch || (user.Branches ? user.Branches.split(',')[0].trim() : ''),
            InvoiceNo: payload.InvoiceNo || '',
            Remarks: payload.Remarks || '',
            CreatedAt: new Date().toISOString()
          };
          await supabase.from('Completed').insert(comp);
          
          await supabase.from('Leads').update({
            Status: 'Completed',
            UpdatedAt: new Date().toISOString()
          }).eq('LeadID', payload.LeadID);
          
          result = comp;
          break;
        }

        case "markLost": {
          const lost = {
            LostID: "LST-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
            LeadID: payload.LeadID,
            Reason: payload.Reason,
            Remarks: payload.Remarks || '',
            CreatedAt: new Date().toISOString()
          };
          await supabase.from('Lost').insert(lost);
          
          await supabase.from('Leads').update({
            Status: 'Lost',
            UpdatedAt: new Date().toISOString()
          }).eq('LeadID', payload.LeadID);
          
          result = lost;
          break;
        }

        case "getMasterData": {
          if (payload.type === 'TyreSize') {
            const { data } = await supabase.from('MasterTyreSize').select('*').eq('Active', 'Active');
            result = data || [];
          } else if (payload.type === 'Brand') {
            const { data } = await supabase.from('MasterBrands').select('*').eq('Active', 'Active');
            result = data || [];
          } else if (payload.type === 'Vehicle') {
            const { data } = await supabase.from('MasterVehicle').select('*');
            result = data || [];
          } else {
            result = [];
          }
          break;
        }

        default:
          throw new Error("Invalid action specified: " + action);
      }

      if (showLoading) this.hideLoader();
      
      // Invalidate cache for write operations
      if (['createLead', 'updateLead', 'addFollowUp', 'updateLeadStatus', 'markCompleted', 'updateBranch', 'createBranch', 'updateEmployee', 'createEmployee', 'deleteLead', 'deleteFollowUp', 'scheduleFitment', 'revertSchedule', 'markLost'].includes(action)) {
          this.clearCache();
      }

      return result;

    } catch (error) {
      if (showLoading) this.hideLoader();
      console.error("API Call Error:", error);
      
      // Handle session expiration
      if (error && error.code === 401) {
        Auth.logout(false);
        Swal.fire({
          icon: 'error',
          title: 'Session Expired',
          text: 'Please login again.',
          confirmButtonText: 'OK'
        }).then(() => {
          window.location.href = 'login.html';
        });
        throw new Error('Session Expired');
      }
      
      // Offline support fallback
      if (!bypassQueue && (error instanceof TypeError || !navigator.onLine)) {
        if (['createLead', 'updateLead', 'addFollowUp', 'updateLeadStatus'].includes(action)) {
            console.warn(`[Offline] Queueing ${action} for background sync.`);
            if (typeof CRMDB !== 'undefined') {
                await CRMDB.addSyncTask(action, payload);
                if (typeof SyncEngine !== 'undefined' && !SyncEngine.isSyncing && navigator.onLine) {
                    SyncEngine.processQueue();
                }
                return { _optimistic: true, message: "Saved offline. Will sync when internet returns." };
            }
        }
        throw new Error("Network offline. Please check your connection.");
      }
      
      throw error;
    }
  },
  
  clearCache: async function() {
      // Clear sessionStorage
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('crm_cache_')) {
              keysToRemove.push(key);
          }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
      
      // Clear IndexedDB if available
      if (typeof CRMDB !== 'undefined') {
          try {
              await CRMDB.clearAllCache();
          } catch(e) {
              console.warn("Failed to clear IndexedDB cache", e);
          }
      }
  },

  /**
   * Stale-While-Revalidate (SWR) fetching strategy
   */
  fetchWithCache: async function(action, payload, renderCallback) {
    const cacheKey = "crm_cache_" + action + "_" + JSON.stringify(payload);
    let cachedStr = sessionStorage.getItem(cacheKey);
    let hasRenderedCache = false;
    
    if (typeof CRMDB !== 'undefined') {
        try {
            const dbCache = await CRMDB.getCache(cacheKey);
            if (dbCache) {
                cachedStr = JSON.stringify(dbCache);
            }
        } catch(e) {}
    }
    
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        renderCallback(parsed, false);
        hasRenderedCache = true;
      } catch(e) {
        console.warn("Cache parse error", e);
      }
    } else {
      this.showLoader();
    }
    
    if (navigator.onLine) {
        this.call(action, payload, !hasRenderedCache)
          .then(async (freshData) => {
            const freshStr = JSON.stringify(freshData);
            if (cachedStr !== freshStr) {
              sessionStorage.setItem(cacheKey, freshStr);
              if (typeof CRMDB !== 'undefined') {
                  await CRMDB.setCache(cacheKey, freshData);
              }
              renderCallback(freshData, true);
            }
          })
          .catch(err => {
            console.error("Background fetch failed for", action, err);
          });
    } else {
        if (!hasRenderedCache) {
            this.hideLoader();
            console.warn("Offline and no cache available for", action);
        }
    }
  }
};
