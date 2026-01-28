import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import adminModel from '../../../model/adminModel.js';
import emailService from './adminSentEmail.Controller.js';

class AdminLoginController {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Admin Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Get admin
      const admin = await adminModel.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if email is verified
      if (!admin.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Email not verified. Please verify your email first.',
          requiresVerification: true,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Please contact administrator.',
        });
      }

      // Generate OTP for login
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP
      await adminModel.createLoginOtp(admin.id, otpCode, expiresAt);

      // Send OTP email
      try {
        await emailService.sendLoginOTP(email, otpCode);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again later.',
        });
      }

      res.json({
        success: true,
        message: 'Login OTP sent to your email. Please verify to complete login.',
        data: {
          adminId: admin.id,
          email: admin.email,
          requiresOTP: true,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message,
      });
    }
  }

  // Verify Login OTP
  async verifyLoginOTP(req, res) {
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

      // Verify OTP
      const verified = await adminModel.verifyLoginOtp(admin.id, otp);
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { adminId: admin.id, email: admin.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            emailVerified: admin.emailVerified,
          },
        },
      });
    } catch (error) {
      console.error('Login OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed',
        error: error.message,
      });
    }
  }

  // Resend Login OTP
  async resendLoginOTP(req, res) {
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

      // Generate new OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Save OTP
      await adminModel.createLoginOtp(admin.id, otpCode, expiresAt);

      // Send OTP email
      try {
        await emailService.sendLoginOTP(email, otpCode);
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
      console.error('Resend login OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP',
        error: error.message,
      });
    }
  }

  // Get current admin profile (protected route)
  async getProfile(req, res) {
    try {
      const adminId = req.admin?.adminId;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const admin = await adminModel.getAdminById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      res.json({
        success: true,
        data: {
          id: admin.id,
          email: admin.email,
          emailVerified: admin.emailVerified,
          isActive: admin.isActive,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message,
      });
    }
  }
}

export default new AdminLoginController();