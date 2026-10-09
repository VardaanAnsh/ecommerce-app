const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const redisClient = require("../config/redis");
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const orderModel = require("../models/order-model");

// router.get("/", function (req, res) {
//   let error = req.flash("error");
//   let loginSuccess = req.flash("loginSuccess");
//   let loginError = req.flash("loginError");

//   res.render("index", { error, loginSuccess, loginError, loggedin: false });
// });

router.get("/", function (req, res) {
    res.render("index", {
        loggedin: false
    });
});

// router.get('/shop',isLoggedIn, async (req, res) => {
//   try {
//     const products = await productModel.find({});  // fetch all products
//     // console.log("SHOP SESSION:", req.sessionID);
//     // console.log("SHOP FLASH:", req.flash('success'));
//     res.render('shop', { products });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// });

//CACHING OF PRODUCTS IN REDIS
router.get("/shop", isLoggedIn, async (req, res) => {
  console.log("SHOP ROUTE HIT");

  try {
    const sortBy = req.query.sortby || "popular";

    let sortOption = {};

    if (sortBy === "newest") {
      sortOption = { _id: -1 };
    } else {
      // Keep the existing/default product order for now.
      sortOption = { _id: 1 };
    }

    const cacheKey = `products:${sortBy}`;

    const cachedProducts = await redisClient.get(cacheKey);

    if (cachedProducts) {
      console.log("CACHE HIT:", cacheKey);

      const products = JSON.parse(cachedProducts);

      return res.render("shop", {
        products,
        sortBy,
      });
    }

    console.log("CACHE MISS:", cacheKey);

    const products = await productModel
      .find({})
      .select("-image")
      .sort(sortOption)
      .lean();

    await redisClient.setEx(
      cacheKey,
      60,
      JSON.stringify(products)
    );

    res.render("shop", {
      products,
      sortBy,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/cart", isLoggedIn, async function (req, res) {
  try {
      const user = await userModel
        .findById(req.user._id)
        .populate({
            path: 'cart.product',
            select: '-image'
        });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const hasUnavailableProducts = user.cart.some((item) => !item.product);

    if (hasUnavailableProducts) {
      user.cart = user.cart.filter((item) => item.product);
      await user.save();

      req.flash(
        "error",
        "Some products in your cart are no longer available and were removed.",
      );

      return res.redirect("/cart");
    }

    res.render("cart", { user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.get("/account", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findById(req.user._id).select("-password");

    const orders = await orderModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("account", {
      user,
      orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.get("/profile", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel
      .findById(req.user._id)
      .select("-password");

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("profile", { user });

  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});


// router.get('/addtocart/:id',isLoggedIn, async function(req, res){
//    let user = await userModel.findOne({email : req.user.email});
//    user.cart.push( req.params.id);
//    await user.save();
//    req.flash('success', 'Product added to Cart');
//    res.redirect('/shop');
// });

router.post("/cart/:productId", isLoggedIn, async function (req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await productModel.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const user = await userModel.findById(req.user._id);

    const existingItem = user.cart.find(
      (item) => item.product.toString() === req.params.productId,
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({
        product: req.params.productId,
        quantity: 1,
      });
    }

    await user.save();
    // console.log("ADDING FLASH MESSAGE");
    // console.log("ADDING FLASH MESSAGE - session:", req.sessionID);
    req.flash("success", "Product added to Cart");
    res.redirect("/shop");
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.patch("/cart/:productId", isLoggedIn, async function (req, res) {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: "Invalid quantity",
      });
    }

    const user = await userModel.findById(req.user._id);

    const cartItem = user.cart.find(
      (item) => item.product.toString() === req.params.productId,
    );

    if (!cartItem) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    cartItem.quantity = quantity;

    await user.save();

    res.json({
      success: true,
      quantity: cartItem.quantity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

router.delete("/cart/:productId", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findById(req.user._id);

    const cartItem = user.cart.find(
      (item) => item.product.toString() === req.params.productId,
    );

    if (!cartItem) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }
    //filter creates new array with only values that match condition
    user.cart = user.cart.filter(
      (item) => item.product.toString() !== req.params.productId,
    );

    await user.save();

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
});


router.post("/checkout", isLoggedIn, function (req, res) {
    return res.status(410).json({
        message: "This checkout endpoint has been retired. Please use the payment checkout flow."
    });
});


router.get("/order-success", isLoggedIn, async function (req, res) {
  try {
    const order = await orderModel.findOne({
      _id: req.query.orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.redirect("/orders");
    }

    res.render("order-success", { order });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.get("/checkout", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate({
        path: "cart.product",
        select: "-image"
    });

    if (!user.cart || user.cart.length === 0) {
      return res.redirect("/cart");
    }

    const totalItems = user.cart.reduce((total, item) => {
      return total + item.quantity;
    }, 0);

    const subtotal = user.cart.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    const discount = user.cart.reduce((total, item) => {
      return total + item.product.discount * item.quantity;
    }, 0);

    const platformFee = user.cart.length * 20;

    const totalAmount = subtotal - discount + platformFee;

    res.render("checkout", {
      user,
      totalItems,
      subtotal,
      discount,
      platformFee,
      totalAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.get("/orders", isLoggedIn, async function (req, res) {
  try {
    const orders = await orderModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.render("orders", { orders });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

router.get("/orders/:orderId", isLoggedIn, async function (req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    const order = await orderModel.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("order-details", { order });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

module.exports = router;
