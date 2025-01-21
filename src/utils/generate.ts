import jwt from 'jsonwebtoken';

import { User } from '@prisma/client';
import { randomBytes } from 'crypto';

export const generateOTP = () => {
  return (parseInt(randomBytes(3).toString('hex'), 16) % 900000) + 100000;
};

export const generateToken = () => {
  return randomBytes(32).toString('hex');
};

// generate authorization tokens
export const generateJwtTokens = (user: User) => {
  const accessTokenPayload = { userId: user.id };
  const refreshTokenPayload = { userId: user.id, phone: user.phone };

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
  return { accessToken, refreshToken };
};
