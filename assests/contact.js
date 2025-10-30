// contact.js - Contact page form functionality
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.querySelector('form');

    if (contactForm) {
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const hostelInput = document.getElementById('hostel');
      const messageInput = document.getElementById('message');

      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const hostel = hostelInput.value.trim();
        const message = messageInput.value.trim();

        // Validate all fields are filled
        if (!name || !email || !hostel || !message) {
          alert('Please fill out all fields.');
          return;
        }

        // Validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          alert('Please enter a valid email address.');
          emailInput.focus();
          return;
        }

        // Validate message length
        if (message.length < 10) {
          alert('Please enter a message with at least 10 characters.');
          messageInput.focus();
          return;
        }

        // Success message
        alert('Thank you for contacting us! We will get back to you soon.');
        contactForm.reset();
        console.log('Contact form submitted');
      });

      // Character counter for message
      if (messageInput) {
        messageInput.addEventListener('input', function () {
          const length = this.value.length;
          if (length > 0 && length < 10) {
            this.style.borderColor = '#f44336';
          } else if (length >= 10) {
            this.style.borderColor = '#4CAF50';
          } else {
            this.style.borderColor = '';
          }
        });
      }
    }

    console.log('Contact page loaded');
  });
})();
