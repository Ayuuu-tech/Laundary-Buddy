/**
 * Android APK Installer Popup
 * Shows a beautiful popup to encourage users to download the Android App
 */

(function () {
    'use strict';

    class ApkInstaller {
        constructor() {
            this.apkUrl = 'assets/LaundryBuddy.apk';
            this.shown = false;
        }

        init() {
            // Only show on mobile devices or smaller screens
            const isMobile = window.innerWidth <= 768;

            // Check if already dismissed recently (within 1 day)
            const dismissed = localStorage.getItem('apk-install-dismissed');
            if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
                return;
            }

            // Show after 3 seconds
            setTimeout(() => {
                this.showPopup();
            }, 3000);
        }

        showPopup() {
            if (this.shown || document.getElementById('apk-install-popup')) return;
            this.shown = true;

            const overlay = document.createElement('div');
            overlay.id = 'apk-install-overlay';
            overlay.className = 'apk-overlay';

            const popup = document.createElement('div');
            popup.id = 'apk-install-popup';
            popup.className = 'apk-popup';
            popup.innerHTML = `
          <div class="apk-popup-content">
            <div class="apk-popup-header">
              <button class="apk-dismiss-btn" id="apk-dismiss-btn">&times;</button>
            </div>
            <div class="apk-popup-body">
              <div class="apk-icon-wrapper">
                <i class='bx bxl-android'></i>
              </div>
              <h3>Get the Full Experience!</h3>
              <p>Download the official Laundry Buddy Android App for faster booking, real-time notifications, and seamless tracking.</p>
              
              <a href="${this.apkUrl}" download="LaundryBuddy.apk" class="apk-download-btn" id="apk-download-btn">
                <i class='bx bx-download'></i> Download Free App
              </a>
              
            </div>
          </div>
        `;

            document.body.appendChild(overlay);
            document.body.appendChild(popup);

            this.addStyles();

            // Event Listeners
            document.getElementById('apk-dismiss-btn').addEventListener('click', () => {
                this.dismissPopup();
            });

            overlay.addEventListener('click', () => {
                this.dismissPopup();
            });

            document.getElementById('apk-download-btn').addEventListener('click', () => {
                this.dismissPopup(); // optionally dismiss after clicked
            });

            // Animate in
            setTimeout(() => {
                overlay.classList.add('show');
                popup.classList.add('show');
            }, 100);
        }

        dismissPopup() {
            const overlay = document.getElementById('apk-install-overlay');
            const popup = document.getElementById('apk-install-popup');

            if (overlay && popup) {
                overlay.classList.remove('show');
                popup.classList.remove('show');

                setTimeout(() => {
                    overlay.remove();
                    popup.remove();
                }, 300);
            }

            localStorage.setItem('apk-install-dismissed', Date.now().toString());
        }

        addStyles() {
            if (document.getElementById('apk-popup-styles')) return;

            const style = document.createElement('style');
            style.id = 'apk-popup-styles';
            style.textContent = `
          .apk-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(3px);
            z-index: 9998;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
          }
  
          .apk-overlay.show {
            opacity: 1;
            visibility: visible;
          }
  
          .apk-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -40%);
            background: white;
            width: 90%;
            max-width: 400px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            overflow: hidden;
          }
  
          .apk-popup.show {
            opacity: 1;
            visibility: visible;
            transform: translate(-50%, -50%);
          }
  
          .apk-popup-content {
            position: relative;
          }
  
          .apk-popup-header {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 2;
          }
  
          .apk-dismiss-btn {
            background: rgba(0,0,0,0.05);
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #666;
            transition: background 0.2s;
          }
  
          .apk-dismiss-btn:hover {
            background: rgba(0,0,0,0.1);
            color: #333;
          }
  
          .apk-popup-body {
            padding: 40px 24px 30px;
            text-align: center;
          }
  
          .apk-icon-wrapper {
            background: rgba(16, 185, 129, 0.1);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          }
  
          .apk-icon-wrapper i {
            font-size: 45px;
            color: #10b981;
          }
  
          .apk-popup-body h3 {
            font-size: 22px;
            color: var(--text-color, #1f2937);
            margin-bottom: 12px;
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
          }
  
          .apk-popup-body p {
            font-size: 14px;
            color: var(--secondary-color, #4b5563);
            margin-bottom: 25px;
            line-height: 1.6;
          }
  
          .apk-download-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: var(--primary-color, #F97316);
            color: white;
            text-decoration: none;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
          }
  
          .apk-download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
            color: white;
          }
  
          body.dark-theme .apk-popup {
            background: var(--card-bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #2d2d2d);
          }
  
          body.dark-theme .apk-dismiss-btn {
            background: rgba(255,255,255,0.1);
            color: #ccc;
          }
          
          body.dark-theme .apk-dismiss-btn:hover {
            background: rgba(255,255,255,0.2);
            color: #fff;
          }
  
          body.dark-theme .apk-popup-body h3 {
            color: #ffffff;
          }
  
          body.dark-theme .apk-popup-body p {
            color: #b3b3b3;
          }
        `;
            document.head.appendChild(style);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ApkInstaller().init();
        });
    } else {
        new ApkInstaller().init();
    }
})();
