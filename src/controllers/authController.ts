import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt, { JwtPayload } from 'jsonwebtoken';
import moment from 'moment';

import { errorCode } from '../config/errorCode';
import {
  createOtp,
  createUser,
  getOtpByPhoneNumber,
  getUserById,
  getUserByPhoneNumber,
  updateOtp,
  updateUser,
} from '../services/authService';
import {
  checkAccountStatus,
  checkOtpLimitError,
  checkOtpRowExist,
  checkUserExist,
  checkUserNotExist,
} from '../utils/auth';
import { handleError } from '../utils/errorHandler';
import { generateToken } from '../utils/generate';

interface CustomJWtPayload extends JwtPayload {
  userId: number;
  phone: string;
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    return next(handleError(errorResult[0].msg));
  }

  let phone = req.body.phone;
  if (phone.slice(0, 2) === '01') {
    phone = phone.slice(2);
  }
  const user = await getUserByPhoneNumber(phone);
  checkUserExist(user);

  // OTP generate & call OTP sending API
  // const otp = generateOTP();
  const otp = 123456; // for testing
  const salt = await bcrypt.genSalt(10);
  const hashOtp = await bcrypt.hash(otp.toString(), salt);
  const token = generateToken();

  const isOtpExited = await getOtpByPhoneNumber(phone);
  let result;

  // check if user've already requested OTP
  if (!isOtpExited) {
    const otpData = {
      phone,
      otp: hashOtp,
      rememberToken: token,
      count: 1,
    };
    result = await createOtp(otpData);
  } else {
    const isSameDate =
      new Date(isOtpExited.updatedAt).toLocaleDateString() ===
      new Date().toLocaleDateString();

    // reset OTP count and error field
    if (!isSameDate) {
      const otpData = {
        otp: hashOtp,
        rememberToken: token,
        count: 1,
        error: 0,
      };
      result = await updateOtp(isOtpExited.id, otpData);
    }

    // check if user requesting OTP for more than 3 times in a day
    if (isOtpExited.count >= 3) {
      return next(
        handleError(
          'OTP is not allowed to request more than 3 times per day.',
          405,
          errorCode.overLimit
        )
      );
    } else {
      const otpData = {
        otp: hashOtp,
        rememberToken: token,
        count: { increment: 1 },
      };
      result = await updateOtp(isOtpExited.id, otpData);
    }
  }

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
  const { phone, otp, token } = req.body;

  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    return next(handleError(errorResult[0].msg));
  }

  const user = await getUserByPhoneNumber(phone);
  checkUserExist(user);

  const otpRow = await getOtpByPhoneNumber(phone);
  checkOtpRowExist(otpRow);

  const isSameDate =
    new Date(otpRow!.updatedAt).toLocaleDateString() ===
    new Date().toLocaleDateString();

  // check if user verifying otp over limit of 5 times in a day
  checkOtpLimitError(isSameDate, otpRow!.error);

  // check if token is valid
  if (token !== otpRow?.rememberToken) {
    await updateOtp(otpRow!.id, { error: 5 });
    return next(handleError('Invalid token'));
  }

  // check if OTP issue time is more than 2 minutes
  const isOTPExpired = moment().diff(otpRow!.updatedAt, 'minutes') > 2;
  if (isOTPExpired) {
    return next(
      handleError('OTP is already expired', 403, errorCode.otpExpired)
    );
  }

  // check if OTP is correct
  const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
  if (!isMatchOtp) {
    // if first time wrong OTP for today then reset it, else increase number in the error field
    if (!isSameDate) {
      await updateOtp(otpRow!.id, { error: 1 });
    } else {
      await updateOtp(otpRow!.id, { error: { increment: 1 } });
      return next(handleError('OTP is incorrect', 401));
    }
  }

  // After validation passed
  const verifyToken = generateToken().toString();
  const otpData = {
    verifyToken,
    error: 0,
    count: 1,
  };
  const result = await updateOtp(otpRow!.id, otpData);

  res.json({
    message: 'Verified successfully',
    phone: result.phone,
    token: result.verifyToken,
  });
};

export const confirmUserRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { phone, password, token } = req.body;

  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    return next(handleError(errorResult[0].msg));
  }

  const user = await getUserByPhoneNumber(phone);
  checkUserExist(user);

  const otpRow = await getOtpByPhoneNumber(phone);
  checkOtpRowExist(otpRow);

  // check if OTP error count over limit
  if (otpRow?.error === 5) {
    return next(
      handleError('This request maybe an attack.', 400, errorCode.attack)
    );
  }

  // check if token is valid
  if (token !== otpRow?.verifyToken) {
    await updateOtp(otpRow!.id, { error: 5 });
    return next(handleError('Invalid token'));
  }

  // check if request expiration
  const isExpired = moment().diff(otpRow?.updatedAt, 'minutes') > 10;
  if (isExpired) {
    return next(handleError('Invalid token', 403, errorCode.requestExpired));
  }

  // After verification passed
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  const fakeRefreshToken = generateToken();

  const userData = {
    phone,
    password: hashPassword,
    refreshToken: fakeRefreshToken,
  };

  const newUser = await createUser(userData);

  // generate authorization tokens
  const accessTokenPayload = { userId: newUser.id };
  const refreshTokenPayload = { userId: newUser.id, phone: newUser.phone };

  const accessToken = jwt.sign(
    accessTokenPayload,
    process.env.ACCESS_TOKEN_SECRET_KEY!,
    { expiresIn: 15 * 60 }
  );

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    process.env.ACCESS_TOKEN_SECRET_KEY!,
    { expiresIn: '30d' }
  );

  // update user account token
  await updateUser(newUser.id, { refreshToken });

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
    .status(201)
    .json({ message: 'Account created successfully', userId: newUser.id });
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const password = req.body.password;
  let phone = req.body.phone;
  if (phone.slice(0, 2) === '01') {
    phone = phone.slice(2);
  }

  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    return next(handleError(errorResult[0].msg));
  }

  const user = await getUserByPhoneNumber(phone);
  checkUserNotExist(user);

  // check if account is freeze when wrong password count is over limit
  checkAccountStatus(user!.status);

  const isSameDate =
    new Date(user!.updatedAt).toLocaleDateString() ===
    new Date().toLocaleDateString();

  const isPasswordMatch = await bcrypt.compare(password, user!.password);
  if (!isPasswordMatch) {
    if (!isSameDate) {
      // if not the same day then reset count to 1
      await updateUser(user!.id, { errorLoginCount: 1 });
    } else {
      if (user!.errorLoginCount >= 2) {
        // if same date and count is 2, update status
        await updateUser(user!.id, { status: 'FREEZE' });
      } else {
        // if same date and count is less than 2 , increase count
        await updateUser(user!.id, { errorLoginCount: { increment: 1 } });
      }
    }
    return next(handleError(req.t('wrongPassword'), 401));
  }

  // generate authorization tokens
  const accessTokenPayload = { userId: user!.id };
  const refreshTokenPayload = { userId: user!.id, phone: user!.phone };

  const accessToken = jwt.sign(
    accessTokenPayload,
    process.env.ACCESS_TOKEN_SECRET_KEY!,
    { expiresIn: '10m' }
  );

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    process.env.REFRESH_TOKEN_SECRET_KEY!,
    { expiresIn: '30d' }
  );

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
