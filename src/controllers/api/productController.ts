import { NextFunction, Request, Response } from 'express';
import { param, query } from 'express-validator';
import { getUserById } from '../../services/authService';
import {
  getAllProducts,
  getProductWithRelations,
} from '../../services/productService';
import { checkUserNotExist } from '../../utils/auth';
import { getOrSetCache } from '../../utils/cache';
import { checkModelExisted } from '../../utils/check';
import { handleValidationResult } from '../../utils/errorHandler';

export const getSingleProduct = [
  param('id', 'Id must be postive number.').isInt({ gt: 0 }),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const productId = req.params.id;
    const userId = req.userId;

    const user = await getUserById(userId!);
    checkUserNotExist(user);

    const cacheKey = `products:${JSON.stringify(productId)}`;
    const product = await getOrSetCache(cacheKey, async () => {
      return await getProductWithRelations(+productId);
    });
    checkModelExisted(product);

    res.json({ message: 'Product details', product });
  },
];

export const getProductsByPagination = [
  query('cursor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cursor must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 5 })
    .withMessage('Limit must be at least 5.'),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const lastCursor = Number(req.query.cursor);
    const limit = Number(req.query.limit) || 5;
    const category = req.query.category;
    const type = req.query.type;

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserNotExist(user);

    let categories: number[] = [];
    let types: number[] = [];

    if (category) {
      categories = category
        .toString()
        .split(',')
        .map((c) => Number(c))
        .filter((c) => c > 0);
    }

    if (type) {
      types = type
        .toString()
        .split(',')
        .map((t) => Number(t))
        .filter((t) => t > 0);
    }

    const where = {
      AND: [
        categories.length > 0 ? { categoryId: { in: categories } } : {},
        types.length > 0 ? { typeId: { in: types } } : {},
      ],
    };

    const options = {
      where,
      take: limit + 1,
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: lastCursor } : undefined,
      select: {
        id: true,
        name: true,
        price: true,
        discount: true,
        status: true,
        images: {
          select: { id: true, path: true },
          take: 1, // get only first image from images array
        },
      },
      orderBy: { id: 'desc' },
    };

    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const products = await getOrSetCache(cacheKey, async () => {
      return await getAllProducts(options);
    });

    const hasNextPage = products.length > limit;
    if (hasNextPage) products.pop();
    const newCursor =
      products.length > 0 ? products[products.length - 1].id : null;

    res.json({
      message: 'Get all products',
      hasNextPage,
      newCursor,
      products,
    });
  },
];
