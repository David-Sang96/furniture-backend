import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { Otp, User } from '@prisma/client';
import { errorCode } from '../config/errorCode';
import {
  getUserById,
  getUserByPhoneNumber,
  updateUser,
} from '../services/authService';
import { checkAccountStatus, checkUserNotExist } from '../utils/auth';
import { handleError, handleValidationResult } from '../utils/errorHandler';
import { generateJwtTokens, generateToken } from '../utils/generate';
import { handleOtpRequest } from '../utils/handleOtpRequest';
import { handleOtpVerification } from '../utils/handleOtpVerification';
import { handlePasswordConfirmation } from '../utils/handlePasswordConfirmation';
import { handleUpatePassword } from '../utils/handleUpdatePassword';

interface CustomJWtPayload extends JwtPayload {
  userId: number;
  phone: string;
}

export const register = [
  body('phone', 'Invalid phone number')
    .trim()
    .notEmpty()
    .matches(/^[0-9]+$/)
    .isLength({ min: 5, max: 12 }),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const result = (await handleOtpRequest({
      phoneNumber: req.body.phone,
      next,
      action: 'register',
    })) as Otp;

    res.json({
      message: `OTP has been sent to 01${result.phone}`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

export const verifyOtp = [
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
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const { phone, otp, token } = req.body;
    const result = (await handleOtpVerification({
      phoneNumber: phone,
      otp,
      token,
      action: 'register',
    })) as Otp;

    res.json({
      message: 'Verified successfully',
      phone: `01${result.phone}`,
      token: result.verifyToken,
    });
  },
];

export const confirmUserRegistration = [
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
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const { phone, password, token } = req.body;
    const result = await handlePasswordConfirmation({
      phoneNumber: phone,
      password,
      token,
      action: 'register',
    });

    res
      .cookie('accessToken', result?.accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .cookie('refreshToken', result?.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .status(201)
      .json({
        success_message: 'Account created successfully',
        userId: result?.user.id,
      });
  },
];

export const login = [
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
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const password = req.body.password;
    let phone = req.body.phone;
    if (phone.slice(0, 2) === '01') {
      phone = phone.slice(2);
    }

    const user = (await getUserByPhoneNumber(phone)) as User;
    checkUserNotExist(user);

    // check if account is freeze when wrong password count is over limit
    checkAccountStatus(user!.status);

    const isSameDate =
      new Date(user!.updatedAt).toLocaleDateString() ===
      new Date().toLocaleDateString();

    // check password is valid
    const isPasswordMatch = await bcrypt.compare(password, user!.password);
    if (!isPasswordMatch) {
      if (!isSameDate) {
        // if not the same day then reset count to 1
        await updateUser(user!.id, { errorLoginCount: 1 });
      } else {
        if (user!.errorLoginCount === 2) {
          // if same date and count is 2, update status
          await updateUser(user!.id, { status: 'FREEZE' });
        } else {
          // if same date and count is less than 2 , increase count
          await updateUser(user!.id, { errorLoginCount: { increment: 1 } });
        }
      }
      return next(handleError(req.t('wrongPassword'), 401));
    }

    const { accessToken, refreshToken } = generateJwtTokens(user);

    await updateUser(user!.id, { refreshToken, errorLoginCount: 0 });

    res
      .cookie('accessToken', accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .cookie('refreshToken', refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .json({
        message: 'Logged in successfully',
        userId: user!.id,
        userInfo: {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
        },
      });
  },
];

export const logOut = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    return next(
      handleError(
        'Authentication failed. Refresh token is missing or invalid. Please log in again.',
        401,
        errorCode.unauthenticated
      )
    );
  }

  // verify refresh token
  let decoded: CustomJWtPayload;
  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET_KEY!
    ) as CustomJWtPayload;
  } catch (error: any) {
    return next(
      handleError(
        'Authentication failed. Refresh token is missing or invalid. Please log in again.',
        401,
        errorCode.unauthenticated
      )
    );
  }

  if (isNaN(decoded.userId)) {
    return next(
      handleError(
        'Authentication failed.Please log in again.',
        401,
        errorCode.unauthenticated
      )
    );
  }

  const user = await getUserById(decoded.userId);
  checkUserNotExist(user);

  if (user?.phone !== decoded.phone) {
    return next(
      handleError(
        'Authentication failed. Refresh token is missing or invalid. Please log in again.',
        401,
        errorCode.unauthenticated
      )
    );
  }

  // replace with randomToken to prevent hacker requesting access token with stolen refresh token, even after user logged out
  await updateUser(user.id, { refreshToken: generateToken() });

  res.clearCookie('accessToken', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  res.json({ message: 'Logged out successfully.See you soon.' });
};

export const forgetPassword = [
  body('phone', 'Invalid phone number')
    .trim()
    .notEmpty()
    .matches(/^[0-9]+$/)
    .isLength({ min: 5, max: 12 }),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const result: Otp = (await handleOtpRequest({
      phoneNumber: req.body.phone,
      next,
      action: 'forget-password',
    })) as Otp;

    res.json({
      message: `OTP has been sent to 01${result.phone} to reset password.`,
      phone: result.phone,
      token: result.rememberToken,
    });
  },
];

export const verifyOtpPassword = [
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
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const { phone, otp, token } = req.body;

    const result = (await handleOtpVerification({
      phoneNumber: phone,
      otp,
      token,
      action: 'forget-password',
    })) as Otp;

    res.json({
      message: 'Verified successfully',
      phone: result.phone,
      token: result.verifyToken,
    });
  },
];

export const resetPassword = [
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
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const { phone, password, token } = req.body;
    const result = await handlePasswordConfirmation({
      phoneNumber: phone,
      password,
      token,
      action: 'reset-password',
    });

    res
      .cookie('accessToken', result?.accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .cookie('refreshToken', result?.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .json({
        message: 'Password reset successfully',
        userId: result?.user.id,
      });
  },
];

export const updatePassword = [
  body('oldPassword', 'Old password must be at least 8 characters')
    .trim()
    .notEmpty()
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
    .withMessage('Old password must contain at least one letters and one digit')
    .isLength({ min: 8 }),
  body('newPassword', 'Password must be at least 8 characters')
    .trim()
    .notEmpty()
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/)
    .withMessage('Password must contain at least one letters and one digit')
    .isLength({ min: 8 }),

  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const { oldPassword, newPassword } = req.body;
    const userId = req.userId;
    const user = await getUserById(Number(userId));
    checkUserNotExist(user);

    const result = await handleUpatePassword({
      phoneNumber: user!.phone,
      oldPassword,
      newPassword,
    });

    res
      .cookie('accessToken', result?.accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .cookie('refreshToken', result?.refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
      .json({
        message: 'Password updated successfully',
      });
  },
];

export const authCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserNotExist(user);

  res.json({
    message: 'Authenticated user',
    userId: user?.id,
    username: `${user?.firstName} ${user?.lastName}`,
    image: user?.image,
  });
};
