// Shared site scripts for Laundry Buddy
// Utilities: DOM ready, form validation, smooth scroll, small UI helpers
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function byId(id) { return document.getElementById(id); }

  function trim(v){ return (v||'').trim(); }

  onReady(function () {
    // Smooth scroll for same-page anchors (if any)
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var hash = a.getAttribute('href');
        if (hash.length > 1) {
          var target = document.querySelector(hash);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });

    // Login form validation (login.html)
    var emailEl = byId('email');
    var passwordEl = byId('password');
    if (emailEl && passwordEl) {
      var loginForm = emailEl.closest('form');
      if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
          var email = trim(emailEl.value);
          var pwd = trim(passwordEl.value);
          if (!email || !pwd) {
            e.preventDefault();
            alert('Please enter your Student ID/email and password.');
            return;
          }
          // Basic client-side check: password at least 6 chars
          if (pwd.length < 6) {
            e.preventDefault();
            alert('Password must be at least 6 characters.');
            passwordEl.focus();
            return;
          }
        });
      }
    }

    // Signup form validation (signup.html)
    var signupForm = byId('signup-form');
    if (signupForm) {
      var nameEl = byId('name');
      var roomEl = byId('room');
      var studentIdEl = byId('studentId');
      var passEl = byId('signup-password');
      var confirmEl = byId('confirm-password');

      signupForm.addEventListener('submit', function (e) {
        var name = trim(nameEl && nameEl.value);
        var room = trim(roomEl && roomEl.value);
        var sid = trim(studentIdEl && studentIdEl.value);
        var pw = trim(passEl && passEl.value);
        var cpw = trim(confirmEl && confirmEl.value);

        if (!name || !room || !sid || !pw || !cpw) {
          e.preventDefault();
          alert('Please fill out all fields.');
          return;
        }
        if (pw.length < 6) {
          e.preventDefault();
          alert('Password must be at least 6 characters.');
          passEl.focus();
          return;
        }
        if (pw !== cpw) {
          e.preventDefault();
          alert('Passwords do not match.');
          confirmEl.focus();
          return;
        }
      });
    }

    // Small helper: add data-current for footer copyright year
    var yearEls = document.querySelectorAll('[data-current-year]');
    if (yearEls.length) {
      var y = new Date().getFullYear();
      yearEls.forEach(function (el) { el.textContent = y; });
    }
  });
})();
