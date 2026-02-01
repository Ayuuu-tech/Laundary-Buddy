const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Google OAuth - Verify token and login/register user
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify ID token with Google's tokeninfo endpoint
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const tokenResp = await fetch(tokenInfoUrl);

    if (!tokenResp.ok) {
      const text = await tokenResp.text().catch(() => '');
      console.error('Failed to validate token with Google:', tokenResp.status, text);
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const payload = await tokenResp.json();

    // Validate audience
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (!expectedClientId) {
      console.error('GOOGLE_CLIENT_ID not set in environment variables');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    if (payload.aud !== expectedClientId) {
      console.error('Google token audience mismatch', { expected: expectedClientId, got: payload.aud });
      return res.status(401).json({ success: false, message: 'Token audience mismatch' });
    }

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
        hostelRoom: user.hostelRoom,
        profilePhoto: picture || user.profilePhoto,
        isAdmin: user.isAdmin || false
      };

      return req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, message: 'Error saving session' });
        }
        // console.log('✅ Google login session saved');
        return res.json({
          success: true,
          message: 'Login successful!',
          isNewUser: false,
          user: req.session.user
        });
      });
    }

    // New user - register
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
      hostelRoom: newUser.hostelRoom,
      profilePhoto: picture,
      isAdmin: newUser.isAdmin || false
    };

    return req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, message: 'Error saving session' });
      }
      console.log('✅ Google signup session saved');
      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        isNewUser: true,
        user: req.session.user
      });
    });
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
