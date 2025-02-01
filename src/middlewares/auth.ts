import { User } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { errorCode } from '../config/errorCode';
import { getUserById, updateUser } from '../services/authService';
import { checkUserNotExist } from '../utils/auth';
import { handleError } from '../utils/errorHandler';

// interface CustomRequest extends Request {
//   userId?: number;
// }

interface CustomJWtPayload extends JwtPayload {
  userId: number;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: User;
    }
  }
}

export const isAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // for mobile app to access api
  // const platform = req.headers['x-platform'];
  // if (platform === 'mobile') {
  // const accessTokenMobile = req.headers.authorization?.split(' ')[0];
  // console.log("Request from mobile",accessTokenMobile)
  // }

  const accessToken = req.cookies ? req.cookies.accessToken : null;
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

  const generateNewTokens = async () => {
    let decoded: CustomJWtPayload;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET_KEY!
      ) as CustomJWtPayload;
    } catch (error: any) {
      return next(
        handleError(
          'Authentication failed. Refresh token is invalid. Please log in again.',
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
    checkUserNotExist(user, false);

    if (user?.phone !== decoded.phone) {
      return next(
        handleError(
          'Authentication failed.Please log in again.',
          401,
          errorCode.unauthenticated
        )
      );
    }

    if (user?.refreshToken !== refreshToken) {
      return next(
        handleError(
          'Authentication failed. Refresh token mismatch. Please log in again.',
          401,
          errorCode.unauthenticated
        )
      );
    }

    // Generate new tokens
    const accessTokenPayload = { userId: user!.id };
    const refreshTokenPayload = { userId: user!.id, phone: user!.phone };

    const newAccessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET_KEY!,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET_KEY!,
      { expiresIn: '30d' }
    );

    await updateUser(user!.id, { refreshToken: newRefreshToken });

    res
      .cookie('accessToken', newAccessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
      })
      .cookie('refreshToken', newRefreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        secure: process.env.NODE_ENV === 'production',
      });

    req.userId = user?.id;
    next();
  };

  if (!accessToken) {
    return await generateNewTokens(); // Stop further execution as new tokens are already generated
  }

  // verify access token
  let decoded: CustomJWtPayload;
  try {
    decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET_KEY!
    ) as CustomJWtPayload;

    if (isNaN(decoded.userId)) {
      return next(
        handleError(
          'Authentication failed.Please log in again.',
          401,
          errorCode.unauthenticated
        )
      );
    }

    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    console.log(error);
    if (error.name === 'TokenExpiredError') await generateNewTokens();
    else
      return next(
        handleError('Access token is invalid', 400, errorCode.attack)
      );
  }
};
