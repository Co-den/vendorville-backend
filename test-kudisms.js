import dotenv from "dotenv";
import { kudismsApi } from "./src/utils/kudisms.js";

dotenv.config();

kudismsApi
  .sendSms("2349039354723", "Test message from VendorVille")
  .then((res) => console.log("SUCCESS:", res))
  .catch((err) => console.error("FAILED:", err));
