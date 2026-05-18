const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const User = require("../models/User");

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Multer (store file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload profile image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    const result = await cloudinary.uploader.upload_stream(
      { folder: "profiles" },
      async (error, result) => {
        if (error) return res.status(500).json({ error });

        // Update user
        const user = await User.findByIdAndUpdate(
          req.user.id,
          { image: result.secure_url },
          { new: true }
        );

        res.json({ image: user.image });
      }
    );

    result.end(file.buffer);
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;