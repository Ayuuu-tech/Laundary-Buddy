// Order API Helper - Connects frontend to backend order APIs
(function () {
  'use strict';

  class OrderManager {
    constructor() {
      this.localStorageKey = 'laundryBuddy_orders';
    }

    // Get all orders for current user
    async getOrders() {
      try {
        const response = await apiClient.get('/api/orders');
        return response.orders || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        // Fallback to localStorage
        return this.getLocalOrders();
      }
    }

    // Get single order by ID
    async getOrder(orderId) {
      try {
        const response = await apiClient.get(`/api/orders/${orderId}`);
        return response.order;
      } catch (error) {
        console.error('Error fetching order:', error);
        return null;
      }
    }

    // Create new order
    // Create new order
    async createOrder(orderData) {
      try {
        const response = await apiClient.post('/api/orders', orderData);
        if (response.success) {
          return { success: true, order: response.order, message: 'Order created successfully!' };
        }
        return response;
      } catch (error) {
        console.error('Error creating order:', error);

        // Offline handling
        const isOffline = !window.navigator.onLine || error.message.includes('fetch') || error.message.includes('Network request failed');

        if (isOffline && window.IDBUtils && 'serviceWorker' in navigator) {
          try {
            // Save to IndexedDB
            const savedOrder = await window.IDBUtils.addOrder(orderData);

            // Register background sync
            const registration = await navigator.serviceWorker.ready;
            if (registration.sync) {
              try {
                await registration.sync.register('sync-submissions');
                console.log('Background sync registered');
              } catch (syncErr) {
                console.warn('Background sync registration failed:', syncErr);
              }
            }

            return {
              success: true,
              order: { ...orderData, id: 'offline-' + Date.now(), status: 'queued (offline)' },
              message: 'You are offline. Order saved and will sync automatically when back online.',
              offline: true
            };
          } catch (dbError) {
            console.error('Failed to save order offline:', dbError);
            return { success: false, message: 'Offline save failed: ' + dbError.message };
          }
        }

        return { success: false, message: error.message || 'Error creating order' };
      }
    }

    // Update order
    async updateOrder(orderId, updates) {
      try {
        const response = await apiClient.put(`/api/orders/${orderId}`, updates);
        if (response.success) {
          return { success: true, order: response.order, message: 'Order updated successfully!' };
        }
        return response;
      } catch (error) {
        console.error('Error updating order:', error);
        return { success: false, message: error.message || 'Error updating order' };
      }
    }

    // Delete order
    async deleteOrder(orderId) {
      try {
        const response = await apiClient.delete(`/api/orders/${orderId}`);
        return response;
      } catch (error) {
        console.error('Error deleting order:', error);
        return { success: false, message: error.message || 'Error deleting order' };
      }
    }

    // Get order history
    async getOrderHistory() {
      try {
        const response = await apiClient.get('/api/orders/history');
        return response.orders || [];
      } catch (error) {
        console.error('Error fetching order history:', error);
        return [];
      }
    }

    // Fallback: Get orders from localStorage
    getLocalOrders() {
      const ordersData = localStorage.getItem(this.localStorageKey);
      return ordersData ? JSON.parse(ordersData) : [];
    }

    // Fallback: Save orders to localStorage
    saveLocalOrders(orders) {
      localStorage.setItem(this.localStorageKey, JSON.stringify(orders));
    }
  }

  // Tracking Manager
  class TrackingManager {
    constructor() {
      this.localStorageKey = 'laundryBuddy_tracking';
    }

    // Get all tracking items for user
    async getTrackingItems() {
      try {
        const response = await apiClient.get('/tracking');
        return response.tracking || [];
      } catch (error) {
        console.error('Error fetching tracking:', error);
        return this.getLocalTracking();
      }
    }

    // Get single tracking item
    async getTrackingItem(trackingId) {
      try {
        const response = await apiClient.get(`/tracking/${trackingId}`);
        return response.tracking;
      } catch (error) {
        console.error('Error fetching tracking item:', error);
        return null;
      }
    }

    // Track order by order number (public)
    async trackByOrderNumber(orderNumber) {
      try {
        const response = await apiClient.get(`/tracking/order/${orderNumber}`);
        return response.tracking;
      } catch (error) {
        console.error('Error tracking order:', error);
        return null;
      }
    }

    // Create tracking item
    async createTracking(trackingData) {
      try {
        const response = await apiClient.post('/tracking', trackingData);
        if (response.success) {
          return { success: true, tracking: response.tracking, message: 'Tracking created successfully!' };
        }
        return response;
      } catch (error) {
        console.error('Error creating tracking:', error);
        return { success: false, message: error.message || 'Error creating tracking' };
      }
    }

    // Update tracking item
    async updateTracking(trackingId, updates) {
      try {
        const response = await apiClient.put(`/tracking/${trackingId}`, updates);
        if (response.success) {
          return { success: true, tracking: response.tracking, message: 'Tracking updated successfully!' };
        }
        return response;
      } catch (error) {
        console.error('Error updating tracking:', error);
        return { success: false, message: error.message || 'Error updating tracking' };
      }
    }

    // Fallback: Get tracking from localStorage
    getLocalTracking() {
      const trackingData = localStorage.getItem(this.localStorageKey);
      return trackingData ? JSON.parse(trackingData) : [];
    }

    // Fallback: Save tracking to localStorage
    saveLocalTracking(tracking) {
      localStorage.setItem(this.localStorageKey, JSON.stringify(tracking));
    }
  }

  // Create global instances
  window.orderManager = new OrderManager();
  window.trackingManager = new TrackingManager();

  console.log('✅ Order and Tracking managers initialized');
  console.log('📍 API Base URL:', API_CONFIG.BASE_URL);
  console.log('🔐 Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
})();
