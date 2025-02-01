import { Request } from 'express';
import { validationResult } from 'express-validator';

import { errorCode } from '../config/errorCode';
import { removePostFiles } from './removePostFiles';

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

export const handlePostValidationResult = async (req: Request) => {
  if (req.file) {
    await removePostFiles(req.file.filename, null);
  }
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    throw handleError(errorResult[0].msg);
  }
};
