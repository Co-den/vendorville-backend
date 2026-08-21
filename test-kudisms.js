import dotenv from "dotenv";
import { kudismsApi } from "./src/utils/kudisms.js";

dotenv.config();

kudismsApi
  .sendSms(
    "09039354723",
    "Test rider SMS from VendorVille",
    "Test Rider",
    "VendorVille",
  )
  .then((res) => console.log("SUCCESS:", res))
  .catch((err) => console.error("FAILED:", err));
