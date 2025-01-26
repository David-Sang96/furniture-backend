import express from 'express';

import {
  changeLanguages,
  uploadMultipleProfile,
  uploadOptimizeProfile,
  uploadProfile,
} from '../../../controllers/api/profileController';
import { isAuth } from '../../../middlewares/auth';
import upload from '../../../middlewares/uploadFile';

const router = express.Router();

router.get('/change-language', changeLanguages);

router.patch('/profile/upload', isAuth, upload.single('avatar'), uploadProfile);

router.patch(
  '/profile/upload/optimize',
  isAuth,
  upload.single('avatar'),
  uploadOptimizeProfile
);

router.patch(
  '/profile/upload/multiple',
  isAuth,
  upload.array('avatar'),
  uploadMultipleProfile
);

export default router;
