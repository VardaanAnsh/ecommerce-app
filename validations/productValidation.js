const Joi = require('joi');

const productSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),

    price: Joi.number().positive().required(),

    discount: Joi.number().min(0).default(0),

    bgcolor: Joi.string().trim().required(),

    panelcolor: Joi.string().trim().required(),

    textcolor: Joi.string().trim().required()
});

module.exports = productSchema;