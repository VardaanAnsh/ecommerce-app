// const mongoose = require('mongoose');
// const dbgr = require('debug')("development:mongoose");

// mongoose
// .connect('mongodb://127.0.0.1:27017/sketchers')
// .then(function(){
//     dbgr('Connected to MongoDB');
// })
// .catch(function (err)   {
//         console.log(err);
        
// });

// module.exports = mongoose.connection;

const mongoose = require('mongoose');
const config = require('config');
const dbgr = require('debug')('development:mongoose');

dbgr('Mongoose connection file loaded');

mongoose
.connect(`${config.get('MONGODB_URI')}/scatch`)

.then(function(){
    dbgr('Connected to MongoDB');
})
.catch(function (err)   {
    dbgr('Error connecting to MongoDB:', err);
    console.log(err);
});

module.exports = mongoose.connection;

