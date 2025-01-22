import express from 'express';

import { setMaintenance } from '../../../controllers/admin/systemController';
import { getAllUsers } from '../../../controllers/admin/userController';

const router = express.Router();

router.get('/users', getAllUsers);
router.post('/maintenance', setMaintenance);

export default router;
