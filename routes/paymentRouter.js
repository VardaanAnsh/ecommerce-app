const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");

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



router.post("/verify", isLoggedIn, async function (req, res) {
    try {
        const {
            orderId,
            paymentId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // 1. Validate required fields.
        if (
            !mongoose.Types.ObjectId.isValid(orderId) ||
            !mongoose.Types.ObjectId.isValid(paymentId) ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                message: "Invalid payment verification details"
            });
        }

        // 2. Find this user's payment attempt.
        const payment = await paymentModel.findOne({
            _id: paymentId,
            order: orderId,
            user: req.user._id,
            provider: "razorpay"
        });

        if (!payment || !payment.providerOrderId) {
            return res.status(404).json({
                message: "Payment record not found"
            });
        }

        // 3. Match the Razorpay Order ID with our database.
        if (payment.providerOrderId !== razorpay_order_id) {
            return res.status(400).json({
                message: "Razorpay order ID does not match"
            });
        }

        // 4. Verify the signature using our stored Razorpay Order ID.
        const signatureBody =
            `${payment.providerOrderId}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(signatureBody)
            .digest("hex");

        const expectedBuffer = Buffer.from(expectedSignature, "hex");
        const receivedBuffer = Buffer.from(razorpay_signature, "hex");

        const signatureIsValid =
            expectedBuffer.length === receivedBuffer.length &&
            crypto.timingSafeEqual(
                expectedBuffer,
                receivedBuffer
            );

        if (!signatureIsValid) {
            return res.status(400).json({
                message: "Payment signature verification failed"
            });
        }

        // 5. Find the order and confirm it belongs to this user.
        const order = await orderModel.findOne({
            _id: payment.order,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        // 6. Confirm payment status directly with Razorpay.
        const razorpayPayment =
            await razorpay.payments.fetch(razorpay_payment_id);

        if (
            razorpayPayment.order_id !== payment.providerOrderId ||
            razorpayPayment.amount !== Math.round(payment.amount * 100) ||
            razorpayPayment.currency !== payment.currency
        ) {
            return res.status(400).json({
                message: "Payment details do not match the order"
            });
        }

        if (razorpayPayment.status !== "captured") {
            if (razorpayPayment.status === "failed") {
                payment.status = "failed";
                payment.failureReason =
                    razorpayPayment.error_description ||
                    "Payment failed";

                await payment.save();

                return res.status(400).json({
                    message: "Payment failed. Please try again."
                });
            }

            return res.status(409).json({
                message: "Payment is not captured yet"
            });
        }

        // 7. If already paid, don't clear the cart again.
        if (payment.status === "paid") {
            if (order.status === "pending") {
                order.status = "confirmed";
                await order.save();
            }
            return res.json({
                success: true,
                message: "Payment already verified",
                orderId: order._id
            });
        }

        // 8. Record the verified payment.
        payment.providerPaymentId = razorpay_payment_id;
        payment.status = "paid";
        payment.method = razorpayPayment.method || null;
        payment.failureReason = null;

        await payment.save();
        order.status = "confirmed";
        await order.save();

        // 9. Remove the purchased quantities from the cart.
        // Preserve any extra quantities or products added later.
        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Payment verified, but user was not found"
            });
        }

        for (const orderedItem of order.items) {
            const cartItem = user.cart.find(
                item =>
                    item.product.toString() ===
                    orderedItem.product.toString()
            );

            if (cartItem) {
                cartItem.quantity -= orderedItem.quantity;
            }
        }

        user.cart = user.cart.filter(item => item.quantity > 0);
        await user.save();

        return res.json({
            success: true,
            message: "Payment verified successfully",
            orderId: order._id
        });

    } catch (error) {
        console.error("Payment verification error:", error);

        return res.status(500).json({
            message: "Unable to verify payment right now"
        });
    }
});

router.post("/failure", isLoggedIn, async function (req, res) {
    try {
        const {
            paymentId,
            razorpay_order_id,
            razorpay_payment_id
        } = req.body;

        if (
            !mongoose.Types.ObjectId.isValid(paymentId) ||
            !razorpay_order_id ||
            !razorpay_payment_id
        ) {
            return res.status(400).json({
                message: "Invalid payment failure details"
            });
        }

        const payment = await paymentModel.findOne({
            _id: paymentId,
            user: req.user._id,
            provider: "razorpay"
        });

        if (!payment) {
            return res.status(404).json({
                message: "Payment record not found"
            });
        }

        if (payment.providerOrderId !== razorpay_order_id) {
            return res.status(400).json({
                message: "Razorpay order ID does not match"
            });
        }

        // Never downgrade a payment that is already paid.
        if (payment.status === "paid") {
            return res.status(409).json({
                message: "This payment is already marked as paid"
            });
        }

        // Verify the actual payment status with Razorpay.
        const razorpayPayment =
            await razorpay.payments.fetch(razorpay_payment_id);

        if (
            razorpayPayment.order_id !== payment.providerOrderId ||
            razorpayPayment.amount !== Math.round(payment.amount * 100) ||
            razorpayPayment.currency !== payment.currency
        ) {
            return res.status(400).json({
                message: "Payment details do not match"
            });
        }

        if (razorpayPayment.status !== "failed") {
            return res.status(409).json({
                message: "Razorpay has not confirmed a failed payment"
            });
        }

        payment.providerPaymentId = razorpay_payment_id;
        payment.status = "failed";
        payment.method = razorpayPayment.method || null;
        payment.failureReason =
            razorpayPayment.error_description || "Payment failed";

        await payment.save();

        return res.json({
            success: true,
            message: "Payment failure recorded",
            paymentStatus: payment.status
        });

    } catch (error) {
        console.error("Payment failure recording error:", error);

        return res.status(500).json({
            message: "Unable to record payment failure"
        });
    }
});


module.exports = router;