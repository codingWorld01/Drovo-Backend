import orderModel from "../models/orderModel.js";
import userModel from "../models/UserModel.js"
import jwt from 'jsonwebtoken'
import Shop from "../models/ShopModel.js"; // Import the Shop Model
import nodemailer from 'nodemailer';
import axios from 'axios';


// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const getShopIdFromToken = (token) => {
    try {
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
    } catch (error) {
        console.error("Error verifying token:", error);
        return null;
    }
};



// placing user order for frontend

const placeOrder = async (req, res) => {
    try {

        // Step 1: Create and save the new order
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
            deliveryCharge: req.body.deliveryCharge,
            shopId: req.body.shopId,
        });

        await newOrder.save();

        // Step 2: Clear the user's cart
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Step 3: Fetch Shop Details for Admin Notification
        const shopDetails = await Shop.findById(req.body.shopId);
        if (!shopDetails) {
            return res.status(404).json({ success: false, message: "Shop not found." });
        }

        const { name, email, phone } = shopDetails; // Assuming shop has admin email

        // Step 4: Send Email Notification to Shopkeeper using NodeMailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'New Order Placed',
            text: `Hello ${name},\n\nA new order has been placed at your shop!\n\nOrder Details:\n- Amount: ₹${req.body.amount}\n- User Address: ${req.body.address.street}\n\nPlease check your admin panel for more details.\n\nThank you for using our service!`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        // console.log(process.env.MSG91_API_KEY);
        // Step 5: Send WhatsApp Notification using MSG91 Outbound Message API
        // const msg91ApiKey = process.env.MSG91_API_KEY;
        // const whatsappEndpoint = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

        // const payload = {
        //     "integrated_number": "918262088341",
        //     "content_type": "template",
        //     "payload": {
        //         "messaging_product": "whatsapp",
        //         "type": "template",
        //         "template": {
        //             "name": "drovo",
        //             "language": {
        //                 "code": "en_GB",
        //                 "policy": "deterministic"
        //             },
        //             "namespace": "91a02504_30c0_469d_8b0f_f60e43fc0546",
        //             "to_and_components": [
        //                 {
        //                     "to": [
        //                         "8600777024"
        //                     ],
        //                     "components": {
        //                         "body_1": {
        //                             "type": "text",
        //                             "value": name
        //                         },
        //                         "body_2": {
        //                             "type": "text",
        //                             "value": req.body.amount
        //                         },
        //                         "body_3": {
        //                             "type": "text",
        //                             "value": req.body.address.street
        //                         }
        //                     }
        //                 }
        //             ]
        //         }
        //     }
        // };

        // Hello,  
        // A new order has been placed at your shop!  

        // Please check your admin panel for more details.  
        // Thank you for using our service!

        // const headers = {
        //     "Content-Type": "application/json",
        //     authkey: msg91ApiKey,
        // };

        // try {
        //     const response = await axios.post(whatsappEndpoint, payload, { headers });
        //     console.log("WhatsApp notification sent successfully!", response.data);
        // } catch (error) {
        //     console.error("Error sending WhatsApp notification:", error.response?.data || error.message);
        // }

        // Step 6: Respond to the frontend
        res.status(200).json({ success: true, message: "Order placed successfully and notifications sent!" });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ success: false, message: "Error placing order." });
    }
};

const findOrder = async (req, res) => {
    const { id } = req.params;
    
    try {
        const order = await orderModel.findById(id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        

        // Fetch the shop details
        const shop = await Shop.findById(order.shopId);

        res.status(200).json({
            success: true,
            order,
            shop,
        });
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

const feedback = async (req, res) => {
    const { name, email, rating, message, shopEmail } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: email,
        to: shopEmail,
        subject: `Feedback from ${name}`,
        text: `
            Name: ${name}
            Email: ${email}
            Rating: ${rating}
            Message: ${message}
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).send({ message: 'Feedback sent successfully' });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send({ message: 'Failed to send feedback' });
    }

};

// user orders for frontend
const userOrders = async (req, res) => {

    try {
        const orders = await orderModel.find({ userId: req.body.userId })
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Listing orders for admin panel
const listOrders = async (req, res) => {
    const { token } = req.headers;
    let shopId = getShopIdFromToken(token);

    if (!shopId) {
        return res.status(400).json({ success: false, message: "Shop ID is required" });
    }

    try {
        const orders = await orderModel.find({ shopId });
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}


// api for updating order status
const updateStatus = async (req, res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status })
        res.json({ success: true, message: "Status Updated" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

export { placeOrder, userOrders, listOrders, updateStatus, findOrder, feedback }