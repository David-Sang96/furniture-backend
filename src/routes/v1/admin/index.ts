import express from 'express';

import {
  createPost,
  deletePost,
  updatePost,
} from '../../../controllers/admin/postController';
import { setMaintenance } from '../../../controllers/admin/systemController';
import { getAllUsers } from '../../../controllers/admin/userController';
import upload from '../../../middlewares/uploadFile';

const router = express.Router();

router.get('/users', getAllUsers);
router.post('/maintenance', setMaintenance);

// CRUD for Poss
router.post('/posts', upload.single('image'), createPost);
router.patch('/posts', upload.single('image'), updatePost);
router.delete('/posts', deletePost);

export default router;
