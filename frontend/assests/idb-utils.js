// IndexedDB Utilities for Laundry Buddy
// Provides specific methods for offline order storage

const DB_NAME = 'laundry-buddy-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-orders';

const IDBUtils = {
    db: null,

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    async addOrder(orderData) {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                // Add timestamp to ensure uniqueness and sorting if needed
                const request = store.add({ ...orderData, timestamp: Date.now() });

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error adding order to IDB:', error);
            throw error;
        }
    },

    async getAllOrders() {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error getting orders from IDB:', error);
            return [];
        }
    },

    async deleteOrder(id) {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error deleting order from IDB:', error);
            throw error;
        }
    }
};

// Export for module systems if needed, or stick to global
if (typeof self !== 'undefined') {
    self.IDBUtils = IDBUtils;
}
