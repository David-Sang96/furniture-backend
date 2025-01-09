import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimiter } from './middlewares/rateLimiter';
import authRoutes from './routes/v1/auth';
import healthRoutes from './routes/v1/health';

export const app = express();

app
  .use(morgan('dev'))
  // parse the formData to be able to access from request object
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cors())
  .use(helmet())
  .use(compression())
  .use(rateLimiter);

app.use('/api/v1', healthRoutes);
app.use('/api/v1', authRoutes);

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  const errorCode = error.code || 'Error_Code';
  res.status(status).json({ message, error: errorCode });
});
