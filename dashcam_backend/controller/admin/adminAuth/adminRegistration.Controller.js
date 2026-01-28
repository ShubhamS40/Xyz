import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import adminModel from '../../../model/adminModel.js';
import emailService from './adminSentEmail.Controller.js';

class AdminRegistrationController {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Admin Registration
  async register(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      // Password validation (minimum 8 characters)
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Check if email is already registered
      const existingAdmin = await adminModel.getAdminByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin (unverified)
      const admin = await adminModel.createAdmin(email, passwordHash);

      // Generate OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await adminModel.createRegistrationOtp(admin.id, otpCode, expiresAt);

      // Send OTP email
      try {
        await emailService.sendRegistrationOTP(email, otpCode);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail registration if email fails
        // User can resend OTP
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for OTP verification.',
        data: {
          adminId: admin.id,
          email: admin.email,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message,
      });
    }
  }

  // Verify Registration OTP
  async verifyRegistrationOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required',
        });
      }

      // Get admin
      const admin = await adminModel.getAdminByEmail(email);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      if (admin.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified',
        });
      }

      // Verify OTP
      const verified = await adminModel.verifyRegistrationOtp(admin.id, otp);
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      // Activate admin and mark email as verified
      await adminModel.updateAdmin(admin.id, {
        isActive: true,
        emailVerified: true,
      });

      // Generate JWT token
      const token = jwt.sign(
        { adminId: admin.id, email: admin.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            emailVerified: true,
          },
        },
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: error.message,
      });
    }
  }

  // Resend Registration OTP
  async resendRegistrationOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const admin = await adminModel.getAdminByEmail(email);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      if (admin.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified',
        });
      }

      // Generate new OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Save OTP
      await adminModel.createRegistrationOtp(admin.id, otpCode, expiresAt);

      // Send OTP email
      try {
        await emailService.sendRegistrationOTP(email, otpCode);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again later.',
        });
      }

      res.json({
        success: true,
        message: 'OTP resent successfully. Please check your email.',
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP',
        error: error.message,
      });
    }
  }
}

export default new AdminRegistrationController();