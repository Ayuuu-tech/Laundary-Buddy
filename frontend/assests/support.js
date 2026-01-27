// support.js - Support center page functionality
(function () {
  'use strict';

  let userOrders = [];
  let ordersMap = {};

  // Check authentication before initializing page
  if (window.authManager && !window.authManager.isLoggedIn()) {
    alert('Please login to access support.');
    window.location.href = 'login.html';
    return;
  }

  // Load user orders
  async function loadUserOrders() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/orders/my-orders`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.orders) {
          userOrders = data.orders;
          // Create map for quick lookup
          userOrders.forEach(order => {
            ordersMap[order.orderNumber] = order;
          });
          populateOrderDropdowns();
        }
      }
    } catch (e) {
      console.error('Error loading orders:', e);
    }
  }

  // Load my reports
  async function loadMyReports() {
    const reportsGrid = document.getElementById('reports-grid');
    if (!reportsGrid) return;

    reportsGrid.innerHTML = '<p style="text-align:center;color:#666;">Loading your reports...</p>';

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/support/my-tickets`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tickets && data.tickets.length > 0) {
          renderReports(data.tickets);
        } else {
          reportsGrid.innerHTML = '<p style="text-align:center;color:#666;">No reports found.</p>';
        }
      } else {
        reportsGrid.innerHTML = '<p style="text-align:center;color:#666;">Failed to load reports.</p>';
      }
    } catch (e) {
      console.error('Error loading reports:', e);
      reportsGrid.innerHTML = '<p style="text-align:center;color:#666;">Error loading reports.</p>';
    }
  }

  function renderReports(tickets) {
    const reportsGrid = document.getElementById('reports-grid');
    if (!reportsGrid) return;

    const statusClass = (s) => {
      if (s === 'investigating') return 'status-investigating';
      if (s === 'resolved') return 'status-resolved';
      if (s === 'closed') return 'status-closed';
      return 'status-pending';
    };

    const html = tickets.map(t => {
      const date = new Date(t.createdAt).toLocaleString();
      const orderText = t.orderNumber ? `Order #${t.orderNumber}` : '';
      const typeLabel = t.type === 'missing-clothes' ? 'Missing Clothes' : t.type === 'damage' ? 'Damage' : 'Contact';
      return `
        <div class="report-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h4>${typeLabel}</h4>
            <span class="status-pill ${statusClass(t.status)}">${t.status}</span>
          </div>
          <div class="report-meta">${orderText} • ${date}</div>
          <div class="report-details">${t.items || ''}</div>
          ${t.details ? `<div class="report-details" style="color:#555;">${t.details}</div>` : ''}
          ${t.response ? `<div class="report-details" style="color:#2563EB;">Reply: ${t.response}</div>` : ''}
          <div class="report-actions">
            <span>${t.orderId?.status ? `Order status: ${t.orderId.status}` : ''}</span>
            <span>${t.resolvedAt ? 'Updated ' + new Date(t.resolvedAt).toLocaleString() : ''}</span>
          </div>
        </div>
      `;
    }).join('');

    reportsGrid.innerHTML = html;
  }

  // Populate dropdowns with orders
  function populateOrderDropdowns() {
    const missingTokenSelect = document.getElementById('missing-token');
    const damageTokenSelect = document.getElementById('damage-token');

    const options = userOrders.map(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      const itemsText = order.items.slice(0, 2).map(item => item.item).join(', ');
      const moreItems = order.items.length > 2 ? ` +${order.items.length - 2} more` : '';
      return `<option value="${order.orderNumber}">#${order.orderNumber} - ${date} (${itemsText}${moreItems})</option>`;
    }).join('');

    const placeholder = userOrders.length > 0
      ? '<option value="">Select an order</option>'
      : '<option value="">No orders found</option>';

    if (missingTokenSelect) {
      missingTokenSelect.innerHTML = placeholder + options;
    }
    if (damageTokenSelect) {
      damageTokenSelect.innerHTML = placeholder + options;
    }
  }

  // Auto-populate date when order is selected
  function setupOrderChangeHandlers() {
    const missingTokenSelect = document.getElementById('missing-token');
    const missingDateInput = document.getElementById('missing-date');

    const damageTokenSelect = document.getElementById('damage-token');
    const damageDateInput = document.getElementById('damage-date');

    if (missingTokenSelect && missingDateInput) {
      missingTokenSelect.addEventListener('change', function () {
        const orderNumber = this.value;
        if (orderNumber && ordersMap[orderNumber]) {
          const order = ordersMap[orderNumber];
          const date = new Date(order.createdAt).toLocaleString();
          missingDateInput.value = date;
        } else {
          missingDateInput.value = '';
        }
      });
    }

    if (damageTokenSelect && damageDateInput) {
      damageTokenSelect.addEventListener('change', function () {
        const orderNumber = this.value;
        if (orderNumber && ordersMap[orderNumber]) {
          const order = ordersMap[orderNumber];
          const date = new Date(order.createdAt).toLocaleString();
          damageDateInput.value = date;
        } else {
          damageDateInput.value = '';
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Update profile photo everywhere after login check
    if (window.authManager) {
      window.authManager.loadProfilePhoto();
    }
    // Load orders first
    loadUserOrders();
    setupOrderChangeHandlers();
    loadMyReports();

    const supportForm = document.querySelector('.support-form-section form');

    // Show/Hide form functionality
    const showMissingFormBtn = document.getElementById('show-missing-form');
    const showDamageFormBtn = document.getElementById('show-damage-form');
    const showContactFormBtn = document.getElementById('show-contact-form');

    const missingClothesSection = document.getElementById('missing-clothes-section');
    const damageReportSection = document.getElementById('damage-report-section');

    const cancelMissingBtn = document.getElementById('cancel-missing-form');
    const cancelDamageBtn = document.getElementById('cancel-damage-form');

    // Show Missing Clothes Form
    if (showMissingFormBtn) {
      showMissingFormBtn.addEventListener('click', function () {
        missingClothesSection.classList.remove('hidden');
        damageReportSection.classList.add('hidden');
        missingClothesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Show Damage Report Form
    if (showDamageFormBtn) {
      showDamageFormBtn.addEventListener('click', function () {
        damageReportSection.classList.remove('hidden');
        missingClothesSection.classList.add('hidden');
        damageReportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Show Contact Form (scroll to support form section)
    if (showContactFormBtn) {
      showContactFormBtn.addEventListener('click', function () {
        missingClothesSection.classList.add('hidden');
        damageReportSection.classList.add('hidden');
        const supportFormSection = document.querySelector('.support-form-section');
        if (supportFormSection) {
          supportFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Cancel buttons
    if (cancelMissingBtn) {
      cancelMissingBtn.addEventListener('click', function () {
        missingClothesSection.classList.add('hidden');
      });
    }

    if (cancelDamageBtn) {
      cancelDamageBtn.addEventListener('click', function () {
        damageReportSection.classList.add('hidden');
      });
    }

    // Manager Contact Form
    const managerContactForm = document.getElementById('manager-contact-form');
    if (managerContactForm) {
      const messageTextarea = document.getElementById('contact-message');
      const charCount = document.querySelector('.char-count');

      // Character counter
      if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function () {
          const length = this.value.length;
          const maxLength = 500;
          charCount.textContent = `${length} / ${maxLength} characters`;

          if (length > maxLength) {
            this.value = this.value.substring(0, maxLength);
            charCount.textContent = `${maxLength} / ${maxLength} characters`;
          }

          if (length > maxLength * 0.9) {
            charCount.style.color = '#DC2626';
          } else {
            charCount.style.color = '';
          }
        });
      }

      // Form submission
      managerContactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('contact-name').value.trim();
        const studentId = document.getElementById('contact-student-id').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value.trim();
        const priority = document.querySelector('input[name="priority"]:checked').value;

        if (!name || !studentId || !phone || !email || !subject || !message) {
          alert('Please fill out all required fields.');
          return;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          alert('Please enter a valid email address.');
          return;
        }

        // Validate phone (Indian format)
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
          alert('Please enter a valid 10-digit phone number.');
          return;
        }

        // Save message to localStorage
        const contactMessage = {
          type: 'manager-contact',
          name: name,
          studentId: studentId,
          phone: phone,
          email: email,
          subject: subject,
          message: message,
          priority: priority,
          timestamp: new Date().toISOString(),
          status: 'pending'
        };

        const messages = JSON.parse(localStorage.getItem('laundryBuddy_managerMessages') || '[]');
        messages.push(contactMessage);
        localStorage.setItem('laundryBuddy_managerMessages', JSON.stringify(messages));

        // Show success message based on priority
        let responseMessage = 'Your message has been sent to the Laundry Manager successfully!';
        if (priority === 'urgent') {
          responseMessage += '\n\nFor urgent matters, you can also call directly at +91 783 827 4711';
        } else {
          responseMessage += '\n\nYou will receive a response within 2 hours.';
        }

        alert(responseMessage);
        managerContactForm.reset();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Support request form
    if (supportForm) {
      const nameInput = document.getElementById('name');
      const studentIdInput = document.getElementById('student-id');
      const issueInput = document.getElementById('issue-description');

      supportForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        const studentId = studentIdInput.value.trim();
        const issue = issueInput.value.trim();

        // Validate fields
        if (!name || !studentId || !issue) {
          alert('Please fill out all fields.');
          return;
        }

        // Validate issue description length
        if (issue.length < 20) {
          alert('Please provide a more detailed description (at least 20 characters).');
          issueInput.focus();
          return;
        }

        // Success
        alert('Support request submitted successfully! We will contact you soon.');
        supportForm.reset();
        console.log('Support request submitted');
      });

      // Character counter for issue description
      if (issueInput) {
        issueInput.addEventListener('input', function () {
          const length = this.value.length;
          if (length > 0 && length < 20) {
            this.style.borderColor = '#ff9800';
          } else if (length >= 20) {
            this.style.borderColor = '#4CAF50';
          } else {
            this.style.borderColor = '';
          }
        });
      }
    }

    // Missing Clothes Form Handler
    const missingClothesForm = document.getElementById('missing-clothes-form');
    if (missingClothesForm) {
      missingClothesForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const tokenNumber = document.getElementById('missing-token').value.trim();
        const missingItems = document.getElementById('missing-items').value.trim();
        const additionalDetails = document.getElementById('missing-details').value.trim();

        if (!tokenNumber || !missingItems) {
          alert('Please fill out all required fields.');
          return;
        }

        try {
          const order = ordersMap[tokenNumber];
          if (!order) {
            alert('Order not found');
            return;
          }

          // Save missing clothes report to database
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/support/report`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              type: 'missing-clothes',
              orderNumber: tokenNumber,
              orderId: order._id,
              items: missingItems,
              details: additionalDetails,
              status: 'pending'
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Missing clothes report submitted successfully! We will investigate and contact you soon.');
            missingClothesForm.reset();
            missingClothesSection.classList.add('hidden');
          } else {
            alert(data.message || 'Failed to submit report');
          }
        } catch (e) {
          console.error('Error submitting report:', e);
          alert('Error submitting report. Please try again.');
        }
      });
    }

    // Damage Report Form Handler
    const damageReportForm = document.getElementById('damage-report-form');
    if (damageReportForm) {
      damageReportForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const tokenNumber = document.getElementById('damage-token').value.trim();
        const damagedItems = document.getElementById('damaged-items').value.trim();
        const damageType = document.getElementById('damage-type').value;
        const damageDetails = document.getElementById('damage-details').value.trim();

        if (!tokenNumber || !damagedItems || !damageType) {
          alert('Please fill out all required fields.');
          return;
        }

        try {
          const order = ordersMap[tokenNumber];
          if (!order) {
            alert('Order not found');
            return;
          }

          // Save damage report to database
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/support/report`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              type: 'damage',
              orderNumber: tokenNumber,
              orderId: order._id,
              items: damagedItems,
              damageType: damageType,
              details: damageDetails,
              status: 'pending'
            })
          });

          const data = await response.json();
          if (data.success) {
            alert('Damage report submitted successfully! We will investigate and contact you soon.');
            damageReportForm.reset();
            damageReportSection.classList.add('hidden');
          } else {
            alert(data.message || 'Failed to submit report');
          }
        } catch (e) {
          console.error('Error submitting report:', e);
          alert('Error submitting report. Please try again.');
        }
      });
    }

    // Report generation functionality
    const reportBtnsNew = document.querySelectorAll('.report-btn');
    const formatRadios = document.querySelectorAll('input[name="report-format"]');

    reportBtnsNew.forEach(btn => {
      btn.addEventListener('click', function () {
        const reportType = this.dataset.reportType;
        const selectedFormat = document.querySelector('input[name="report-format"]:checked').value;

        generateReport(reportType, selectedFormat);
      });
    });

    async function generateReport(reportType, format) {
      // Get current user
      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

      if (!currentUser) {
        alert('Please login to generate reports');
        return;
      }

      try {
        // Show loading indicator
        if (window.showLoading) window.showLoading();

        // Fetch orders from backend API
        const response = await fetch(API_CONFIG.BASE_URL + '/orders/my-orders', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders: ' + response.status);
        }

        const data = await response.json();
        let userSubmissions = data.orders || [];

        // Filter by date range based on report type
        const now = new Date();
        let filteredSubmissions = [];

        if (reportType === 'monthly') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          filteredSubmissions = userSubmissions.filter(sub => {
            const subDate = new Date(sub.createdAt || sub.timestamp || sub.date);
            return subDate >= startOfMonth && subDate <= now;
          });
        } else if (reportType === 'custom') {
          const startDate = document.getElementById('report-start-date').value;
          const endDate = document.getElementById('report-end-date').value;

          if (!startDate || !endDate) {
            if (window.hideLoading) window.hideLoading();
            alert('Please select both start and end dates for custom report');
            return;
          }

          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          filteredSubmissions = userSubmissions.filter(sub => {
            const subDate = new Date(sub.createdAt || sub.timestamp || sub.date);
            return subDate >= start && subDate <= end;
          });
        } else if (reportType === 'all-time') {
          filteredSubmissions = userSubmissions;
        }

        if (window.hideLoading) window.hideLoading();

        if (filteredSubmissions.length === 0) {
          alert('No orders found for the selected date range');
          return;
        }

        // Generate report based on format
        if (format === 'csv') {
          downloadCSVReport(filteredSubmissions, reportType);
        } else if (format === 'json') {
          downloadJSONReport(filteredSubmissions, reportType);
        } else if (format === 'pdf') {
          downloadPDFReport(filteredSubmissions, reportType);
        }
      } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error generating report:', error);
        alert('Error generating report: ' + error.message + '. Please try again.');
      }
    }

    function downloadCSVReport(submissions, reportType) {
      let csv = 'Token Number,Date,Student Name,Room,Items,Status,Priority,Special Instructions,Submitted Date,Estimated Completion\n';

      submissions.forEach(sub => {
        const date = new Date(sub.createdAt || sub.timestamp || sub.date).toLocaleDateString();
        const submittedDate = new Date(sub.submittedDate || sub.createdAt).toLocaleDateString();
        const estimatedCompletion = sub.estimatedCompletion ? new Date(sub.estimatedCompletion).toLocaleDateString() : 'N/A';
        const items = sub.items ? sub.items.map(item => `${item.quantity || item.count} ${item.name || item.type}`).join(' + ') :
          `${sub.clothesCount || 0} ${sub.clothesType || 'items'}`;
        const specialInstructions = (sub.specialInstructions || sub.notes || 'None').replace(/"/g, '""');

        csv += `"${sub.tokenNumber}","${date}","${sub.studentName || sub.name || 'N/A'}","${sub.hostelRoom || sub.room || 'N/A'}","${items}","${sub.currentStatus || sub.status || 'in-process'}","${sub.priority || 'normal'}","${specialInstructions}","${submittedDate}","${estimatedCompletion}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laundry-report-${reportType}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('CSV report downloaded successfully!');
    }

    function downloadJSONReport(submissions, reportType) {
      const reportData = {
        reportType: reportType,
        generatedAt: new Date().toISOString(),
        totalOrders: submissions.length,
        orders: submissions
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laundry-report-${reportType}-${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('JSON report downloaded successfully!');
    }

    function escapeHtml(text) {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function downloadPDFReport(submissions, reportType) {
      // Simple PDF generation using HTML content
      const reportWindow = window.open('', '_blank');
      const currentUser = window.authManager.getCurrentUser();

      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laundry Report - ${escapeHtml(reportType)}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 1200px;
              margin: 0 auto;
            }
            h1 { 
              color: #F97316; 
              text-align: center;
              margin-bottom: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 10px; 
              text-align: left;
              font-size: 12px;
            }
            th { 
              background-color: #F97316; 
              color: white; 
              font-weight: 600;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
            .summary { 
              background: #f0f0f0; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 5px; 
            }
            .summary p {
              margin: 5px 0;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>🧺 Laundry Buddy - ${escapeHtml(reportType.toUpperCase().replace('-', ' '))} Report</h1>
          <div class="summary">
            <p><strong>Student Name:</strong> ${escapeHtml(currentUser.name || 'N/A')}</p>
            <p><strong>Student ID:</strong> ${escapeHtml(currentUser.studentId || 'N/A')}</p>
            <p><strong>Room:</strong> ${escapeHtml(currentUser.hostelRoom || currentUser.room || 'N/A')}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Orders:</strong> ${submissions.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Date</th>
                <th>Items</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Est. Completion</th>
              </tr>
            </thead>
            <tbody>
      `;

      submissions.forEach(sub => {
        const date = new Date(sub.createdAt || sub.timestamp || sub.date).toLocaleDateString();
        const items = sub.items ? sub.items.map(item => `${item.quantity || item.count} ${item.name || item.type}`).join(', ') :
          `${sub.clothesCount || 0} ${sub.clothesType || 'items'}`;
        const estimatedCompletion = sub.estimatedCompletion ? new Date(sub.estimatedCompletion).toLocaleDateString() : 'N/A';
        const priority = sub.priority || 'normal';
        const priorityStyle = priority === 'urgent' ? 'color: #dc2626; font-weight: 600;' : '';

        html += `
          <tr>
            <td>${escapeHtml(sub.tokenNumber)}</td>
            <td>${escapeHtml(date)}</td>
            <td>${escapeHtml(items)}</td>
            <td>${escapeHtml(sub.currentStatus || sub.status || 'in-process')}</td>
            <td style="${priorityStyle}">${escapeHtml(priority)}</td>
            <td>${escapeHtml(estimatedCompletion)}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
        </html>
      `;

      reportWindow.document.write(html);
      reportWindow.document.close();

      alert('PDF report opened in new window. Use Print dialog (Ctrl+P) to save as PDF.');
    }

    console.log('Support page loaded');
  });
})();

