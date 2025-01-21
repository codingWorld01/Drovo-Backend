import express from "express";
import { addFood, listFood, removeFood, giveFood, editFood } from "../controller/foodController.js";
import multer from "multer";
import shopAuthMiddleware from "../middlewares/shopAuthMiddleware.js";
import fs from "fs/promises";
import tinify from "tinify";

const foodRouter = express.Router();

// Multer Storage (Temporary Storage for Original Images)
const storage = multer.diskStorage({
    destination: "uploads", // Temporary folder
    filename: (req, file, cb) => {
        return cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter to validate uploads
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true); // Accept image files
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

const uploads = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// Set your Tinify API Key
tinify.key = "SvtK4P5fvvhZh4NqH1hQBf17p87HpXxY"; // Replace with your API key

// Middleware to Compress Image Using Tinify
const compressImageMiddleware = async (req, res, next) => {
    if (!req.file) return next(); // If no file uploaded, skip

    try {
        const inputPath = `uploads/${req.file.filename}`;
        const compressedFilename = `compressed-${req.file.filename}`;
        const outputPath = `uploads/${compressedFilename}`;

        // Compress the image using Tinify
        const source = tinify.fromFile(inputPath);
        await source.toFile(outputPath); // Save the compressed image

        // Delete the original uncompressed image
        await fs.unlink(inputPath);

        // Update the file information in the request
        req.file.filename = compressedFilename;
        req.file.path = outputPath;

        next(); // Proceed to the next middleware
    } catch (error) {
        console.error("Error compressing image:", error);
        return res.status(500).json({ success: false, message: "Image compression failed." });
    }
};

// Routes

foodRouter.post(
    "/add",
    shopAuthMiddleware,
    uploads.single("image"), // Handle file upload
    compressImageMiddleware, 
    addFood // Handle adding food to the database
);

foodRouter.post(
    "/edit/:id",
    shopAuthMiddleware,
    uploads.single("image"), // Handle file upload
    compressImageMiddleware, 
    editFood // Handle editing food in the database
);

foodRouter.get("/list/:shopId?", listFood);
foodRouter.post("/remove", shopAuthMiddleware, removeFood);
foodRouter.get("/:id", shopAuthMiddleware, giveFood);

export default foodRouter;
