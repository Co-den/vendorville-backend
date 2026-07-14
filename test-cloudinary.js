import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Testing with:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "***set***" : "MISSING",
});

const buffer = fs.readFileSync("./vv.png");

cloudinary.uploader
  .upload_stream(
    {}, // no folder parameter — bare minimum call
    (error, result) => {
      if (error) console.error("UPLOAD FAILED:", error);
      else console.log("UPLOAD SUCCESS:", result.secure_url);
    },
  )
  .end(buffer);
