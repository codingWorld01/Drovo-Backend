import userModel from "../models/UserModel.js";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'
import nodemailer from 'nodemailer';
import Shop from "../models/ShopModel.js";

// Helper to create token
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const getUserProfile = async (req, res) => {
    const token = req.headers.token;

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decode token to get user/shop ID
        const { id } = decoded;

        // Check if the ID corresponds to a user
        const user = await userModel.findById(id);
        if (user) {
            return res.json({ role: 'user', user });
        }

        // Check if the ID corresponds to a shop
        const shop = await Shop.findById(id);
        if (shop) {
            return res.json({ role: 'shop', shop });
        }

        // If neither user nor shop is found
        return res.status(404).json({ message: "No such user or shop found" });
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(500).json({ message: "Error verifying token" });
    }
};


// Login user or shop
const loginUser = async (req, res) => {
    const { email, password, role } = req.body;  // Get role from request body

    try {
        let user;
        if (role === 'user') {
            user = await userModel.findOne({ email });
        } else if (role === 'shop') {
            user = await Shop.findOne({ email });
        } else {
            return res.json({ success: false, message: "Invalid role" });
        }

        if (!user) {
            return res.json({ success: false, message: "User doesn't exist" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const token = createToken(user._id);
        res.json({ success: true, token });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Register user or shop
const registerUser = async (req, res) => {

    const { name, email, password, role } = req.body;

    try {
        let exists;
        if (role === 'user') {
            exists = await userModel.findOne({ email });
        } else if (role === 'shop') {
            exists = await Shop.findOne({ email });
        } else {
            return res.json({ success: false, message: "Invalid role" });
        }

        if (exists) {
            return res.json({ success: false, message: `${role === 'shop' ? 'Shop' : 'User'} already exists` });
        }

        // Validate email format and strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let newUser;
        if (role === 'user') {
            newUser = new userModel({ name, email, password: hashedPassword });
        } else if (role === 'shop') {
            newUser = new Shop({ name, email, password: hashedPassword });
        }

        const user = await newUser.save();
        const token = createToken(user._id);

        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

const otpStore = {};

const sendOtpEmail = async (email, otp) => {
    try {
        // Create a transporter object
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // You can use other services like Outlook, Yahoo, etc.
            auth: {
                user: process.env.EMAIL_USER, // Replace with your email
                pass: process.env.EMAIL_PASS, // Replace with your email password or app-specific password
            },
        });

        // Compose the email
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender address
            to: email, // Recipient email address
            subject: 'Your OTP for Registration', // Subject line
            text: `Your OTP for registration is: ${otp}`, // Plain text body
            html: `<p>Your OTP for registration is: <b>${otp}</b></p>`, // HTML body
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);

        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};


const sendOtp = async (req, res) => {
    const { email, password } = req.body;
    try {

        let existingShop;
        existingShop = await Shop.findOne({ email });

        if (existingShop) {
            // If the shop exists, check the isSetupComplete flag
            if (existingShop.isSetupComplete) {
                return res.json({
                    success: false,
                    message: 'Shop already exists.'
                });
            }
        }

        // Validate email format and strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" });
        }

        // Generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Store OTP in memory or a temporary database (better approach)
        otpStore[email] = otp;

        // Send OTP via email
        await sendOtpEmail(email, otp);
        res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
};
const verifyOtp = async (req, res) => {
    const { email, otp, name, password } = req.body;

    // Check if OTP matches
    if (otpStore[email] && otpStore[email] == otp) {
        try {
            // Check if the shop already exists
            let shop = await Shop.findOne({ email });

            if (shop) {
                // If the shop exists, check if setup is incomplete
                if (!shop.isSetupComplete) {
                    // Update shop details and set `isSetupComplete` to true
                    shop.name = name; // Update name if necessary
                    shop.password = await bcrypt.hash(password, 10); // Hash the new password

                    await shop.save();

                    // Clear OTP from the store
                    delete otpStore[email];

                    // Generate a token
                    const token = createToken(shop._id);

                    // Send a successful response with the token
                    return res.json({
                        success: true,
                        message: 'Shop registered successfully.',
                        token,
                    });
                } else {
                    // If setup is already complete, return an error
                    return res.status(400).json({
                        success: false,
                        message: 'Shop already exists.',
                    });
                }
            } else {
                // If no shop exists, create a new one
                const hashedPassword = await bcrypt.hash(password, 10);

                const newShop = new Shop({
                    name,
                    email,
                    password: hashedPassword,
                });

                shop = await newShop.save();

                // Clear OTP from the store
                delete otpStore[email];

                // Generate a token
                const token = createToken(shop._id);

                // Send a successful response with the token
                return res.json({
                    success: true,
                    message: 'Shop registered successfully.',
                    token,
                });
            }
        } catch (error) {
            console.error('Error during OTP verification:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to register or update shop.',
            });
        }
    } else {
        // If OTP is invalid
        return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
};



export { loginUser, registerUser, getUserProfile, sendOtp, verifyOtp };