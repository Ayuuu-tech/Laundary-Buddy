// history.js - Order history page functionality with JSON and OOP
(function () {
  'use strict';

  // Check authentication before initializing page
  if (window.authManager && !window.authManager.isLoggedIn()) {
    alert('Please login to view order history.');
    window.location.href = 'login.html';
    return;
  }

  // Class representing a single order
  class Order {
    constructor(orderData) {
      this.id = orderData.id;
      this.date = orderData.date;
      this.displayDate = orderData.displayDate;
      this.items = orderData.items;
      this.status = orderData.status;
      this.estimatedCompletion = orderData.estimatedCompletion;
      this.rating = orderData.rating;
      this.totalItems = orderData.totalItems;
    }

    getItemsDescription() {
      return this.items.map(item => `${item.count} ${item.type}${item.count > 1 ? 's' : ''}`).join(', ');
    }

    getStatusClass() {
      const statusMap = {
        'in-process': 'status-processing',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
      };
      return statusMap[this.status] || 'status-pending';
    }

    getStatusLabel() {
      const labelMap = {
        'in-process': 'In Process',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
      };
      return labelMap[this.status] || 'Pending';
    }

    canBeRated() {
      return this.status === 'completed' && this.rating === null;
    }

    getRatingDisplay() {
      if (this.rating) {
        return '⭐'.repeat(this.rating);
      }
      return this.canBeRated() ? 'Rate' : 'N/A';
    }
  }

  // Class for managing the order history table
  class OrderHistoryManager {
    constructor(ordersData) {
      this.orders = ordersData.orders.map(data => new Order(data));
      this.filteredOrders = [...this.orders];
      this.summary = ordersData.summary;
      this.tableBody = document.querySelector('.orders-table tbody');
      this.currentSort = this.loadSortPreference();
    }

    loadSortPreference() {
      return localStorage.getItem('laundryBuddy_sortPreference') || 'date-newest';
    }

    saveSortPreference(sortType) {
      localStorage.setItem('laundryBuddy_sortPreference', sortType);
    }

    renderOrders() {
      if (!this.tableBody) return;

      this.tableBody.innerHTML = '';

      if (this.filteredOrders.length === 0) {
        const emptyMessage = this.orders.length === 0 
          ? '<tr><td colspan="4" style="text-align: center; padding: 40px;"><i class="bx bx-package" style="font-size: 48px; color: #ccc;"></i><br><br>No orders yet. <a href="submit.html" style="color: var(--primary-color);">Submit your first laundry</a> to get started!</td></tr>'
          : '<tr><td colspan="4" style="text-align: center; padding: 40px;">No orders found matching your filter.</td></tr>';
        this.tableBody.innerHTML = emptyMessage;
        return;
      }

      this.filteredOrders.forEach(order => {
        const row = this.createOrderRow(order);
        this.tableBody.appendChild(row);
      });
    }

    createOrderRow(order) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${order.displayDate}</td>
        <td>${order.getItemsDescription()}</td>
        <td><span class="status-pill ${order.getStatusClass()}">${order.getStatusLabel()}</span></td>
        <td><a href="#" class="rate-link" data-order-id="${order.id}">${order.getRatingDisplay()}</a></td>
      `;

      // Add click event for rating
      const rateLink = row.querySelector('.rate-link');
      rateLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.rateOrder(order);
      });

      return row;
    }

    rateOrder(order) {
      if (!order.canBeRated()) {
        alert('This order has already been rated or cannot be rated.');
        return;
      }

      const rating = prompt(`Rate your laundry service for ${order.displayDate} (1-5 stars):`);
      if (rating && rating >= 1 && rating <= 5) {
        order.rating = parseInt(rating);
        this.renderOrders();
        alert(`Thank you for rating! You gave ${rating} stars.`);
      }
    }

    filterByStatus(status) {
      if (status === 'all') {
        this.filteredOrders = [...this.orders];
      } else {
        this.filteredOrders = this.orders.filter(order => order.status === status);
      }
      this.renderOrders();
    }

    filterByDateRange(range) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (range === 'week') {
        // Get start of this week (Sunday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        this.filteredOrders = this.orders.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= startOfWeek && orderDate <= now;
        });
      } else if (range === 'month') {
        // Get start of this month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        this.filteredOrders = this.orders.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= startOfMonth && orderDate <= now;
        });
      } else {
        this.filteredOrders = [...this.orders];
      }
      
      this.renderOrders();
    }

    searchOrders(searchTerm) {
      const term = searchTerm.toLowerCase();
      this.filteredOrders = this.orders.filter(order => {
        return order.displayDate.toLowerCase().includes(term) ||
               order.getItemsDescription().toLowerCase().includes(term) ||
               order.getStatusLabel().toLowerCase().includes(term);
      });
      this.renderOrders();
    }

    sortOrders(sortType) {
      this.currentSort = sortType;
      this.saveSortPreference(sortType);

      this.filteredOrders.sort((a, b) => {
        switch (sortType) {
          case 'date-newest':
            return new Date(b.date) - new Date(a.date);
          
          case 'date-oldest':
            return new Date(a.date) - new Date(b.date);
          
          case 'status':
            const statusOrder = { 'in-process': 1, 'completed': 2, 'cancelled': 3 };
            return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
          
          case 'items-most':
            return b.totalItems - a.totalItems;
          
          case 'items-least':
            return a.totalItems - b.totalItems;
          
          default:
            return 0;
        }
      });

      this.renderOrders();
    }

    updateSummary() {
      const summaryCard = document.querySelector('.summary-card span');
      if (summaryCard) {
        summaryCard.textContent = this.summary.totalOrders;
      }
    }
  }

  // Class for managing filter buttons
  class FilterManager {
    constructor(historyManager) {
      this.historyManager = historyManager;
      this.filterBtns = document.querySelectorAll('.filter-btn');
      this.init();
    }

    init() {
      this.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.handleFilterClick(btn);
        });
      });
    }

    handleFilterClick(btn) {
      // Remove active class from all buttons
      this.filterBtns.forEach(b => b.classList.remove('active'));
      
      // Add active class to clicked button
      btn.classList.add('active');
      
      const filterType = btn.textContent.trim();
      this.applyFilter(filterType);
    }

    applyFilter(filterType) {
      switch (filterType) {
        case 'All Time':
          this.historyManager.filterByStatus('all');
          break;
        case 'Completed':
          this.historyManager.filterByStatus('completed');
          break;
        case 'Cancelled':
          this.historyManager.filterByStatus('cancelled');
          break;
        case 'This Week':
          this.historyManager.filterByDateRange('week');
          break;
        case 'This Month':
          this.historyManager.filterByDateRange('month');
          break;
        default:
          this.historyManager.filterByStatus('all');
      }
    }
  }

  // Class for managing search functionality
  class SearchManager {
    constructor(historyManager) {
      this.historyManager = historyManager;
      this.searchInput = document.querySelector('.search-bar input');
      this.init();
    }

    init() {
      if (!this.searchInput) return;

      this.searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }

    handleSearch(searchTerm) {
      this.historyManager.searchOrders(searchTerm);
    }
  }

  // Class for managing sort functionality
  class SortManager {
    constructor(historyManager) {
      this.historyManager = historyManager;
      this.sortSelect = document.querySelector('.sort-select');
      this.init();
    }

    init() {
      if (!this.sortSelect) return;

      // Set initial sort preference
      this.sortSelect.value = this.historyManager.currentSort;
      this.historyManager.sortOrders(this.historyManager.currentSort);

      // Add change event listener
      this.sortSelect.addEventListener('change', (e) => {
        this.handleSort(e.target.value);
      });
    }

    handleSort(sortType) {
      this.historyManager.sortOrders(sortType);
    }
  }

  // Class for managing export functionality
  class ExportManager {
    constructor(historyManager) {
      this.historyManager = historyManager;
      this.exportBtn = document.getElementById('export-btn');
      this.exportMenu = document.getElementById('export-menu');
      this.init();
    }

    init() {
      if (!this.exportBtn || !this.exportMenu) return;

      // Toggle export menu
      this.exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportMenu.classList.toggle('show');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.exportMenu.contains(e.target) && e.target !== this.exportBtn) {
          this.exportMenu.classList.remove('show');
        }
      });

      // Handle export options
      const exportOptions = this.exportMenu.querySelectorAll('.export-option');
      exportOptions.forEach(option => {
        option.addEventListener('click', (e) => {
          const format = option.dataset.format;
          this.handleExport(format);
          this.exportMenu.classList.remove('show');
        });
      });
    }

    handleExport(format) {
      const orders = this.historyManager.filteredOrders || this.historyManager.orders;
      const exporter = new window.DataExporter(orders);

      switch (format) {
        case 'csv':
          exporter.exportToCSV();
          break;
        case 'json':
          exporter.exportToJSON();
          break;
        case 'pdf':
          exporter.exportToPDF();
          break;
        default:
          console.error('Unknown export format:', format);
      }
    }
  }

  // Main App Class
  class OrderHistoryApp {
    constructor() {
      this.historyManager = null;
      this.filterManager = null;
      this.searchManager = null;
      this.sortManager = null;
      this.exportManager = null;
    }

    async init() {
      try {
        // Load orders data from JSON
        const ordersData = await this.loadOrdersData();
        
        // Initialize managers
        this.historyManager = new OrderHistoryManager(ordersData);
        this.filterManager = new FilterManager(this.historyManager);
        this.searchManager = new SearchManager(this.historyManager);
        this.sortManager = new SortManager(this.historyManager);
        this.exportManager = new ExportManager(this.historyManager);

        // Render initial data
        this.historyManager.renderOrders();
        this.historyManager.updateSummary();

        console.log('History page loaded with OOP and JSON');
        console.log(`Total orders: ${ordersData.summary.totalOrders}`);
      } catch (error) {
        console.error('Error initializing history page:', error);
        this.loadFallbackData();
      }
    }

    async loadOrdersData() {
      // Load orders from localStorage (actual user submissions)
      try {
        const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
        const submissions = JSON.parse(localStorage.getItem('laundryBuddy_submissions') || '[]');
        
        // Filter submissions for current user
        let userSubmissions = submissions;
        if (currentUser) {
          userSubmissions = submissions.filter(sub => 
            sub.studentId === currentUser.studentId || 
            sub.hostelRoom === currentUser.hostelRoom
          );
        }
        
        // Convert submissions to orders format
        const orders = userSubmissions.map((submission, index) => {
          const orderDate = new Date(submission.submittedDate || submission.timestamp || submission.date || Date.now());
          const current = submission.currentStatus || submission.status || 'received';
          const mappedStatus = current === 'completed' ? 'completed' : (current === 'cancelled' ? 'cancelled' : 'in-process');

          return {
            id: submission.tokenNumber || `ORDER-${index + 1}`,
            date: orderDate.toISOString(),
            displayDate: this.formatDisplayDate(orderDate),
            items: submission.items || [],
            status: mappedStatus,
            estimatedCompletion: submission.estimatedCompletion || 'Not specified',
            rating: submission.rating || null,
            totalItems: submission.items ? submission.items.reduce((sum, item) => sum + (item.count || 0), 0) : 0
          };
        });
        
        // Calculate summary
        const summary = {
          totalOrders: orders.length,
          completedOrders: orders.filter(o => o.status === 'completed').length,
          inProcessOrders: orders.filter(o => o.status === 'in-process').length,
          cancelledOrders: orders.filter(o => o.status === 'cancelled').length
        };
        
        return { orders, summary };
      } catch (error) {
        console.error('Error loading orders from localStorage:', error);
        throw error;
      }
    }

    formatDisplayDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }

    loadFallbackData() {
      // Fallback data if loading fails - show empty state
      console.log('Loading fallback data (empty state)');
      
      const fallbackData = {
        orders: [],
        summary: {
          totalOrders: 0,
          completedOrders: 0,
          inProcessOrders: 0,
          cancelledOrders: 0
        }
      };

      this.historyManager = new OrderHistoryManager(fallbackData);
      this.historyManager.renderOrders();
      this.historyManager.updateSummary();
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    const app = new OrderHistoryApp();
    app.init();

    // Make app accessible globally for debugging
    window.orderHistoryApp = app;
  });
})();

