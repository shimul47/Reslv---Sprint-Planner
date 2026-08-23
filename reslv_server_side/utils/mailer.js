import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ---------------------------------------------------------------------
// Resend — disabled for now. Resend's sandbox sender (onboarding@resend.dev)
// can only deliver to the Resend account's own verified email, so nothing
// sent to a real invitee/customer address goes through until a sending
// domain is verified in the Resend dashboard (planned once this is hosted).
// Left in place, commented out, to swap back in at that point.
// ---------------------------------------------------------------------
// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);
// const RESEND_FROM = process.env.RESEND_FROM || "Reslv <onboarding@resend.dev>";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

// In local dev, force every send to your own inbox instead of the real
// recipient — keeps test runs from emailing real customers/invitees.
const DEV_REDIRECT_TO = process.env.EMAIL_DEV_REDIRECT_TO;
const isProduction = process.env.NODE_ENV === "production";

async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`SMTP credentials not set — skipping email "${subject}" to ${to}`);
    return null;
  }

  const redirectDev = !isProduction && DEV_REDIRECT_TO;
  const actualTo = redirectDev ? DEV_REDIRECT_TO : to;
  const actualSubject = redirectDev ? `[DEV → ${to}] ${subject}` : subject;

  try {
    return await transporter.sendMail({
      from: FROM,
      to: actualTo,
      subject: actualSubject,
      html,
    });

    // --- Resend equivalent (swap back in once a domain is verified) ---
    // const result = await resend.emails.send({
    //   from: RESEND_FROM,
    //   to: actualTo,
    //   subject: actualSubject,
    //   html,
    // });
    // if (result.error) {
    //   console.error("Resend send error:", result.error);
    // }
    // return result;
  } catch (err) {
    // Email failures should never break the request they're attached to —
    // log and move on rather than throwing.
    console.error("sendEmail failed:", err.message);
    return null;
  }
}

function wrapper(bodyHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      ${bodyHtml}
      <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
        Sent by Reslv — Ticketing & Sprint Planning
      </p>
    </div>
  `;
}

function button(href, label) {
  return `
    <a href="${href}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
      ${label}
    </a>
  `;
}

// ---------------------------------------------------------------------
// Team invite
// ---------------------------------------------------------------------
export const sendInviteEmail = async (email, role, token, companyName) => {
  const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${token}`;

  return sendEmail({
    to: email,
    subject: `You've been invited to join ${companyName || "Reslv"}`,
    html: wrapper(`
      <h2>You have been invited to join the team</h2>
      <p>You were assigned the role of <strong>${role}</strong>.</p>
      <p>Click the link below to set up your account:</p>
      ${button(inviteLink, "Accept Invitation")}
      <p style="margin-top: 20px; font-size: 12px; color: gray;">
        This link will expire in 7 days.
      </p>
    `),
  });
};

// ---------------------------------------------------------------------
// Ticket lifecycle
// ---------------------------------------------------------------------
export const sendTicketCreatedEmail = async (email, { ticketNumber, subject, companyName }) => {
  if (!email) return null;
  return sendEmail({
    to: email,
    subject: `We've received your request — ${ticketNumber}`,
    html: wrapper(`
      <h2>Your support ticket has been created</h2>
      <p>Ticket <strong>${ticketNumber}</strong>: "${subject}"</p>
      <p>${companyName || "Our team"} will get back to you shortly. You can reply to this ticket any time from your support portal.</p>
    `),
  });
};

export const sendTicketResolvedEmail = async (email, { ticketNumber, subject }) => {
  if (!email) return null;
  return sendEmail({
    to: email,
    subject: `Resolved — ${ticketNumber}`,
    html: wrapper(`
      <h2>Your ticket has been resolved</h2>
      <p>Ticket <strong>${ticketNumber}</strong>: "${subject}" has been marked as resolved.</p>
      <p>If this didn't fully solve your issue, just reply to reopen it.</p>
    `),
  });
};

// ---------------------------------------------------------------------
// Billing lifecycle
// ---------------------------------------------------------------------
export const sendSubscriptionUpdatedEmail = async (email, { plan, billingCycle, status }) => {
  if (!email) return null;
  return sendEmail({
    to: email,
    subject: `Your Reslv subscription is now ${plan}`,
    html: wrapper(`
      <h2>Subscription updated</h2>
      <p>Your company's plan is now <strong>${plan}</strong>${billingCycle ? ` (billed ${billingCycle})` : ""}.</p>
      <p>Status: ${status}</p>
    `),
  });
};

// ---------------------------------------------------------------------
// Sprint Planner
// ---------------------------------------------------------------------
export const sendCalendarNudgeEmail = async (email, { name, companyName }) => {
  if (!email) return null;
  const link = `${process.env.CLIENT_URL}/sprint-planner`;
  return sendEmail({
    to: email,
    subject: `${companyName || "Your team"} would like you to connect Google Calendar`,
    html: wrapper(`
      <h2>Connect your calendar</h2>
      <p>Hi ${name || "there"}, a sprint planner asked for a nudge — connecting your Google Calendar
      lets them plan sprint capacity around your real availability instead of guessing.</p>
      ${button(link, "Connect Google Calendar")}
    `),
  });
};

export const sendSubscriptionCanceledEmail = async (email) => {
  if (!email) return null;
  return sendEmail({
    to: email,
    subject: "Your Reslv subscription has been canceled",
    html: wrapper(`
      <h2>Subscription canceled</h2>
      <p>Your company has been moved back to the Free plan. You can resubscribe any time from Billing.</p>
    `),
  });
};
