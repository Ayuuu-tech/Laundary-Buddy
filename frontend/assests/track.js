// track.js - Track laundry page functionality with JSON and OOP
(function () {
  'use strict';

  // Class representing a laundry item
  class LaundryItem {
    constructor(data) {
      this.tokenNumber = data.tokenNumber;
      this.studentId = data.studentId;
      this.studentName = data.studentName;
      this.hostelRoom = data.hostelRoom;
      this.submittedDate = new Date(data.submittedDate);
      this.estimatedCompletion = new Date(data.estimatedCompletion);
      this.currentStatus = data.currentStatus;
      this.statusHistory = data.statusHistory;
      this.items = data.items;
      this.specialInstructions = data.specialInstructions;
      this.progress = data.progress;
      this.qrCode = data.qrCode;
    }

    getItemsDescription() {
      return this.items.map(item => 
        `${item.count} ${item.color} ${item.type}${item.count > 1 ? 's' : ''}`
      ).join(', ');
    }

    getEstimatedCompletionTime() {
      const hours = this.estimatedCompletion.getHours();
      const minutes = this.estimatedCompletion.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
      return `${displayHours}:${displayMinutes} ${ampm}`;
    }

    getStatusLabel(statusDefinitions) {
      const statusDef = statusDefinitions[this.currentStatus];
      return statusDef ? statusDef.label : this.currentStatus;
    }

    getStatusColor(statusDefinitions) {
      const statusDef = statusDefinitions[this.currentStatus];
      return statusDef ? statusDef.color : '#666';
    }

    getLatestStatusUpdate() {
      if (this.statusHistory.length === 0) return 'No updates';
      const latest = this.statusHistory[this.statusHistory.length - 1];
      return latest.description;
    }
  }

  // Class for managing laundry tracking
  class LaundryTracker {
    constructor(trackingData) {
      this.laundryItems = trackingData.laundryItems.map(data => new LaundryItem(data));
      this.statusDefinitions = trackingData.statusDefinitions;
      this.currentItem = null;
    }

    findByToken(tokenNumber) {
      return this.laundryItems.find(item => 
        item.tokenNumber.toLowerCase() === tokenNumber.toLowerCase()
      );
    }

    getAllTokens() {
      return this.laundryItems.map(item => item.tokenNumber);
    }

    getItemCount() {
      return this.laundryItems.length;
    }
  }

  // Class for managing the UI display
  class TrackingDisplay {
    constructor(tracker) {
      this.tracker = tracker;
      this.statusSection = document.querySelector('.status-section');
      this.progressBar = document.querySelector('.progress-bar-fill');
      this.tokenInput = document.getElementById('token-number');
      // Don't call async method in constructor, will be called from init
    }

    async createMySubmissionsSection() {
      // Create a section to show user's own submissions
      const statusSection = document.querySelector('.status-section');
      if (statusSection && window.authManager) {
        const currentUser = await window.authManager.getCurrentUser();
        console.log('👤 Current user for My Submissions:', currentUser);
        if (currentUser) {
          const mySubmissionsDiv = document.createElement('div');
          mySubmissionsDiv.id = 'my-submissions';
          mySubmissionsDiv.style.cssText = 'margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 10px;';
          
          statusSection.parentNode.insertBefore(mySubmissionsDiv, statusSection.nextSibling);
          
          // Use user.id instead of studentId
          this.updateMySubmissions(currentUser.id);
        }
      }
    }

    updateMySubmissions(userId) {
      const mySubmissionsDiv = document.getElementById('my-submissions');
      if (!mySubmissionsDiv) return;

      console.log('🔍 Filtering submissions for userId:', userId);
      console.log('📋 All laundry items:', this.tracker.laundryItems);
      
      // Filter by user ID instead of studentId
      const userSubmissions = this.tracker.laundryItems.filter(item => {
        console.log(`Comparing item.studentId: ${item.studentId} with userId: ${userId}`);
        return item.studentId === userId || item.studentId === userId.toString();
      });

      if (userSubmissions.length === 0) {
        mySubmissionsDiv.innerHTML = `
          <h3 style="color: #333; margin-bottom: 10px;">📦 My Submissions</h3>
          <p style="color: #666;">You haven't submitted any laundry yet. Go to Submit page to create your first order!</p>
        `;
        return;
      }

      let submissionsHTML = `
        <h3 style="color: #333; margin-bottom: 15px;">📦 My Submissions (${userSubmissions.length})</h3>
        <div style="display: grid; gap: 15px;">
      `;

      userSubmissions.forEach(item => {
        const statusColor = item.getStatusColor(this.tracker.statusDefinitions);
        const statusLabel = item.getStatusLabel(this.tracker.statusDefinitions);
        
        submissionsHTML += `
          <div class="submission-card" style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid ${statusColor}; cursor: pointer;" 
               onclick="document.getElementById('token-number').value='${item.tokenNumber}'; window.laundryTrackingApp.controller.trackLaundry();">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <p style="margin: 0 0 5px 0; font-weight: 600; font-size: 16px;">${item.tokenNumber}</p>
                <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">${item.getItemsDescription()}</p>
                <p style="margin: 0; color: ${statusColor}; font-weight: 600; font-size: 14px;">
                  ${statusLabel} (${item.progress}%)
                </p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 12px; color: #999;">${new Date(item.submittedDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        `;
      });

      submissionsHTML += `</div>`;
      mySubmissionsDiv.innerHTML = submissionsHTML;
    }

    displayTrackingInfo(laundryItem) {
      if (!laundryItem || !this.statusSection) {
        this.showError('Laundry item not found. Please check your token number.');
        return;
      }

      const statusLabel = laundryItem.getStatusLabel(this.tracker.statusDefinitions);
      const statusColor = laundryItem.getStatusColor(this.tracker.statusDefinitions);
      const completionTime = laundryItem.getEstimatedCompletionTime();

      // Update status section
      const statusHTML = `
        <h2>Laundry Status</h2>
        <p class="status-text" style="color: ${statusColor}; font-weight: 600;">
          ${statusLabel} - Estimated Completion: ${completionTime}
        </p>
        <div class="status-details" style="margin-top: 15px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <p><strong>Token:</strong> ${laundryItem.tokenNumber}</p>
          <p><strong>Items:</strong> ${laundryItem.getItemsDescription()}</p>
          <p><strong>Latest Update:</strong> ${laundryItem.getLatestStatusUpdate()}</p>
          ${laundryItem.specialInstructions ? `<p><strong>Special Instructions:</strong> ${laundryItem.specialInstructions}</p>` : ''}
        </div>
        <div class="progress-bar" style="margin-top: 20px;">
          <div class="progress-bar-fill"></div>
        </div>
      `;

      this.statusSection.innerHTML = statusHTML;

      // Update progress bar
      const newProgressBar = document.querySelector('.progress-bar-fill');
      if (newProgressBar) {
        setTimeout(() => {
          newProgressBar.style.width = laundryItem.progress + '%';
          newProgressBar.style.backgroundColor = statusColor;
        }, 100);
      }
    }

    showError(message) {
      if (this.statusSection) {
        this.statusSection.innerHTML = `
          <h2>Laundry Status</h2>
          <p class="status-text" style="color: #f44336;">${message}</p>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: 0%;"></div>
          </div>
        `;
      }
    }

    showDefaultMessage() {
      if (this.statusSection) {
        this.statusSection.innerHTML = `
          <h2>Laundry Status</h2>
          <p class="status-text">Enter your token number to track your laundry</p>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: 0%;"></div>
          </div>
        `;
      }
    }

    highlightInput(isValid) {
      if (this.tokenInput) {
        this.tokenInput.style.borderColor = isValid ? '#4CAF50' : '#f44336';
      }
    }
  }

  // Class for handling user interactions
  class TrackingController {
    constructor(tracker, display) {
      this.tracker = tracker;
      this.display = display;
      this.tokenInput = document.getElementById('token-number');
      this.scanQrBtn = document.querySelector('.btn-icon');
      this.notifyBtn = document.querySelector('.btn-primary');
      this.html5QrCode = null;
      this.isScanning = false;
      this.init();
    }

    init() {
      this.setupTokenInput();
      this.setupQrScan();
      this.setupNotification();
    }

    setupTokenInput() {
      if (!this.tokenInput) return;

      this.tokenInput.addEventListener('input', (e) => {
        const token = e.target.value.trim();
        if (token.length > 0) {
          this.display.highlightInput(true);
        } else {
          this.display.highlightInput(false);
        }
      });

      this.tokenInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.trackLaundry();
        }
      });

      // Add a "Track" button next to the input
      const inputGroup = this.tokenInput.parentElement;
      if (inputGroup && !document.getElementById('track-btn')) {
        const trackBtn = document.createElement('button');
        trackBtn.id = 'track-btn';
        trackBtn.className = 'btn btn-secondary';
        trackBtn.textContent = 'Track';
        trackBtn.style.marginTop = '10px';
        trackBtn.addEventListener('click', () => this.trackLaundry());
        inputGroup.appendChild(trackBtn);
      }
    }

    setupQrScan() {
      // Scan QR button
      const scanQrBtn = document.getElementById('scan-qr-btn');
      if (scanQrBtn) {
        scanQrBtn.addEventListener('click', () => {
          this.openQrScanner();
        });
      }

      // Show QR button
      const showQrBtn = document.getElementById('show-qr-btn');
      if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
          this.showMyQrCode();
        });
      }

      // Read initial auto-resume toggle
      const autoResumeToggle = document.getElementById('qr-auto-resume');
      this.autoResumeAfterImageSuccess = false;
      if (autoResumeToggle) {
        this.autoResumeAfterImageSuccess = autoResumeToggle.checked;
        autoResumeToggle.addEventListener('change', (e) => {
          this.autoResumeAfterImageSuccess = !!e.target.checked;
        });
      }

      // Setup close scanner button
      const closeBtn = document.getElementById('close-scanner');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeQrScanner();
        });
      }

      // Setup file upload button
      const fileUploadBtn = document.getElementById('use-file-upload');
      if (fileUploadBtn) {
        fileUploadBtn.addEventListener('click', () => {
          this.scanFromFile();
        });
      }

      // Setup manual input submit
      const manualSubmit = document.getElementById('qr-manual-submit');
      if (manualSubmit) {
        manualSubmit.addEventListener('click', () => {
          const manualInput = document.getElementById('qr-manual-input');
          const errorDiv = document.getElementById('qr-manual-error');
          if (manualInput) {
            const token = manualInput.value.trim();
            if (token) {
              errorDiv.textContent = '';
              this.handleScannedToken(token);
              this.closeQrScanner();
            } else {
              errorDiv.textContent = 'Please enter a token number';
            }
          }
        });
      }

      // Setup retry button
      const retryBtn = document.getElementById('qr-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.closeQrScanner();
          setTimeout(() => this.openQrScanner(), 300);
        });
      }

      // Setup torch button
      const torchBtn = document.getElementById('qr-toggle-torch');
      if (torchBtn) {
        torchBtn.addEventListener('click', async () => {
          if (this.html5QrCode) {
            try {
              await this.html5QrCode.applyVideoConstraints({
                advanced: [{ torch: true }]
              });
              torchBtn.classList.add('active');
            } catch (err) {
              console.log('Torch not supported:', err);
              alert('Flash/torch is not supported on this device');
            }
          }
        });
      }

      // Setup camera selector
      const cameraSelect = document.getElementById('qr-camera-select');
      if (cameraSelect) {
        Html5Qrcode.getCameras().then(cameras => {
          if (cameras && cameras.length > 0) {
            cameras.forEach((camera, index) => {
              const option = document.createElement('option');
              option.value = camera.id;
              option.text = camera.label || `Camera ${index + 1}`;
              cameraSelect.appendChild(option);
            });

            cameraSelect.addEventListener('change', (e) => {
              if (this.isScanning) {
                this.closeQrScanner();
                setTimeout(() => this.openQrScanner(e.target.value), 300);
              }
            });
          }
        }).catch(err => {
          console.error('Error getting cameras:', err);
        });
      }

      // Setup Show QR modal close
      const closeShowQr = document.getElementById('close-show-qr');
      if (closeShowQr) {
        closeShowQr.addEventListener('click', () => {
          this.closeShowQrModal();
        });
      }

      // Setup download QR button
      const downloadQrBtn = document.getElementById('download-qr');
      if (downloadQrBtn) {
        downloadQrBtn.addEventListener('click', () => {
          this.downloadQrCode();
        });
      }

      // Setup share QR button
      const shareQrBtn = document.getElementById('share-qr');
      if (shareQrBtn) {
        shareQrBtn.addEventListener('click', () => {
          this.shareQrCode();
        });
      }
    }

    openQrScanner(cameraId = null) {
      if (this.isScanning) {
        // Already scanning; avoid duplicate starts
        return;
      }
      const modal = document.getElementById('qr-scanner-modal');
      if (!modal) {
        alert('QR Scanner not available');
        return;
      }

      // Check if Html5Qrcode is available
      if (typeof Html5Qrcode === 'undefined') {
        alert('QR Scanner library not loaded. Please refresh the page.');
        return;
      }

      modal.style.display = 'flex';

      // Initialize QR Code scanner
      this.html5QrCode = new Html5Qrcode("qr-reader");
      
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        const { token, payload } = this.parseScannedContent(decodedText);
        this.updateScannerStatus(`Detected: ${token}`, 'success');
        this.handleScannedToken(token);
        this.closeQrScanner();
      };

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // Use specific camera if provided, otherwise use default
      const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" };

      // Start scanning
      this.html5QrCode.start(
        cameraConfig, 
        config,
        qrCodeSuccessCallback
      ).catch(err => {
        console.error('Error starting QR scanner:', err);
        this.updateScannerStatus('Camera access denied or not available. Please use "Upload QR Code Image" option.', 'error');
      });

      this.isScanning = true;
      this.updateScannerStatus('Scanning... Position QR code in the frame', 'scanning');
    }

    closeQrScanner() {
      const modal = document.getElementById('qr-scanner-modal');
      
      if (this.html5QrCode && this.isScanning) {
        this.html5QrCode.stop().then(() => {
          this.html5QrCode.clear();
          console.log('QR Scanner stopped');
        }).catch(err => {
          console.error('Error stopping scanner:', err);
        });
      }

      if (modal) {
        modal.style.display = 'none';
      }

      this.isScanning = false;
    }

    async scanFromFile() {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode("qr-reader");
      }

      // If live camera scan is running, stop it before scanning a file
      if (this.isScanning) {
        try {
          await this.html5QrCode.stop();
          await this.html5QrCode.clear();
        } catch (e) {
          console.warn('Failed to stop live scan before file scan:', e);
        } finally {
          this.isScanning = false;
        }
      }

      // Create file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        this.updateScannerStatus('Scanning image...', 'scanning');

        this.withTimeout(this.html5QrCode.scanFile(file, true), 8000)
          .then(decodedText => {
            const { token, payload } = this.parseScannedContent(decodedText);
            this.updateScannerStatus(`Detected: ${token}`, 'success');
            this.handleScannedToken(token);
            // Either close the scanner or auto-resume based on toggle
            const modal = document.getElementById('qr-scanner-modal');
            const camSelect = document.getElementById('qr-camera-select');
            const selectedCameraId = camSelect && camSelect.value ? camSelect.value : null;
            if (this.autoResumeAfterImageSuccess && modal && getComputedStyle(modal).display !== 'none') {
              setTimeout(() => this.openQrScanner(selectedCameraId), 300);
            } else {
              this.closeQrScanner();
            }
          })
          .catch(err => {
            const msg = String(err).toLowerCase().includes('timeout')
              ? 'Image scan timed out. Try another image or enter the token.'
              : 'No QR code found in the image. Please try another image.';
            this.updateScannerStatus(msg, 'error');

            // Auto-resume camera scanning if the modal is still open
            const modal = document.getElementById('qr-scanner-modal');
            if (modal && getComputedStyle(modal).display !== 'none') {
              const camSelect = document.getElementById('qr-camera-select');
              const selectedCameraId = camSelect && camSelect.value ? camSelect.value : null;
              setTimeout(() => this.openQrScanner(selectedCameraId), 500);
            }
          });
      };

      fileInput.click();
    }

    handleScannedToken(token) {
      // Clean up the token (remove any extra spaces or characters)
      const cleanToken = (token || '').trim();
      
      // Set the token in the input field
      if (this.tokenInput) {
        this.tokenInput.value = cleanToken;
      }

      // Track the laundry
      this.trackLaundry();

      // Optional: silent success; UI already updated
    }

    updateScannerStatus(message, type = 'info') {
      const statusDiv = document.getElementById('qr-scanner-status');
      if (!statusDiv) return;

      const colors = {
        info: '#666',
        scanning: '#2196F3',
        error: '#f44336',
        success: '#4CAF50'
      };

      statusDiv.textContent = message;
      statusDiv.style.color = colors[type] || colors.info;
      statusDiv.style.background = type === 'error' ? '#ffebee' : '#f5f5f5';
    }

    // Lightweight inline/toast message helper to avoid blocking alerts
    showMessage(type, text) {
      if (window.toastManager && typeof window.toastManager.show === 'function') {
        try { window.toastManager.show(text, type); return; } catch (_) {}
      }
      const host = document.getElementById('status-section') || document.querySelector('.tracking-info');
      if (!host) return;
      let box = document.getElementById('notify-inline-msg');
      if (!box) {
        box = document.createElement('div');
        box.id = 'notify-inline-msg';
        box.setAttribute('role', 'status');
        box.style.marginTop = '10px';
        box.style.fontSize = '14px';
        box.style.padding = '10px 12px';
        box.style.borderRadius = '8px';
        box.style.border = '1px solid transparent';
        host.appendChild(box);
      }
      const styles = {
        success: { bg: '#d1fae5', fg: '#065f46', br: '#10b981' },
        error:   { bg: '#fee2e2', fg: '#7f1d1d', br: '#ef4444' },
        info:    { bg: '#e0e7ff', fg: '#1e40af', br: '#6366f1' }
      };
      const s = styles[type] || styles.info;
      box.style.background = s.bg;
      box.style.color = s.fg;
      box.style.borderColor = s.br;
      box.textContent = text;
      clearTimeout(this._msgTimer);
      this._msgTimer = setTimeout(() => { box && box.remove(); }, 4000);
    }

    setupNotification() {
      if (this.notifyBtn) {
        this.notifyBtn.addEventListener('click', () => {
          const token = (this.tokenInput && this.tokenInput.value || '').trim();
          if (!token) {
            this.showMessage('error', 'Please enter a token number first.');
            return;
          }
          const item = this.tracker.findByToken(token);
          if (!item) {
            this.showMessage('error', 'Please track a valid token first.');
            return;
          }
          this.showMessage('success', `You will be notified when your laundry (${token}) is ready!`);
          console.log('Notification requested for:', item);
        });
      }
    }

    trackLaundry() {
      const token = this.tokenInput.value.trim();
      
      if (!token) {
        alert('Please enter a token number.');
        this.display.highlightInput(false);
        return;
      }

      const laundryItem = this.tracker.findByToken(token);
      
      if (laundryItem) {
        this.display.displayTrackingInfo(laundryItem);
        this.display.highlightInput(true);
        
          // Reveal UI bits (remove .hidden utility which uses !important)
          const showQrBtn = document.getElementById('show-qr-btn');
          const statusSection = document.getElementById('status-section');
          const notifyBtn = document.getElementById('notify-btn');

          if (showQrBtn) {
            showQrBtn.classList.remove('hidden');
            showQrBtn.style.removeProperty('display');
          }
          if (statusSection) {
            statusSection.classList.remove('hidden');
            statusSection.style.removeProperty('display');
          }
          if (notifyBtn) {
            notifyBtn.classList.remove('hidden');
            notifyBtn.style.removeProperty('display');
          }
        
          // Store current token for QR display
          this.currentTrackedToken = token;
        
          console.log('Tracking laundry:', laundryItem);
      } else {
        this.display.highlightInput(false);
        alert(`Token "${token}" not found. Available tokens: ${this.tracker.getAllTokens().join(', ')}`);
      }
    }

      showMyQrCode() {
        const token = this.currentTrackedToken || this.tokenInput.value.trim();
      
        if (!token) {
          alert('Please track a laundry order first.');
          return;
        }

        const modal = document.getElementById('show-qr-modal');
        const qrDisplay = document.getElementById('qr-code-display');
        const tokenText = document.getElementById('qr-token-text');
      
        if (!modal || !qrDisplay || !tokenText) {
          alert('QR display not available');
          return;
        }

        // Clear previous QR code
        qrDisplay.innerHTML = '';

        // Generate QR code using qrcodejs
        if (typeof QRCode !== 'undefined') {
          new QRCode(qrDisplay, {
            text: token,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        
          tokenText.textContent = token;
          modal.style.display = 'flex';
        } else {
          alert('QR Code generator not loaded. Please refresh the page.');
        }
      }

      closeShowQrModal() {
        const modal = document.getElementById('show-qr-modal');
        if (modal) {
          modal.style.display = 'none';
        }
      }

      downloadQrCode() {
        const qrDisplay = document.getElementById('qr-code-display');
        if (!qrDisplay) return;

        const canvas = qrDisplay.querySelector('canvas');
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `laundry-qr-${this.currentTrackedToken || 'code'}.png`;
          link.href = url;
          link.click();
        }
      }

      async shareQrCode() {
        const qrDisplay = document.getElementById('qr-code-display');
        if (!qrDisplay) return;

        const canvas = qrDisplay.querySelector('canvas');
        if (canvas) {
          try {
            canvas.toBlob(async (blob) => {
              const file = new File([blob], `laundry-qr-${this.currentTrackedToken || 'code'}.png`, { type: 'image/png' });
            
              if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: 'My Laundry QR Code',
                  text: `Token: ${this.currentTrackedToken || ''}`,
                  files: [file]
                });
              } else {
                // Fallback: just download
                alert('Sharing not supported. Downloading instead.');
                this.downloadQrCode();
              }
            });
          } catch (err) {
            console.error('Error sharing:', err);
            alert('Could not share QR code.');
          }
        }
      }

    // Helpers for payload-aware scanning
    extractTokenFromText(text) {
      if (!text) return '';
      const t = String(text).trim();
      const m = t.match(/(LB-(?:\d{4}-\d{4}|\d{8}-\d{4}))/i);
      if (m) return m[1];
      try {
        const url = new URL(t);
        const tok = url.searchParams.get('token');
        if (tok) return tok;
      } catch (_) { }
      return t;
    }

    parseScannedContent(text) {
      const token = this.extractTokenFromText(text);
      let payload = null;
      try {
        const url = new URL(String(text).trim());
        const d = url.searchParams.get('d');
        if (d) {
          const json = atob(decodeURIComponent(d));
          payload = JSON.parse(json);
        }
      } catch (_) { }
      return { token, payload };
    }

    mapPayloadToSubmission(p) {
      if (!p) return null;
      return {
        tokenNumber: p.t,
        studentId: p.sid,
        studentName: p.nm,
        hostelRoom: p.rm,
        submittedDate: p.sd,
        estimatedCompletion: p.eta,
        currentStatus: p.s || 'received',
        statusHistory: p.sh || [],
        items: p.it || [],
        specialInstructions: '',
        progress: typeof p.p === 'number' ? p.p : 10
      };
    }

    upsertSubmission(updated) {
      try {
        const list = JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
        const idx = list.findIndex(x => x.tokenNumber === updated.tokenNumber);
        if (idx >= 0) list[idx] = { ...list[idx], ...updated };
        else list.push(updated);
        localStorage.setItem('laundryBuddy_submissions', JSON.stringify(list));
      } catch (_) {}
    }

    withTimeout(p, ms) {
      let t;
      const timeout = new Promise((_, rej) => t = setTimeout(() => rej(new Error('timeout')), ms));
      return Promise.race([p.finally(() => clearTimeout(t)), timeout]);
    }
  }

  // Main App Class
  class LaundryTrackingApp {
    constructor() {
      this.tracker = null;
      this.display = null;
      this.controller = null;
    }

    async init() {
      try {
        // Load tracking data from JSON and localStorage
        const trackingData = await this.loadTrackingData();
        
        // Initialize components
        this.tracker = new LaundryTracker(trackingData);
        this.display = new TrackingDisplay(this.tracker);
        this.controller = new TrackingController(this.tracker, this.display);

        // Initialize "My Submissions" section
        await this.display.createMySubmissionsSection();

        // Check if token is provided in URL (from submit page redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        
        if (tokenFromUrl) {
          // Auto-populate and track the token from URL
          const tokenInput = document.getElementById('token-number');
          if (tokenInput) {
            tokenInput.value = tokenFromUrl;
            this.controller.trackLaundry();
          }
        } else {
          // Show default message
          this.display.showDefaultMessage();
        }

        console.log('Track page loaded with OOP and JSON');
        console.log(`Available tokens: ${this.tracker.getAllTokens().join(', ')}`);
      } catch (error) {
        console.error('Error initializing tracking page:', error);
        this.loadFallbackData();
      }
    }

    async loadTrackingData() {
      try {
        // Fetch orders from backend API
        if (window.orderManager) {
          const orders = await window.orderManager.getOrders();
          console.log('📦 Loaded orders from backend:', orders);
          
          // Convert orders to tracking format
          const laundryItems = orders.map(order => {
            console.log('🔄 Converting order:', order);
            console.log('   - Order user ID:', order.user);
            return {
              tokenNumber: order.orderNumber,
              studentId: order.user || 'unknown',
              studentName: 'User',
              hostelRoom: order.address || 'N/A',
              submittedDate: order.createdAt || new Date().toISOString(),
              estimatedCompletion: order.deliveryDate || new Date(Date.now() + 86400000).toISOString(),
              currentStatus: order.status || 'submitted',
              statusHistory: [],
              items: order.items || [],
              specialInstructions: order.specialInstructions || 'None',
              progress: this.getProgressFromStatus(order.status),
              qrCode: order.orderNumber
            };
          });

          console.log('✅ Converted laundry items:', laundryItems);

          return {
            laundryItems,
            statusDefinitions: {
              submitted: { label: "Submitted", color: "#2196F3", progress: 10 },
              pending: { label: "Pending", color: "#9E9E9E", progress: 15 },
              received: { label: "Received", color: "#2196F3", progress: 25 },
              washing: { label: "Washing", color: "#FF9800", progress: 45 },
              drying: { label: "Drying", color: "#FFC107", progress: 65 },
              folding: { label: "Folding", color: "#9C27B0", progress: 80 },
              "ready-for-pickup": { label: "Ready for Pickup", color: "#4CAF50", progress: 95 },
              completed: { label: "Completed", color: "#4CAF50", progress: 100 }
            }
          };
        }
        
        // Fallback to localStorage if API not available
        return this.loadFromLocalStorage();
      } catch (error) {
        console.error('Error loading tracking data:', error);
        return this.loadFromLocalStorage();
      }
    }

    getProgressFromStatus(status) {
      const progressMap = {
        submitted: 10,
        pending: 15,
        received: 25,
        washing: 45,
        drying: 65,
        folding: 80,
        'ready-for-pickup': 95,
        completed: 100
      };
      return progressMap[status] || 10;
    }

    loadFromLocalStorage() {
      const submissions = JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
      return {
        laundryItems: submissions,
        statusDefinitions: {
          received: { label: "Received", color: "#2196F3", progress: 10 },
          washing: { label: "Washing", color: "#FF9800", progress: 40 },
          drying: { label: "Drying", color: "#FFC107", progress: 60 },
          folding: { label: "Folding", color: "#9C27B0", progress: 80 },
          "ready-for-pickup": { label: "Ready for Pickup", color: "#4CAF50", progress: 95 },
          completed: { label: "Completed", color: "#4CAF50", progress: 100 }
        }
      };
    }

    loadFallbackData() {
      // Fallback data if JSON loading fails
      const fallbackData = {
        laundryItems: [
          {
            tokenNumber: "LB-DEMO-001",
            studentId: "STU123456",
            studentName: "Demo User",
            hostelRoom: "BH-3, A-404",
            submittedDate: new Date().toISOString(),
            estimatedCompletion: new Date(Date.now() + 3600000).toISOString(),
            currentStatus: "washing",
            statusHistory: [
              { status: "received", timestamp: new Date().toISOString(), description: "Laundry received" }
            ],
            items: [{ type: "shirt", count: 2, color: "white" }],
            specialInstructions: "",
            progress: 40
          }
        ],
        statusDefinitions: {
          received: { label: "Received", color: "#2196F3", progress: 10 },
          washing: { label: "Washing", color: "#FF9800", progress: 40 }
        }
      };

      this.tracker = new LaundryTracker(fallbackData);
      this.display = new TrackingDisplay(this.tracker);
      this.controller = new TrackingController(this.tracker, this.display);
      this.display.showDefaultMessage();
      
      console.log('Using fallback data. Available tokens:', this.tracker.getAllTokens());
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication first
    if (window.authManager) {
      try {
        const isLoggedIn = await window.authManager.isLoggedIn();
        if (!isLoggedIn) {
          window.location.href = 'login.html';
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return;
      }
    }

    const app = new LaundryTrackingApp();
    await app.init();

    // Make app accessible globally for debugging
    window.laundryTrackingApp = app;
  });
})();

