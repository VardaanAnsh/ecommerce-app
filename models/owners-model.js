const mongoose = require('mongoose');



const ownerSchema = mongoose.Schema({
    fullname: { 
        type: String, 
        required: true, 
        minlength: 3, 
        maxlength: 30 
    },
    email : String,
    password : String,


    products:
        {
            type:Array,
            default: []
        },
    
    picture: String,
    gstin: String,


})

module.exports = mongoose.model('owner', ownerSchema);