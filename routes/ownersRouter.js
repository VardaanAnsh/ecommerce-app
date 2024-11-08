const express = require('express');

const router = express.Router();

router.get('/', function(req, res){
    res.send('Welcome to the Sketchers Owners API');
});

router.get('/add', function(req, res){
    res.send('Adding your product to the Cart Store');
});



module.exports= router;
