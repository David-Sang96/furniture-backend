import express from 'express';

import { getAllUsers } from '../../../controllers/admin/adminController';

const router = express.Router();

router.get('/users', getAllUsers);

export default router;
