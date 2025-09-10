const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

const verifyToken = (req, res, next) => {
    let token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Access denied' });

    // handle "Bearer <token>" format
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        // store both id and role
        req.user = { id: decoded.userId, username: decoded.userName, role: decoded.role };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};

module.exports = { verifyToken, adminMiddleware };
