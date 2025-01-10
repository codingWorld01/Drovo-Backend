import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Shop from '../models/ShopModel.js';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a new order for subscription renewal
const createRenewalOrder = async (req, res) => {
    const { amount, token } = req.body;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized request' });
    }

    try {
        // Convert amount to paise
        const options = {
            amount: amount * 100, // Amount in paise (e.g., 99 INR = 9900 paise)
            currency: 'INR',
            receipt: `renewal_rcptid_${Date.now()}`,
        };

        // Create an order
        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error('Error creating renewal order:', error);
        res.status(500).json({ success: false, message: 'Server error while creating renewal order' });
    }
};

// Verify the payment for subscription renewal
const verifyRenewalPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscription } = req.body;

    // Check for missing payment details
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized access' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET); // Use your secret key
        const shopId = decodedToken.id; // Ensure your token includes shopId
        // Validate the payment signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            // Fetch the shop from the database
            const shop = await Shop.findById(shopId);
            if (!shop) {
                return res.status(404).json({ success: false, message: "Shop not found" });
            }

            // Map subscription plan to days
            const durationMapping = {
                '99': 15,   // 15 days
                '149': 30,  // 1 month
                '299': 90,  // 3 months
                '599': 180, // 6 months
            };

            let subscriptionDays = durationMapping[subscription];
            if (!subscriptionDays) {
                return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
            }

            // Calculate new subscription end date
            let newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + subscriptionDays);

            // Update shop subscription details
            const updatedShop = await Shop.findByIdAndUpdate(
                shopId,
                {
                    subscription,
                    subEndDate: newEndDate,
                    paymentDetails: {
                        razorpayOrderId: razorpay_order_id,
                        razorpayPaymentId: razorpay_payment_id,
                        paymentDate: new Date(),
                    },
                },
                { new: true }
            );

            res.status(200).json({
                success: true,
                message: 'Subscription renewed successfully.',
                shop: updatedShop,
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }
    } catch (error) {
        console.error('Error verifying renewal payment:', error);
        res.status(500).json({ success: false, message: 'Server error while verifying renewal payment' });
    }
};





const shopPayment = async (req, res) => {

    const { amount, token } = req.body;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized request' });
    }

    try {
        // Convert amount to paise (smallest currency unit)
        const options = {
            amount: amount, // Amount in paise (100 INR = 10000 paise)
            currency: 'INR',
            receipt: `order_rcptid_${Date.now()}`, // Unique receipt ID
        };

        // Create an order
        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Server error while creating order' });
    }


}



const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    try {
        // Generate HMAC signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const generatedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        // Compare signatures
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // Proceed with shop data update (your existing logic)
        const { name, address, email, phone, subscription, latitude, longitude } = req.body;
        const shopImage = req.file ? req.file.filename : null;

        const shop = await Shop.findOne({ email });
        if (!shop) {
            return res.status(404).json({ success: false, message: "Shop not found" });
        }

        const durationMapping = {
            '99': 15,
            '149': 30,
            '299': 90,
            '599': 180,
        };

        let subscriptionDays = durationMapping[subscription];
        let subscriptionEndDate = new Date();
        subscriptionEndDate.setDate(subscriptionEndDate.getDate() + subscriptionDays);

        const updateData = {
            name,
            shopAddress: {
                address: address,
                latitude: latitude,
                longitude: longitude
            },
            phone,
            subscription,
            subEndDate: subscriptionEndDate,
            isSetupComplete: true,
            paymentDetails: {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                paymentDate: new Date(),
            },
        };

        if (shopImage) {
            updateData.shopImage = shopImage;
        }

        const updatedShop = await Shop.findByIdAndUpdate(shop._id, updateData, { new: true });

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully and shop setup completed.',
            shop: updatedShop,
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Server error while verifying payment' });
    }
};






export { shopPayment, verifyPayment, createRenewalOrder, verifyRenewalPayment }