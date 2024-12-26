import multer from "multer";
import path from "path";

// Configure storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/shops"); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname); // Get the file extension
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`); // Save with unique name
    },
});

// File filter to validate uploads
const fileFilter = (req, file, cb) => {
    // console.log(file);
    if (file.mimetype.startsWith("image/")) {
        cb(null, true); // Accept image files
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

export default upload;
