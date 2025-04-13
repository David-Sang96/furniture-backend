import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getUserByPhoneNumber, updateUser } from '../services/authService';
import { checkAccountStatus, checkUserNotExist } from './auth';
import { handleError } from './errorHandler';
import { generateJwtTokens } from './generate';

type HandleUpdatePasswordType = {
  phoneNumber: string;
  oldPassword: string;
  newPassword: string;
};

export const handleUpatePassword = async ({
  phoneNumber,
  oldPassword,
  newPassword,
}: HandleUpdatePasswordType) => {
  let phone = phoneNumber;
  if (phone.startsWith('01')) {
    phone = phone.slice(2);
  }

  const user = (await getUserByPhoneNumber(phone)) as User;
  checkUserNotExist(user, false);

  checkAccountStatus(user!.status);

  const isSameDate =
    new Date(user!.updatedAt).toLocaleDateString() ===
    new Date().toLocaleDateString();

  const isPasswordMatch = await bcrypt.compare(oldPassword, user!.password);
  if (!isPasswordMatch) {
    if (!isSameDate) {
      await updateUser(user.id, { errorLoginCount: 1 });
    } else {
      if (user.errorLoginCount === 2) {
        await updateUser(user.id, { status: 'FREEZE' });
      } else {
        await updateUser(user.id, { errorLoginCount: { increment: 1 } });
      }
    }
    throw handleError('wrong old password');
  }

  const genSalt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash(newPassword, genSalt);

  const { accessToken, refreshToken } = generateJwtTokens(user);
  await updateUser(user.id, { refreshToken, errorLoginCount: 0, password });

  return { accessToken, refreshToken };
};
