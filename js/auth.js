/**
 * Gugnani Tyres CRM - Authentication Logic
 */

const Auth = {
  
  getUser: function() {
    const userStr = localStorage.getItem('crm_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },
  
  getToken: function() {
    return localStorage.getItem('crm_token');
  },
  
  isLoggedIn: function() {
    return !!this.getToken() && !!this.getUser();
  },
  
  requireLogin: function() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    } else {
      this.updateUI();
    }
  },
  
  requireRole: function(allowedRoles) {
    const user = this.getUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    
    if (allowedRoles.indexOf(user.Role) === -1) {
      Swal.fire('Access Denied', 'You do not have permission to access this page.', 'error')
      .then(() => {
        window.location.href = 'dashboard.html';
      });
      return false;
    }
    return true;
  },
  
  login: async function(mobile, password, remember) {
    try {
      const data = await API.call('login', { mobile, password });
      
      // Save token and user data
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      
      if (remember) {
        // Just setting standard localstorage which persists.
        // If not remember, we could use sessionStorage, but to keep it simple across tabs:
        localStorage.setItem('crm_remember', 'true');
      } else {
        localStorage.removeItem('crm_remember');
      }
      
      window.location.href = 'dashboard.html';
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: error.message
      });
    }
  },
  
  logout: function(redirect = true) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    if (redirect) {
      window.location.href = 'login.html';
    }
  },
  
  updateUI: function() {
    const user = this.getUser();
    if (!user) return;
    
    // Update elements with user info
    const nameEls = document.querySelectorAll('.user-name');
    nameEls.forEach(el => el.textContent = user.Name);
    
    const roleEls = document.querySelectorAll('.user-role');
    roleEls.forEach(el => el.textContent = user.Role);
    
    const branchEls = document.querySelectorAll('.user-branches');
    branchEls.forEach(el => {
       if (user.Role === 'Super Admin') {
         el.textContent = "All Branches";
       } else {
         el.textContent = user.Branches || "No Branch Assigned";
       }
    });
    
    // Hide UI elements based on role
    if (user.Role !== 'Super Admin' && user.Role !== 'Branch Manager') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    if (user.Role === 'Reception') {
      document.querySelectorAll('.no-reception').forEach(el => el.style.display = 'none');
    }
  }
};

// Global Logout Handler
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of the CRM.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: CONFIG.COLORS.primary,
        cancelButtonColor: CONFIG.COLORS.secondary,
        confirmButtonText: 'Yes, logout'
      }).then((result) => {
        if (result.isConfirmed) {
          Auth.logout();
        }
      });
    });
  }
});
