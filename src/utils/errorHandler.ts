import { Request } from 'express';
import { validationResult } from 'express-validator';

import { errorCode } from '../config/errorCode';
import { removePostFiles } from './removePostFiles';
import { removeProductFiles } from './removeProductFiles';

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
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    if (req.file) await removePostFiles(req.file.filename, null);
    throw handleError(errorResult[0].msg);
  }
};

export const handleProductValidationResult = async (req: Request) => {
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    if (req.files && req.files.length > 0) {
      const originalFiles = req.files.map((file: any) => file.filename);
      await removeProductFiles(originalFiles, null);
    }
    throw handleError(errorResult[0].msg);
  }
};
