const express = require('express');

const router = express.Router();

const isLoggedIn = require('../middlewares/isLoggedIn');
const isOwner = require('../middlewares/isOwner');

router.get('/admin', isLoggedIn, isOwner, function(req, res) {

    const validationError = req.flash("validationError")[0];
    const formDataMessage = req.flash("productFormData")[0];

    let formData = {};
    if (formDataMessage) {
        formData = JSON.parse(formDataMessage);
    }

    res.render('createproducts', {
        formData,
        validationError
    });
});

module.exports = router;