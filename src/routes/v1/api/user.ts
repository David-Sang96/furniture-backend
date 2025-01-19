import express from 'express';
import { query } from 'express-validator';
import { changeLanguages } from '../../../controllers/api/userController';

const router = express.Router();

router.get(
  '/change-language',
  [
    query('lng', 'Invalid language code.')
      .trim()
      .notEmpty()
      .matches('^[a-z]+$')
      .isLength({ min: 2, max: 3 })
      .withMessage(
        'Language code must be at least 2 and not more than 3 characters.'
      ),
  ],
  changeLanguages
);

export default router;
