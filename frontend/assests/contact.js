// contact.js - Contact page form functionality
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    const contactForm = document.querySelector('form');

    if (contactForm) {
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const hostelInput = document.getElementById('hostel');
      const messageInput = document.getElementById('message');

      // Auto-fill user data if logged in
      try {
        if (window.authManager) {
          const user = await window.authManager.getCurrentUser();
          if (user) {
            if (nameInput && user.name) {
              nameInput.value = user.name;
              nameInput.readOnly = true;
              nameInput.style.backgroundColor = '#f5f5f5';
            }
            if (emailInput && user.email) {
              emailInput.value = user.email;
              emailInput.readOnly = true;
              emailInput.style.backgroundColor = '#f5f5f5';
            }
            if (hostelInput && (user.hostelRoom || user.room || user.address)) {
              hostelInput.value = user.hostelRoom || user.room || user.address || '';
              hostelInput.readOnly = true;
              hostelInput.style.backgroundColor = '#f5f5f5';
            }
            console.log('✅ Auto-filled contact form with user data');
          }
        }
      } catch (error) {
        console.log('User not logged in, form fields empty');
      }

      contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const hostel = hostelInput.value.trim();
        const message = messageInput.value.trim();

        // Validate all fields are filled
        if (!name || !email || !message) {
          alert('Please fill out all required fields (Name, Email, Message).');
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

        // Get current user if logged in
        let userId = null;
        if (window.authManager && window.authManager.isLoggedIn()) {
          const user = window.authManager.getCurrentUser();
          if (user && user._id) userId = user._id;
        }

        // Disable submit button while processing
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Sending...';
        submitBtn.disabled = true;

        try {
          // Send to backend API
          const response = await fetch(API_CONFIG.BASE_URL + '/contact/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name,
              email,
              hostelRoom: hostel,
              message,
              userId
            })
          });

          const data = await response.json();

          if (data.success) {
            alert('✅ ' + (data.message || 'Message sent successfully! We will get back to you soon.'));
            contactForm.reset();
            console.log('Contact form submitted successfully, ID:', data.contactId);
          } else {
            throw new Error(data.message || 'Failed to send message');
          }
        } catch (error) {
          console.error('Error submitting contact form:', error);
          alert('❌ Error sending message: ' + error.message + '. Please try again.');
        } finally {
          // Re-enable submit button
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
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
