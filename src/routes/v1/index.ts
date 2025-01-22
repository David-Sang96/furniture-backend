import express from 'express';

import { isAuth } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';

// import maintenance from '../../middlewares/maintenance';
import adminRoutes from './admin';
import userRoutes from './api';
import authRoutes from './auth';

const router = express.Router();

router.use('/api/v1', authRoutes);
router.use('/api/v1/user', userRoutes);
router.use('/api/v1/admins', isAuth, authorize(true, 'ADMIN'), adminRoutes);

// router.use('/api/v1', maintenance, authRoutes);
// router.use('/api/v1/user', maintenance, userRoutes);
// router.use(
//   '/api/v1/admins',
//   maintenance,
//   isAuth,
//   authorize(true, 'ADMIN'),
//   adminRoutes
// );

export default router;
