/**
 * DARK MODE MANAGER
 * 
 * Complete theme management system for Laundry Buddy application.
 * Handles theme switching, persistence, and system preference detection.
 * 
 * Features:
 * - Toggle between light and dark themes
 * - Persist theme preference in localStorage
 * - Auto-detect system theme preference
 * - Smooth theme transitions
 * - Accessible keyboard controls
 * 
 * Usage:
 * const themeManager = new ThemeManager();
 * themeManager.init();
 * 
 * Created: 2025
 * Part of: Laundry Buddy College Project
 */

(function () {
  'use strict';

  /**
   * ThemeManager Class
   * Manages application theme switching and persistence
   */
  class ThemeManager {
    constructor() {
      this.storageKey = 'laundryBuddy_theme';
      this.currentTheme = 'light';
      this.toggleButton = null;
      this.systemPreference = null;
    }

    /**
     * Initialize the theme manager
     */
    init() {
      this.detectSystemPreference();
      this.loadThemePreference();
      this.createToggleButton();
      this.applyTheme(this.currentTheme, false);
      this.setupEventListeners();
      
      console.log('✓ Theme Manager initialized');
      console.log(`Current theme: ${this.currentTheme}`);
    }

    /**
     * Detect system theme preference
     */
    detectSystemPreference() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.systemPreference = 'dark';
      } else {
        this.systemPreference = 'light';
      }

      // Listen for system theme changes
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          this.systemPreference = e.matches ? 'dark' : 'light';
          console.log(`System theme changed to: ${this.systemPreference}`);
          
          // Only auto-switch if user hasn't set a preference
          const savedTheme = localStorage.getItem(this.storageKey);
          if (!savedTheme) {
            this.applyTheme(this.systemPreference);
          }
        });
      }
    }

    /**
     * Load theme preference from localStorage
     */
    loadThemePreference() {
      const savedTheme = localStorage.getItem(this.storageKey);
      
      if (savedTheme) {
        this.currentTheme = savedTheme;
      } else {
        // Use system preference if no saved theme
        this.currentTheme = this.systemPreference;
      }
    }

    /**
     * Save theme preference to localStorage
     */
    saveThemePreference(theme) {
      localStorage.setItem(this.storageKey, theme);
      console.log(`Theme preference saved: ${theme}`);
    }

    /**
     * Create theme toggle button and add to navigation
     */
    createToggleButton() {
      // Check if toggle already exists
      const existingToggle = document.querySelector('.theme-toggle');
      if (existingToggle) {
        this.toggleButton = existingToggle;
        return;
      }

      // Create toggle button
      this.toggleButton = document.createElement('button');
      this.toggleButton.className = 'theme-toggle';
      this.toggleButton.setAttribute('aria-label', 'Toggle dark mode');
      this.toggleButton.setAttribute('title', 'Toggle dark mode');
      
      this.toggleButton.innerHTML = `
        <i class='bx bx-sun'></i>
        <span class="theme-toggle-slider"></span>
        <i class='bx bx-moon'></i>
      `;

      // Add to navigation
      const nav = document.querySelector('.navbar nav ul');
      if (nav) {
        const li = document.createElement('li');
        li.appendChild(this.toggleButton);
        nav.appendChild(li);
      } else {
        // Fallback: add to header
        const header = document.querySelector('header .navbar');
        if (header) {
          header.appendChild(this.toggleButton);
        }
      }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      if (!this.toggleButton) return;

      // Click event
      this.toggleButton.addEventListener('click', () => {
        this.toggleTheme();
      });

      // Keyboard shortcut: Ctrl/Cmd + D
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
      const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.applyTheme(newTheme);
      this.saveThemePreference(newTheme);

      // Optional: Show toast notification (if toast manager is available)
      if (window.toastManager) {
        const message = newTheme === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled';
        window.toastManager.info(message, {
          duration: 2000,
          position: 'bottom-right'
        });
      }
    }

    /**
     * Apply theme to the document
     * @param {string} theme - Theme to apply ('light' or 'dark')
     * @param {boolean} animate - Whether to animate the transition
     */
    applyTheme(theme, animate = true) {
      this.currentTheme = theme;

      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }

      // Update toggle button aria-label
      if (this.toggleButton) {
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        this.toggleButton.setAttribute('aria-label', label);
        this.toggleButton.setAttribute('title', label);
      }

      // Update meta theme-color for mobile browsers
      this.updateMetaThemeColor(theme);

      console.log(`Theme applied: ${theme}`);
    }

    /**
     * Update meta theme-color for mobile browsers
     * @param {string} theme - Current theme
     */
    updateMetaThemeColor(theme) {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }

      // Set color based on theme
      const color = theme === 'dark' ? '#1E293B' : '#FFFFFF';
      metaThemeColor.content = color;
    }

    /**
     * Get current theme
     * @returns {string} Current theme ('light' or 'dark')
     */
    getTheme() {
      return this.currentTheme;
    }

    /**
     * Set theme programmatically
     * @param {string} theme - Theme to set ('light' or 'dark')
     */
    setTheme(theme) {
      if (theme !== 'light' && theme !== 'dark') {
        console.error('Invalid theme. Use "light" or "dark"');
        return;
      }

      this.applyTheme(theme);
      this.saveThemePreference(theme);
    }

    /**
     * Reset to system preference
     */
    resetToSystemPreference() {
      localStorage.removeItem(this.storageKey);
      this.applyTheme(this.systemPreference);
      
      console.log(`Theme reset to system preference: ${this.systemPreference}`);
      
      if (window.toastManager) {
        window.toastManager.info('Theme reset to system preference', {
          duration: 2000
        });
      }
    }
  }

  // Initialize theme manager when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    const themeManager = new ThemeManager();
    themeManager.init();

    // Make theme manager globally accessible
    window.themeManager = themeManager;
  });

  // Export for use in modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
  }
})();
