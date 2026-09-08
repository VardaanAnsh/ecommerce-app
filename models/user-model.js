const { types } = require('joi');
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    fullname : String,
    email : String,
    password : String,
    role: {
        type: String,
        enum: ['user', 'owner'],
        default: 'user'
    },
    cart: [
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product"
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }
    ],
    contact: Number,
    picture: String,
    //A PERSON CAN HAVE MULTIPLE ADDRESSESS LIKE HOME , OFFICE ETC ....
    addresses: [
    {
        label: {
            type: String,
            enum: ['Home', 'Office', 'Other'],
            required: true
        },
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        addressLine: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }
    ]
})

module.exports = mongoose.model('user', userSchema);