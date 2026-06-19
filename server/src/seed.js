// Optional seed script — populates a few example confessions so the wall
// isn't empty on a fresh DB. Run with: npm run seed

import "dotenv/config";
import mongoose from "mongoose";
import Confession from "./confessionModel.js";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/stress_kalaana?retryWrites=true&w=majority";

const SEED_CONFESSIONS = [
  { text: "I told my therapist I was 'fine' and she laughed. She actually laughed.", author: "exposed", color: "blue", aging: "old", wallIdx: 0 },
  { text: "Reply 'sounds good!' to emails that absolutely do not sound good.", author: "corporate-me", color: "yellow", aging: "fresh", wallIdx: 0 },
  { text: "Every Sunday I plan to be a morning person. Every Monday I betray that person.", author: "5am liar", color: "green", aging: "faded", wallIdx: 1 },
  { text: "I told my houseplant I'd water it tomorrow. It is now day 9 of 'tomorrow'. We don't make eye contact.", author: "stationery goblin", color: "pink", aging: "torn", wallIdx: 2 },
  { text: "It is 2:47 AM. I am googling 'do penguins have knees'. They do. I am at peace.", author: "midnight-me", color: "purple", aging: "crumpled", wallIdx: 4 },
];

async function seed() {
  console.log("[mongo] connecting to:", MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@"));
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("[mongo] connected");

  const existing = await Confession.countDocuments();
  if (existing > 0) {
    console.log(`[seed] DB already has ${existing} confessions. Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`[seed] inserting ${SEED_CONFESSIONS.length} example confessions...`);
  await Confession.insertMany(SEED_CONFESSIONS);
  console.log("[seed] done.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
