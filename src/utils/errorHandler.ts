import { Request } from 'express';
import { validationResult } from 'express-validator';

import { errorCode } from '../config/errorCode';

export const handleError = (
  message: string,
  status: number = 400,
  code: string = errorCode.invalid
) => {
  const error: any = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

export const handleValidationResult = (req: Request) => {
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    throw handleError(errorResult[0].msg);
  }
};
