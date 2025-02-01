import { NextFunction, Request, Response } from 'express';

export const getPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  res.json({ message: '' });
};

export const getPostsByPagination = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.json({ message: '' });
};
