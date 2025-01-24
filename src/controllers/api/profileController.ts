import { query } from 'express-validator';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { NextFunction, Request, Response } from 'express';
import { getUserById, updateUser } from '../../services/authService';
import { checkUserNotExist } from '../../utils/auth';
import { isValidImage } from '../../utils/check';
import { handleValidationResult } from '../../utils/errorHandler';

export const changeLanguages = [
  query('lng', 'Invalid language code.')
    .trim()
    .notEmpty()
    .matches('^[a-z]+$')
    .isLength({ min: 2, max: 3 })
    .withMessage(
      'Language code must be at least 2 and not more than 3 characters.'
    ),
  (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const { lng } = req.query;
    const languageName = lng === 'mm' ? 'မြန်မာ' : 'English';

    res.cookie('i18next', lng);
    res.json({ message: req.t('changeLangSuccess', { lang: languageName }) });
  },
];

export const uploadProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const image = req.file;

  const user = await getUserById(userId!);
  checkUserNotExist(user, false);
  isValidImage(image);

  const fileName = image!.filename;
  // const imageFilePath = image!.path.replace(/\\/g, '/');

  if (user?.image) {
    try {
      const filePath = path.join(
        __dirname,
        '../../../',
        'upload/images',
        user!.image!
      );
      await unlink(filePath);
    } catch (error) {
      console.log(error);
    }
  }

  await updateUser(user!.id, { image: fileName });

  res.json({ message: 'Profile image uploaded successfully', image: fileName });
};

export const uploadMultipleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const images = req.files;

  const user = await getUserById(userId!);
  checkUserNotExist(user, false);

  res.json({ message: 'Images uploaded successfully' });
};

export const uploadOptimizeProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const image = req.file;

  const user = await getUserById(userId!);
  checkUserNotExist(user, false);
  isValidImage(image);
};
