const Joi = require('joi');
const registerSchema = require('../validations/userValidation'); 
const userModel = require('../models/user-model');
const bcrypt = require('bcrypt');
const {generateToken}= require('../utils/generateToken');

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
};

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

        return res.status(400).render('index', {
        errorMessages,
        formData: {
            fullname: req.body.fullname,
            email: req.body.email
        }
    });
    }
    let{fullname,email,password} = req.body;


    const existingUser = await userModel.findOne({email: email});

    if (existingUser) {
    return res.status(400).render('index', {
        errorMessages: {
            email: 'Email already exists'
        },
        formData: {
            fullname,
            email
        }
    });
}

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        fullname,
        email,
        password: hash,
    });

    const token = generateToken(user);

    res.cookie('token', token , cookieOptions);

    res.redirect('/shop');
    //encrypting the password before storing it in the database
    // bcrypt.genSalt(10,(err, salt) => {
    //     bcrypt.hash(password, salt, async (err, hash) => {
    //         let user =  await userModel.create({
    //             fullname,
    //             email,
    //             password: hash,
    //         })
    //         let token = generateToken(user);
    //         res.cookie('token',token);
            
    //         res.send("User Registered successfully");

    //     })
    // } );

}



module.exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            req.flash('error', 'No account found with this email');
            return res.redirect('/');
        }

        const result = await bcrypt.compare(password, user.password);

        if (!result) {
            req.flash('error', 'Incorrect password');
            return res.redirect('/');
        }

        const token = generateToken(user);

        res.cookie('token', token, cookieOptions);

        return res.redirect('/shop');

    } catch (error) {
        console.error('Login error:', error);

        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};

module.exports.logout = function(req, res) {
    res.clearCookie('token');
    res.redirect('/');
};