import bcrypt from 'bcrypt';
import moment from 'moment';

import { User } from '@prisma/client';
import { errorCode } from '../config/errorCode';
import {
  createUser,
  getOtpByPhoneNumber,
  getUserByPhoneNumber,
  updateOtp,
  updateUser,
} from '../services/authService';
import { checkOtpRowExist, checkUserExist, checkUserNotExist } from './auth';
import { handleError } from './errorHandler';
import { generateJwtTokens, generateToken } from './generate';

type Props = {
  phoneNumber: string;
  token: string;
  password: string;
  action: 'register' | 'reset-password';
};

type ReturnType =
  | {
      user: User;
      accessToken: string;
      refreshToken: string;
    }
  | undefined;

export const handlePasswordConfirmation = async ({
  phoneNumber,
  token,
  password,
  action,
}: Props): Promise<ReturnType> => {
  let phone = phoneNumber;

  // Remove '01' prefix if exists
  if (phone.startsWith('01')) {
    phone = phone.slice(2);
  }

  const user = (await getUserByPhoneNumber(phone)) as User;

  if (action === 'register') checkUserExist(user);
  if (action === 'reset-password') checkUserNotExist(user);

  const existingOtp = await getOtpByPhoneNumber(phone);
  checkOtpRowExist(existingOtp);

  // check if OTP error count over limit
  if (existingOtp?.error === 5) {
    throw handleError('This request maybe an attack.', 400, errorCode.attack);
  }

  // check if token is valid
  if (token !== existingOtp?.verifyToken) {
    await updateOtp(existingOtp!.id, { error: 5 });
    throw handleError('Invalid token');
  }

  // check if request expiration
  const isExpired = moment().diff(existingOtp?.updatedAt, 'minutes') > 5;
  if (isExpired) {
    throw handleError('Invalid token', 403, errorCode.requestExpired);
  }

  // After verification passed
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);

  if (action === 'register') {
    const fakeRefreshToken = generateToken();

    const userData = {
      phone,
      password: hashPassword,
      refreshToken: fakeRefreshToken,
    };
    const user = await createUser(userData);

    const { accessToken, refreshToken } = generateJwtTokens(user);

    // update user account token
    await updateUser(user.id, { refreshToken });
    return { user, accessToken, refreshToken };
  }

  if (action === 'reset-password') {
    const { accessToken, refreshToken } = generateJwtTokens(user);

    const updatedUserData = {
      password: hashPassword,
      refreshToken,
    };

    await updateUser(user.id, updatedUserData);
    return { user, accessToken, refreshToken };
  }
};
