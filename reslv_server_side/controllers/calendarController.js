import { createOAuthClient, CALENDAR_SCOPES } from "../config/googleCalendar.js";
import { google } from "googleapis";
import User from "../models/User.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

export const getAuthUrl = (req, res) => {
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPES,
    state: req.user.id,
  });
  res.json({ url });
};

export const oauthCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${CLIENT_URL}/sprint-planner?calendar=denied`);
  }

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Extract email directly from the ID token payload — no extra API call needed.
    let googleEmail = null;
    if (tokens.id_token) {
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split(".")[1], "base64").toString("utf8"),
      );
      googleEmail = payload.email || null;
    }

    const userId = state;
    const update = {
      "googleCalendar.connected": true,
      "googleCalendar.accessToken": tokens.access_token,
      "googleCalendar.expiryDate": tokens.expiry_date,
      "googleCalendar.googleEmail": googleEmail,
    };
    if (tokens.refresh_token) {
      update["googleCalendar.refreshToken"] = tokens.refresh_token;
    }

    await User.findByIdAndUpdate(userId, update);
    res.redirect(`${CLIENT_URL}/sprint-planner?calendar=connected`);
  } catch (err) {
    console.error("Google OAuth callback error:", err.message);
    res.redirect(`${CLIENT_URL}/sprint-planner?calendar=error`);
  }
};

export const getStatus = async (req, res) => {
  const user = await User.findById(req.user.id).select("googleCalendar");
  res.json({
    connected: !!user?.googleCalendar?.connected,
    googleEmail: user?.googleCalendar?.googleEmail || null,
  });
};

export const disconnect = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user?.googleCalendar?.accessToken) {
    try {
      const oauth2Client = createOAuthClient();
      await oauth2Client.revokeToken(user.googleCalendar.accessToken);
    } catch (err) {
      console.warn("Token revoke warning:", err.message);
    }
  }

  await User.findByIdAndUpdate(req.user.id, {
    googleCalendar: { connected: false },
  });
  res.json({ disconnected: true });
};

async function getAuthedClientForUser(userId) {
  const user = await User.findById(userId);
  if (!user?.googleCalendar?.connected || !user.googleCalendar.refreshToken) {
    const err = new Error("This user hasn't connected Google Calendar");
    err.status = 400;
    throw err;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.googleCalendar.accessToken,
    refresh_token: user.googleCalendar.refreshToken,
    expiry_date: user.googleCalendar.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    const update = {};
    if (tokens.access_token) update["googleCalendar.accessToken"] = tokens.access_token;
    if (tokens.expiry_date) update["googleCalendar.expiryDate"] = tokens.expiry_date;
    if (Object.keys(update).length) {
      await User.findByIdAndUpdate(userId, update);
    }
  });

  return oauth2Client;
}

export const getAvailability = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user.id;
    const start = req.query.start ? new Date(req.query.start) : new Date();
    const end = req.query.end
      ? new Date(req.query.end)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const oauth2Client = await getAuthedClientForUser(targetUserId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busy = data.calendars?.primary?.busy || [];
    res.json({ userId: targetUserId, start, end, busy });
  } catch (error) {
    console.error("getAvailability error:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};