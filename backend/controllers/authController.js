const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Resend } = require('resend');
const {
  generateAccessToken,
  generateRefreshToken,
  checkAccountLock,
  logSecurityEvent
} = require('../middleware/auth-security');

// Initialize Resend client once
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Build a branded OTP email HTML
 */
function buildOTPEmailHTML(title, subtitle, otp) {
  return `<div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7fa; padding: 24px; border-radius: 12px; color: #222; max-width: 420px; margin: auto;">
    <h2 style="color: #4e54c8;">🧺 ${title}</h2>
    <p style="font-size: 1.1em;">${subtitle}</p>
    <div style="margin: 24px 0; padding: 18px; background: #e0e7ff; border-radius: 8px; text-align: center;">
      <span style="font-size: 1.3em; letter-spacing: 2px; color: #222;">Your OTP:</span><br>
      <span style="font-size: 2.2em; font-weight: bold; color: #4e54c8;">${otp}</span>
      <div style="margin-top: 8px; color: #666; font-size: 0.95em;">(Valid for 10 minutes)</div>
    </div>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p style="margin-top: 32px; color: #4e54c8; font-weight: 500;">Stay fresh,<br>The Laundry Buddy Team</p>
  </div>`;
}

// ─── OTP-Based Signup (Primary Signup Flow) ───────────────────────────

/**
 * Request OTP for Signup
 * Does NOT create a real user — stores pending signup data temporarily
 * with a TTL so unverified records auto-cleanup
 */
exports.requestSignupOTP = async (req, res) => {
  try {
    const { name, email, password, phone, address, hostelRoom } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    // Check if a verified user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 12);
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Upsert a pending (unverified) user record
    // If there's already an unverified record for this email, update it
    await User.findOneAndUpdate(
      { email: email.toLowerCase(), isEmailVerified: false },
      {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || '',
        address: address || '',
        hostelRoom: hostelRoom || '',
        signupOTP: hashedOTP,
        signupOTPExpiry: expiry,
        isEmailVerified: false
      },
      { upsert: true, new: true }
    );

    // Send OTP email
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: email.toLowerCase(),
        subject: '🧺 Welcome to Laundry Buddy! Your Magical OTP Awaits ✨',
        text: `Hello from Laundry Buddy!\n\n🎉 Thank you for joining our laundry family.\n\nHere is your one-time password (OTP):\n\n🔑  ${otp}  🔑\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nStay fresh,\nThe Laundry Buddy Team 🧺`,
        html: buildOTPEmailHTML(
          'Welcome to Laundry Buddy!',
          'Thank you for joining our laundry family.',
          otp
        )
      });
      res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing signup OTP', error: error.message });
  }
};

/**
 * Verify OTP and complete Signup
 * Only now does the user become a verified, real account
 */
exports.verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: false });
    if (!user || !user.signupOTP || !user.signupOTPExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or user not found' });
    }

    // Check expiry FIRST (cheaper than bcrypt)
    if (user.signupOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Validate OTP with bcrypt
    const isValidOTP = await bcrypt.compare(otp, user.signupOTP);
    if (!isValidOTP) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Mark user as verified and clear OTP fields
    user.isEmailVerified = true;
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

// ─── OTP-Based Login ─────────────────────────────────────────────────

/**
 * Request OTP for Login
 */
exports.requestLoginOTP = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOTP = await bcrypt.hash(otp, 10);
    user.loginOTPExpiry = expiry;
    await user.save();

    // Send OTP
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: user.email,
        subject: '🧺 Laundry Buddy Login – Your Secure OTP Inside!',
        text: `Hello from Laundry Buddy!\n\n🔐 Login time!\n\nHere is your one-time password (OTP):\n\n🔑  ${otp}  🔑\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nStay fresh,\nThe Laundry Buddy Team 🧺`,
        html: buildOTPEmailHTML(
          'Laundry Buddy Login',
          'Use the OTP below to securely log in to your account.',
          otp
        )
      });
      res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error sending OTP', error: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing login OTP', error: error.message });
  }
};

/**
 * Verify OTP and Login
 */
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    if (!user || !user.loginOTP || !user.loginOTPExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or user not found' });
    }

    // Check expiry FIRST
    if (user.loginOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const isValidOTP = await bcrypt.compare(otp, user.loginOTP);
    if (!isValidOTP) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
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

// ─── Password Reset ──────────────────────────────────────────────────

/**
 * Request Password Reset OTP
 * Uses generic response to prevent user enumeration
 */
exports.requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Generic success message regardless of whether user exists (prevents enumeration)
    const genericSuccess = { success: true, message: 'If this email is registered, an OTP will be sent.' };

    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    if (!user) {
      // Return success even if not found → prevents user enumeration
      return res.json(genericSuccess);
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOTP = await bcrypt.hash(otp, 10);
    user.resetOTPExpiry = expiry;
    await user.save();

    // Send OTP email
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: user.email,
        subject: '🧺 Laundry Buddy Password Reset – OTP Inside!',
        text: `Hello from Laundry Buddy!\n\n🔄 Password reset requested!\n\nHere is your one-time password (OTP):\n\n🔑  ${otp}  🔑\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nStay fresh,\nThe Laundry Buddy Team 🧺`,
        html: buildOTPEmailHTML(
          'Password Reset Request',
          'Use the OTP below to reset your Laundry Buddy password.',
          otp
        )
      });
    } catch (emailError) {
      console.error('Resend error:', emailError);
      // Still return generic message
    }

    res.json(genericSuccess);
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ success: false, message: 'Error processing request', error: error.message });
  }
};

/**
 * Verify OTP and Reset Password
 */
exports.verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetOTP || !user.resetOTPExpiry) {
      return res.status(400).json({ success: false, message: 'OTP not requested or invalid' });
    }

    // Check expiry FIRST
    if (user.resetOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const isValidOTP = await bcrypt.compare(otp, user.resetOTP);
    if (!isValidOTP) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Hash new password with higher cost factor
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    await user.save();

    await logSecurityEvent(user._id, 'PASSWORD_RESET_SUCCESS', { ipAddress: req.ip });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
};

// ─── Direct Login (no OTP) ───────────────────────────────────────────

/**
 * Login User
 * Direct login with email + password (no OTP)
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Find verified user
    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    if (!user) {
      await logSecurityEvent(null, 'LOGIN_FAILED', { email, ipAddress, reason: 'User not found' });
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

    // Cancel any pending deletion on login
    if (user.deletionRequested) {
      user.deletionRequested = false;
      user.deletionRequestedAt = null;
      user.deletionReason = null;
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

// ─── Logout ──────────────────────────────────────────────────────────

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

// ─── Session Check ───────────────────────────────────────────────────

exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await User.findById(req.session.userId).select('-password -refreshTokens -signupOTP -loginOTP -resetOTP');
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

// ─── Profile Management ──────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, hostelRoom, profilePhoto } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (hostelRoom !== undefined) updateFields.hostelRoom = hostelRoom;

    if (profilePhoto !== undefined) {
      // Limit profile photo size (approx 3MB after Base64 inflation)
      if (typeof profilePhoto === 'string' && Buffer.byteLength(profilePhoto, 'utf8') > 4 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: 'Profile photo is too large (max 3MB)'
        });
      }

      // Check if it's a base64 string
      if (typeof profilePhoto === 'string' && profilePhoto.startsWith('data:image')) {
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
            // Local fallback for development only
            const localUrl = savePhotoLocally(profilePhoto, req.user.id);
            if (localUrl) updateFields.profilePhoto = localUrl;
          }
        } else {
          if (process.env.NODE_ENV === 'production') {
            console.warn('Cloudinary keys missing in production!');
            return res.status(500).json({ success: false, message: 'Server storage configuration error' });
          }
          const localUrl = savePhotoLocally(profilePhoto, req.user.id);
          if (localUrl) updateFields.profilePhoto = localUrl;
        }
      } else if (typeof profilePhoto === 'string') {
        // Only allow known-safe URL patterns
        if (profilePhoto.startsWith('/uploads/') || profilePhoto.startsWith('https://')) {
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

/**
 * Helper: Save base64 photo to local filesystem (development only)
 */
function savePhotoLocally(dataStr, userId) {
  try {
    const fs = require('fs');
    const path = require('path');
    const matches = dataStr.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const ext = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, 'base64');
      const filename = `profile-${userId}-${Date.now()}.${ext}`;
      const filepath = path.join(__dirname, '../uploads/profiles', filename);
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filepath, buffer);
      return `/uploads/profiles/${filename}`;
    }
  } catch (err) {
    console.error('Local photo save failed:', err);
  }
  return null;
}

// ─── Change Password ─────────────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
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

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await logSecurityEvent(user._id, 'PASSWORD_CHANGED', { ipAddress: req.ip });

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

// ─── Upload Profile Photo (Multipart) ────────────────────────────────

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

        // Delete the local file after uploading to Cloudinary
        const fs = require('fs');
        try { fs.unlinkSync(req.file.path); } catch { /* ignore cleanup errors */ }
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr);
        profilePhotoUrl = `/uploads/profiles/${req.file.filename}`;
      }
    } else {
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
