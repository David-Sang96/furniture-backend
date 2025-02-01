import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
// import { unlink } from 'fs/promises';

import sanitize from 'sanitize-html';
import { errorCode } from '../../config/errorCode';
import ImageQueue from '../../jobs/queues/imageQueue';
import { getUserById } from '../../services/authService';
import { createOnePost } from '../../services/postservice';
import { CreatePost } from '../../types/postTypes';
import { isValidImage } from '../../utils/check';
import {
  handleError,
  handlePostValidationResult,
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
    .trim()
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

    const splitFileName = image?.filename.split('.')[0];
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

    const data: CreatePost = {
      title,
      content,
      body,
      category,
      type,
      tags,
      userId: user?.id!,
      image: image!.filename,
    };

    const newPost = await createOnePost(data);
    res
      .status(201)
      .json({ message: 'Created a new post successfully', postId: newPost.id });
  },
];

export const updatePost = [
  body(''),
  async (req: Request, res: Response, next: NextFunction) => {
    res.json({ message: '' });
  },
];

export const deletePost = [
  body(''),
  async (req: Request, res: Response, next: NextFunction) => {
    // if (user?.image) {
    //   const originalFilePath = path.join(
    //     __dirname,
    //     '../../../',
    //     'upload/images',
    //     image?.filename!
    //   );

    //   const optimizeFilePath = path.join(
    //     __dirname,
    //     '../../../',
    //     'upload/optimize',
    //     splitFileName + '.webp'
    //   );

    //   await unlink(originalFilePath);
    //   await unlink(optimizeFilePath);
    // }
    res.json({ message: '' });
  },
];
