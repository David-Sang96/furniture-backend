import { handleError } from './errorHandler';

export const isValidImage = (file: any) => {
  if (!file) {
    throw handleError('Invalid Image', 422);
  }
};
