const express = require('express');
const router = express.Router();
const addressValidation = require('../validations/addressValidation');

const isLoggedIn = require('../middlewares/isLoggedIn');
const userModel = require('../models/user-model');

router.get('/', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel
            .findById(req.user._id)
            .select('-password');

        res.render('addresses', { user });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});

router.post('/', isLoggedIn, async function(req, res) {
    try {
        const { error, value } = addressValidation.validate(req.body);

        if (error) {
            return res.status(400).send(error.details[0].message);
        }

        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).send('User not found');
        }

        if (user.addresses.length === 0) {
            value.isDefault = true;
        } else if (value.isDefault) {
            user.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        user.addresses.push(value);

        await user.save();

        req.flash('success', 'Address added successfully');

        res.redirect('/addresses');

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});

router.get('/:addressId/edit', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).send('User not found');
        }

        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        res.render('edit-address', {
            address
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
});

router.patch('/:addressId', isLoggedIn, async function(req, res) {
    try {
        const { error, value } = addressValidation.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: error.details[0].message
            });
        }

        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                message: 'Address not found'
            });
        }

        if (value.isDefault) {
            user.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        address.set(value);

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


router.delete('/:addressId', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                message: 'Address not found'
            });
        }

        const wasDefault = address.isDefault;

        user.addresses.pull(req.params.addressId);

        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

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

router.patch('/:addressId/default', isLoggedIn, async function(req, res) {
    try {
        const user = await userModel.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const address = user.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                message: 'Address not found'
            });
        }

        user.addresses.forEach(address => {
            address.isDefault = false;
        });

        address.isDefault = true;

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
module.exports = router;