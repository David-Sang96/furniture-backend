import express from 'express';

import {
  getPost,
  getPostsByPagination,
} from '../../../controllers/api/postController';
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

router.get('/posts', isAuth, getPostsByPagination);
router.get('/posts/:id', isAuth, getPost);

export default router;
