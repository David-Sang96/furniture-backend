import express from 'express';
import { healthCheck } from '../../controllers/healthController';
import { check } from '../../middlewares/check';

const router = express.Router();

router.get('/health', check, healthCheck);

export default router;
