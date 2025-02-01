import { query } from 'express-validator';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { NextFunction, Request, Response } from 'express';
import ImageQueue from '../../jobs/queues/imageQueue';
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
  console.log(image);

  const user = await getUserById(userId!);
  checkUserNotExist(user, false);
  isValidImage(image);

  // const fileName = Date.now() + '-' + `${Math.round(Math.random() * 1e9)}.webp`;
  // try {
  //   const optimizedImagePath = path.join(
  //     __dirname,
  //     '../../../',
  //     'upload/images',
  //     fileName
  //   );
  //   await sharp(req.file?.buffer)
  //     .resize(200, 200)
  //     .webp({ quality: 50 })
  //     .toFile(optimizedImagePath);
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).json({ message: 'Image optimization failed' });
  //   return;
  // }

  const splitFileName = image?.filename.split('.')[0];

  const job = await ImageQueue.add(
    'optimize-image',
    {
      filepath: image?.path,
      fileName: `${splitFileName}.webp`,
      width: 200,
      height: 200,
      quality: 50,
    },
    // if first try failed then wait for 1 sec , if second try failed again then wait for 2 sec cos exponential is doubling up the time
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );

  if (user?.image) {
    try {
      const originalFilePath = path.join(
        __dirname,
        '../../../',
        'upload/images',
        user.image
      );

      const optimizeFilePath = path.join(
        __dirname,
        '../../../',
        'upload/optimize',
        user.image.split('.')[0] + '.webp'
      );

      await unlink(originalFilePath);
      await unlink(optimizeFilePath);
    } catch (error) {
      console.log(error);
    }
  }

  await updateUser(user!.id, { image: image?.filename });

  res.json({
    message: 'Profile image uploaded successfully',
    image: splitFileName + '.webp',
    jobId: job.id,
  });
};
