import { handleError } from './errorHandler';

export const isValidImage = (file: any) => {
  if (!file) {
    throw handleError('Invalid Image', 422);
  }
};

export const checkModelExisted = (model: any) => {
  if (!model) {
    throw handleError('This model does not exist', 409);
  }
};
