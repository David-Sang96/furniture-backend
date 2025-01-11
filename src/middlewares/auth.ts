import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { handleError } from '../utils/errorHandler';

// interface CustomRequest extends Request {
//   userId?: number;
// }

interface CustomJWtPayload extends JwtPayload {
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  if (!refreshToken) {
    return next(
      handleError(
        'Authentication failed. Refresh token is missing or invalid. Please log in again.',
        401,
        'Error_Unauthenticated'
      )
    );
  }

  if (!accessToken) {
    return next(
      handleError('Access token has expired', 401, 'Error_AccessTokenExpired')
    );
  }

  // verify access token
  let decoded: CustomJWtPayload;
  try {
    decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET_KEY!
    ) as CustomJWtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      error.message = 'Access token has expired';
      error.status = 401;
      error.code = 'Error_AccessTokenExpired';
    } else {
      error.message = 'Access token is invalid';
      error.status = 400;
      error.code = 'Error_Attack';
    }
    return next(error);
  }

  req.userId = decoded.userId;
  next();
};
