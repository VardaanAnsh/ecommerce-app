const Joi = require('joi');
const registerSchema = require('../validations/userValidation'); 
const userModel = require('../models/user-model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {generateToken}= require('../utils/generateToken');


module.exports.registerUser = async function(req, res)
{
     // Validating the request body using Joi
    const { error } = registerSchema.validate(req.body);

    if (error) {
        // Extract error messages by field name
        const errorMessages = {};
        error.details.forEach((detail) => {
            const field = detail.path[0]; 
            errorMessages[field] = detail.message;
        });

        return res.status(400).render('index', { errorMessages,formData: req.body  });
    }
    let{username,email,password} = req.body;


    let user = await userModel.findOne({email: email});
    if (user) {
        // return res.status(400).json({ message: 'Email already exists' });
        return res.status(400).render('index', { errorMessages: { email: 'Email already exists' }, formData: req.body });
    }
    // 

    //encrypting the password before storing it in the database
    bcrypt.genSalt(10,(err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user =  await userModel.create({
                username,
                email,
                password: hash,
            })
            let token = generateToken(user);
            res.cookie('token',token);
            
            res.send("User Registered successfully");

        })
  } );

}

module.exports.loginUser = async (req, res) => {
    let { email, password } = req.body;
    
    try {
        // Find the user by email
        let user = await userModel.findOne({ email: email });
        
        if (!user) {
            return res.status(400).json({ message: 'Something went wrong: User not found' });
        }
        
        // Check if password matches
        bcrypt.compare(password, user.password, function(err, result) {
            if (err) {
                console.error("Error in bcrypt compare:", err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (result) {
                // Password matches
                let token = generateToken(user);
                res.cookie('token', token);
                res.redirect('/shop');
            } else {
                // Password is incorrect
                res.status(400).json({ message: 'Password is incorrect' });
            }
        });
        
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: 'Something went wrong during login' });
    }
}

module.exports.logout = function(req, res) {
    res.cookie('token', '');
    res.redirect('/');
};