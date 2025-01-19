import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { handleError } from '../../utils/errorHandler';

export const changeLanguages = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorResult = validationResult(req).array({ onlyFirstError: true });
  if (errorResult.length) {
    return next(handleError(errorResult[0].msg));
  }

  const { lng } = req.query;
  const languageName = lng === 'mm' ? 'မြန်မာ' : 'English';

  res.cookie('i18next', lng);
  res.json({ message: req.t('changeLangSuccess', { lang: languageName }) });
};
