import { NextFunction, Request, Response } from 'express';

export const healthCheck = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({ message: 'health', userId: req.userId });
};
