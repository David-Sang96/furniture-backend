import express from 'express';
import { body } from 'express-validator';

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
router.post(
  '/confirm-password',
  [
    body('phone', 'Invalid phone number')
      .trim()
      .notEmpty()
      .matches('^[0-9]+$')
      .isLength({ min: 5, max: 12 }),
    body('password', 'Password must be at least 8 characters')
      .trim()
      .notEmpty()
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
      .withMessage('Password must contain at least one letter and one digit')
      .isLength({ min: 8 }),
    body('token', 'Invalid token').trim().notEmpty().escape(),
  ],
  confirmUserRegistration
);

router.post(
  '/login',
  [
    body('phone', 'Invalid phone number')
      .trim()
      .notEmpty()
      .matches(/^[0-9]+$/)
      .isLength({ min: 5, max: 12 }),
    body('password', 'Password must be at least 8 characters')
      .trim()
      .notEmpty()
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
      .withMessage('Password must contain at least one letter and one digit')
      .isLength({ min: 8 }),
  ],
  login
);

router.post('/logout', logOut);

router.post(
  '/forget-password',
  [
    body('phone', 'Invalid phone number')
      .trim()
      .notEmpty()
      .matches(/^[0-9]+$/)
      .isLength({ min: 5, max: 12 }),
  ],
  forgetPassword
);

router.post(
  '/verify',
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
    body('token', 'Invalid token').trim().notEmpty().escape(),
  ],
  verifyOtpPassword
);

router.post(
  '/reset-password',
  [
    body('token', 'Invalid token').trim().notEmpty().escape(),
    body('phone', 'Invalid phone number')
      .trim()
      .notEmpty()
      .matches(/^\d+$/)
      .isLength({ min: 5, max: 12 }),
    body('password', 'Password must be at least 8 characters')
      .trim()
      .notEmpty()
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
      .withMessage('Password must contain at least one letters and one digit')
      .isLength({ min: 8 }),
  ],
  resetPassword
);

export default router;
