const Joi = require('joi');

// Creating validation schema for user registration
const registerSchema = Joi.object({
    fullname: Joi.string().min(3).max(30).required().messages({
        'string.min': 'Full name must be at least 3 characters long',
        'string.max': 'Full name cannot be more than 30 characters long',
    }),

    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address'
    }),
    
    password: Joi.string()
        .min(6)
        .pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()_+={}:;"\'<>?,./-]*$')) // Allow only specific characters
        .pattern(new RegExp('(?=.*[A-Z])')) // At least one uppercase letter
        .pattern(new RegExp('(?=.*[0-9])')) // At least one number
        .pattern(new RegExp('(?=.*[!@#$%^&*()_+={}:;"\'<>?,./-])')) // At least one special character
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one number, and one special character'
        }),
});

module.exports = registerSchema;
