const Joi = require('joi');

const addressSchema = Joi.object({
    label: Joi.string()
        .valid('Home', 'Office', 'Other')
        .required(),

    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required(),

    phone: Joi.string()
        .pattern(/^[6-9]\d{9}$/)
        .required(),

    addressLine: Joi.string()
        .trim()
        .min(5)
        .max(200)
        .required(),

    city: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required(),

    state: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required(),

    pincode: Joi.string()
        .pattern(/^\d{6}$/)
        .required(),

    isDefault: Joi.boolean()
        .default(false)
});

module.exports = addressSchema;