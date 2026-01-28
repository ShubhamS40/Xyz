import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userModel from '../../../model/userModel.js';
import emailService from '../../admin/adminAuth/adminSentEmail.Controller.js';

class UserResetPasswordController {
  // Generate 6-digit OTP for password reset
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Forgot Password - Send reset OTP
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      // Get user
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists for security
        return res.json({
          success: true,
          message: 'If the email exists, a password reset code has been sent.',
        });
      }

      // Generate reset OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save reset OTP to database (using registration OTP table for now, or create a separate reset OTP table)
      await userModel.createRegistrationOtp(user.id, otpCode, expiresAt);

      // Send reset OTP email
      try {
        await emailService.sendPasswordResetOTP(email, otpCode);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send reset code. Please try again later.',
        });
      }

      res.json({
        success: true,
        message: 'Password reset code sent to your email. Please check your inbox.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process request',
        error: error.message,
      });
    }
  }

  // Reset Password - Verify OTP and update password
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;

      if (!email || !otp || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, OTP, new password, and confirm password are required',
        });
      }

      // Password confirmation validation
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
      }

      // Password validation (minimum 8 characters)
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Get user
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify OTP (using registration OTP verification for reset)
      const verified = await userModel.verifyRegistrationOtp(user.id, otp);
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset code',
        });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await userModel.updateUser(user.id, {
        passwordHash,
      });

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: error.message,
      });
    }
  }
}

export default new UserResetPasswordController();
