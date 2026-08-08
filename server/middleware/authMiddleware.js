const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Admin = require("../models/Admin");

const verifyToken = async (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader) {
            return res.status(401).json({
                success: false,
                message: "Access Denied. No Token Provided."
            });
        }

        const token = authorizationHeader.startsWith("Bearer ")
            ? authorizationHeader.slice(7).trim()
            : authorizationHeader;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access Denied. No Token Provided."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.id || !mongoose.isValidObjectId(decoded.id)) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload"
            });
        }

        // Determine model based on role
        let user;
        if (decoded.role === "faculty") {
            user = await Faculty.findById(decoded.id).select("isActive passwordChangedAt role");
        } else if (decoded.role === "admin") {
            user = await Admin.findById(decoded.id).select("isActive passwordChangedAt role");
        } else {
            user = await Student.findById(decoded.id).select("isActive passwordChangedAt role");
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or Expired Token"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated"
            });
        }

        const passwordChangedAt = user.passwordChangedAt ? Math.floor(new Date(user.passwordChangedAt).getTime() / 1000) : 0;
        const issuedAt = decoded.iat || 0;

        if (passwordChangedAt && issuedAt < passwordChangedAt) {
            return res.status(401).json({
                success: false,
                message: "Token is no longer valid"
            });
        }

        req.user = {
            ...decoded,
            role: decoded.role || user.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or Expired Token"
        });
    }
};

module.exports = verifyToken;