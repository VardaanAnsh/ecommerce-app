const jwt = require('jsonwebtoken');

const generateToken = function (user) {
    return jwt.sign(
        {
            email: user.email,
            userid: user._id
        },
        process.env.JWT_KEY,
        {
            expiresIn: '15m'
        }
    );
};

module.exports.generateToken = generateToken;