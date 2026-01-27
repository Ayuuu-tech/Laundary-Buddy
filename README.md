<div align="center">

# 🧺 Laundry Buddy

### *Smart Laundry Management System for Hostels & Colleges*

**No slips. No queues. No stress. Just clean clothes.**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[✨ Features](#-features) • [🚀 Quick Start](#-quick-start) • [📦 Installation](#-installation) • [🌐 Deployment](#-deployment) • [📖 API Docs](#-api-documentation) • [🤝 Contributing](#-contributing)

---

<img src="frontend/assests/laundary_buddy.png" alt="Laundry Buddy Logo" width="200"/>

</div>

## 📖 About The Project

**Laundry Buddy** is a full-stack Progressive Web Application (PWA) designed to revolutionize laundry management in hostels, colleges, and residential facilities. It eliminates paper slips, reduces queues, and provides real-time tracking of laundry orders.

### 🎯 The Problem

| ❌ Traditional System | ✅ Laundry Buddy |
|:---------------------|:-----------------|
| Paper slips get lost | Digital order management |
| Long waiting queues | Online booking system |
| No order tracking | Real-time status updates |
| Manual record keeping | Automated history tracking |
| Limited operating hours | 24/7 order submission |
| No notifications | Instant push notifications |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 👤 For Students
- 📱 **Mobile-First PWA** - Install on any device
- 📅 **Easy Order Submission** - Quick laundry requests
- 📍 **Real-Time Tracking** - Track order status live
- 📜 **Order History** - View all past orders
- 🔔 **Notifications** - Get status updates
- 🌙 **Dark Mode** - Eye-friendly interface
- 💬 **Support System** - Report issues instantly
- 🔒 **Secure Auth** - JWT & session-based security

</td>
<td width="50%">

### 🏪 For Laundry Staff
- 📊 **Admin Dashboard** - Manage all orders
- ✅ **Order Management** - Update order status
- 📋 **Support Tickets** - Handle student complaints
- 📈 **Analytics** - Track order statistics
- 🔍 **Search & Filter** - Find orders quickly
- 📧 **Contact Messages** - View student queries
- 👥 **User Management** - Manage student accounts
- 📱 **Responsive Design** - Works on all screens

</td>
</tr>
</table>

### 🛠️ Technical Features

- **PWA Support** - Offline functionality, installable app
- **Session Management** - Secure cookie-based sessions with MongoDB store
- **Rate Limiting** - API protection against abuse
- **Input Validation** - Server-side validation with express-validator
- **Security Headers** - Helmet.js for HTTP security
- **CORS Configuration** - Flexible cross-origin support
- **Docker Support** - Containerized deployment ready
- **Multi-Platform Deploy** - Cloudflare, Vercel, Render, Netlify support

---

## 🏗️ Tech Stack

<div align="center">

| Category | Technologies |
|:--------:|:-------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), PWA |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas |
| **Authentication** | JWT, Express Sessions, bcrypt |
| **Security** | Helmet, CORS, Rate Limiting, Input Sanitization |
| **Deployment** | Docker, Cloudflare Pages, Render, Vercel |
| **Tools** | Git, npm, nodemon, Winston Logger |

</div>

---

## 📁 Project Structure

```
Laundary-Buddy/
│
├── 📂 frontend/                    # Frontend Application
│   ├── 📄 index.html               # Landing page
│   ├── 📄 home.html                # User dashboard
│   ├── 📄 submit.html              # Submit laundry order
│   ├── 📄 track.html               # Track orders
│   ├── 📄 history.html             # Order history
│   ├── 📄 profile.html             # User profile
│   ├── 📄 support.html             # Support & complaints
│   ├── 📄 contact.html             # Contact form
│   ├── 📄 login.html               # User login
│   ├── 📄 signup.html              # User registration
│   ├── 📄 laundry-dashboard.html   # Staff dashboard
│   ├── 📄 laundry-login.html       # Staff login
│   ├── 📄 offline.html             # PWA offline page
│   ├── 🎨 *.css                    # Stylesheets
│   ├── 📦 manifest.json            # PWA manifest
│   ├── ⚙️ service-worker.js        # PWA service worker
│   ├── 🐳 Dockerfile               # Frontend container
│   └── 📂 assests/                 # JavaScript & assets
│       ├── api-config.js           # API configuration
│       ├── auth.js                 # Authentication logic
│       ├── order-api.js            # Order API calls
│       ├── form-validator.js       # Form validation
│       ├── toast-manager.js        # Notifications
│       ├── dark-mode.js            # Theme toggle
│       └── *.js                    # Other modules
│
├── 📂 backend/                     # Backend API Server
│   ├── 📄 server.js                # Express server entry
│   ├── 📄 worker.js                # Cloudflare Worker adapter
│   ├── 📄 package.json             # Dependencies
│   ├── 🐳 Dockerfile               # Backend container
│   ├── 📂 config/
│   │   └── db.js                   # MongoDB connection
│   ├── 📂 controllers/
│   │   ├── authController.js       # Auth logic
│   │   ├── orderController.js      # Order logic
│   │   └── trackingController.js   # Tracking logic
│   ├── 📂 models/
│   │   ├── User.js                 # User schema
│   │   ├── Order.js                # Order schema
│   │   ├── SupportTicket.js        # Support ticket schema
│   │   └── ContactMessage.js       # Contact message schema
│   ├── 📂 routes/
│   │   ├── auth.js                 # Auth endpoints
│   │   ├── orders.js               # Order endpoints
│   │   ├── tracking.js             # Tracking endpoints
│   │   ├── support.js              # Support endpoints
│   │   └── contact.js              # Contact endpoints
│   ├── 📂 middleware/
│   │   ├── auth.js                 # JWT verification
│   │   ├── security.js             # Rate limiting & headers
│   │   └── validation.js           # Input validation
│   └── 📂 scripts/
│       └── migrate-json-to-mongo.js # Data migration
│
├── 🐳 docker-compose.yml           # Development containers
├── 🐳 docker-compose.prod.yml      # Production containers
├── ☁️ render.yaml                  # Render deployment
├── ☁️ vercel.json                  # Vercel deployment
├── ☁️ netlify.toml                 # Netlify deployment
├── ☁️ wrangler.toml                # Cloudflare Workers
└── 📄 README.md                    # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local or Atlas)
- **Git**

### One-Command Setup (Development)

```bash
# Clone and start (Docker)
git clone https://github.com/Ayuuu-tech/Laundary-Buddy.git
cd Laundary-Buddy
docker-compose up -d
```

### Local Development (No Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill required values
npm run dev             # or npm start

# Frontend (new terminal)
cd ../frontend
npx serve -p 8080       # or python -m http.server 8080
```

- Backend runs on: http://localhost:3000
- Frontend runs on: http://localhost:8080
- Update the API base URL in frontend/assests/api-config.js if you change ports.

---

## 📦 Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/Ayuuu-tech/Laundary-Buddy.git
cd Laundary-Buddy
```

### Step 2: Configure Environment

```bash
# Copy environment file
cp backend/.env.example backend/.env

# Edit with your settings
nano backend/.env
```

**Required Environment Variables:**

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/laundry_buddy

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# CORS (for production)
ALLOWED_ORIGINS=https://yourdomain.com
```

**Configuration map (edit these when deploying):**
- [backend/.env](backend/.env) or [backend/.env.example](backend/.env.example) for server secrets and MongoDB connection.
- [frontend/assests/api-config.js](frontend/assests/api-config.js) for API base URLs (development vs production).
- [frontend/assests/environment.js](frontend/assests/environment.js) for Google OAuth client IDs and environment toggles.
- [docker-compose.prod.yml](docker-compose.prod.yml) and [docker-compose.yml](docker-compose.yml) for port or image overrides.

### Step 3: Start Backend

```bash
cd backend
npm install
npm start        # Production
# OR
npm run dev      # Development with auto-reload
```

## 🌐 Deploying with Render + Google Sign-In

Follow these steps to ensure Google Sign-In works for the deployed site `https://laundrybuddy.ayushmaanyadav.me` and the API `https://laundry-buddy-api.onrender.com`.

- Google Cloud Console (OAuth Client)
   - In your OAuth Client settings (Credentials → OAuth 2.0 Client IDs), add **Authorized JavaScript origins**:
      - `https://laundrybuddy.ayushmaanyadav.me`
   - Do NOT add origins that include paths (e.g. `https://api.example.com/api`) — origins must be scheme + host [+ optional port].
   - If you use an OAuth redirect flow, add the full redirect URI(s) under **Authorized redirect URIs** (these can include paths).

- Render Environment Variables (Backend Service)
   - In your Render service settings, set these environment variables:
      - `NODE_ENV=production`
      - `GOOGLE_CLIENT_ID=<your-google-client-id>`
      - `ALLOWED_ORIGINS=https://laundrybuddy.ayushmaanyadav.me` (comma-separated list if multiple)
      - `SESSION_SECRET=<strong-session-secret>`
      - `MONGODB_URI=<your-mongo-connection-string>`
   - After changing env vars, redeploy the service.

- Frontend
   - Ensure the frontend uses the same `GOOGLE_CLIENT_ID` value. The project reads a production client ID from `frontend/assests/environment.js` (property `production.googleClientId`).
   - If you host frontend separately, update that file or redeploy with the correct client id.

- CORS & Cookies
   - Backend must allow the frontend origin. `ALLOWED_ORIGINS` should include `https://laundrybuddy.ayushmaanyadav.me`.
   - For cross-site cookies to work, backend session cookie is configured with `sameSite: 'none'` and `secure: true` in production — ensure `NODE_ENV=production` and HTTPS is used.

- Verification Steps
   1. Fix Authorized JavaScript origins in Google Console and Save.
   2. Set `GOOGLE_CLIENT_ID` and `ALLOWED_ORIGINS` in Render and redeploy backend.
   3. Open a private browser window and visit: `https://laundrybuddy.ayushmaanyadav.me/login.html`
   4. Click 'Sign in with Google' and watch network requests to `https://laundry-buddy-api.onrender.com/api/auth/google` — response should be `200` and Set-Cookie header should appear.

Backend runs at: `http://localhost:3000`
### Step 4: Start Frontend

```bash
# In a new terminal, from project root
cd frontend
python -m http.server 8080
# OR
npx serve -p 8080
```

Frontend runs at: `http://localhost:8080`

### Step 5: Verify Installation

1. Open `http://localhost:8080` in your browser
2. Create a new account via Sign Up
3. Submit a test laundry order
4. Check the order in History page

---

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d --build
```

**Access Points:**
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/api/health`

---

## 🌐 Deployment

### Deploy to Cloud Platforms

| Platform | Frontend | Backend | Guide |
|:--------:|:--------:|:-------:|:------|
| **Cloudflare** | Pages | Workers | Best for global CDN |
| **Vercel** | Vercel | Vercel | Easiest setup |
| **Render** | Static Site | Web Service | Free tier available |
| **Netlify + Render** | Netlify | Render | Recommended combo |

### Quick Deploy to Render

1. **Push code to GitHub**

2. **Create MongoDB Atlas cluster** (free tier)
   - Get connection string

3. **Deploy Backend on Render**
   - Connect GitHub repo
   - Select `backend` folder
   - Add environment variables
   - Deploy!

4. **Deploy Frontend on Cloudflare Pages**
   - Connect GitHub repo
   - Set build folder: `frontend`
   - Deploy!

5. **Update API URL**
   - Edit `frontend/assests/api-config.js`
   - Set production API URL

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-string>
SESSION_SECRET=<strong-random-string>
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

---

## 📖 API Documentation

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-api-domain.com/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/logout` | User logout |
| `GET` | `/auth/me` | Get current user |
| `GET` | `/auth/check` | Check auth status |

### Order Endpoints

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/orders` | Create new order |
| `GET` | `/orders/my-orders` | Get user's orders |
| `GET` | `/orders/:id` | Get order by ID |
| `PUT` | `/orders/:id/status` | Update order status |
| `DELETE` | `/orders/:id` | Delete order |

### Support Endpoints

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/support/tickets` | Create support ticket |
| `GET` | `/support/tickets` | Get all tickets |
| `PUT` | `/support/tickets/:id` | Update ticket |

### Health Check

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-12-23T00:00:00.000Z",
  "database": "connected"
}
```

---

## 📱 PWA Features

Laundry Buddy is a full Progressive Web App:

- **Installable** - Add to home screen on mobile/desktop
- **Offline Support** - Basic functionality without internet
- **Push Ready** - Infrastructure for notifications
- **Fast Loading** - Service worker caching

### Install as App

1. Open the website in Chrome/Edge
2. Click the install icon in address bar
3. Or use "Add to Home Screen" on mobile

---

## 🔒 Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Tokens** - Secure stateless authentication
- **Session Management** - MongoDB session store
- **Rate Limiting** - Prevent brute force attacks
- **Input Sanitization** - Prevent NoSQL injection
- **CORS Protection** - Whitelist allowed origins
- **Security Headers** - Helmet.js middleware
- **HTTPS Ready** - Secure in production

---

## 🧪 Testing

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test@123","hostelRoom":"A-101"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"test@test.com","password":"Test@123"}'
```

---

## ⚡ Troubleshooting

- Seeing CORS errors? Confirm your frontend origin is listed in ALLOWED_ORIGINS inside [backend/.env](backend/.env).
- Google Sign-In failing? Authorized JavaScript origin must match your deployed frontend and the production client ID in [frontend/assests/environment.js](frontend/assests/environment.js).
- Cookies not set in production? Ensure HTTPS, sameSite: "none", secure: true are active by running with NODE_ENV=production.
- Backend not starting? Recheck MONGODB_URI in [backend/.env](backend/.env) and allow your host IP in MongoDB Atlas.
- 404s from API when using a different port? Update [frontend/assests/api-config.js](frontend/assests/api-config.js) to point to the correct backend base URL.

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before PR

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Ayush**

- GitHub: [@Ayuuu-tech](https://github.com/Ayuuu-tech)

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [MongoDB](https://www.mongodb.com/) - Modern database platform
- [Helmet](https://helmetjs.github.io/) - Security middleware
- All the amazing open-source libraries used

---

<div align="center">

### ⭐ Star this repo if you found it helpful!

**Made with ❤️ for students everywhere**

[Report Bug](https://github.com/Ayuuu-tech/Laundary-Buddy/issues) • [Request Feature](https://github.com/Ayuuu-tech/Laundary-Buddy/issues)

</div>
