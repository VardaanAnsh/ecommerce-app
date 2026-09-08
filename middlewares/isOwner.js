module.exports = function (req, res, next) {
    if (!req.user || req.user.role !== 'owner') {
        req.flash('error', 'Access denied');
        return res.redirect('/shop');
    }

    next();
};