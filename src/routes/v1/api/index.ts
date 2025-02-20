import express from 'express';

import {
  getInfinitePostsByPagination,
  getPostsByPagination,
  getSinglePost,
} from '../../../controllers/api/postController';
import {
  getProductsByPagination,
  getSingleProduct,
} from '../../../controllers/api/productController';
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

// offset pagination
router.get('/posts', isAuth, getPostsByPagination);
// cursor-based pagination
router.get('/posts/infinite', isAuth, getInfinitePostsByPagination);
router.get('/posts/:id', isAuth, getSinglePost);

router.get('/products/:id', isAuth, getSingleProduct);
// cursor-based pagination
router.get('/products', isAuth, getProductsByPagination);

export default router;
