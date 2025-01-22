import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { createOrUpdateSetting } from '../../services/settingService';
import { handleValidationResult } from '../../utils/errorHandler';

export const setMaintenance = [
  body('mode', 'Mode must be boolean').isBoolean(),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const { mode } = req.body;
    const value = mode ? 'true' : 'false';
    const message = mode
      ? 'Turned on maintenance mode successfully'
      : 'Turned off maintenance mode successfully';

    await createOrUpdateSetting('maintenance', value);

    res.json({ message });
  },
];
