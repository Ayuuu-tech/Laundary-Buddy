// Additional enhancements for laundry dashboard
// Keyboard shortcuts, mobile gestures, and priority toggle

(function() {
  'use strict';

  // Keyboard shortcuts
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      switch(e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          document.getElementById('laundry-search')?.focus();
          break;
        case 'r':
          e.preventDefault();
          if (typeof render === 'function') render();
          if (typeof showToast === 'function') showToast('Refreshed dashboard', 'info');
          break;
        case 'e':
          e.preventDefault();
          document.getElementById('export-btn')?.click();
          break;
        case 'n':
          e.preventDefault();
          // Advance first selected order
          const firstSelected = document.querySelector('.row-checkbox:checked');
          if (firstSelected) {
            const token = firstSelected.getAttribute('data-token');
            document.querySelector(`.btn-advance[data-token="${token}"]`)?.click();
          }
          break;
        case '1': case '2': case '3': case '4': case '5': case '6':
          e.preventDefault();
          const statuses = ['all', 'received', 'washing', 'drying', 'folding', 'ready-for-pickup', 'completed'];
          const idx = parseInt(e.key) - 1;
          if (statuses[idx]) {
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) {
              statusFilter.value = statuses[idx];
              statusFilter.dispatchEvent(new Event('change'));
            }
          }
          break;
      }
    });
  }

  // Mobile swipe gestures
  let touchStartX = 0;
  let touchStartY = 0;
  let swipeRow = null;

  function setupMobileSwipeGestures() {
    const tbody = document.getElementById('laundry-table-body');
    if (!tbody) return;

    tbody.addEventListener('touchstart', (e) => {
      const row = e.target.closest('tr');
      if (!row || !row.hasAttribute('data-token')) return;
      
      swipeRow = row;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    tbody.addEventListener('touchmove', (e) => {
      if (!swipeRow) return;
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX;
      const deltaY = touchY - touchStartY;

      // Detect horizontal swipe (ignore if vertical scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const hint = document.querySelector('.swipe-hint');
        if (!hint) {
          const hintEl = document.createElement('div');
          hintEl.className = 'swipe-hint show';
          hintEl.textContent = deltaX > 0 ? '→ Advance Status' : '← Open Details';
          document.body.appendChild(hintEl);
          setTimeout(() => hintEl.remove(), 2000);
        }
      }
    }, { passive: true });

    tbody.addEventListener('touchend', async (e) => {
      if (!swipeRow) return;
      
      const touchX = e.changedTouches[0].clientX;
      const deltaX = touchX - touchStartX;
      const threshold = 100;

      if (Math.abs(deltaX) > threshold) {
        const token = swipeRow.getAttribute('data-token');
        
        if (deltaX > 0) {
          // Swipe right: Advance status
          const advanceBtn = document.querySelector(`.btn-advance[data-token="${token}"]`);
          if (advanceBtn) advanceBtn.click();
        } else {
          // Swipe left: Open details
          const row = document.querySelector(`tr[data-token="${token}"]`);
          if (row) row.click();
        }
      }

      swipeRow = null;
      touchStartX = 0;
      touchStartY = 0;
    }, { passive: true });
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupKeyboardShortcuts();
      setupMobileSwipeGestures();
    });
  } else {
    setupKeyboardShortcuts();
    setupMobileSwipeGestures();
  }

  // Export functions globally
  window.dashboardEnhancements = {
    setupKeyboardShortcuts,
    setupMobileSwipeGestures
  };
})();
