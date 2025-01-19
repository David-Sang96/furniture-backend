import { errorCode } from '../config/errorCode';
import { handleError } from './errorHandler';

export const checkUserExist = (user: any) => {
  if (user) {
    throw handleError(
      'This phone number has already been registered',
      409,
      errorCode.userExist
    );
  }
};

export const checkOtpLimitError = (isSameDate: boolean, errorCount: number) => {
  if (isSameDate && errorCount >= 5) {
    throw handleError(
      'Wrong OTP for 5 times.Please try again after 24 hours',
      401,
      errorCode.overLimit
    );
  }
};

export const checkOtpRowExist = (otpRow: any) => {
  if (!otpRow) {
    throw handleError('Phone number is incorrect.', 404);
  }
};

export const checkUserNotExist = (user: any, isOTP: boolean = true) => {
  if (!user) {
    throw handleError(
      `This ${isOTP ? 'phone' : ' account'} has not registered`,
      401,
      errorCode.unauthenticated
    );
  }
};

export const checkAccountStatus = (status: string) => {
  if (status === 'FREEZE') {
    throw handleError(
      'Your account is temporarily locked.Please contact our support team.',
      401,
      errorCode.accountFreeze
    );
  }
};
