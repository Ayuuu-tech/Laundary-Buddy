(function () {
  'use strict';

  const STATUS_FLOW = ['received','washing','drying','folding','ready-for-pickup','completed'];
  let selectedTokens = new Set();
  let previousReadyTokens = new Set();
  let currentFilters = { status: 'all', date: 'all', priority: 'all' };
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeRow = null;

  function fmtDate(str) {
    try {
      const d = new Date(str);
      return d.toLocaleString();
    } catch (_) { return str; }
  }

  function getLocalSubmissions() {
    return JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
  }

  function saveLocalSubmissions(list) {
    localStorage.setItem('laundryBuddy_submissions', JSON.stringify(list));
  }

  function upsertSubmission(updatedItem) {
    const list = getLocalSubmissions();
    const idx = list.findIndex(x => x.tokenNumber === updatedItem.tokenNumber);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updatedItem };
    } else {
      list.push(updatedItem);
    }
    saveLocalSubmissions(list);
  }

  async function init() {
    const ok = window.laundryAuthManager && window.laundryAuthManager.requireLaundryAuth();
    if (!ok) return;

    // Attach logout
    const logoutBtn = document.getElementById('laundry-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => window.laundryAuthManager.logout());

    // Refresh buttons
    const navRefresh = document.getElementById('nav-refresh');
    if (navRefresh) navRefresh.addEventListener('click', (e) => { e.preventDefault(); render(); });
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => render());

    // Search
    const searchInput = document.getElementById('laundry-search');
    if (searchInput) searchInput.addEventListener('input', () => render());

    // Filters
    const statusFilter = document.getElementById('status-filter');
    const dateFilter = document.getElementById('date-filter');
    const priorityFilter = document.getElementById('priority-filter');
    if (statusFilter) statusFilter.addEventListener('change', (e) => { currentFilters.status = e.target.value; render(); });
    if (dateFilter) dateFilter.addEventListener('change', (e) => { currentFilters.date = e.target.value; render(); });
    if (priorityFilter) priorityFilter.addEventListener('change', (e) => { currentFilters.priority = e.target.value; render(); });

    // Enhancements from external script
    if (window.dashboardEnhancements) {
      window.dashboardEnhancements.setupKeyboardShortcuts();
      window.dashboardEnhancements.setupMobileSwipeGestures();
    }

    // QR scanner
    setupQrScannerControls();

    // Bulk actions
    setupBulkActions();

    // Export
    setupExport();

    // Toast container
    createToastContainer();

    // Polling for notifications
    startNotificationPolling();

    await render();
  }

  async function loadMergedItems() {
    // Load static JSON
    let items = [];
    try {
      const res = await fetch('assests/data/laundry-tracking.json', { cache: 'no-cache' });
      const data = await res.json();
      items = data.laundryItems || [];
    } catch (e) {
      console.warn('Failed to fetch static JSON, continuing with local only');
    }

    // Merge in local submissions (student-submitted or previously updated by staff)
    const localSubs = getLocalSubmissions();

    // If a token exists in both, prefer local (most recent)
    const byToken = new Map(items.map(x => [x.tokenNumber, x]));
    localSubs.forEach(x => byToken.set(x.tokenNumber, { ...byToken.get(x.tokenNumber), ...x }));

    // Return combined array
    return Array.from(byToken.values());
  }

  function filterItems(items) {
    const search = (document.getElementById('laundry-search')?.value || '').trim().toLowerCase();
    let filtered = items;

    // Text search
    if (search) {
      filtered = filtered.filter(i => (
        (i.tokenNumber || '').toLowerCase().includes(search) ||
        (i.studentName || '').toLowerCase().includes(search) ||
        (i.hostelRoom || '').toLowerCase().includes(search)
      ));
    }

    // Status filter
    if (currentFilters.status !== 'all') {
      filtered = filtered.filter(i => i.currentStatus === currentFilters.status);
    }

    // Date filter
    if (currentFilters.date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter(i => {
        const itemDate = new Date(i.submittedDate);
        if (currentFilters.date === 'today') return itemDate >= today;
        if (currentFilters.date === 'yesterday') return itemDate >= yesterday && itemDate < today;
        if (currentFilters.date === 'week') return itemDate >= weekAgo;
        if (currentFilters.date === 'month') return itemDate >= monthAgo;
        return true;
      });
    }

    // Priority filter
    if (currentFilters.priority !== 'all') {
      filtered = filtered.filter(i => (i.priority || 'normal') === currentFilters.priority);
    }

    return filtered;
  }

  async function render() {
    try {
      const itemsAll = await loadMergedItems();
      const items = filterItems(itemsAll);

      // Calculate enhanced stats
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayItems = itemsAll.filter(i => new Date(i.submittedDate) >= today);
      const inproc = itemsAll.filter(i => ['washing', 'drying', 'folding', 'received'].includes(i.currentStatus)).length;
      const ready = itemsAll.filter(i => i.currentStatus === 'ready-for-pickup').length;
      const completedToday = todayItems.filter(i => i.currentStatus === 'completed').length;
      const urgentCount = itemsAll.filter(i => (i.priority || 'normal') === 'urgent').length;
      
      // Calculate average completion time
      const completedItems = itemsAll.filter(i => i.currentStatus === 'completed' && i.submittedDate && i.estimatedCompletion);
      let avgTime = '--';
      if (completedItems.length > 0) {
        const totalMs = completedItems.reduce((sum, item) => {
          const start = new Date(item.submittedDate);
          const end = new Date(item.estimatedCompletion);
          return sum + (end - start);
        }, 0);
        const avgMs = totalMs / completedItems.length;
        const hours = Math.round(avgMs / (1000 * 60 * 60));
        avgTime = `${hours}h`;
      }

      document.getElementById('stat-total').textContent = itemsAll.length;
      document.getElementById('stat-inprocess').textContent = inproc;
      document.getElementById('stat-ready').textContent = ready;
      document.getElementById('stat-completed').textContent = completedToday;
      document.getElementById('stat-urgent').textContent = urgentCount;
      document.getElementById('stat-avgtime').textContent = avgTime;

      // Sort: urgent first, then by date
      const sortedItems = [...items].sort((a, b) => {
        const priorityOrder = { urgent: 0, express: 1, normal: 2 };
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(b.submittedDate) - new Date(a.submittedDate);
      });

      // Table
      const tbody = document.getElementById('laundry-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (sortedItems.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="9">No items</td>';
        tbody.appendChild(tr);
        return;
      }

      sortedItems.forEach(i => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-token', i.tokenNumber || '');
        const priority = i.priority || 'normal';
        const priorityIcon = priority === 'urgent' ? '<i class="bx bx-error" style="color:#f44336;"></i>' : 
                             priority === 'express' ? '<i class="bx bx-bolt" style="color:#FF9800;"></i>' : '';
        
        tr.innerHTML = `
          <td><input type="checkbox" class="row-checkbox" data-token="${i.tokenNumber}"></td>
          <td class="priority-cell">${priorityIcon} <span class="priority-badge ${priority}">${priority}</span></td>
          <td>${i.tokenNumber || ''}</td>
          <td>${i.studentName || ''}</td>
          <td>${i.hostelRoom || ''}</td>
          <td><span class="status-pill ${i.currentStatus}">${label(i.currentStatus)}</span></td>
          <td>${fmtDate(i.submittedDate)}</td>
          <td>${fmtDate(i.estimatedCompletion)}</td>
          <td>
            <div class="row-actions">
              <select data-token="${i.tokenNumber}" class="status-select">
                ${STATUS_FLOW.map(s => `<option value="${s}" ${i.currentStatus===s?'selected':''}>${label(s)}</option>`).join('')}
              </select>
              <button class="btn btn-secondary btn-advance" data-token="${i.tokenNumber}">Next</button>
              <button class="btn btn-secondary btn-save" data-token="${i.tokenNumber}">Save</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Wire up per-row actions
      tbody.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', () => {
          const token = btn.getAttribute('data-token');
          const select = tbody.querySelector(`select.status-select[data-token="${token}"]`);
          const newStatus = select?.value || 'received';
          handleUpdateStatus(token, newStatus);
        });
      });

      tbody.querySelectorAll('.btn-advance').forEach(btn => {
        btn.addEventListener('click', async () => {
          const token = btn.getAttribute('data-token');
          const item = await findItemByToken(token);
          if (!item) return;
          const next = computeNextStatus(item.currentStatus);
          if (next === item.currentStatus) {
            showToast('Already at final stage.', 'info');
            return;
          }
          handleUpdateStatus(token, next);
        });
      });

      // Row click opens details (ignore clicks on controls)
      tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', (e) => {
          const target = e.target;
          if (target.closest('.row-actions') || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
          const token = tr.getAttribute('data-token');
          if (token) openDetailForToken(token);
        });
      });

      // Wire checkboxes
      tbody.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBulkSelection);
      });

      // Select all checkbox
      const selectAll = document.getElementById('select-all-checkbox');
      if (selectAll) {
        selectAll.checked = false;
        selectAll.addEventListener('change', (e) => {
          tbody.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked);
          updateBulkSelection();
        });
      }

      // Check for new ready orders (notifications)
      checkForReadyOrders(itemsAll);
    } catch (e) {
      console.error('Failed to load laundry data', e);
      const tbody = document.getElementById('laundry-table-body');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7">Failed to load data</td></tr>';
      }
    }
  }

  function label(status) {
    const map = {
      'received': 'Received',
      'washing': 'Washing',
      'drying': 'Drying',
      'folding': 'Folding',
      'ready-for-pickup': 'Ready for Pickup',
      'completed': 'Completed'
    };
    return map[status] || status;
  }

  function cls(status) {
    switch (status) {
      case 'received': return 'status-processing';
      case 'washing': return 'status-processing';
      case 'drying': return 'status-processing';
      case 'folding': return 'status-processing';
      case 'ready-for-pickup': return 'status-processing';
      case 'completed': return 'status-completed';
      default: return 'status-processing';
    }
  }

  function getProgressForStatus(status) {
    switch (status) {
      case 'received': return 10;
      case 'washing': return 40;
      case 'drying': return 60;
      case 'folding': return 80;
      case 'ready-for-pickup': return 95;
      case 'completed': return 100;
      default: return 10;
    }
  }

  function handleUpdateStatus(token, newStatus, isBulk = false) {
    const items = getLocalSubmissions();
    let item = items.find(x => x.tokenNumber === token);
    if (!item) {
      // If not in local, try to copy from static merged list by querying DOM row attributes
      // Simpler approach: reconstruct minimal item from table values
      const row = Array.from(document.querySelectorAll('#laundry-table-body tr'))
        .find(tr => tr.querySelector('button.btn-save')?.getAttribute('data-token') === token);
      if (row) {
        const tds = row.querySelectorAll('td');
        item = {
          tokenNumber: token,
          studentName: tds[2]?.textContent || '',
          hostelRoom: tds[3]?.textContent || '',
          submittedDate: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now()+24*60*60*1000).toISOString(),
          statusHistory: [],
          items: [],
          specialInstructions: '',
          progress: 0,
          currentStatus: 'received'
        };
      }
    }
    if (!item) return;

    const nowIso = new Date().toISOString();
    item.currentStatus = newStatus;
    item.progress = getProgressForStatus(newStatus);
    item.statusHistory = item.statusHistory || [];
    item.statusHistory.push({ status: newStatus, timestamp: nowIso, description: label(newStatus) });
    if (newStatus === 'ready-for-pickup') {
      item.estimatedCompletion = nowIso;
    }

    upsertSubmission(item);
    // Also sync to backend tracking by orderNumber (token)
    syncBackendStatus(token, newStatus, newStatus === 'ready-for-pickup' || newStatus === 'completed' ? item.estimatedCompletion : undefined)
      .catch(err => console.warn('Backend sync failed:', err));
    if (!isBulk) {
      showToast(`Status updated to "${label(newStatus)}" for ${token}`, 'success');
      render();
    }
  }

  function computeNextStatus(current) {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < 0) return STATUS_FLOW[0];
    return STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
  }

  async function findItemByToken(token) {
    const itemsAll = await loadMergedItems();
    return itemsAll.find(x => x.tokenNumber === token);
  }

  function populateDetailModal(item) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('detail-token', item.tokenNumber || '-');
    set('detail-name', item.studentName || '-');
    set('detail-room', item.hostelRoom || '-');
    
    const priorityEl = document.getElementById('detail-priority');
    if (priorityEl) {
      const priority = item.priority || 'normal';
      priorityEl.className = `priority-badge ${priority}`;
      priorityEl.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    }
    
    const statusEl = document.getElementById('detail-status');
    if (statusEl) {
      statusEl.className = `status-pill ${item.currentStatus}`;
      statusEl.textContent = label(item.currentStatus);
    }
    set('detail-submitted', fmtDate(item.submittedDate));
    set('detail-eta', fmtDate(item.estimatedCompletion));

    const itemsList = document.getElementById('detail-items');
    if (itemsList) {
      itemsList.innerHTML = '';
      (item.items || []).forEach(it => {
        const li = document.createElement('li');
        li.textContent = `${(it.type||'item')}: ${it.count || 1}${it.color?` (${it.color})`:''}`;
        itemsList.appendChild(li);
      });
      if ((item.items||[]).length === 0) {
        const li = document.createElement('li'); li.textContent = 'No item details'; itemsList.appendChild(li);
      }
    }

    const histList = document.getElementById('detail-history');
    if (histList) {
      histList.innerHTML = '';
      (item.statusHistory || []).forEach(h => {
        const li = document.createElement('li');
        li.textContent = `${label(h.status)} — ${fmtDate(h.timestamp)}`;
        histList.appendChild(li);
      });
      if ((item.statusHistory||[]).length === 0) {
        const li = document.createElement('li'); li.textContent = 'No history'; histList.appendChild(li);
      }
    }
  }

  async function openDetailForToken(token) {
  const item = await findItemByToken(token);
  if (!item) { showToast('Order not found for token: ' + token, 'warning'); return; }
    populateDetailModal(item);

    const modal = document.getElementById('detail-modal');
    if (modal) modal.style.display = 'flex';

    // Bind actions
    const adv = document.getElementById('detail-advance');
    const ready = document.getElementById('detail-ready');
    const complete = document.getElementById('detail-complete');
    const toggleUrgent = document.getElementById('detail-toggle-urgent');
    const cancel = document.getElementById('detail-cancel');
    const closeBtn = document.getElementById('close-detail');

    const once = (el, evt, fn) => { if (!el) return; const h = (e)=>{ e.stopPropagation(); fn(); }; el.onclick = h; };
    once(adv, 'click', () => {
      const next = computeNextStatus(item.currentStatus);
      handleUpdateStatus(item.tokenNumber, next);
      closeDetailModal();
    });
    once(ready, 'click', () => { handleUpdateStatus(item.tokenNumber, 'ready-for-pickup'); closeDetailModal(); });
    once(complete, 'click', () => { handleUpdateStatus(item.tokenNumber, 'completed'); closeDetailModal(); });
    once(toggleUrgent, 'click', async () => {
      await togglePriority(item.tokenNumber);
      closeDetailModal();
    });
    once(cancel, 'click', () => closeDetailModal());
    once(closeBtn, 'click', () => closeDetailModal());
  }

  async function togglePriority(token) {
    const items = await loadMergedItems();
    let item = items.find(x => x.tokenNumber === token);
    if (!item) return;
    const currentPriority = item.priority || 'normal';
    const newPriority = currentPriority === 'urgent' ? 'normal' : 'urgent';
    item.priority = newPriority;
    upsertSubmission(item);
    // Log priority change in backend timeline for visibility
    syncBackendStatus(token, item.currentStatus, undefined, `Priority set to ${item.priority || 'normal'}`).catch(()=>{});
    showToast(`Priority: ${newPriority}`, 'info');
    render();
  }

  function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.style.display = 'none';
  }

  // Sync status to backend Tracking by orderNumber
  async function syncBackendStatus(orderNumber, status, estimatedDelivery, note) {
    try {
      if (typeof fetch !== 'function') return;
      const cleanToken = String(orderNumber || '').trim();
      const url = `${API_CONFIG.BASE_URL}/tracking/order/${encodeURIComponent(cleanToken)}`;
      console.log('[Dashboard] Syncing status →', cleanToken, status, estimatedDelivery || '');
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
          // In production, you can add: 'X-Laundry-Key': '<your-key>'
        },
        body: JSON.stringify({ status, estimatedDelivery, note })
      });
      const data = await res.json().catch(()=>({ success:false, message:'Invalid JSON'}));
      console.log('[Dashboard] Sync response', res.status, data);
      if (!res.ok || !data.success) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      return data;
    } catch (e) {
      console.warn('[Dashboard] syncBackendStatus error:', e.message || e);
      // Non-blocking: dashboard still updates UI/local
      return null;
    }
  }

  // QR SCANNER (reuse html5-qrcode like track page)
  function setupQrScannerControls() {
    const scanBtn = document.getElementById('scan-qr-btn');
    if (scanBtn) scanBtn.addEventListener('click', openQrScanner);

    const closeBtn = document.getElementById('close-scanner');
    if (closeBtn) closeBtn.addEventListener('click', closeQrScanner);

    const uploadBtn = document.getElementById('use-file-upload');
    if (uploadBtn) uploadBtn.addEventListener('click', scanFromFile);
  }

  let html5QrCode = null;
  let isScanning = false;
  let scanSession = 0; // used to ignore late results

  function extractTokenFromText(text) {
    if (!text) return '';
    const t = String(text).trim();
    // Support both token styles: LB-2025-1001 and LB-YYYYMMDD-####
    const m = t.match(/(LB-(?:\d{4}-\d{4}|\d{8}-\d{4}))/i);
    if (m) return m[1];
    // Also handle URLs like ...?token=LB-...
    try {
      const url = new URL(t);
      const tok = url.searchParams.get('token');
      if (tok) return tok;
    } catch (_) { /* not a URL */ }
    return t; // fallback to raw string
  }

  function parseScannedContent(text) {
    const token = extractTokenFromText(text);
    let payload = null;
    try {
      const url = new URL(String(text).trim());
      const d = url.searchParams.get('d');
      if (d) {
        const json = atob(decodeURIComponent(d));
        payload = JSON.parse(json);
      }
    } catch (_) { /* not a URL or invalid payload */ }
    return { token, payload };
  }

  function mapPayloadToSubmission(p) {
    if (!p) return null;
    // Expected compact keys from submit.js
    return {
      tokenNumber: p.t,
      studentId: p.sid,
      studentName: p.nm,
      hostelRoom: p.rm,
      submittedDate: p.sd,
      estimatedCompletion: p.eta,
      currentStatus: p.s || 'received',
      statusHistory: p.sh || [],
      items: p.it || [],
      specialInstructions: '',
      progress: typeof p.p === 'number' ? p.p : getProgressForStatus(p.s || 'received')
    };
  }

  function openQrScanner() {
    const modal = document.getElementById('qr-scanner-modal');
    if (!modal) return alert('QR Scanner not available');
    if (typeof Html5Qrcode === 'undefined') return alert('QR Scanner library not loaded.');

    modal.style.display = 'flex';
    if (html5QrCode) {
      try { html5QrCode.clear(); } catch(_) {}
    }
    html5QrCode = new Html5Qrcode('qr-reader');

    const qrCodeSuccessCallback = (decodedText) => {
      const { token, payload } = parseScannedContent(decodedText);
      updateScannerStatus(`Detected: ${token}`, 'success');
      // No need to upsert payload anymore; data merged from localStorage+JSON
      handleScannedToken(token);
      closeQrScanner();
    };

    const config = { 
      fps: 20, 
      qrbox: { width: 200, height: 200 },
      aspectRatio: 1.0,
      disableFlip: false
    };
    html5QrCode.start({ facingMode: 'environment' }, config, qrCodeSuccessCallback)
      .catch(err => {
        console.error('Error starting QR scanner:', err);
        updateScannerStatus('Camera access denied or not available. Please use "Upload QR Code Image" option.', 'error');
      });
    isScanning = true;
    updateScannerStatus('Scanning... Position QR code in the frame', 'scanning');

    // Gentle timeout hint if nothing detected for a while
    const thisSession = ++scanSession;
    setTimeout(() => {
      if (isScanning && thisSession === scanSession) {
        updateScannerStatus('⚠️ Still scanning... Hold QR steady, ensure good lighting, or try Upload/Paste below.', 'info');
      }
    }, 8000);

    // Wire manual entry events
    setupManualEntry();
    setupCameraUi();
  }

  function closeQrScanner() {
    const modal = document.getElementById('qr-scanner-modal');
    if (html5QrCode && isScanning) {
      html5QrCode.stop().then(() => html5QrCode.clear()).catch(()=>{});
    }
    if (modal) modal.style.display = 'none';
    isScanning = false;
  }

  function scanFromFile() {
    // CRITICAL: Stop camera scan first before file scan
    if (html5QrCode && isScanning) {
      html5QrCode.stop()
        .then(() => {
          isScanning = false;
          html5QrCode.clear();
          startFileScan();
        })
        .catch(err => {
          console.warn('Error stopping camera:', err);
          startFileScan(); // Try anyway
        });
    } else {
      startFileScan();
    }
  }

  function startFileScan() {
    if (!html5QrCode) html5QrCode = new Html5Qrcode('qr-reader');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      updateScannerStatus('Scanning image...', 'scanning');
      
      // Try scanning without timeout first
      html5QrCode.scanFile(file, true)
        .then(decodedText => {
          console.log('QR detected from file:', decodedText);
          const { token, payload } = parseScannedContent(decodedText);
          updateScannerStatus(`✓ Detected: ${token}`, 'success');
          handleScannedToken(token);
          closeQrScanner();
        })
        .catch(err => {
          console.error('QR scan error:', err);
          updateScannerStatus('❌ Could not detect QR in image. Please paste the token manually below.', 'error');
        });
    };
    fileInput.click();
  }

  function handleScannedToken(token) {
    const cleanToken = extractTokenFromText(token);
    const search = document.getElementById('laundry-search');
    if (search) {
      search.value = cleanToken;
      render();
    }
    // Open details directly
    if (cleanToken) openDetailForToken(cleanToken);
  }

  function updateScannerStatus(message, type = 'info') {
    const statusDiv = document.getElementById('qr-scanner-status');
    if (!statusDiv) return;
    const colors = { info:'#666', scanning:'#2196F3', error:'#f44336', success:'#4CAF50' };
    statusDiv.textContent = message;
    statusDiv.style.color = colors[type] || colors.info;
    statusDiv.style.background = type === 'error' ? '#ffebee' : '#f5f5f5';
  }

  function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, rej) => t = setTimeout(() => rej(new Error('timeout')), ms));
    return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
  }

  function setupManualEntry() {
    const input = document.getElementById('qr-manual-input');
    const submit = document.getElementById('qr-manual-submit');
    const err = document.getElementById('qr-manual-error');
    if (!input || !submit) return;
    
    // Clear any previous errors
    if (err) err.textContent = '';
    
    const go = () => {
      const rawInput = (input.value || '').trim();
      if (!rawInput) {
        if (err) err.textContent = 'Please enter a token.';
        return;
      }
      
      const token = extractTokenFromText(rawInput);
      if (!token) {
        if (err) err.textContent = 'Invalid token format. Example: LB-20251025-1234';
        return;
      }
      
      if (err) err.textContent = '';
      console.log('Manual entry token:', token);
      handleScannedToken(token);
      closeQrScanner();
    };
    
    submit.onclick = go;
    input.onkeypress = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
    
    // Focus the input for easy typing
    setTimeout(() => { if (input) input.focus(); }, 500);
  }

  function setupCameraUi() {
    const cameraSelect = document.getElementById('qr-camera-select');
    const retryBtn = document.getElementById('qr-retry');
    const torchBtn = document.getElementById('qr-toggle-torch');
    if (cameraSelect && typeof Html5Qrcode !== 'undefined') {
      Html5Qrcode.getCameras().then(cams => {
        try { cameraSelect.innerHTML = ''; } catch(_){}
        cams.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.label || c.id;
          cameraSelect.appendChild(opt);
        });
        // Auto-select back/environment camera if present
        const env = Array.from(cameraSelect.options).find(o => /back|rear|environment/i.test(o.textContent));
        if (env) cameraSelect.value = env.value;
      }).catch(()=>{});
      cameraSelect.onchange = () => restartWithSelectedCamera(cameraSelect.value);
    }
    if (retryBtn) retryBtn.onclick = () => restartWithSelectedCamera(cameraSelect?.value || null);
    if (torchBtn) torchBtn.onclick = toggleTorch;
  }

  function restartWithSelectedCamera(deviceId) {
    if (!html5QrCode) return;
    const config = { 
      fps: 20, 
      qrbox: { width: 200, height: 200 },
      aspectRatio: 1.0,
      disableFlip: false
    };
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      const cb = (decodedText) => {
        const { token, payload } = parseScannedContent(decodedText);
        updateScannerStatus(`Detected: ${token}`, 'success');
        // No need to upsert payload anymore; data merged from localStorage+JSON
        handleScannedToken(token);
        closeQrScanner();
      };
      if (deviceId) {
        html5QrCode.start({ deviceId: { exact: deviceId } }, config, cb)
          .catch(()=>{ updateScannerStatus('Failed to start selected camera.', 'error'); });
      } else {
        html5QrCode.start({ facingMode: 'environment' }, config, cb)
          .catch(()=>{ updateScannerStatus('Failed to start camera.', 'error'); });
      }
    }).catch(()=>{});
  }

  async function toggleTorch() {
    try {
      if (!html5QrCode) return;
      const constraints = { advanced: [{ torch: true }] };
      await html5QrCode.applyVideoConstraints(constraints);
      updateScannerStatus('Torch toggled (if supported by device).', 'info');
    } catch (e) {
      updateScannerStatus('Torch not supported on this device.', 'error');
    }
  }

  // Bulk actions
  function setupBulkActions() {
    const bulkReady = document.getElementById('bulk-mark-ready');
    const bulkCompleted = document.getElementById('bulk-mark-completed');
    const bulkClear = document.getElementById('bulk-clear');

    if (bulkReady) bulkReady.onclick = () => bulkUpdateStatus('ready-for-pickup');
    if (bulkCompleted) bulkCompleted.onclick = () => bulkUpdateStatus('completed');
    if (bulkClear) bulkClear.onclick = () => {
      selectedTokens.clear();
      updateBulkSelection();
      render();
    };
  }

  function updateBulkSelection() {
    selectedTokens.clear();
    document.querySelectorAll('.row-checkbox:checked').forEach(cb => {
      selectedTokens.add(cb.getAttribute('data-token'));
    });
    const bar = document.getElementById('bulk-actions-bar');
    const count = document.getElementById('bulk-selection-count');
    if (selectedTokens.size > 0) {
      bar.classList.add('show');
      count.textContent = `${selectedTokens.size} selected`;
    } else {
      bar.classList.remove('show');
    }
  }

  function bulkUpdateStatus(newStatus) {
    if (selectedTokens.size === 0) return;
    const tokens = Array.from(selectedTokens);
    tokens.forEach(token => handleUpdateStatus(token, newStatus, true));
    selectedTokens.clear();
    updateBulkSelection();
    render();
    showToast(`${tokens.length} orders marked as ${label(newStatus)}`, 'success');
  }

  // Export functionality
  function setupExport() {
    const exportBtn = document.getElementById('export-btn');
    if (!exportBtn) return;
    exportBtn.addEventListener('click', async () => {
      const items = await loadMergedItems();
      const filtered = filterItems(items);
      const orders = filtered.map(i => ({
        token: i.tokenNumber,
        student: i.studentName,
        room: i.hostelRoom,
        status: label(i.currentStatus),
        submitted: fmtDate(i.submittedDate),
        eta: fmtDate(i.estimatedCompletion),
        progress: i.progress
      }));
      if (window.DataExporter) {
        const exporter = new window.DataExporter(orders);
        const format = prompt('Export format? (csv/json/pdf)', 'csv');
        if (format === 'csv') exporter.exportToCSV();
        else if (format === 'json') exporter.exportToJSON();
        else if (format === 'pdf') exporter.exportToPDF();
      } else {
        alert('Export functionality not available');
      }
    });
  }

  // Toast notifications
  function createToastContainer() {
    if (document.getElementById('toast-container')) return;
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success:'✓', info:'ℹ', warning:'⚠' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]||'•'}</span>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function startNotificationPolling() {
    setInterval(async () => {
      const items = await loadMergedItems();
      checkForReadyOrders(items);
    }, 15000); // Check every 15 seconds
  }

  function checkForReadyOrders(items) {
    const readyNow = new Set(items.filter(i => i.currentStatus === 'ready-for-pickup').map(i => i.tokenNumber));
    readyNow.forEach(token => {
      if (!previousReadyTokens.has(token)) {
        const item = items.find(i => i.tokenNumber === token);
        if (item) {
          showToast(`🎉 ${item.studentName}'s order ${token} is ready for pickup!`, 'success');
          playNotificationSound();
        }
      }
    });
    previousReadyTokens = readyNow;
  }

  function playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,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');
      audio.volume = 0.3;
      audio.play().catch(()=>{});
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
