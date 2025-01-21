import jwt from 'jsonwebtoken';
import Shop from '../models/ShopModel.js';

// Middleware to protect shop routes
const shopAuthMiddleware = async (req, res, next) => {
    const { token } = req.headers;
    // console.log(req)

    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
        // Decode the token and extract the shopId
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const shopId = decoded.id;

        if (!shopId) {
            return res.status(400).json({ success: false, message: "Shop ID not found in token" });
        }

        // Find the shop in the database
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ success: false, message: "Shop not found" });
        }

        // Check if the setup is complete and subscription is active
        const now = new Date();
        if (!shop.isSetupComplete) {
            return res.status(403).json({
                success: false,
                redirect: "/setup",
                message: "Complete setup first."
            });
        }

        if (shop.subEndDate < now) {
            return res.status(403).json({
                success: false,
                redirect: "/renew-subscription",
                message: "Subscription expired."
            });
        }

        req.shop = shop; // Attach the shop to the request object for use in the route handler
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        console.error("Token verification failed:", error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired', expiredAt: error.expiredAt });
        }
        return res.status(500).json({ success: false, message: "Failed to authenticate shop", error: error.message });
    }
};


export default shopAuthMiddleware;
