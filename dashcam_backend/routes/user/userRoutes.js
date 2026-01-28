import express from 'express';
import userRegistrationController from '../../controller/user/userAuth/user.Registration.Controller.js';
import userLoginController from '../../controller/user/userAuth/userLogin.Controller.js';
import userResetPasswordController from '../../controller/user/userAuth/userRestPassword.Controller.js';
import { addDevice } from '../../controller/user/userDevice/addDevice.Controller.js';
import { getAllDevices } from '../../controller/user/userDevice/getallDevice.Controller.js';
import { getUserTrack } from '../../controller/user/userMonitor/userTrack/getUserTrack.Controller.js';

import { authenticateUser } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ==================== Registration Routes ====================
router.post(
  '/register', 
  userRegistrationController.register.bind(userRegistrationController)
);

// ==================== Login Routes ====================
router.post(
  '/login', 
  userLoginController.login.bind(userLoginController)
);

// ==================== Password Reset Routes ====================
router.post(
  '/forgot-password',
  userResetPasswordController.forgotPassword.bind(userResetPasswordController)
);

router.post(
  '/reset-password',
  userResetPasswordController.resetPassword.bind(userResetPasswordController)
);

// ==================== Protected Routes ====================
router.get(
  '/profile', 
  authenticateUser, 
  userLoginController.getProfile.bind(userLoginController)
);

// ==================== User Device Routes ====================
router.get(
  '/devices',
  authenticateUser,
  getAllDevices
);

router.post(
  '/device',
  authenticateUser,
  addDevice
);

// ==================== User Track (History) Routes ====================
router.get(
  '/tracks',
  authenticateUser,
  getUserTrack
);


export default router;

