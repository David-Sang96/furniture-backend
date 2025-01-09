export const checkUserExist = (user: any) => {
  if (user) {
    const error: any = new Error(
      'This phone number has already been registered'
    );
    error.status = 409;
    error.code = 'Error_AlreadyExisted';
    throw error;
  }
};

export const checkOtpLimitError = (isSameDate: boolean, errorCount: number) => {
  if (isSameDate && errorCount === 5) {
    const error: any = new Error(
      'Wrong OTP for 5 times.Please try again after 24 hours.'
    );
    error.status = 401;
    error.code = 'Error_OverLimit';
    throw error;
  }
};

export const checkOtpRowExist = (otpRow: any) => {
  if (!otpRow) {
    const error: any = new Error('Phone number is incorrect.');
    error.status = 404;
    error.code = 'Error_Invalid';
    throw error;
  }
};
