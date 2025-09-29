const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req[property] = value;
    next();
  };
};

const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'recursiveEscape'
      }).trim();
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return value;
  };
  
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  
  next();
};

// Common validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(100),
    preferredLanguage: Joi.string().valid('en', 'hi').default('en')
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  updateUser: Joi.object({
    name: Joi.string().min(2).max(100),
    preferredLanguage: Joi.string().valid('en', 'hi')
  }),
  
  chatMessage: Joi.object({
    text: Joi.string().min(1).max(1000).required(),
    sessionId: Joi.string().required()
  }),
  
  screening: Joi.object({
    answers: Joi.array().items(Joi.number().integer().min(0).max(3)).required(),
    consent: Joi.boolean().default(true)
  }),
  
  booking: Joi.object({
    counsellorId: Joi.string().required(),
    timeSlot: Joi.date().iso().required(),
    contactPreference: Joi.string().valid('EMAIL', 'PHONE', 'IN_APP').required(),
    anonymity: Joi.boolean().default(false),
    notes: Joi.string().max(500).allow('')
  }),
  
  resource: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000),
    language: Joi.string().valid('en', 'hi').default('en'),
    type: Joi.string().valid('VIDEO', 'AUDIO', 'GUIDE').required(),
    embedUrl: Joi.string().uri().when('type', {
      is: 'VIDEO',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  }),
  
  peerPost: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    tags: Joi.array().items(Joi.string().max(50)).max(5).default([]),
    displayAlias: Joi.string().max(50).allow('')
  }),
  
  peerComment: Joi.object({
    content: Joi.string().min(1).max(1000).required()
  }),
  
  report: Joi.object({
    reason: Joi.string().valid(
      'spam',
      'inappropriate',
      'harassment',
      'misinformation',
      'self-harm',
      'other'
    ).required()
  })
};

module.exports = {
  validate,
  sanitizeInput,
  schemas
};