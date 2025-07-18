import express from 'express';
import { body, validationResult, query } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user: user.displayInfo
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications preference must be boolean'),
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications preference must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const { name, avatar, preferences } = req.body;

    // Update user fields
    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    
    if (preferences) {
      if (preferences.theme !== undefined) {
        user.preferences.theme = preferences.theme;
      }
      if (preferences.notifications) {
        if (preferences.notifications.email !== undefined) {
          user.preferences.notifications.email = preferences.notifications.email;
        }
        if (preferences.notifications.push !== undefined) {
          user.preferences.notifications.push = preferences.notifications.push;
        }
      }
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.displayInfo
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/search
// @desc    Search for users (for collaboration)
// @access  Private
router.get('/search', [
  query('q')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { q: searchQuery } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    // Search users by name or email (case insensitive)
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email avatar isOnline lastSeen')
    .limit(limit);

    res.json({
      users: users.map(user => user.displayInfo)
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Server error while searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/online
// @desc    Get list of online users
// @access  Private
router.get('/online', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Get users who have been active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { isOnline: true },
            { lastSeen: { $gte: fiveMinutesAgo } }
          ]
        }
      ]
    })
    .select('name email avatar isOnline lastSeen')
    .sort({ lastSeen: -1 })
    .limit(limit);

    res.json({
      users: onlineUsers.map(user => user.displayInfo),
      total: onlineUsers.length
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      message: 'Server error while fetching online users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/users/status
// @desc    Update user online status
// @access  Private
router.post('/status', [
  body('isOnline')
    .isBoolean()
    .withMessage('Online status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isOnline } = req.body;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.isOnline = isOnline;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      message: 'Status updated successfully',
      user: user.displayInfo
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      message: 'Server error while updating status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', [
  body('password')
    .optional()
    .isString()
    .withMessage('Password must be a string'),
  body('confirmDelete')
    .equals('DELETE_MY_ACCOUNT')
    .withMessage('Please type DELETE_MY_ACCOUNT to confirm')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { password } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // If user has a password, verify it
    if (user.password && password) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          message: 'Invalid password'
        });
      }
    }

    // Note: In a real application, you might want to:
    // 1. Transfer document ownership to other collaborators
    // 2. Remove user from all collaborations
    // 3. Clean up related data
    // 4. Send confirmation email
    // 5. Log the deletion for audit purposes

    await User.findByIdAndDelete(req.user._id);

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      message: 'Server error while deleting account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
