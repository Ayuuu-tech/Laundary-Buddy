# 🧺 Laundry Buddy

**Smart laundry for students – No slips, no stress.**

Laundry Buddy is a web-based laundry management system designed specifically for college students. It eliminates the hassle of traditional laundry slips and provides a seamless digital experience for managing laundry services.

## 🌟 Features

- **📅 Schedule Your Laundry**: Book your preferred laundry time slot in advance
- **🔔 Real-Time Notifications**: Receive instant updates on your laundry status  
- **✅ Guaranteed Availability**: Never worry about machine availability again
- **📱 User-Friendly Interface**: Clean, modern design optimized for students
- **📈 Laundry History**: Track your past laundry orders and patterns
- **👤 Profile Management**: Manage your account and preferences
- **🎯 Order Tracking**: Real-time tracking of your laundry progress
- **💬 Support System**: Get help when you need it

## 🚀 Pages Overview

| Page | Description |
|------|-------------|
| **Landing Page** (`index.html`) | Welcome page with feature overview and authentication options |
| **Home** (`home.html`) | Main dashboard after login |
| **Submit Laundry** (`submit.html`) | Place new laundry orders |
| **Track Laundry** (`track.html`) | Monitor current laundry status |
| **History** (`history.html`) | View past laundry records |
| **Profile** (`profile.html`) | Manage user account settings |
| **Login/Signup** | User authentication system |
| **Support** (`support.html`) | Help and customer service |
| **Contact** (`contact.html`) | Contact information and feedback |

## 🛠️ Tech Stack

### Frontend
- **HTML5, CSS3, JavaScript**: Core web technologies
- **Styling**: Custom CSS with Poppins font family
- **Icons**: Boxicons icon library
- **Design**: Responsive web design
- **PWA**: Progressive Web App with service worker

### Backend (NEW!)
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **JWT**: Authentication & authorization
- **bcryptjs**: Password hashing
- **JSON Storage**: File-based data storage (easily upgradable to MongoDB/PostgreSQL)

## 📁 Project Structure

```text
laundry-buddy/
├── index.html              # Landing page
├── home.html              # Main dashboard
├── login.html             # User login
├── signup.html            # User registration
├── submit.html            # Submit laundry orders
├── track.html             # Track laundry status
├── history.html           # Laundry history
├── profile.html           # User profile
├── support.html           # Support page
├── contact.html           # Contact page
├── style.css              # Main stylesheet
├── home.css               # Home page styles
├── login.css              # Login page styles
├── signup.css             # Signup page styles
├── submit.css             # Submit page styles
├── track.css              # Track page styles
├── history.css            # History page styles
├── profile.css            # Profile page styles
├── support.css            # Support page styles
├── contact.css            # Contact page styles
├── past.css               # Additional styles
└── assets/                # Images and media files
    ├── laundary_buddy.png
    ├── home.png
    ├── login.png
    ├── profile.png
    ├── submit.png
    ├── track.png
    ├── tshirt.png
    ├── headphones.png
    └── scratch.png
```

## 🎯 Target Audience

This application is specifically designed for:

- **College Students** living in dormitories
- **University Campuses** with shared laundry facilities
- **Student Housing** complexes
- Anyone looking for a **digital laundry management solution**

## 🚀 Getting Started

### Prerequisites

#### For Frontend Only:
- Modern web browser (Chrome, Firefox, Safari, Edge)

#### For Full Stack (Frontend + Backend):
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Installation & Setup

#### Option 1: Frontend Only (Simple Setup)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/laundry-buddy.git
   cd laundry-buddy
   ```

2. **Open the project**
   - Simply open `index.html` in your web browser
   - Or use a local development server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   
   # Using Live Server extension in VS Code
   ```

3. **Access the application**
   - Navigate to `http://localhost:8000` (if using a server)
   - Or directly open `index.html` in your browser

#### Option 2: Full Stack (Frontend + Backend) ⭐ RECOMMENDED

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/laundry-buddy.git
   cd laundry-buddy
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend will run on `http://localhost:3000`

3. **Setup Frontend**
   - Open a new terminal
   - Go back to project root
   - Open `index.html` in browser or use a server:
   ```bash
   python -m http.server 8080
   ```
   Frontend will run on `http://localhost:8080`

4. **Test Integration**
   - Open `backend-integration-test.html` in browser
   - Click "Check Backend Connection" to verify setup
   - Try the test buttons to ensure everything works

5. **Update HTML Files (Important!)**
   Add these scripts to ALL HTML files before other scripts:
   ```html
   <script src="assests/api-config.js"></script>
   <script src="assests/order-api.js"></script>
   ```

For detailed backend documentation, see [backend/README.md](backend/README.md)

## 💻 Usage

1. **Getting Started**: Visit the landing page (`index.html`)
2. **Sign Up**: Create a new account with your student ID
3. **Login**: Access your dashboard
4. **Submit Laundry**: Place new laundry orders
5. **Track Progress**: Monitor your laundry in real-time
6. **View History**: Check past orders and patterns

## 🎨 Design Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean and intuitive interface
- **Consistent Branding**: Cohesive color scheme and typography
- **Accessibility**: User-friendly navigation and clear visual hierarchy
- **Icon Integration**: Boxicons for consistent iconography

## 🔮 Future Enhancements

- [ ] Backend integration with database
- [ ] Real-time WebSocket notifications
- [ ] Mobile app development
- [ ] Payment gateway integration
- [ ] SMS/Email notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Contribution Guidelines

- Follow consistent coding style
- Add comments for complex functionality
- Test your changes across different browsers
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/your-username)

## 🙏 Acknowledgments

- **Boxicons** for the beautiful icon library
- **Google Fonts** for the Poppins font family
- **College Community** for inspiration and feedback
- **Open Source Contributors** who make projects like this possible

## 📞 Support

If you encounter any issues or have questions:

- **Email**: [support@laundrybuddy.com](mailto:support@laundrybuddy.com)
- **GitHub Issues**: [Create an issue](https://github.com/your-username/laundry-buddy/issues)
- **Documentation**: Check our [Wiki](https://github.com/your-username/laundry-buddy/wiki)

---

---

## Made with ❤️ for students, by students

[🌟 Star this repo](https://github.com/your-username/laundry-buddy) • [🍴 Fork it](https://github.com/your-username/laundry-buddy/fork) • [📝 Report Bug](https://github.com/your-username/laundry-buddy/issues)
