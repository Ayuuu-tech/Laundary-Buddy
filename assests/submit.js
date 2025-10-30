// submit.js - Submit laundry page functionality
(function () {
  'use strict';

  // Check authentication before initializing page
  if (window.authManager && !window.authManager.isLoggedIn()) {
    alert('Please login to submit laundry.');
    window.location.href = 'login.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const submitForm = document.querySelector('form');
    const clothesCountInput = document.getElementById('clothes-count');
    const clothesTypeSelect = document.getElementById('clothes-type');
    const specialNotesInput = document.getElementById('special-notes');
    const cancelBtn = document.querySelector('.btn-secondary');

    if (submitForm) {
      submitForm.addEventListener('submit', function (e) {
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
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
          alert('User session not found. Please login again.');
          window.location.href = 'login.html';
          return;
        }

        // Generate unique token
        const tokenNumber = generateUniqueToken();

        // Create laundry submission object
        const submission = {
          tokenNumber: tokenNumber,
          studentId: currentUser.studentId,
          studentName: currentUser.name,
          hostelRoom: currentUser.hostelRoom,
          submittedDate: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          currentStatus: 'received',
          statusHistory: [
            {
              status: 'received',
              timestamp: new Date().toISOString(),
              description: 'Laundry received and queued'
            }
          ],
          items: [
            {
              type: clothesType,
              count: parseInt(clothesCount),
              color: 'mixed'
            }
          ],
          specialInstructions: specialNotes || 'None',
          progress: 10,
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        };

        // Save to localStorage
        saveSubmission(submission);

        console.log('Laundry submitted:', submission);
        
        // Reset form after submission
        submitForm.reset();
        
        // Show QR code modal with plain token (simple, fast scanning)
        showQrCodeModal(submission);
      });
    }    // Function to generate unique token
    function generateUniqueToken() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9000) + 1000;
      return `LB-${year}${month}${day}-${random}`;
    }

    // Function to save submission to localStorage
    function saveSubmission(submission) {
      try {
        // Get existing submissions
        const submissions = JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
        
        // Add new submission
        submissions.push(submission);
        
        // Save back to localStorage
        localStorage.setItem('laundryBuddy_submissions', JSON.stringify(submissions));
        
        console.log('Submission saved to localStorage');
      } catch (error) {
        console.error('Error saving submission:', error);
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
