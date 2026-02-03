const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  };
};

// Common validation rules
const validationRules = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[@$!%*?&#]/).withMessage('Password must contain at least one special character (@$!%*?&#)'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits')
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],

  createOrder: [
    body('items')
      .isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.type')
      .optional()
      .trim(),
    body('items.*.name')
      .optional()
      .trim(),
    body('items.*.quantity')
      .optional()
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.count')
      .optional()
      .isInt({ min: 1 }).withMessage('Count must be at least 1'),
    body('serviceType')
      .optional()
      .trim(),
    body('pickupDate')
      .optional()
      .isISO8601().withMessage('Invalid date format'),
    body('deliveryDate')
      .optional()
      .isISO8601().withMessage('Invalid date format'),
    body('deliveryAddress')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Address too long'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Address too long')
  ],

  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Address too long')
  ],
  createTicket: [
    body('type').notEmpty().withMessage('Type is required'),
    body('details').notEmpty().withMessage('Details are required').isLength({ min: 10 }).withMessage('Details must be at least 10 characters'),
    body('orderNumber').optional().trim(),
    body('orderId').optional().isMongoId().withMessage('Invalid Order ID')
  ],
  contact: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 5 }).withMessage('Message must be at least 5 characters')
  ]
};

module.exports = { validate, validationRules };
