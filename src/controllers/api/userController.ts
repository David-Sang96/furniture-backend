import { NextFunction, Request, Response } from 'express';
import { handleValidationResult } from '../../utils/errorHandler';

export const changeLanguages = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  handleValidationResult(req);
  const { lng } = req.query;
  const languageName = lng === 'mm' ? 'မြန်မာ' : 'English';

  res.cookie('i18next', lng);
  res.json({ message: req.t('changeLangSuccess', { lang: languageName }) });
};
