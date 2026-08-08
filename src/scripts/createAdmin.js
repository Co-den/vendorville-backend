import { db } from "#config/database.js";
import { admins } from "#models/admin.js";
import bcrypt from "bcrypt";

const run = async () => {
  const hashed = await bcrypt.hash("Jesuschrist4ever", 10);
  await db.insert(admins).values({
    name: "Admin",
    email: "vendorville@gmail.com",
    password: hashed,
    role: "superadmin",
  });
  console.log("Admin created");
  process.exit(0);
};

run();
