const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendInviteEmail = async (toEmail, inviteToken, companyName) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${inviteToken}`;

  await transporter.sendMail({
    from: '"Reslv Workspace" <noreply@reslv.io>',
    to: toEmail,
    subject: `You've been invited to join ${companyName} on Reslv`,
    html: `
      <h2>Welcome to Reslv</h2>
      <p>You have been invited to join the <strong>${companyName}</strong> workspace.</p>
      <a href="${inviteUrl}" style="padding: 10px 20px; background: #80A8FF; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
};
