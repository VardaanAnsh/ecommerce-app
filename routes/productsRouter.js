const express = require('express');

const router = express.Router();

const upload = require('../config/multer-config');

const productmodel = require('../models/product-model');

const isLoggedIn = require('../middlewares/isLoggedIn');

const isOwner = require('../middlewares/isOwner');

const productValidation = require('../validations/productValidation');

router.post("/create", isLoggedIn , isOwner , upload.single("image") ,async function(req, res){
    try 
{   
    const {error,value} = productValidation.validate(req.body);
    if(error){
        return res.status(400).json({
            message : error.details[0].message
        })
    }
    const {name,price,discount,bgcolor,panelcolor,textcolor} = value;

   let product =  await productmodel.create({
    image : req.file.buffer,
    name,
    price,
    discount,
    bgcolor,
    panelcolor,
    textcolor,
   });
   req.flash("success","Product created Successfully!");
   res.redirect("/owners/admin");
}
    catch(error){
        console.error(error);
        res.status(500).json({message: error.message});
    }
}); 

module.exports= router;