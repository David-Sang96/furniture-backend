import express from 'express';

import {
  authCheck,
  confirmUserRegistration,
  forgetPassword,
  login,
  logOut,
  register,
  resetPassword,
  updatePassword,
  verifyOtp,
  verifyOtpPassword,
} from '../../controllers/authController';
import { isAuth } from '../../middlewares/auth';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/confirm-password', confirmUserRegistration);
router.post('/login', login);
router.post('/logout', logOut);

router.post('/forget-password', forgetPassword);
router.post('/verify', verifyOtpPassword);
router.post('/reset-password', resetPassword);
router.post('/update-password', isAuth, updatePassword);

router.get('/auth-check', isAuth, authCheck);

export default router;
