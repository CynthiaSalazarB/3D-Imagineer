/**
 * Returns an Express middleware that allows only users with the given role.
 * Sets req.session.user on login; this guard reads that value on every
 * protected request so role changes take effect on the next login.
 *
 * @param {string} role - The required role ('clerk' or 'customer')
 * @returns {Function} Express middleware
 */
const checkRole = (role) => (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === role) {
        return next();
    }
    res.status(403).render('error', {
        title: 'Error',
        message: 'You are not authorized to view this page.'
    });
};

module.exports = { checkRole };
