// Performance & PWA Enhancements for Laundry Dashboard
(function() {
  'use strict';

  // Pull to Refresh
  let pullStartY = 0;
  let pullMoveY = 0;
  let isPulling = false;

  function setupPullToRefresh() {
    const indicator = document.getElementById('pull-refresh-indicator');
    if (!indicator) return;

    let touchStarted = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        touchStarted = true;
        pullStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!touchStarted) return;
      
      pullMoveY = e.touches[0].clientY;
      const pullDistance = pullMoveY - pullStartY;

      if (pullDistance > 0 && window.scrollY === 0) {
        isPulling = true;
        
        if (pullDistance > 80) {
          indicator.classList.add('show');
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', async () => {
      if (isPulling && pullMoveY - pullStartY > 80) {
        indicator.classList.add('show');
        
        // Trigger refresh
        if (typeof render === 'function') {
          await render();
        } else if (window.laundryDashboard && typeof window.laundryDashboard.render === 'function') {
          await window.laundryDashboard.render();
        }
        
        if (typeof showToast === 'function') {
          showToast('Dashboard refreshed!', 'success');
        }
        
        setTimeout(() => {
          indicator.classList.remove('show');
        }, 1000);
      } else {
        indicator.classList.remove('show');
      }
      
      touchStarted = false;
      isPulling = false;
      pullStartY = 0;
      pullMoveY = 0;
    }, { passive: true });
  }

  // PWA Install Prompt
  let deferredPrompt;

  function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install prompt after 10 seconds
      setTimeout(() => {
        const prompt = document.getElementById('pwa-install-prompt');
        if (prompt && !localStorage.getItem('pwa-dismissed')) {
          prompt.style.display = 'block';
        }
      }, 10000);
    });

    const installBtn = document.getElementById('pwa-install-btn');
    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    const prompt = document.getElementById('pwa-install-prompt');

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('PWA installed');
          if (typeof showToast === 'function') {
            showToast('App installed successfully!', 'success');
          }
        }
        
        deferredPrompt = null;
        if (prompt) prompt.style.display = 'none';
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        if (prompt) prompt.style.display = 'none';
        localStorage.setItem('pwa-dismissed', 'true');
      });
    }

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      if (prompt) prompt.style.display = 'none';
    });
  }

  // Loading Overlay
  function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // Image Lazy Loading
  function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Performance Monitoring
  function logPerformance() {
    if (window.performance && window.performance.timing) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      console.log(`Page Load Time: ${pageLoadTime}ms`);
    }
  }

  // Cache Management
  function clearOldCache() {
    const cacheKey = 'laundryBuddy_lastCleanup';
    const lastCleanup = localStorage.getItem(cacheKey);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (!lastCleanup || (now - parseInt(lastCleanup)) > oneDayMs) {
      // Clear old cached data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_') && localStorage.getItem(key)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data.timestamp && (now - data.timestamp) > 7 * oneDayMs) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Invalid cache entry, remove it
            localStorage.removeItem(key);
          }
        }
      });
      
      localStorage.setItem(cacheKey, now.toString());
      console.log('Cache cleaned');
    }
  }

  // Network Status Indicator
  function setupNetworkMonitoring() {
    function updateOnlineStatus() {
      if (navigator.onLine) {
        if (typeof showToast === 'function') {
          showToast('Back online!', 'success');
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('You are offline. Changes will sync when online.', 'warning');
        }
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  // Auto-save functionality
  let autoSaveTimer;
  function setupAutoSave() {
    window.addEventListener('beforeunload', (e) => {
      // Check if there are unsaved changes
      const hasUnsavedChanges = sessionStorage.getItem('hasUnsavedChanges');
      if (hasUnsavedChanges === 'true') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize all enhancements
  function init() {
    setupPullToRefresh();
    setupPWAInstall();
    setupLazyLoading();
    setupNetworkMonitoring();
    setupAutoSave();
    clearOldCache();
    
    // Log performance after page loads
    window.addEventListener('load', () => {
      setTimeout(logPerformance, 0);
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export utilities
  window.performanceUtils = {
    showLoading,
    hideLoading,
    debounce,
    setupLazyLoading
  };
})();
