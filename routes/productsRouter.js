const express = require('express');
const router = express.Router();

const upload = require('../config/multer-config');
const productmodel = require('../models/product-model');
const isLoggedIn = require('../middlewares/isLoggedIn');
const isOwner = require('../middlewares/isOwner');
const productValidation = require('../validations/productValidation');


// GET PRODUCT IMAGE
router.get('/image/:id', async function(req, res) {
    try {
        const product = await productmodel.findById(req.params.id);

        if (!product || !product.image) {
            return res.status(404).send('Image not found');
        }

        res.set('Content-Type', 'image/jpeg');
        res.send(product.image);

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});


// CREATE PRODUCT

router.post(
    "/create",
    isLoggedIn,
    isOwner,
    upload.single("image"),
    async function(req, res) {

        try {

            const { error, value } = productValidation.validate(req.body);

            if (error) {

                req.flash("validationError", error.details[0].message);
                req.flash("productFormData", JSON.stringify(req.body));
                return res.redirect("/owners/admin");

            }

            if (!req.file) {
                req.flash("validationError", "Please select a product image");
                req.flash("productFormData", JSON.stringify(req.body));
                return res.redirect("/owners/admin");
            }

            const {
                name,
                price,
                discount,
                bgcolor,
                panelcolor,
                textcolor
            } = value;

            await productmodel.create({
                image: req.file.buffer,
                name,
                price,
                discount,
                bgcolor,
                panelcolor,
                textcolor,
            });

            req.flash(
                "success",
                "Product created successfully!"
            );

            res.redirect("/owners/admin");

        } catch (error) {
            console.error(error);

            req.flash(
                "validationError",
                "Something went wrong. Please try again."
            );

            req.flash("productFormData", JSON.stringify(req.body));

            return res.redirect("/owners/admin");
        }
    }
);

module.exports = router;