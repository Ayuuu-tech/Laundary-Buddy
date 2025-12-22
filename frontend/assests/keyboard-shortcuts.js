/**
 * KEYBOARD SHORTCUTS MANAGER
 * 
 * Global keyboard shortcuts system for Laundry Buddy application.
 * Provides quick navigation and actions via keyboard combinations.
 * 
 * Features:
 * - Global keyboard event listener
 * - Configurable shortcuts
 * - Help modal with shortcut list
 * - Prevent conflicts with browser shortcuts
 * - Platform detection (Windows/Mac)
 * 
 * Shortcuts:
 * - Ctrl/Cmd + K: Focus search
 * - Ctrl/Cmd + D: Toggle dark mode
 * - Ctrl/Cmd + N: New order (submit page)
 * - Ctrl/Cmd + H: Go to history
 * - Ctrl/Cmd + P: Go to profile
 * - Ctrl/Cmd + /: Show shortcuts help
 * - Esc: Close modals/overlays
 * - Enter: Submit forms/confirm dialogs
 * 
 * Usage:
 * const shortcuts = new KeyboardShortcutsManager();
 * shortcuts.init();
 * 
 * Created: 2025
 * Part of: Laundry Buddy College Project
 */

(function () {
  'use strict';

  /**
   * KeyboardShortcutsManager Class
   * Manages global keyboard shortcuts and help modal
   */
  class KeyboardShortcutsManager {
    constructor() {
      this.shortcuts = this.defineShortcuts();
      this.platform = this.detectPlatform();
      this.helpModalVisible = false;
      this.enabled = true;
    }

    /**
     * Initialize keyboard shortcuts
     */
    init() {
      this.setupGlobalListener();
      this.createHelpModal();
      
      console.log('✓ Keyboard Shortcuts initialized');
      console.log(`Platform: ${this.platform}`);
      console.log(`Press ${this.getModifierKey()} + / to see all shortcuts`);
    }

    /**
     * Detect platform (Windows/Mac/Linux)
     */
    detectPlatform() {
      const userAgent = navigator.userAgent || navigator.platform;
      if (/Mac|iPhone|iPad|iPod/.test(userAgent)) {
        return 'mac';
      }
      return 'windows';
    }

    /**
     * Get modifier key label based on platform
     */
    getModifierKey() {
      return this.platform === 'mac' ? 'Cmd' : 'Ctrl';
    }

    /**
     * Define all keyboard shortcuts
     */
    defineShortcuts() {
      return [
        {
          key: 'k',
          ctrl: true,
          description: 'Focus search',
          action: () => this.focusSearch(),
          global: true
        },
        {
          key: 'd',
          ctrl: true,
          description: 'Toggle dark mode',
          action: () => this.toggleDarkMode(),
          global: true
        },
        {
          key: 'n',
          ctrl: true,
          description: 'New order (Submit page)',
          action: () => this.goToPage('submit.html'),
          global: true
        },
        {
          key: 'h',
          ctrl: true,
          description: 'Go to History',
          action: () => this.goToPage('history.html'),
          global: true
        },
        {
          key: 'p',
          ctrl: true,
          description: 'Go to Profile',
          action: () => this.goToPage('profile.html'),
          global: true
        },
        {
          key: 't',
          ctrl: true,
          description: 'Track order',
          action: () => this.goToPage('track.html'),
          global: true
        },
        {
          key: 's',
          ctrl: true,
          description: 'Go to Support',
          action: () => this.goToPage('support.html'),
          global: true
        },
        {
          key: '/',
          ctrl: true,
          description: 'Show keyboard shortcuts',
          action: () => this.showHelp(),
          global: true
        },
        {
          key: 'Escape',
          ctrl: false,
          description: 'Close modals/overlays',
          action: () => this.closeModals(),
          global: true
        }
      ];
    }

    /**
     * Setup global keyboard event listener
     */
    setupGlobalListener() {
      document.addEventListener('keydown', (e) => {
        if (!this.enabled) return;

        // Don't trigger shortcuts when typing in input fields
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable
        );

        // Allow Esc and Ctrl+/ even in input fields
        if (isInputField && e.key !== 'Escape' && !(e.ctrlKey && e.key === '/')) {
          return;
        }

        // Check each shortcut
        this.shortcuts.forEach(shortcut => {
          const modifierPressed = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
          const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();

          if (modifierPressed && keyMatches) {
            e.preventDefault();
            shortcut.action();
          }
        });
      });
    }

    /**
     * Focus search input
     */
    focusSearch() {
      // Try multiple search input selectors
      const searchInput = document.querySelector('.search-bar input') ||
                         document.querySelector('input[type="search"]') ||
                         document.querySelector('input[placeholder*="Search" i]');

      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        
        // Visual feedback
        searchInput.style.boxShadow = '0 0 0 3px rgba(251, 146, 60, 0.3)';
        setTimeout(() => {
          searchInput.style.boxShadow = '';
        }, 500);

        console.log('Search focused');
      } else {
        console.log('No search input found on this page');
        
        // Show toast if available
        if (window.toastManager) {
          window.toastManager.info('Search not available on this page');
        }
      }
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode() {
      if (window.themeManager) {
        window.themeManager.toggleTheme();
        console.log('Dark mode toggled via keyboard shortcut');
      } else {
        console.log('Theme manager not available');
      }
    }

    /**
     * Navigate to a page
     */
    goToPage(page) {
      // Check if already on the page
      const currentPage = window.location.pathname.split('/').pop();
      
      if (currentPage === page) {
        console.log(`Already on ${page}`);
        
        if (window.toastManager) {
          window.toastManager.info(`Already on ${page.replace('.html', '')}`);
        }
        return;
      }

      console.log(`Navigating to ${page}`);
      window.location.href = page;
    }

    /**
     * Close open modals and overlays
     */
    closeModals() {
      // Close help modal if open
      if (this.helpModalVisible) {
        this.hideHelp();
        return;
      }

      // Try to close other modals
      const modalOverlay = document.querySelector('.modal-overlay');
      const confirmationModal = document.querySelector('.confirmation-modal');
      const loadingOverlay = document.querySelector('.loading-overlay');

      if (modalOverlay && modalOverlay.style.display !== 'none') {
        modalOverlay.style.display = 'none';
        console.log('Modal closed via Esc key');
      }

      if (confirmationModal && confirmationModal.style.display !== 'none') {
        confirmationModal.style.display = 'none';
        console.log('Confirmation modal closed via Esc key');
      }

      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }

    /**
     * Create help modal
     */
    createHelpModal() {
      // Check if modal already exists
      if (document.getElementById('keyboard-shortcuts-help')) {
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'keyboard-shortcuts-help';
      modal.className = 'shortcuts-help-modal';
      modal.style.display = 'none';

      modal.innerHTML = `
        <div class="shortcuts-help-overlay"></div>
        <div class="shortcuts-help-content">
          <div class="shortcuts-help-header">
            <h2>⌨️ Keyboard Shortcuts</h2>
            <button class="shortcuts-help-close" aria-label="Close">&times;</button>
          </div>
          <div class="shortcuts-help-body">
            ${this.generateShortcutsList()}
          </div>
          <div class="shortcuts-help-footer">
            <p>Press <kbd>Esc</kbd> or <kbd>${this.getModifierKey()} + /</kbd> to close</p>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Add event listeners
      modal.querySelector('.shortcuts-help-close').addEventListener('click', () => {
        this.hideHelp();
      });

      modal.querySelector('.shortcuts-help-overlay').addEventListener('click', () => {
        this.hideHelp();
      });

      // Add styles
      this.addHelpModalStyles();
    }

    /**
     * Generate shortcuts list HTML
     */
    generateShortcutsList() {
      const modifierKey = this.getModifierKey();
      let html = '<div class="shortcuts-list">';

      this.shortcuts.forEach(shortcut => {
        const key = shortcut.key === '/' ? '/' : shortcut.key.toUpperCase();
        const modifier = shortcut.ctrl ? `<kbd>${modifierKey}</kbd> + ` : '';

        html += `
          <div class="shortcut-item">
            <span class="shortcut-description">${shortcut.description}</span>
            <span class="shortcut-keys">${modifier}<kbd>${key}</kbd></span>
          </div>
        `;
      });

      html += '</div>';
      return html;
    }

    /**
     * Show help modal
     */
    showHelp() {
      const modal = document.getElementById('keyboard-shortcuts-help');
      if (modal) {
        modal.style.display = 'block';
        this.helpModalVisible = true;
        document.body.style.overflow = 'hidden';
        console.log('Keyboard shortcuts help shown');
      }
    }

    /**
     * Hide help modal
     */
    hideHelp() {
      const modal = document.getElementById('keyboard-shortcuts-help');
      if (modal) {
        modal.style.display = 'none';
        this.helpModalVisible = false;
        document.body.style.overflow = '';
        console.log('Keyboard shortcuts help hidden');
      }
    }

    /**
     * Add styles for help modal
     */
    addHelpModalStyles() {
      // Check if styles already added
      if (document.getElementById('keyboard-shortcuts-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'keyboard-shortcuts-styles';
      style.textContent = `
        .shortcuts-help-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
        }

        .shortcuts-help-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
        }

        .shortcuts-help-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: var(--white-color, #ffffff);
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .shortcuts-help-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .shortcuts-help-header h2 {
          margin: 0;
          font-size: 24px;
          color: var(--text-color, #1f2937);
        }

        .shortcuts-help-close {
          background: none;
          border: none;
          font-size: 32px;
          color: var(--text-light, #6b7280);
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .shortcuts-help-close:hover {
          background-color: var(--background-color, #f9fafb);
          color: var(--text-color, #1f2937);
        }

        .shortcuts-help-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: var(--background-color, #f9fafb);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .shortcut-item:hover {
          background-color: var(--background-secondary, #f3f4f6);
          transform: translateX(4px);
        }

        .shortcut-description {
          font-size: 15px;
          color: var(--text-color, #1f2937);
        }

        .shortcut-keys {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .shortcut-keys kbd {
          display: inline-block;
          padding: 4px 8px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-color, #1f2937);
          background-color: var(--white-color, #ffffff);
          border: 1px solid var(--border-color, #d1d5db);
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .shortcuts-help-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          text-align: center;
        }

        .shortcuts-help-footer p {
          margin: 0;
          font-size: 14px;
          color: var(--text-light, #6b7280);
        }

        /* Dark theme support */
        body.dark-theme .shortcuts-help-content {
          background-color: var(--background-secondary, #1e293b);
        }

        body.dark-theme .shortcut-item {
          background-color: var(--background-tertiary, #334155);
        }

        body.dark-theme .shortcut-item:hover {
          background-color: var(--border-light, #475569);
        }

        body.dark-theme .shortcut-keys kbd {
          background-color: var(--background-color, #0f172a);
          border-color: var(--border-light, #475569);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .shortcuts-help-content {
            width: 95%;
            max-height: 90vh;
          }

          .shortcut-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .shortcut-keys {
            align-self: flex-end;
          }
        }
      `;

      document.head.appendChild(style);
    }

    /**
     * Enable shortcuts
     */
    enable() {
      this.enabled = true;
      console.log('Keyboard shortcuts enabled');
    }

    /**
     * Disable shortcuts
     */
    disable() {
      this.enabled = false;
      console.log('Keyboard shortcuts disabled');
    }

    /**
     * Add custom shortcut
     */
    addShortcut(shortcut) {
      this.shortcuts.push(shortcut);
      console.log(`Added custom shortcut: ${shortcut.description}`);
    }
  }

  // Initialize keyboard shortcuts when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    const keyboardShortcuts = new KeyboardShortcutsManager();
    keyboardShortcuts.init();

    // Make globally accessible
    window.keyboardShortcuts = keyboardShortcuts;
  });

  // Export for use in modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcutsManager;
  }
})();
