const authorizeRoles = (...roles) => {
    return (req, res, next) => {

        // Check authentication
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Check authorization
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        next();
    };
};

module.exports = {
    authorizeRoles
};