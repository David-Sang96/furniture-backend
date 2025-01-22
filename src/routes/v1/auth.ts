import express from 'express';

import {
  confirmUserRegistration,
  forgetPassword,
  login,
  logOut,
  register,
  resetPassword,
  verifyOtp,
  verifyOtpPassword,
} from '../../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/confirm-password', confirmUserRegistration);
router.post('/login', login);
router.post('/logout', logOut);

router.post('/forget-password', forgetPassword);
router.post('/verify', verifyOtpPassword);
router.post('/reset-password', resetPassword);

export default router;
