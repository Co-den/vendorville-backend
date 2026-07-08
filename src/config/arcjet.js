import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_API_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
    }),
    slidingWindow({
      mode: "LIVE",
      interval: 25,
      max: 5,
    }),
  ],
});

export default aj;