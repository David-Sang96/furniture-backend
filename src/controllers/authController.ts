import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
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

interface CustomJWtPayload extends JwtPayload {
  userId: number;
  phone: string;
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

export const confirmUserRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    })
    .cookie('refreshToken', result?.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    .status(201)
    .json({
      message: 'Account created successfully',
      userId: result?.user.id,
    });
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    })
    .cookie('refreshToken', refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    .json({ message: 'Logged in successfully', userId: user!.id });
};

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
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ message: 'Logged out successfully.See you soon.' });
};

export const forgetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

export const verifyOtpPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    })
    .cookie('refreshToken', result?.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    .status(201)
    .json({
      message: 'Password reset successfully',
      userId: result?.user.id,
    });
};
