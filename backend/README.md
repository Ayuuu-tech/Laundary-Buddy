# Laundry Buddy Backend

Backend API server for the Laundry Buddy application built with Node.js and Express.

## 🚀 Features

- **User Authentication**: Register, login, JWT-based authentication
- **Order Management**: Create, read, update, delete laundry orders
- **Order Tracking**: Real-time tracking of laundry orders
- **Profile Management**: Update user profile and preferences
- **RESTful API**: Clean and organized API endpoints
- **JSON Storage**: File-based data storage (easily upgradable to MongoDB/PostgreSQL)

## 📁 Project Structure

```
backend/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── controllers/           # Business logic
│   ├── authController.js
│   ├── orderController.js
│   └── trackingController.js
├── routes/               # API routes
│   ├── auth.js
│   ├── orders.js
│   └── tracking.js
├── models/               # Data models
│   └── dataStore.js
├── middleware/           # Custom middleware
│   └── auth.js
└── data/                # JSON data files
    ├── users.json
    ├── orders.json
    └── laundry-tracking.json
```

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Steps

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Edit the `.env` file:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

4. **Start the server:**
   ```bash
   # Production mode
   npm start

   # Development mode (with auto-restart)
   npm run dev
   ```

5. **Server will run on:**
   ```
   http://localhost:3000
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

### Orders
- `GET /api/orders` - Get all user orders (protected)
- `GET /api/orders/:id` - Get single order (protected)
- `POST /api/orders` - Create new order (protected)
- `PUT /api/orders/:id` - Update order (protected)
- `DELETE /api/orders/:id` - Delete order (protected)
- `GET /api/orders/history` - Get completed orders (protected)

### Tracking
- `GET /api/tracking` - Get all tracking items (protected)
- `GET /api/tracking/:id` - Get single tracking item (protected)
- `POST /api/tracking` - Create tracking (protected)
- `PUT /api/tracking/:id` - Update tracking (protected)
- `GET /api/tracking/order/:orderNumber` - Track by order number (public)

### System
- `GET /api/health` - Health check
- `GET /` - API information

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### How to use:
1. Register or login to get a token
2. Include token in request headers:
   ```
   Authorization: Bearer <your_token>
   ```

### Example Request:
```javascript
fetch('http://localhost:3000/api/orders', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
})
```

## 📝 Example API Usage

### Register User
```javascript
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "1234567890",
  "address": "BH-3, A-404"
}
```

### Create Order
```javascript
POST /api/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "serviceType": "Wash & Fold",
  "pickupDate": "2024-01-15",
  "pickupTime": "10:00 AM",
  "deliveryDate": "2024-01-16",
  "items": [
    { "name": "Shirt", "quantity": 5 },
    { "name": "Pants", "quantity": 2 }
  ],
  "totalAmount": 250,
  "address": "BH-3, A-404",
  "phone": "1234567890",
  "specialInstructions": "Handle with care"
}
```

## 🗄️ Data Storage

Currently using JSON files for data storage:
- `data/users.json` - User accounts
- `data/orders.json` - Laundry orders
- `data/laundry-tracking.json` - Order tracking

### Upgrade to Database (Optional)
To use MongoDB or PostgreSQL:
1. Install database package: `npm install mongoose` or `npm install pg`
2. Update `models/dataStore.js` with database connection
3. Keep the same interface for easy integration

## 🔧 Development

### Run in development mode:
```bash
npm run dev
```

### Test API endpoints:
Use tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

### Example cURL:
```bash
# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"123456"}'
```

## 🚀 Deployment

### Option 1: Local/VPS
1. Set `NODE_ENV=production` in `.env`
2. Run: `npm start`
3. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name laundry-buddy-api
   ```

### Option 2: Cloud Platforms
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **Render**: Connect GitHub repo
- **DigitalOcean App Platform**: Deploy from GitHub

## 🔒 Security Notes

1. **Change JWT_SECRET** in production
2. Use HTTPS in production
3. Implement rate limiting for API endpoints
4. Add input validation and sanitization
5. Use environment variables for sensitive data
6. Enable CORS only for trusted domains

## 📦 Dependencies

- **express**: Web framework
- **cors**: Enable CORS
- **dotenv**: Environment variables
- **body-parser**: Parse request bodies
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **uuid**: Generate unique IDs

## 🤝 Frontend Integration

The frontend is configured to connect to this backend. Make sure:
1. Backend is running on `http://localhost:3000`
2. Frontend includes `assests/api-config.js`
3. Frontend includes `assests/order-api.js`
4. All HTML files load these scripts before other scripts

### Add to HTML files:
```html
<script src="assests/api-config.js"></script>
<script src="assests/order-api.js"></script>
```

## 📄 License

ISC

## 👥 Support

For issues or questions, please check the documentation or contact the development team.
