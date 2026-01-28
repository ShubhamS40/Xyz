import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userModel from '../../../model/userModel.js';
import emailService from '../../admin/adminAuth/adminSentEmail.Controller.js';

class UserRegistrationController {
  // User Registration
  async register(req, res) {
    try {
      const { companyName, email, companyType, password, confirmPassword } = req.body;

      // Validation
      if (!email || !password || !companyType) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and company type are required',
        });
      }

      // Password confirmation validation
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
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

      // Company type validation
      const validCompanyTypes = [
        'Fleet Operator',
        'Enterprise',
        'University',
        'School',
        'College',
        'Individual',
        'Other'
      ];
      if (!validCompanyTypes.includes(companyType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company type',
        });
      }

      // Check if email is already registered
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user (active and verified)
      const user = await userModel.createUser(
        email,
        passwordHash,
        companyName || null,
        companyType
      );

      // Activate user and mark email as verified immediately
      await userModel.updateUser(user.id, {
        isActive: true,
        emailVerified: true,
      });

      // Send welcome email from OKDriver team
      try {
        await emailService.sendWelcomeEmail(email, companyName, companyType);
      } catch (welcomeEmailError) {
        console.error('Welcome email sending failed:', welcomeEmailError);
        // Don't fail registration if welcome email fails
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful. Welcome to OKDriver!',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            companyName: user.companyName,
            companyType: user.companyType,
            emailVerified: true,
          },
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
}

export default new UserRegistrationController();
