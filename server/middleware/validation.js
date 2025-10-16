const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: message
      });
    }
    
    next();
  };
};

// User registration validation
const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('client', 'admin')
    .default('client')
    .messages({
      'any.only': 'Role must be either client or admin'
    })
});

// User login validation
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Person creation validation
const personSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  relationship: Joi.string()
    .valid('family', 'friend', 'caregiver', 'doctor', 'therapist', 'other')
    .default('other')
    .messages({
      'any.only': 'Relationship must be one of: family, friend, caregiver, doctor, therapist, other'
    }),
  contactInfo: Joi.object({
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().max(200).optional()
  }).optional(),
  notes: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    }),
  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    })
});

// Notification preferences validation
const notificationPreferencesSchema = Joi.object({
  frequency: Joi.string()
    .valid('hourly', 'daily', 'weekly', 'none')
    .default('daily')
    .messages({
      'any.only': 'Frequency must be one of: hourly, daily, weekly, none'
    }),
  time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('21:00')
    .messages({
      'string.pattern.base': 'Time must be in HH:MM format'
    }),
  deliveryMethod: Joi.string()
    .valid('email', 'in-app', 'both')
    .default('in-app')
    .messages({
      'any.only': 'Delivery method must be one of: email, in-app, both'
    }),
  enabled: Joi.boolean()
    .default(true)
});

// User profile validation
const profileSchema = Joi.object({
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  emergencyContact: Joi.object({
    name: Joi.string().max(100).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    email: Joi.string().email().optional()
  }).optional(),
  medicalInfo: Joi.object({
    conditions: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    medications: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    allergies: Joi.array().items(Joi.string().max(100)).max(20).optional()
  }).optional()
});

// Conversation search validation
const conversationSearchSchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  personId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid person ID format'
    }),
  sentiment: Joi.string()
    .valid('positive', 'negative', 'neutral')
    .optional()
    .messages({
      'any.only': 'Sentiment must be one of: positive, negative, neutral'
    }),
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  skip: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Skip must be at least 0'
    })
});

// Notification creation validation
const notificationSchema = Joi.object({
  type: Joi.string()
    .valid('reminder', 'summary', 'system', 'alert')
    .default('reminder')
    .messages({
      'any.only': 'Type must be one of: reminder, summary, system, alert'
    }),
  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),
  message: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is required'
    }),
  frequency: Joi.string()
    .valid('hourly', 'daily', 'weekly', 'once')
    .default('daily')
    .messages({
      'any.only': 'Frequency must be one of: hourly, daily, weekly, once'
    }),
  scheduledTime: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('21:00')
    .messages({
      'string.pattern.base': 'Scheduled time must be in HH:MM format'
    }),
  deliveryMethod: Joi.string()
    .valid('email', 'in-app', 'push', 'sms')
    .default('in-app')
    .messages({
      'any.only': 'Delivery method must be one of: email, in-app, push, sms'
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    })
});

// Export validation middleware
module.exports = {
  validate,
  registerSchema,
  loginSchema,
  personSchema,
  notificationPreferencesSchema,
  profileSchema,
  conversationSearchSchema,
  notificationSchema
};
