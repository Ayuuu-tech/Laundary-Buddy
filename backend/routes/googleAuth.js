/**
 * ============================================================================
 * LAUNDRY BUDDY - Smart Laundry Management System
 * ============================================================================
 *
 * @project   Laundry Buddy
 * @author    Ayush
 * @status    Production Ready
 * @description Part of the Laundry Buddy Evaluation Project.
 *              Handles core application logic, API routing, and database integrations.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { getUserModel } = require('../models/User');
const { getRefreshTokenModel } = require('../models/RefreshToken');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth-security');

// Helper: add refresh token
async function addRefreshToken(userId, token) {
  const RefreshToken = getRefreshTokenModel();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, token, expiresAt });

  const tokens = await RefreshToken.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });
  if (tokens.length > 5) {
    const toDelete = tokens.slice(5).map(t => t.id);
    await RefreshToken.destroy({ where: { id: toDelete } });
  }
}

// Google OAuth - Verify token and login/register user
router.post('/google', async (req, res) => {
  try {
    const User = getUserModel();
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
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
      return res.status(400).json({ success: false, message: 'Email not provided by Google' });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (user) {
      // User exists - login
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await addRefreshToken(user.id, refreshToken);

      req.session.userId = user.id.toString();
      req.session.user = {
        id: user.id,
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
        return res.json({
          success: true,
          message: 'Login successful!',
          isNewUser: false,
          user: req.session.user,
          token: accessToken,
          refreshToken: refreshToken
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

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    await addRefreshToken(newUser.id, refreshToken);

    req.session.userId = newUser.id.toString();
    req.session.user = {
      id: newUser.id,
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
        user: req.session.user,
        token: accessToken,
        refreshToken: refreshToken
      });
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Error with Google authentication', error: error.message });
  }
});

module.exports = router;
