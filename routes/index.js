const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const isLoggedIn = require('../middlewares/isLoggedIn');
const productModel = require('../models/product-model');
const userModel = require('../models/user-model');
const orderModel = require('../models/order-model');

router.get('/', function(req, res){
    let error = req.flash('error');
    let loginSuccess = req.flash('loginSuccess');
    let loginError = req.flash('loginError');  

    res.render('index', { error, loginSuccess, loginError, loggedin: false });
});

router.get('/shop',isLoggedIn, async (req, res) => {
  try {
    const products = await productModel.find({});  // fetch all products
    const success = req.flash('success');    // example flash message
    res.render('shop', { products, success });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.get('/cart', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel
            .findById(req.user._id)
            .populate('cart.product');

        res.render('cart', { user });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});

router.get('/users/shop',isLoggedIn, async function(req, res){
    let products = await productModel.find();
    let success = req.flash('success');
    res.render('shop',{products,success}) ;
});


router.get('/account', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel
            .findById(req.user._id)
            .select('-password');

        const orders = await orderModel
            .find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('account', {
            user,
            orders
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});

// router.get('/addtocart/:id',isLoggedIn, async function(req, res){
//    let user = await userModel.findOne({email : req.user.email});
//    user.cart.push( req.params.id);
//    await user.save();
//    req.flash('success', 'Product added to Cart');
//    res.redirect('/shop');
// });

router.post('/cart/:productId', isLoggedIn, async function(req, res) {
    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.productId)) 
        {
            return res.status(400).json({
                message: 'Invalid product ID'
            });
        }

        const product = await productModel.findById(req.params.productId);

        if (!product) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        const user = await userModel.findById(req.user._id);

        const existingItem = user.cart.find(
            item => item.product.toString() === req.params.productId
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            user.cart.push({
                product: req.params.productId,
                quantity: 1
            });
        }

        await user.save();

        req.flash('success', 'Product added to Cart');
        res.redirect('/shop');

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});


router.patch('/cart/:productId', isLoggedIn, async function(req, res) {
    try {
        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: 'Invalid quantity'
            });
        }

        const user = await userModel.findById(req.user._id);

        const cartItem = user.cart.find(
            item => item.product.toString() === req.params.productId
        );

        if (!cartItem) {
            return res.status(404).json({
                message: 'Product not found in cart'
            });
        }

        cartItem.quantity = quantity;

        await user.save();

        res.json({
            success: true,
            quantity: cartItem.quantity
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
});

router.delete('/cart/:productId', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel.findById(req.user._id);

        const cartItem = user.cart.find(
            item => item.product.toString() === req.params.productId
        );

        if (!cartItem) {
            return res.status(404).json({
                message: 'Product not found in cart'
            });
        }
        //filter creates new array with only values that match condition  
        user.cart = user.cart.filter(
            item => item.product.toString() !== req.params.productId
        );

        await user.save();

        res.json({
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
});

router.post('/checkout', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel
            .findById(req.user._id)
            .populate('cart.product');

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({
                message: 'Cart is empty'
            });
        }

        console.log('ADDRESS ID FROM FRONTEND:', req.body.addressId);
        console.log('USER ADDRESSES:', user.addresses);
        const address = user.addresses.id(req.body.addressId);

        if (!address) {
            return res.status(404).json({
                message: 'Address not found'
            });
        }

        const items = user.cart.map(item => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            discount: item.product.discount
        }));

        const totalAmount = user.cart.reduce((total, item) => {
            return total +
                (item.product.price * item.quantity)
                - item.product.discount
                + 20;
        }, 0);

        const order = await orderModel.create({
            user: user._id,

            items,

            shippingAddress: {
                label: address.label,
                name: address.name,
                phone: address.phone,
                addressLine: address.addressLine,
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },

            totalAmount
        });

        user.cart = [];

        await user.save();

        res.json({
            success: true,
            orderId: order._id,
            totalAmount: order.totalAmount
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Something went wrong during checkout'
        });
    }
});

router.get('/order-success', isLoggedIn, async function(req, res) {
  try {
    const order = await orderModel.findOne({
      _id: req.query.orderId,
      user: req.user._id
    });

    if (!order) {
      return res.redirect('/orders');
    }

    res.render('order-success', { order });

  } catch(error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
});

router.get('/checkout', isLoggedIn, async function(req,res){
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate('cart.product');

    if(!user.cart || user.cart.length === 0){
      return res.redirect('/cart');
    }

    const totalItems = user.cart.reduce((total, item) => {
      return total + item.quantity;
    }, 0);

    const subtotal = user.cart.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);

    const discount = user.cart.reduce((total, item) => {
      return total + item.product.discount;
    }, 0);

    const platformFee = user.cart.length * 20;

    const totalAmount = subtotal - discount + platformFee;

    res.render('checkout', {
      user,
      totalItems,
      subtotal,
      discount,
      platformFee,
      totalAmount
    });

  } catch(error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
});


router.get('/orders', isLoggedIn, async function(req, res) {
    try {
        const orders = await orderModel
            .find({ user: req.user._id })
            .sort({ createdAt: -1 });

        res.render('orders', { orders });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});

router.get('/orders/:orderId', isLoggedIn, async function(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
            return res.status(400).send('Invalid order ID');
        }

        const order = await orderModel.findOne({
            _id: req.params.orderId,
            user: req.user._id
        });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('order-details', { order });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});



module.exports = router;
