import express from 'express';

import { isAuth } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';

import adminRoutes from './admin';
import userRoutes from './api';
import authRoutes from './auth';

const router = express.Router();

router.use('/api/v1', authRoutes);
router.use('/api/v1/user', userRoutes);
router.use('/api/v1/admins', isAuth, authorize(true, 'ADMIN'), adminRoutes);

export default router;
