// home.js - Home page functionality with OOP concepts
(function () {
  'use strict';

  // Class for managing card animations and interactions
  class CardManager {
    constructor(selector, animationType = 'lift') {
      this.cards = document.querySelectorAll(selector);
      this.animationType = animationType;
      this.init();
    }

    init() {
      this.cards.forEach(card => {
        this.addHoverEffect(card);
      });
    }

    addHoverEffect(card) {
      card.addEventListener('mouseenter', () => {
        this.animateIn(card);
      });
      
      card.addEventListener('mouseleave', () => {
        this.animateOut(card);
      });
    }

    animateIn(card) {
      if (this.animationType === 'lift') {
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
      } else if (this.animationType === 'scale') {
        card.style.transform = 'scale(1.03)';
      }
    }

    animateOut(card) {
      if (this.animationType === 'lift') {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '';
      } else if (this.animationType === 'scale') {
        card.style.transform = 'scale(1)';
      }
    }

    getCardCount() {
      return this.cards.length;
    }
  }

  // Class for managing hero section animations
  class HeroAnimator {
    constructor(selector) {
      this.heroContent = document.querySelector(selector);
      this.animationDuration = 600; // ms
      this.delay = 100; // ms
    }

    animate() {
      if (!this.heroContent) return;

      this.heroContent.style.opacity = '0';
      this.heroContent.style.transform = 'translateY(20px)';
      this.heroContent.style.transition = `opacity ${this.animationDuration}ms ease, transform ${this.animationDuration}ms ease`;
      
      setTimeout(() => {
        this.heroContent.style.opacity = '1';
        this.heroContent.style.transform = 'translateY(0)';
      }, this.delay);
    }

    setDelay(delay) {
      this.delay = delay;
      return this;
    }

    setDuration(duration) {
      this.animationDuration = duration;
      return this;
    }
  }

  // Class for managing page statistics and analytics
  class PageAnalytics {
    constructor() {
      this.visitTime = new Date();
      this.interactions = 0;
      this.trackInteractions();
    }

    trackInteractions() {
      document.addEventListener('click', () => {
        this.interactions++;
      });
    }

    getSessionData() {
      return {
        visitTime: this.visitTime,
        interactions: this.interactions,
        duration: (new Date() - this.visitTime) / 1000 // seconds
      };
    }

    logSessionData() {
      const data = this.getSessionData();
      console.log('Session Data:', data);
      return data;
    }
  }

  // Main App Class that orchestrates everything
  class HomePageApp {
    constructor() {
      this.accessCardManager = null;
      this.featureCardManager = null;
      this.heroAnimator = null;
      this.analytics = null;
    }

    init() {
      // Initialize all components
      this.accessCardManager = new CardManager('.access-card', 'lift');
      this.featureCardManager = new CardManager('.feature-card', 'scale');
      this.heroAnimator = new HeroAnimator('.hero-content');
      this.analytics = new PageAnalytics();

      // Run animations
      this.heroAnimator.animate();

      // Log initialization
      console.log('Home page loaded with OOP architecture');
      console.log(`Access Cards: ${this.accessCardManager.getCardCount()}`);
      console.log(`Feature Cards: ${this.featureCardManager.getCardCount()}`);
    }

    getAnalytics() {
      return this.analytics.logSessionData();
    }
  }

  // Check authentication and initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    if (window.authManager) {
      try {
        const isLoggedIn = await window.authManager.isLoggedIn();
        if (!isLoggedIn) {
          window.location.href = 'login.html';
          return;
        }
        // Update profile photo everywhere after login check
        window.authManager.loadProfilePhoto();
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return;
      }
    }

    // Initialize page after auth check passes
    const app = new HomePageApp();
    app.init();

    // Make app accessible globally for debugging
    window.homePageApp = app;
  });
})();

