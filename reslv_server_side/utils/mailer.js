import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInviteEmail = async (email, role, token, companyName) => {
  const inviteLink = `${process.env.CLIENT_URL}/accept-invite?token=${token}`;

  const mailOptions = {
    from:
      process.env.SMTP_FROM || `"Reslv Workspace" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `You've been invited to join ${companyName || "Reslv"}`,
    html: `
      <h2>You have been invited to join the team</h2>
      <p>You were assigned the role of <strong>${role}</strong>.</p>
      <p>Click the link below to set up your account:</p>
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
