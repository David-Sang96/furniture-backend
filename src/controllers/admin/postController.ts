import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
// import { unlink } from 'fs/promises';

import sanitize from 'sanitize-html';
import { errorCode } from '../../config/errorCode';
import ImageQueue from '../../jobs/queues/imageQueue';
import { getUserById } from '../../services/authService';
import {
  createOnePost,
  deleteOnePost,
  getPostById,
  updateOnePost,
} from '../../services/postservice';
import { PostDataTypes } from '../../types/postTypes';
import { checkUserNotExist } from '../../utils/auth';
import { checkModelExisted, isValidImage } from '../../utils/check';
import {
  handleError,
  handlePostValidationResult,
  handleValidationResult,
} from '../../utils/errorHandler';
import { removePostFiles } from '../../utils/removePostFiles';

const cleanHtml = (html: any) => {
  return sanitize(html, {
    /* prettier-ignore */
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'span', 'img', 'br'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      span: ['style'], // Allows inline styling
      '*': ['class'], // Allows classes for styling elements
    },
    allowedSchemes: ['http', 'https', 'data'], // Prevents JavaScript injection in URLs
    disallowedTagsMode: 'discard', // completely remove disallowed tags instead of escaping or replacing them
    enforceHtmlBoundary: true, // ensures that HTML tags are properly opened and closed
  });
};

export const createPost = [
  body('title', 'Title is required').notEmpty().trim().escape(),
  body('content', 'Content is required').notEmpty().trim().escape(),
  body('body', 'Content is required')
    .notEmpty()
    .trim()
    .customSanitizer((val) => sanitize(val))
    .notEmpty(),
  body('category', 'Category is required').notEmpty().trim().escape(),
  body('type', 'Type is required').notEmpty().trim().escape(),
  body('tags', 'Tags is invalid')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value)
        return value.split(',').filter((tag: string) => tag.trim() !== '');
      return value;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    await handlePostValidationResult(req);

    const { title, content, body, category, type, tags } = req.body;
    const userId = req.userId;
    const image = req.file;
    isValidImage(image);

    const user = await getUserById(userId!);
    if (!user) {
      await removePostFiles(image!.filename, null);
      return next(
        handleError(
          `This account has not registered`,
          401,
          errorCode.unauthenticated
        )
      );
    }

    const splitFileName = image!.filename.split('.')[0];
    await ImageQueue.add(
      'optimize-image',
      {
        filepath: image?.path,
        fileName: `${splitFileName}.webp`,
        width: 835,
        height: 577,
        quality: 100,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
    );

    const data: PostDataTypes = {
      title,
      content,
      body,
      category,
      type,
      tags,
      userId: user.id,
      image: image!.filename,
    };

    const newPost = await createOnePost(data);
    res
      .status(201)
      .json({ message: 'Created a new post successfully', postId: newPost.id });
  },
];

export const updatePost = [
  body('postId', 'Post id is required.')
    .trim()
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Post ID must be a positive number'),
  body('title', 'Title is required').notEmpty().trim().escape(),
  body('content', 'Content is required').notEmpty().trim().escape(),
  body('body', 'Content is required')
    .notEmpty()
    .trim()
    .customSanitizer((val) => sanitize(val))
    .notEmpty(),
  body('category', 'Category is required').notEmpty().trim().escape(),
  body('type', 'Type is required').notEmpty().trim().escape(),
  body('tags', 'Tags is invalid')
    .optional({ nullable: true })
    .customSanitizer((value) => {
      if (value)
        return value.split(',').filter((tag: string) => tag.trim() !== '');
      return value;
    }),
  async (req: Request, res: Response, next: NextFunction) => {
    await handlePostValidationResult(req);

    const { postId, title, content, body, category, type, tags } = req.body;
    const userId = req.userId;
    const image = req.file;

    const user = await getUserById(userId!);
    if (!user) {
      if (image) {
        await removePostFiles(image!.filename, null);
      }
      return next(
        handleError(
          `This account has not registered`,
          401,
          errorCode.unauthenticated
        )
      );
    }

    const isPostExisted = await getPostById(+postId);
    if (!isPostExisted) {
      if (image) {
        await removePostFiles(image!.filename, null);
      }
      return next(handleError('No post found', 400));
    }

    if (user.id !== isPostExisted.userId) {
      if (image) {
        await removePostFiles(image!.filename, null);
      }
      return next(
        handleError('This action is not allowed', 403, errorCode.unauthorize)
      );
    }

    const data: any = {
      title,
      content,
      body,
      category,
      type,
      tags,
    };

    if (image) {
      data.image = image.filename;
      const splitFileName = image.filename.split('.')[0];

      await ImageQueue.add(
        'optimize-image',
        {
          filepath: image?.path,
          fileName: `${splitFileName}.webp`,
          width: 835,
          height: 577,
          quality: 100,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );

      const optimizedFile = isPostExisted.image.split('.')[0] + '.webp';
      await removePostFiles(isPostExisted.image, optimizedFile);
    }

    const updatedPost = await updateOnePost(isPostExisted.id, data);
    res.json({ message: 'Updated post successfully', postId: updatedPost.id });
  },
];

export const deletePost = [
  body('postId', 'Post id is required')
    .trim()
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('Post ID must be a positive number'),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);

    const postId = Number(req.body.postId);
    const userId = req.userId;

    const user = await getUserById(userId!);
    checkUserNotExist(user, false);

    const post = await getPostById(postId);
    checkModelExisted(post);

    const optimizedFile = post!.image.split('.')[0] + '.webp';
    await removePostFiles(post!.image, optimizedFile);

    if (user!.id !== post?.userId)
      return next(
        handleError('This action is not allowed', 403, errorCode.unauthorize)
      );

    const deletedPost = await deleteOnePost(postId);
    res.json({ message: 'Post deleted successfully', postId: deletedPost.id });
  },
];
