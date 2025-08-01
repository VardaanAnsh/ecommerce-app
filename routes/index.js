const express = require('express');

const router = express.Router();
const isLoggedIn = require('../middlewares/isLoggedIn');
const productModel = require('../models/product-model');
const userModel = require('../models/user-model');

router.get('/', function(req, res){
    let error = req.flash('error');
    let loginSuccess = req.flash('loginSuccess');
    let loginError = req.flash('loginError');  // add this line

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






router.get('/cart',isLoggedIn, async function(req, res){
    let user=await userModel.findOne({email:req.user.email}).populate('cart');

    res.render('cart',{user});
});

router.get('/users/shop',isLoggedIn, async function(req, res){
    let products = await productModel.find();
    let success = req.flash('success');
    res.render('shop',{products,success}) ;
});

router.get('/account',isLoggedIn, async function(req, res){
    res.render('shop',{products,success}) ;
});

router.get('/addtocart/:id',isLoggedIn, async function(req, res){
   let user = await userModel.findOne({email : req.user.email});
   user.cart.push( req.params.id);
   await user.save();
   req.flash('success', 'Product added to Cart');
   res.redirect('/shop');
});





router.get('/logout',isLoggedIn, function(req, res){
    res.render('shop') ;
});





module.exports = router;
