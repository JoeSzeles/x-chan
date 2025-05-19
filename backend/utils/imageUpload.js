
import { upload } from './multer.js';

export const handleImageUpload = (fieldName) => {
    return upload.single(fieldName);
};

export const getImageUrl = (filename) => {
    return `/public/uploads/${filename}`;
};

export const validateImage = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG and GIF are allowed" });
    }

    next();
};
