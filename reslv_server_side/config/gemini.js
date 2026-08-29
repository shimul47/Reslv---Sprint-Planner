import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "GEMINI_API_KEY is not set. Add it to your .env before hitting chatbot routes.",
  );
}

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
