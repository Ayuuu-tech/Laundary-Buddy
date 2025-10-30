// profile.js - Profile page functionality with user data display
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // Require authentication
    if (window.authManager) {
      if (!window.authManager.requireAuth()) {
        return;
      }
    }

    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

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
          const result = window.authManager.updateProfile({
            phone: phoneInput.value.trim(),
            hostelRoom: roomInput.value.trim(),
            laundryPreferences: prefsInput.value.trim()
          });

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
            alert(result.message);
          }
        }
      });
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          console.log('User logged out');
          if (window.authManager) {
            window.authManager.logout();
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
      avatarImg.src = user.profilePhoto;
      updateHeaderProfilePhoto(user.profilePhoto);
    }

    // Click on avatar wrapper to upload photo
    avatarWrapper.addEventListener('click', function() {
      avatarUpload.click();
    });

    // Handle file upload
    avatarUpload.addEventListener('change', function(e) {
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
      
      reader.onload = function(event) {
        const imageData = event.target.result;
        
        // Update avatar preview
        avatarImg.src = imageData;
        
        // Update header profile photo
        updateHeaderProfilePhoto(imageData);
        
        // Save to localStorage
        saveProfilePhoto(imageData);
        
        // Show success message
        alert('✅ Profile photo updated successfully!');
        
        console.log('Profile photo updated');
      };

      reader.onerror = function() {
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

  // Function to save profile photo to localStorage
  function saveProfilePhoto(imageData) {
    try {
      if (!window.authManager) return;

      const currentUser = window.authManager.getCurrentUser();
      if (!currentUser) return;

      // Update user object with new photo
      const users = JSON.parse(localStorage.getItem('laundryBuddy_users') || '[]');
      const userIndex = users.findIndex(u => u.id === currentUser.id);

      if (userIndex !== -1) {
        users[userIndex].profilePhoto = imageData;
        localStorage.setItem('laundryBuddy_users', JSON.stringify(users));

        // Update current session
        const session = window.authManager.getCurrentUser();
        if (session) {
          session.profilePhoto = imageData;
          localStorage.setItem('laundryBuddy_currentUser', JSON.stringify(session));
        }

        console.log('Profile photo saved to localStorage');
      }
    } catch (error) {
      console.error('Error saving profile photo:', error);
      alert('Error saving photo. Please try again.');
    }
  }

  // Function to display user information in the profile
  function displayUserInfo(user) {
    // Update profile header
    const profileName = document.querySelector('.profile-header h2');
    const profileEmail = document.querySelector('.profile-header p');
    const profileAvatar = document.getElementById('profile-avatar');
    
    if (profileName) {
      profileName.textContent = user.name;
    }
    
    if (profileEmail) {
      profileEmail.textContent = user.email;
    }

    // Update profile photo if exists
    if (profileAvatar && user.profilePhoto) {
      profileAvatar.src = user.profilePhoto;
    }

    // Update form inputs
    const phoneInput = document.getElementById('phone');
    const roomInput = document.getElementById('room');
    const prefsInput = document.getElementById('prefs');

    if (phoneInput) {
      phoneInput.value = user.phone || '';
    }
    
    if (roomInput) {
      roomInput.value = user.hostelRoom || '';
    }
    
    if (prefsInput) {
      prefsInput.value = user.laundryPreferences || 'Standard detergent';
    }

    // Add user info section (if not exists)
    const profileHeader = document.querySelector('.profile-header');
    if (profileHeader && !document.getElementById('user-details')) {
      const userDetails = document.createElement('div');
      userDetails.id = 'user-details';
      userDetails.style.cssText = 'margin-top: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: left;';
      userDetails.innerHTML = `
        <p><strong>Student ID:</strong> ${user.studentId}</p>
        <p><strong>Hostel/Room:</strong> ${user.hostelRoom}</p>
        <p style="margin-bottom: 0;"><strong>Member Since:</strong> ${new Date(user.loginTime || Date.now()).toLocaleDateString()}</p>
      `;
      profileHeader.appendChild(userDetails);
    }
  }
})();

