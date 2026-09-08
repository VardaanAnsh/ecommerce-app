const mongoose = require('mongoose');



//Orders store product snapshots because product information 
//such as price can change after the order is placed
//so we are storing name and price again
const orderSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },

        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'product',
                    required: true
                },

                name: {
                    type: String,
                    required: true
                },

                price: {
                    type: Number,
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },

                discount: {
                    type: Number,
                    default: 0
                }
            }
        ],

        shippingAddress: {
                label: {
                    type: String,
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
                }
        },
        
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            default: 'pending'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('order', orderSchema);