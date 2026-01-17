// submit.js - Submit laundry page functionality
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async function () {
    console.log('📄 Submit page loading...');

    // Check authentication before initializing page
    try {
      if (!window.authManager) {
        console.error('❌ Auth manager not loaded');
        alert('Authentication system not loaded. Please refresh the page.');
        window.location.href = 'login.html';
        return;
      }

      console.log('🔍 Checking if user is logged in...');
      const isLoggedIn = await window.authManager.isLoggedIn();
      console.log('✅ Login check result:', isLoggedIn);

      if (!isLoggedIn) {
        console.log('❌ User not logged in, redirecting...');
        alert('Please login to submit laundry.');
        window.location.href = 'login.html';
        return;
      }

      // Update profile photo everywhere after login check
      window.authManager.loadProfilePhoto();

      console.log('✅ User authenticated, loading submit form...');
    } catch (error) {
      console.error('❌ Auth check error:', error);
      alert('Error checking authentication: ' + error.message);
      window.location.href = 'login.html';
      return;
    }
    const submitForm = document.querySelector('form');
    const clothesCountInput = document.getElementById('clothes-count');
    const clothesTypeSelect = document.getElementById('clothes-type');
    const specialNotesInput = document.getElementById('special-notes');
    const cancelBtn = document.querySelector('.btn-secondary');

    if (submitForm) {
      submitForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const clothesCount = clothesCountInput.value.trim();
        const clothesType = clothesTypeSelect.value;
        const specialNotes = specialNotesInput.value.trim();

        // Validate clothes count
        if (!clothesCount || clothesCount <= 0) {
          alert('Please enter a valid number of clothes.');
          clothesCountInput.focus();
          return;
        }

        // Validate clothes type
        if (!clothesType) {
          alert('Please select a clothes type.');
          clothesTypeSelect.focus();
          return;
        }

        // Get current user
        const currentUser = await window.authManager.getCurrentUser();
        if (!currentUser) {
          alert('User session not found. Please login again.');
          window.location.href = 'login.html';
          return;
        }

        // Generate unique token
        const tokenNumber = generateUniqueToken();

        // Create order object for backend API
        const orderData = {
          serviceType: clothesType,
          pickupDate: new Date().toISOString().split('T')[0],
          pickupTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
          deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [
            {
              type: clothesType,
              count: parseInt(clothesCount),
              color: 'mixed'
            }
          ],
          totalAmount: parseInt(clothesCount) * 10, // ₹10 per item
          address: currentUser.hostelRoom || 'N/A',
          phone: currentUser.phone || 'N/A',
          specialInstructions: specialNotes || 'None'
        };

        // Save order to backend
        submitOrderToBackend(orderData, tokenNumber);
      });
    }    // Function to generate unique token
    function generateUniqueToken() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const random = (array[0] % 9000) + 1000;

      return `LB-${year}${month}${day}-${random}`;
    }

    // Function to submit order to backend
    async function submitOrderToBackend(orderData, tokenNumber) {
      try {
        console.log('🚀 Starting order submission...');
        console.log('Order data:', orderData);

        // Show loading state
        const submitButton = submitForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        // Check if orderManager exists
        if (!window.orderManager) {
          console.error('❌ Order manager not initialized!');
          throw new Error('Order system not ready. Please refresh the page.');
        }

        console.log('✅ Order manager found, calling API...');

        // Call backend API
        const response = await window.orderManager.createOrder(orderData);
        console.log('📦 Backend response:', response);

        if (response.success) {
          console.log('✅ Order saved to MongoDB:', response.order);
          alert('🎉 Order submitted successfully!\n\nOrder #: ' + response.order.orderNumber);

          // Get current user for submission object
          const currentUser = await authManager.getCurrentUser();

          // Create submission object for QR display
          const submission = {
            tokenNumber: response.order.orderNumber || tokenNumber,
            studentId: currentUser.email,
            studentName: currentUser.name,
            hostelRoom: orderData.address,
            submittedDate: new Date().toISOString(),
            estimatedCompletion: orderData.deliveryDate,
            currentStatus: response.order.status || 'pending',
            items: orderData.items,
            specialInstructions: orderData.specialInstructions
          };

          // Also save to localStorage as backup
          saveToLocalStorage(submission);

          // Reset form
          submitForm.reset();

          // Show success and QR code
          showQrCodeModal(submission);
        } else {
          console.error('❌ Order creation failed:', response.message);
          throw new Error(response.message || 'Failed to create order');
        }

        // Restore button
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      } catch (error) {
        console.error('Error submitting order:', error);
        alert('Error submitting order: ' + error.message + '\nPlease try again or contact support.');

        // Restore button
        const submitButton = submitForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Laundry';
      }
    }

    // Function to save to localStorage as backup
    function saveToLocalStorage(submission) {
      try {
        const submissions = JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
        submissions.push(submission);
        localStorage.setItem('laundryBuddy_submissions', JSON.stringify(submissions));
        console.log('Backup saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }

    // Build compact payload for QR content
    function buildQrPayload(sub) {
      return {
        t: sub.tokenNumber,
        sid: sub.studentId,
        nm: sub.studentName,
        rm: sub.hostelRoom,
        sd: sub.submittedDate,
        eta: sub.estimatedCompletion,
        s: sub.currentStatus,
        p: sub.progress,
        it: sub.items,
        sh: sub.statusHistory
      };
    }

    function b64EncodeUnicode(str) {
      // encodeURIComponent -> replace to handle unicode safely
      return btoa(unescape(encodeURIComponent(str)));
    }

    function makeQrText(submission) {
      // SIMPLE QR: Just the plain token text for instant scanning
      // Data is in localStorage, laundry will merge from there
      return submission.tokenNumber;
    }

    // Function to show QR code modal
    function showQrCodeModal(submission) {
      const modal = document.getElementById('qr-code-modal');
      const qrContainer = document.getElementById('qr-code-container');
      const tokenDisplay = document.getElementById('token-display');

      if (!modal || !qrContainer || !tokenDisplay) {
        // Fallback if modal not found
        alert(`Laundry submitted successfully!\n\nYour Token Number: ${submission.tokenNumber}\n\nYou can track your laundry using this token on the Track page.`);
        window.location.href = `track.html?token=${submission.tokenNumber}`;
        return;
      }

      // Display token
      tokenDisplay.textContent = `Token: ${submission.tokenNumber}`;

      // Clear previous QR code
      qrContainer.innerHTML = '';

      // Generate QR code
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: makeQrText(submission),
          width: 280,
          height: 280,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } else {
        qrContainer.innerHTML = '<p style="color: #f44336;">QR Code library not loaded</p>';
      }

      // Show modal
      modal.style.display = 'flex';

      // Setup modal buttons
      setupModalButtons(submission.tokenNumber);
    }

    // Function to setup modal buttons
    function setupModalButtons(tokenNumber) {
      const closeBtn = document.getElementById('close-qr-modal');
      const downloadBtn = document.getElementById('download-qr');
      const trackBtn = document.getElementById('track-now');

      if (closeBtn) {
        closeBtn.onclick = () => {
          document.getElementById('qr-code-modal').style.display = 'none';
          window.location.href = 'home.html';
        };
      }

      if (downloadBtn) {
        downloadBtn.onclick = () => {
          downloadQrCode(tokenNumber);
        };
      }

      if (trackBtn) {
        trackBtn.onclick = () => {
          window.location.href = `track.html?token=${tokenNumber}`;
        };
      }
    }

    // Function to download QR code
    function downloadQrCode(tokenNumber) {
      const qrContainer = document.getElementById('qr-code-container');
      const canvas = qrContainer.querySelector('canvas');

      if (canvas) {
        const link = document.createElement('a');
        link.download = `laundry-token-${tokenNumber}.png`;
        link.href = canvas.toDataURL();
        link.click();
        alert('QR Code downloaded successfully!');
      } else {
        alert('Unable to download QR code');
      }
    }

    // Cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to cancel? All data will be lost.')) {
          submitForm.reset();
          window.location.href = 'home.html';
        }
      });
    }

    // Clothes count validation
    if (clothesCountInput) {
      clothesCountInput.addEventListener('input', function () {
        const value = parseInt(this.value);
        if (value > 0) {
          this.style.borderColor = '#4CAF50';
        } else {
          this.style.borderColor = '#f44336';
        }
      });
    }

    // Update progress bar (simulated)
    const progressBar = document.querySelector('.progress-bar-fill');
    if (progressBar) {
      progressBar.style.width = '33%'; // Step 1 of 3
    }

    console.log('Submit page loaded');
  });
})();
