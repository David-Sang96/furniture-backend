import { NextFunction, Request, Response } from 'express';

// interface CustomRequest extends Request {
//   userId?: number;
// }

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export const check = (req: Request, res: Response, next: NextFunction) => {
  // const err: any = new Error('Token expired!');
  // err.status = 401;
  // err.code = 'Error_TokenExpired';
  // return next(err); must do like this to catch error in middlewares

  req.userId = 12345;
  next();
};
