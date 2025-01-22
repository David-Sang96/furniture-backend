import { NextFunction, Request, Response } from 'express';

export const getAllUsers = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  res.json({ message: req.t('welcome'), currentUserRole: user?.role });
};
