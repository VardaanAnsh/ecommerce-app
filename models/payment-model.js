const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "order",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },

        provider: {
            type: String,
            default: "razorpay",
            required: true
        },

        providerOrderId: {
            type: String,
            default: null
        },

        providerPaymentId: {
            type: String,
            default: null
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "INR",
            required: true
        },

        status: {
            type: String,
            enum: ["created", "paid", "failed", "refunded"],
            default: "created"
        },

        method: {
            type: String,
            default: null
        },

        failureReason: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("payment", paymentSchema);