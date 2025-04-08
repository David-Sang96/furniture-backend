import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import CacheQueue from '../../jobs/queues/cacheQueue';
import ImageQueue from '../../jobs/queues/imageQueue';
import {
  createOneProduct,
  deleteOneProduct,
  getProductById,
  updateOneProduct,
} from '../../services/productService';
import { checkModelExisted, isValidImage } from '../../utils/check';
import {
  handleError,
  handleProductValidationResult,
  handleValidationResult,
} from '../../utils/errorHandler';
import { removeProductFiles } from '../../utils/removeProductFiles';

export const createProduct = [
  body('name', 'Name is required').trim().notEmpty().escape(),
  body('description', 'Description is required').trim().notEmpty().escape(),
  body('price', 'Price is required')
    .isFloat({ min: 0.1 })
    .isDecimal({ decimal_digits: '1,2' })
    .withMessage('decimal allow only 2 places.'), // allowe only 2 places after dot (.00)
  body('rating', 'Rating is invalid').optional().isInt({ min: 1 }),
  body('discount', 'Discount is required')
    .isFloat({ min: 0 })
    .isDecimal({ decimal_digits: '1,2' }),
  body('inventory', 'Inventory is required').isInt({ min: 1 }),
  body('category', 'Category is required').trim().notEmpty().escape(),
  body('type', 'Type is required').trim().notEmpty().escape(),
  body('tags', 'Tag is invalid')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (!value) return undefined;
      if (typeof value === 'string') {
        const tagsArray = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag: string) => tag !== '');
        return tagsArray.length > 0 ? tagsArray : undefined;
      }
      return undefined;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    await handleProductValidationResult(req);
    const {
      name,
      description,
      price,
      discount,
      inventory,
      category,
      type,
      tags,
      rating,
    } = req.body;
    isValidImage(req.files && req.files.length > 0);

    await Promise.all(
      req.files!.map(async (file: Express.Multer.File) => {
        const splitFileName = file.filename.split('.')[0];
        // Don't use await inside map() directly, as it won’t return the expected promises.It just returns an array of promises.The inner await makes map() return an array of undefined values instead of promises.
        return ImageQueue.add(
          'optimize-image',
          {
            filepath: file.path,
            fileName: `${splitFileName}.webp`,
            width: 835,
            height: 577,
            quality: 100,
          },
          { attempts: 3, backoff: { delay: 1000, type: 'exponential' } }
        );
      })
    );

    const originalFileNames = req.files?.map((file: Express.Multer.File) => ({
      path: file.filename,
    }));

    const data: any = {
      name,
      description,
      price,
      discount,
      inventory: +inventory,
      category,
      type,
      tags,
      images: originalFileNames,
      rating: +rating,
    };

    const product = await createOneProduct(data);

    await CacheQueue.add(
      'invalidate-product-cache',
      { pattern: 'products:*' },
      { jobId: `Invalidate-${Date.now()}`, priority: 1 }
    );

    res.status(201).json({
      message: 'Created a new product',
      productId: product.id,
    });
  },
];

export const updateProduct = [
  body('productId', 'Product Id is required').isInt({ min: 1 }),
  body('name', 'Name is required').trim().notEmpty().escape(),
  body('description', 'Description is required').trim().notEmpty().escape(),
  body('price', 'Price is required')
    .isFloat({ min: 0.1 })
    .isDecimal({ decimal_digits: '1,2' }),
  body('rating', 'Rating is invalid')
    .optional()
    .isFloat({ min: 0.1 })
    .isDecimal({ decimal_digits: '1' }),
  body('rating', 'Rating is invalid').optional().isInt({ min: 1 }),
  body('inventory', 'Inventory is required').isInt({ min: 1 }),
  body('category', 'Category is required').trim().notEmpty().escape(),
  body('type', 'Type is required').trim().notEmpty().escape(),
  body('tags', 'Tag is invalid')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (!value) return undefined;
      if (typeof value === 'string') {
        const tagsArray = value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag: string) => tag !== '');
        return tagsArray.length > 0 ? tagsArray : undefined;
      }
      return undefined;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    await handleProductValidationResult(req);
    const {
      name,
      description,
      price,
      discount,
      inventory,
      category,
      type,
      tags,
      rating,
      productId,
    } = req.body;
    const images = req.files;

    const product = await getProductById(+productId);
    if (!product) {
      if (images && images.length > 0) {
        const fileNames = images.map(
          (image: Express.Multer.File) => image.filename
        );
        await removeProductFiles(fileNames, null);
      }
      return next(handleError('This model does not exist.', 409));
    }

    let originalFileNames = [];
    if (images && images.length > 0) {
      originalFileNames = images.map((image: any) => ({
        path: image.filename,
      }));
    }

    const data: any = {
      productId: product.id,
      name,
      description,
      price,
      discount,
      inventory: +inventory,
      category,
      type,
      tags,
      rating: +rating,
      images: originalFileNames,
    };

    if (images && images.length > 0) {
      await Promise.all(
        images.map(async (image: Express.Multer.File) => {
          const spilitFileNames = image.filename.split('.')[0];
          return ImageQueue.add(
            'optimize-image',
            {
              filepath: image?.path,
              fileName: `${spilitFileNames}.webp`,
              width: 835,
              height: 577,
              quality: 100,
            },
            { attempts: 3, backoff: { delay: 1000, type: 'exponential' } }
          );
        })
      );

      const optFileNames = product.images.map(
        (image: any) => image.path.split('.')[0] + '.webp'
      );
      const orgFileNames = product.images.map((image: any) => image.path);
      await removeProductFiles(orgFileNames, optFileNames);
    }

    const updatedProduct = await updateOneProduct(data);

    await CacheQueue.add(
      'invalidate-product-cache',
      { pattern: 'products:*' },
      { jobId: `Invalidate-${Date.now()}`, priority: 1 }
    );

    res.json({ message: 'Product updated ', productId: updatedProduct.id });
  },
];

export const deleteProduct = [
  body('productId', 'Product id is required').isInt({ min: 1 }),
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    handleValidationResult(req);
    const product = await getProductById(+req.body.productId);
    checkModelExisted(product);

    const deletedProduct = await deleteOneProduct(product!.id);

    const optFileNames = product!.images.map(
      (image: any) => image.path.split('.')[0] + '.webp'
    );
    const orgFileNames = product!.images.map((image: any) => image.path);
    await removeProductFiles(orgFileNames, optFileNames);

    await CacheQueue.add(
      'invalidate-product-cache',
      { pattern: 'products:*' },
      { jobId: `Invalidate-${Date.now()}`, priority: 1 }
    );

    res.json({ message: 'Product deleted', productId: deletedProduct.id });
  },
];
