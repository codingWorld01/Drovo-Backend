import express from "express";
import { addFood, listFood, removeFood } from "../controller/foodController.js";
import multer from "multer"
import shopAuthMiddleware from "../middlewares/shopAuthMiddleware.js";

const foodRouter = express.Router();

// image Storage engine

const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
        return cb(null, `${Date.now()}${file.originalname}`)
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


foodRouter.post("/add", shopAuthMiddleware, uploads.single("image"), addFood);
foodRouter.get('/list/:shopId?', listFood);
foodRouter.post("/remove", shopAuthMiddleware, removeFood);


export default foodRouter;

