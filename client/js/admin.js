/* ==========================================================================
   Admin Portal Client JavaScript - Startup Pitching Competition 2026
   ========================================================================== */

// Theme Manager (Light / Dark Theme Switcher)
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggleUI(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeToggleUI(newTheme);
}

function updateThemeToggleUI(theme) {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const headerBtn = document.getElementById('theme-toggle-header-btn');

  if (theme === 'dark') {
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span id="theme-toggle-text">Light Mode</span>';
    if (headerBtn) headerBtn.innerHTML = '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>';
  } else {
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span id="theme-toggle-text">Dark Mode</span>';
    if (headerBtn) headerBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});

let currentAdminToken = localStorage.getItem('adminToken') || '';
let selectedTeamForAction = null;

// Helper: Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Check Authentication Status on Page Load
document.addEventListener('DOMContentLoaded', () => {
  if (currentAdminToken) {
    showDashboardView();
  } else {
    showLoginView();
  }
});

function showLoginView() {
  const main = document.getElementById('admin-main-container') || document.querySelector('main.container');
  if (main) {
    main.style.minHeight = 'calc(100vh - 80px)';
    main.style.display = 'flex';
    main.style.alignItems = 'center';
    main.style.justifyContent = 'center';
    main.style.padding = '0';
  }
  document.getElementById('admin-login-view').style.display = 'flex';
  document.getElementById('admin-dashboard-view').style.display = 'none';
  document.getElementById('admin-nav-actions').style.display = 'none';

  // Hide admin-only mobile navigation buttons when unauthenticated
  document.querySelectorAll('.admin-auth-only').forEach(el => {
    el.style.display = 'none';
  });
}

function showDashboardView() {
  const main = document.getElementById('admin-main-container') || document.querySelector('main.container');
  if (main) {
    main.style.minHeight = 'auto';
    main.style.display = 'block';
    main.style.paddingTop = '30px';
    main.style.paddingBottom = '60px';
  }
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'block';
  document.getElementById('admin-nav-actions').style.display = 'flex';

  // Show admin-only mobile navigation buttons when authenticated
  document.querySelectorAll('.admin-auth-only').forEach(el => {
    el.style.display = 'flex';
  });

  const savedAdminUser = localStorage.getItem('adminUser') || 'Admin';
  document.getElementById('admin-user-display').innerHTML = `<i class="fa-solid fa-user-shield"></i> ${savedAdminUser}`;

  loadAdminStats();
  loadTeamsData();
  initAdminSseConnection();
}

// Real-Time Server-Sent Events (SSE) Manager
let adminEventSource = null;

function initAdminSseConnection() {
  if (!currentAdminToken) return;
  if (adminEventSource) {
    adminEventSource.close();
    adminEventSource = null;
  }

  try {
    const sseUrl = `/api/admin/events?token=${encodeURIComponent(currentAdminToken)}`;
    adminEventSource = new EventSource(sseUrl);

    adminEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          console.log('[SSE Admin] Real-time stream connected:', data.message);
          return;
        }

        console.log('[SSE Admin] Live event received:', data.type, data.payload);

        // Visual toast notifications & stat counter pulse animations
        if (data.type === 'team_registered') {
          showToast(`⚡ Live Update: Team "${data.payload.teamName}" registered!`, 'info');
          pulseStatCard('stat-total');
          pulseStatCard('stat-pending');
        } else if (data.type === 'ticket_verified') {
          showToast(`⚡ Live Door Scan: Team "${data.payload.teamName}" checked-in!`, 'success');
          pulseStatCard('stat-checkedin');
        } else if (data.type === 'team_approved') {
          showToast(`⚡ Team "${data.payload.teamName}" approved!`, 'success');
          pulseStatCard('stat-approved');
        } else if (data.type === 'team_rejected') {
          showToast(`⚡ Team "${data.payload.teamName}" rejected.`, 'warning');
          pulseStatCard('stat-rejected');
        } else if (data.type === 'registration_toggled') {
          showToast(`⚡ Global registration status updated!`, 'info');
          fetchRegistrationStatus();
        } else if (data.type === 'team_updated') {
          showToast(`⚡ Submission updated for team "${data.payload.teamName}".`, 'info');
        }

        loadAdminStats();
        loadTeamsData();

      } catch (err) {
        console.warn('[SSE Admin Parse Warning]', err.message);
      }
    };

    adminEventSource.onerror = (err) => {
      console.warn('[SSE Admin Stream Warning] Connection lost. Auto-reconnecting...', err);
    };

  } catch (err) {
    console.error('SSE initialization error:', err);
  }
}

function pulseStatCard(statId) {
  const el = document.getElementById(statId);
  if (!el) return;
  const card = el.closest('.stat-card');
  if (card) {
    card.classList.remove('stat-pulse');
    void card.offsetWidth; // Force reflow
    card.classList.add('stat-pulse');
    setTimeout(() => card.classList.remove('stat-pulse'), 1000);
  }
}

function closeAdminSseConnection() {
  if (adminEventSource) {
    adminEventSource.close();
    adminEventSource = null;
    console.log('[SSE Admin] Stream connection closed.');
  }
}

// Handle Admin Login
async function handleAdminLogin(event) {
  event.preventDefault();

  const usernameOrEmail = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const submitBtn = document.getElementById('login-submit-btn');

  if (!usernameOrEmail || !password) {
    showToast('Please enter username/email and password', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    });

    const result = await response.json();

    if (result.success) {
      currentAdminToken = result.token;
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('adminUser', result.admin.username);
      if (result.admin.email) localStorage.setItem('adminEmail', result.admin.email);
      showToast('Admin authenticated successfully!', 'success');
      showDashboardView();
    } else {
      showToast(result.message || 'Invalid admin credentials', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Network error during login authentication', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Login to Dashboard`;
  }
}

// Handle Admin Logout
function handleAdminLogout() {
  closeAdminSseConnection();
  currentAdminToken = '';
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  showToast('Logged out of Admin Portal', 'info');
  showLoginView();
}

// Fetch Admin Dashboard Statistics
async function loadAdminStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    if (response.status === 401) {
      handleAdminLogout();
      return;
    }

    const result = await response.json();
    if (result.success) {
      document.getElementById('stat-total').textContent = result.data.total;
      document.getElementById('stat-pending').textContent = result.data.pending;
      document.getElementById('stat-approved').textContent = result.data.approved;
      document.getElementById('stat-rejected').textContent = result.data.rejected;
      const checkedInEl = document.getElementById('stat-checkedin');
      if (checkedInEl) checkedInEl.textContent = result.data.checkedIn || 0;

      fetchRegistrationStatus();

      // Fetch teams to count checked-in teams
      const teamsRes = await fetch('/api/admin/teams', {
        headers: { 'Authorization': `Bearer ${currentAdminToken}` }
      });
      const teamsData = await teamsRes.json();
      if (teamsData.success) {
        const checkedInCount = teamsData.data.filter(t => t.checkedIn).length;
        const checkedInEl = document.getElementById('stat-checkedin');
        if (checkedInEl) checkedInEl.textContent = checkedInCount;
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Fetch and Toggle Global Registration Status (Open / Closed)
async function fetchRegistrationStatus() {
  try {
    const res = await fetch('/api/admin/registration-status');
    const data = await res.json();
    if (data.success) {
      updateRegistrationToggleUI(data.isOpen);
    }
  } catch (err) {
    console.error('Failed to fetch registration status:', err);
  }
}

function updateRegistrationToggleUI(isOpen) {
  const btn = document.getElementById('reg-toggle-btn');
  if (!btn) return;

  if (isOpen) {
    btn.style.background = 'var(--accent-emerald)';
    btn.style.borderColor = 'var(--accent-emerald)';
    btn.innerHTML = `<i class="fa-solid fa-circle-dot"></i> <span id="reg-toggle-text">Registration: OPEN</span>`;
  } else {
    btn.style.background = 'var(--accent-rose)';
    btn.style.borderColor = 'var(--accent-rose)';
    btn.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span id="reg-toggle-text">Registration: CLOSED</span>`;
  }
}

async function toggleRegistrationStatus() {
  try {
    const btn = document.getElementById('reg-toggle-btn');
    const currentlyOpen = btn ? btn.innerHTML.includes('OPEN') : true;
    const nextState = !currentlyOpen;

    const response = await fetch('/api/admin/toggle-registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ isOpen: nextState })
    });

    const result = await response.json();
    if (result.success) {
      updateRegistrationToggleUI(result.isOpen);
      showToast(result.message, result.isOpen ? 'success' : 'warning');
    }
  } catch (err) {
    console.error('Toggle registration error:', err);
    showToast('Failed to toggle registration status', 'error');
  }
}

function filterByCard(statusValue) {
  const select = document.getElementById('filter-status');
  if (select) {
    select.value = statusValue;
    loadTeamsData();
  }
}

// Fetch Teams Data with Search and Filters
async function loadTeamsData() {
  const search = document.getElementById('filter-search').value.trim();
  const status = document.getElementById('filter-status').value;
  const department = document.getElementById('filter-dept').value;
  const year = document.getElementById('filter-year').value;
  const tbody = document.getElementById('teams-table-body');
  const countLabel = document.getElementById('teams-count-label');

  const queryParams = new URLSearchParams({
    search,
    status: status === 'CheckedIn' ? 'All' : status,
    department,
    year
  });

  try {
    const response = await fetch(`/api/admin/teams?${queryParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    if (response.status === 401) {
      handleAdminLogout();
      return;
    }

    const result = await response.json();

    if (result.success) {
      let filteredData = result.data;
      if (status === 'CheckedIn') {
        filteredData = filteredData.filter(t => t.checkedIn);
      }

      countLabel.textContent = `Showing ${filteredData.length} team registrations`;
      const mobileList = document.getElementById('mobile-teams-list');

      if (filteredData.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px;">
              No team registrations found matching current filters.
            </td>
          </tr>
        `;
        if (mobileList) {
          mobileList.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 30px;">
              No team registrations found matching current filters.
            </div>
          `;
        }
        return;
      }

      tbody.innerHTML = filteredData.map(team => {
        let badgeClass = 'badge-pending';
        let statusIcon = 'fa-clock';
        if (team.status === 'Approved') {
          badgeClass = 'badge-approved';
          statusIcon = 'fa-circle-check';
        } else if (team.status === 'Rejected') {
          badgeClass = 'badge-rejected';
          statusIcon = 'fa-circle-xmark';
        }

        const dateStr = new Date(team.submittedAt).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const checkInBadge = team.checkedIn ? `
          <div style="margin-top: 4px;">
            <span class="badge badge-approved" style="font-size: 11px; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); border-color: var(--accent-emerald);">
              <i class="fa-solid fa-qrcode"></i> Present (${new Date(team.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          </div>
        ` : '';

        const lastLog = (team.emailLogs && team.emailLogs.length > 0) ? team.emailLogs[team.emailLogs.length - 1] : null;
        let emailBadge = `<span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-envelope"></i> None</span>`;
        if (lastLog) {
          if (lastLog.status === 'Sent') {
            emailBadge = `<span class="badge" style="font-size: 11px; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: var(--accent-emerald);" title="Sent via ${lastLog.provider || 'Direct'} at ${new Date(lastLog.sentAt).toLocaleTimeString()}"><i class="fa-solid fa-circle-check"></i> Sent (${lastLog.provider || 'Direct'})</span>`;
          } else if (lastLog.status === 'Failed') {
            emailBadge = `<span class="badge" style="font-size: 11px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--accent-rose); color: var(--accent-rose);" title="Error: ${lastLog.error || 'Delivery Error'}"><i class="fa-solid fa-circle-xmark"></i> Failed</span>`;
          }
        }

        return `
          <tr>
            <td style="font-weight: 700; color: var(--text-primary);">${team.teamName}</td>
            <td style="color: var(--accent-terracotta); font-weight: 600;">${team.startupName || team.teamName}</td>
            <td>
              <div style="font-weight: 600;">${team.leader.name}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${team.leader.registerNumber} • ${team.leader.phone}</div>
            </td>
            <td>${team.leader.department}<br><span style="font-size: 12px; color: var(--accent-terracotta);">${team.leader.year}</span></td>
            <td><span style="color: var(--accent-terracotta); font-weight: 600;">${team.innovationDomain}</span></td>
            <td style="font-size: 13px; color: var(--text-secondary);">${dateStr}</td>
            <td>${emailBadge}</td>
            <td>
              <span class="badge ${badgeClass}">
                <i class="fa-solid ${statusIcon}"></i> ${team.status}
              </span>
              ${checkInBadge}
            </td>
            <td>
              <button class="btn-secondary" style="padding: 6px 14px; font-size: 13px;" onclick="openTeamDetailsModal('${team._id}')">
                <i class="fa-solid fa-eye"></i> View Details
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Populate Touch Mobile Team Cards View (< 768px)
      if (mobileList) {
        mobileList.innerHTML = filteredData.map(team => {
          const dateStr = new Date(team.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          let badgeClass = 'badge-pending';
          let statusIcon = 'fa-hourglass-half';
          if (team.status === 'Approved') { badgeClass = 'badge-approved'; statusIcon = 'fa-circle-check'; }
          else if (team.status === 'Rejected') { badgeClass = 'badge-rejected'; statusIcon = 'fa-circle-xmark'; }
          const checkInBadge = team.checkedIn ? `<span class="badge badge-approved" style="font-size: 10px; padding: 2px 6px;"><i class="fa-solid fa-qrcode"></i> Present</span>` : '';
          
          return `
            <div class="mobile-team-card">
              <div class="mobile-team-header">
                <div>
                  <div class="mobile-team-name">${team.teamName}</div>
                  <div class="mobile-startup-name">${team.startupName || team.teamName}</div>
                </div>
                <span class="badge ${badgeClass}" style="font-size: 11px;">
                  <i class="fa-solid ${statusIcon}"></i> ${team.status}
                </span>
              </div>

              <div class="mobile-team-meta">
                <div><strong>Leader:</strong> ${team.leader.name} (${team.leader.registerNumber})</div>
                <div><strong>Dept/Year:</strong> ${team.leader.department} • ${team.leader.year}</div>
                <div><strong>Domain:</strong> <span style="color: var(--accent-terracotta);">${team.innovationDomain}</span> • ${dateStr}</div>
                ${checkInBadge ? `<div><strong>Auditorium Scan:</strong> ${checkInBadge}</div>` : ''}
              </div>

              <button type="button" class="btn-primary" style="width: 100%; padding: 9px; font-size: 13px; justify-content: center; font-weight: 600;" onclick="openTeamDetailsModal('${team._id}')">
                <i class="fa-solid fa-eye"></i> View Verification Details
              </button>
            </div>
          `;
        }).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load teams:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--accent-rose); padding: 20px;">
          Error loading teams dataset.
        </td>
      </tr>
    `;
  }
}

// Open Team Details Modal
async function openTeamDetailsModal(teamId) {
  try {
    const response = await fetch(`/api/admin/teams/${teamId}`, {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    const result = await response.json();
    if (!result.success) {
      showToast('Could not fetch team details', 'error');
      return;
    }

    const team = result.data;
    selectedTeamForAction = team;

    document.getElementById('modal-team-title').textContent = `Verification: ${team.teamName}`;

    let membersHtml = '';
    if (team.members && team.members.length > 0) {
      membersHtml = team.members.map((m, idx) => `
        <div style="background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-md); margin-top: 8px;">
          <div style="font-weight: 600; color: var(--accent-terracotta);">Member ${idx + 2}: ${m.name}</div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            Reg No: ${m.registerNumber || 'N/A'} | Dept: ${m.department || 'N/A'} | Year: ${m.year || 'N/A'}
          </div>
        </div>
      `).join('');
    } else {
      membersHtml = `<div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Single member team (Leader only).</div>`;
    }

    let pptUrl = (team.pptFile || '').replace(/\\/g, '/');
    if (pptUrl && !pptUrl.startsWith('/') && !pptUrl.startsWith('http')) pptUrl = '/' + pptUrl;

    let screenshotUrl = (team.eurekaScreenshot || '').replace(/\\/g, '/');
    if (screenshotUrl && !screenshotUrl.startsWith('/') && !screenshotUrl.startsWith('http')) screenshotUrl = '/' + screenshotUrl;

    const modalContent = document.getElementById('modal-team-content');
    modalContent.innerHTML = `
      <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
        
        <!-- Leader Info -->
        <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--accent-terracotta); margin-bottom: 10px;"><i class="fa-solid fa-user-astronaut"></i> Leader Details</h4>
          <div style="font-size: 14px; margin-bottom: 4px;"><strong>Name:</strong> ${team.leader.name}</div>
          <div style="font-size: 14px; margin-bottom: 4px;"><strong>Register No:</strong> ${team.leader.registerNumber}</div>
          <div style="font-size: 14px; margin-bottom: 4px;"><strong>Department:</strong> ${team.leader.department}</div>
          <div style="font-size: 14px; margin-bottom: 4px;"><strong>Year:</strong> ${team.leader.year}</div>
          <div style="font-size: 14px; margin-bottom: 4px;"><strong>Email:</strong> ${team.leader.email}</div>
          <div style="font-size: 14px;"><strong>Phone:</strong> ${team.leader.phone}</div>
        </div>

        <!-- Team Members -->
        <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--accent-terracotta); margin-bottom: 10px;"><i class="fa-solid fa-users"></i> Team Members</h4>
          ${membersHtml}
        </div>

      </div>

      <!-- Domain & Pitch Details -->
      <div style="margin-bottom: 20px;">
        <h4 style="color: var(--text-primary); font-size: 16px; margin-bottom: 6px;">Startup Name (Project Name): <span style="color: var(--accent-terracotta); font-weight: 700;">${team.startupName || team.teamName}</span></h4>
        <h5 style="color: var(--text-secondary); margin-bottom: 12px;">Team Name: <span style="color: var(--text-primary); font-weight: 600;">${team.teamName}</span> | Innovation Domain: <span style="color: var(--accent-terracotta); font-weight: 600;">${team.innovationDomain}</span></h5>
        <div style="margin-bottom: 14px;">
          <h5 style="color: var(--text-secondary); margin-bottom: 4px;">Problem Statement:</h5>
          <p style="font-size: 14px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">${team.problemStatement}</p>
        </div>
        <div style="margin-bottom: 14px;">
          <h5 style="color: var(--text-secondary); margin-bottom: 4px;">Abstract (Max 300 words):</h5>
          <p style="font-size: 14px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); line-height: 1.6;">${team.abstract}</p>
        </div>
      </div>

      <!-- Files Inspection & Verification Area -->
      <div style="background: rgba(14, 165, 233, 0.05); border: 1px solid rgba(14, 165, 233, 0.2); padding: 18px; border-radius: var(--radius-lg); margin-bottom: 16px;">
        <h4 style="color: var(--accent-cyan); margin-bottom: 14px; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-folder-open"></i> Submissions & Eureka Verification
        </h4>

        <!-- 2-Column Grid for Files -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px;">
          
          <!-- File Card 1: Pitch Deck -->
          <div style="background: var(--bg-card, rgba(15, 23, 42, 0.6)); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                <i class="fa-solid fa-file-powerpoint"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Presentation Pitch Deck</div>
                <div style="font-size: 11px; color: var(--text-muted);">PPT / PPTX Document</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn-primary" style="flex: 1; padding: 7px 10px; font-size: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 600; justify-content: center;" onclick="openMediaPreview('${pptUrl}', 'Pitch Deck - ${encodeURIComponent(team.teamName)}', 'ppt')">
                <i class="fa-solid fa-eye"></i> Preview
              </button>
              <a href="${pptUrl}" target="_blank" download class="btn-secondary" style="padding: 7px 12px; font-size: 12px; text-decoration: none; justify-content: center;" title="Download PPT File">
                <i class="fa-solid fa-download"></i>
              </a>
            </div>
          </div>

          <!-- File Card 2: Eureka Proof -->
          <div style="background: var(--bg-card, rgba(15, 23, 42, 0.6)); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(14, 165, 233, 0.15); color: var(--accent-cyan); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                <i class="fa-solid fa-file-image"></i>
              </div>
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Eureka Proof Screenshot</div>
                <div style="font-size: 11px; color: var(--text-muted);">PNG / JPG / PDF Verification</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn-primary" style="flex: 1; padding: 7px 10px; font-size: 12px; font-weight: 600; justify-content: center;" onclick="openMediaPreview('${screenshotUrl}', 'Eureka Proof - ${encodeURIComponent(team.teamName)}', 'image')">
                <i class="fa-solid fa-expand"></i> Preview
              </button>
              <a href="${screenshotUrl}" target="_blank" class="btn-secondary" style="padding: 7px 12px; font-size: 12px; text-decoration: none; border-color: var(--accent-cyan); justify-content: center;" title="Open Raw File in New Tab">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </div>

        </div>

        <!-- Action Toolbar Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px;">
          <div style="font-size: 12px; color: var(--text-muted); flex: 1; min-width: 200px;">
            <i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i> Verify referral code <strong>NEC2621509</strong> before approving.
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; border-color: var(--accent-terracotta); color: var(--accent-terracotta);" onclick="triggerManualBackupEmail('${team._id}')" title="Send backup email with attachments to organizer email">
              <i class="fa-solid fa-envelope"></i> Send Backup Email
            </button>
            ${team.status === 'Approved' ? `
              <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; border-color: var(--accent-emerald); color: var(--accent-emerald);" onclick="handleApproveTeam()" title="Resend Approval QR Pass Email">
                <i class="fa-solid fa-qrcode"></i> Resend Pass
              </button>
            ` : ''}
            <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; border-color: var(--accent-rose); color: var(--accent-rose);" onclick="triggerDeleteTeam('${team._id}', '${encodeURIComponent(team.teamName)}')">
              <i class="fa-solid fa-trash-can"></i> Delete
        </div>
      </div>

      <!-- Email Delivery History Logs -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <h5 style="color: var(--accent-cyan); margin-bottom: 10px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-paper-plane"></i> Email Dispatch & Delivery Logs (${(team.emailLogs || []).length})
        </h5>
        ${(team.emailLogs && team.emailLogs.length > 0) ? team.emailLogs.map(log => `
          <div style="font-size: 12px; display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
            <span>
              <i class="fa-solid ${log.status === 'Sent' ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color: ${log.status === 'Sent' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; margin-right: 6px;"></i>
              <strong>${log.emailType || 'Email'}</strong> to <span style="color: var(--text-primary);">${log.recipient}</span>
            </span>
            <span style="color: var(--text-muted); font-size: 11px;">
              ${log.status === 'Sent' ? `<span style="color: var(--accent-emerald);">Sent (${log.provider || 'Direct'})</span>` : `<span style="color: var(--accent-rose);">Failed: ${log.error || 'Error'}</span>`}
              • ${new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        `).join('') : '<div style="font-size: 12px; color: var(--text-muted);">No email dispatch logs recorded yet for this team.</div>'}
      </div>

      ${team.status === 'Rejected' && team.rejectionReason ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 14px; border-radius: var(--radius-md);">
          <div style="font-weight: 700; color: var(--accent-rose); font-size: 13px;">Current Rejection Reason:</div>
          <p style="font-size: 14px;">${team.rejectionReason}</p>
        </div>
      ` : ''}
    `;

    document.getElementById('team-details-modal').classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

  } catch (error) {
    console.error('Modal error:', error);
    showToast('Failed to open team details', 'error');
  }
}

function closeTeamDetailsModal() {
  document.getElementById('team-details-modal').classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }
  selectedTeamForAction = null;
}

// In-Browser Media & Document Previewer Lightbox
function openMediaPreview(fileUrl, titleStr, overrideType = null) {
  const modal = document.getElementById('doc-preview-modal');
  const titleEl = document.getElementById('doc-preview-title');
  const downloadBtn = document.getElementById('doc-preview-download-btn');
  const bodyEl = document.getElementById('doc-preview-body');

  if (!modal || !bodyEl) return;

  const decodedTitle = decodeURIComponent(titleStr || 'Document Preview');
  titleEl.innerHTML = `<i class="fa-solid fa-eye"></i> ${decodedTitle}`;
  downloadBtn.href = fileUrl;

  const urlLower = (fileUrl || '').toLowerCase();
  let type = overrideType;

  if (!type) {
    if (urlLower.endsWith('.png') || urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || urlLower.endsWith('.webp')) {
      type = 'image';
    } else if (urlLower.endsWith('.pdf')) {
      type = 'pdf';
    } else if (urlLower.endsWith('.ppt') || urlLower.endsWith('.pptx')) {
      type = 'ppt';
    } else {
      type = 'unknown';
    }
  }

  bodyEl.innerHTML = '';

  if (type === 'image') {
    bodyEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
        <img src="${fileUrl}" alt="Preview" style="max-width: 100%; max-height: 65vh; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.8); object-fit: contain;">
      </div>
    `;
  } else if (type === 'pdf') {
    bodyEl.innerHTML = `
      <iframe src="${fileUrl}" style="width: 100%; height: 65vh; border: none; border-radius: 8px; background: #ffffff;"></iframe>
    `;
  } else if (type === 'ppt') {
    const fullHttpUrl = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;
    bodyEl.innerHTML = `
      <div style="width: 100%; text-align: center;">
        <div style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
          <i class="fa-solid fa-file-powerpoint" style="color: var(--accent-amber);"></i> Embedded Pitch Deck Viewer
        </div>
        <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(fullHttpUrl)}&embedded=true" style="width: 100%; height: 60vh; border: none; border-radius: 8px; background: #ffffff;"></iframe>
        <div style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">
          Note: Local development PPT previews fallback to <a href="${fileUrl}" download style="color: var(--accent-cyan);">Direct Download</a> if Google Docs cannot access localhost.
        </div>
      </div>
    `;
  } else {
    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <i class="fa-solid fa-file-lines" style="font-size: 48px; color: var(--accent-cyan); margin-bottom: 16px;"></i>
        <p style="font-size: 15px; color: var(--text-primary); margin-bottom: 16px;">Preview unavailable for this file format.</p>
        <a href="${fileUrl}" download class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-download"></i> Download File
        </a>
      </div>
    `;
  }

  modal.classList.add('active');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeMediaPreview() {
  const modal = document.getElementById('doc-preview-modal');
  if (modal) {
    modal.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }
}

function openImageLightbox(imageUrl, title) {
  openMediaPreview(imageUrl, title, 'image');
}

function closeImageLightbox() {
  closeMediaPreview();
}

// Backup Email Dispatch Functions
async function triggerManualBackupEmail(teamId) {
  try {
    showToast('Dispatching backup email with PPT and Screenshot attachments...', 'info');
    const response = await fetch(`/api/admin/teams/${teamId}/send-backup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const result = await response.json();
    if (result.success) {
      showToast(result.message || 'Backup email sent to for12345freelancing@gmail.com', 'success');
    } else {
      showToast(result.message || 'Failed to send backup email', 'error');
    }
  } catch (err) {
    console.error('Backup email dispatch error:', err);
    showToast('Network error dispatching backup email', 'error');
  }
}

async function triggerSendAllBackups() {
  if (!confirm('Send PPT + Screenshot backup emails for ALL registered teams to for12345freelancing@gmail.com?')) return;

  try {
    showToast('Starting bulk backup email dispatch...', 'info');
    const response = await fetch('/api/admin/send-all-backups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const result = await response.json();
    if (result.success) {
      showToast(result.message || `Backup emails dispatched for ${result.count} team(s)!`, 'success');
    } else {
      showToast(result.message || 'Failed to dispatch bulk backup emails', 'error');
    }
  } catch (err) {
    console.error('Send all backups error:', err);
    showToast('Network error dispatching bulk backup emails', 'error');
  }
}

async function triggerDeleteTeam(teamId, encodedTeamName) {
  const teamName = decodeURIComponent(encodedTeamName || '');
  if (!confirm(`Are you sure you want to PERMANENTLY DELETE team "${teamName}"? This action cannot be undone.`)) return;

  try {
    showToast('Deleting team registration...', 'info');
    const response = await fetch(`/api/admin/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const result = await response.json();
    if (result.success) {
      showToast(result.message || 'Team deleted successfully', 'success');
      closeTeamDetailsModal();
      loadAdminStats();
      loadTeamsData();
    } else {
      showToast(result.message || 'Failed to delete team', 'error');
    }
  } catch (err) {
    console.error('Delete team error:', err);
    showToast('Network error deleting team', 'error');
  }
}

async function triggerClearAllTeams() {
  const confirmText = prompt('WARNING: You are about to DELETE ALL REGISTERED TEAMS!\n\nType DELETE to confirm clearing all registration data:');
  if (!confirmText || confirmText.trim().toUpperCase() !== 'DELETE') {
    showToast('Action cancelled', 'info');
    return;
  }

  try {
    showToast('Clearing all registered teams...', 'info');
    const response = await fetch('/api/admin/clear-all-teams', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const result = await response.json();
    if (result.success) {
      showToast(result.message || 'All registration data cleared successfully!', 'success');
      loadAdminStats();
      loadTeamsData();
    } else {
      showToast(result.message || 'Failed to clear registrations', 'error');
    }
  } catch (err) {
    console.error('Clear all teams error:', err);
    showToast('Network error clearing registrations', 'error');
  }
}



// Approve Team Handler
async function handleApproveTeam() {
  if (!selectedTeamForAction) return;

  const teamId = selectedTeamForAction._id;
  const approveBtn = document.getElementById('modal-approve-btn');

  approveBtn.disabled = true;
  approveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Approving...`;

  try {
    const response = await fetch(`/api/admin/teams/${teamId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    const result = await response.json();

    if (result.success) {
      showToast(`Team "${selectedTeamForAction.teamName}" Approved! Approval email dispatched.`, 'success');
      closeTeamDetailsModal();
      loadAdminStats();
      loadTeamsData();
    } else {
      showToast(result.message || 'Failed to approve team', 'error');
    }
  } catch (error) {
    console.error('Approve error:', error);
    showToast('Network error while approving team', 'error');
  } finally {
    approveBtn.disabled = false;
    approveBtn.innerHTML = `<i class="fa-solid fa-check"></i> Approve Team`;
  }
}

// Rejection Modal Handlers
function openRejectReasonModal() {
  document.getElementById('reject-reason-modal').classList.add('active');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeRejectReasonModal() {
  document.getElementById('reject-reason-modal').classList.remove('active');
  document.getElementById('rejection-reason-text').value = '';
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }
}

async function confirmRejectTeam() {
  if (!selectedTeamForAction) return;

  const reason = document.getElementById('rejection-reason-text').value.trim();
  if (!reason) {
    showToast('Please provide a reason for rejecting the application.', 'warning');
    return;
  }

  const teamId = selectedTeamForAction._id;
  const rejectBtn = document.getElementById('confirm-reject-btn');

  if (rejectBtn) {
    rejectBtn.disabled = true;
    rejectBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...`;
  }

  try {
    const response = await fetch(`/api/admin/teams/${teamId}/reject`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    const result = await response.json();

    if (result.success) {
      showToast(`Team "${selectedTeamForAction.teamName}" Rejected. Rejection email sent.`, 'info');
      closeRejectReasonModal();
      closeTeamDetailsModal();
      loadAdminStats();
      loadTeamsData();
    } else {
      showToast(result.message || 'Failed to reject team', 'error');
    }
  } catch (error) {
    console.error('Reject error:', error);
    showToast('Network error while rejecting team', 'error');
  } finally {
    if (rejectBtn) {
      rejectBtn.disabled = false;
      rejectBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Confirm Rejection`;
    }
  }
}

// Export CSV Data Handler
async function exportRegistrationsCsv() {
  if (!currentAdminToken) {
    showToast('Admin authorization required', 'error');
    return;
  }

  showToast('Preparing CSV export...', 'info');

  try {
    const response = await fetch('/api/admin/export-csv', {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });

    if (!response.ok) {
      showToast('Failed to download CSV data', 'error');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'E-Cell_Startup_Registrations_2026.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast('Registrations exported to CSV successfully!', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Network error during CSV export', 'error');
  }
}

/* ==========================================================================
   PASSWORD MANAGEMENT & SECURITY CONTROLS
   ========================================================================== */

// Toggle Password Field Visibility (Show/Hide)
function togglePasswordVisibility(inputId, iconId) {
  const inputEl = document.getElementById(inputId);
  const iconEl = document.getElementById(iconId);
  if (!inputEl || !iconEl) return;

  if (inputEl.type === 'password') {
    inputEl.type = 'text';
    iconEl.className = 'fa-solid fa-eye-slash';
  } else {
    inputEl.type = 'password';
    iconEl.className = 'fa-solid fa-eye';
  }
}

// Open Edit Credentials Modal
function openEditCredentialsModal() {
  const modal = document.getElementById('edit-credentials-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.getElementById('edit-credentials-form').reset();

    const savedUser = localStorage.getItem('adminUser') || 'admin';
    const savedEmail = localStorage.getItem('adminEmail') || 'admin@ecell.edu';

    const usernameInput = document.getElementById('editAdminUsername');
    const emailInput = document.getElementById('editAdminEmail');
    if (usernameInput) usernameInput.value = savedUser;
    if (emailInput) emailInput.value = savedEmail;

    const strengthBox = document.getElementById('password-strength-box');
    if (strengthBox) strengthBox.style.display = 'none';

    ['req-length', 'req-uppercase', 'req-number', 'req-symbol'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'password-req-item';
        const icon = el.querySelector('i');
        if (icon) icon.className = 'fa-solid fa-circle-dot';
      }
    });

    const confirmMsg = document.getElementById('confirm-password-msg');
    if (confirmMsg) confirmMsg.style.display = 'none';
  }
}

// Close Edit Credentials Modal
function closeEditCredentialsModal() {
  const modal = document.getElementById('edit-credentials-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }
}

// Real-Time Password Strength Checker
function checkPasswordStrength() {
  const val = document.getElementById('newAdminPassword').value;
  const strengthBox = document.getElementById('password-strength-box');
  const strengthText = document.getElementById('password-strength-text');
  const strengthFill = document.getElementById('password-strength-fill');

  if (!val) {
    if (strengthBox) strengthBox.style.display = 'none';
    updateReqStatus('req-length', false);
    updateReqStatus('req-uppercase', false);
    updateReqStatus('req-number', false);
    updateReqStatus('req-symbol', false);
    return;
  }

  if (strengthBox) strengthBox.style.display = 'flex';

  const hasLength = val.length >= 8;
  const hasUppercase = /[A-Z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  const hasSymbol = /[^A-Za-z0-9]/.test(val);

  updateReqStatus('req-length', hasLength);
  updateReqStatus('req-uppercase', hasUppercase);
  updateReqStatus('req-number', hasNumber);
  updateReqStatus('req-symbol', hasSymbol);

  const passedCount = [hasLength, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length;

  if (passedCount <= 2) {
    if (strengthText) {
      strengthText.textContent = 'Weak';
      strengthText.style.color = 'var(--accent-rose)';
    }
    if (strengthFill) strengthFill.className = 'password-strength-fill strength-weak';
  } else if (passedCount === 3) {
    if (strengthText) {
      strengthText.textContent = 'Medium';
      strengthText.style.color = 'var(--accent-amber)';
    }
    if (strengthFill) strengthFill.className = 'password-strength-fill strength-medium';
  } else {
    if (strengthText) {
      strengthText.textContent = 'Strong';
      strengthText.style.color = 'var(--accent-emerald)';
    }
    if (strengthFill) strengthFill.className = 'password-strength-fill strength-strong';
  }

  checkPasswordMatch();
}

function updateReqStatus(reqId, isValid) {
  const el = document.getElementById(reqId);
  if (!el) return;
  const icon = el.querySelector('i');
  if (isValid) {
    el.classList.add('valid');
    if (icon) icon.className = 'fa-solid fa-circle-check';
  } else {
    el.classList.remove('valid');
    if (icon) icon.className = 'fa-solid fa-circle-dot';
  }
}

// Check Confirm Password Match
function checkPasswordMatch() {
  const newPass = document.getElementById('newAdminPassword').value;
  const confirmPass = document.getElementById('confirmAdminPassword').value;
  const confirmMsg = document.getElementById('confirm-password-msg');

  if (!confirmPass) {
    if (confirmMsg) confirmMsg.style.display = 'none';
    return;
  }

  if (confirmMsg) {
    confirmMsg.style.display = 'block';
    if (newPass === confirmPass) {
      confirmMsg.textContent = '✓ Passwords match';
      confirmMsg.style.color = 'var(--accent-emerald)';
    } else {
      confirmMsg.textContent = '✗ Passwords do not match';
      confirmMsg.style.color = 'var(--accent-rose)';
    }
  }
}

// Handle Admin Credentials & Password Update Submission
async function handleAdminUpdateCredentials(event) {
  event.preventDefault();

  const currentPassword = document.getElementById('currentAdminPassword').value;
  const username = document.getElementById('editAdminUsername').value.trim();
  const email = document.getElementById('editAdminEmail').value.trim();
  const newPassword = document.getElementById('newAdminPassword').value;
  const confirmPassword = document.getElementById('confirmAdminPassword').value;
  const submitBtn = document.getElementById('edit-cred-submit-btn');

  if (!currentPassword || !username || !email) {
    showToast('Current password, username, and email are required', 'warning');
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'warning');
    return;
  }

  if (newPassword && newPassword.length < 8) {
    showToast('New password must be at least 8 characters long', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const response = await fetch('/api/admin/update-credentials', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ currentPassword, username, email, newPassword })
    });

    const result = await response.json();

    if (result.success) {
      currentAdminToken = result.token;
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('adminUser', result.admin.username);
      localStorage.setItem('adminEmail', result.admin.email);

      const userDisplay = document.getElementById('admin-user-display');
      if (userDisplay) {
        userDisplay.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${result.admin.username}`;
      }

      showToast(result.message || 'Admin credentials updated successfully!', 'success');
      closeEditCredentialsModal();
    } else {
      showToast(result.message || 'Failed to update admin credentials', 'error');
    }
  } catch (error) {
    console.error('Update credentials error:', error);
    showToast('Network error while updating credentials', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Credentials`;
  }
}

// Open Image / Document Lightbox Preview Modal
function openImageLightbox(fileUrl, title = 'Eureka Screenshot Proof') {
  const modal = document.getElementById('image-lightbox-modal');
  const bodyContent = document.getElementById('lightbox-body-content');
  const titleEl = document.getElementById('lightbox-title');
  if (!modal || !bodyContent) return;

  if (titleEl) titleEl.textContent = decodeURIComponent(title);

  if (!fileUrl) {
    showToast('No screenshot file path recorded for this submission.', 'warning');
    return;
  }

  // Normalize Windows backslashes to forward slashes and ensure proper path prefix
  let cleanUrl = String(fileUrl).replace(/\\/g, '/');
  if (!cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
    cleanUrl = '/' + cleanUrl;
  }

  const isPdf = cleanUrl.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    bodyContent.innerHTML = `
      <iframe src="${cleanUrl}" style="width: 100%; height: 70vh; border: none; border-radius: var(--radius-md);"></iframe>
    `;
  } else {
    bodyContent.innerHTML = `
      <div style="text-align: center; width: 100%;">
        <img src="${cleanUrl}" alt="Eureka Verification Proof" id="lightbox-image" style="max-width: 100%; max-height: 72vh; border-radius: var(--radius-md); object-fit: contain;">
        <div style="margin-top: 14px;">
          <a href="${cleanUrl}" target="_blank" download class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; width: auto; padding: 8px 20px; font-size: 13px; text-decoration: none;">
            <i class="fa-solid fa-download"></i> Download Full Resolution File
          </a>
        </div>
      </div>
    `;
  }

  modal.classList.add('active');
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeImageLightbox(event) {
  const modal = document.getElementById('image-lightbox-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }
}

/* ==========================================================================
   AUDITORIUM ENTRY QR SCANNER & TICKET VERIFICATION CONTROLS
   ========================================================================== */
let html5QrCodeScanner = null;

function switchScannerTab(tabName) {
  const cameraView = document.getElementById('scanner-view-camera');
  const uploadView = document.getElementById('scanner-view-upload');
  const manualView = document.getElementById('scanner-view-manual');

  const tabCamera = document.getElementById('scanner-tab-camera');
  const tabUpload = document.getElementById('scanner-tab-upload');
  const tabManual = document.getElementById('scanner-tab-manual');

  if (tabCamera) tabCamera.classList.remove('active');
  if (tabUpload) tabUpload.classList.remove('active');
  if (tabManual) tabManual.classList.remove('active');

  if (cameraView) cameraView.style.display = 'none';
  if (uploadView) uploadView.style.display = 'none';
  if (manualView) manualView.style.display = 'none';

  if (tabName === 'camera') {
    if (tabCamera) tabCamera.classList.add('active');
    if (cameraView) cameraView.style.display = 'block';
    startLiveQrScanner();
  } else if (tabName === 'upload') {
    if (tabUpload) tabUpload.classList.add('active');
    if (uploadView) uploadView.style.display = 'block';
    stopLiveQrScanner();
  } else if (tabName === 'manual') {
    if (tabManual) tabManual.classList.add('active');
    if (manualView) manualView.style.display = 'block';
    stopLiveQrScanner();
  }
}

function openQrScannerModal() {
  const modal = document.getElementById('qr-scanner-modal');
  const resultBox = document.getElementById('qr-scan-result');
  if (!modal) return;

  modal.classList.add('active');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  if (resultBox) resultBox.style.display = 'none';

  switchScannerTab('camera');
}

function closeQrScannerModal() {
  const modal = document.getElementById('qr-scanner-modal');
  if (modal) {
    modal.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }
  stopLiveQrScanner();
}

async function startLiveQrScanner() {
  const container = document.getElementById('qr-reader-container');
  if (!container) return;

  stopLiveQrScanner();
  container.innerHTML = `<div id="qr-reader" style="width: 100%;"></div>`;

  if (typeof Html5Qrcode === 'undefined') {
    container.innerHTML = `
      <div style="padding: 24px; color: var(--text-primary); font-size: 13px; text-align: center;">
        <i class="fa-solid fa-camera" style="font-size: 32px; margin-bottom: 8px; color: var(--accent-terracotta);"></i>
        <p style="margin-bottom: 8px;">Scanner library loading...</p>
        <p style="color: var(--text-secondary); font-size: 12px;">Use <strong>Upload Photo</strong> or <strong>Reg No</strong> tabs to verify tickets instantly!</p>
      </div>
    `;
    return;
  }

  try {
    const devices = await Html5Qrcode.getCameras();
    if (!devices || devices.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; color: var(--text-primary); font-size: 13px; text-align: center;">
          <i class="fa-solid fa-camera-retro" style="font-size: 32px; margin-bottom: 8px; color: var(--accent-amber);"></i>
          <p style="margin-bottom: 6px; font-weight: 700;">No camera device detected.</p>
          <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 10px;">Use <strong>Upload Photo</strong> or <strong>Reg No</strong> tab to verify tickets!</p>
          <button type="button" class="btn-secondary" style="padding: 6px 14px; font-size: 12px;" onclick="switchScannerTab('upload')">
            <i class="fa-solid fa-image"></i> Upload QR Photo
          </button>
        </div>
      `;
      return;
    }

    // Smart Camera Selection: Prefer environment (rear) camera on mobile, or first available camera on laptop
    let cameraId = devices[0].id;
    const backCamera = devices.find(device =>
      device.label.toLowerCase().includes('back') ||
      device.label.toLowerCase().includes('environment') ||
      device.label.toLowerCase().includes('rear')
    );
    if (backCamera) {
      cameraId = backCamera.id;
    }

    html5QrCodeScanner = new Html5Qrcode('qr-reader');
    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    await html5QrCodeScanner.start(
      cameraId,
      config,
      (decodedText) => {
        handleQrCodeScanned(decodedText);
      },
      (errorMessage) => {
        // Frame scanning error ignore
      }
    );

  } catch (err) {
    console.warn('Camera start warning:', err);
    try {
      html5QrCodeScanner = new Html5Qrcode('qr-reader');
      await html5QrCodeScanner.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => { handleQrCodeScanned(decodedText); },
        (err) => { }
      );
    } catch (err2) {
      container.innerHTML = `
        <div style="padding: 24px; color: var(--text-primary); font-size: 13px; text-align: center;">
          <i class="fa-solid fa-video-slash" style="font-size: 32px; margin-bottom: 8px; color: var(--accent-rose);"></i>
          <p style="margin-bottom: 6px; font-weight: 700;">Camera Permission Needed</p>
          <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 10px;">Please allow camera permissions in your browser address bar.</p>
          <button type="button" class="btn-secondary" style="padding: 6px 14px; font-size: 12px;" onclick="switchScannerTab('upload')">
            <i class="fa-solid fa-image"></i> Switch to Upload Photo
          </button>
        </div>
      `;
    }
  }
}

function stopLiveQrScanner() {
  if (html5QrCodeScanner) {
    try {
      html5QrCodeScanner.stop().then(() => {
        try { html5QrCodeScanner.clear(); } catch (e) { }
        html5QrCodeScanner = null;
      }).catch(e => { html5QrCodeScanner = null; });
    } catch (e) {
      html5QrCodeScanner = null;
    }
  }
}

// Scan QR Code from uploaded image file
async function scanSelectedQrImage(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];

  const resultBox = document.getElementById('qr-scan-result');
  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 10px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 22px;"></i>
        <p style="margin-top: 6px; font-size: 13px;">Reading QR Code from photo...</p>
      </div>
    `;
  }

  try {
    const html5QrCode = new Html5Qrcode('qr-reader-container');
    const decodedText = await html5QrCode.scanFile(file, true);
    handleQrCodeScanned(decodedText);
  } catch (err) {
    console.error('Image QR scan error:', err);
    showToast('No scannable QR Code found in selected image', 'error');
    if (resultBox) {
      resultBox.style.background = 'rgba(220, 38, 38, 0.12)';
      resultBox.style.border = '1.5px solid var(--accent-rose)';
      resultBox.innerHTML = `
        <div style="color: var(--accent-rose); font-weight: 700; font-size: 14px;">
          <i class="fa-solid fa-circle-exclamation"></i> Could not detect a valid QR Code in the uploaded image. Please ensure the QR pass is clear and unblurred.
        </div>
      `;
    }
  }
}

async function handleQrCodeScanned(scannedText) {
  if (!scannedText) return;
  const rawText = String(scannedText).trim();

  let ticketId = null;
  let registerNumber = null;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      ticketId = parsed.ticketId || parsed.id || null;
      registerNumber = parsed.registerNumber || null;
    } else {
      if (/^[a-zA-Z0-9_-]{6,20}$/.test(rawText)) {
        registerNumber = rawText;
      } else {
        ticketId = rawText;
      }
    }
  } catch (e) {
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(rawText)) {
      registerNumber = rawText;
    } else {
      ticketId = rawText;
    }
  }

  if (!ticketId && !registerNumber) {
    registerNumber = rawText;
  }

  console.log('[QR Scanner Parsed Payload]:', { rawText, ticketId, registerNumber });
  verifyTicketPayload({ ticketId, registerNumber, rawText });
}

async function verifyManualTicket() {
  const input = document.getElementById('manual-reg-input');
  if (!input || !input.value.trim()) {
    showToast('Please enter Leader Register Number', 'warning');
    return;
  }
  verifyTicketPayload({ registerNumber: input.value.trim() });
}

async function verifyTicketPayload(payload) {
  const resultBox = document.getElementById('qr-scan-result');
  if (!resultBox) return;

  resultBox.style.display = 'block';
  resultBox.innerHTML = `
    <div style="text-align: center; color: var(--text-secondary);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 22px;"></i>
      <p style="margin-top: 6px; font-size: 13px;">Verifying ticket with database...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/admin/verify-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();

    if (resData.success) {
      const data = resData.data;
      const leaderInfo = data.leader || {};
      const leaderDept = data.department || leaderInfo.department || 'N/A';
      const leaderYear = leaderInfo.year || 'N/A';

      let membersListHtml = `
        <div style="margin-top: 12px; background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); text-align: left;">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-emerald); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid fa-users-viewfinder"></i> Team Verification Checklist (${data.totalMembers} Members)</span>
            <span style="font-size: 10px; background: var(--accent-emerald); color: #fff; padding: 2px 6px; border-radius: 4px;">ID CHECK</span>
          </div>
          <div style="font-size: 13px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed rgba(255, 255, 255, 0.1);">
            <span style="color: #eab308; font-weight: 700;">👑 Leader:</span> <strong>${data.leaderName}</strong> 
            <div style="font-size: 11px; color: var(--text-secondary); margin-left: 18px;">Reg No: <strong>${data.registerNumber}</strong> | Dept: ${leaderDept} | Year: ${leaderYear}</div>
          </div>
      `;

      if (data.members && data.members.length > 0) {
        membersListHtml += data.members.map((m, idx) => `
          <div style="font-size: 13px; margin-bottom: 4px;">
            <span style="color: #38bdf8; font-weight: 700;">👤 Member ${idx + 2}:</span> <strong>${m.name}</strong>
            <div style="font-size: 11px; color: var(--text-secondary); margin-left: 18px;">Reg No: <strong>${m.registerNumber || 'N/A'}</strong> | Dept: ${m.department || 'N/A'} | Year: ${m.year || 'N/A'}</div>
          </div>
        `).join('');
      } else {
        membersListHtml += `<div style="font-size: 11px; color: var(--text-secondary);">Single Member Team</div>`;
      }
      membersListHtml += `</div>`;

      resultBox.style.background = 'rgba(21, 128, 61, 0.12)';
      resultBox.style.border = '1.5px solid var(--accent-emerald)';
      resultBox.innerHTML = `
        <div style="color: var(--accent-emerald); font-weight: 800; font-size: 16px; margin-bottom: 6px;">
          <i class="fa-solid fa-circle-check"></i> ${resData.message}
        </div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${data.startupName || data.teamName}</div>
        <div style="font-size: 13px; color: var(--text-secondary);">Team Name: <strong>${data.teamName}</strong></div>
        ${membersListHtml}
      `;
      showToast('ENTRY APPROVED!', 'success');
      loadAdminStats();
      loadTeamsData();
    } else if (resData.isAlreadyCheckedIn) {
      const data = resData.data;
      const leaderInfo = data.leader || {};
      const leaderDept = data.department || leaderInfo.department || 'N/A';
      const leaderYear = leaderInfo.year || 'N/A';

      let membersListHtml = `
        <div style="margin-top: 12px; background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); text-align: left;">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-amber); margin-bottom: 6px;">
            <i class="fa-solid fa-users"></i> Registered Team Members (${data.totalMembers})
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;">
            <span style="color: #eab308; font-weight: 700;">👑 Leader:</span> <strong>${data.leaderName}</strong> (${data.registerNumber}) - ${leaderDept}
          </div>
      `;

      if (data.members && data.members.length > 0) {
        membersListHtml += data.members.map((m, idx) => `
          <div style="font-size: 12px; margin-bottom: 2px;">
            <span style="color: #38bdf8; font-weight: 700;">👤 Member ${idx + 2}:</span> <strong>${m.name}</strong> (${m.registerNumber || 'N/A'}) - ${m.department || 'N/A'}
          </div>
        `).join('');
      }
      membersListHtml += `</div>`;

      resultBox.style.background = 'rgba(217, 119, 6, 0.12)';
      resultBox.style.border = '1.5px solid var(--accent-amber)';
      resultBox.innerHTML = `
        <div style="color: var(--accent-amber); font-weight: 800; font-size: 15px; margin-bottom: 6px;">
          <i class="fa-solid fa-triangle-exclamation"></i> DUPLICATE TICKET WARNING
        </div>
        <p style="font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">Pass was already scanned and checked in at <strong>${new Date(data.checkedInAt).toLocaleTimeString()}</strong>.</p>
        <div style="font-size: 13px; color: var(--text-secondary);">Startup: <strong>${data.startupName}</strong></div>
        ${membersListHtml}
      `;
      showToast('DUPLICATE TICKET WARNING', 'warning');
    } else {
      resultBox.style.background = 'rgba(220, 38, 38, 0.12)';
      resultBox.style.border = '1.5px solid var(--accent-rose)';
      resultBox.innerHTML = `
        <div style="color: var(--accent-rose); font-weight: 800; font-size: 15px; margin-bottom: 4px;">
          <i class="fa-solid fa-circle-xmark"></i> ENTRY DENIED
        </div>
        <p style="font-size: 13px; color: var(--text-primary);">${resData.message}</p>
      `;
      showToast(resData.message || 'Ticket verification failed', 'error');
    }

  } catch (error) {
    console.error('Ticket verification error:', error);
    resultBox.style.background = 'rgba(220, 38, 38, 0.12)';
    resultBox.style.border = '1.5px solid var(--accent-rose)';
    resultBox.innerHTML = `<p style="color: var(--accent-rose); font-size: 13px;">Network error verifying ticket.</p>`;
  }
}
