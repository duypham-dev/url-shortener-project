import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Initialize transporter
// In production, use your actual SMTP details loaded from environment configs
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || '',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_PORT === '465', // if using true port is 465, false is 587
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
  const mailOptions = {
    from: '"ShortLink Support" <noreply@shortlink.com>',
    to,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>We received a request to reset your password.</p>
      <p>Click the link below to reset it. This link is valid for 15 minutes.</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
