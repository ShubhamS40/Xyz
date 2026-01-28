import express from 'express';
import adminRegistrationController from '../../controller/admin/adminAuth/adminRegistration.Controller.js';
import adminLoginController from '../../controller/admin/adminAuth/adminLogin.Controller.js';
import { authenticateAdmin } from '../../middleware/authMiddleware.js';
import adminDeviceRoutes from './adminDevice/adminDeviceRoutes.js';

const router = express.Router();

// ==================== Registration Routes ====================
router.post(
  '/register', 
  adminRegistrationController.register.bind(adminRegistrationController)
);

router.post(
  '/verify-registration-otp', 
  adminRegistrationController.verifyRegistrationOTP.bind(adminRegistrationController)
);

router.post(
  '/resend-registration-otp', 
  adminRegistrationController.resendRegistrationOTP.bind(adminRegistrationController)
);

// ==================== Login Routes ====================
router.post(
  '/login', 
  adminLoginController.login.bind(adminLoginController)
);

router.post(
  '/verify-login-otp', 
  adminLoginController.verifyLoginOTP.bind(adminLoginController)
);

router.post(
  '/resend-login-otp', 
  adminLoginController.resendLoginOTP.bind(adminLoginController)
);

// ==================== Protected Routes ====================
router.get(
  '/profile', 
  authenticateAdmin, 
  adminLoginController.getProfile.bind(adminLoginController)
);

// ==================== Admin Device Routes ====================
router.use('/', adminDeviceRoutes);

export default router;