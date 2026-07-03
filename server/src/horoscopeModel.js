// Mongoose schema for daily horoscope predictions.
// One document per zodiac sign per day.
// Admin can update predictions; the public site fetches today's.

import mongoose from "mongoose";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const horoscopeSchema = new mongoose.Schema(
  {
    sign: {
      type: String,
      required: true,
      enum: ZODIAC_SIGNS,
      index: true,
    },
    /** Date string in YYYY-M-D format (local time, matches the frontend's date hash) */
    date: {
      type: String,
      required: true,
      index: true,
    },
    prediction: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "prediction must be at most 500 characters"],
    },
  },
  { timestamps: true }
);

// Compound unique index: one prediction per sign per day
horoscopeSchema.index({ sign: 1, date: 1 }, { unique: true });

horoscopeSchema.statics = { ZODIAC_SIGNS };

const Horoscope = mongoose.model("Horoscope", horoscopeSchema);

export default Horoscope;
export { ZODIAC_SIGNS };
