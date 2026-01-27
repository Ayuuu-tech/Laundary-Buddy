/**
 * DATA EXPORTER
 * 
 * Export order history and user data in multiple formats.
 * Supports CSV, JSON, and PDF exports with filtering options.
 * 
 * Features:
 * - Export to CSV (Excel-compatible)
 * - Export to JSON (developer-friendly)
 * - Export to PDF (print-friendly, optional)
 * - Date range filtering
 * - Status filtering
 * - Include user profile data
 * - Download with custom filename
 * 
 * Usage:
 * const exporter = new DataExporter(orders, userData);
 * exporter.exportToCSV();
 * exporter.exportToJSON({ dateRange: { start: '2025-01-01', end: '2025-12-31' } });
 * 
 * Created: 2025
 * Part of: Laundry Buddy College Project
 */

(function () {
  'use strict';

  /**
   * DataExporter Class
   * Handles exporting order history and user data
   */
  class DataExporter {
    constructor(orders = [], userData = null) {
      this.orders = orders;
      this.userData = userData || this.loadUserData();
    }

    /**
     * Load user data from localStorage
     */
    loadUserData() {
      const currentUser = localStorage.getItem('laundryBuddy_currentUser');
      if (!currentUser) return null;

      const users = JSON.parse(localStorage.getItem('laundryBuddy_users') || '[]');
      return users.find(u => u.email === currentUser) || null;
    }

    /**
     * Filter orders based on options
     */
    filterOrders(options = {}) {
      let filtered = [...this.orders];

      // Filter by date range
      if (options.dateRange) {
        const { start, end } = options.dateRange;
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.date);
          const startDate = start ? new Date(start) : new Date('1900-01-01');
          const endDate = end ? new Date(end) : new Date('2100-12-31');
          return orderDate >= startDate && orderDate <= endDate;
        });
      }

      // Filter by status
      if (options.status && options.status !== 'all') {
        filtered = filtered.filter(order => order.status === options.status);
      }

      return filtered;
    }

    /**
     * Export to CSV format
     */
    exportToCSV(options = {}) {
      const filtered = this.filterOrders(options);

      if (filtered.length === 0) {
        this.showNotification('No orders to export', 'warning');
        return;
      }

      // CSV Header
      let csv = 'Order ID,Date,Items,Total Items,Status,Rating,Estimated Completion\n';

      // CSV Rows
      filtered.forEach(order => {
        const items = order.items ? order.items.map(item => `${item.count} ${item.type}`).join('; ') : '';
        const rating = order.rating || 'N/A';
        const estimatedCompletion = order.estimatedCompletion || 'N/A';

        csv += `"${order.id}","${order.displayDate || order.date}","${items}","${order.totalItems}","${order.status}","${rating}","${estimatedCompletion}"\n`;
      });

      // Add user profile if option enabled
      if (options.includeProfile && this.userData) {
        csv += '\n\nUser Profile\n';
        csv += `Name,"${this.userData.name || 'N/A'}"\n`;
        csv += `Email,"${this.userData.email}"\n`;
        csv += `Phone,"${this.userData.phone || 'N/A'}"\n`;
      }

      // Download
      const filename = this.generateFilename('csv', options);
      this.downloadFile(csv, filename, 'text/csv');

      this.showNotification(`Exported ${filtered.length} orders to CSV`, 'success');
    }

    /**
     * Export to JSON format
     */
    exportToJSON(options = {}) {
      const filtered = this.filterOrders(options);

      if (filtered.length === 0) {
        this.showNotification('No orders to export', 'warning');
        return;
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        totalOrders: filtered.length,
        orders: filtered
      };

      // Add user profile if option enabled
      if (options.includeProfile && this.userData) {
        exportData.userProfile = {
          name: this.userData.name,
          email: this.userData.email,
          phone: this.userData.phone
        };
      }

      // Add statistics
      exportData.statistics = this.calculateStatistics(filtered);

      const json = JSON.stringify(exportData, null, 2);
      const filename = this.generateFilename('json', options);
      this.downloadFile(json, filename, 'application/json');

      this.showNotification(`Exported ${filtered.length} orders to JSON`, 'success');
    }

    /**
     * Export to PDF format (simplified text-based PDF)
     */
    exportToPDF(options = {}) {
      const filtered = this.filterOrders(options);

      if (filtered.length === 0) {
        this.showNotification('No orders to export', 'warning');
        return;
      }

      // Create HTML content for PDF
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Laundry Buddy - Order History</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              line-height: 1.6;
            }
            h1 {
              color: #F97316;
              border-bottom: 3px solid #F97316;
              padding-bottom: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .stats {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #F97316;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🧺 Laundry Buddy - Order History</h1>
            <p>Export Date: ${new Date().toLocaleDateString()}</p>
          </div>
      `;

      // Add statistics
      const stats = this.calculateStatistics(filtered);
      html += `
        <div class="stats">
          <h2>Statistics</h2>
          <p><strong>Total Orders:</strong> ${stats.totalOrders}</p>
          <p><strong>Completed:</strong> ${stats.completedOrders}</p>
          <p><strong>In Process:</strong> ${stats.inProcessOrders}</p>
          <p><strong>Cancelled:</strong> ${stats.cancelledOrders}</p>
          <p><strong>Total Items Laundered:</strong> ${stats.totalItems}</p>
        </div>
      `;

      // Add table
      html += `
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Items</th>
              <th>Status</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
      `;

      filtered.forEach(order => {
        const items = order.items ? order.items.map(item => `${item.count} ${item.type}`).join(', ') : '';
        const rating = order.rating ? '⭐'.repeat(order.rating) : 'N/A';

        html += `
          <tr>
            <td>${order.id}</td>
            <td>${order.displayDate || order.date}</td>
            <td>${items}</td>
            <td>${order.status}</td>
            <td>${rating}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
        <div class="footer">
          <p>Generated by Laundry Buddy © 2025</p>
        </div>
        </body>
        </html>
      `;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 250);

      this.showNotification(`Prepared ${filtered.length} orders for PDF export`, 'success');
    }

    /**
     * Calculate statistics from orders
     */
    calculateStatistics(orders) {
      return {
        totalOrders: orders.length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        inProcessOrders: orders.filter(o => o.status === 'in-process').length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        totalItems: orders.reduce((sum, o) => sum + (o.totalItems || 0), 0),
        averageRating: this.calculateAverageRating(orders)
      };
    }

    /**
     * Calculate average rating
     */
    calculateAverageRating(orders) {
      const ratedOrders = orders.filter(o => o.rating !== null && o.rating !== undefined);
      if (ratedOrders.length === 0) return 0;
      
      const sum = ratedOrders.reduce((total, o) => total + o.rating, 0);
      return (sum / ratedOrders.length).toFixed(1);
    }

    /**
     * Generate filename with timestamp
     */
    generateFilename(extension, options = {}) {
      const timestamp = new Date().toISOString().split('T')[0];
      const status = options.status && options.status !== 'all' ? `_${options.status}` : '';
      return `laundry-buddy-orders${status}_${timestamp}.${extension}`;
    }

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
      if (window.toastManager) {
        window.toastManager[type](message);
      } else {
        console.log(`[Data Exporter] ${message}`);
      }
    }

    /**
     * Export all formats (ZIP would require additional library)
     */
    exportAll(options = {}) {
      this.exportToCSV(options);
      setTimeout(() => this.exportToJSON(options), 300);
      setTimeout(() => this.exportToPDF(options), 600);
    }
  }

  // Make DataExporter globally accessible
  window.DataExporter = DataExporter;

  // Export for use in modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataExporter;
  }
})();
