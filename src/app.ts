import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import i18next from 'i18next';
import i18nextBackend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import morgan from 'morgan';
import path from 'path';

import { isAuth } from './middlewares/auth';
import { authorize } from './middlewares/authorize';
import { rateLimiter } from './middlewares/rateLimiter';
import adminRoutes from './routes/v1/admin/user';
import userRoutes from './routes/v1/api/user';
import authRoutes from './routes/v1/auth';

export const app = express();

const whiteList = ['https://example.com', 'http://localhost:5173'];
const corsOptions = {
  origin: function (
    origin: any,
    callback: (err: Error | null, origin?: any) => void
  ) {
    // allow requests with no origin (eg. mobile app and curl request(s) like postman third party software)
    if (!origin) return callback(null, true);

    if (whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies or authorization header
};

app
  .use(morgan('dev'))
  // parse the formData to be able to access from request object
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(cors(corsOptions))
  .use(helmet())
  .use(compression())
  .use(rateLimiter);

i18next
  .use(i18nextBackend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(
        // cwd - current working directory
        process.cwd(),
        'src/locales',
        '{{lng}}',
        '{{ns}}.json'
      ),
    },
    detection: {
      // order and from where user language should be detected
      order: ['querystring', 'cookie'],
      // cache user language
      caches: ['cookie'],
    },
    fallbackLng: 'en',
    preload: ['en', 'mm'],
  });

app.use(i18nextMiddleware.handle(i18next));

app.use('/api/v1', authRoutes);
app.use('/api/v1/admins', isAuth, authorize(true, 'ADMIN'), adminRoutes);
app.use('/api/v1', userRoutes);

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  const errorCode = error.code || 'Error_Code';
  res.status(status).json({ message, error: errorCode });
});
