const express = require('express');

const router = express.Router();
const ownerModel= require('../models/owners-model');
const isLoggedIn = require('../middlewares/isLoggedIn');
const isOwner = require('../middlewares/isOwner');

router.get('/', function(req, res){
    res.send('Welcome to the Sketchers Owners API using routers.');
});



if(process.env.NODE_ENV ==='development'){
  router.post('/create',  async function (req, res) {
    try {
        // Fetch all existing owners
        let owners = await ownerModel.find();

        // Block creation if owners already exist, unless specifically allowed
        if (owners.length > 0) {
            return res.status(403).send("You don't have permission to create. Delete the existing owner first.");
        }

        // Extract required data from request body
        let { fullname, email, password } = req.body;

        // Validate input
        if (!fullname || !email || !password) {
            return res.status(400).send("fullname, email, and password are required.");
        }

        // Create a new owner
        let createdOwner = await ownerModel.create({
            fullname,
            email,
            password,
        });

        res.status(201).send(createdOwner);
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while creating the owner.");
    }
});




  router.delete('/delete/:id', async function (req, res) {
   if (req.headers['admin-key'] !== process.env.ADMIN_KEY) {
      return res.status(403).send("Unauthorized access.");
    }
    try {
        let { id } = req.params;
        let owner = await ownerModel.findById(id);
  
        if (!owner) {
            return res.status(404).send("Owner not found.");
        }
  
        await ownerModel.findByIdAndDelete(id);
        res.status(200).send("Owner deleted successfully.");
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while deleting the owner.");
    }
  });



    
};

router.get('/admin', isLoggedIn , isOwner, function(req, res){
  let success = req.flash('success');
  res.render('createproducts',{success});
});






module.exports= router;

