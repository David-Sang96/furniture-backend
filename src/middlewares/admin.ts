import { NextFunction, Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import { prisma } from '../utils/prisma';

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  if (!user) {
    return next(handleError('User not found', 404, 'Error_NotFound'));
  }

  if (user.role != 'ADMIN') {
    return next(
      handleError(
        "You don't have permission to access.",
        403,
        'Error_Forbidden'
      )
    );
  }
  next();
};
