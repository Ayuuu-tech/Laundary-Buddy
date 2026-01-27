// profile.js - Profile page functionality with user data display
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    // Require authentication
    if (!window.authManager) {
      alert('Authentication system not loaded. Please refresh.');
      window.location.href = 'login.html';
      return;
    }

    const isLoggedIn = await window.authManager.isLoggedIn();
    if (!isLoggedIn) {
      alert('Please login to access this page.');
      window.location.href = 'login.html';
      return;
    }

    const currentUser = await window.authManager.getCurrentUser();

    if (!currentUser) {
      alert('Session expired. Please login again.');
      window.location.href = 'login.html';
      return;
    }

    // Display user information
    displayUserInfo(currentUser);

    // Setup profile photo functionality
    setupProfilePhoto(currentUser);

    const profileForm = document.querySelector('form');
    const editBtn = document.querySelector('.btn-secondary');
    const saveBtn = document.querySelector('.btn-primary');
    const logoutBtn = document.querySelector('.btn-logout');

    const phoneInput = document.getElementById('phone');
    const roomInput = document.getElementById('room');
    const prefsInput = document.getElementById('prefs');

    // Edit Profile button
    if (editBtn) {
      editBtn.addEventListener('click', function (e) {
        e.preventDefault();

        // Enable inputs
        phoneInput.disabled = false;
        roomInput.disabled = false;
        prefsInput.disabled = false;

        // Change input styles
        phoneInput.style.backgroundColor = '#fff';
        roomInput.style.backgroundColor = '#fff';
        prefsInput.style.backgroundColor = '#fff';

        alert('You can now edit your profile information.');
      });
    }

    // Save Changes button
    if (profileForm) {
      profileForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validate phone number (basic)
        const phone = phoneInput.value.trim();
        if (phone && !/^\d{10}$/.test(phone)) {
          alert('Please enter a valid 10-digit phone number.');
          phoneInput.focus();
          return;
        }

        // Update profile using auth system
        if (window.authManager) {
          window.authManager.updateProfile({
            phone: phoneInput.value.trim(),
            address: roomInput.value.trim()
          }).then(result => {
            if (result.success) {
              alert(result.message);
              // Disable inputs again
              phoneInput.disabled = true;
              roomInput.disabled = true;
              prefsInput.disabled = true;
              phoneInput.style.backgroundColor = '#f5f5f5';
              roomInput.style.backgroundColor = '#f5f5f5';
              prefsInput.style.backgroundColor = '#f5f5f5';
              console.log('Profile updated:', result.user);
            } else {
              if (result.message && result.message.includes('Route not found')) {
                alert('Profile update route not found. Please contact support.');
              } else {
                alert(result.message);
              }
            }
          }).catch(error => {
            alert('Error updating profile: ' + error.message);
          });
        }
      });
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          console.log('User logged out');
          if (window.authManager) {
            await window.authManager.logout();
          } else {
            window.location.href = 'index.html';
          }
        }
      });
    }

    // Quick links hover effects
    const quickLinks = document.querySelectorAll('.quick-links a');
    quickLinks.forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        this.style.backgroundColor = '#f0f0f0';
      });
      link.addEventListener('mouseleave', function () {
        this.style.backgroundColor = '';
      });
    });

    console.log('Profile page loaded for user:', currentUser.name);
  });

  // Function to setup profile photo upload
  function setupProfilePhoto(user) {
    const avatarWrapper = document.querySelector('.avatar-wrapper');
    const avatarImg = document.getElementById('profile-avatar');
    const avatarUpload = document.getElementById('avatar-upload');

    if (!avatarWrapper || !avatarImg || !avatarUpload) return;

    // Load saved profile photo if exists
    if (user.profilePhoto) {
      let photoUrl = user.profilePhoto;
      if (photoUrl.startsWith('/') && window.API_CONFIG && window.API_CONFIG.BASE_URL) {
        photoUrl = window.API_CONFIG.BASE_URL + photoUrl;
      }
      avatarImg.src = photoUrl;
      updateHeaderProfilePhoto(photoUrl);
    }

    // Click on avatar wrapper to upload photo
    avatarWrapper.addEventListener('click', function () {
      avatarUpload.click();
    });

    // Handle file upload
    avatarUpload.addEventListener('change', async function (e) {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, etc.)');
        return;
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      if (file.size > maxSize) {
        alert('Image size should be less than 2MB. Please choose a smaller image.');
        return;
      }

      // Read and preview the image
      const reader = new FileReader();
      reader.onload = async function (event) {
        const imageData = event.target.result;
        // Update avatar preview
        avatarImg.src = imageData;
        updateHeaderProfilePhoto(imageData);

        // Send to backend
        try {
          const result = await window.authManager.updateProfile({ profilePhoto: imageData });
          if (result.success) {
            alert('✅ Profile photo updated successfully!');
          } else {
            if (result.message && result.message.includes('Route not found')) {
              alert('Profile photo update route not found. Please contact support.');
            } else {
              alert('Error saving profile photo: ' + (result.message || 'Unknown error'));
            }
          }
        } catch (err) {
          alert('Error saving profile photo: ' + err.message);
        }
      };
      reader.onerror = function () {
        alert('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    });

    // Add hover effect styling
    avatarWrapper.style.cursor = 'pointer';
    avatarWrapper.style.position = 'relative';
  }

  // Function to update header profile photo
  function updateHeaderProfilePhoto(imageData) {
    const headerProfileImg = document.querySelector('.header-actions img');
    if (headerProfileImg) {
      headerProfileImg.src = imageData;
    }
  }

  // No longer needed: saveProfilePhoto (now handled by backend)

  // Function to display user information in the profile
  function displayUserInfo(user) {
    // Update profile header
    const profileName = document.querySelector('.profile-header h2');
    const profileEmail = document.querySelector('.profile-header p');
    const profileAvatar = document.getElementById('profile-avatar');

    if (profileName) {
      profileName.textContent = user.name || 'User';
    }

    if (profileEmail) {
      profileEmail.textContent = user.email || '';
    }

    // Update profile photo if exists
    if (profileAvatar && user.profilePhoto) {
      let photoUrl = user.profilePhoto;
      if (photoUrl.startsWith('/') && window.API_CONFIG && window.API_CONFIG.BASE_URL) {
        photoUrl = window.API_CONFIG.BASE_URL + photoUrl;
      }
      profileAvatar.src = photoUrl;
    }

    // Update form inputs
    const phoneInput = document.getElementById('phone');
    const roomInput = document.getElementById('room');
    const prefsInput = document.getElementById('prefs');

    if (phoneInput) {
      phoneInput.value = user.phone || '';
    }

    if (roomInput) {
      roomInput.value = user.address || '';
    }

    if (prefsInput) {
      prefsInput.value = 'Standard detergent';
    }

    console.log('User info displayed:', user.name, user.email);
  }
})();

