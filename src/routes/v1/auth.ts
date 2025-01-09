import express from 'express';
import { body } from 'express-validator';

import {
  confirmPassword,
  login,
  register,
  verifyOtp,
} from '../../controllers/authController';

const router = express.Router();

router.post(
  '/register',
  [
    body('phone', 'Invalid phone number')
      .trim()
      .notEmpty()
      .matches(/^[0-9]+$/)
      .isLength({ min: 5, max: 12 }),
  ],
  register
);

router.post(
  '/verify-otp',
  [
    body('phone', 'Invalid phone number')
      .trim()
      .notEmpty()
      .matches(/^\d+$/)
      .isLength({ min: 5, max: 12 }),
    body('otp', 'Invalid OTP')
      .trim()
      .notEmpty()
      .matches(/^\d+$/)
      .isLength({ min: 6, max: 6 }),
    body('token', 'Invalid token').trim().notEmpty().escape(), // escape does replacing with html entities
  ],
  verifyOtp
);
router.post('/confirm-password', confirmPassword);
router.post('/login', login);

export default router;
