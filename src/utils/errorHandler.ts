export const handleError = (
  message: string,
  status: number = 400,
  code: string = 'Error_Invalid'
) => {
  const error: any = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};
