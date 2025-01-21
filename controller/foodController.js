import foodModel from "../models/foodModel.js";
import fs from 'fs'
import jwt from 'jsonwebtoken';

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


//add food items
const addFood = async (req, res) => {
    const { name, description, price, category, quantity, unit } = req.body;
    const { token } = req.headers;

    let shopId = getShopIdFromToken(token);
    if (!shopId) {
        return res.status(400).json({ success: false, message: "Shop ID is required" });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: "Image is required." });
    }

    const food = new foodModel({
        name,
        description,
        price,
        category,
        quantity,
        unit,
        image: req.file.filename, // Save compressed filename
        shop: shopId, // Associate food item with the shop
    });

    try {
        await food.save();
        res.json({ success: true, message: "Food Added" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Something Went Wrong, Please try again!" });
    }
};

const editFood = async (req, res) => {
    const { id } = req.params; // Food ID
    const { name, description, price, category, unit, quantity } = req.body;

    try {
        // Find the food item by ID
        const foodItem = await foodModel.findById(id);
        if (!foodItem) {
            return res.status(404).json({ success: false, message: "Food item not found." });
        }

        if (req.file) {
            const oldImagePath = `uploads/${foodItem.image}`;
        
            fs.unlink(oldImagePath, (error) => {
                if (error) {
                    console.warn("Failed to delete old image:", error.message);
                } else {
                    console.log("Old image deleted:", oldImagePath);
                }
            });
        
            // Update the food item with the new image
            foodItem.image = req.file.filename;
        }

        // Update the rest of the fields
        foodItem.name = name || foodItem.name;
        foodItem.description = description || foodItem.description;
        foodItem.price = price || foodItem.price;
        foodItem.category = category || foodItem.category;
        foodItem.unit = unit || foodItem.unit;
        foodItem.quantity = quantity || foodItem.quantity;

        // Save the updated food item
        await foodItem.save();

        return res.status(200).json({ success: true, message: "Food item updated successfully.", data: foodItem });
    } catch (error) {
        console.error("Error updating food item:", error);
        return res.status(500).json({ success: false, message: "Error updating food item." });
    }
};



// all food list
const listFood = async (req, res) => {
    const { token } = req.headers; // Get token from headers
    const { shopId: shopIdFromUrl } = req.params; // Get shopId from URL (if provided)

    let shopId;

    // Priority: If shopId exists in URL, use it; otherwise, extract from token
    if (shopIdFromUrl) {
        shopId = shopIdFromUrl;
    } else if (token) {
        shopId = getShopIdFromToken(token); // Extract shopId using your helper
    }

    // Check if shopId exists after this logic
    if (!shopId) {
        return res.status(400).json({ success: false, message: "Shop ID or valid token is required" });
    }

    try {
        const foods = await foodModel.find({ shop: shopId }); // Query by shopId
        res.json({ success: true, data: foods });
    } catch (error) {
        console.error("Error fetching food items:", error.message);
        res.status(500).json({ success: false, message: "Error fetching food items" });
    }
};

const giveFood = async (req, res) => {
    const { id } = req.params;

    try {
        const food = await foodModel.findById(id);

        if (!food) {
            return res.status(404).json({ success: false, message: "Food item not found" });
        }

        res.json({ success: true, data: food });
    } catch (error) {
        console.error("Error fetching food details:", error.message);
        res.status(500).json({ success: false, message: "Error fetching food details" });
    }
};


//remove food item
const removeFood = async (req, res) => {
    const { id } = req.body; // Assuming both `id` (food item) and `shopId` are sent in the body
    const { token } = req.headers;
    let shopId = getShopIdFromToken(token);

    if (!id || !shopId) {
        return res.status(400).json({ success: false, message: "Food ID and Shop ID are required" });
    }

    try {
        const food = await foodModel.findOne({ _id: id, shop: shopId }); // Ensure the food belongs to the shop

        if (!food) {
            return res.status(404).json({ success: false, message: "Food item not found or does not belong to the shop" });
        }

        // Remove the image file
        fs.unlink(`uploads/${food.image}`, (err) => {
            if (err) console.error("Error deleting image file:", err);
        });

        // Delete the food item
        await foodModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Food Removed" });
    } catch (error) {
        console.error("Error removing food item:", error);
        res.status(500).json({ success: false, message: "Error removing food item" });
    }
};


export { addFood, listFood, removeFood, getShopIdFromToken, giveFood, editFood }

