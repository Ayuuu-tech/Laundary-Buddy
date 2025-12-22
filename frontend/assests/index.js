// index.js - Landing page functionality
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Landing page - no auto-redirect, accessible to everyone
    
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
