import dns from "dns";
import "dotenv/config";
import "./server.js";
dns.setDefaultResultOrder("ipv4first");

