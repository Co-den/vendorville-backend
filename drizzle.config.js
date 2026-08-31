import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/models/*.js",
  dialect: "postgresql",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
