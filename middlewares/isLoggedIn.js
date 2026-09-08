const jwt = require('jsonwebtoken');
const userModel = require('../models/user-model');

module.exports = async function (req, res, next) {
    if (!req.cookies.token) {
        req.flash('error', 'You need to login first');
        return res.redirect('/');
    }

    try {
        const decoded = jwt.verify(
            req.cookies.token,
            process.env.JWT_KEY
        );

        // console.log('Decoded JWT:', decoded);
        //we can do findById here in place of findOne by email as in jwt
        //we sent email:email and id : user._id
        //as _id is MongoDB's unique identifier, so it's the better lookup key.

        const user = await userModel
            .findById(decoded.userid)
            .select('-password');

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        req.user = user;

        next();

    } catch (err) {
        console.error('Authentication error:', err);

        req.flash('error', 'Invalid or expired token');
        return res.redirect('/');
    }
};