import { User } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { errorCode } from '../config/errorCode';
import { getUserById } from '../services/authService';
import { checkUserNotExist } from '../utils/auth';
import { handleError } from '../utils/errorHandler';

export const authorize =
  (permission: boolean, ...allowRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const user = (await getUserById(req.userId!)) as User;
    checkUserNotExist(user, false);

    const result = allowRoles.includes(user!.role);

    if (permission && !result) {
      return next(
        handleError('This action is not allowed.', 403, errorCode.unauthorize)
      );
    }

    if (!permission && result) {
      return next(
        handleError('This action is not allowed.', 403, errorCode.unauthorize)
      );
    }

    req.user = user;
    next();
  };
