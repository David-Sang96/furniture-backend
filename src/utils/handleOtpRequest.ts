import bcrypt from 'bcrypt';
import { NextFunction } from 'express';

import { errorCode } from '../config/errorCode';
import {
  createOtp,
  getOtpByPhoneNumber,
  getUserByPhoneNumber,
  updateOtp,
} from '../services/authService';
import { checkOtpLimitError, checkUserExist, checkUserNotExist } from './auth';
import { handleError } from './errorHandler';
import { generateToken } from './generate';

type Props = {
  phoneNumber: string;
  next: NextFunction;
  action: 'register' | 'forget-password';
};

export const handleOtpRequest = async ({
  phoneNumber,
  next,
  action,
}: Props) => {
  let phone = phoneNumber;

  // Remove '01' prefix if exists
  if (phone.startsWith('01')) phone = phone.slice(2);

  const user = await getUserByPhoneNumber(phone);

  if (action === 'register') checkUserExist(user);
  if (action === 'forget-password') checkUserNotExist(user);

  // OTP generate & call OTP sending API
  // const otp = generateOTP();
  const otp = 123456; // for testing
  const salt = await bcrypt.genSalt(10);
  const hashOtp = await bcrypt.hash(otp.toString(), salt);
  const token = generateToken();

  const existingOtp = await getOtpByPhoneNumber(phone);

  let result;
  // check if user've already requested OTP
  if (!existingOtp) {
    const otpData = {
      phone,
      otp: hashOtp,
      rememberToken: token,
      count: 1,
    };
    result = await createOtp(otpData);
  } else {
    const isSameDate =
      new Date(existingOtp.updatedAt).toLocaleDateString() ===
      new Date().toLocaleDateString();

    // check if user verifying otp over limit of 5 times in a day
    checkOtpLimitError(isSameDate, existingOtp.error);

    // reset OTP count and error field
    if (!isSameDate) {
      const otpData = {
        otp: hashOtp,
        rememberToken: token,
        count: 1,
        error: 0,
      };
      result = await updateOtp(existingOtp.id, otpData);
    }

    // check if user requesting OTP for more than 3 times in a day
    if (existingOtp.count === 3) {
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
      result = await updateOtp(existingOtp.id, otpData);
    }
  }

  return result;
};
