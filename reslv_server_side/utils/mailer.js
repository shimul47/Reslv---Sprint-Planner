import nodemailer from "nodemailer";

// Configure your SMTP transporter
// Store these credentials in your .env file!
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInviteEmail = async (email, role, token) => {
  // The URL they will click to register and accept the invite
  const inviteLink = `${process.env.CLIENT_URL}/register?token=${token}`;

  const mailOptions = {
    from: '"Workspace Admin" <no-reply@yourcompany.com>',
    to: email,
    subject: "You've been invited to join the Workspace!",
    html: `
      <h2>You have been invited to join the team!</h2>
      <p>You have been assigned the role of <strong>${role}</strong>.</p>
      <p>Click the link below to set up your account and get started:</p>
      <a href="${inviteLink}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
        Accept Invitation
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: gray;">
        This link will expire in 7 days.
      </p>
    `,
  };

  return transporter.sendMail(mailOptions);
};
