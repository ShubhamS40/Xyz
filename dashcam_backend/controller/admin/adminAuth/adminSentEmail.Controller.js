import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    // Validate credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ EMAIL_USER or EMAIL_PASSWORD not set in .env');
      console.error('Please configure email settings in your .env file');
    }

    // Hostinger SMTP Configuration
    const port = parseInt(process.env.EMAIL_PORT || '465');
    
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
      port: port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('📧 Email Service Initialized');
    console.log('   Host:', process.env.EMAIL_HOST || 'smtp.hostinger.com');
    console.log('   Port:', port);
    console.log('   User:', process.env.EMAIL_USER);
    
    // Test connection on startup
    this.testConnection();
  }

  // Send registration OTP email
  async sendRegistrationOTP(email, otpCode) {
    console.log(`\n📤 Attempting to send registration OTP to: ${email}`);
    
    const mailOptions = {
      from: `"OKDriver" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Registration OTP - OKDriver',
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 0 0 30px 0; text-align: center; border-bottom: 1px solid #000000;">
                            <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">OKDriver</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 0; text-align: center;">
                            <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: 500;">Registration OTP</h2>
                            <p style="color: #666666; margin: 0 0 40px 0; font-size: 16px; line-height: 1.5;">
                                Your verification code is:
                            </p>
                            
                            <!-- OTP Box -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="background-color: #000000; border-radius: 4px; padding: 20px 40px; display: inline-block;">
                                            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">${otpCode}</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px;">
                                Valid for 10 minutes
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 0 0 0; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                © 2025 OKDriver. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
      text: `OKDriver - Registration OTP: ${otpCode} (Valid for 10 minutes)`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Registration OTP sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   Response:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send registration OTP');
      console.error('   Error:', error.message);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  // Send login OTP email
  async sendLoginOTP(email, otpCode) {
    console.log(`\n📤 Attempting to send login OTP to: ${email}`);
    
    const mailOptions = {
      from: `"OKDriver" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Login OTP - OKDriver',
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 0 0 30px 0; text-align: center; border-bottom: 1px solid #000000;">
                            <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">OKDriver</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 0; text-align: center;">
                            <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: 500;">Login OTP</h2>
                            <p style="color: #666666; margin: 0 0 40px 0; font-size: 16px; line-height: 1.5;">
                                Your verification code is:
                            </p>
                            
                            <!-- OTP Box -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="background-color: #000000; border-radius: 4px; padding: 20px 40px; display: inline-block;">
                                            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">${otpCode}</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px;">
                                Valid for 10 minutes
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 0 0 0; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                © 2025 OKDriver. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
      text: `OKDriver - Login OTP: ${otpCode} (Valid for 10 minutes)`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Login OTP sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   Response:', info.response);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send login OTP');
      console.error('   Error:', error.message);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      console.log('\n🔍 Testing email server connection...');
      await this.transporter.verify();
      console.log('✅ Email server connected successfully!\n');
      return true;
    } catch (error) {
      console.error('❌ Email server connection failed!');
      console.error('   Error:', error.message);
      return false;
    }
  }

  // Send password reset OTP email
  async sendPasswordResetOTP(email, otpCode) {
    console.log(`\n📤 Attempting to send password reset OTP to: ${email}`);
    
    const mailOptions = {
      from: `"OKDriver" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Code - OKDriver',
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 0 0 30px 0; text-align: center; border-bottom: 1px solid #000000;">
                            <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">OKDriver</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 0; text-align: center;">
                            <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: 500;">Password Reset Code</h2>
                            <p style="color: #666666; margin: 0 0 40px 0; font-size: 16px; line-height: 1.5;">
                                You requested to reset your password. Use the code below to reset your password:
                            </p>
                            
                            <!-- OTP Box -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="background-color: #000000; border-radius: 4px; padding: 20px 40px; display: inline-block;">
                                            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">${otpCode}</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #999999; margin: 30px 0 0 0; font-size: 14px;">
                                Valid for 15 minutes
                            </p>
                            <p style="color: #666666; margin: 20px 0 0 0; font-size: 14px;">
                                If you didn't request this, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 0 0 0; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                © 2025 OKDriver. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
      text: `OKDriver - Password Reset Code: ${otpCode} (Valid for 15 minutes)`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset OTP sent successfully!');
      console.log('   Message ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset OTP');
      console.error('   Error:', error.message);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  // Send welcome email to user
  async sendWelcomeEmail(email, companyName, companyType) {
    console.log(`\n📤 Attempting to send welcome email to: ${email}`);
    
    const displayName = companyName || 'User';
    
    const mailOptions = {
      from: `"OKDriver Team" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to OKDriver - Safer Driving Solutions',
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 0 0 30px 0; text-align: center; border-bottom: 1px solid #000000;">
                            <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: -0.5px;">OKDriver</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 0; text-align: center;">
                            <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: 500;">Welcome to OKDriver!</h2>
                            <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                                Dear ${displayName},
                            </p>
                            <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                                Welcome to the OKDriver ecosystem for safer driving solutions! We're thrilled to have you join our community.
                            </p>
                            <p style="color: #666666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                                Your account has been successfully registered${companyName ? ` for ${companyName}` : ''}${companyType ? ` as ${companyType}` : ''}. You can now access all the features and services that OKDriver has to offer.
                            </p>
                            <p style="color: #666666; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                                If you have any questions or need assistance, please don't hesitate to contact our support team. We're here to help!
                            </p>
                            <p style="color: #666666; margin: 0; font-size: 16px; line-height: 1.6;">
                                Best regards,<br>
                                <strong>The OKDriver Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 0 0 0; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="color: #999999; margin: 0; font-size: 12px;">
                                © 2025 OKDriver. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
      text: `Welcome to OKDriver! Dear ${displayName}, Welcome to the OKDriver ecosystem for safer driving solutions! We're thrilled to have you join our community. Your account has been successfully registered${companyName ? ` for ${companyName}` : ''}${companyType ? ` as ${companyType}` : ''}. Best regards, The OKDriver Team`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully!');
      console.log('   Message ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send welcome email');
      console.error('   Error:', error.message);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  // Send test email
  async sendTestEmail(toEmail) {
    console.log(`\n📤 Sending test email to: ${toEmail}`);
    
    const mailOptions = {
      from: `"OKDriver" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Test Email - OKDriver',
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
                    <tr>
                        <td style="padding: 0 0 30px 0; text-align: center; border-bottom: 1px solid #000000;">
                            <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 600;">OKDriver</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 0; text-align: center;">
                            <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px; font-weight: 500;">Test Email</h2>
                            <p style="color: #666666; margin: 0; font-size: 16px;">Email configuration is working correctly!</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `,
      text: 'OKDriver - Test email is working!',
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully!');
      console.log('   Message ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send test email');
      console.error('   Error:', error.message);
      throw error;
    }
  }
}

export default new EmailService();