// support.js - Support center page functionality
(function () {
  'use strict';

  // Check authentication before initializing page
  if (window.authManager && !window.authManager.isLoggedIn()) {
    alert('Please login to access support.');
    window.location.href = 'login.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', function () {
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
        messageTextarea.addEventListener('input', function() {
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
      managerContactForm.addEventListener('submit', function(e) {
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
      missingClothesForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tokenNumber = document.getElementById('missing-token').value.trim();
        const laundryDate = document.getElementById('missing-date').value;
        const missingItems = document.getElementById('missing-items').value.trim();
        const additionalDetails = document.getElementById('missing-details').value.trim();
        
        if (!tokenNumber || !laundryDate || !missingItems) {
          alert('Please fill out all required fields.');
          return;
        }
        
        // Save missing clothes report
        const report = {
          type: 'missing-clothes',
          tokenNumber: tokenNumber,
          laundryDate: laundryDate,
          items: missingItems,
          details: additionalDetails,
          reportDate: new Date().toISOString(),
          studentId: window.authManager.getCurrentUser().studentId,
          status: 'pending'
        };
        
        // Save to localStorage
        const reports = JSON.parse(localStorage.getItem('laundryBuddy_reports') || '[]');
        reports.push(report);
        localStorage.setItem('laundryBuddy_reports', JSON.stringify(reports));
        
        alert('Missing clothes report submitted successfully! We will investigate and contact you soon.');
        missingClothesForm.reset();
        missingClothesSection.style.display = 'none';
      });
    }

    // Damage Report Form Handler
    const damageReportForm = document.getElementById('damage-report-form');
    if (damageReportForm) {
      damageReportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tokenNumber = document.getElementById('damage-token').value.trim();
        const laundryDate = document.getElementById('damage-date').value;
        const damagedItems = document.getElementById('damaged-items').value.trim();
        const damageType = document.getElementById('damage-type').value;
        const damageDetails = document.getElementById('damage-details').value.trim();
        
        if (!tokenNumber || !laundryDate || !damagedItems || !damageType || !damageDetails) {
          alert('Please fill out all required fields.');
          return;
        }
        
        // Save damage report
        const report = {
          type: 'damage',
          tokenNumber: tokenNumber,
          laundryDate: laundryDate,
          items: damagedItems,
          damageType: damageType,
          details: damageDetails,
          reportDate: new Date().toISOString(),
          studentId: window.authManager.getCurrentUser().studentId,
          status: 'pending'
        };
        
        // Save to localStorage
        const reports = JSON.parse(localStorage.getItem('laundryBuddy_reports') || '[]');
        reports.push(report);
        localStorage.setItem('laundryBuddy_reports', JSON.stringify(reports));
        
        alert('Damage report submitted successfully! We will review and contact you for compensation.');
        damageReportForm.reset();
        damageReportSection.style.display = 'none';
      });
    }

    // Report generation functionality
    const reportBtnsNew = document.querySelectorAll('.report-btn');
    const formatRadios = document.querySelectorAll('input[name="report-format"]');
    
    reportBtnsNew.forEach(btn => {
      btn.addEventListener('click', function() {
        const reportType = this.dataset.reportType;
        const selectedFormat = document.querySelector('input[name="report-format"]:checked').value;
        
        generateReport(reportType, selectedFormat);
      });
    });
    
    function generateReport(reportType, format) {
      // Get current user
      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
      
      if (!currentUser) {
        alert('Please login to generate reports');
        return;
      }
      
      // Get submissions from localStorage
      const submissions = JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
      
      // Filter for current user
      let userSubmissions = submissions.filter(sub => 
        sub.studentId === currentUser.studentId || 
        sub.hostelRoom === currentUser.hostelRoom
      );
      
      // Filter by date range based on report type
      const now = new Date();
      let filteredSubmissions = [];
      
      if (reportType === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredSubmissions = userSubmissions.filter(sub => {
          const subDate = new Date(sub.timestamp || sub.date);
          return subDate >= startOfMonth && subDate <= now;
        });
      } else if (reportType === 'custom') {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        
        if (!startDate || !endDate) {
          alert('Please select both start and end dates for custom report');
          return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        filteredSubmissions = userSubmissions.filter(sub => {
          const subDate = new Date(sub.timestamp || sub.date);
          return subDate >= start && subDate <= end;
        });
      } else if (reportType === 'all-time') {
        filteredSubmissions = userSubmissions;
      }
      
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
    }
    
    function downloadCSVReport(submissions, reportType) {
      let csv = 'Token Number,Date,Student ID,Hostel Room,Items,Pickup Date,Status,Special Instructions\n';
      
      submissions.forEach(sub => {
        const date = new Date(sub.timestamp || sub.date).toLocaleDateString();
        const items = sub.items ? sub.items.map(item => `${item.count} ${item.type}`).join(' + ') : `${sub.clothesCount} ${sub.clothesType}`;
        
        csv += `"${sub.tokenNumber}","${date}","${sub.studentId}","${sub.hostelRoom}","${items}","${sub.pickupDate}","${sub.status || 'in-process'}","${sub.specialInstructions || 'None'}"\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
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
    
    function downloadPDFReport(submissions, reportType) {
      // Simple PDF generation using HTML content
      const reportWindow = window.open('', '_blank');
      const currentUser = window.authManager.getCurrentUser();
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laundry Report - ${reportType}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #F97316; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #F97316; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Laundry Buddy - ${reportType.toUpperCase()} Report</h1>
          <div class="summary">
            <p><strong>Student ID:</strong> ${currentUser.studentId}</p>
            <p><strong>Name:</strong> ${currentUser.name}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Orders:</strong> ${submissions.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Date</th>
                <th>Items</th>
                <th>Pickup Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      submissions.forEach(sub => {
        const date = new Date(sub.timestamp || sub.date).toLocaleDateString();
        const items = sub.items ? sub.items.map(item => `${item.count} ${item.type}`).join(', ') : `${sub.clothesCount} ${sub.clothesType}`;
        
        html += `
          <tr>
            <td>${sub.tokenNumber}</td>
            <td>${date}</td>
            <td>${items}</td>
            <td>${sub.pickupDate}</td>
            <td>${sub.status || 'in-process'}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;
      
      reportWindow.document.write(html);
      reportWindow.document.close();
      
      alert('PDF report opened in new window. Use Print dialog to save as PDF.');
    }

    console.log('Support page loaded');
  });
})();

