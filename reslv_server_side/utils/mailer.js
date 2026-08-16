import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || "Reslv <onboarding@resend.dev>";

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return null;
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      console.error("Resend send error:", result.error);
    }
    return result;
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
// Team invite (existing — same signature/behavior, now sent via Resend)
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