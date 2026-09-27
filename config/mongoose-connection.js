const mongoose = require('mongoose');
const dbgr = require('debug')('development:mongoose');

const mongoURI =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scatch';

mongoose
    .connect(mongoURI)
    .then(function () {
        dbgr('Connected to MongoDB');
        console.log('Connected to MongoDB');
    })
    .catch(function (err) {
        console.log('Error connecting to MongoDB:', err);
    });

module.exports = mongoose.connection;