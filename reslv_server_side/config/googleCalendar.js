import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();
console.log("CLIENT_ID loaded:", process.env.GOOGLE_CLIENT_ID);
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Add them to .env before hitting /api/calendar routes.",
  );
}

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI || "http://localhost:5000/api/calendar/oauth/callback",
  );
}