const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const isLoggedIn = require("../middlewares/isLoggedIn");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");
const paymentModel = require("../models/payment-model");

const razorpay = require("../config/razorpay");

router.post("/create-order", isLoggedIn, async function (req, res) {
    try {
        const { addressId } = req.body;
        const user = await userModel
            .findById(req.user._id)
            .populate({
                path: "cart.product",
                select: "-image"
            });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({
                message: "Your cart is empty"
            });
        }

        if (!addressId) {
            return res.status(400).json({
                message: "Please select a delivery address"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({
                message: "Invalid address"
            });
        }

        const selectedAddress = user.addresses.id(addressId);

        if (!selectedAddress) {
            return res.status(400).json({
                message: "Selected address not found"
            });
        }

        let subtotal = 0;
        let discount = 0;

        for (const item of user.cart) {
            if (!item.product) {
                return res.status(400).json({
                    message: "One of the products in your cart is no longer available"
                });
            }

            subtotal += item.product.price * item.quantity;
            discount += item.product.discount * item.quantity;
        }

        // ₹20 for each different product in the cart
        const platformFee = user.cart.length * 20;

        const totalAmount = subtotal - discount + platformFee;

        const orderItems = user.cart.map((item) => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            discount: item.product.discount
        }));

        const order = await orderModel.create({
            user: user._id,

            items: orderItems,

            shippingAddress: {
                label: selectedAddress.label,
                name: selectedAddress.name,
                phone: selectedAddress.phone,
                addressLine: selectedAddress.addressLine,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode
            },

            totalAmount,

            status: "pending"
        });

        const payment = await paymentModel.create({
            order: order._id,
            user: user._id,
            amount: totalAmount,
            currency: "INR",
            provider: "razorpay",
            status: "created"
        });
        try {
            const razorpayAmount = Math.round(totalAmount * 100);

            const razorpayOrder = await razorpay.orders.create({
                amount: razorpayAmount,
                currency: "INR",
                receipt: order._id.toString(),
                partial_payment: false
            });

            payment.providerOrderId = razorpayOrder.id;

            await payment.save();

            return res.json({
                success: true,
                orderId: order._id,
                paymentId: payment._id,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            });

        } catch (error) {

            console.error("Razorpay order creation error:", error);

            payment.status = "failed";
            payment.failureReason = "Unable to create Razorpay order";

            await payment.save();

            return res.status(500).json({
                message: "Unable to start payment. Please try again."
            });
        }

            } catch (error) {
                console.error("Payment create order error:", error);

                return res.status(500).json({
                    message: "Something went wrong. Please try again."
                });
            }
});

module.exports = router;