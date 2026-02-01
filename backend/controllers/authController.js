const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  generateAccessToken,
  generateRefreshToken,
  checkAccountLock,
  logSecurityEvent
} = require('../middleware/auth-security');

// Request OTP for Signup
exports.requestSignupOTP = async (req, res) => {
  try {
    const { name, email, password, phone, address, hostelRoom } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    // Store signup data temporarily in user model (not ideal for prod, but simple for now)
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    // Save OTP and signup data in a temp user (or you can use a separate collection for production)
    let tempUser = await User.findOne({ email: email.toLowerCase(), signupOTP: { $exists: true } });
    if (!tempUser) {
      const hashedPassword = await bcrypt.hash(password, 10);
      tempUser = new User({ name, email: email.toLowerCase(), password: hashedPassword, phone, address, hostelRoom });
    } else {
      tempUser.name = name;
      tempUser.password = await bcrypt.hash(password, 10);
      tempUser.phone = phone;
      tempUser.address = address;
    }
    tempUser.signupOTP = otp;
    tempUser.signupOTPExpiry = expiry;
    await tempUser.save();
    // Send OTP using Resend
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: tempUser.email,
        subject: '🧺 Welcome to Laundry Buddy! Your Magical OTP Awaits ✨',
        text: `Hello from Laundry Buddy!\n\n🎉 Thank you for joining our laundry family.\n\nHere is your one-time password (OTP):\n\n🔑  ${otp}  🔑\n\nThis code is valid for 10 minutes.\n\nIf you didn’t request this, please ignore this email.\n\nStay fresh,\nThe Laundry Buddy Team 🧺`,
        html: `<div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7fa; padding: 24px; border-radius: 12px; color: #222; max-width: 420px; margin: auto;">
          <h2 style="color: #4e54c8;">🧺 Welcome to Laundry Buddy!</h2>
          <p style="font-size: 1.1em;">Thank you for joining our laundry family.</p>
          <div style="margin: 24px 0; padding: 18px; background: #e0e7ff; border-radius: 8px; text-align: center;">
            <span style="font-size: 1.3em; letter-spacing: 2px; color: #222;">Your OTP:</span><br>
            <span style="font-size: 2.2em; font-weight: bold; color: #4e54c8;">${otp}</span>
            <div style="margin-top: 8px; color: #666; font-size: 0.95em;">(Valid for 10 minutes)</div>
          </div>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p style="margin-top: 32px; color: #4e54c8; font-weight: 500;">Stay fresh,<br>The Laundry Buddy Team</p>
        </div>`
      });
      res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing signup OTP', error: error.message });
  }
};

// Verify OTP and complete Signup
exports.verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase(), signupOTP: { $exists: true } });
    if (!user || !user.signupOTP || !user.signupOTPExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or user not found' });
    }
    // Use constant-time comparison for OTP
    const userOtp = Buffer.from(user.signupOTP);
    const inputOtp = Buffer.from(otp);
    if (userOtp.length !== inputOtp.length || !crypto.timingSafeEqual(userOtp, inputOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (user.signupOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    // Hash password and finalize user
    // Password already hashed in requestSignupOTP, but if it was re-supplied we would hash it.
    // In this flow, we already stored the hashed password in tempUser.
    // However, if we didn't update password logic above, we would hash here.
    // Since we now hash BEFORE storing in tempUser, we don't need to hash again here IF we trust the stored hash.
    // BUT 'user' is the mongoose document.
    // WAITING: The original code saved plaintext. Now we save hashed.
    // So user.password is ALREADY hashed. We should NOT hash it again.
    // Removing the re-hashing line.
    // user.password = await require('bcryptjs').hash(user.password, 10); // REMOVED
    user.signupOTP = null;
    user.signupOTPExpiry = null;
    await user.save();
    // Create session
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      hostelRoom: user.hostelRoom,
      isAdmin: user.isAdmin || false
    };
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error saving session' });
      }
      res.status(201).json({ success: true, message: 'User registered successfully', user: req.session.user });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying signup OTP', error: error.message });
  }
};
// Request OTP for Login
exports.requestLoginOTP = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    user.loginOTP = otp;
    user.loginOTPExpiry = expiry;
    await user.save();
    // Send OTP using Resend
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: user.email,
        subject: '🧺 Laundry Buddy Login – Your Secure OTP Inside!',
        text: `Hello from Laundry Buddy!\n\n🔐 Login time!\n\nHere is your one-time password (OTP):\n\n🔑  ${otp}  🔑\n\nThis code is valid for 10 minutes.\n\nIf you didn’t request this, please ignore this email.\n\nStay fresh,\nThe Laundry Buddy Team 🧺`,
        html: `<div style=\"font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7fa; padding: 24px; border-radius: 12px; color: #222; max-width: 420px; margin: auto;\">
          <h2 style=\"color: #4e54c8;\">🧺 Laundry Buddy Login</h2>
          <p style=\"font-size: 1.1em;\">Use the OTP below to securely log in to your account.</p>
          <div style=\"margin: 24px 0; padding: 18px; background: #e0e7ff; border-radius: 8px; text-align: center;\">
            <span style=\"font-size: 1.3em; letter-spacing: 2px; color: #222;\">Your OTP:</span><br>
            <span style=\"font-size: 2.2em; font-weight: bold; color: #4e54c8;\">${otp}</span>
            <div style=\"margin-top: 8px; color: #666; font-size: 0.95em;\">(Valid for 10 minutes)</div>
          </div>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p style=\"margin-top: 32px; color: #4e54c8; font-weight: 500;\">Stay fresh,<br>The Laundry Buddy Team</p>
        </div>`
      });
      res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing login OTP', error: error.message });
  }
};

// Verify OTP and Login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.loginOTP || !user.loginOTPExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or user not found' });
    }
    // Use constant-time comparison for OTP
    const userOtp = Buffer.from(user.loginOTP);
    const inputOtp = Buffer.from(otp);
    if (userOtp.length !== inputOtp.length || !crypto.timingSafeEqual(userOtp, inputOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (user.loginOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    // Clear OTP fields
    user.loginOTP = null;
    user.loginOTPExpiry = null;
    await user.save();
    // Create session
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      profilePhoto: user.profilePhoto,
      isAdmin: user.isAdmin || false
    };
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error saving session' });
      }
      res.json({ success: true, message: 'Login successful', user: req.session.user });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
  }
};
// Verify OTP and Reset Password
exports.verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetOTP || !user.resetOTPExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or user not found' });
    }
    // Use constant-time comparison for OTP
    const userOtp = Buffer.from(user.resetOTP);
    const inputOtp = Buffer.from(otp);
    if (userOtp.length !== inputOtp.length || !crypto.timingSafeEqual(userOtp, inputOtp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (user.resetOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
};
// Nodemailer removed in favor of Resend
// Request Password Reset OTP
exports.requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    // console.log('OTP request received for email:', email);
    if (!email) {
      // console.log('No email provided');
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // console.log('User not found for email');
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.resetOTP = otp;
    user.resetOTPExpiry = expiry;
    await user.save();
    // console.log('OTP generated and saved for user');

    // Send OTP using Resend API
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const data = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: user.email,
        subject: '🧺 Laundry Buddy Password Reset – OTP Inside!',
        text: `Hello from Laundry Buddy!\n\n🔄 Password reset requested!\n\nHere is your one-time password (OTP):\n\n🔑  ${otp}  🔑\n\nThis code is valid for 10 minutes.\n\nIf you didn’t request this, please ignore this email.\n\nStay fresh,\nThe Laundry Buddy Team 🧺`,
        html: `<div style=\"font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7fa; padding: 24px; border-radius: 12px; color: #222; max-width: 420px; margin: auto;\">
          <h2 style=\"color: #4e54c8;\">🧺 Password Reset Request</h2>
          <p style=\"font-size: 1.1em;\">Use the OTP below to reset your Laundry Buddy password.</p>
          <div style=\"margin: 24px 0; padding: 18px; background: #e0e7ff; border-radius: 8px; text-align: center;\">
            <span style=\"font-size: 1.3em; letter-spacing: 2px; color: #222;\">Your OTP:</span><br>
            <span style=\"font-size: 2.2em; font-weight: bold; color: #4e54c8;\">${otp}</span>
            <div style=\"margin-top: 8px; color: #666; font-size: 0.95em;\">(Valid for 10 minutes)</div>
          </div>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p style=\"margin-top: 32px; color: #4e54c8; font-weight: 500;\">Stay fresh,<br>The Laundry Buddy Team</p>
        </div>`
      });
      console.log('Resend response:', data);
      res.json({ success: true, message: 'OTP sent to your registered email address' });
    } catch (error) {
      console.error('Resend error:', error);
      res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
    }
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
  }
};
// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address, hostelRoom } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const created = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address,
      hostelRoom,
    });

    // Create session
    req.session.userId = created._id.toString();
    req.session.user = {
      id: created._id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      address: created.address,
      hostelRoom: created.hostelRoom,
      isAdmin: created.isAdmin || false
    };

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error saving session'
        });
      }

      // console.log('✅ Signup session saved');
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: req.session.user
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// Login User
exports.login = async (req, res) => {
  // console.log('🔑 Login attempt:', req.body.email);
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Log failed attempt
      if (global.securityLogger) {
        await global.securityLogger(null, 'LOGIN_FAILED', {
          email,
          ipAddress,
          reason: 'User not found'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    const lockCheck = await checkAccountLock(user);
    if (lockCheck.locked) {
      await logSecurityEvent(user._id, 'LOGIN_LOCKED', { ipAddress, userAgent });
      return res.status(423).json({
        success: false,
        message: lockCheck.message,
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed attempts
      await user.incrementLoginAttempts();
      await logSecurityEvent(user._id, 'LOGIN_FAILED', {
        ipAddress,
        userAgent,
        failedAttempts: user.failedLoginAttempts
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login info
    user.lastLoginAt = new Date();
    user.lastLoginIP = ipAddress;
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await user.addRefreshToken(refreshToken);

    // Log successful login
    await logSecurityEvent(user._id, 'LOGIN_SUCCESS', { ipAddress, userAgent });

    // Create session
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      hostelRoom: user.hostelRoom,
      profilePhoto: user.profilePhoto,
      isAdmin: user.isAdmin || false
    };
    req.session.lastActivity = Date.now();

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error saving session'
        });
      }

      // console.log('✅ Session saved successfully');

      res.json({
        success: true,
        message: 'Login successful',
        user: req.session.user,
        token: accessToken,
        refreshToken: refreshToken
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// Logout User
exports.logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error logging out'
        });
      }
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        hostelRoom: user.hostelRoom,
        profilePhoto: user.profilePhoto,
        isAdmin: user.isAdmin || false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, hostelRoom, profilePhoto } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (hostelRoom !== undefined) updateFields.hostelRoom = hostelRoom;
    if (profilePhoto !== undefined) {
      // Limit profile photo size (approx 3MB for Base64)
      if (profilePhoto.length > 3 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Profile photo is too large'
        });
      }

      // Check if it's a base64 string
      if (profilePhoto.startsWith('data:image')) {
        // Check if Cloudinary is configured
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          const uploadService = require('../services/uploadService');
          try {
            const secureUrl = await uploadService.uploadBase64(profilePhoto);
            updateFields.profilePhoto = secureUrl;
          } catch (uploadErr) {
            console.error('Cloudinary upload failed:', uploadErr);
            if (process.env.NODE_ENV === 'production') {
              return res.status(500).json({
                success: false,
                message: 'Failed to upload photo to cloud storage. Please try again.'
              });
            }
            // Only fallback to local in development
            saveLocally(profilePhoto, req, updateFields);
          }
        } else {
          // Local storage fallback (Development Only ideally)
          if (process.env.NODE_ENV === 'production') {
            // If keys are missing in production, don't silently save locally
            console.warn('Cloudinary keys missing in production!');
            return res.status(500).json({ success: false, message: 'Server storage configuration error' });
          }
          saveLocally(profilePhoto, req, updateFields);
        }

        function saveLocally(dataStr, req, fields) {
          const fs = require('fs');
          const path = require('path');
          const matches = dataStr.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1];
            const data = matches[2];
            const buffer = Buffer.from(data, 'base64');
            const filename = `profile-${req.user.id}-${Date.now()}.${ext}`;
            const filepath = path.join(__dirname, '../uploads/profiles', filename);
            const dir = path.dirname(filepath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filepath, buffer);
            fields.profilePhoto = `/uploads/profiles/${filename}`;
          }
        }
      } else {
        // Assume it's already a URL or handle accordingly
        // If it sends a URL (e.g. external), we allow it?
        // For now, if it's not data URI and not empty, we assume it's valid if it is a string.
        // But to be safe, maybe we only allow if it starts with /uploads/ or http
        if (profilePhoto.startsWith('/uploads/') || profilePhoto.startsWith('http')) {
          updateFields.profilePhoto = profilePhoto;
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        hostelRoom: updatedUser.hostelRoom,
        profilePhoto: updatedUser.profilePhoto
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// Upload Profile Photo (Multipart)
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }

    const userId = req.user.id;
    let profilePhotoUrl = '';

    // Check if Cloudinary is configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const cloudinary = require('../config/cloudinary');
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'laundry-buddy/profiles',
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'limit' },
            { quality: 'auto' }
          ]
        });
        profilePhotoUrl = result.secure_url;

        // Optionally delete the local file after uploading to Cloudinary
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr);
        // Fallback to local file if upload failed
        profilePhotoUrl = `/uploads/profiles/${req.file.filename}`;
      }
    } else {
      // Use local storage path
      profilePhotoUrl = `/uploads/profiles/${req.file.filename}`;
    }

    // Update user in database
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: profilePhotoUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      user: {
        id: user._id,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile photo',
      error: error.message
    });
  }
};
