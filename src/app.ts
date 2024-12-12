import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimiter } from './middlewares/rateLimiter';

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

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'hello we are ready for response' });
});
