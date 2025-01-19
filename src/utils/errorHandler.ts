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
