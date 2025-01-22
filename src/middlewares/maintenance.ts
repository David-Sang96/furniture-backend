import { NextFunction, Request, Response } from 'express';
import { errorCode } from '../config/errorCode';
import { getSettingStatus } from '../services/settingService';
import { handleError } from '../utils/errorHandler';

const whiteLists = ['127.0.0.1'];

const maintenance = async (req: Request, res: Response, next: NextFunction) => {
  const ip: any = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (whiteLists.includes(ip)) {
    console.log(`Allowed IP: ${ip}`);
    next();
  } else {
    console.log(`Not Allowed IP: ${ip}`);
    const setting = await getSettingStatus('maintenance');

    if (setting?.value === 'true') {
      return next(
        handleError(
          'The server is currently under maintenance.Please try again later.',
          503,
          errorCode.maintenance
        )
      );
    }
    next();
  }
};

export default maintenance;
