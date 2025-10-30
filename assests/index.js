// index.js - Landing page functionality
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Check if user is already logged in
    if (window.authManager && window.authManager.isLoggedIn()) {
      const currentUser = window.authManager.getCurrentUser();
      console.log('User already logged in:', currentUser.name);
      
      // Show welcome message and redirect
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1000);
      
      // Show a message
      const hero = document.querySelector('.hero-text');
      if (hero) {
        const welcomeMsg = document.createElement('p');
        welcomeMsg.style.cssText = 'color: #4CAF50; font-weight: 600; margin-top: 10px;';
        welcomeMsg.textContent = `Welcome back, ${currentUser.name}! Redirecting...`;
        hero.appendChild(welcomeMsg);
      }
      return;
    }

    // Smooth scroll for hero buttons
    const heroButtons = document.querySelectorAll('.hero-buttons a');
    heroButtons.forEach(function (btn) {
      btn.addEventListener('mouseenter', function () {
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'scale(1)';
      });
    });

    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    featureCards.forEach(function (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(card);
    });

    console.log('Index page loaded');
  });
})();
