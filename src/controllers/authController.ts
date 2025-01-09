import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import moment from 'moment';

import {
  createOtp,
  getOtpByPhoneNumber,
  getUserByPhoneNumber,
  updateOtp,
} from '../services/authServices';
import {
  checkOtpLimitError,
  checkOtpRowExist,
  checkUserExist,
} from '../utils/auth';
import { generateOTP, generateToken } from '../utils/generate';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    const error: any = new Error(errorResult[0].msg);
    error.status = 400;
    error.code = 'Error_Invalid';
    return next(error);
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
    if (isOtpExited.count === 3) {
      const error: any = new Error(
        'OTP is not allowed to request more than 3 times per day.'
      );
      error.status = 405;
      error.code = 'Error_OverLimit';
      return next(error);
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
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    const error: any = new Error(errorResult[0].msg);
    error.status = 400;
    error.code = 'Error_Invalid';
    return next(error);
  }

  const { phone, otp, token } = req.body;

  const user = await getUserByPhoneNumber(phone);
  checkUserExist(user);

  const otpRow = await getOtpByPhoneNumber(phone);
  checkOtpRowExist(otpRow);

  const isSameDate =
    new Date(otpRow!.updatedAt).toLocaleDateString() ===
    new Date().toLocaleDateString();

  // check if user verifying otp over limit of 5 times in a day
  checkOtpLimitError(isSameDate, otpRow!.error);

  if (token !== otpRow?.rememberToken) {
    await updateOtp(otpRow!.id, { error: 5 });

    const error: any = new Error('Invalid token');
    error.status = 400;
    error.code = 'Error_Invalid';
    return next(error);
  }

  // check if OTP issue time is more than 2 minutes
  const isOTPExpired = moment().diff(otpRow!.updatedAt, 'minutes') > 2;
  if (isOTPExpired) {
    const error: any = new Error('OTP is already expired');
    error.status = 403;
    error.code = 'Error_Expired';
    return next(error);
  }

  // check if OTP is correct
  const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
  if (!isMatchOtp) {
    // if first time wrong OTP for today then update it else increase number in the error field
    if (!isSameDate) {
      await updateOtp(otpRow!.id, { error: 1 });
    } else {
      await updateOtp(otpRow!.id, { error: { increment: 1 } });

      const error: any = new Error('Invalid OTP');
      error.status = 401;
      error.code = 'Error_Invalid';
      return next(error);
    }
  }

  // After validation passed
  const verifyToken = generateOTP().toString();
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

export const confirmPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({ message: "I'm confirmPassword" });
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({ message: "I'm login" });
};
