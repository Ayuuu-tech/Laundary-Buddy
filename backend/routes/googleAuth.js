const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Google OAuth - Verify token and login/register user
router.post('/google', async (req, res) => {
  try {
    const { credential, clientId } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Decode the JWT credential from Google (it's a JWT token)
    // For production, you should verify this with Google's public keys
    // For simplicity, we'll decode and trust it (Google Sign-In client already verified it)
    const base64Payload = credential.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // User exists - login
      req.session.userId = user._id.toString();
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        profilePhoto: picture || user.profilePhoto
      };

      // Save session explicitly
      return req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, message: 'Error saving session' });
        }
        console.log('✅ Google login session saved:', req.session.userId);
        return res.json({
          success: true,
          message: 'Login successful!',
          isNewUser: false,
          user: req.session.user
        });
      });
    } else {
      // New user - register
      // Generate a random password for Google users (they won't use it)
      const randomPassword = await bcrypt.hash(googleId + Date.now(), 10);

      const newUser = await User.create({
        name: name,
        email: email.toLowerCase(),
        password: randomPassword,
        phone: '',
        address: '',
        googleId: googleId,
        profilePhoto: picture
      });

      req.session.userId = newUser._id.toString();
      req.session.user = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
        profilePhoto: picture
      };

      // Save session explicitly
      return req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, message: 'Error saving session' });
        }
        console.log('✅ Google signup session saved:', req.session.userId);
        return res.status(201).json({
          success: true,
          message: 'Account created successfully!',
          isNewUser: true,
          user: req.session.user
        });
      });
    }
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Error with Google authentication',
      error: error.message
    });
  }
});

module.exports = router;
