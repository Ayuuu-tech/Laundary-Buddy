const fs = require('fs').promises;
const path = require('path');

class DataStore {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.ordersFile = path.join(this.dataDir, 'orders.json');
    this.laundryTrackingFile = path.join(this.dataDir, 'laundry-tracking.json');
  }

  async ensureDataFiles() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }

    const files = [
      { path: this.usersFile, data: [] },
      { path: this.ordersFile, data: [] },
      { path: this.laundryTrackingFile, data: [] }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.data, null, 2));
      }
    }
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async writeFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // User operations
  async getUsers() {
    return await this.readFile(this.usersFile);
  }

  async saveUsers(users) {
    await this.writeFile(this.usersFile, users);
  }

  async getUserByEmail(email) {
    const users = await this.getUsers();
    return users.find(user => user.email === email);
  }

  async getUserById(id) {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async createUser(userData) {
    const users = await this.getUsers();
    users.push(userData);
    await this.saveUsers(users);
    return userData;
  }

  async updateUser(id, updates) {
    const users = await this.getUsers();
    const index = users.findIndex(user => user.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await this.saveUsers(users);
      return users[index];
    }
    return null;
  }

  // Order operations
  async getOrders() {
    return await this.readFile(this.ordersFile);
  }

  async saveOrders(orders) {
    await this.writeFile(this.ordersFile, orders);
  }

  async getOrdersByUserId(userId) {
    const orders = await this.getOrders();
    return orders.filter(order => order.userId === userId);
  }

  async createOrder(orderData) {
    const orders = await this.getOrders();
    orders.push(orderData);
    await this.saveOrders(orders);
    return orderData;
  }

  async updateOrder(orderId, updates) {
    const orders = await this.getOrders();
    const index = orders.findIndex(order => order.id === orderId);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      await this.saveOrders(orders);
      return orders[index];
    }
    return null;
  }

  async deleteOrder(orderId) {
    const orders = await this.getOrders();
    const filtered = orders.filter(order => order.id !== orderId);
    await this.saveOrders(filtered);
    return filtered.length < orders.length;
  }

  // Laundry tracking operations
  async getLaundryTracking() {
    return await this.readFile(this.laundryTrackingFile);
  }

  async saveLaundryTracking(tracking) {
    await this.writeFile(this.laundryTrackingFile, tracking);
  }

  async getTrackingByUserId(userId) {
    const tracking = await this.getLaundryTracking();
    return tracking.filter(item => item.userId === userId);
  }

  async createTracking(trackingData) {
    const tracking = await this.getLaundryTracking();
    tracking.push(trackingData);
    await this.saveLaundryTracking(tracking);
    return trackingData;
  }

  async updateTracking(trackingId, updates) {
    const tracking = await this.getLaundryTracking();
    const index = tracking.findIndex(item => item.id === trackingId);
    if (index !== -1) {
      tracking[index] = { ...tracking[index], ...updates };
      await this.saveLaundryTracking(tracking);
      return tracking[index];
    }
    return null;
  }
}

module.exports = new DataStore();
