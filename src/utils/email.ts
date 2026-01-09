import nodemailer from 'nodemailer';

/**
 * Email Configuration using Nodemailer
 * Configure your email service credentials in .env file
 */

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Generate 4-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send OTP email to user
 */
export const sendOTPEmail = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Student Ticketing System'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Email Verification - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4F46E5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .otp-box {
              background-color: white;
              border: 2px dashed #4F46E5;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              border-radius: 5px;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #4F46E5;
              letter-spacing: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Thank you for registering with Student Ticketing System!</p>
              <p>To complete your registration, please use the following One-Time Password (OTP):</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This OTP is valid for <strong>30 seconds</strong></li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
              
              <p>Best regards,<br>Student Ticketing System Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send welcome email after successful verification
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<void> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Student Ticketing System'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Student Ticketing System!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #10B981;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome!</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your email has been successfully verified!</p>
              <p>You can now login and start using the Student Ticketing System.</p>
              <p>If you have any questions or need assistance, feel free to create a support ticket.</p>
              <p>Best regards,<br>Student Ticketing System Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email, it's not critical
  }
};
