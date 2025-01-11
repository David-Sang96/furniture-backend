import { NextFunction, Request, Response } from 'express';

export const getAllUsers = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({ message: 'All users', userId: req.userId });
};
