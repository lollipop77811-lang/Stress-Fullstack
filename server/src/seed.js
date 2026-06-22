// Optional seed script — populates a few example confessions on wall 0
// so the first wall isn't completely empty on a fresh DB launch.
// Run with: npm run seed
//
// All seeds go on wall 0 (wallIdx: 0). New confessions from real users
// will fill wall 0, then auto-spawn wall 1, wall 2, etc.

import "dotenv/config";
import mongoose from "mongoose";
import Confession from "./confessionModel.js";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/stress_kalaana?retryWrites=true&w=majority";

const SEED_CONFESSIONS = [
  { text: "I told my therapist I was 'fine' and she laughed. She actually laughed.", author: "exposed", color: "blue", aging: "old", wallIdx: 0 },
  { text: "Reply 'sounds good!' to emails that absolutely do not sound good.", author: "corporate-me", color: "yellow", aging: "fresh", wallIdx: 0 },
  { text: "Every Sunday I plan to be a morning person. Every Monday I betray that person.", author: "5am liar", color: "green", aging: "faded", wallIdx: 0 },
  { text: "I told my houseplant I'd water it tomorrow. It is now day 9 of 'tomorrow'.", author: "stationery goblin", color: "pink", aging: "torn", wallIdx: 0 },
  { text: "It is 2:47 AM. I am googling 'do penguins have knees'. They do.", author: "midnight-me", color: "purple", aging: "crumpled", wallIdx: 0 },
  { text: "I've been pretending to understand my job for 3 years. Nobody has noticed.", author: "anon", color: "orange", aging: "fresh", wallIdx: 0 },
  { text: "I have 3,000 unread messages. I'm not even slightly curious.", author: "ghost of group chat past", color: "yellow", aging: "faded", wallIdx: 0 },
  { text: "Currently spiraling. Will update. Or won't. Either way.", author: "deep sigh", color: "pink", aging: "crumpled", wallIdx: 0 },
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

  console.log(`[seed] inserting ${SEED_CONFESSIONS.length} example confessions on wall 0...`);
  await Confession.insertMany(SEED_CONFESSIONS);
  console.log("[seed] done. Wall 1 now has " + SEED_CONFESSIONS.length + " confessions.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
