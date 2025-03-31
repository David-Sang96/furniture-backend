import bcrypt from 'bcrypt';
import moment from 'moment';

import { errorCode } from '../config/errorCode';
import {
  getOtpByPhoneNumber,
  getUserByPhoneNumber,
  updateOtp,
} from '../services/authService';
import {
  checkOtpLimitError,
  checkOtpRowExist,
  checkUserExist,
  checkUserNotExist,
} from './auth';
import { handleError } from './errorHandler';
import { generateToken } from './generate';

type Props = {
  phoneNumber: string;
  otp: string;
  token: string;
  action: 'register' | 'forget-password';
};

export const handleOtpVerification = async ({
  phoneNumber,
  otp,
  token,
  action,
}: Props) => {
  let phone = phoneNumber;

  // Remove '01' prefix if exists
  if (phone.startsWith('01')) phone = phone.slice(2);

  const user = await getUserByPhoneNumber(phone);

  if (action === 'register') checkUserExist(user);
  if (action === 'forget-password') checkUserNotExist(user);

  const existingOtp = await getOtpByPhoneNumber(phone);
  checkOtpRowExist(existingOtp);

  const isSameDate =
    new Date(existingOtp!.updatedAt).toLocaleDateString() ===
    new Date().toLocaleDateString();

  // check if user verifying otp over limit of 5 times in a day
  checkOtpLimitError(isSameDate, existingOtp!.error);

  // check if token is valid
  if (token !== existingOtp?.rememberToken) {
    await updateOtp(existingOtp!.id, { error: 5 });
    throw handleError('Invalid token');
  }

  // check if OTP issue time is more than 2 minutes
  const isOTPExpired = moment().diff(existingOtp!.updatedAt, 'minutes') > 2;
  if (isOTPExpired) {
    throw handleError('OTP is already expired', 403, errorCode.otpExpired);
  }

  // check if OTP is correct
  const isMatchOtp = await bcrypt.compare(otp, existingOtp!.otp);
  if (!isMatchOtp) {
    // if first time wrong OTP for today then reset it, else increase number in the error field
    if (!isSameDate) {
      await updateOtp(existingOtp!.id, { error: 1 });
    } else {
      await updateOtp(existingOtp!.id, { error: { increment: 1 } });
      throw handleError('OTP is incorrect', 401);
    }
  }

  // After validation passed
  const verifyToken = generateToken().toString();
  const otpData = {
    verifyToken,
    error: 0,
    count: 1,
  };

  const result = await updateOtp(existingOtp!.id, otpData);
  return result;
};
