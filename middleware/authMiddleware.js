const jwt = require('jsonwebtoken');
const config = require('../config/config');

module.exports = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            message: "Token not provided",
        });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
        return res.status(401).json({
            message: "Invalid token format",
        });
    }

    const token = parts[1];

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Token expired",
                });
            }

            if (err.name === "JsonWebTokenError") {
                return res.status(401).json({
                    message: "Invalid token signature",
                });
            }

            return res.status(401).json({
                message: "Invalid token",
            });
        }

        req.user = decoded;
        next();
    });
};