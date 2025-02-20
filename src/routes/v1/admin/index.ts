import { NextFunction, Request, Response, Router } from 'express';

import multer from 'multer';
import {
  createPost,
  deletePost,
  updatePost,
} from '../../../controllers/admin/postController';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '../../../controllers/admin/productController';
import { setMaintenance } from '../../../controllers/admin/systemController';
import { getAllUsers } from '../../../controllers/admin/userController';
import upload from '../../../middlewares/uploadFile';
import { handleError } from '../../../utils/errorHandler';

const router = Router();

const handleFilesUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.array('images', 4)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          handleError('File size is too large', 400, 'LIMIT_FILE_SIZE')
        );
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          handleError(
            'You can upload up to 4 images only',
            400,
            'LIMIT_UNEXPECTED_FILE'
          )
        );
      }
    } else if (err) {
      return next(handleError('Something went wrong with file upload', 500));
    }
    next();
  });
};

const handleSingleFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          handleError('File size is too large', 400, 'LIMIT_FILE_SIZE')
        );
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          handleError(
            'You can upload 1 image only',
            400,
            'LIMIT_UNEXPECTED_FILE'
          )
        );
      }
    } else if (err) {
      return next(handleError('Something went wrong with file upload', 500));
    }
    next();
  });
};

router.get('/users', getAllUsers);
router.post('/maintenance', setMaintenance);

// CRUD for Posts
router.post('/posts', handleSingleFileUpload, createPost);
router.patch('/posts', handleSingleFileUpload, updatePost);
router.delete('/posts', deletePost);

// CRUD for Products
router.post('/products', handleFilesUpload, createProduct);
router.patch('/products', handleFilesUpload, updateProduct);
router.delete('/products', deleteProduct);

export default router;
