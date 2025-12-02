const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// CloudinaryStorage will upload and attach cloud info on req.file
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "lynk_profile",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // you can add transformation here if required
  },
});

const upload = multer({ storage });

module.exports = upload;
